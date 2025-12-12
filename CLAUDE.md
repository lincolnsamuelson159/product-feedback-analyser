# Claude Instructions for Product Feedback Analyzer

## First-Time Setup

If a user is setting up this project for the first time, guide them through these steps:

### 1. Install and setup
```bash
npm install
```

This will:
1. Create a `.env` file from the template
2. Prompt you to add your Jira credentials (required)
3. Optionally set up Salesforce integration (for CRM data)
4. Optionally set up Gong integration (for call transcripts)
5. Configure Claude Desktop MCP servers automatically

### 2. For Claude Code CLI users (optional)
After `npm install`, run:
```bash
npm run setup-cli
```
This configures the MCP servers for the Claude Code CLI instead of Claude Desktop.

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
- Pulls CRM data from Salesforce (opportunities, close reasons, objections)
- Analyzes sales call transcripts from Gong
- Uses Claude AI to analyze trends and priorities
- Sends twice-weekly email reports via SendGrid
- Uses MCP servers for interactive queries in Claude Code/Desktop

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

**Use the `jira` MCP server for all Jira queries** (e.g., `mcp__jira__jira_get`).

### Searching for Issues

When using `/rest/api/3/search/jql`, **always include the `fields` parameter** to get full issue data. The search endpoint returns only issue IDs by default.

```
mcp__jira__jira_get(
  path: "/rest/api/3/search/jql",
  queryParams: {
    "jql": "project=BPD ORDER BY created DESC",
    "maxResults": "10",
    "fields": "summary,status,description,created,issuetype,priority,creator,reporter,comment"
  }
)
```

**Never** call the search endpoint without specifying fields - this wastes API calls and tokens.

### Getting a Single Issue

For full issue details, use the issue endpoint directly:
```
mcp__jira__jira_get(
  path: "/rest/api/3/issue/{issueKey}",
  outputFormat: "json"
)
```

## Salesforce MCP Server Usage

**Use the `salesforce` MCP server for CRM queries** (if configured).

The Salesforce MCP provides SOQL query capabilities. Example queries:

```
-- Recent closed-won opportunities
SELECT Id, Name, Amount, CloseDate, StageName FROM Opportunity
WHERE StageName = 'Closed Won' ORDER BY CloseDate DESC LIMIT 10

-- Close-lost reasons
SELECT Id, Name, Loss_Reason__c, CloseDate FROM Opportunity
WHERE StageName = 'Closed Lost' ORDER BY CloseDate DESC

-- Opportunities by product
SELECT Id, Name, Amount, Product__c FROM Opportunity
WHERE Product__c = 'Product X'
```

## Gong MCP Server Usage

**Use the `gong` MCP server for call transcript analysis** (if configured).

Available tools:
- `list_calls` - List calls with optional date range filtering
- `retrieve_transcripts` - Get detailed transcripts for specific call IDs

Example workflow:
1. List recent calls: `list_calls(fromDateTime: "2025-01-01")`
2. Get transcripts: `retrieve_transcripts(callIds: ["call-id-1", "call-id-2"])`

## Important Notes

- Jira Product Discovery "Insights" are NOT accessible via API - only through the web UI
- MCP server can access: descriptions, comments, custom fields (Product Area, Page/Feature/Theme)
- Salesforce field names (like `Loss_Reason__c`) vary by org - query the schema if unsure
- Gong transcripts include speaker IDs, topics, and timestamped sentences
- The automated email reports SHOULD include recommendations - this instruction only applies to conversational responses
