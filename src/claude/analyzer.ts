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

Analyze these issues and provide:

1. **Executive Summary** (2-3 sentences): High-level overview of the feedback landscape

2. **Key Themes** (3-5 themes): Identify and describe the main patterns, topics, or categories that emerge from the feedback. For each theme, explain what it represents and why it matters.

3. **High Priority Items** (3-5 items): Highlight specific issues that need immediate attention. For each item, include:
   - The issue key (e.g., ABC-123)
   - Why it's important
   - Recommended action

4. **Emerging Trends**: Any patterns in the data that suggest growing concerns or opportunities

5. **Recommendations** (3-5 actionable items): Specific actions the team should take based on this feedback

## Format Guidelines

- Be concise but specific
- Use bullet points for easy scanning
- Include issue keys when referencing specific items
- Focus on actionable insights
- Maintain a professional, objective tone
- Highlight both problems AND opportunities

Please provide your analysis now:`;
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
