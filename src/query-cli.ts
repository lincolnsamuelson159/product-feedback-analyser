import dotenv from 'dotenv';
import { loadJiraIssues } from './query/loader';
import { JiraConfig } from './types';

// Load environment variables
dotenv.config();

/**
 * CLI tool to fetch and cache Jira data for Claude Code queries
 */
async function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--refresh');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Jira Data Loader for Claude Code Queries                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const config: JiraConfig = {
      url: process.env.JIRA_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
      boardId: process.env.JIRA_BOARD_ID!
    };

    const issues = await loadJiraIssues(config, forceRefresh);

    console.log('📊 Summary:');
    console.log(`   Total issues: ${issues.length}`);

    // Count by product area
    const productAreas = new Map<string, number>();
    const themes = new Map<string, number>();

    issues.forEach(issue => {
      if (issue.productArea) {
        productAreas.set(issue.productArea, (productAreas.get(issue.productArea) || 0) + 1);
      }
      if (issue.pageFeatureTheme) {
        themes.set(issue.pageFeatureTheme, (themes.get(issue.pageFeatureTheme) || 0) + 1);
      }
    });

    if (productAreas.size > 0) {
      console.log('\n   Product Areas:');
      Array.from(productAreas.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([area, count]) => {
          console.log(`     - ${area}: ${count} issues`);
        });
    }

    if (themes.size > 0) {
      console.log('\n   Top Themes:');
      Array.from(themes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([theme, count]) => {
          console.log(`     - ${theme}: ${count} issues`);
        });
    }

    console.log('\n✅ Data is ready! You can now query it in Claude Code.');
    console.log('\n💡 Example questions to ask Claude Code:');
    console.log('   - "What are all the Insight Driver requests?"');
    console.log('   - "Show me the Pack Summary insights"');
    console.log('   - "Which clients are requesting voting features?"');
    console.log('   - "What are the Schroders requests about?"\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
