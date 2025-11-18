/**
 * Configuration for the application
 */
export interface Config {
  jira: JiraConfig;
  anthropic: AnthropicConfig;
  email: EmailConfig;
}

/**
 * Jira configuration
 */
export interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
  boardId: string;
}

/**
 * Anthropic/Claude configuration
 */
export interface AnthropicConfig {
  apiKey: string;
  model?: string;
}

/**
 * Email configuration
 */
export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

/**
 * Jira issue from API
 */
export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string | null;
    status: {
      name: string;
      statusCategory?: {
        name: string;
      };
    };
    assignee?: {
      displayName: string;
      emailAddress?: string;
    } | null;
    reporter?: {
      displayName: string;
      emailAddress?: string;
    } | null;
    created: string;
    updated: string;
    priority?: {
      name: string;
    } | null;
    issuetype: {
      name: string;
    };
    labels?: string[];
    comment?: {
      comments: Array<{
        body: string;
        author: {
          displayName: string;
        };
        created: string;
      }>;
    };
    // Custom fields - these may have different field IDs in your Jira instance
    customfield_10037?: any; // Product Area (example field ID)
    customfield_10038?: any; // Page/Feature/Theme (example field ID)
    [key: string]: any; // Allow any custom fields
  };
}

/**
 * Simplified issue for analysis
 */
export interface SimplifiedIssue {
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  priority: string;
  issueType: string;
  labels: string[];
  recentComments: string[];
  productArea?: string;
  pageFeatureTheme?: string;
}

/**
 * Analysis result from Claude
 */
export interface AnalysisResult {
  summary: string;
  keyThemes: string[];
  highPriorityItems: string[];
  recommendations: string[];
  metrics: {
    totalIssues: number;
    newIssues: number;
    updatedIssues: number;
    commonLabels: string[];
  };
  groupedByProductArea?: Record<string, SimplifiedIssue[]>;
  groupedByPageFeatureTheme?: Record<string, SimplifiedIssue[]>;
}

/**
 * Email report data
 */
export interface EmailReport {
  subject: string;
  htmlContent: string;
  textContent: string;
}
