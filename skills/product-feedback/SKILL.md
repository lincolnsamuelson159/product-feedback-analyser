---
name: product-feedback
description: "Use this skill when working in the product-feedback repository. Applies to ALL interactions involving Jira issues, product feedback analysis, client insights, or feature prioritization in this project."
---

# Product Feedback Analyzer

This skill governs all interactions within the product-feedback project.

## Communication Rules

**NEVER include recommendations.** When answering questions about Jira data, product features, or analysis:
- Provide facts and data only
- Skip obvious next steps or recommendations
- Avoid phrases like "you should", "we recommend", "consider", etc.
- If there are unknowns, simply state them without suggesting how to resolve them

**Example - WRONG:**
> "The ARR is £150,000. **Recommendation: Clarify with Schroders if this is required.**"

**Example - CORRECT:**
> "The ARR is £150,000. Whether this feature is required for the deal is marked as TBC."

## Multi-Client Insight Formatting

When analyzing issues with multiple client insights, format as:

**Client Name** (Contact names)
- **Problem**: Description of the problem/feedback
- **ARR Impact**: Value or "Not specified"
- **Required for deal?**: Answer or "Not specified"
- **Timeline**: Timeline or "Not specified"
- **Other clients affected?**: Answer or "Not specified"

## Project Context

- Jira Project: BPD (Product Discovery)
- MCP server available for Jira queries
- Jira Product Discovery "Insights" are NOT accessible via API - only through web UI
- MCP can access: descriptions, comments, custom fields (Product Area, Page/Feature/Theme)

## Automated Reports vs Conversations

- **Email reports**: SHOULD include recommendations
- **Conversations**: NEVER include recommendations (this skill applies)
