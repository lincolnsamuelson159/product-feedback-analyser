const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message) {
  console.log(message);
}

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function getConfigPath() {
  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    // Windows
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error('APPDATA environment variable not found');
    }
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else {
    throw new Error(`Unsupported platform: ${platform}. This tool only supports macOS and Windows.`);
  }
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backupConfig(configPath) {
  if (fs.existsSync(configPath)) {
    const backupPath = `${configPath}.backup.${Date.now()}`;
    fs.copyFileSync(configPath, backupPath);
    return backupPath;
  }
  return null;
}

function readConfig(configPath) {
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse existing config file: ${e.message}`);
    }
  }
  return {};
}

function writeConfig(configPath, config) {
  ensureDirectoryExists(configPath);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function createJiraMcpConfig(email, token) {
  return {
    command: 'npx',
    args: ['-y', '@aashari/mcp-server-atlassian-jira'],
    env: {
      ATLASSIAN_SITE_NAME: 'boardiq',
      ATLASSIAN_USER_EMAIL: email,
      ATLASSIAN_API_TOKEN: token
    }
  };
}

async function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  log('');
  log(`${colors.bright}${colors.cyan}Board Intelligence Jira Setup for Claude Desktop${colors.reset}`);
  log('━'.repeat(50));
  log('');

  // Check platform
  let configPath;
  try {
    configPath = getConfigPath();
  } catch (e) {
    error(e.message);
    process.exit(1);
  }

  info(`Config location: ${configPath}`);
  log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Get email
    log(`${colors.bright}Step 1: Jira Email${colors.reset}`);
    log('Enter your Board Intelligence email address.');
    log('');
    const email = await prompt(rl, 'Email: ');

    if (!email) {
      error('Email is required');
      process.exit(1);
    }

    if (!email.includes('@')) {
      error('Please enter a valid email address');
      process.exit(1);
    }

    log('');

    // Get API token
    log(`${colors.bright}Step 2: Jira API Token${colors.reset}`);
    log('Create a token at: https://id.atlassian.com/manage-profile/security/api-tokens');
    log('');
    const token = await prompt(rl, 'API Token: ');

    if (!token) {
      error('API token is required');
      process.exit(1);
    }

    log('');

    // Read existing config and backup
    log(`${colors.bright}Step 3: Configuring Claude Desktop${colors.reset}`);

    const backupPath = backupConfig(configPath);
    if (backupPath) {
      info(`Backed up existing config to: ${path.basename(backupPath)}`);
    }

    const config = readConfig(configPath);

    // Merge in the jira MCP server
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    const hadExistingJira = !!config.mcpServers.jira;
    config.mcpServers.jira = createJiraMcpConfig(email, token);

    // Write config
    writeConfig(configPath, config);

    if (hadExistingJira) {
      success('Updated existing Jira MCP server configuration');
    } else {
      success('Added Jira MCP server to Claude Desktop config');
    }

    log('');
    log('━'.repeat(50));
    log(`${colors.bright}${colors.green}Setup Complete!${colors.reset}`);
    log('');
    warn('You must restart Claude Desktop for changes to take effect.');
    log('');
    log(`${colors.bright}Test it by asking Claude:${colors.reset}`);
    log('  • "Show me issues in project BPD"');
    log('  • "What BPD issues were updated this week?"');
    log('  • "Tell me about issue BPD-1028"');
    log('');

  } finally {
    rl.close();
  }
}

main().catch((e) => {
  error(`Unexpected error: ${e.message}`);
  process.exit(1);
});
