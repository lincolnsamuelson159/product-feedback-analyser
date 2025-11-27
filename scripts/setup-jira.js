#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Parse .env file
function parseEnv(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
  }
  return env;
}

const env = parseEnv(envPath);
const email = env.JIRA_EMAIL;
const token = env.JIRA_API_TOKEN;

if (!email || email === 'your-email@example.com') {
  console.log('\n❌ JIRA_EMAIL not set in .env');
  console.log('   Edit .env and add your Atlassian email\n');
  process.exit(1);
}

if (!token || token === 'your-api-token') {
  console.log('\n❌ JIRA_API_TOKEN not set in .env');
  console.log('   Get a token from: https://id.atlassian.com/manage-profile/security/api-tokens');
  console.log('   Then add it to .env\n');
  process.exit(1);
}

// Check if claude CLI is available
try {
  execSync('which claude', { stdio: 'ignore' });
} catch (e) {
  console.log('\n❌ Claude CLI not found');
  console.log('   Install it from: https://claude.ai/code\n');
  process.exit(1);
}

// Remove existing jira MCP if present
try {
  execSync('claude mcp remove jira -s local 2>/dev/null', { stdio: 'ignore' });
} catch (e) {
  // ignore - might not exist
}

// Add jira MCP with credentials from .env
console.log('\n🔧 Configuring Jira MCP server...');
try {
  execSync(
    `claude mcp add jira -s local -e ATLASSIAN_SITE_NAME=boardiq -e ATLASSIAN_USER_EMAIL="${email}" -e ATLASSIAN_API_TOKEN="${token}" -- npx -y @aashari/mcp-server-atlassian-jira`,
    { cwd: rootDir, stdio: 'inherit' }
  );
  console.log('\n✅ Jira MCP server configured!\n');
  console.log('   Restart Claude Code and run /mcp to connect\n');
} catch (e) {
  console.log('\n❌ Failed to configure Jira MCP server');
  console.log('   Try running manually:');
  console.log('   claude mcp add jira -s local \\');
  console.log('     -e ATLASSIAN_SITE_NAME=boardiq \\');
  console.log(`     -e ATLASSIAN_USER_EMAIL="${email}" \\`);
  console.log(`     -e ATLASSIAN_API_TOKEN="${token}" \\`);
  console.log('     -- npx -y @aashari/mcp-server-atlassian-jira\n');
  process.exit(1);
}
