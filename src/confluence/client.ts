import axios, { AxiosInstance } from 'axios';
import { ConfluenceConfig, ConfluencePage, SimplifiedPage } from '../types';

/**
 * Confluence API client for fetching content
 */
export class ConfluenceClient {
  private client: AxiosInstance;
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;

    // Create axios instance with auth
    this.client = axios.create({
      baseURL: `${config.url}/wiki/api/v2`,
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
   * Fetch all pages from a specific space
   */
  async fetchSpacePages(spaceKey?: string): Promise<ConfluencePage[]> {
    const space = spaceKey || this.config.spaceKey;
    try {
      console.log(`Fetching pages from space: ${space}`);

      const response = await this.client.get('/pages', {
        params: {
          spaceKey: space,
          limit: 100,
          sort: '-modified-date'
        }
      });

      console.log(`Found ${response.data.results?.length || 0} pages`);
      return response.data.results || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Confluence API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch Confluence pages: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch recently updated pages across all spaces
   */
  async fetchRecentPages(limit: number = 50): Promise<ConfluencePage[]> {
    try {
      console.log(`Fetching ${limit} recently updated pages`);

      const response = await this.client.get('/pages', {
        params: {
          limit,
          sort: '-modified-date'
        }
      });

      console.log(`Found ${response.data.results?.length || 0} pages`);
      return response.data.results || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Confluence API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch Confluence pages: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get page content by ID
   */
  async getPageContent(pageId: string): Promise<string> {
    try {
      const response = await this.client.get(`/pages/${pageId}`, {
        params: {
          'body-format': 'storage'
        }
      });

      return response.data.body?.storage?.value || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Confluence API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch page content: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Search Confluence using CQL (Confluence Query Language)
   */
  async search(cql: string, limit: number = 25): Promise<ConfluencePage[]> {
    try {
      console.log(`Searching with CQL: ${cql}`);

      // Use v1 API for search as v2 search is different
      const searchClient = axios.create({
        baseURL: `${this.config.url}/wiki/rest/api`,
        headers: this.client.defaults.headers as any,
        timeout: 30000
      });

      const response = await searchClient.get('/content/search', {
        params: {
          cql,
          limit,
          expand: 'version,space'
        }
      });

      console.log(`Found ${response.data.results?.length || 0} results`);
      return response.data.results || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Confluence API Error:', error.response?.data || error.message);
        throw new Error(`Failed to search Confluence: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * List all spaces
   */
  async listSpaces(): Promise<any[]> {
    try {
      const response = await this.client.get('/spaces', {
        params: {
          limit: 100
        }
      });

      return response.data.results || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Confluence API Error:', error.response?.data || error.message);
        throw new Error(`Failed to list spaces: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Simplify pages for easier analysis
   */
  simplifyPages(pages: ConfluencePage[]): SimplifiedPage[] {
    return pages.map(page => ({
      id: page.id,
      title: page.title,
      spaceKey: page.spaceId || page._expandable?.space || 'Unknown',
      status: page.status,
      createdAt: page.createdAt,
      version: page.version?.number || 1,
      authorId: page.authorId,
      lastModified: page.version?.createdAt
    }));
  }

  /**
   * Test connection to Confluence
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/spaces', {
        params: { limit: 1 }
      });
      console.log('Successfully connected to Confluence');
      return true;
    } catch (error) {
      console.error('Failed to connect to Confluence:', error);
      return false;
    }
  }
}
