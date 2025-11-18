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
   * Fetch issues from a specific board
   */
  async fetchBoardIssues(daysBack: number = 4): Promise<JiraIssue[]> {
    try {
      // Build JQL query - supports both board ID (numeric) and project key (e.g., BPD)
      // For Jira Product Discovery, use project key instead of board
      const isProjectKey = isNaN(Number(this.config.boardId));
      const jql = isProjectKey
        ? `project = ${this.config.boardId} AND type = Idea AND updated >= -${daysBack}d ORDER BY updated DESC`
        : `board = ${this.config.boardId} AND updated >= -${daysBack}d ORDER BY updated DESC`;

      console.log(`Fetching issues with JQL: ${jql}`);

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
          'comment'
        ]
      });

      console.log(`Found ${response.data.issues.length} issues`);
      return response.data.issues;
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
      recentComments: this.extractRecentComments(issue)
    }));
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
