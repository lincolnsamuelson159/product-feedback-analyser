#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

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

async function main() {
  const env = parseEnv(envPath);
  const email = env.JIRA_EMAIL;
  const token = env.JIRA_API_TOKEN;
  const anthropicKey = env.ANTHROPIC_API_KEY;

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
    console.log('\n✅ Jira MCP server configured!');
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

  // Check if Anthropic key is set
  if (!anthropicKey || anthropicKey === 'sk-ant-api03-xxxxx') {
    console.log('\n⚠️  ANTHROPIC_API_KEY not set in .env');
    console.log('   Add it to .env, then run: npm run dev\n');
    process.exit(0);
  }

  // Ask if they want to test
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n🚀 Ready to test? (Y/n): ', (answer) => {
    rl.close();

    if (answer.toLowerCase() === 'n') {
      console.log('\n   Run "npm run dev" when ready to test.\n');
      process.exit(0);
    }

    console.log('\n🧪 Running npm run dev...\n');
    const child = spawn('npm', ['run', 'dev'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      process.exit(code);
    });
  });
}

main();
