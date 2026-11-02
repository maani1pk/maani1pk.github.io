// Google Sheets synchronisation for the Abdur Studio client register.
// Pure logic (no Deno or Node specific APIs) so it runs in a Supabase Edge Function and in tests.
// Strategy: the database is the source of truth. Every sync rewrites each tab completely from the database,
// so the sheet can never contain duplicates or stale rows, and a failed sync is simply repeated.

export const HEADERS = ['Client ID', 'Submission date', 'Name', 'Company', 'Email', 'WhatsApp', 'Project type', 'Budget', 'Status', 'Priority',
  'Project value', 'Last contact', 'Follow-up date', 'Notes', 'Agreed budget', 'Project description'];

export const TABS = [
  { name: 'All Clients', match: () => true },
  { name: 'New Leads', match: (c) => c.status === 'NEW LEAD' },
  { name: 'Active Projects', match: (c) => c.status === 'ACTIVE CLIENT' },
  { name: 'Completed Projects', match: (c) => c.status === 'COMPLETED' },
  { name: 'Lost Leads', match: (c) => c.status === 'LOST' || c.status === 'ARCHIVED' },
];

const pad = (n) => String(n).padStart(2, '0');
export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
const num = (v) => (v === null || v === undefined || v === '' ? '' : Number(v));
const txt = (v) => (v === null || v === undefined ? '' : String(v));

export function rowFor(c) {
  return [txt(c.client_id), fmtDateTime(c.created_at), txt(c.name), txt(c.company), txt(c.email), txt(c.whatsapp), txt(c.project_type), txt(c.budget),
    txt(c.status), txt(c.priority), num(c.project_value), txt(c.last_contact), txt(c.next_followup), txt(c.internal_notes), num(c.agreed_budget), txt(c.description)];
}

export function buildTabs(clients) {
  const sorted = [...clients].sort((a, b) => String(a.client_id).localeCompare(String(b.client_id)));
  return TABS.map((t) => ({ name: t.name, rows: [HEADERS, ...sorted.filter(t.match).map(rowFor)] }));
}

// ---- Google authentication with a service account (RS256 JWT, no libraries) ----
const b64url = (buf) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlText = (t) => b64url(new TextEncoder().encode(t));

async function importKey(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

export async function getAccessToken(sa, fetchFn = fetch, now = Math.floor(Date.now() / 1000)) {
  const header = b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64urlText(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const key = await importKey(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetchFn(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error(`Google sign-in failed (${res.status}): ${j.error_description || j.error || 'no token'}`);
  return j.access_token;
}

async function gfetch(token, url, init = {}, fetchFn = fetch) {
  const res = await fetchFn(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Sheets error ${res.status}: ${j.error?.message || 'request failed'}`);
  return j;
}

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

// Creates any missing tabs and styles the header row. Returns the sheet ids by tab name.
export async function ensureTabs(token, spreadsheetId, fetchFn = fetch) {
  const meta = await gfetch(token, `${API}/${spreadsheetId}?fields=sheets.properties`, {}, fetchFn);
  const have = new Map((meta.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]));
  const add = TABS.filter((t) => !have.has(t.name)).map((t) => ({ addSheet: { properties: { title: t.name, gridProperties: { frozenRowCount: 1 } } } }));
  if (add.length) {
    const r = await gfetch(token, `${API}/${spreadsheetId}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: add }) }, fetchFn);
    (r.replies || []).forEach((x) => x.addSheet && have.set(x.addSheet.properties.title, x.addSheet.properties.sheetId));
    const style = [...have.entries()].filter(([n]) => add.some((a) => a.addSheet.properties.title === n)).map(([, id]) => ({
      repeatCell: { range: { sheetId: id, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.9, blue: 0.98 } } }, fields: 'userEnteredFormat(textFormat,backgroundColor)' },
    }));
    if (style.length) await gfetch(token, `${API}/${spreadsheetId}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: style }) }, fetchFn);
  }
  return have;
}

// Full rewrite of every tab. RAW input keeps text literal, so nothing a visitor typed can run as a spreadsheet formula.
export async function syncAll({ clients, spreadsheetId, serviceAccount, fetchFn = fetch }) {
  const token = await getAccessToken(serviceAccount, fetchFn);
  await ensureTabs(token, spreadsheetId, fetchFn);
  const tabs = buildTabs(clients);
  const q = (n) => encodeURIComponent(`'${n}'`);
  await gfetch(token, `${API}/${spreadsheetId}/values:batchClear`, { method: 'POST', body: JSON.stringify({ ranges: tabs.map((t) => `'${t.name}'`) }) }, fetchFn);
  await gfetch(token, `${API}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data: tabs.map((t) => ({ range: `'${t.name}'!A1`, majorDimension: 'ROWS', values: t.rows })) }),
  }, fetchFn);
  void q;
  return { tabs: tabs.map((t) => ({ name: t.name, rows: t.rows.length - 1 })), total: clients.length };
}
