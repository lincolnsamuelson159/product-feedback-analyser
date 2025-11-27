#!/bin/bash

# Board Intelligence - Jira Setup for Claude Desktop
# Double-click this file to run it

clear
echo "════════════════════════════════════════════════════════════"
echo "  Board Intelligence - Jira Setup for Claude Desktop"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo ""
    echo "Please install Node.js first:"
    echo "  1. Go to: https://nodejs.org/"
    echo "  2. Download and install the LTS version"
    echo "  3. Run this installer again"
    echo ""
    echo "Press Enter to exit..."
    read
    exit 1
fi

# Config file location
CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

echo "This will configure Claude Desktop to connect to Jira."
echo ""

# Get email
echo "Step 1: Enter your Board Intelligence email"
echo -n "Email: "
read EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ Email is required"
    echo "Press Enter to exit..."
    read
    exit 1
fi

echo ""

# Get API token
echo "Step 2: Enter your Jira API Token"
echo ""
echo "Don't have one? Create it here:"
echo "  https://id.atlassian.com/manage-profile/security/api-tokens"
echo ""
echo -n "API Token: "
read TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ API Token is required"
    echo "Press Enter to exit..."
    read
    exit 1
fi

echo ""
echo "Configuring Claude Desktop..."

# Create directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Create or update config
if [ -f "$CONFIG_FILE" ]; then
    # Backup existing config
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%s)"
    echo "✓ Backed up existing config"

    # Check if it's valid JSON and has mcpServers
    if node -e "JSON.parse(require('fs').readFileSync('$CONFIG_FILE'))" 2>/dev/null; then
        # Use Node.js to merge the config
        node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE'));
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers.jira = {
    command: 'npx',
    args: ['-y', '@aashari/mcp-server-atlassian-jira'],
    env: {
        ATLASSIAN_SITE_NAME: 'boardiq',
        ATLASSIAN_USER_EMAIL: '$EMAIL',
        ATLASSIAN_API_TOKEN: '$TOKEN'
    }
};
fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2) + '\n');
"
    else
        # Invalid JSON, create new
        echo '{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@aashari/mcp-server-atlassian-jira"],
      "env": {
        "ATLASSIAN_SITE_NAME": "boardiq",
        "ATLASSIAN_USER_EMAIL": "'"$EMAIL"'",
        "ATLASSIAN_API_TOKEN": "'"$TOKEN"'"
      }
    }
  }
}' > "$CONFIG_FILE"
    fi
else
    # Create new config
    echo '{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@aashari/mcp-server-atlassian-jira"],
      "env": {
        "ATLASSIAN_SITE_NAME": "boardiq",
        "ATLASSIAN_USER_EMAIL": "'"$EMAIL"'",
        "ATLASSIAN_API_TOKEN": "'"$TOKEN"'"
      }
    }
  }
}' > "$CONFIG_FILE"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: You must restart Claude Desktop now."
echo ""
echo "   1. Quit Claude Desktop (Cmd+Q)"
echo "   2. Reopen Claude Desktop"
echo ""
echo "Then try asking Claude:"
echo '   • "Show me issues in project BPD"'
echo '   • "What issues were updated this week?"'
echo ""
echo "Press Enter to close this window..."
read
