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

function hasValidConfluenceCredentials(env) {
  const email = env.CONFLUENCE_EMAIL;
  const token = env.CONFLUENCE_API_TOKEN;

  return email && email !== 'your-email@example.com' &&
         token && token !== 'your-api-token';
}

function getMissingCredentials(env) {
  const missing = [];
  if (!env.CONFLUENCE_EMAIL || env.CONFLUENCE_EMAIL === 'your-email@example.com') {
    missing.push('CONFLUENCE_EMAIL');
  }
  if (!env.CONFLUENCE_API_TOKEN || env.CONFLUENCE_API_TOKEN === 'your-api-token') {
    missing.push('CONFLUENCE_API_TOKEN');
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

function configureClaudeDesktopMcp(email, token) {
  const mcpServer = {
    command: 'npx',
    args: ['-y', '@aashari/mcp-server-atlassian-confluence'],
    env: {
      ATLASSIAN_SITE_NAME: 'boardiq',
      ATLASSIAN_USER_EMAIL: email,
      ATLASSIAN_API_TOKEN: token
    }
  };

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

  config.mcpServers.confluence = mcpServer;
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

async function main() {
  console.log('\n🔧 Setting up Confluence MCP for Claude Desktop...\n');

  // Create .env from template if it doesn't exist
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }

  let env = parseEnv(envPath);
  const rl = createReadlineInterface();

  // Loop until we have valid credentials
  while (!hasValidConfluenceCredentials(env)) {
    const missing = getMissingCredentials(env);

    console.log('📝 You need to add your Confluence credentials to continue.\n');
    console.log('   Missing: ' + missing.join(', ') + '\n');

    // Open browser to get credentials
    console.log('   Opening Atlassian API token page in your browser...');
    openInBrowser('https://id.atlassian.com/manage-profile/security/api-tokens');

    // Open .env in editor
    console.log('   Opening .env file in your editor...\n');
    openInEditor(envPath);

    console.log('   In the .env file, fill in:');
    console.log('   - CONFLUENCE_EMAIL = your Atlassian email');
    console.log('   - CONFLUENCE_API_TOKEN = the token you create in the browser\n');

    await waitForEnter(rl, 'Press Enter after saving .env... ');

    // Re-read credentials
    env = parseEnv(envPath);

    if (!hasValidConfluenceCredentials(env)) {
      const stillMissing = getMissingCredentials(env);
      console.log('\n❌ Still missing: ' + stillMissing.join(', '));
      console.log('   Let\'s try again.\n');
    }
  }

  rl.close();

  // Configure Claude Desktop MCP
  console.log('\n✅ Credentials found!');
  console.log('🔧 Configuring Claude Desktop...');

  try {
    const configPath = configureClaudeDesktopMcp(env.CONFLUENCE_EMAIL, env.CONFLUENCE_API_TOKEN);
    console.log('✅ Done!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎉 Setup complete!');
    console.log('');
    console.log('  Next steps:');
    console.log('  1. Restart Claude Desktop (Cmd+Q, then reopen)');
    console.log('  2. Ask Claude: "Show me Confluence spaces"');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (e) {
    console.log('❌ Failed to configure Claude Desktop: ' + e.message);
    process.exit(1);
  }
}

main();
