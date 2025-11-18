# Product Feedback AI Analyzer

## Overview

An automated system that uses AI to analyze product feedback from Jira and delivers actionable insights via email twice weekly.

**Status:** ✅ Production Ready
**Tech Stack:** TypeScript, Node.js, Claude AI, Jira API, SendGrid
**Automation:** GitHub Actions
**Frequency:** Twice weekly (Monday & Thursday, 9 AM UTC)

---

## Executive Summary

### Problem
Product feedback scattered across Jira makes it difficult to:
- Stay on top of customer needs
- Identify emerging trends quickly
- Prioritize high-impact issues
- Make data-driven product decisions

### Solution
An AI-powered automation that:
1. Fetches recent product feedback from Jira
2. Analyzes feedback using Claude AI to identify patterns and priorities
3. Generates professional email reports with actionable insights
4. Runs automatically twice per week

### Benefits

| Benefit | Impact |
|---------|--------|
| **Stay informed** | Automatic twice-weekly summaries keep the team aligned |
| **Faster decisions** | AI-identified patterns and priorities reduce analysis time |
| **Better prioritization** | High-priority items are automatically surfaced |
| **Emerging trends** | Early detection of recurring issues and opportunities |
| **Time savings** | Eliminates manual review of hundreds of Jira tickets |

---

## How It Works

### Architecture

```
┌─────────────────────┐
│  GitHub Actions     │  Scheduled: Mon & Thu, 9 AM UTC
│  (Automation)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  TypeScript Agent   │  Orchestrates the entire workflow
└──────────┬──────────┘
           │
     ┌─────┴─────────────────┐
     │                        │
     ▼                        ▼
┌──────────┐          ┌──────────────┐
│   Jira   │          │  Claude AI   │
│  REST API│          │  (Anthropic) │
└──────────┘          └──────────────┘
     │                        │
     │    Fetches Issues      │  Analyzes &
     │    (4 days back)       │  Generates Insights
     │                        │
     └────────┬───────────────┘
              ▼
       ┌──────────────┐
       │   SendGrid   │  Sends formatted email report
       └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ Email Report │  Delivered to stakeholders
       └──────────────┘
```

### Workflow Steps

1. **Trigger**: GitHub Actions runs on schedule (Mon/Thu 9 AM UTC)
2. **Fetch**: Retrieves product feedback from specified Jira board (last 4 days)
3. **Process**: Simplifies and formats Jira issues for analysis
4. **Analyze**: Claude AI examines all feedback and identifies:
   - Key themes and patterns
   - High-priority items requiring attention
   - Emerging trends
   - Actionable recommendations
5. **Report**: Generates professional HTML email with:
   - Executive summary
   - Metrics (total, new, updated issues)
   - Key themes
   - High-priority items
   - Recommendations
   - Common labels
6. **Deliver**: Sends email to designated recipients via SendGrid

---

## Sample Email Report

### Metrics Dashboard
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Total Issues   │  │   New Issues    │  │ Updated Issues  │
│       42        │  │        8        │  │       15        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Executive Summary
> Analysis reveals a growing focus on performance optimization, with 8 new issues reported this period. The team is actively addressing authentication bugs, with 15 issues updated. High priority should be given to the mobile app performance concerns affecting multiple customers.

### Key Themes
- **Performance Optimization** - Multiple reports of slow load times on mobile
- **Authentication Issues** - Users experiencing logout problems
- **Feature Requests** - Growing demand for dark mode
- **API Integration** - Third-party integration challenges

### High Priority Items
- 🔴 **PROD-123**: Mobile app crashes on Android 14 - Affecting 30% of users
- 🔴 **PROD-145**: Payment gateway timeout - Revenue impact
- 🟡 **PROD-156**: Export feature fails for large datasets

### Recommendations
1. Prioritize mobile app stability investigation
2. Implement comprehensive payment monitoring
3. Add performance metrics to dashboards
4. Schedule technical debt sprint for authentication system

---

## Technical Details

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Language** | TypeScript/Node.js | Type-safe development |
| **AI Engine** | Claude (Anthropic) | Natural language analysis |
| **Data Source** | Jira REST API | Product feedback retrieval |
| **Email Service** | SendGrid | Email delivery |
| **Automation** | GitHub Actions | Scheduled execution |
| **Hosting** | GitHub (free tier) | Version control & CI/CD |

### Repository Structure

```
product-feedback/
├── .github/workflows/
│   └── analyze-feedback.yml    # GitHub Actions workflow
├── src/
│   ├── jira/
│   │   └── client.ts           # Jira API integration
│   ├── claude/
│   │   └── analyzer.ts         # AI analysis logic
│   ├── email/
│   │   └── sender.ts           # Email report generation
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   └── index.ts                # Main orchestration
├── dist/                       # Compiled JavaScript
├── .env.example                # Configuration template
└── README.md                   # Documentation
```

### Configuration

