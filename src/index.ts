import dotenv from 'dotenv';
import { JiraClient } from './jira/client';
import { ClaudeAnalyzer } from './claude/analyzer';
import { EmailSender } from './email/sender';
import { Config } from './types';

// Load environment variables
dotenv.config();

/**
 * Load configuration from environment variables
 */
function loadConfig(): Config {
  const requiredEnvVars = [
    'JIRA_URL',
    'JIRA_EMAIL',
    'JIRA_API_TOKEN',
    'JIRA_BOARD_ID',
    'ANTHROPIC_API_KEY',
    'SENDGRID_API_KEY',
    'EMAIL_FROM',
    'EMAIL_TO'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    jira: {
      url: process.env.JIRA_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
      boardId: process.env.JIRA_BOARD_ID!
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: process.env.ANTHROPIC_MODEL
    },
    email: {
      apiKey: process.env.SENDGRID_API_KEY!,
      from: process.env.EMAIL_FROM!,
      to: process.env.EMAIL_TO!
    }
  };
}

/**
 * Main function to run the product feedback analysis
 */
async function main() {
  console.log('🚀 Starting Product Feedback AI Analyzer...\n');

  try {
    // Load configuration
    console.log('📋 Loading configuration...');
    const config = loadConfig();
    console.log('✅ Configuration loaded successfully\n');

    // Initialize clients
    console.log('🔧 Initializing clients...');
    const jiraClient = new JiraClient(config.jira);
    const claudeAnalyzer = new ClaudeAnalyzer(config.anthropic);
    const emailSender = new EmailSender(config.email);
    console.log('✅ Clients initialized\n');

    // Test connections
    console.log('🔌 Testing connections...');
    const jiraConnected = await jiraClient.testConnection();
    if (!jiraConnected) {
      throw new Error('Failed to connect to Jira. Please check your credentials.');
    }

    const emailConfigValid = await emailSender.testConnection();
    if (!emailConfigValid) {
      throw new Error('Failed to validate SendGrid configuration.');
    }
    console.log('✅ All connections verified\n');

    // Fetch issues from Jira
    console.log('📥 Fetching product feedback from Jira...');
    const daysBack = parseInt(process.env.DAYS_BACK || '4', 10);
    const issues = await jiraClient.fetchBoardIssues(daysBack);

    if (issues.length === 0) {
      console.log('⚠️  No issues found in the specified time period.');
      console.log('Skipping analysis and email.');
      return;
    }

    console.log(`✅ Fetched ${issues.length} issues\n`);

    // Simplify issues for analysis
    console.log('🔄 Processing issues...');
    const simplifiedIssues = jiraClient.simplifyIssues(issues);
    console.log('✅ Issues processed\n');

    // Analyze with Claude
    console.log('🤖 Analyzing feedback with Claude AI...');
    const analysis = await claudeAnalyzer.analyzeIssues(simplifiedIssues);
    console.log('✅ Analysis complete\n');

    // Display summary to console
    console.log('📊 Analysis Summary:');
    console.log('─'.repeat(50));
    console.log(`Total Issues: ${analysis.metrics.totalIssues}`);
    console.log(`New Issues: ${analysis.metrics.newIssues}`);
    console.log(`Updated Issues: ${analysis.metrics.updatedIssues}`);
    console.log(`\nExecutive Summary:`);
    console.log(analysis.summary);
    console.log('─'.repeat(50) + '\n');

    // Send email report
    console.log('📧 Sending email report...');
    await emailSender.sendReport(analysis);
    console.log('✅ Email sent successfully\n');

    console.log('🎉 Product Feedback Analysis completed successfully!');
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
