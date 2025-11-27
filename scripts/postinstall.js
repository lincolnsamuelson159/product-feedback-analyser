#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = path.join(__dirname, '..');

// Create .env from template if it doesn't exist
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\n✅ Created .env file');
  console.log('   Please add your ANTHROPIC_API_KEY to .env\n');
}

// Check if running in interactive terminal and not in CI
const isInteractive = process.stdin.isTTY && !process.env.CI;

// Check if claude CLI is available
let hasClaudeCli = false;
try {
  execSync('which claude', { stdio: 'ignore' });
  hasClaudeCli = true;
} catch (e) {
  // claude CLI not installed
}

// Check if jira MCP is already configured
let hasJiraMcp = false;
try {
  const result = execSync('claude mcp list 2>/dev/null || true', { encoding: 'utf8' });
  hasJiraMcp = result.includes('jira');
} catch (e) {
  // ignore
}

async function setupJiraMcp() {
  if (!isInteractive) {
    console.log('\n📋 To set up Jira integration, run:');
    console.log('   claude mcp add jira -s local \\');
    console.log('     -e ATLASSIAN_SITE_NAME=boardiq \\');
    console.log('     -e ATLASSIAN_USER_EMAIL=your-email@example.com \\');
    console.log('     -e ATLASSIAN_API_TOKEN=your-token \\');
    console.log('     -- npx -y @aashari/mcp-server-atlassian-jira');
    console.log('\n   Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens\n');
    return;
  }

  if (!hasClaudeCli) {
    console.log('\n⚠️  Claude CLI not found. Install it first, then run: npm run setup-jira\n');
    return;
  }

  if (hasJiraMcp) {
    console.log('\n✅ Jira MCP server already configured\n');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  console.log('\n🔧 Setting up Jira MCP server...\n');

  // Open browser to token page
  const tokenUrl = 'https://id.atlassian.com/manage-profile/security/api-tokens';
  try {
    if (process.platform === 'darwin') {
      execSync(`open "${tokenUrl}"`, { stdio: 'ignore' });
    } else if (process.platform === 'linux') {
      execSync(`xdg-open "${tokenUrl}"`, { stdio: 'ignore' });
    }
    console.log(`📎 Opened browser to: ${tokenUrl}\n`);
  } catch (e) {
    console.log(`📎 Get your API token from: ${tokenUrl}\n`);
  }

  const email = await question('Enter your Atlassian email: ');
  const token = await question('Paste your Jira API token: ');

  rl.close();

  if (!email || !token) {
    console.log('\n⚠️  Skipping Jira setup (missing credentials)\n');
    return;
  }

  try {
    execSync(
      `claude mcp add jira -s local -e ATLASSIAN_SITE_NAME=boardiq -e ATLASSIAN_USER_EMAIL=${email} -e ATLASSIAN_API_TOKEN=${token} -- npx -y @aashari/mcp-server-atlassian-jira`,
      { cwd: rootDir, stdio: 'inherit' }
    );
    console.log('\n✅ Jira MCP server configured successfully!\n');
  } catch (e) {
    console.log('\n⚠️  Failed to configure Jira MCP server. Run manually:');
    console.log('   claude mcp add jira -s local \\');
    console.log('     -e ATLASSIAN_SITE_NAME=boardiq \\');
    console.log(`     -e ATLASSIAN_USER_EMAIL=${email} \\`);
    console.log('     -e ATLASSIAN_API_TOKEN=your-token \\');
    console.log('     -- npx -y @aashari/mcp-server-atlassian-jira\n');
  }
}

setupJiraMcp();
