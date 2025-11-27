# boardiq-jira-setup

Configure Claude Desktop to connect to the Board Intelligence Jira instance.

## Quick Start

```bash
npx boardiq-jira-setup
```

This will:
1. Ask for your Jira email
2. Ask for your Jira API token
3. Automatically configure Claude Desktop
4. Back up your existing config (if any)

## Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- [Node.js](https://nodejs.org/) 18 or higher
- A Board Intelligence Jira account

## Getting Your API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name like "Claude Desktop"
4. Copy the token (you won't see it again)

## After Setup

1. **Restart Claude Desktop** (Cmd+Q on Mac, or quit from system tray on Windows)
2. Open Claude Desktop
3. Try asking: "Show me issues in project BPD"

## Troubleshooting

### "No MCP servers" or Jira commands don't work

- Make sure you completely quit and restarted Claude Desktop
- Check that Node.js is installed: `node --version`
- Run the setup again to reconfigure

### "Authentication failed"

- Regenerate your API token and run setup again
- Make sure your email matches your Jira login exactly

## Manual Setup

If you prefer to configure manually, see the [manual setup guide](../../docs/CLAUDE_DESKTOP_SETUP.md).
