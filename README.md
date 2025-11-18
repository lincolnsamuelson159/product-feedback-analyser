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

### 2. Get Required API Keys

#### Jira API Token

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a name (e.g., "Product Feedback Analyzer")
4. Copy the token immediately (you won't be able to see it again)

#### Find Your Jira Board ID

1. Navigate to your Jira board
2. Look at the URL: `https://yourcompany.atlassian.net/jira/software/projects/ABC/boards/123`
3. The board ID is the number at the end (e.g., `123`)

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

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:
   ```bash
   JIRA_URL=https://yourcompany.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your_actual_token
   JIRA_BOARD_ID=123
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   SENDGRID_API_KEY=SG.xxxxx
   EMAIL_FROM=notifications@yourdomain.com
   EMAIL_TO=your-email@example.com
   ```

#### For GitHub Actions

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of the following:
   - `JIRA_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `JIRA_BOARD_ID`
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

### 5. Configure GitHub Actions Schedule

The workflow runs on a schedule defined in `.github/workflows/analyze-feedback.yml`:

```yaml
schedule:
  # Runs every Monday and Thursday at 9:00 AM UTC
  - cron: '0 9 * * 1,4'
```

**Common Schedule Options:**

- `'0 9 * * 1,4'` - Monday & Thursday at 9 AM UTC
- `'0 14 * * 2,5'` - Tuesday & Friday at 2 PM UTC
- `'30 8 * * 1,3'` - Monday & Wednesday at 8:30 AM UTC

**Convert to Your Timezone:**
- Find your offset from UTC
- Example: If you're in PST (UTC-8) and want 9 AM PST, use 5 PM UTC (17:00)
- Cron: `'0 17 * * 1,4'`

### 6. Manual Trigger (Testing)

You can manually trigger the workflow from GitHub:

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Product Feedback Analysis** workflow
4. Click **Run workflow** → **Run workflow**

## Project Structure

```
product-feedback/
├── .github/
│   └── workflows/
│       └── analyze-feedback.yml    # GitHub Actions workflow
├── src/
│   ├── jira/
│   │   └── client.ts               # Jira API integration
│   ├── claude/
│   │   └── analyzer.ts             # Claude AI analysis logic
│   ├── email/
│   │   └── sender.ts               # SendGrid email sender
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   └── index.ts                    # Main orchestration
├── dist/                           # Compiled JavaScript (generated)
├── .env.example                    # Environment variables template
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

### "Failed to connect to Jira"

- Verify your Jira URL is correct (should be `https://yourcompany.atlassian.net`)
- Check that your API token is valid
- Ensure your email matches your Jira account
- Verify you have access to the specified board

### "No issues found"

- Check your board ID is correct
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

### GitHub Actions Not Running

- Verify secrets are set correctly in repository settings
- Check the workflow file syntax
- Look at the Actions tab for error messages
- Ensure GitHub Actions is enabled for your repository

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

- Never commit `.env` file or API keys to git
- Use GitHub Secrets for all sensitive values
- Rotate API keys periodically
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
