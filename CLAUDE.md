# Claude Instructions for Product Feedback Analyzer

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

## Important Notes

- Jira Product Discovery "Insights" are NOT accessible via API - only through the web UI
- MCP server can access: descriptions, comments, custom fields (Product Area, Page/Feature/Theme)
- The automated email reports SHOULD include recommendations - this instruction only applies to conversational responses
