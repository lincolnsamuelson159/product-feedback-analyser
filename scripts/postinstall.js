#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

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
  const email = env.JIRA_EMAIL;
  const token = env.JIRA_API_TOKEN;

  return email && email !== 'your-email@example.com' &&
         token && token !== 'your-api-token';
}

function hasValidSalesforceCredentials(env) {
  const authUrl = env.SALESFORCE_AUTH_URL;
  return authUrl && authUrl.startsWith('force://') && authUrl !== 'force://PlatformCLI::xxxxx@yourorg.my.salesforce.com';
}

function hasValidGongCredentials(env) {
  const key = env.GONG_ACCESS_KEY;
  const secret = env.GONG_ACCESS_SECRET;
  return key && key !== 'your-access-key' &&
         secret && secret !== 'your-access-secret';
}

function getMissingCredentials(env) {
  const missing = [];
  if (!env.JIRA_EMAIL || env.JIRA_EMAIL === 'your-email@example.com') {
    missing.push('JIRA_EMAIL');
  }
  if (!env.JIRA_API_TOKEN || env.JIRA_API_TOKEN === 'your-api-token') {
    missing.push('JIRA_API_TOKEN');
  }
  return missing;
}

// MCP config path for Claude Desktop
function getClaudeDesktopConfigPath() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const platform = process.platform;

  return platform === 'darwin'
    ? path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    : path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
}

function configureClaudeDesktopMcp(env) {
  const configPath = getClaudeDesktopConfigPath();
  let config = { mcpServers: {} };

  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      config = { mcpServers: {} };
    }
  } else {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Configure Jira MCP
  if (hasValidJiraCredentials(env)) {
    config.mcpServers.jira = {
      command: 'npx',
      args: ['-y', '@aashari/mcp-server-atlassian-jira'],
      env: {
        ATLASSIAN_SITE_NAME: 'boardiq',
        ATLASSIAN_USER_EMAIL: env.JIRA_EMAIL,
        ATLASSIAN_API_TOKEN: env.JIRA_API_TOKEN
      }
    };
  }

  // Configure Salesforce MCP
  // Note: Salesforce MCP requires pre-authorized orgs via SF CLI
  // The SALESFORCE_AUTH_URL in .env is used by setup-cli.js to authenticate
  if (hasValidSalesforceCredentials(env)) {
    config.mcpServers.salesforce = {
      command: 'npx',
      args: ['-y', '@salesforce/mcp', '--orgs', 'DEFAULT_TARGET_ORG', '--toolsets', 'data', '--allow-non-ga-tools']
    };
  }

  // Configure Gong MCP
  if (hasValidGongCredentials(env)) {
    config.mcpServers.gong = {
      command: 'npx',
      args: ['-y', '@mseep/gong-mcp'],
      env: {
        GONG_ACCESS_KEY: env.GONG_ACCESS_KEY,
        GONG_ACCESS_SECRET: env.GONG_ACCESS_SECRET
      }
    };
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

function openInBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else if (platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
    return true;
  } catch (e) {
    return false;
  }
}

function openInEditor(filePath) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      try {
        execSync(`code "${filePath}"`, { stdio: 'ignore' });
      } catch (e) {
        execSync(`open "${filePath}"`, { stdio: 'ignore' });
      }
    } else if (platform === 'win32') {
      try {
        execSync(`code "${filePath}"`, { stdio: 'ignore' });
      } catch (e) {
        execSync(`notepad "${filePath}"`, { stdio: 'ignore' });
      }
    } else {
      execSync(`${process.env.EDITOR || 'nano'} "${filePath}"`, { stdio: 'inherit' });
    }
    return true;
  } catch (e) {
    return false;
  }
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function waitForEnter(rl, message) {
  return new Promise((resolve) => {
    rl.question(message, () => resolve());
  });
}

async function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.toLowerCase()));
  });
}

async function setupJiraCredentials(rl, env) {
  while (!hasValidJiraCredentials(env)) {
    const missing = getMissingCredentials(env);

    console.log('📝 You need to add your Jira credentials.\n');
    console.log('   Missing: ' + missing.join(', ') + '\n');

    console.log('   Opening Jira API token page in your browser...');
    openInBrowser('https://id.atlassian.com/manage-profile/security/api-tokens');

    console.log('   Opening .env file in your editor...\n');
    openInEditor(envPath);

    console.log('   In the .env file, fill in:');
    console.log('   - JIRA_EMAIL = your Atlassian email');
    console.log('   - JIRA_API_TOKEN = the token you create in the browser\n');

    await waitForEnter(rl, 'Press Enter after saving .env... ');
    env = parseEnv(envPath);

    if (!hasValidJiraCredentials(env)) {
      const stillMissing = getMissingCredentials(env);
      console.log('\n❌ Still missing: ' + stillMissing.join(', '));
      console.log('   Let\'s try again.\n');
    }
  }
  return env;
}

