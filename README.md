# Product Feedback AI Analyzer

Automated AI-powered analysis of product feedback from Jira, delivered twice weekly via email. Uses Claude AI to identify trends, prioritize issues, and generate actionable insights.

## Features

- **Automated Jira Integration**: Fetches product feedback from your specified Jira board
- **AI-Powered Analysis**: Uses Claude (Anthropic) to analyze feedback and extract insights
- **Smart Summarization**: Identifies key themes, high-priority items, and actionable recommendations
- **Beautiful Email Reports**: Sends professionally formatted HTML email summaries
- **GitHub Actions Scheduling**: Runs automatically twice per week (configurable)
- **Easy Configuration**: Simple environment variable setup

## What You Get

Each twice-weekly report includes:

- **Executive Summary**: High-level overview of the feedback landscape
- **Key Metrics**: Total, new, and updated issues
- **Key Themes**: Patterns and common topics across feedback
- **High Priority Items**: Issues requiring immediate attention
- **Recommendations**: Actionable next steps for your team
- **Common Labels**: Most frequent tags and categories

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Access to:
  - Jira board with product feedback
  - Anthropic API (Claude)
  - SendGrid account for email delivery

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd product-feedback
npm install
```

### 2. Set Up Atlassian OAuth (Recommended)

The recommended authentication method uses OAuth 2.0 with rotating refresh tokens, which won't expire unexpectedly like API tokens.

#### Create an OAuth App

1. Go to [https://developer.atlassian.com/console/myapps/](https://developer.atlassian.com/console/myapps/)
2. Click **Create** → **OAuth 2.0 integration**
3. Give it a name (e.g., "Product Feedback Analyzer")
4. Under **Authorization**, add callback URL: `http://localhost:3000/callback`
5. Under **Permissions**, add these scopes:
   - `read:jira-work` (Jira platform → View Jira issue data)
6. Copy your **Client ID** and **Client Secret**

#### Find Your Cloud ID

