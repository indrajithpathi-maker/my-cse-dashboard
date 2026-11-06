// Company research proxy. Requests go only to CSE website endpoints.
// Endpoint availability, payloads and historical coverage are not guaranteed by a public API contract.
const BASE = 'https://www.cse.lk/api/';
async function post(endpoint, fields = {}) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
  const r = await fetch(BASE + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/json, text/plain, */*', 'Origin': 'https://www.cse.lk', 'Referer': 'https://www.cse.lk/' }, body: body.toString() });
  if (!r.ok) throw new Error(`${endpoint}: HTTP ${r.status}`);
  return r.json();
}
exports.handler = async event => {
  const symbol = String(event.queryStringParameters?.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'A valid CSE symbol is required.' }) };
  try {
    const [company, announcements, financial] = await Promise.allSettled([
      post('companyInfoSummery', { symbol }),
      post('approvedAnnouncement'),
      post('getFinancialAnnouncement')
    ]);
    const value = x => x.status === 'fulfilled' ? x.value : { error: x.reason?.message || 'Unavailable' };
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ symbol, company: value(company), announcements: value(announcements), financial: value(financial), chart: { error: 'Historical chart endpoint parameters and coverage have not yet been verified against the current CSE website. No substitute data is used.' }, fetchedAt: new Date().toISOString(), source: 'Colombo Stock Exchange' }) };
  } catch (e) { return { statusCode: 502, headers: headers(), body: JSON.stringify({ error: e.message, source: 'Colombo Stock Exchange' }) }; }
};
function headers() { return { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }; }
