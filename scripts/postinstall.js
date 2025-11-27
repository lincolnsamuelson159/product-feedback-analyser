#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Create .env from template if it doesn't exist
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\n✅ Created .env file');
  console.log('   Please add your ANTHROPIC_API_KEY to .env\n');
}

// Show Jira MCP setup instructions
console.log('📋 To set up Jira integration, run:');
console.log('   claude mcp add jira -s local \\');
console.log('     -e ATLASSIAN_SITE_NAME=boardiq \\');
console.log('     -e ATLASSIAN_USER_EMAIL=your-email@example.com \\');
console.log('     -e ATLASSIAN_API_TOKEN=your-token \\');
console.log('     -- npx -y @aashari/mcp-server-atlassian-jira');
console.log('\n   Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens\n');