All configuration is managed via environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `JIRA_URL` | Atlassian domain | `https://company.atlassian.net` |
| `JIRA_EMAIL` | Jira account email | `user@company.com` |
| `JIRA_API_TOKEN` | Jira authentication | Generated from Atlassian |
| `JIRA_BOARD_ID` | Target board | `123` |
| `ANTHROPIC_API_KEY` | Claude AI access | From Anthropic console |
| `SENDGRID_API_KEY` | Email service | From SendGrid |
| `EMAIL_FROM` | Sender address | `notifications@company.com` |
| `EMAIL_TO` | Recipients | `team@company.com` |
| `DAYS_BACK` | Analysis window | `4` (default) |

### Security

- All API keys stored as GitHub Secrets (encrypted)
- No credentials in code or version control
- Read-only access to Jira (no write permissions needed)
- Minimal API permissions (least privilege principle)
- Regular security dependency updates via Dependabot

---

## Setup & Deployment

### Prerequisites

- GitHub account (free tier sufficient)
- Jira board with product feedback
- Anthropic API key ([Get one here](https://console.anthropic.com/settings/keys))
- SendGrid account ([Free tier available](https://sendgrid.com))

### Quick Start

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd product-feedback
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Test Locally**
   ```bash
   npm run build
   npm start
   ```

4. **Deploy to GitHub**
   - Push code to GitHub
   - Add secrets in Settings → Secrets → Actions
   - Workflow will run automatically on schedule

### Customization

**Change Schedule:**
Edit `.github/workflows/analyze-feedback.yml`:
```yaml
schedule:
  - cron: '0 9 * * 1,4'  # Monday & Thursday 9 AM UTC
```

**Adjust Analysis Period:**
Set `DAYS_BACK` environment variable to desired number of days.

**Modify Email Recipients:**
Update `EMAIL_TO` with comma-separated email addresses.

---

## Cost Analysis

### Monthly Operating Costs

| Service | Usage | Cost |
|---------|-------|------|
| **Anthropic Claude** | ~8 analyses/month | $4-16/month |
| **SendGrid** | 8 emails/month | Free (up to 100/day) |
| **GitHub Actions** | ~40 minutes/month | Free (up to 2000 min/month) |
| **Total** | | **$4-16/month** |

### ROI Considerations

**Time Savings:**
- Manual review: ~2 hours/week × 2 = 4 hours/week
- Automated: 5 minutes/week for review
- **Savings: 3.75 hours/week = ~15 hours/month**

**Value:**
- Average PM/analyst hourly rate: $75-150
- Monthly time savings value: **$1,125 - $2,250**
- **ROI: 7,000% - 14,000%**

---

## Maintenance & Support

### Monitoring

**Check execution status:**
1. Go to GitHub repository
2. Click "Actions" tab
3. View "Product Feedback Analysis" workflow runs
4. Review logs for any errors

**Email delivery:**
- Check SendGrid dashboard for delivery statistics
- Monitor bounce rates and spam reports
- Verify email formatting on mobile devices

### Troubleshooting

| Issue | Solution |
|-------|----------|
| No email received | Check GitHub Actions logs, verify SendGrid API key |
| "No issues found" | Verify board ID, check if issues were updated recently |
| Claude API error | Verify API key, check account credits |
| Jira connection failed | Confirm API token is valid, check permissions |

### Updates & Improvements

**Scheduled maintenance:**
- Monthly: Review dependencies for security updates
- Quarterly: Analyze report quality and adjust prompts
- Annually: Review costs and optimization opportunities

**Future enhancements:**
- Slack integration for real-time alerts
- Custom dashboards for metrics tracking
- Multi-board support for different product lines
- Sentiment analysis trending
- Integration with product roadmap tools

---

## Resources

### Documentation
- **Main README**: Full setup and usage guide
- **Contributing Guide**: Development guidelines
- **Repository**: [GitHub Link]

### API Documentation
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [SendGrid API](https://docs.sendgrid.com/api-reference)

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Team Contact**: [Your team's contact info]

---

## Success Metrics

### Key Performance Indicators

| Metric | Target | Current |
|--------|--------|---------|
| Email delivery rate | >99% | To be measured |
| Report generation success | >95% | To be measured |
| Stakeholder satisfaction | >4/5 | To be surveyed |
| Time to implement feedback | -25% | Baseline TBD |
| Issue resolution rate | +15% | Baseline TBD |

### Success Criteria

- ✅ Twice-weekly reports delivered consistently
- ✅ Zero manual intervention required
- ✅ Actionable insights in every report
- ✅ Positive feedback from product team
- ✅ Reduced time in backlog grooming meetings

---

## Team

**Project Owner:** [Name]
**Technical Lead:** [Name]
**Product Manager:** [Name]
**Stakeholders:** Product Team, Engineering Leadership

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-18 | 1.0.0 | Initial release |

---

## Questions?

Contact the team via [Slack channel / Email / etc.]

---

*Last updated: November 18, 2025*
*Document maintained by: [Your Name]*
