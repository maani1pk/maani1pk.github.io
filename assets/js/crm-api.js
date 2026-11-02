/*
 * Abdur Studio CRM: browser client for Supabase.
 * Uses only the PUBLIC anon key from config.js. What that key can do is decided by the database rules (row level security):
 * visitors can only file an inquiry; reading or changing clients needs an administrator login.
 * Never put a service-role key in this file or anywhere in the website.
 */
(function () {
  'use strict';
  var cfg = window.SITE || {};
  var base = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
  var anon = String(cfg.supabaseAnonKey || '');
  var SESSION_KEY = 'as-admin-session';
  var session = null;

  var MESSAGES = {
    name_required: 'Please enter your name.',
    description_required: 'Please describe your project.',
    project_type_required: 'Please choose a project type.',
    contact_required: 'Please add an email address or a WhatsApp number so I can reach you.',
    email_invalid: 'That email address does not look right.',
    whatsapp_invalid: 'That WhatsApp number does not look right. Use digits, with the country code (for example +44 7700 900123).',
    too_long: 'One of the fields is too long. Please shorten it.',
    rate_limited: 'Too many inquiries from this connection. Please try again in an hour, or contact me on WhatsApp or by email.'
  };

  function configured() { return !!(base && anon); }

  function loadSession() {
    try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; }
    return session;
  }
  function saveSession(s) {
    session = s;
    try { if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* storage blocked: session lasts for this page only */ }
  }

  function request(path, opts) {
    opts = opts || {};
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, opts.timeout || 15000) : null;
    var headers = { apikey: anon, Authorization: 'Bearer ' + (opts.auth === false ? anon : (session && session.access_token) || anon), 'Content-Type': 'application/json' };
    if (opts.prefer) headers.Prefer = opts.prefer;
    return fetch(base + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl ? ctl.signal : undefined })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        return res.text().then(function (t) {
          var data = null;
          try { data = t ? JSON.parse(t) : null; } catch (e) { data = t; }
          if (!res.ok) {
            var err = new Error((data && (data.message || data.msg || data.error_description || data.error)) || ('Request failed (' + res.status + ')'));
            err.status = res.status;
            err.code = data && data.code;
            throw err;
          }
          return data;
        });
      }, function (e) {
        if (timer) clearTimeout(timer);
        var err = new Error('network');
        err.network = true;
        throw err;
      });
  }

  // Visitors: file an inquiry. Resolves with the Client ID only after the database has saved the row.
  function submitInquiry(d) {
    return request('/rest/v1/rpc/submit_inquiry', {
      method: 'POST', auth: false,
      body: {
        p_name: d.name, p_company: d.company || '', p_email: d.email || '', p_whatsapp: d.whatsapp || '', p_project_type: d.type,
        p_budget: d.budget || '', p_description: d.message, p_website: d.website || '', p_source: 'Abdur Studio Portfolio'
      }
    }).then(function (id) {
      if (typeof id !== 'string' || !/^AS-\d{4}$/.test(id)) throw new Error('unexpected_response');
      return id;
    }).catch(function (e) {
      if (e.network) throw e;
      var friendly = MESSAGES[e.message];
      var err = new Error(friendly || 'The inquiry could not be saved.');
      err.userMessage = !!friendly;
      err.validation = !!friendly;
      throw err;
    });
  }

  // Administrators
  function signIn(email, password) {
    return request('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: email, password: password } })
      .then(function (r) { saveSession({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Date.now() + (r.expires_in || 3600) * 1000 - 30000, email: (r.user && r.user.email) || email }); return session; });
  }
  function refresh() {
    if (!session || !session.refresh_token) return Promise.reject(new Error('no_session'));
    return request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh_token } })
      .then(function (r) { saveSession({ access_token: r.access_token, refresh_token: r.refresh_token || session.refresh_token, expires_at: Date.now() + (r.expires_in || 3600) * 1000 - 30000, email: session.email }); return session; });
  }
  function ensureFresh() {
    if (session && session.expires_at && Date.now() > session.expires_at) return refresh().catch(function () { saveSession(null); throw new Error('session_expired'); });
    return Promise.resolve();
  }
  function authed(path, opts) { return ensureFresh().then(function () { return request(path, opts); }); }
  function signOut() {
    var done = function () { saveSession(null); };
    if (!session) return Promise.resolve();
    return request('/auth/v1/logout', { method: 'POST', body: {} }).then(done, done);
  }
  function isAdmin() { return authed('/rest/v1/rpc/is_admin', { method: 'POST', body: {} }).then(function (v) { return v === true; }); }

  // Administrators: clients
  function listClients() { return authed('/rest/v1/clients?select=*&order=created_at.desc&limit=5000'); }
  function updateClient(id, patch) { return authed('/rest/v1/clients?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: patch, prefer: 'return=representation' }).then(function (r) { return r && r[0]; }); }
  function addClient(row) { return authed('/rest/v1/clients', { method: 'POST', body: row, prefer: 'return=representation' }).then(function (r) { return r && r[0]; }); }
  function lastSync() { return authed('/rest/v1/sync_log?select=*&order=at.desc&limit=1').then(function (r) { return (r && r[0]) || null; }); }
  function syncNow() { return authed('/functions/v1/sync-sheets', { method: 'POST', body: {}, timeout: 60000 }); }

  loadSession();
  window.CRM = {
    configured: configured, submitInquiry: submitInquiry, signIn: signIn, signOut: signOut, isAdmin: isAdmin, hasSession: function () { return !!(session && session.access_token); },
    email: function () { return session && session.email; }, listClients: listClients, updateClient: updateClient, addClient: addClient, lastSync: lastSync, syncNow: syncNow
  };
})();
