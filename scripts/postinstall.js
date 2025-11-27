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

// Add MCP server if claude CLI is available
try {
  // Check if claude CLI exists
  execSync('which claude', { stdio: 'ignore' });

  // Check if .mcp.json exists and already has atlassian configured
  const mcpPath = path.join(rootDir, '.mcp.json');
  let needsSetup = true;

  if (fs.existsSync(mcpPath)) {
    try {
      const mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      if (mcpConfig.mcpServers && mcpConfig.mcpServers.atlassian) {
        needsSetup = false;
      }
    } catch (e) {
      // Invalid JSON, will recreate
    }
  }

  if (needsSetup) {
    console.log('🔧 Setting up Atlassian MCP server...');
    execSync(
      'claude mcp add atlassian -- npx @anthropic-ai/mcp-atlassian --jira-url https://boardiq.atlassian.net --jira-email lincoln.samuelson@boardintelligence.com',
      { cwd: rootDir, stdio: 'inherit' }
    );
    console.log('✅ Atlassian MCP server configured');
    console.log('   You will be prompted for the Jira API token when you first use it\n');
  }
} catch (e) {
  // claude CLI not installed, skip MCP setup
  console.log('\nℹ️  Claude CLI not found. To enable Jira integration in Claude Code, install it and run:');
  console.log('   claude mcp add atlassian -- npx @anthropic-ai/mcp-atlassian --jira-url https://boardiq.atlassian.net --jira-email YOUR_EMAIL\n');
}
