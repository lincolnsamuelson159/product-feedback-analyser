import axios from 'axios';
import { JiraConfig } from '../types';

/**
 * Discover custom field IDs from Jira
 */
export async function discoverCustomFields(config: JiraConfig): Promise<void> {
  const client = axios.create({
    baseURL: `${config.url}/rest/api/3`,
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${config.email}:${config.apiToken}`
      ).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('\n🔍 Discovering Jira fields...\n');

    const response = await client.get('/field');
    const fields = response.data;

    // Look for fields that might be "Product Area" or "Page/Feature/Theme"
    const relevantFields = fields.filter((field: any) =>
      field.name &&
      (field.name.toLowerCase().includes('product') ||
       field.name.toLowerCase().includes('area') ||
       field.name.toLowerCase().includes('page') ||
       field.name.toLowerCase().includes('feature') ||
       field.name.toLowerCase().includes('theme'))
    );

    console.log('📋 Relevant custom fields found:');
    relevantFields.forEach((field: any) => {
      console.log(`  ${field.id}: ${field.name} (${field.schema?.type || 'unknown type'})`);
    });

    console.log('\n✅ Field discovery complete!\n');
    console.log('Copy the field IDs above and update your .env file or code.\n');
  } catch (error) {
    console.error('Error discovering fields:', error);
  }
}
