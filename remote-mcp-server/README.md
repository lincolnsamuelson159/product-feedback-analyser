# Product Feedback MCP Server

A remote MCP server that gives Claude access to your product feedback data across:
- **Jira** - Product feedback from Jira Product Discovery
- **Salesforce** - CRM data, opportunities, win/loss reasons
- **Gong** - Sales call transcripts

## User Experience

Once deployed, your team members simply:
1. Go to Claude Settings → Connectors
2. Add the server URL
3. Sign in with their Google Workspace account
4. Done!

No local setup, no API tokens to manage, no terminal required.

---

## Deployment Guide (One-Time Setup)

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://cloudflare.com) (free tier works)
- Admin access to Google Cloud Console
- Service account credentials for Jira, Salesforce, and Gong

### Step 1: Install Dependencies

```bash
cd remote-mcp-server
npm install
```

### Step 2: Create Cloudflare KV Namespace

```bash
npx wrangler login
npx wrangler kv namespace create OAUTH_KV
```

Copy the `id` from the output and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "your-namespace-id-here"
```

### Step 3: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URI: `https://your-worker-name.your-subdomain.workers.dev/callback`
7. Save the **Client ID** and **Client Secret**

### Step 4: Configure Secrets

Set all required secrets using Wrangler:

```bash
# Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY  # Generate with: openssl rand -hex 32

# Jira (service account)
npx wrangler secret put JIRA_EMAIL
npx wrangler secret put JIRA_API_TOKEN  # Get from https://id.atlassian.com/manage-profile/security/api-tokens

# Salesforce (Connected App)
npx wrangler secret put SALESFORCE_CLIENT_ID
npx wrangler secret put SALESFORCE_CLIENT_SECRET
npx wrangler secret put SALESFORCE_INSTANCE_URL  # e.g., https://yourorg.my.salesforce.com
npx wrangler secret put SALESFORCE_REFRESH_TOKEN  # See "Getting Salesforce Refresh Token" below

# Gong
npx wrangler secret put GONG_ACCESS_KEY
npx wrangler secret put GONG_ACCESS_SECRET
```

### Step 5: Update Configuration

Edit `wrangler.toml` to set your domain:

```toml
[vars]
HOSTED_DOMAIN = "yourcompany.com"  # Restrict to your Google Workspace domain
JIRA_SITE = "yourcompany.atlassian.net"
```

### Step 6: Deploy

```bash
npm run deploy
```

Your server will be available at: `https://product-feedback-mcp.your-subdomain.workers.dev`

### Step 7: Update Google OAuth Redirect

Go back to Google Cloud Console and update the redirect URI to match your deployed URL:
```
https://product-feedback-mcp.your-subdomain.workers.dev/callback
```

---

## Getting Service Account Credentials

### Jira

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new API token
3. Use your Atlassian email as `JIRA_EMAIL`
4. Use the token as `JIRA_API_TOKEN`

### Salesforce

1. In Salesforce Setup, search for "App Manager"
2. Create a **New Connected App**
3. Enable OAuth Settings
4. Add scopes: `api`, `refresh_token`, `offline_access`
5. Save and note the **Consumer Key** (Client ID) and **Consumer Secret**

**Getting the Refresh Token:**
```bash
# 1. Authorize via browser (replace values)
open "https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://login.salesforce.com/services/oauth2/success"

# 2. Copy the 'code' from the redirect URL

# 3. Exchange for tokens
curl -X POST https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://login.salesforce.com/services/oauth2/success" \
  -d "code=YOUR_CODE"

# 4. Copy the refresh_token from the response
```

### Gong

1. Contact your Gong admin
2. Go to **Settings → Ecosystem → API**
3. Create a new API key pair
4. You'll receive an Access Key and Access Secret

---

## Available Tools

| Tool | Description |
|------|-------------|
| `jira_search` | Search Jira issues using JQL |
| `jira_get_issue` | Get detailed info about an issue |
| `jira_get_comments` | Get comments on an issue |
| `salesforce_query` | Execute SOQL queries |
| `salesforce_get_opportunities` | Get opportunities with win/loss data |
| `gong_list_calls` | List Gong calls with date filtering |
| `gong_get_transcript` | Get transcript for a specific call |
| `gong_search_calls` | Search calls by keywords |
| `get_data_sources` | Check which integrations are configured |

---

## Adding New Connectors

To add a new data source (e.g., Hubspot, Intercom):

1. Add new secrets to `wrangler.toml` and set them via `wrangler secret put`
2. Add new tools in `src/index.ts` following the existing pattern
3. Deploy: `npm run deploy`

All users automatically get access to the new tools - no action required on their end.

---

## Local Development

```bash
# Create .dev.vars file with your secrets
cat > .dev.vars << EOF
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
COOKIE_ENCRYPTION_KEY=$(openssl rand -hex 32)
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-token
# ... add other secrets
EOF

# Start local dev server
npm run dev
```

Local server runs at `http://localhost:8787`

---

## Troubleshooting

### "Access denied. This application is restricted to..."
The user is trying to sign in with an account outside your Google Workspace domain. They need to use their `@yourcompany.com` account.

### Jira/Salesforce/Gong tools not appearing
Check that the corresponding secrets are set. Run `get_data_sources` tool to see which integrations are configured.

### OAuth errors
1. Verify redirect URI in Google Cloud Console matches your deployed URL
2. Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
3. Ensure `COOKIE_ENCRYPTION_KEY` is set

---

## Security Notes

- All authentication uses OAuth 2.1 with PKCE
- Service account credentials are stored as Cloudflare secrets (encrypted at rest)
- Access is restricted to your Google Workspace domain
- Users authenticate with their own Google accounts but share service account access to data
- No user passwords or tokens are stored
