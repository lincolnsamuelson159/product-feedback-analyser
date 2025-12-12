/**
 * Customer Insights MCP Server
 *
 * A remote MCP server that provides access to:
 * - Jira (product feedback, feature requests, issues)
 * - Salesforce (opportunities, close reasons, objections)
 * - Gong (sales call transcripts)
 *
 * Authentication: Google OAuth restricted to your Workspace domain
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GoogleHandler } from "./auth/google";

// Types for OAuth context passed to MCP tools
export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
};

// Environment bindings
export interface Env {
  OAUTH_KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  HOSTED_DOMAIN: string;
  JIRA_SITE: string;
  JIRA_EMAIL: string;
  JIRA_API_TOKEN: string;
  SALESFORCE_CLIENT_ID: string;
  SALESFORCE_CLIENT_SECRET: string;
  SALESFORCE_INSTANCE_URL: string;
  SALESFORCE_REFRESH_TOKEN: string;
  GONG_ACCESS_KEY: string;
  GONG_ACCESS_SECRET: string;
  CONFLUENCE_SITE: string;
  CONFLUENCE_EMAIL: string;
  CONFLUENCE_API_TOKEN: string;
  // Microsoft 365
  MS365_CLIENT_ID: string;
  MS365_CLIENT_SECRET: string;
  MS365_TENANT_ID: string;
  MS365_REFRESH_TOKEN: string;
}

/**
 * Customer Insights MCP Server
 */
