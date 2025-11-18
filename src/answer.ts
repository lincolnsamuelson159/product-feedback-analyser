import dotenv from 'dotenv';
import { getAllIssues } from './query/search';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

/**
 * Answer a natural language question about the Jira data
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run answer "<your question>"');
    console.log('\nExamples:');
    console.log('  npm run answer "What are all the Insight Driver requests?"');
    console.log('  npm run answer "Tell me about Insight Driver Customisation"');
    console.log('  npm run answer "What are the Schroders requests?"');
    process.exit(1);
  }

  const question = args.join(' ');

  console.log(`\n🤔 Analyzing: "${question}"\n`);

  try {
    const issues = getAllIssues();

    // Send to Claude for analysis
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const prompt = `You are an AI assistant helping analyze product feedback from Jira.

I have ${issues.length} product feedback issues. Here's the data:

${JSON.stringify(issues, null, 2)}

User question: ${question}

Please answer the user's question based on the data above. Be specific and reference issue keys (like BPD-123) when relevant. If the question asks about specific issues, provide full details including the description, client information, and any other relevant fields.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log(answer);
    console.log('\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
