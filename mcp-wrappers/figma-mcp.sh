#!/bin/bash
# Figma MCP wrapper - fetches token from 1Password at runtime
# Requires: 1Password CLI (op) installed and signed in

export FIGMA_PERSONAL_ACCESS_TOKEN=$(op read "op://Employee/Figma MCP/notesPlain")

if [ -z "$FIGMA_PERSONAL_ACCESS_TOKEN" ]; then
  echo "Failed to retrieve Figma token from 1Password" >&2
  exit 1
fi

exec npx -y mcp-figma "$@"
