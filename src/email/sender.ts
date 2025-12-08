import sgMail from '@sendgrid/mail';
import { EmailConfig, AnalysisResult, SimplifiedPage } from '../types';

/**
 * Email sender for Confluence reports
 */
export class EmailSender {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    sgMail.setApiKey(config.apiKey);
  }

  /**
   * Send Confluence analysis report
   */
  async sendConfluenceReport(analysis: AnalysisResult, pages?: SimplifiedPage[]): Promise<void> {
    const subject = this.generateSubject(analysis);
    const htmlContent = this.generateHtmlReport(analysis, pages);
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

    return `Confluence Summary - ${date} (${analysis.metrics.totalPages} pages)`;
  }

  /**
   * Generate HTML email content
   */
  private generateHtmlReport(analysis: AnalysisResult, pages?: SimplifiedPage[]): string {
    const { metrics } = analysis;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confluence Summary</title>
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
    }
    .metrics {
      display: flex;
      margin: 20px 0;
      flex-wrap: nowrap;
    }
    .metric-card {
      background: #ffffff;
      color: #333;
      padding: 20px 30px;
      border: 2px solid #ddd;
      border-radius: 8px;
      flex: 1;
      text-align: center;
      margin-right: 20px;
    }
    .metric-card:last-child {
      margin-right: 0;
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
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .highlight-item {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 10px;
    }
    .recommendation-item {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #7f8c8d;
      text-align: center;
    }
    .space-pill {
      display: inline-block;
      background-color: #E3F2FD;
      color: #1565C0;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Confluence Summary</h1>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">${metrics.totalPages}</div>
        <div class="metric-label">Total Pages</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.recentlyUpdated}</div>
        <div class="metric-label">Recently Updated</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.spaces.length}</div>
        <div class="metric-label">Spaces</div>
      </div>
    </div>

    <h2>Summary</h2>
    <div class="summary">
      ${analysis.summary}
    </div>

    ${analysis.highlights.length > 0 ? `
    <h2>Highlights</h2>
    <div class="highlight-item">
      <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
        ${analysis.highlights.map(item => `
          <li style="margin-bottom: 10px; line-height: 1.6;">${this.formatText(item)}</li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${analysis.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    <div class="recommendation-item">
      <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
        ${analysis.recommendations.map(rec => `
          <li style="margin-bottom: 10px; line-height: 1.6;">${this.formatText(rec)}</li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${pages && pages.length > 0 ? `
    <h2>All Pages</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 20%;">Space</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 50%;">Title</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 15%;">Version</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057; width: 15%;">Modified</th>
        </tr>
      </thead>
      <tbody>
        ${pages
          .sort((a, b) => {
            const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
            const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
            return dateB - dateA;
          })
          .map((page, index) => {
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            return `
          <tr style="background-color: ${bgColor}; border-bottom: 1px solid #dee2e6;">
            <td style="padding: 12px;">
              <span class="space-pill">${page.spaceKey}</span>
            </td>
            <td style="padding: 12px;">
              ${page.title}
            </td>
            <td style="padding: 12px; color: #6c757d;">
              v${page.version}
            </td>
            <td style="padding: 12px; color: #6c757d; font-size: 13px;">
              ${page.lastModified ? new Date(page.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    ` : ''}

    ${metrics.spaces.length > 0 ? `
    <h2>Spaces</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px;">
      ${metrics.spaces.map(space => `<span class="space-pill">${space}</span>`).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated automatically by AI Confluence Analyzer</p>
      <p>Powered by Claude (Anthropic) | Data from Confluence</p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format text to convert markdown bold to HTML
   */
  private formatText(text: string): string {
    // Convert markdown bold (**text**) to HTML bold
    let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Remove any remaining asterisks
    formatted = formatted.replace(/\*/g, '');
    return formatted;
  }

  /**
   * Generate plain text email content (fallback)
   */
  private generateTextReport(analysis: AnalysisResult): string {
    let text = 'CONFLUENCE SUMMARY\n';
    text += '='.repeat(50) + '\n\n';

    text += `Date: ${new Date().toLocaleDateString()}\n\n`;

    text += 'METRICS\n';
    text += `- Total Pages: ${analysis.metrics.totalPages}\n`;
    text += `- Recently Updated: ${analysis.metrics.recentlyUpdated}\n`;
    text += `- Spaces: ${analysis.metrics.spaces.join(', ')}\n\n`;

    text += 'SUMMARY\n';
    text += analysis.summary + '\n\n';

    if (analysis.highlights.length > 0) {
      text += 'HIGHLIGHTS\n';
      analysis.highlights.forEach((item, i) => {
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

    text += '='.repeat(50) + '\n';
    text += 'Generated automatically by AI Confluence Analyzer\n';
    text += `Powered by Claude (Anthropic) | Data from Confluence\n`;

    return text;
  }

  /**
   * Test SendGrid connection
   */
  async testConnection(): Promise<boolean> {
    try {
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
