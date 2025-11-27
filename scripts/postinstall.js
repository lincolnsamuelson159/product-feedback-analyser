#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');

// Create .env from template if it doesn't exist
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\n✅ Created .env file');
  console.log('   Please add your ANTHROPIC_API_KEY to .env\n');
}

// Create .mcp.json for Atlassian MCP server
const mcpPath = path.join(rootDir, '.mcp.json');
let needsSetup = true;

if (fs.existsSync(mcpPath)) {
  try {
    const mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    // Check if atlassian is configured with the correct package
    if (mcpConfig.mcpServers && mcpConfig.mcpServers.atlassian) {
      const args = mcpConfig.mcpServers.atlassian.args || [];
      if (args.includes('@anthropic-ai/mcp-atlassian')) {
        needsSetup = false;
      }
    }
  } catch (e) {
    // Invalid JSON, will recreate
  }
}

if (needsSetup) {
  const mcpConfig = {
    mcpServers: {
      atlassian: {
        command: 'npx',
        args: [
          '@anthropic-ai/mcp-atlassian',
          '--jira-url',
          'https://boardiq.atlassian.net'
        ]
      }
    }
  };
  fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + '\n');
  console.log('✅ Created .mcp.json for Jira integration');
  console.log('   You will be prompted for your Jira credentials when you first use it\n');
}
