import axios, { AxiosInstance } from 'axios';
import { JiraConfig, JiraIssue, SimplifiedIssue } from '../types';

/**
 * Jira API client for fetching product feedback
 */
export class JiraClient {
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;

    // Create axios instance with auth
    this.client = axios.create({
      baseURL: `${config.url}/rest/api/3`,
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${config.email}:${config.apiToken}`
        ).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Fetch ALL issues from a specific board (no date filtering)
   * Used for historical context when analyzing themes
   */
  async fetchAllBoardIssues(): Promise<JiraIssue[]> {
    return this.fetchIssuesWithFilter('all');
  }

  /**
   * Fetch issues from a specific board
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
    try {
      // Build JQL query - supports both board ID (numeric) and project key (e.g., BPD)
      // For Jira Product Discovery, use project key instead of board
      const isProjectKey = isNaN(Number(this.config.boardId));

      // Build the date filter
      let dateFilter: string;
      if (since === 'all') {
        // No date filter - fetch all issues
        dateFilter = '';
      } else if (since) {
        // Format date as YYYY-MM-DD HH:mm for Jira
        const year = since.getFullYear();
        const month = String(since.getMonth() + 1).padStart(2, '0');
        const day = String(since.getDate()).padStart(2, '0');
        const hours = String(since.getHours()).padStart(2, '0');
        const minutes = String(since.getMinutes()).padStart(2, '0');
        const formattedDate = `"${year}-${month}-${day} ${hours}:${minutes}"`;
        dateFilter = `AND updated >= ${formattedDate}`;
      } else {
        // Default: last 4 days
        dateFilter = `AND updated >= -4d`;
      }

      const jql = isProjectKey
        ? `project = ${this.config.boardId} ${dateFilter} ORDER BY updated DESC`
        : `board = ${this.config.boardId} ${dateFilter} ORDER BY updated DESC`;

      console.log(`Fetching issues with JQL: ${jql}`);

      // Use POST /search/jql with explicit fields including custom fields
      const response = await this.client.post('/search/jql', {
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

      console.log(`Found ${response.data.issues ? response.data.issues.length : 0} issues`);

      // Debug: Log response structure
      console.log('\n🔍 Response structure:', Object.keys(response.data));
      if (response.data.issues && response.data.issues.length > 0) {
        console.log('🔍 First issue structure:', Object.keys(response.data.issues[0]));
      }

      // The /search/jql endpoint might return issues directly in 'values' instead of 'issues'
      const issues = response.data.issues || response.data.values || [];

      // Log first issue's fields to help identify custom field IDs
      if (issues && issues.length > 0) {
        const firstIssue = issues[0];
        console.log('🔍 First issue keys:', Object.keys(firstIssue));

        if (firstIssue.fields) {
          console.log('\n📋 Available custom fields in first issue:');
          Object.keys(firstIssue.fields).forEach(fieldKey => {
            const field = firstIssue.fields[fieldKey];
            if (fieldKey.startsWith('customfield_') && field != null) {
              // Log custom fields with their values
              let value = field;
              if (typeof field === 'object') {
                value = field.value || field.name || JSON.stringify(field).substring(0, 80);
              }
              console.log(`  ${fieldKey}: ${value}`);
            }
          });
          console.log('');
        }
      }

      return issues;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Jira API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch Jira issues: ${error.response?.data?.errorMessages || error.message}`);
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

    // Handle array of objects with 'value' property
    if (Array.isArray(field)) {
      return field
        .map(item => item.value || item.name || item)
        .filter(Boolean)
        .join(', ') || undefined;
    }

    // Handle single object with 'value' property
    if (typeof field === 'object') {
      return field.value || field.name || undefined;
    }

    // Handle plain string
    return field.toString();
  }

  /**
   * Clean and extract text from description
   */
  private cleanDescription(description: any): string {
    if (!description) return 'No description provided';

    // Handle Atlassian Document Format (ADF) used in Jira Product Discovery
    if (typeof description === 'object') {
      try {
        // Extract text from ADF structure
        return this.extractTextFromADF(description).substring(0, 1000);
      } catch (e) {
        return JSON.stringify(description).substring(0, 1000);
      }
    }

    // Handle plain text descriptions
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
      .slice(-3) // Get last 3 comments
      .map(comment => `${comment.author.displayName}: ${comment.body}`);
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/myself');
      console.log(`Successfully connected to Jira as ${response.data.displayName}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to Jira:', error);
      return false;
    }
  }
}
