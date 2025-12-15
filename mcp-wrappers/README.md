# MCP Wrapper Scripts (1Password Integration)

These wrapper scripts fetch credentials from 1Password at runtime, ensuring no secrets are stored in plaintext config files.

## Prerequisites

1. **1Password CLI** installed:
   ```bash
   brew install 1password-cli
   ```

2. **Sign in to 1Password CLI**:
   ```bash
   op signin
   ```

## Setup

### 1. Create 1Password Items

Create the following items in your 1Password vault:

#### Atlassian (for Jira & Confluence)
- **Vault**: Private
- **Item name**: `Atlassian`
- **Fields**:
  - `email`: your-email@company.com
  - `api_token`: [Get from https://id.atlassian.com/manage-profile/security/api-tokens]

#### Figma
- **Vault**: Employee (or Private)
- **Item name**: `Figma MCP`
- **Fields**:
  - `notesPlain`: [Your Figma personal access token]

### 2. Install Wrapper Scripts

Copy scripts to Claude's application support directory:

```bash
# Create directory
mkdir -p ~/Library/Application\ Support/Claude/mcp-wrappers

# Copy and make executable
cp mcp-wrappers/*.sh ~/Library/Application\ Support/Claude/mcp-wrappers/
chmod +x ~/Library/Application\ Support/Claude/mcp-wrappers/*.sh
```

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "/Users/YOUR_USERNAME/Library/Application Support/Claude/mcp-wrappers/jira-mcp.sh"
    },
    "confluence": {
      "command": "/Users/YOUR_USERNAME/Library/Application Support/Claude/mcp-wrappers/confluence-mcp.sh"
    },
    "figma": {
      "command": "/Users/YOUR_USERNAME/Library/Application Support/Claude/mcp-wrappers/figma-mcp.sh"
    }
  }
}
```

### 4. Configure Claude Code CLI

```bash
# Remove any existing servers with plaintext credentials
claude mcp remove jira -s local
claude mcp remove confluence -s local

# Add servers using wrapper scripts
claude mcp add jira -s local -- bash "$HOME/Library/Application Support/Claude/mcp-wrappers/jira-mcp.sh"
claude mcp add confluence -s local -- bash "$HOME/Library/Application Support/Claude/mcp-wrappers/confluence-mcp.sh"
```

### 5. Restart Claude

- **Claude Desktop**: Cmd+Q to quit, then reopen
- **Claude Code**: Start a new session

## Security Benefits

- **No plaintext secrets** in config files
- **Credentials encrypted** in 1Password vault
- **Runtime fetching** - secrets only in memory during execution
- **Easy rotation** - update 1Password, no config changes needed
- **Audit trail** - 1Password logs access to secrets

## Troubleshooting

### "Failed to retrieve token from 1Password"

1. Ensure 1Password CLI is signed in: `op signin`
2. Verify item exists: `op item get "Atlassian" --vault Private`
3. Check field names match exactly

### Permission denied

```bash
chmod +x ~/Library/Application\ Support/Claude/mcp-wrappers/*.sh
```

### MCP server not connecting

Check Claude Desktop logs or run wrapper script manually:
```bash
~/Library/Application\ Support/Claude/mcp-wrappers/jira-mcp.sh
```
