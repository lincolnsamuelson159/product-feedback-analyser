import sgMail from '@sendgrid/mail';
import { EmailConfig, AnalysisResult, SimplifiedIssue } from '../types';

/**
 * Email sender for product feedback reports
 */
export class EmailSender {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    sgMail.setApiKey(config.apiKey);
  }

  /**
   * Send product feedback report
   */
  async sendReport(analysis: AnalysisResult, issues?: SimplifiedIssue[]): Promise<void> {
    const subject = this.generateSubject(analysis);
    const htmlContent = this.generateHtmlReport(analysis, issues);
    const textContent = this.generateTextReport(analysis);

    try {
      await sgMail.send({
        to: this.config.to,
        from: this.config.from,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Email report sent successfully to ${this.config.to}`);
    } catch (error) {
      console.error('SendGrid Error:', error);
      throw new Error(`Failed to send email report: ${error}`);
    }
  }

  /**
   * Generate email subject line
   */
  private generateSubject(analysis: AnalysisResult): string {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `Product Feedback Summary - ${date} (${analysis.metrics.totalIssues} issues)`;
  }

  /**
   * Generate HTML email content
   */
  private generateHtmlReport(analysis: AnalysisResult, issues?: SimplifiedIssue[]): string {
    const { metrics } = analysis;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Feedback Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #333;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 3px solid #333;
      padding-left: 15px;
    }
    .metrics {
      display: flex;
      gap: 20px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .metric-card {
      background: #f5f5f5;
      color: #333;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      flex: 1;
      min-width: 150px;
      text-align: center;
    }
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .metric-label {
      font-size: 14px;
      opacity: 0.9;
    }
    .summary {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 3px solid #ddd;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .priority-item {
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border-left: 3px solid #ddd;
    }
    .theme-item {
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border-left: 3px solid #ddd;
    }
    .recommendation-item {
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border-left: 3px solid #ddd;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #7f8c8d;
      text-align: center;
    }
    .issue-key {
      background-color: #e8f4f8;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      color: #0066cc;
    }
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 15px;
    }
    .label {
      background-color: #f5f5f5;
      color: #333;
      border: 1px solid #ddd;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Product Feedback Summary</h1>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">${metrics.totalIssues}</div>
        <div class="metric-label">Total Issues</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.newIssues}</div>
        <div class="metric-label">New Issues</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.updatedIssues}</div>
        <div class="metric-label">Updated Issues</div>
      </div>
    </div>

    <h2>Executive Summary</h2>
    <div class="summary">
      ${this.formatSummaryAsBullets(analysis.summary)}
    </div>

    ${analysis.highPriorityItems.length > 0 ? `
    <h2>High Priority Items</h2>
    ${analysis.highPriorityItems.map(item => `
      <div class="priority-item">${this.formatText(item)}</div>
    `).join('')}
    ` : ''}

    ${analysis.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${analysis.recommendations.map(rec => `
      <div class="recommendation-item">${this.formatText(rec)}</div>
    `).join('')}
    ` : ''}

    ${issues && issues.length > 0 ? `
    <h2>All Ideas</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 15%;">Product Area</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 45%;">Summary</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 20%;">Page/Feature/Theme</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 20%;">Created</th>
        </tr>
      </thead>
      <tbody>
        ${issues
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
          .map((issue, index) => {
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            return `
          <tr style="background-color: ${bgColor}; border-bottom: 1px solid #dee2e6;">
            <td style="padding: 12px;">
              ${issue.productArea || '—'}
            </td>
            <td style="padding: 12px;">
              <span class="issue-key">${issue.key}</span> ${issue.summary}
            </td>
            <td style="padding: 12px; color: #6c757d;">
              ${issue.pageFeatureTheme || '—'}
            </td>
            <td style="padding: 12px; color: #6c757d; font-size: 13px;">
              ${new Date(issue.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    ` : ''}

    ${metrics.commonLabels.length > 0 ? `
    <h2>Common Labels</h2>
    <div class="labels">
      ${metrics.commonLabels.map(label => `<span class="label">${label}</span>`).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated automatically by AI Product Feedback Analyzer</p>
      <p>Powered by Claude (Anthropic) | Data from Jira</p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format text to highlight issue keys
   */
  private formatText(text: string): string {
    // Highlight issue keys like ABC-123
    return text.replace(/([A-Z]+-\d+)/g, '<span class="issue-key">$1</span>');
  }

  /**
   * Format summary text as bullet points
   */
  private formatSummaryAsBullets(summary: string): string {
    // Split by lines and filter out empty lines
    const lines = summary
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // If it already looks like bullets (starts with -, *, or numbers), format as list
    if (lines.some(line => /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line))) {
      const bullets = lines
        .filter(line => /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line))
        .map(line => line.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, ''))
        .map(line => `<li style="margin-bottom: 10px; line-height: 1.6;">${this.formatText(line)}</li>`)
        .join('');

      return `<ul style="margin: 10px 0; padding-left: 20px; list-style-type: disc;">${bullets}</ul>`;
    }

    // Otherwise just format with highlighting
    return this.formatText(summary);
  }

  /**
   * Generate plain text email content (fallback)
   */
  private generateTextReport(analysis: AnalysisResult): string {
    let text = 'PRODUCT FEEDBACK SUMMARY\n';
    text += '='.repeat(50) + '\n\n';

    text += `Date: ${new Date().toLocaleDateString()}\n\n`;

    text += 'METRICS\n';
    text += `- Total Issues: ${analysis.metrics.totalIssues}\n`;
    text += `- New Issues: ${analysis.metrics.newIssues}\n`;
    text += `- Updated Issues: ${analysis.metrics.updatedIssues}\n\n`;

    text += 'EXECUTIVE SUMMARY\n';
    text += analysis.summary + '\n\n';

    if (analysis.highPriorityItems.length > 0) {
      text += 'HIGH PRIORITY ITEMS\n';
      analysis.highPriorityItems.forEach((item, i) => {
        text += `${i + 1}. ${item}\n`;
      });
      text += '\n';
    }

    if (analysis.recommendations.length > 0) {
      text += 'RECOMMENDATIONS\n';
      analysis.recommendations.forEach((rec, i) => {
        text += `${i + 1}. ${rec}\n`;
      });
      text += '\n';
    }

    if (analysis.metrics.commonLabels.length > 0) {
      text += 'COMMON LABELS\n';
      text += analysis.metrics.commonLabels.join(', ') + '\n\n';
    }

    text += '='.repeat(50) + '\n';
    text += 'Generated automatically by AI Product Feedback Analyzer\n';
    text += `Powered by Claude (Anthropic) | Data from Jira\n`;

    return text;
  }

  /**
   * Test SendGrid connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // SendGrid doesn't have a simple test endpoint, so we'll just verify the API key format
      if (!this.config.apiKey || !this.config.apiKey.startsWith('SG.')) {
        console.error('Invalid SendGrid API key format');
        return false;
      }
      console.log('SendGrid configuration looks valid');
      return true;
    } catch (error) {
      console.error('SendGrid test failed:', error);
      return false;
    }
  }
}
