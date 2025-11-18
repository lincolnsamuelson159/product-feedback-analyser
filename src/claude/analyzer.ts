import Anthropic from '@anthropic-ai/sdk';
import { AnthropicConfig, SimplifiedIssue, AnalysisResult } from '../types';

/**
 * Claude AI analyzer for product feedback
 */
export class ClaudeAnalyzer {
  private client: Anthropic;
  private model: string;

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Analyze product feedback issues
   * @param newIssues - Issues updated since last run (for Executive Summary, High Priority, Recommendations)
   * @param allIssues - All issues for historical context (for Key Themes)
   * @param lastRunDate - Date of last run for contextual phrasing
   */
  async analyzeIssues(
    newIssues: SimplifiedIssue[],
    allIssues?: SimplifiedIssue[],
    lastRunDate?: Date | null
  ): Promise<AnalysisResult> {
    if (newIssues.length === 0) {
      return this.getEmptyAnalysis();
    }

    console.log(`Analyzing ${newIssues.length} new issues with Claude...`);
    if (allIssues && allIssues.length !== newIssues.length) {
      console.log(`Using ${allIssues.length} total issues for Key Themes analysis...`);
    }

    // Format issues for Claude
    const newIssuesText = this.formatIssuesForAnalysis(newIssues);
    const allIssuesText = (allIssues && allIssues.length !== newIssues.length)
      ? this.formatIssuesForAnalysis(allIssues)
      : null;

    // Calculate metrics
    const metrics = this.calculateMetrics(newIssues);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: this.buildAnalysisPrompt(newIssuesText, allIssuesText, metrics, lastRunDate)
          }
        ]
      });

      const analysisText = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      return this.parseAnalysis(analysisText, metrics);
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error(`Failed to analyze issues with Claude: ${error}`);
    }
  }

  /**
   * Build the analysis prompt for Claude
   */
  private buildAnalysisPrompt(
    newIssuesText: string,
    allIssuesText: string | null,
    metrics: any,
    lastRunDate?: Date | null
  ): string {
    const lastRunContext = lastRunDate
      ? `\nLast email was sent: ${lastRunDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${lastRunDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : '';

    const themesInstruction = allIssuesText
      ? `\n## ALL Product Feedback Issues (for Executive Summary context)

${allIssuesText}

**Important for Executive Summary**: Use the ALL issues above to identify overarching themes. Reference the last run date and use comparative language like:
- "Theme continues to be..." (if same themes persist)
- "Theme has emerged since ${lastRunDate?.toLocaleDateString('en-US', { weekday: 'long' })}..." (if new themes)
- "No significant new themes since ${lastRunDate?.toLocaleDateString('en-US', { weekday: 'long' })}..." (if no new themes)
`
      : '';

    return `You are a product manager analyzing customer feedback from Jira. Review the following product feedback issues and provide a comprehensive analysis.${lastRunContext}

## NEW/UPDATED Product Feedback Issues (${metrics.totalIssues} new since last run)

${newIssuesText}
${themesInstruction}
## Your Task

Analyze these issues and provide analysis in this EXACT structure:

## Executive Summary
${allIssuesText ? 'Analyze ALL issues (both new and historical) to identify the 3 highest-level strategic themes. Use comparative language if there is history.' : 'Analyze the issues to identify key strategic themes.'}

Each bullet must:
1. Start with a HIGH-LEVEL THEME (not a specific ticket)
2. Explain the theme in 1-2 sentences
3. Reference supporting tickets in brackets at the end

Format:
- **Theme Name**: High-level description of what this theme represents and why it matters [BPD-XXX, BPD-YYY, BPD-ZZZ]
- **Theme Name**: High-level description of what this theme represents and why it matters [BPD-XXX, BPD-YYY]
- **Theme Name**: High-level description of what this theme represents and why it matters [BPD-XXX, BPD-YYY, BPD-ZZZ]

CRITICAL: Do NOT start bullets with ticket numbers. Start with the theme name.

## High Priority Items
Focus on NEW issues only. What needs immediate attention from the NEW feedback?
**BPD-XXX: Issue Title**
Why it's important: Revenue/customer impact
Recommended action: Specific next steps

**BPD-YYY: Issue Title**
Why it's important: Revenue/customer impact
Recommended action: Specific next steps

**BPD-ZZZ: Issue Title**
Why it's important: Revenue/customer impact
Recommended action: Specific next steps

## Recommendations
Focus on NEW issues only. What should we do based on NEW feedback?
1. Specific action with rationale [BPD-XXX]
2. Specific action with rationale [BPD-YYY]
3. Specific action with rationale [BPD-ZZZ]

## CRITICAL RULES - DO NOT DEVIATE:
- EXACTLY 3 bullets in Executive Summary (${allIssuesText ? 'high-level themes from ALL issues' : 'from provided issues'})
- Executive Summary bullets MUST start with **Theme Name**, NOT with [BPD-XXX]
- EXACTLY 3 items in High Priority Items (NEW issues only)
- EXACTLY 3 items in Recommendations (NEW issues only)
- NO MORE, NO LESS than 3 in each section
- Every section MUST be present
- Focus on the TOP 3 most critical items only

Please provide your analysis now following this EXACT format:`;
  }

  /**
   * Format issues for Claude analysis
   */
  private formatIssuesForAnalysis(issues: SimplifiedIssue[]): string {
    return issues.map((issue, index) => {
      let formatted = `### ${index + 1}. [${issue.key}] ${issue.summary}\n`;
      formatted += `- **Status**: ${issue.status}\n`;
      formatted += `- **Priority**: ${issue.priority}\n`;
      formatted += `- **Type**: ${issue.issueType}\n`;
      formatted += `- **Reporter**: ${issue.reporter}\n`;
      formatted += `- **Updated**: ${new Date(issue.updated).toLocaleDateString()}\n`;

      if (issue.labels.length > 0) {
        formatted += `- **Labels**: ${issue.labels.join(', ')}\n`;
      }

      formatted += `- **Description**: ${issue.description}\n`;

      if (issue.recentComments.length > 0) {
        formatted += `- **Recent Comments**:\n`;
        issue.recentComments.forEach(comment => {
          formatted += `  - ${comment.substring(0, 200)}\n`;
        });
      }

      formatted += '\n';
      return formatted;
    }).join('\n---\n\n');
  }

  /**
   * Parse Claude's analysis response
   */
  private parseAnalysis(text: string, metrics: any): AnalysisResult {
    // Extract structured data from Claude's response
    // This is a simple implementation - you could make it more sophisticated

    const lines = text.split('\n');
    const result: AnalysisResult = {
      summary: '',
      highPriorityItems: [],
      recommendations: [],
      metrics
    };

    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect sections
      if (trimmed.toLowerCase().includes('executive summary') ||
          trimmed.toLowerCase().includes('overview')) {
        currentSection = 'summary';
        continue;
      } else if (trimmed.toLowerCase().includes('high priority') ||
                 trimmed.toLowerCase().includes('immediate attention')) {
        currentSection = 'priority';
        continue;
      } else if (trimmed.toLowerCase().includes('recommendation')) {
        currentSection = 'recommendations';
        continue;
      }

      // Collect content based on current section
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

      if (currentSection === 'summary' && trimmed.length > 0) {
        result.summary += trimmed + ' ';
      } else if (currentSection === 'priority' && (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
        result.highPriorityItems.push(trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''));
      } else if (currentSection === 'recommendations' && (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
        result.recommendations.push(trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    }

    // If parsing didn't work well, just use the full text
    if (!result.summary) {
      result.summary = text.substring(0, 500);
    }

    return result;
  }

  /**
   * Calculate metrics from issues
   */
  private calculateMetrics(issues: SimplifiedIssue[]): any {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - (4 * 24 * 60 * 60 * 1000));

    const newIssues = issues.filter(issue =>
      new Date(issue.created) > fourDaysAgo
    ).length;

    const updatedIssues = issues.filter(issue =>
      new Date(issue.updated) > fourDaysAgo &&
      new Date(issue.created) <= fourDaysAgo
    ).length;

    // Count label frequency
    const labelCounts: Record<string, number> = {};
    issues.forEach(issue => {
      issue.labels.forEach(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
    });

    const commonLabels = Object.entries(labelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([label]) => label);

    return {
      totalIssues: issues.length,
      newIssues,
      updatedIssues,
      commonLabels
    };
  }

  /**
   * Get empty analysis for when there are no issues
   */
  private getEmptyAnalysis(): AnalysisResult {
    return {
      summary: 'No product feedback issues found in the specified time period.',
      highPriorityItems: [],
      recommendations: ['Continue monitoring for new feedback'],
      metrics: {
        totalIssues: 0,
        newIssues: 0,
        updatedIssues: 0,
        commonLabels: []
      }
    };
  }
}
