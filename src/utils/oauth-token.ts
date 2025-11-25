import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join(process.cwd(), '.oauth-token.json');

interface StoredToken {
  refreshToken: string;
  updatedAt: string;
}

/**
 * Get the refresh token from environment or local file
 * Priority: Environment variable > Local file
 */
export function getRefreshToken(): string | null {
  // First check environment variable
  if (process.env.ATLASSIAN_REFRESH_TOKEN) {
    return process.env.ATLASSIAN_REFRESH_TOKEN;
  }

  // Then check local file
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as StoredToken;
      console.log(`📁 Using refresh token from local file (updated: ${data.updatedAt})`);
      return data.refreshToken;
    }
  } catch (error) {
    console.warn('⚠️ Failed to read local token file:', error);
  }

  return null;
}

/**
 * Save the new refresh token for the next run
 * In GitHub Actions, this will output a warning since we can't update secrets
 */
export function saveRefreshToken(newRefreshToken: string): void {
  const data: StoredToken = {
    refreshToken: newRefreshToken,
    updatedAt: new Date().toISOString()
  };

  // Always try to save locally
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
    console.log('✅ New refresh token saved to local file');
  } catch (error) {
    console.warn('⚠️ Failed to save refresh token locally:', error);
  }

  // If running in GitHub Actions, output warning
  if (process.env.GITHUB_ACTIONS) {
    console.log('');
    console.log('⚠️  IMPORTANT: Running in GitHub Actions');
    console.log('   The refresh token has been rotated. You need to update');
    console.log('   the ATLASSIAN_REFRESH_TOKEN secret with the new value.');
    console.log('');
    console.log('   New refresh token (first 20 chars): ' + newRefreshToken.substring(0, 20) + '...');
    console.log('');

    // Set output for GitHub Actions workflow
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `new_refresh_token=${newRefreshToken}\n`);
      fs.appendFileSync(outputFile, `token_rotated=true\n`);
    }
  }
}

/**
 * Check if we have all required OAuth configuration
 */
export function hasOAuthConfig(): boolean {
  const hasClientId = !!process.env.ATLASSIAN_CLIENT_ID;
  const hasClientSecret = !!process.env.ATLASSIAN_CLIENT_SECRET;
  const hasCloudId = !!process.env.ATLASSIAN_CLOUD_ID;
  const hasRefreshToken = !!getRefreshToken();

  return hasClientId && hasClientSecret && hasCloudId && hasRefreshToken;
}

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfig() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token found. Set ATLASSIAN_REFRESH_TOKEN or create .oauth-token.json');
  }

  return {
    clientId: process.env.ATLASSIAN_CLIENT_ID!,
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
    refreshToken,
    cloudId: process.env.ATLASSIAN_CLOUD_ID!,
    projectKey: process.env.JIRA_BOARD_ID || 'BPD'
  };
}
