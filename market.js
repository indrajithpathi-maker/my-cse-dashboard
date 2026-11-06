// CSE website data proxy. Requests are sent only to the CSE website domain.
// The public-site endpoint contract is not an exchange-published API guarantee.
const BASE = 'https://www.cse.lk/api/';
async function post(endpoint, fields = {}) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
  const response = await fetch(BASE + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://www.cse.lk',
      'Referer': 'https://www.cse.lk/'
    },
    body: body.toString()
  });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  return response.json();
}
const statusText = value => typeof value === 'string' ? value : (value?.status || value?.marketStatus || 'Unknown');
exports.handler = async () => {
  try {
    // Always ask CSE for the authoritative market status first.
    const marketStatus = await post('marketStatus');
    const status = statusText(marketStatus);
    const isOpen = /open/i.test(status) && !/closed/i.test(status);
    if (!isOpen) {
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ marketStatus, marketOpen: false, source: 'Colombo Stock Exchange', fetchedAt: new Date().toISOString() }) };
    }
    const endpoints = [
      ['aspi', 'aspiData'], ['sl20', 'snpData'], ['marketSummary', 'marketSummery'],
      ['tradeSummary', 'tradeSummary'], ['topGainers', 'topGainers'],
      ['topLosers', 'topLooses'], ['mostActive', 'mostActiveTrades']
    ];
    const values = await Promise.all(endpoints.map(async ([key, endpoint]) => [key, await post(endpoint)]));
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ ...Object.fromEntries(values), marketStatus, marketOpen: true, source: 'Colombo Stock Exchange', fetchedAt: new Date().toISOString() }) };
  } catch (error) {
    return { statusCode: 502, headers: headers(), body: JSON.stringify({ error: `CSE data request failed: ${error.message}`, source: 'Colombo Stock Exchange' }) };
  }
};
function headers() { return { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }; }
