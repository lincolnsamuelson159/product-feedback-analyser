#!/bin/bash
# Jira MCP wrapper - fetches credentials from 1Password at runtime
# Requires: 1Password CLI (op) installed and signed in

export ATLASSIAN_SITE_NAME="boardiq"
export ATLASSIAN_USER_EMAIL=$(op read "op://Private/Atlassian/email" 2>/dev/null || echo "your-email@company.com")
export ATLASSIAN_API_TOKEN=$(op read "op://Private/Atlassian/api_token")

if [ -z "$ATLASSIAN_API_TOKEN" ]; then
  echo "Failed to retrieve Atlassian token from 1Password" >&2
  echo "Create a 1Password item named 'Atlassian' in your Private vault with:" >&2
  echo "  - email: your Atlassian email" >&2
  echo "  - api_token: your API token from https://id.atlassian.com/manage-profile/security/api-tokens" >&2
  exit 1
fi

exec npx -y @aashari/mcp-server-atlassian-jira "$@"
