import fs from 'fs';
import path from 'path';
import { SimplifiedIssue } from '../types';

const CACHE_FILE = path.join(process.cwd(), '.jira-data-cache.json');

interface CacheData {
  timestamp: string;
  issues: SimplifiedIssue[];
}

/**
 * Load issues from cache (always returns data, never reads the whole file at once)
 */
function loadCachedIssues(): SimplifiedIssue[] {
  if (!fs.existsSync(CACHE_FILE)) {
    throw new Error('No cached data found. Run "npm run query" first.');
  }

  const content = fs.readFileSync(CACHE_FILE, 'utf-8');
  const cache: CacheData = JSON.parse(content);
  return cache.issues;
}

/**
 * Search for issues by key (e.g., "BPD-957")
 */
export function findByKey(key: string): SimplifiedIssue | null {
  const issues = loadCachedIssues();
  return issues.find(issue => issue.key === key) || null;
}

/**
 * Search for issues by text in summary or description
 */
export function searchByText(searchTerm: string): SimplifiedIssue[] {
  const issues = loadCachedIssues();
  const lowerSearch = searchTerm.toLowerCase();

  return issues.filter(issue =>
    issue.summary.toLowerCase().includes(lowerSearch) ||
    issue.description.toLowerCase().includes(lowerSearch) ||
    issue.key.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Search by product area
 */
export function searchByProductArea(productArea: string): SimplifiedIssue[] {
  const issues = loadCachedIssues();
  const lowerSearch = productArea.toLowerCase();

  return issues.filter(issue =>
    issue.productArea?.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Search by theme
 */
export function searchByTheme(theme: string): SimplifiedIssue[] {
  const issues = loadCachedIssues();
  const lowerSearch = theme.toLowerCase();

  return issues.filter(issue =>
    issue.pageFeatureTheme?.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Get all issues (for full dataset queries)
 */
export function getAllIssues(): SimplifiedIssue[] {
  return loadCachedIssues();
}

/**
 * Format an issue for display
 */
export function formatIssue(issue: SimplifiedIssue): string {
  let output = `\n## ${issue.key}: ${issue.summary}\n\n`;
  output += `**Status:** ${issue.status}\n`;
  output += `**Priority:** ${issue.priority}\n`;
  output += `**Reporter:** ${issue.reporter}\n`;
  output += `**Created:** ${new Date(issue.created).toLocaleDateString()}\n`;
  output += `**Updated:** ${new Date(issue.updated).toLocaleDateString()}\n`;

  if (issue.productArea) {
    output += `**Product Area:** ${issue.productArea}\n`;
  }

  if (issue.pageFeatureTheme) {
    output += `**Theme:** ${issue.pageFeatureTheme}\n`;
  }

  if (issue.labels.length > 0) {
    output += `**Labels:** ${issue.labels.join(', ')}\n`;
  }

  output += `\n**Description:**\n${issue.description}\n`;

  if (issue.recentComments.length > 0) {
    output += `\n**Recent Comments:**\n`;
    issue.recentComments.forEach((comment, i) => {
      output += `${i + 1}. ${comment}\n`;
    });
  }

  return output;
}