function checkSalesforceCli() {
  try {
    execSync('which sf', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function authenticateSalesforce(authUrl) {
  const authUrlFile = path.join(rootDir, '.sf-auth-url.txt');
  try {
    fs.writeFileSync(authUrlFile, authUrl);
    execSync(`sf org login sfdx-url --sfdx-url-file "${authUrlFile}" --set-default`, {
      stdio: 'pipe',
      cwd: rootDir
    });
    fs.unlinkSync(authUrlFile);
    return true;
  } catch (e) {
    if (fs.existsSync(authUrlFile)) {
      fs.unlinkSync(authUrlFile);
    }
    return false;
  }
}

async function setupSalesforceCredentials(rl, env) {
  console.log('\n📊 Salesforce Setup');

  const answer = await askQuestion(rl, 'Do you want to set up Salesforce? (y/N): ');
  if (answer !== 'y' && answer !== 'yes') {
    console.log('   Skipping Salesforce setup.\n');
    return env;
  }

  // Check if SF CLI is installed
  if (!checkSalesforceCli()) {
    console.log('\n   ⚠️  Salesforce CLI not found.');
    console.log('   Install it from: https://developer.salesforce.com/tools/salesforcecli');
    console.log('   Then run: npm run setup\n');
    return env;
  }

  console.log('\n   To get your Salesforce Auth URL:\n');
  console.log('   1. Run: sf org login web');
  console.log('      (This opens a browser to authenticate)\n');
  console.log('   2. After logging in, run:');
  console.log('      sf org display --verbose --json\n');
  console.log('   3. Find the "sfdxAuthUrl" field in the output');
  console.log('      It looks like: force://PlatformCLI::xxx@yourorg.my.salesforce.com\n');
  console.log('   4. Copy the FULL URL and paste it in .env as SALESFORCE_AUTH_URL\n');

  openInEditor(envPath);
  await waitForEnter(rl, 'Press Enter after saving .env... ');
  env = parseEnv(envPath);

  if (hasValidSalesforceCredentials(env)) {
    console.log('   Authenticating with Salesforce...');
    if (authenticateSalesforce(env.SALESFORCE_AUTH_URL)) {
      console.log('   ✅ Salesforce authenticated and configured!\n');
    } else {
      console.log('   ⚠️  Failed to authenticate. Check your Auth URL and try again.\n');
      console.log('   You can re-run setup later with: npm run setup\n');
    }
  } else {
    console.log('   ⚠️  Salesforce credentials not detected. You can add them later.\n');
  }
  return env;
}

async function setupGongCredentials(rl, env) {
  console.log('\n📞 Gong Setup');
  console.log('   You\'ll need API credentials from your Gong admin.\n');

  const answer = await askQuestion(rl, 'Do you want to set up Gong? (y/N): ');
  if (answer !== 'y' && answer !== 'yes') {
    console.log('   Skipping Gong setup.\n');
    return env;
  }

  console.log('\n   To get Gong API credentials:\n');
  console.log('   1. Ask your Gong admin to go to: Settings > Ecosystem > API');
  console.log('   2. Create a new API key pair');
  console.log('   3. You\'ll receive an Access Key and Access Secret\n');
  console.log('   4. Add them to .env as:');
  console.log('      GONG_ACCESS_KEY=your-access-key');
  console.log('      GONG_ACCESS_SECRET=your-access-secret\n');

  openInEditor(envPath);
  await waitForEnter(rl, 'Press Enter after saving .env... ');
  env = parseEnv(envPath);

  if (hasValidGongCredentials(env)) {
    console.log('   ✅ Gong credentials found!\n');
  } else {
    console.log('   ⚠️  Gong credentials not detected. You can add them later.\n');
  }
  return env;
}

async function main() {
  console.log('\n🔧 Setting up MCP servers for Claude Desktop...\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Available integrations:');
  console.log('  • Jira - Product feedback from Jira Product Discovery');
  console.log('  • Salesforce - CRM data, opportunities, close reasons');
  console.log('  • Gong - Sales call transcripts and insights');
  console.log('═══════════════════════════════════════════════════════\n');

  // Create .env from template if it doesn't exist
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }

  let env = parseEnv(envPath);
  const rl = createReadlineInterface();

  // Setup Jira (required)
  console.log('📋 Jira Setup (Required)\n');
  env = await setupJiraCredentials(rl, env);
  console.log('✅ Jira credentials configured!\n');

  // Setup Salesforce (optional)
  env = await setupSalesforceCredentials(rl, env);

  // Setup Gong (optional)
  env = await setupGongCredentials(rl, env);

  rl.close();

  // Configure Claude Desktop MCP
  console.log('🔧 Configuring Claude Desktop...');

  try {
    const configPath = configureClaudeDesktopMcp(env);

    const configured = [];
    if (hasValidJiraCredentials(env)) configured.push('Jira');
    if (hasValidSalesforceCredentials(env)) configured.push('Salesforce');
    if (hasValidGongCredentials(env)) configured.push('Gong');

    console.log('✅ Done!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎉 Setup complete!');
    console.log('');
    console.log('  Configured integrations: ' + configured.join(', '));
    console.log('');
    console.log('  Next steps:');
    console.log('  1. Restart Claude Desktop (Cmd+Q, then reopen)');
    console.log('  2. Try asking Claude:');
    if (hasValidJiraCredentials(env)) {
      console.log('     • "Show me recent Jira issues"');
    }
    if (hasValidSalesforceCredentials(env)) {
      console.log('     • "What are the recent closed-won opportunities?"');
    }
    if (hasValidGongCredentials(env)) {
      console.log('     • "List recent Gong calls"');
    }
    console.log('');
    console.log('  To add more integrations later, edit .env and run:');
    console.log('     npm run setup');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (e) {
    console.log('❌ Failed to configure Claude Desktop: ' + e.message);
    process.exit(1);
  }
}

main();
