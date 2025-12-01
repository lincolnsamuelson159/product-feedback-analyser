#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
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

function hasValidCredentials(env) {
  const email = env.JIRA_EMAIL;
  const token = env.JIRA_API_TOKEN;
  const anthropicKey = env.ANTHROPIC_API_KEY;

  return email && email !== 'your-email@example.com' &&
         token && token !== 'your-api-token' &&
         anthropicKey && anthropicKey !== 'sk-ant-api03-xxxxx';
}

function configureJiraMcp(email, token) {
  // Check if claude CLI is available
  try {
    execSync('which claude', { stdio: 'ignore' });
  } catch (e) {
    console.log('\n⚠️  Claude CLI not found - skipping MCP setup');
    console.log('   Install from: https://claude.ai/code');
    console.log('   Then run: npm run setup-jira\n');
    return false;
  }

  // Remove existing jira MCP if present
  try {
    execSync('claude mcp remove jira -s local 2>/dev/null', { stdio: 'ignore' });
  } catch (e) {
    // ignore - might not exist
  }

  // Add jira MCP with credentials from .env
  console.log('🔧 Configuring Jira MCP server...');
  try {
    execSync(
      `claude mcp add jira -s local -e ATLASSIAN_SITE_NAME=boardiq -e ATLASSIAN_USER_EMAIL="${email}" -e ATLASSIAN_API_TOKEN="${token}" -- npx -y @aashari/mcp-server-atlassian-jira`,
      { cwd: rootDir, stdio: 'inherit' }
    );
    console.log('✅ Jira MCP server configured!');
    return true;
  } catch (e) {
    console.log('\n❌ Failed to configure Jira MCP server');
    console.log('   Run manually: npm run setup-jira\n');
    return false;
  }
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
      // Try VS Code first, fall back to default
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

async function promptAndContinue() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n📝 Setup: Add your credentials to .env\n');

    // Open credential pages in browser
    console.log('   Opening credential pages in your browser...');
    const jiraOpened = openInBrowser('https://id.atlassian.com/manage-profile/security/api-tokens');
    const anthropicOpened = openInBrowser('https://console.anthropic.com/settings/keys');

    if (jiraOpened && anthropicOpened) {
      console.log('   ✓ Jira API token page');
      console.log('   ✓ Anthropic API key page\n');
    } else {
      console.log('   Could not open browser. Visit manually:');
      console.log('   - https://id.atlassian.com/manage-profile/security/api-tokens');
      console.log('   - https://console.anthropic.com/settings/keys\n');
    }

    // Open .env in editor
    console.log('   Opening .env in your editor...');
    const editorOpened = openInEditor(envPath);
    if (!editorOpened) {
      console.log(`   Could not open editor. Edit manually: ${envPath}\n`);
    }

    console.log('\n   Add your credentials to .env, then save the file.\n');

    rl.question('Press Enter when done (or Ctrl+C to exit): ', () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  // Create .env from template if it doesn't exist
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('\n✅ Created .env file');
  }

  let env = parseEnv(envPath);

  // If credentials aren't set, prompt user to edit .env
  if (!hasValidCredentials(env)) {
    await promptAndContinue();
    env = parseEnv(envPath); // Re-read after user edits
  }

  // Validate credentials
  if (!env.JIRA_EMAIL || env.JIRA_EMAIL === 'your-email@example.com') {
    console.log('\n❌ JIRA_EMAIL not set in .env');
    console.log('   Edit .env and run: npm run setup-jira\n');
    process.exit(0);
  }

  if (!env.JIRA_API_TOKEN || env.JIRA_API_TOKEN === 'your-api-token') {
    console.log('\n❌ JIRA_API_TOKEN not set in .env');
    console.log('   Edit .env and run: npm run setup-jira\n');
    process.exit(0);
  }

  if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === 'sk-ant-api03-xxxxx') {
    console.log('\n❌ ANTHROPIC_API_KEY not set in .env');
    console.log('   Edit .env and run: npm run setup-jira\n');
    process.exit(0);
  }

  // Configure Jira MCP
  const mcpConfigured = configureJiraMcp(env.JIRA_EMAIL, env.JIRA_API_TOKEN);

  if (!mcpConfigured) {
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
