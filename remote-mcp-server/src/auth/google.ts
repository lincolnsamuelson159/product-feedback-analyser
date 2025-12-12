/**
 * Google OAuth Handler for MCP Server
 *
 * Handles Google Workspace authentication and restricts access
 * to users from a specific domain (configured via HOSTED_DOMAIN)
 */

import { Hono } from "hono";
import type { Env, Props } from "../index";

// Auth request type for OAuth flow
interface AuthRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

// Extended environment with OAuth provider
interface EnvWithOAuth extends Env {
  OAUTH_PROVIDER: {
    parseAuthRequest(request: Request): Promise<AuthRequest>;
    lookupClient(clientId: string): Promise<unknown>;
    completeAuthorization(options: {
      request: AuthRequest;
      userId: string;
      metadata: Record<string, unknown>;
      scope: string[];
      props: Props;
    }): Promise<{ redirectTo: string }>;
  };
}

const app = new Hono<{ Bindings: EnvWithOAuth }>();

/**
 * Google OAuth configuration
 */
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * OAuth authorize endpoint - redirects to Google
 */
app.get("/authorize", async (c) => {
  // Parse the OAuth request using the OAuth provider helper
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  // Store the auth request in KV for later retrieval
  const stateKey = crypto.randomUUID();
  await c.env.OAUTH_KV.put(
    `auth_request:${stateKey}`,
    JSON.stringify(oauthReqInfo),
    { expirationTtl: 600 } // 10 minutes
  );

  // Build Google OAuth URL
  const googleAuthUrl = new URL(GOOGLE_AUTH_URL);
  googleAuthUrl.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set("redirect_uri", `${getBaseUrl(c.req.url)}/callback`);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", stateKey);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");

  // Restrict to specific Google Workspace domain
  if (c.env.HOSTED_DOMAIN) {
    googleAuthUrl.searchParams.set("hd", c.env.HOSTED_DOMAIN);
  }

  return c.redirect(googleAuthUrl.toString());
});

/**
 * OAuth callback - handles Google's response
 */
app.get("/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return c.text(`Authentication error: ${error}`, 400);
  }

  if (!code || !state) {
    return c.text("Missing code or state parameter", 400);
  }

  // Retrieve the original auth request
  const authRequestJson = await c.env.OAUTH_KV.get(`auth_request:${state}`);
  if (!authRequestJson) {
    return c.text("Invalid or expired state", 400);
  }

  const authRequest: AuthRequest = JSON.parse(authRequestJson);
  await c.env.OAUTH_KV.delete(`auth_request:${state}`);

  // Exchange code for tokens with Google
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${getBaseUrl(c.req.url)}/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return c.text(`Failed to exchange code: ${errorText}`, 500);
  }

  const tokens = await tokenResponse.json() as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
  };

  // Get user info from Google
  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return c.text("Failed to get user info", 500);
  }

  const userInfo = await userInfoResponse.json() as {
    id: string;
    email: string;
    name: string;
    hd?: string; // Hosted domain
  };

  // Verify domain restriction
  if (c.env.HOSTED_DOMAIN && userInfo.hd !== c.env.HOSTED_DOMAIN) {
    return c.text(
      `Access denied. This application is restricted to ${c.env.HOSTED_DOMAIN} users.`,
      403
    );
  }

  // Create props to pass to MCP tools
  const props: Props = {
    login: userInfo.email,
    name: userInfo.name,
    email: userInfo.email,
    accessToken: tokens.access_token,
  };

  // Complete authorization using the OAuth provider
  try {
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: authRequest,
      userId: userInfo.id,
      metadata: {
        email: userInfo.email,
        name: userInfo.name,
        authenticatedAt: new Date().toISOString(),
      },
      scope: Array.isArray(authRequest.scope)
      ? authRequest.scope
      : (typeof authRequest.scope === "string" && authRequest.scope ? authRequest.scope.split(" ") : []),
      props,
    });

    return c.redirect(redirectTo);
  } catch (err) {
    console.error("completeAuthorization error:", err);
    return c.text(`Authorization error: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
});

/**
 * Default handler for landing page
 */
app.get("/", (c) => {
  const domain = c.env.HOSTED_DOMAIN || "your organization";
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Customer Insights MCP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          line-height: 1.6;
        }
        h1 { color: #333; }
        .info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
        code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
        .tools { margin-top: 30px; }
        .tool { margin: 10px 0; padding: 10px; background: #fafafa; border-left: 3px solid #4285f4; }
      </style>
    </head>
    <body>
      <h1>Customer Insights MCP</h1>
      <p>A remote MCP server for accessing customer and sales intelligence across multiple data sources.</p>

      <div class="info">
        <strong>Access:</strong> Restricted to <code>${domain}</code> users via Google OAuth
      </div>

      <h2>How to Connect</h2>
      <ol>
        <li>In Claude Desktop or claude.ai, go to <strong>Settings → Connectors</strong></li>
        <li>Click <strong>Add Custom Connector</strong></li>
        <li>Enter this URL: <code>${getBaseUrl(c.req.url)}</code></li>
        <li>Click Connect and sign in with your Google account</li>
      </ol>

      <div class="tools">
        <h2>Available Tools</h2>
        <div class="tool"><strong>Jira</strong> - Search issues, get feedback, read comments</div>
        <div class="tool"><strong>Salesforce</strong> - Query opportunities, win/loss reasons</div>
        <div class="tool"><strong>Gong</strong> - List calls, get transcripts</div>
        <div class="tool"><strong>Confluence</strong> - Search pages, product docs, meeting notes</div>
        <div class="tool"><strong>Microsoft 365</strong> - Outlook email/calendar, SharePoint, Teams</div>
      </div>

      <h2>Example Questions</h2>
      <ul>
        <li>"What are the most common objections for Product X?"</li>
        <li>"What pain points are expressed by CFOs?"</li>
        <li>"Show me recent closed-lost opportunities"</li>
        <li>"What feedback have we received about feature Y?"</li>
        <li>"Search Confluence for customer success stories"</li>
        <li>"Find emails from customers about pricing"</li>
        <li>"Search SharePoint for sales proposals"</li>
      </ul>
    </body>
    </html>
  `);
});

/**
 * Helper to get base URL
 */
function getBaseUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}`;
}

export const GoogleHandler = app;
