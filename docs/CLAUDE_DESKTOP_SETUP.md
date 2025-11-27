# Claude Desktop + Jira Setup Guide

This guide will help you connect Claude Desktop to our Jira Product Discovery board so you can ask questions about product feedback directly in Claude.

## Quick Setup (Recommended)

**Download and double-click the installer for your system:**

- **Mac**: [Download Setup-Jira-for-Claude.command](../packages/boardiq-jira-setup/installers/Setup-Jira-for-Claude.command)
- **Windows**: [Download Setup-Jira-for-Claude.bat](../packages/boardiq-jira-setup/installers/Setup-Jira-for-Claude.bat)

The installer will:
1. Ask for your email
2. Ask for your Jira API token (with a link to create one)
3. Configure Claude Desktop automatically

**After running:** Restart Claude Desktop (Cmd+Q on Mac, or quit from system tray on Windows).

### Alternative: Command Line

If you prefer the terminal, run:

```bash
npx boardiq-jira-setup
```

---

## Manual Setup

If you prefer to configure manually, follow the steps below.

### Prerequisites

- Claude Desktop installed ([download here](https://claude.ai/download))
- Node.js 18+ installed ([download here](https://nodejs.org/))
- Access to Board Intelligence Jira

---

### Step 1: Get Your Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Enter a label like `Claude Desktop`
4. Click **Create**
5. **Copy the token immediately** (you won't be able to see it again)

---

### Step 2: Find Your Config File

#### On Mac

1. Open Finder
2. Press `Cmd + Shift + G` (Go to Folder)
3. Paste this path and press Enter:
   ```
   ~/Library/Application Support/Claude
   ```
4. Look for `claude_desktop_config.json`
   - If it doesn't exist, create a new file with that exact name

#### On Windows

1. Press `Win + R` (Run dialog)
2. Paste this path and press Enter:
   ```
   %APPDATA%\Claude
   ```
3. Look for `claude_desktop_config.json`
   - If it doesn't exist, create a new file with that exact name

---

### Step 3: Add the Configuration

Open `claude_desktop_config.json` in a text editor (TextEdit on Mac, Notepad on Windows).

#### If the file is empty or doesn't exist

Paste this entire block, replacing the placeholder values:

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@aashari/mcp-server-atlassian-jira"],
      "env": {
        "ATLASSIAN_SITE_NAME": "boardiq",
        "ATLASSIAN_USER_EMAIL": "YOUR_EMAIL@boardintelligence.com",
        "ATLASSIAN_API_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

#### If the file already has content

Add the `jira` section inside the existing `mcpServers` block. If there's no `mcpServers` block, add one.

---

### Step 4: Replace the Placeholders

In the config above, replace:

| Placeholder | Replace with |
|-------------|--------------|
| `YOUR_EMAIL@boardintelligence.com` | Your Jira login email |
| `YOUR_API_TOKEN_HERE` | The API token you copied in Step 1 |

**Note:** Keep `boardiq` as-is - this is our Jira site name.

---

### Step 5: Save and Restart

1. Save the config file
2. **Completely quit Claude Desktop** (not just close the window)
   - Mac: `Cmd + Q` or Claude menu → Quit
   - Windows: Right-click system tray icon → Quit
3. Reopen Claude Desktop

---

### Step 6: Test It

Try asking Claude:

- "Show me all issues in project BPD"
- "What issues were updated this week in BPD?"
- "Tell me about issue BPD-1028"
- "Search for issues mentioning stakeholder reporting"

If it works, Claude will fetch live data from Jira and respond with issue details.

---

## Troubleshooting

### "No MCP servers connected" or Jira commands don't work

- Make sure Node.js is installed: open Terminal/Command Prompt and run `node --version`
- Double-check your JSON syntax (missing commas, brackets)
- Verify your API token is correct
- Ensure Claude Desktop was fully quit and restarted

### "Authentication failed"

- Regenerate your API token and update the config
- Make sure your email matches your Jira login exactly

### JSON syntax errors

Use a JSON validator like https://jsonlint.com/ to check your config file.

---

## Example Queries

Once connected, you can ask things like:

| Query | What it does |
|-------|--------------|
| "List issues in BPD" | Shows all Product Discovery issues |
| "Show high priority BPD issues" | Filters by priority |
| "What's the status of BPD-1028?" | Gets details on a specific issue |
| "Find BPD issues about dashboards" | Searches issue content |
| "Issues updated in the last 7 days" | Recent activity |
| "Show comments on BPD-1028" | Gets discussion thread |

---

## Need Help?

Contact Lincoln Samuelson if you run into issues.
