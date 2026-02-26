/**
 * Diagnostic script — tests the /api/v1/fx exchange rate proxy endpoint.
 *
 * Run while the server is running on port 3001:
 *   npx tsx src/test-fx.ts
 */
import http from 'http';

const url = 'http://localhost:3001/api/v1/fx?from=CNY&to=USD&money=1';
console.log(`Testing: GET ${url}\n`);

http.get(url, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status :', res.statusCode);
    console.log('Body   :', body);
    try {
      const json = JSON.parse(body);
      if (json.code === 200 && json.rate) {
        console.log(`\nPASS — 1 CNY = ${json.rate} USD`);
      } else {
        console.log('\nFAIL — unexpected response:', JSON.stringify(json, null, 2));
      }
    } catch {
      console.log('\nFAIL — could not parse JSON response');
    }
  });
}).on('error', (err: Error) => {
  console.log('\nFAIL — connection error:', err.message);
  console.log('Make sure the server is running:  npm run dev');
});
