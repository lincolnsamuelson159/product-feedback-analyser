#!/usr/bin/env node

/**
 * Setup script for Claude Code CLI users
 * Configures Jira, Salesforce, and Gong MCP servers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

function hasValidJiraCredentials(env) {
  return env.JIRA_EMAIL && env.JIRA_EMAIL !== 'your-email@example.com' &&
         env.JIRA_API_TOKEN && env.JIRA_API_TOKEN !== 'your-api-token';
}

function hasValidSalesforceCredentials(env) {
  return env.SALESFORCE_AUTH_URL &&
         env.SALESFORCE_AUTH_URL.startsWith('force://') &&
         env.SALESFORCE_AUTH_URL !== 'force://PlatformCLI::xxxxx@yourorg.my.salesforce.com';
}

function hasValidGongCredentials(env) {
  return env.GONG_ACCESS_KEY && env.GONG_ACCESS_KEY !== 'your-access-key' &&
         env.GONG_ACCESS_SECRET && env.GONG_ACCESS_SECRET !== 'your-access-secret';
}

function checkClaudeCli() {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function removeMcpServer(name) {
  try {
    execSync(`claude mcp remove ${name} -s local 2>/dev/null`, { stdio: 'ignore' });
  } catch (e) {
    // ignore - might not exist
  }
}

function addJiraMcp(env) {
  console.log('   Adding Jira MCP server...');
  removeMcpServer('jira');

  try {
    execSync(
      `claude mcp add jira -s local ` +
      `-e ATLASSIAN_SITE_NAME=boardiq ` +
      `-e ATLASSIAN_USER_EMAIL="${env.JIRA_EMAIL}" ` +
      `-e ATLASSIAN_API_TOKEN="${env.JIRA_API_TOKEN}" ` +
      `-- npx -y @aashari/mcp-server-atlassian-jira`,
      { cwd: rootDir, stdio: 'pipe' }
    );
    console.log('   ✅ Jira MCP configured');
    return true;
  } catch (e) {
    console.log('   ❌ Failed to configure Jira MCP');
    return false;
  }
}

function addSalesforceMcp(env) {
  console.log('   Adding Salesforce MCP server...');
  removeMcpServer('salesforce');

  // First, we need to authenticate Salesforce CLI using the auth URL
  const authUrlFile = path.join(rootDir, '.sf-auth-url.txt');

  try {
    // Write auth URL to temp file
    fs.writeFileSync(authUrlFile, env.SALESFORCE_AUTH_URL);

    // Authenticate using the auth URL
    execSync(`sf org login sfdx-url --sfdx-url-file "${authUrlFile}" --set-default`, {
      stdio: 'pipe',
      cwd: rootDir
    });

    // Clean up temp file
    fs.unlinkSync(authUrlFile);

    // Add the MCP server
    execSync(
      `claude mcp add salesforce -s local ` +
      `-- npx -y @salesforce/mcp --orgs DEFAULT_TARGET_ORG --toolsets data --allow-non-ga-tools`,
      { cwd: rootDir, stdio: 'pipe' }
    );
    console.log('   ✅ Salesforce MCP configured');
    return true;
  } catch (e) {
    // Clean up temp file if it exists
    if (fs.existsSync(authUrlFile)) {
      fs.unlinkSync(authUrlFile);
    }
    console.log('   ❌ Failed to configure Salesforce MCP');
    console.log('      Make sure Salesforce CLI is installed: npm install -g @salesforce/cli');
    return false;
  }
}

function addGongMcp(env) {
  console.log('   Adding Gong MCP server...');
  removeMcpServer('gong');

  try {
    execSync(
      `claude mcp add gong -s local ` +
      `-e GONG_ACCESS_KEY="${env.GONG_ACCESS_KEY}" ` +
      `-e GONG_ACCESS_SECRET="${env.GONG_ACCESS_SECRET}" ` +
      `-- npx -y @mseep/gong-mcp`,
      { cwd: rootDir, stdio: 'pipe' }
    );
    console.log('   ✅ Gong MCP configured');
    return true;
  } catch (e) {
    console.log('   ❌ Failed to configure Gong MCP');
    return false;
  }
}

async function main() {
  console.log('\n🔧 Setting up MCP servers for Claude Code CLI...\n');

  // Check Claude CLI is available
  if (!checkClaudeCli()) {
    console.log('❌ Claude CLI not found');
    console.log('   Install it from: https://claude.ai/code\n');
    process.exit(1);
  }

  // Check .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    console.log('   Run "npm install" first to create it\n');
    process.exit(1);
  }

  const env = parseEnv(envPath);
  const configured = [];

  // Configure Jira
  if (hasValidJiraCredentials(env)) {
    if (addJiraMcp(env)) configured.push('Jira');
  } else {
    console.log('   ⚠️  Jira credentials not found in .env - skipping');
  }

  // Configure Salesforce
  if (hasValidSalesforceCredentials(env)) {
    if (addSalesforceMcp(env)) configured.push('Salesforce');
  } else {
    console.log('   ⚠️  Salesforce credentials not found in .env - skipping');
  }

  // Configure Gong
  if (hasValidGongCredentials(env)) {
    if (addGongMcp(env)) configured.push('Gong');
  } else {
    console.log('   ⚠️  Gong credentials not found in .env - skipping');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  if (configured.length > 0) {
    console.log('  ✅ Configured: ' + configured.join(', '));
    console.log('');
    console.log('  You can now use these in Claude Code. Try:');
    if (configured.includes('Jira')) {
      console.log('    • "Show me recent Jira issues"');
    }
    if (configured.includes('Salesforce')) {
      console.log('    • "Query recent closed-won opportunities"');
    }
    if (configured.includes('Gong')) {
      console.log('    • "List recent Gong calls"');
    }
  } else {
    console.log('  ⚠️  No integrations configured');
    console.log('');
    console.log('  Add credentials to .env and run this again:');
    console.log('    npm run setup-cli');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main();
