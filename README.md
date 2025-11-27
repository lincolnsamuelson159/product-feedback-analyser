# Product Feedback AI Analyzer

Automated AI-powered analysis of product feedback from Jira, delivered twice weekly via email. Uses Claude AI to identify trends, prioritize issues, and generate actionable insights.

## Features

- **Automated Jira Integration**: Fetches product feedback from your specified Jira board
- **AI-Powered Analysis**: Uses Claude (Anthropic) to analyze feedback and extract insights
- **Smart Summarization**: Identifies key themes, high-priority items, and actionable recommendations
- **Beautiful Email Reports**: Sends professionally formatted HTML email summaries
- **GitLab CI/CD Scheduling**: Runs automatically twice per week (configurable)
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
git clone https://gitlab.com/boardiq/product-and-prototypes/product-feedback-analyser.git
cd product-feedback-analyser
npm install
```

This will:
1. Create a `.env` file from the template
2. Prompt you to add your credentials (with links to get them)
3. Configure the Jira MCP server automatically
4. Ask if you want to run a test

**Note:** SendGrid settings in `.env` are optional (for email reports).

If everything is configured correctly, you should see:
- Connection verification messages
- Issues fetched from Jira
- Analysis progress
- Email sent confirmation

## Project Structure

```
product-feedback/
├── src/
│   ├── jira/
│   │   └── client.ts               # Jira API client
│   ├── claude/
│   │   └── analyzer.ts             # Claude AI analysis logic
│   ├── email/
│   │   └── sender.ts               # SendGrid email sender
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   └── index.ts                    # Main orchestration
├── dist/                           # Compiled JavaScript (generated)
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
- **Timestamp file**: `.last-run` file stores the last run time (auto-committed in GitLab CI/CD)

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

- The shared Jira API token in `.mcp.json` may have expired
- Contact the project owner to refresh the token

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

### GitLab CI/CD
- 400 compute minutes/month on free tier
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

### MCP Server Integration

This project includes MCP (Model Context Protocol) integration for querying Jira data directly within Claude conversations.

#### Claude Desktop Setup

Run this single command:

```bash
npx boardiq-jira-setup
```

This will configure Claude Desktop to connect to Jira automatically. See [Claude Desktop Setup Guide](docs/CLAUDE_DESKTOP_SETUP.md) for details.

#### Claude Code Setup

See step 3 in Setup Instructions above. The MCP server is configured via `claude mcp add` with your Jira credentials.

#### Usage

Once connected, you can query Jira directly in Claude conversations:

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
│  GitLab CI/CD       │  Runs twice weekly
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

- Never commit `.env` to git
- Use CI/CD secrets for all sensitive values
- Use minimum required permissions for all API keys
- Review access logs regularly

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review GitLab CI/CD pipeline logs for errors
3. Verify all API keys and configurations
4. Open an issue in this repository

---

**Built with:**
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Anthropic Claude API](https://www.anthropic.com)
- [SendGrid Email API](https://sendgrid.com)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
