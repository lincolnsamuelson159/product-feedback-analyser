# Claude Instructions for Confluence Analyzer

## First-Time Setup

If a user is setting up this project for the first time, guide them through these steps:

### 1. Install and setup
```bash
npm install
```

This will:
1. Create a `.env` file from the template
2. Prompt you to add your credentials (links provided)
3. Configure the Confluence MCP server automatically

**Note:** SendGrid settings in `.env` are optional (for email reports).

## Communication Style

**Do not include recommendations in responses.** When answering questions about Confluence data or analysis:
- Provide facts and data only
- Skip obvious next steps or recommendations
- Avoid phrases like "you should", "we recommend", "consider", etc.
- If there are unknowns, simply state them without suggesting how to resolve them

## Project Context

This is a Confluence content analyzer that:
- Fetches pages from Confluence Cloud
- Uses Claude AI to analyze content
- Sends reports via SendGrid (optional)
- Uses MCP server for interactive Confluence queries in Claude Code

## MCP Server Usage

**Use the `confluence` MCP server for all Confluence queries.**

The MCP server (`@aashari/mcp-server-atlassian-confluence`) provides these tools:

### List Spaces
```
confluence_list_spaces()
```

### List Pages in a Space
```
confluence_list_pages(spaceKey: "SPACE")
```

### Get Page Content
```
confluence_get_page(pageId: "123456")
```

### Search with CQL
```
confluence_search(cql: "space=SPACE AND type=page")
```

### Common CQL Queries

- All pages in a space: `space=SPACE AND type=page`
- Recently modified: `lastModified >= now("-7d")`
- By title: `title ~ "keyword"`
- By content: `text ~ "search term"`
- Combined: `space=SPACE AND type=page AND lastModified >= now("-30d")`

## Important Notes

- The MCP server uses the Confluence Cloud REST API v2
- Authentication uses Atlassian API tokens (same as Jira)
- CQL (Confluence Query Language) is used for searching
- The automated email reports SHOULD include recommendations - this instruction only applies to conversational responses
