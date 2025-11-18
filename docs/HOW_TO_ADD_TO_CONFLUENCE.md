# How to Add This Page to Confluence

## Option 1: Copy & Paste (Easiest)

1. **Open the Confluence page file**
   - Location: `docs/CONFLUENCE_PAGE.md`

2. **Copy the entire content**
   - Select all (Cmd+A on Mac, Ctrl+A on Windows)
   - Copy (Cmd+C / Ctrl+C)

3. **Create new Confluence page**
   - Navigate to your Confluence space
   - Click "Create" button
   - Choose "Blank page"

4. **Paste the content**
   - Paste (Cmd+V / Ctrl+V)
   - Confluence will automatically format the markdown

5. **Adjust formatting if needed**
   - Add page cover image if desired
   - Adjust colors/styles using Confluence editor
   - Add page labels (e.g., "product", "automation", "ai")

6. **Publish**
   - Click "Publish" button
   - Set page permissions if needed

## Option 2: Import from File (Alternative)

1. **In Confluence, click "Create"**

2. **Choose "Import"**
   - Select "Markdown" if available

3. **Upload the file**
   - Select `docs/CONFLUENCE_PAGE.md`

4. **Review and publish**

## Option 3: Using Confluence REST API (Advanced)

If you want to automate page creation:

### Prerequisites
- Confluence API token
- Confluence space key
- Node.js installed

### Create automation script

Create `scripts/create-confluence-page.ts`:

```typescript
import axios from 'axios';
import fs from 'fs';

const CONFLUENCE_URL = 'https://your-domain.atlassian.net';
const CONFLUENCE_EMAIL = 'your-email@company.com';
const CONFLUENCE_API_TOKEN = 'your-api-token';
const SPACE_KEY = 'YOUR-SPACE';

async function createPage() {
  const content = fs.readFileSync('docs/CONFLUENCE_PAGE.md', 'utf-8');

  const response = await axios.post(
    `${CONFLUENCE_URL}/wiki/rest/api/content`,
    {
      type: 'page',
      title: 'Product Feedback AI Analyzer',
      space: { key: SPACE_KEY },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    },
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`
        ).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Page created:', response.data._links.webui);
}

createPage();
```

Run with:
```bash
npx ts-node scripts/create-confluence-page.ts
```

## Customization Tips

### Before Publishing

1. **Update placeholders:**
   - Replace `[Name]` with actual team member names
   - Add actual GitHub repository URL
   - Update contact information
   - Add your company logo

2. **Customize sections:**
   - Add company-specific branding
   - Include relevant team Slack channels
   - Link to related Confluence pages
   - Add deployment runbook if needed

3. **Add visual elements:**
   - Screenshots of email reports
   - Architecture diagrams using Confluence drawing tools
   - Embedded Jira filters
   - Team photos or avatars

### After Publishing

1. **Set page properties:**
   - Owner: Assign page owner
   - Labels: Add relevant tags (ai, automation, product, jira)
   - Restrictions: Set view/edit permissions

2. **Create child pages (optional):**
   - Technical Deep Dive
   - Troubleshooting Guide
   - Team Onboarding
   - Report Archive

3. **Link from other pages:**
   - Add to team wiki home page
   - Link from product documentation
   - Reference in onboarding materials

4. **Set up watchers:**
   - Add team members to watch the page
   - Enable notifications for updates

## Confluence Page Tips

### Use Confluence Macros

Enhance the page with Confluence-specific features:

- **Info Panel**: Highlight important notes
- **Status**: Show project status (Green/In Progress/etc.)
- **Table of Contents**: Auto-generate from headings
- **Jira Issues**: Embed live Jira filters
- **Code Block**: Format code snippets nicely
- **Expand**: Hide detailed sections by default

### Example Macros to Add

```
{info}
This is an automated system that requires no manual intervention once set up.
{info}

{status:colour=Green|title=Active}

{toc:maxLevel=3}
```

### Page Organization

Suggested page hierarchy:
```
📄 Product Feedback AI Analyzer (Main Page)
  ├── 📄 Setup Guide
  ├── 📄 Troubleshooting
  ├── 📄 Architecture Deep Dive
  ├── 📄 Sample Reports
  └── 📄 Meeting Notes & Decisions
```

## Maintaining the Page

### Regular Updates

- Update "Last updated" date when making changes
- Keep changelog current
- Update metrics as data becomes available
- Refresh screenshots if UI changes

### Version Control

The source markdown file is in Git, so:
- Keep both versions in sync
- Document major changes in changelog
- Review quarterly for accuracy

## Need Help?

- Check Confluence documentation: https://support.atlassian.com/confluence-cloud/
- Ask in your company's Confluence support channel
- Contact IT/admin for permissions issues

---

Happy documenting!
