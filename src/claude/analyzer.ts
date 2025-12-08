import Anthropic from '@anthropic-ai/sdk';
import { AnthropicConfig, SimplifiedPage, AnalysisResult } from '../types';

/**
 * Claude AI analyzer for Confluence content
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
   * Analyze Confluence pages
   */
  async analyzePages(
    pages: SimplifiedPage[],
    lastRunDate?: Date | null
  ): Promise<AnalysisResult> {
    if (pages.length === 0) {
      return this.getEmptyAnalysis();
    }

    console.log(`Analyzing ${pages.length} pages with Claude...`);

    const pagesText = this.formatPagesForAnalysis(pages);
    const metrics = this.calculatePageMetrics(pages);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: this.buildPageAnalysisPrompt(pagesText, metrics, lastRunDate)
          }
        ]
      });

      const analysisText = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      return this.parsePageAnalysis(analysisText, metrics);
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error(`Failed to analyze pages with Claude: ${error}`);
    }
  }

  /**
   * Build analysis prompt for Confluence pages
   */
  private buildPageAnalysisPrompt(
    pagesText: string,
    metrics: any,
    lastRunDate?: Date | null
  ): string {
    const lastRunContext = lastRunDate
      ? `\nLast analysis was: ${lastRunDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
      : '';

    return `You are analyzing Confluence documentation pages. Review the following pages and provide insights.${lastRunContext}

## Confluence Pages (${metrics.totalPages} pages)

${pagesText}

## Your Task

Analyze these pages and provide analysis in this structure:

## Summary
Provide a 2-3 sentence overview of the content themes and documentation state.

## Highlights
List the 3 most notable or important pages/updates:
- **Page Title**: Why it's notable
- **Page Title**: Why it's notable
- **Page Title**: Why it's notable

## Recommendations
Provide 3 recommendations for documentation improvements:
1. Specific recommendation
2. Specific recommendation
3. Specific recommendation

Please provide your analysis now:`;
  }

  /**
   * Format pages for analysis
   */
  private formatPagesForAnalysis(pages: SimplifiedPage[]): string {
    return pages.map((page, index) => {
      let formatted = `### ${index + 1}. ${page.title}\n`;
      formatted += `- **Space**: ${page.spaceKey}\n`;
      formatted += `- **Status**: ${page.status}\n`;
      formatted += `- **Version**: ${page.version}\n`;
      if (page.lastModified) {
        formatted += `- **Last Modified**: ${new Date(page.lastModified).toLocaleDateString()}\n`;
      }
      if (page.content) {
        formatted += `- **Content Preview**: ${page.content.substring(0, 300)}...\n`;
      }
      formatted += '\n';
      return formatted;
    }).join('\n---\n\n');
  }

  /**
   * Parse page analysis response
   */
  private parsePageAnalysis(text: string, metrics: any): AnalysisResult {
    const result: AnalysisResult = {
      summary: '',
      highlights: [],
      recommendations: [],
      metrics
    };

    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().includes('summary') || trimmed.toLowerCase().includes('overview')) {
        currentSection = 'summary';
        continue;
      } else if (trimmed.toLowerCase().includes('highlight')) {
        currentSection = 'highlights';
        continue;
      } else if (trimmed.toLowerCase().includes('recommendation')) {
        currentSection = 'recommendations';
        continue;
      }

      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

      if (currentSection === 'summary' && trimmed.length > 0) {
        result.summary += trimmed + ' ';
      } else if (currentSection === 'highlights' && (trimmed.startsWith('-') || trimmed.startsWith('*'))) {
        result.highlights.push(trimmed.replace(/^[-*]\s*/, ''));
      } else if (currentSection === 'recommendations' && (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
        result.recommendations.push(trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    }

    if (!result.summary) {
      result.summary = text.substring(0, 500);
    }

    return result;
  }

  /**
   * Calculate metrics from pages
   */
  private calculatePageMetrics(pages: SimplifiedPage[]): any {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const recentlyUpdated = pages.filter(page =>
      page.lastModified && new Date(page.lastModified) > sevenDaysAgo
    ).length;

    const spaces = [...new Set(pages.map(p => p.spaceKey))];

    return {
      totalPages: pages.length,
      recentlyUpdated,
      spaces
    };
  }

  /**
   * Get empty analysis
   */
  private getEmptyAnalysis(): AnalysisResult {
    return {
      summary: 'No Confluence pages found.',
      highlights: [],
      recommendations: ['Add documentation to get started'],
      metrics: {
        totalPages: 0,
        recentlyUpdated: 0,
        spaces: []
      }
    };
  }
}
