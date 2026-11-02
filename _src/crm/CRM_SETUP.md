# Client database and admin dashboard: setup

What you get once this is connected:

- The contact form saves every inquiry to a Supabase database with a Client ID (`AS-0001`, `AS-0002`, …). The visitor sees "Inquiry received" only after the database confirms the save, then can continue on WhatsApp or by email.
- `/admin/` is the Client Desk: login, dashboard, the seven client sections, per-client editing, follow-up reminders, Excel export and JSON backup.
- Every new inquiry and every change in the dashboard is copied to a Google Sheet (five tabs, no duplicate rows).

Until you finish the steps below the site keeps working as before (contact form opens WhatsApp or email) and `/admin/` shows a setup notice. Nothing in the public site contains a secret: only the **Project URL** and the **anon public key** go into `assets/js/config.js`, and the database rules (row level security) decide what that key may do (visitors can only file an inquiry).

**Never paste the `service_role` key, the Google JSON key or the webhook secret into any file in this repository.**

## What you need to provide

| What | Where it comes from | Where it goes |
|---|---|---|
| Supabase Project URL | Supabase → Project Settings → API | `assets/js/config.js` → `supabaseUrl` |
| Supabase anon public key | same page, "anon public" | `assets/js/config.js` → `supabaseAnonKey` |
| Admin email + password | you create it in Supabase → Authentication → Users | you type it on `/admin/` |
| Google service-account JSON key | Google Cloud (step 4) | Supabase secret `GOOGLE_SERVICE_ACCOUNT_JSON` (never the repo) |
| Google Sheet ID | the sheet's URL | Supabase secret `GOOGLE_SHEET_ID` |
| Webhook secret | any long random string you make up | Supabase secret `SYNC_WEBHOOK_SECRET` and the webhook header |
| WhatsApp number | yours | `assets/js/config.js` → `whatsappNumber` (digits, country code, e.g. `15551234567`) |

## 1. Create the Supabase project

1. Sign up at supabase.com (free plan is enough) and create a project. Pick the region closest to your clients.
2. Open **SQL Editor → New query**, paste the whole of `_src/crm/schema.sql`, press **Run**. It is safe to run again.

## 2. Create your admin login

1. **Authentication → Users → Add user**: your email and a strong password (turn on "Auto Confirm User").
2. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" so nobody else can create accounts.
3. In the SQL Editor run, with your own email:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'you@example.com';
```

Only users listed in `public.admins` can read or change clients. A logged-in user who is not listed sees nothing.

## 3. Connect the website

Edit `assets/js/config.js`:

```js
supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY',
whatsappNumber: '15551234567',
```

Commit and push. Open `/contact/`, send a test inquiry, then sign in at `/admin/` and delete the test row (open it, set status ARCHIVED, or delete it in Supabase → Table Editor). The site ships with no demo clients.

## 4. Google Sheets sync

1. Go to console.cloud.google.com, create a project, then **APIs & Services → Library → Google Sheets API → Enable**.
2. **IAM & Admin → Service Accounts → Create**. Open it → **Keys → Add key → JSON**. A `.json` file downloads; keep it private.
3. Create a new Google Sheet. Copy the ID from its URL (`docs.google.com/spreadsheets/d/<THIS PART>/edit`).
4. **Share** the sheet with the service account's email (`…@….iam.gserviceaccount.com`) as **Editor**.
5. Install the Supabase CLI and, from `_src/crm`, run:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set GOOGLE_SHEET_ID=THE_SHEET_ID
supabase secrets set SYNC_WEBHOOK_SECRET=ANY_LONG_RANDOM_STRING
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat path/to/key.json)"
supabase functions deploy sync-sheets --no-verify-jwt
```

   Optional: `supabase secrets set ALLOWED_ORIGIN=https://your-domain` if the site is served from a different address than `https://maani1pk.github.io`.

6. **Database → Webhooks → Create a new hook**: table `clients`, events **Insert** and **Update**, type **Supabase Edge Functions** (or HTTP Request) pointing at `sync-sheets`, method POST, and add the HTTP header `x-webhook-secret` with the same value as `SYNC_WEBHOOK_SECRET`.
7. In `/admin/` press **Sync now**. The sheet gets five tabs: All Clients, New Leads, Active Projects, Completed Projects, Lost Leads. After that every inquiry and every edit syncs automatically.

How the sync behaves: each run rewrites the five tabs from the database, so rows are never duplicated and a status change moves the client to the right tab. Values are written as plain text, so text such as `=HYPERLINK(...)` typed by a visitor cannot run as a formula. If Google is unreachable the data stays safe in the database, the failure is recorded, and the dashboard shows a red banner with a Sync now button. Edit the sheet's data in the Client Desk, not in the sheet: the sheet is a copy and is overwritten on the next sync.

## 5. Backups and exports

- **Export to Excel (.xlsx)** in the Client Desk: one workbook with the same five tabs.
- **Backup (.json)**: every client with every field.
- Supabase keeps daily backups on paid plans; on the free plan use the JSON backup regularly (for example monthly).

## Security notes

- Visitors can only call `submit_inquiry`. It validates input, ignores bots (hidden field), allows 5 inquiries per connection per hour and drops a repeat of the same inquiry within 10 minutes.
- All tables have row level security on. Reading or editing clients requires being listed in `public.admins`.
- `/admin/` is `noindex`, disallowed in `robots.txt`, has a content-security policy, and writes client text to the page as plain text only.
- GitHub Pages cannot add HTTP headers or hide a URL; the real protection is the login plus the database rules, not the secrecy of `/admin/`.
- Stronger spam protection later: add Cloudflare Turnstile to the form and verify the token in a small Edge Function before calling `submit_inquiry`.
- Client personal data: add a privacy page and tell visitors what you store and why before you go live in regions with privacy law (GDPR and similar).

## Files

| File | Purpose |
|---|---|
| `_src/crm/schema.sql` | tables, security rules, `submit_inquiry` |
| `_src/crm/supabase/functions/sync-sheets/` | Google Sheets sync function |
| `assets/js/crm-api.js` | browser client (public key only) |
| `admin/` | Client Desk |
| `contact/index.html`, `assets/js/site.js` | the inquiry form |