1. Go to [https://admin.atlassian.com](https://admin.atlassian.com)
2. Select your organization
3. The Cloud ID is in the URL or can be found via the API

#### Get Your Initial Refresh Token

Run the OAuth setup script:

```bash
npm run get-token
```

This will:
1. Open a browser for you to authorize the app
2. Exchange the authorization code for tokens
3. Save the refresh token to `.oauth-token.json`

The refresh token automatically rotates on each use, so it stays fresh.

#### Alternative: Jira API Token (Legacy)

If you prefer API tokens:

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Copy the token immediately

**Note:** API tokens can expire or be revoked, which will break automated runs.

#### Anthropic API Key

1. Go to [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Create a new API key
3. Copy the key (starts with `sk-ant-api03-`)

#### SendGrid API Key

1. Create a SendGrid account at [https://sendgrid.com](https://sendgrid.com) (free tier available)
2. Go to Settings → API Keys
3. Create a new API key with "Mail Send" permissions
4. Copy the key (starts with `SG.`)
5. **Important**: Verify your sender email address in SendGrid

### 3. Configure Environment Variables

#### For Local Development

Create a `.env` file with your values:

```bash
# OAuth Authentication (Recommended)
ATLASSIAN_CLIENT_ID=your_oauth_client_id
ATLASSIAN_CLIENT_SECRET=your_oauth_client_secret
ATLASSIAN_CLOUD_ID=your_cloud_id
ATLASSIAN_PROJECT_KEY=BPD

# OR Legacy API Token Authentication
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_actual_token
JIRA_BOARD_ID=123

# Required for both
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=notifications@yourdomain.com
EMAIL_TO=your-email@example.com
```

**Note:** If OAuth credentials are configured, they take priority over API token auth.

#### For GitLab CI/CD

1. Go to your GitLab project
2. Navigate to **Settings** → **CI/CD** → **Variables**
3. Add the following variables:
   - `ATLASSIAN_CLIENT_ID`
   - `ATLASSIAN_CLIENT_SECRET`
   - `ATLASSIAN_CLOUD_ID`
   - `ATLASSIAN_REFRESH_TOKEN` (from `.oauth-token.json`)
   - `ATLASSIAN_PROJECT_KEY`
   - `ANTHROPIC_API_KEY`
   - `SENDGRID_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_TO`

### 4. Test Locally

Build and run the analyzer:

```bash
# Build TypeScript
npm run build

# Run the analyzer
npm start

# Or for development with auto-reload
npm run dev
```

If everything is configured correctly, you should see:
- Connection verification messages
- Issues fetched from Jira
- Analysis progress
- Email sent confirmation

### 5. Run the Analyzer

```bash
# Build and run
npm run build
npm start

# Or for development
npm run dev
```

## Project Structure

```
product-feedback/
├── scripts/
│   └── get-oauth-token.ts          # OAuth setup script
├── src/
│   ├── jira/
│   │   ├── client.ts               # Legacy API token client
│   │   └── atlassian-client.ts     # OAuth-based client (recommended)
│   ├── claude/
│   │   └── analyzer.ts             # Claude AI analysis logic
│   ├── email/
│   │   └── sender.ts               # SendGrid email sender
│   ├── utils/
│   │   └── oauth-token.ts          # OAuth token management
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   └── index.ts                    # Main orchestration
├── dist/                           # Compiled JavaScript (generated)
├── .oauth-token.json               # Local OAuth token (git-ignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Customization

### How It Tracks New Issues

The system automatically tracks when it last ran and only analyzes issues that are **new or updated since the last run**:

- **First run**: Analyzes all issues from the last 4 days
- **Subsequent runs**: Only analyzes issues created or updated since the last successful run
- **Timestamp file**: `.last-run` file stores the last run time (auto-committed in GitHub Actions)

This prevents duplicate analysis and focuses on truly new feedback.

### Customize Email Content

Edit `src/email/sender.ts` to modify:
- HTML template styling
- Email structure
- Subject line format

### Modify Analysis Prompts

Edit `src/claude/analyzer.ts` to adjust:
- Analysis focus areas
- Output format
- Insight categories

### Change Claude Model

```bash
# In .env
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Default (recommended)
# or
ANTHROPIC_MODEL=claude-opus-4-5-20250929    # More powerful (higher cost)
```

## Troubleshooting

### "Failed to refresh OAuth token"

- Verify your `ATLASSIAN_CLIENT_ID` and `ATLASSIAN_CLIENT_SECRET` are correct
- Re-run `npm run get-token` to get a fresh refresh token
- Check that your OAuth app has the `read:jira-work` scope enabled

### "Failed to connect to Jira" (Legacy API Token)

- Verify your Jira URL is correct (should be `https://yourcompany.atlassian.net`)
- Check that your API token is valid and not expired
- Ensure your email matches your Jira account

### "No issues found"

- Check your project key is correct
- Verify there are new/updated issues since the last run
- For testing, delete the `.last-run` file to force analyzing last 4 days
- Check your Jira query permissions

### "SendGrid Error"

- Verify your SendGrid API key is valid
- Ensure the sender email is verified in SendGrid
- Check you haven't exceeded SendGrid's free tier limits (100 emails/day)
- Verify the API key has "Mail Send" permissions

### "Claude API Error"

- Check your Anthropic API key is valid
- Verify you haven't exceeded rate limits
- Ensure you have sufficient credits in your Anthropic account

## Cost Estimates

### Anthropic Claude API
- ~$0.50-$2.00 per analysis (depending on issue volume)
- Twice weekly = ~$4-16/month

### SendGrid
- Free tier: 100 emails/day (sufficient for this use case)
- First 40,000 emails free for first 30 days

### GitHub Actions
- Free for public repositories
- 2,000 minutes/month free for private repositories
- This workflow uses ~2-5 minutes per run

**Total estimated cost: $4-16/month** (primarily Claude API)

## Development

### Scripts

```bash
npm run build      # Compile TypeScript to JavaScript
npm start          # Run the compiled application
npm run dev        # Run with ts-node (development)
npm run get-token  # Get OAuth refresh token (one-time setup)
npm run lint       # Lint TypeScript code
npm run format     # Format code with Prettier
```

### MCP Server Integration (Claude Code)

This project includes MCP (Model Context Protocol) integration for querying Jira data directly within Claude Code conversations.

#### Setup

The MCP server is configured in `.claude.json` (in your home directory, not this project):

```json
{
  "projects": {
    "/Users/yourname/product-feedback": {
      "mcpServers": {
        "jira": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "@aashari/mcp-server-atlassian-jira"],
          "env": {
            "ATLASSIAN_SITE_NAME": "yourcompany",
            "ATLASSIAN_USER_EMAIL": "your-email@example.com",
            "ATLASSIAN_API_TOKEN": "your_jira_api_token"
          }
        }
      }
    }
  }
}
```

**Important**:
- `ATLASSIAN_SITE_NAME` should be just your subdomain (e.g., "boardiq" for "boardiq.atlassian.net")
- Use `ATLASSIAN_USER_EMAIL` (not `JIRA_EMAIL`)
- Use `ATLASSIAN_API_TOKEN` (not `JIRA_API_TOKEN`)
- These are the same credentials from your `.env` file

#### Usage

Once configured and Claude Code is restarted, you can query Jira directly in conversations:

```
"Tell me about issue BPD-1028"
"Show me all issues updated in the last week"
"List high priority items in the Product Discovery project"
```

The MCP server provides tools for:
- Listing and searching issues (with JQL support)
- Getting detailed issue information (description, status, priority, dates, assignee)
- Viewing comments and worklogs
- Accessing custom fields (Product Area, Page/Feature/Theme)
- Viewing linked issues

**Important Limitation**: Jira Product Discovery "Insights" are not accessible via any API (including MCP). Insights can only be viewed through the Jira Product Discovery web interface.

### Adding New Features

1. Update types in `src/types/index.ts`
2. Implement logic in appropriate module
3. Update main orchestration in `src/index.ts`
4. Test locally before pushing

## Architecture

```
┌─────────────────────┐
│  GitHub Actions     │  Runs twice weekly
│  (Scheduled)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Node.js/TypeScript │
│  Main Application   │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌──────────┐
│  Jira   │  │  Claude  │
│   API   │  │   API    │
└─────────┘  └──────────┘
     │           │
     └─────┬─────┘
           ▼
     ┌──────────┐
     │ SendGrid │
     │   API    │
     └──────────┘
           │
           ▼
     ┌──────────┐
     │  Email   │
     │ (Report) │
     └──────────┘
```

## Security Notes

- Never commit `.env` or `.oauth-token.json` to git
- Use CI/CD secrets for all sensitive values
- OAuth refresh tokens rotate automatically on each use
- Use minimum required permissions for all API keys
- Review access logs regularly

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review GitHub Actions logs for errors
3. Verify all API keys and configurations
4. Open an issue in this repository

---

**Built with:**
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Anthropic Claude API](https://www.anthropic.com)
- [SendGrid Email API](https://sendgrid.com)
- [GitHub Actions](https://github.com/features/actions)
