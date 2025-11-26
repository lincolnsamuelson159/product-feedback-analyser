# Claude Instructions for Product Feedback Analyzer

## First-Time Setup

If a user is setting up this project for the first time, guide them through these steps:

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Atlassian OAuth (Required)

1. Go to https://developer.atlassian.com/console/myapps/
2. Click **Create** → **OAuth 2.0 integration**
3. Name it (e.g., "Product Feedback Analyzer")
4. Under **Authorization**, add callback URL: `http://localhost:3000/callback`
5. Under **Permissions**, add scope: `read:jira-work`
6. Copy the **Client ID** and **Client Secret**

### 3. Find Cloud ID

Visit `https://boardiq.atlassian.net/_edge/tenant_info` and copy the `cloudId` value.

### 4. Get refresh token
```bash
npm run get-token
```
This opens a browser to authorize, then saves the token to `.oauth-token.json`.

### 5. Create `.env` file

Copy `.env.example` to `.env` and fill in:
- `ATLASSIAN_CLIENT_ID` - from step 2
- `ATLASSIAN_CLIENT_SECRET` - from step 2
- `ATLASSIAN_CLOUD_ID` - from step 3
- `ATLASSIAN_PROJECT_KEY` - use `BPD`
- `ANTHROPIC_API_KEY` - from https://console.anthropic.com/settings/keys
- `SENDGRID_API_KEY` - from SendGrid dashboard
- `EMAIL_FROM` - verified sender email in SendGrid
- `EMAIL_TO` - recipient email address

### 6. Test the setup
```bash
npm run dev
```

## Communication Style

**Do not include recommendations in responses.** When answering questions about Jira data, product features, or analysis:
- Provide facts and data only
- Skip obvious next steps or recommendations
- Avoid phrases like "you should", "we recommend", "consider", etc.
- If there are unknowns, simply state them without suggesting how to resolve them

Example of what NOT to do:
> "The ARR is £150,000. **Recommendation: Clarify with Schroders if this is required.**"

Example of what TO do:
> "The ARR is £150,000. Whether this feature is required for the deal is marked as TBC."

## Project Context

This is an automated product feedback analyzer that:
- Fetches issues from Jira Product Discovery (project: BPD)
- Uses Claude AI to analyze trends and priorities
- Sends twice-weekly email reports via SendGrid
- Uses MCP server for interactive Jira queries in Claude Code

## Multi-Client Insight Formatting

When analyzing issues with multiple client insights (multiple clients mentioned in comments), format as bullet points with indented sub-bullets:

**Client Name** (Contact names)
- **Problem**: Description of the problem/feedback
- **ARR Impact**: Value or "Not specified"
- **Required for deal?**: Answer or "Not specified"
- **Timeline**: Timeline or "Not specified"
- **Other clients affected?**: Answer or "Not specified"

Example:
**Keller Group** (Silvana CoSec, Jamie D, Asst CoSec)
- **Problem**: Struggle with s.172 for annual reports. Want to see stakeholder perspectives across all board packs.
- **ARR Impact**: Not specified
- **Required for deal?**: Client more likely to buy Insight Driver
- **Timeline**: n/a
- **Other clients affected?**: No

## MCP Server Usage

**Use `atlassian` MCP server for all Jira queries** (e.g., `mcp__atlassian__searchJiraIssuesUsingJql`).

Do NOT use the `jira` MCP server (`mcp__jira__*`) - it has authentication issues and returns empty results.

Example:
```
mcp__atlassian__searchJiraIssuesUsingJql(
  cloudId: "boardiq.atlassian.net",
  jql: "project = BPD ORDER BY updated DESC"
)
```

## Important Notes

- Jira Product Discovery "Insights" are NOT accessible via API - only through the web UI
- MCP server can access: descriptions, comments, custom fields (Product Area, Page/Feature/Theme)
- The automated email reports SHOULD include recommendations - this instruction only applies to conversational responses
