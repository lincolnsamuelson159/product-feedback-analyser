#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Create .env from template if it doesn't exist
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\n✅ Created .env file\n');
  console.log('📝 Next steps:');
  console.log('   1. Get a Jira API token from: https://id.atlassian.com/manage-profile/security/api-tokens');
  console.log('   2. Edit .env and fill in your credentials');
  console.log('   3. Run: npm run setup-jira');
  console.log('   4. Run: npm run dev\n');
} else {
  console.log('\n✅ .env file already exists\n');
}
