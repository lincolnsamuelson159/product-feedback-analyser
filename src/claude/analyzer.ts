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
   */
  async analyzeIssues(issues: SimplifiedIssue[]): Promise<AnalysisResult> {
    if (issues.length === 0) {
      return this.getEmptyAnalysis();
    }

    console.log(`Analyzing ${issues.length} issues with Claude...`);

    // Format issues for Claude
    const issuesText = this.formatIssuesForAnalysis(issues);

    // Calculate metrics
    const metrics = this.calculateMetrics(issues);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: this.buildAnalysisPrompt(issuesText, metrics)
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
  private buildAnalysisPrompt(issuesText: string, metrics: any): string {
    return `You are a product manager analyzing customer feedback from Jira. Review the following product feedback issues and provide a comprehensive analysis.

## Product Feedback Issues (${metrics.totalIssues} total)

${issuesText}

## Your Task

Analyze these issues and provide analysis in this EXACT structure:

## Executive Summary
- [BPD-XXX, BPD-YYY] First insight with issue keys in brackets
- [BPD-ZZZ] Second insight with issue keys in brackets
- [BPD-AAA, BPD-BBB] Third insight with issue keys in brackets

## Key Themes
**Theme 1 Title**
What it represents: 1-2 sentences with issue keys
Why it matters: 1-2 sentences with revenue/customer impact

**Theme 2 Title**
What it represents: 1-2 sentences with issue keys
Why it matters: 1-2 sentences with revenue/customer impact

**Theme 3 Title**
What it represents: 1-2 sentences with issue keys
Why it matters: 1-2 sentences with revenue/customer impact

## High Priority Items
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
1. Specific action with rationale [BPD-XXX]
2. Specific action with rationale [BPD-YYY]
3. Specific action with rationale [BPD-ZZZ]

## CRITICAL RULES - DO NOT DEVIATE:
- EXACTLY 3 bullets in Executive Summary
- EXACTLY 3 themes in Key Themes
- EXACTLY 3 items in High Priority Items
- EXACTLY 3 items in Recommendations
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
      keyThemes: [],
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
      } else if (trimmed.toLowerCase().includes('key theme')) {
        currentSection = 'themes';
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
      } else if (currentSection === 'themes' && (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
        result.keyThemes.push(trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''));
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
      keyThemes: [],
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
