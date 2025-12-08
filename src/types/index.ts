/**
 * Configuration for the application
 */
export interface Config {
  confluence: ConfluenceConfig;
  anthropic: AnthropicConfig;
  email: EmailConfig;
}

/**
 * Confluence configuration
 */
export interface ConfluenceConfig {
  url: string;
  email: string;
  apiToken: string;
  spaceKey: string;
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
  confluenceUrl: string;
}

/**
 * Confluence page from API
 */
export interface ConfluencePage {
  id: string;
  title: string;
  status: string;
  spaceId?: string;
  authorId?: string;
  createdAt?: string;
  version?: {
    number: number;
    createdAt?: string;
    authorId?: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
  };
  _expandable?: {
    space?: string;
    children?: string;
    ancestors?: string;
  };
  _links?: {
    webui?: string;
    self?: string;
  };
}

/**
 * Simplified page for analysis
 */
export interface SimplifiedPage {
  id: string;
  title: string;
  spaceKey: string;
  status: string;
  createdAt?: string;
  version: number;
  authorId?: string;
  lastModified?: string;
  content?: string;
}

/**
 * Analysis result from Claude
 */
export interface AnalysisResult {
  summary: string;
  highlights: string[];
  recommendations: string[];
  metrics: {
    totalPages: number;
    recentlyUpdated: number;
    spaces: string[];
  };
}

/**
 * Email report data
 */
export interface EmailReport {
  subject: string;
  htmlContent: string;
  textContent: string;
}