export class CustomerInsightsMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({
    name: "Customer Insights",
    version: "1.0.0",
  });

  async init() {
    // ==========================================
    // JIRA TOOLS
    // ==========================================

    this.server.tool(
      "jira_search",
      "Search Jira issues using JQL. Use for finding product feedback, feature requests, bugs, etc.",
      {
        jql: z.string().describe("JQL query string, e.g., 'project=BPD ORDER BY created DESC'"),
        maxResults: z.number().optional().default(20).describe("Maximum results to return (default 20)"),
        fields: z.string().optional().default("summary,status,description,created,priority,comment").describe("Comma-separated fields to return"),
      },
      async ({ jql, maxResults, fields }) => {
        const result = await this.jiraRequest(`/rest/api/3/search/jql`, {
          jql,
          maxResults: String(maxResults),
          fields,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "jira_get_issue",
      "Get detailed information about a specific Jira issue",
      {
        issueKey: z.string().describe("The issue key, e.g., 'BPD-123'"),
      },
      async ({ issueKey }) => {
        const result = await this.jiraRequest(`/rest/api/3/issue/${issueKey}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "jira_get_comments",
      "Get comments on a Jira issue (often contains customer feedback details)",
      {
        issueKey: z.string().describe("The issue key, e.g., 'BPD-123'"),
      },
      async ({ issueKey }) => {
        const result = await this.jiraRequest(`/rest/api/3/issue/${issueKey}/comment`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    // ==========================================
    // SALESFORCE TOOLS
    // ==========================================

    this.server.tool(
      "salesforce_query",
      "Execute a SOQL query against Salesforce. Use for opportunities, accounts, contacts, etc.",
      {
        query: z.string().describe("SOQL query, e.g., 'SELECT Id, Name, Amount FROM Opportunity WHERE StageName = \\'Closed Won\\' LIMIT 10'"),
      },
      async ({ query }) => {
        const result = await this.salesforceQuery(query);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "salesforce_get_opportunities",
      "Get recent opportunities with close reasons. Useful for understanding win/loss patterns.",
      {
        stage: z.enum(["Closed Won", "Closed Lost", "All"]).optional().default("All").describe("Filter by stage"),
        limit: z.number().optional().default(20).describe("Maximum results"),
      },
      async ({ stage, limit }) => {
        let whereClause = "";
        if (stage === "Closed Won") {
          whereClause = "WHERE StageName = 'Closed Won'";
        } else if (stage === "Closed Lost") {
          whereClause = "WHERE StageName = 'Closed Lost'";
        } else {
          whereClause = "WHERE StageName IN ('Closed Won', 'Closed Lost')";
        }

        const query = `SELECT Id, Name, Amount, StageName, CloseDate, Loss_Reason__c, Win_Reason__c,
                       Competitor__c, Primary_Objection__c, Account.Name
                       FROM Opportunity ${whereClause}
                       ORDER BY CloseDate DESC LIMIT ${limit}`;

        const result = await this.salesforceQuery(query);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    // ==========================================
    // GONG TOOLS
    // ==========================================

    this.server.tool(
      "gong_list_calls",
      "List Gong calls with optional date filtering",
      {
        fromDate: z.string().optional().describe("Start date in ISO format, e.g., '2025-01-01'"),
        toDate: z.string().optional().describe("End date in ISO format"),
        limit: z.number().optional().default(20).describe("Maximum calls to return"),
      },
      async ({ fromDate, toDate, limit }) => {
        const result = await this.gongRequest("/v2/calls", {
          fromDateTime: fromDate ? `${fromDate}T00:00:00Z` : undefined,
          toDateTime: toDate ? `${toDate}T23:59:59Z` : undefined,
        }) as { calls?: Array<unknown> };

        // Limit results
        if (result.calls && result.calls.length > limit) {
          result.calls = result.calls.slice(0, limit);
        }

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "gong_get_transcript",
      "Get the transcript for a specific Gong call",
      {
        callId: z.string().describe("The Gong call ID"),
      },
      async ({ callId }) => {
        const result = await this.gongRequest("/v2/calls/transcript", {
          filter: JSON.stringify({ callIds: [callId] }),
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "gong_search_calls",
      "Search Gong calls by keywords in transcript",
      {
        keywords: z.array(z.string()).describe("Keywords to search for in transcripts"),
        fromDate: z.string().optional().describe("Start date in ISO format"),
      },
      async ({ keywords, fromDate }) => {
        // First get calls in date range
        const calls = await this.gongRequest("/v2/calls", {
          fromDateTime: fromDate ? `${fromDate}T00:00:00Z` : undefined,
        }) as { calls?: Array<unknown> };

        // Note: Full transcript search would require fetching each transcript
        // This returns calls metadata - user can then get specific transcripts
        return {
          content: [{
            type: "text",
            text: `Found ${calls.calls?.length || 0} calls. Use gong_get_transcript to get specific call transcripts and search for keywords: ${keywords.join(", ")}`
          }]
        };
      }
    );

    // ==========================================
    // CONFLUENCE TOOLS
    // ==========================================

    this.server.tool(
      "confluence_search",
      "Search Confluence pages using CQL (Confluence Query Language). Great for finding product docs, meeting notes, customer stories.",
      {
        query: z.string().describe("CQL query or text search, e.g., 'type=page AND space=PROD' or just 'customer feedback'"),
        limit: z.number().optional().default(20).describe("Maximum results"),
      },
      async ({ query, limit }) => {
        const result = await this.confluenceRequest("/wiki/rest/api/search", {
          cql: query.includes("=") ? query : `text ~ "${query}"`,
          limit: String(limit),
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "confluence_get_page",
      "Get the full content of a Confluence page",
      {
        pageId: z.string().describe("The Confluence page ID"),
      },
      async ({ pageId }) => {
        const result = await this.confluenceRequest(`/wiki/api/v2/pages/${pageId}`, {
          "body-format": "storage",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "confluence_get_page_by_title",
      "Find a Confluence page by its title",
      {
        title: z.string().describe("The page title to search for"),
        spaceKey: z.string().optional().describe("Optional space key to narrow search"),
      },
      async ({ title, spaceKey }) => {
        let cql = `title = "${title}"`;
        if (spaceKey) {
          cql += ` AND space = "${spaceKey}"`;
        }
        const result = await this.confluenceRequest("/wiki/rest/api/search", {
          cql,
          limit: "5",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "confluence_list_spaces",
      "List all Confluence spaces - useful for understanding what content areas exist",
      {},
      async () => {
        const result = await this.confluenceRequest("/wiki/api/v2/spaces", {
          limit: "50",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "confluence_get_space_pages",
      "Get recent pages from a specific Confluence space",
      {
        spaceKey: z.string().describe("The space key, e.g., 'PROD' or 'SALES'"),
        limit: z.number().optional().default(20).describe("Maximum pages to return"),
      },
      async ({ spaceKey, limit }) => {
        const result = await this.confluenceRequest("/wiki/rest/api/search", {
          cql: `space = "${spaceKey}" AND type = page ORDER BY lastmodified DESC`,
          limit: String(limit),
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    // ==========================================
    // MICROSOFT 365 TOOLS
    // ==========================================

    this.server.tool(
      "outlook_search_emails",
      "Search Outlook emails with filters. Use for finding customer communications, internal discussions.",
      {
        query: z.string().describe("Search query - can include keywords, sender:email, subject:text"),
        folder: z.string().optional().default("inbox").describe("Folder to search: inbox, sentitems, drafts, or folder ID"),
        limit: z.number().optional().default(20).describe("Maximum emails to return"),
      },
      async ({ query, folder, limit }) => {
        const folderPath = folder === "inbox" ? "inbox" : folder === "sentitems" ? "sentItems" : folder === "drafts" ? "drafts" : `mailFolders/${folder}`;
        const result = await this.graphRequest(`/me/${folderPath}/messages`, {
          $search: `"${query}"`,
          $top: String(limit),
          $select: "id,subject,from,toRecipients,receivedDateTime,bodyPreview",
          $orderby: "receivedDateTime desc",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "outlook_get_email",
      "Get full content of a specific email",
      {
        messageId: z.string().describe("The email message ID"),
      },
      async ({ messageId }) => {
        const result = await this.graphRequest(`/me/messages/${messageId}`, {
          $select: "id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,attachments",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "outlook_search_calendar",
      "Search calendar events. Use for finding meetings, availability.",
      {
        query: z.string().optional().describe("Search query for event subject/body"),
        startDate: z.string().describe("Start date in ISO format, e.g., '2025-01-01'"),
        endDate: z.string().describe("End date in ISO format"),
        limit: z.number().optional().default(20).describe("Maximum events to return"),
      },
      async ({ query, startDate, endDate, limit }) => {
        const params: Record<string, string> = {
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          $top: String(limit),
          $select: "id,subject,start,end,attendees,location,bodyPreview",
          $orderby: "start/dateTime",
        };
        if (query) {
          params.$filter = `contains(subject,'${query}')`;
        }
        const result = await this.graphRequest("/me/calendarView", params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "sharepoint_search",
      "Search SharePoint for documents, pages, and files.",
      {
        query: z.string().describe("Search query for documents/pages"),
        limit: z.number().optional().default(20).describe("Maximum results to return"),
      },
      async ({ query, limit }) => {
        // Use Microsoft Search API for SharePoint content
        const result = await this.graphRequestPost("/search/query", {
          requests: [{
            entityTypes: ["driveItem", "listItem", "site"],
            query: { queryString: query },
            from: 0,
            size: limit,
          }]
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "sharepoint_get_file",
      "Get content or metadata of a SharePoint file",
      {
        driveId: z.string().describe("The drive ID"),
        itemId: z.string().describe("The item/file ID"),
        contentOnly: z.boolean().optional().default(false).describe("If true, returns file content instead of metadata"),
      },
      async ({ driveId, itemId, contentOnly }) => {
        if (contentOnly) {
          const result = await this.graphRequest(`/drives/${driveId}/items/${itemId}/content`, {});
          return { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }] };
        }
        const result = await this.graphRequest(`/drives/${driveId}/items/${itemId}`, {
          $select: "id,name,webUrl,createdDateTime,lastModifiedDateTime,size,createdBy,lastModifiedBy",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "teams_search_messages",
      "Search Teams chat messages across channels and chats.",
      {
        query: z.string().describe("Search query for messages"),
        limit: z.number().optional().default(20).describe("Maximum messages to return"),
      },
      async ({ query, limit }) => {
        // Use Microsoft Search API for Teams messages
        const result = await this.graphRequestPost("/search/query", {
          requests: [{
            entityTypes: ["chatMessage"],
            query: { queryString: query },
            from: 0,
            size: limit,
          }]
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "teams_list_chats",
      "List recent Teams chats and channels",
      {
        limit: z.number().optional().default(20).describe("Maximum chats to return"),
      },
      async ({ limit }) => {
        const result = await this.graphRequest("/me/chats", {
          $top: String(limit),
          $expand: "members",
          $orderby: "lastUpdatedDateTime desc",
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    // ==========================================
    // ANALYSIS HELPERS
    // ==========================================

    this.server.tool(
      "get_data_sources",
      "List available data sources and their status",
      {},
      async () => {
        const sources = {
          jira: {
            available: !!(this.env.JIRA_EMAIL && this.env.JIRA_API_TOKEN),
            site: this.env.JIRA_SITE,
            description: "Product feedback from Jira Product Discovery",
          },
          salesforce: {
            available: !!(this.env.SALESFORCE_INSTANCE_URL && this.env.SALESFORCE_REFRESH_TOKEN),
            instance: this.env.SALESFORCE_INSTANCE_URL,
            description: "CRM data - opportunities, win/loss reasons, objections",
          },
          gong: {
            available: !!(this.env.GONG_ACCESS_KEY && this.env.GONG_ACCESS_SECRET),
            description: "Sales call transcripts and conversation intelligence",
          },
          confluence: {
            available: !!(this.env.CONFLUENCE_EMAIL && this.env.CONFLUENCE_API_TOKEN),
            site: this.env.CONFLUENCE_SITE,
            description: "Documentation, product specs, meeting notes, customer stories",
          },
          microsoft365: {
            available: !!(this.env.MS365_CLIENT_ID && this.env.MS365_REFRESH_TOKEN),
            description: "Outlook email/calendar, SharePoint documents, Teams messages",
          },
        };
        return { content: [{ type: "text", text: JSON.stringify(sources, null, 2) }] };
      }
    );
  }

  // ==========================================
  // API HELPERS
  // ==========================================

  private async jiraRequest(path: string, params?: Record<string, string>) {
    const url = new URL(`https://${this.env.JIRA_SITE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const auth = btoa(`${this.env.JIRA_EMAIL}:${this.env.JIRA_API_TOKEN}`);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async salesforceQuery(query: string) {
    // Get access token using refresh token
    const tokenResponse = await fetch(`${this.env.SALESFORCE_INSTANCE_URL}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.env.SALESFORCE_CLIENT_ID,
        client_secret: this.env.SALESFORCE_CLIENT_SECRET,
        refresh_token: this.env.SALESFORCE_REFRESH_TOKEN,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Salesforce auth error: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json() as { access_token: string };

    // Execute query
    const url = `${this.env.SALESFORCE_INSTANCE_URL}/services/data/v59.0/query?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Salesforce query error: ${response.status}`);
    }

    return response.json();
  }

  private async gongRequest(path: string, params?: Record<string, string | undefined>) {
    const url = new URL(`https://api.gong.io${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const auth = btoa(`${this.env.GONG_ACCESS_KEY}:${this.env.GONG_ACCESS_SECRET}`);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Gong API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async confluenceRequest(path: string, params?: Record<string, string>) {
    const url = new URL(`https://${this.env.CONFLUENCE_SITE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const auth = btoa(`${this.env.CONFLUENCE_EMAIL}:${this.env.CONFLUENCE_API_TOKEN}`);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getGraphAccessToken(): Promise<string> {
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${this.env.MS365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.env.MS365_CLIENT_ID,
          client_secret: this.env.MS365_CLIENT_SECRET,
          refresh_token: this.env.MS365_REFRESH_TOKEN,
          scope: "https://graph.microsoft.com/.default offline_access",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Microsoft auth error: ${tokenResponse.status} - ${errorText}`);
    }

    const { access_token } = await tokenResponse.json() as { access_token: string };
    return access_token;
  }

  private async graphRequest(path: string, params: Record<string, string>) {
    const accessToken = await this.getGraphAccessToken();
    const url = new URL(`https://graph.microsoft.com/v1.0${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private async graphRequestPost(path: string, body: unknown) {
    const accessToken = await this.getGraphAccessToken();
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

// Export the OAuth provider with MCP server
export default new OAuthProvider({
  apiRoute: ["/mcp", "/sse"], // Support both new and legacy protocols
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiHandler: CustomerInsightsMCP.mount("/mcp") as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultHandler: GoogleHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
