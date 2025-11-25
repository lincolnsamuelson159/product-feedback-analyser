import http from 'http';
import https from 'https';
import { URL } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const CLIENT_ID = process.env.ATLASSIAN_CLIENT_ID;
const CLIENT_SECRET = process.env.ATLASSIAN_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
// Only request scopes that are enabled in your Atlassian app
const SCOPES = 'read:jira-work offline_access';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing ATLASSIAN_CLIENT_ID or ATLASSIAN_CLIENT_SECRET in .env');
  process.exit(1);
}

const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&prompt=consent`;

console.log('🔐 Atlassian OAuth Token Generator\n');
console.log('Step 1: Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nStep 2: Authorize the app when prompted');
console.log('\nStep 3: You\'ll be redirected to localhost - the server below will capture the code\n');
console.log('─'.repeat(60));
console.log('Starting local server on http://localhost:3000 ...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('❌ Authorization error:', error);
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Missing Code</h1><p>No authorization code received.</p>');
      return;
    }

    console.log('✅ Received authorization code');
    console.log('🔄 Exchanging code for tokens...\n');

    try {
      const tokenData = await exchangeCodeForTokens(code);

      // Save refresh token to file
      const tokenFile = path.join(process.cwd(), '.oauth-token.json');
      fs.writeFileSync(tokenFile, JSON.stringify({
        refreshToken: tokenData.refresh_token,
        updatedAt: new Date().toISOString()
      }, null, 2));

      console.log('✅ Tokens received successfully!\n');

      // Debug: log full response
      console.log('Full token response:', JSON.stringify(tokenData, null, 2));

      console.log('─'.repeat(60));
      console.log('REFRESH TOKEN (save this to .env as ATLASSIAN_REFRESH_TOKEN):');
      console.log('─'.repeat(60));
      console.log(tokenData.refresh_token || 'NOT RETURNED - check scopes');
      console.log('─'.repeat(60));
      console.log('\n✅ Token also saved to .oauth-token.json');
      console.log('\nYou can now close this terminal and run your app!\n');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>OAuth Success</title></head>
          <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">✅ Authorization Successful!</h1>
            <p>Your refresh token has been saved to <code>.oauth-token.json</code></p>
            <p>You can close this window and return to your terminal.</p>
            <h3>Next Steps:</h3>
            <ol>
              <li>The token is already saved locally</li>
              <li>For GitHub Actions, copy the refresh token from your terminal to your secrets</li>
              <li>Run <code>npm run dev</code> to test the integration</li>
            </ol>
          </body>
        </html>
      `);

      // Close server after a short delay
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (err) {
      console.error('❌ Failed to exchange code for tokens:', err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Token Exchange Failed</h1><p>${err}</p>`);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>Not Found</h1>');
  }
});

server.listen(3000, () => {
  console.log('Waiting for authorization callback...\n');
});

function exchangeCodeForTokens(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    });

    const options = {
      hostname: 'auth.atlassian.com',
      port: 443,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error_description || parsed.error || 'Unknown error'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
