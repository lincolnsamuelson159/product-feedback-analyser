# Contributing to Product Feedback AI Analyzer

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone <your-fork-url>
   cd product-feedback
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your test credentials
   ```

4. **Build and test**
   ```bash
   npm run build
   npm run dev
   ```

## Code Style

This project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting

Before committing, run:
```bash
npm run lint
npm run format
```

## Project Structure

```
src/
├── jira/       # Jira API integration
├── claude/     # Claude AI analysis
├── email/      # SendGrid email sender
├── types/      # TypeScript type definitions
└── index.ts    # Main application logic
```

## Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add types for all functions and variables
   - Include error handling
   - Add console logging for debugging

3. **Test your changes**
   ```bash
   npm run build
   npm run dev
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Ensure code passes linting and builds successfully
- Test the changes locally before submitting

## Adding New Features

### Adding a New Analysis Type

1. Update `src/types/index.ts` with new types
2. Modify `src/claude/analyzer.ts` to include new analysis
3. Update email template in `src/email/sender.ts` if needed

### Adding a New Integration

1. Create a new directory under `src/` (e.g., `src/slack/`)
2. Implement the client with proper error handling
3. Add configuration to `src/types/index.ts`
4. Update environment variables in `.env.example`
5. Document in README.md

### Modifying the Schedule

Edit `.github/workflows/analyze-feedback.yml`:
```yaml
schedule:
  - cron: '0 9 * * 1,4'  # Change this line
```

## Common Tasks

### Testing Jira Connection
```typescript
const jiraClient = new JiraClient(config.jira);
await jiraClient.testConnection();
```

### Testing Claude Analysis
```typescript
const analyzer = new ClaudeAnalyzer(config.anthropic);
const analysis = await analyzer.analyzeIssues(issues);
```

### Testing Email Sending
```typescript
const emailSender = new EmailSender(config.email);
await emailSender.sendReport(analysis, issues);
```

## Debugging

### Enable Verbose Logging
The application already includes console.log statements. For more detailed debugging:
- Check GitHub Actions logs in the Actions tab
- Run locally with `npm run dev` to see real-time output

### Common Issues

**TypeScript errors:**
```bash
npm run build
```

**Linting errors:**
```bash
npm run lint
```

**API connection issues:**
- Verify all environment variables are set
- Check API keys are valid and not expired
- Test with manual API calls using curl or Postman

## Security

- Never commit API keys or credentials
- Use environment variables for all sensitive data
- Report security vulnerabilities privately via email (don't open public issues)

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Questions about implementation
- Documentation improvements

Thank you for contributing!
