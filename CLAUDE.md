# Claude Instructions for Product Feedback Analyzer

## First-Time Setup

If a user is setting up this project for the first time, guide them through these steps:

### 1. Install and setup
```bash
npm install
```

This will:
1. Create a `.env` file from the template
2. Prompt you to add your credentials (links provided)
3. Configure the Jira MCP server automatically
4. Ask if you want to run a test

**Note:** SendGrid settings in `.env` are optional (for email reports).

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

**Use the `jira` MCP server for all Jira queries** (e.g., `mcp__jira__jira_ls_issues`).

Example:
```
mcp__jira__jira_ls_issues(
  jql: "project = BPD ORDER BY updated DESC",
  limit: 20
)
```

## Important Notes

- Jira Product Discovery "Insights" are NOT accessible via API - only through the web UI
- MCP server can access: descriptions, comments, custom fields (Product Area, Page/Feature/Theme)
- The automated email reports SHOULD include recommendations - this instruction only applies to conversational responses
