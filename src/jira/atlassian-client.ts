import axios, { AxiosInstance } from 'axios';
import { JiraIssue, SimplifiedIssue } from '../types';

/**
 * Configuration for Atlassian OAuth
 */
export interface AtlassianOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  cloudId: string;
  projectKey: string;
}

/**
 * OAuth token response from Atlassian
 */
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/**
 * Atlassian API client using OAuth 2.0
 * Uses the same API as the Atlassian MCP server
 */
export class AtlassianClient {
  private client: AxiosInstance | null = null;
  private config: AtlassianOAuthConfig;
  private accessToken: string | null = null;
  private newRefreshToken: string | null = null;

  constructor(config: AtlassianOAuthConfig) {
    this.config = config;
  }

  /**
   * Get the new refresh token after authentication
   * This should be saved for the next run
   */
  getNewRefreshToken(): string | null {
    return this.newRefreshToken;
  }

  /**
   * Refresh the OAuth access token
   */
  async refreshAccessToken(): Promise<void> {
    console.log('🔑 Refreshing OAuth access token...');

    try {
      const response = await axios.post<TokenResponse>(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.newRefreshToken = response.data.refresh_token;

      console.log(`✅ Access token refreshed (expires in ${response.data.expires_in}s)`);

      // Create the axios client with the new access token
      this.client = axios.create({
        baseURL: `https://api.atlassian.com/ex/jira/${this.config.cloudId}/rest/api/3`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('OAuth Error:', error.response?.data || error.message);
        throw new Error(`Failed to refresh OAuth token: ${error.response?.data?.error_description || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ensure we have a valid client (refreshes token if needed)
   */
  private async ensureClient(): Promise<AxiosInstance> {
    if (!this.client) {
      await this.refreshAccessToken();
    }
    return this.client!;
  }

  /**
   * Fetch ALL issues from a project (no date filtering)
   * Used for historical context when analyzing themes
   */
  async fetchAllBoardIssues(): Promise<JiraIssue[]> {
    return this.fetchIssuesWithFilter('all');
  }

  /**
   * Fetch issues from a project
   * @param since - Only fetch issues updated since this date. If null, fetches last 4 days.
   */
  async fetchBoardIssues(since: Date | null = null): Promise<JiraIssue[]> {
    return this.fetchIssuesWithFilter(since);
  }

  /**
   * Internal method to fetch issues with optional date filtering
   * @param since - Date to filter by, null for last 4 days, or 'all' for no date filter
   */
  private async fetchIssuesWithFilter(since: Date | null | 'all'): Promise<JiraIssue[]> {
    const client = await this.ensureClient();

    try {
      // Build the date filter
      let dateFilter: string;
      if (since === 'all') {
        dateFilter = '';
      } else if (since) {
        const year = since.getFullYear();
        const month = String(since.getMonth() + 1).padStart(2, '0');
        const day = String(since.getDate()).padStart(2, '0');
        const hours = String(since.getHours()).padStart(2, '0');
        const minutes = String(since.getMinutes()).padStart(2, '0');
        const formattedDate = `"${year}-${month}-${day} ${hours}:${minutes}"`;
        dateFilter = `AND updated >= ${formattedDate}`;
      } else {
        dateFilter = `AND updated >= -4d`;
      }

      const jql = `project = ${this.config.projectKey} ${dateFilter} ORDER BY updated DESC`;
      console.log(`Fetching issues with JQL: ${jql}`);

      // Use the new search/jql endpoint (the old /search was deprecated)
      const response = await client.post('/search/jql', {
        jql,
        maxResults: 100,
        fields: [
          'summary',
          'description',
          'status',
          'assignee',
          'reporter',
          'created',
          'updated',
          'priority',
          'issuetype',
          'labels',
          'comment',
          'customfield_12060', // Product Area
          'customfield_11829'  // Page/Feature/Theme
        ]
      });

      const issues = response.data.issues || [];
      console.log(`Found ${issues.length} issues`);

      // Log custom fields from first issue for debugging
      if (issues.length > 0) {
        const firstIssue = issues[0];
        if (firstIssue.fields) {
          console.log('\n📋 Custom fields in first issue:');
          Object.keys(firstIssue.fields).forEach(fieldKey => {
            const field = firstIssue.fields[fieldKey];
            if (fieldKey.startsWith('customfield_') && field != null) {
              let value = field;
              if (typeof field === 'object') {
                value = field.value || field.name || JSON.stringify(field).substring(0, 80);
              }
              console.log(`  ${fieldKey}: ${value}`);
            }
          });
        }
      }

      return issues;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Atlassian API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch Jira issues: ${error.response?.data?.errorMessages?.join(', ') || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Simplify Jira issues for easier analysis
   */
  simplifyIssues(issues: JiraIssue[]): SimplifiedIssue[] {
    return issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: this.cleanDescription(issue.fields.description),
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      created: issue.fields.created,
      updated: issue.fields.updated,
      priority: issue.fields.priority?.name || 'None',
      issueType: issue.fields.issuetype.name,
      labels: issue.fields.labels || [],
      recentComments: this.extractRecentComments(issue),
      productArea: this.extractCustomFieldValue(issue.fields.customfield_12060),
      pageFeatureTheme: this.extractCustomFieldValue(issue.fields.customfield_11829)
    }));
  }

  /**
   * Extract value from custom field (handles arrays and objects)
   */
  private extractCustomFieldValue(field: any): string | undefined {
    if (!field) return undefined;

    if (Array.isArray(field)) {
      return field
        .map(item => item.value || item.name || item)
        .filter(Boolean)
        .join(', ') || undefined;
    }

    if (typeof field === 'object') {
      return field.value || field.name || undefined;
    }

    return field.toString();
  }

  /**
   * Clean and extract text from description
   */
  private cleanDescription(description: any): string {
    if (!description) return 'No description provided';

    if (typeof description === 'object') {
      try {
        return this.extractTextFromADF(description).substring(0, 1000);
      } catch (e) {
        return JSON.stringify(description).substring(0, 1000);
      }
    }

    if (typeof description === 'string') {
      return description
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 1000);
    }

    return 'No description provided';
  }

  /**
   * Extract plain text from Atlassian Document Format (ADF)
   */
  private extractTextFromADF(adf: any): string {
    if (!adf || !adf.content) return 'No description provided';

    const extractText = (node: any): string => {
      if (!node) return '';
      if (node.text) return node.text;
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ');
      }
      return '';
    };

    return extractText(adf)
      .replace(/\s+/g, ' ')
      .trim() || 'No description provided';
  }

  /**
   * Extract recent comments from issue
   */
  private extractRecentComments(issue: JiraIssue): string[] {
    if (!issue.fields.comment?.comments) return [];

    return issue.fields.comment.comments
      .slice(-3)
      .map(comment => {
        const body = typeof comment.body === 'object'
          ? this.extractTextFromADF(comment.body)
          : comment.body;
        return `${comment.author.displayName}: ${body}`;
      });
  }

  /**
   * Test connection to Atlassian
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const response = await client.get('/myself');
      console.log(`Successfully connected to Atlassian as ${response.data.displayName}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to Atlassian:', error);
      return false;
    }
  }
}
