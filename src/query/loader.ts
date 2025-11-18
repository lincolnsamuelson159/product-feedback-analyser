import fs from 'fs';
import path from 'path';
import { JiraClient } from '../jira/client';
import { SimplifiedIssue, JiraConfig } from '../types';

const CACHE_FILE = path.join(process.cwd(), '.jira-data-cache.json');

interface CacheData {
  timestamp: string;
  issues: SimplifiedIssue[];
}

/**
 * Load Jira issues with caching
 */
export async function loadJiraIssues(config: JiraConfig, forceRefresh: boolean = false): Promise<SimplifiedIssue[]> {
  // Check cache first (unless force refresh)
  if (!forceRefresh && fs.existsSync(CACHE_FILE)) {
    try {
      const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cache: CacheData = JSON.parse(cacheContent);
      const cacheAge = Date.now() - new Date(cache.timestamp).getTime();
      const oneHour = 60 * 60 * 1000;

      // Use cache if less than 1 hour old
      if (cacheAge < oneHour) {
        console.log('📦 Using cached Jira data from', new Date(cache.timestamp).toLocaleString());
        console.log(`✅ Loaded ${cache.issues.length} issues from cache\n`);
        return cache.issues;
      } else {
        console.log('⏰ Cache is stale, fetching fresh data from Jira...\n');
      }
    } catch (error) {
      console.log('⚠️  Cache read failed, fetching fresh data from Jira...\n');
    }
  }

  // Fetch from Jira
  console.log('🚀 Fetching all issues from Jira...');
  const jiraClient = new JiraClient(config);
  const rawIssues = await jiraClient.fetchAllBoardIssues();
  const issues = jiraClient.simplifyIssues(rawIssues);
  console.log(`✅ Loaded ${issues.length} issues from Jira\n`);

  // Save to cache
  try {
    const cache: CacheData = {
      timestamp: new Date().toISOString(),
      issues
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log('💾 Cached data for future queries (valid for 1 hour)\n');
  } catch (error) {
    console.log('⚠️  Warning: Could not save cache\n');
  }

  return issues;
}

/**
 * Get cache info without loading
 */
export function getCacheInfo(): { exists: boolean; age?: number; count?: number; timestamp?: Date } {
  if (!fs.existsSync(CACHE_FILE)) {
    return { exists: false };
  }

  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache: CacheData = JSON.parse(cacheContent);
    const timestamp = new Date(cache.timestamp);
    const age = Date.now() - timestamp.getTime();

    return {
      exists: true,
      age,
      count: cache.issues.length,
      timestamp
    };
  } catch {
    return { exists: false };
  }
}
