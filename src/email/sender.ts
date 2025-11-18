import sgMail from '@sendgrid/mail';
import { EmailConfig, AnalysisResult } from '../types';

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
  async sendReport(analysis: AnalysisResult): Promise<void> {
    const subject = this.generateSubject(analysis);
    const htmlContent = this.generateHtmlReport(analysis);
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
  private generateHtmlReport(analysis: AnalysisResult): string {
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
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #2980b9;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #3498db;
      padding-left: 15px;
    }
    .metrics {
      display: flex;
      gap: 20px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
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
      background-color: #ecf0f1;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3498db;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .priority-item {
      background-color: #fff3cd;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border-left: 4px solid #ffc107;
    }
    .theme-item {
      background-color: #d1ecf1;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border-left: 4px solid #17a2b8;
    }
    .recommendation-item {
      background-color: #d4edda;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border-left: 4px solid #28a745;
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
      background-color: #6c757d;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Product Feedback Summary</h1>

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
      ${analysis.summary}
    </div>

    ${analysis.keyThemes.length > 0 ? `
    <h2>Key Themes</h2>
    ${analysis.keyThemes.map(theme => `
      <div class="theme-item">${this.formatText(theme)}</div>
    `).join('')}
    ` : ''}

    ${analysis.highPriorityItems.length > 0 ? `
    <h2>⚠️ High Priority Items</h2>
    ${analysis.highPriorityItems.map(item => `
      <div class="priority-item">${this.formatText(item)}</div>
    `).join('')}
    ` : ''}

    ${analysis.recommendations.length > 0 ? `
    <h2>💡 Recommendations</h2>
    ${analysis.recommendations.map(rec => `
      <div class="recommendation-item">${this.formatText(rec)}</div>
    `).join('')}
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

    if (analysis.keyThemes.length > 0) {
      text += 'KEY THEMES\n';
      analysis.keyThemes.forEach((theme, i) => {
        text += `${i + 1}. ${theme}\n`;
      });
      text += '\n';
    }

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
