import fs from 'fs';
import path from 'path';

const LAST_RUN_FILE = path.join(process.cwd(), '.last-run');

/**
 * Get the timestamp of the last successful run
 */
export function getLastRunTimestamp(): Date | null {
  try {
    if (fs.existsSync(LAST_RUN_FILE)) {
      const timestamp = fs.readFileSync(LAST_RUN_FILE, 'utf-8').trim();
      const date = new Date(timestamp);

      if (isNaN(date.getTime())) {
        console.log('⚠️  Invalid timestamp in .last-run file, treating as first run');
        return null;
      }

      return date;
    }
  } catch (error) {
    console.error('Error reading .last-run file:', error);
  }

  return null;
}

/**
 * Save the current timestamp as the last run time
 */
export function saveLastRunTimestamp(timestamp: Date = new Date()): void {
  try {
    fs.writeFileSync(LAST_RUN_FILE, timestamp.toISOString(), 'utf-8');
    console.log(`✅ Saved last run timestamp: ${timestamp.toISOString()}`);
  } catch (error) {
    console.error('Error saving .last-run file:', error);
  }
}

/**
 * Get a human-readable description of when the last run was
 */
export function getLastRunDescription(lastRun: Date | null): string {
  if (!lastRun) {
    return 'first run';
  }

  const now = new Date();
  const diffMs = now.getTime() - lastRun.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return 'less than an hour ago';
  }
}
