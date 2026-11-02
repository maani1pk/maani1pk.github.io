// Supabase Edge Function: sync-sheets
// Copies the client register from the database into Google Sheets (5 tabs). Idempotent: safe to call as often as needed.
//
// Who may call it:
//   1. A Supabase Database Webhook (fires on every new or changed client) that sends the header  x-webhook-secret: <SYNC_WEBHOOK_SECRET>
//   2. A logged-in administrator (the "Sync now" button in /admin) using their login token.
// Secrets (set with `supabase secrets set`, never in the website code): GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SHEET_ID, SYNC_WEBHOOK_SECRET.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided to the function automatically.
import { syncAll } from './core.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const allowed = (env('ALLOWED_ORIGIN') || 'https://maani1pk.github.io').split(',').map((s) => s.trim());

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-secret, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length || !a) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

async function isAdmin(jwt: string): Promise<boolean> {
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

async function dbFetch(path: string, init: RequestInit = {}) {
  return fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

async function log(kind: string, ok: boolean, rows: number | null, message: string) {
  await dbFetch('sync_log', { method: 'POST', body: JSON.stringify({ kind, ok, row_count: rows, message: message.slice(0, 500) }) }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  const secret = req.headers.get('x-webhook-secret') ?? '';
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const fromWebhook = timingSafeEqual(secret, env('SYNC_WEBHOOK_SECRET'));
  if (!fromWebhook && !(bearer && (await isAdmin(bearer)))) return json(req, { error: 'unauthorized' }, 401);
  const kind = fromWebhook ? 'auto' : 'manual';

  try {
    const sa = JSON.parse(env('GOOGLE_SERVICE_ACCOUNT_JSON'));
    const spreadsheetId = env('GOOGLE_SHEET_ID');
    if (!sa?.client_email || !sa?.private_key || !spreadsheetId) throw new Error('Google credentials or sheet id are not configured');
    const res = await dbFetch('clients?select=*&order=created_at.asc');
    if (!res.ok) throw new Error(`Could not read clients (${res.status})`);
    const clients = await res.json();
    const out = await syncAll({ clients, spreadsheetId, serviceAccount: sa });
    await log(kind, true, out.total, `Synced ${out.total} clients to ${out.tabs.length} tabs`);
    return json(req, { ok: true, ...out });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log(kind, false, null, message);
    return json(req, { ok: false, error: message }, 502);
  }
});
