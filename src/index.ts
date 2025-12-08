import dotenv from 'dotenv';
import { ConfluenceClient } from './confluence/client';
import { ClaudeAnalyzer } from './claude/analyzer';
import { EmailSender } from './email/sender';
import { Config } from './types';
import { getLastRunTimestamp, saveLastRunTimestamp, getLastRunDescription } from './utils/last-run';

// Load environment variables
dotenv.config();

/**
 * Load configuration from environment variables
 */
function loadConfig(): Config {
  const requiredEnvVars = [
    'CONFLUENCE_URL',
    'CONFLUENCE_EMAIL',
    'CONFLUENCE_API_TOKEN',
    'ANTHROPIC_API_KEY'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    confluence: {
      url: process.env.CONFLUENCE_URL || 'https://boardiq.atlassian.net',
      email: process.env.CONFLUENCE_EMAIL || '',
      apiToken: process.env.CONFLUENCE_API_TOKEN || '',
      spaceKey: process.env.CONFLUENCE_SPACE_KEY || ''
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: process.env.ANTHROPIC_MODEL
    },
    email: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      from: process.env.EMAIL_FROM || '',
      to: process.env.EMAIL_TO || '',
      confluenceUrl: process.env.CONFLUENCE_URL || 'https://boardiq.atlassian.net'
    }
  };
}

/**
 * Main function to run the Confluence content analysis
 */
async function main() {
  console.log('🚀 Starting Confluence Analyzer...\n');

  const runStartTime = new Date();

  try {
    // Check when we last ran
    const lastRun = getLastRunTimestamp();
    const lastRunDesc = getLastRunDescription(lastRun);

    if (lastRun) {
      console.log(`📅 Last run: ${lastRun.toLocaleString()} (${lastRunDesc})`);
      console.log(`   Will analyze pages updated since then\n`);
    } else {
      console.log('📅 First run - will analyze recent pages\n');
    }

    // Load configuration
    console.log('📋 Loading configuration...');
    const config = loadConfig();
    console.log('✅ Configuration loaded successfully\n');

    // Initialize clients
    console.log('🔧 Initializing clients...');
    const confluenceClient = new ConfluenceClient(config.confluence);
    const claudeAnalyzer = new ClaudeAnalyzer(config.anthropic);
    console.log('✅ Clients initialized\n');

    // Test connection
    console.log('🔌 Testing Confluence connection...');
    const connected = await confluenceClient.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Confluence. Please check your credentials.');
    }
    console.log('✅ Connection verified\n');

    // Fetch pages from Confluence
    console.log('📥 Fetching pages from Confluence...');
    const pages = config.confluence.spaceKey
      ? await confluenceClient.fetchSpacePages()
      : await confluenceClient.fetchRecentPages();

    if (pages.length === 0) {
      console.log('⚠️  No pages found.');
      return;
    }

    console.log(`✅ Fetched ${pages.length} pages\n`);

    // Simplify pages for analysis
    console.log('🔄 Processing pages...');
    const simplifiedPages = confluenceClient.simplifyPages(pages);
    console.log('✅ Pages processed\n');

    // Analyze with Claude
    console.log('🤖 Analyzing content with Claude AI...');
    const analysis = await claudeAnalyzer.analyzePages(simplifiedPages, lastRun);
    console.log('✅ Analysis complete\n');

    // Display summary to console
    console.log('📊 Analysis Summary:');
    console.log('─'.repeat(50));
    console.log(`Total Pages: ${analysis.metrics.totalPages}`);
    console.log(`Recently Updated: ${analysis.metrics.recentlyUpdated}`);
    console.log(`Spaces: ${analysis.metrics.spaces.join(', ')}`);
    console.log(`\nSummary:`);
    console.log(analysis.summary);
    console.log('─'.repeat(50) + '\n');

    // Send email report if configured
    if (config.email.apiKey && config.email.from && config.email.to) {
      console.log('📧 Sending email report...');
      const emailSender = new EmailSender(config.email);
      await emailSender.sendConfluenceReport(analysis, simplifiedPages);
      console.log('✅ Email sent successfully\n');
    }

    // Save the run timestamp for next time
    saveLastRunTimestamp(runStartTime);

    console.log('🎉 Confluence Analysis completed successfully!');
  } catch (error) {
    console.error('❌ Error occurred during execution:');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
