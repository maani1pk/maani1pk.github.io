/*
 * Abdur Studio Client Desk (admin). Talks to Supabase through assets/js/crm-api.js with the signed-in administrator's session.
 * All text is inserted with textContent, never innerHTML, so client-supplied text cannot run as script.
 */
(function () {
  'use strict';
  var CRM = window.CRM;
  var STATUSES = ['NEW LEAD', 'CONTACTED', 'DISCUSSION', 'PROPOSAL SENT', 'NEGOTIATION', 'ACTIVE CLIENT', 'COMPLETED', 'LOST', 'ARCHIVED'];
  var PIPELINE = ['NEW LEAD', 'CONTACTED', 'DISCUSSION', 'PROPOSAL SENT', 'NEGOTIATION'];
  var POTENTIAL = ['CONTACTED', 'DISCUSSION', 'PROPOSAL SENT', 'NEGOTIATION'];
  var CLOSED = ['COMPLETED', 'LOST', 'ARCHIVED'];
  var PRIORITIES = ['High', 'Medium', 'Low'];
  var PROJECT_TYPES = ['Mobile game', "Kids' app", 'AR application', 'VR / Meta Quest', 'Training & simulation', 'Interactive 3D', 'Something else'];
  var VIEWS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'all', label: 'All Clients', test: function () { return true; } },
    { id: 'new', label: 'New Leads', test: function (c) { return c.status === 'NEW LEAD'; } },
    { id: 'potential', label: 'Potential Clients', test: function (c) { return POTENTIAL.indexOf(c.status) >= 0; } },
    { id: 'active', label: 'Active Projects', test: function (c) { return c.status === 'ACTIVE CLIENT'; } },
    { id: 'completed', label: 'Completed Projects', test: function (c) { return c.status === 'COMPLETED'; } },
    { id: 'lost', label: 'Lost / Archived', test: function (c) { return c.status === 'LOST' || c.status === 'ARCHIVED'; } },
    { id: 'followups', label: 'Follow-up Reminders', test: function (c) { return !!c.next_followup && CLOSED.indexOf(c.status) < 0; } }
  ];
  var clients = [];
  var current = 'dashboard';
  var filt = { q: '', status: '', priority: '', sort: 'new' };
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function money(n, cur) {
    if (n == null || n === '') return '';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 0 }).format(Number(n)); } catch (e) { return String(n); }
  }
  function statusKey(s) { return s.split(' ')[0]; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  // ------------------------------------------------------------------ session
  function showLogin(msg) {
    $('app').hidden = true;
    $('login').hidden = false;
    $('login-msg').textContent = msg || '';
    $('login-setup').hidden = CRM.configured();
    $('login-btn').disabled = !CRM.configured();
  }
  function showApp() {
    $('login').hidden = true;
    $('app').hidden = false;
    $('who').textContent = 'Signed in as ' + (CRM.email() || 'administrator');
    buildNav();
    load().then(route);
  }
  function boot() {
    if (!CRM || !CRM.configured()) { showLogin(); return; }
    if (!CRM.hasSession()) { showLogin(); return; }
    CRM.isAdmin().then(function (ok) { if (ok) showApp(); else CRM.signOut().then(function () { showLogin('This account is not an administrator.'); }); },
      function () { showLogin('Please sign in again.'); });
  }
  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var btn = $('login-btn');
    btn.disabled = true;
    $('login-msg').textContent = '';
    CRM.signIn(f.elements.email.value.trim(), f.elements.password.value).then(function () { return CRM.isAdmin(); }).then(function (ok) {
      f.elements.password.value = '';
      btn.disabled = false;
      if (ok) showApp(); else CRM.signOut().then(function () { showLogin('This account is not an administrator.'); });
    }, function (err) {
      btn.disabled = false;
      $('login-msg').textContent = err.network ? 'Could not reach the server. Check your connection.' : 'Email or password is not correct.';
    });
  });
  $('logout').addEventListener('click', function () { CRM.signOut().then(function () { clients = []; closeDrawer(); showLogin(); }); });

  function load() {
    $('load-error').hidden = true;
    return CRM.listClients().then(function (rows) { clients = rows || []; }, function (err) {
      if (err.status === 401 || err.message === 'session_expired') { CRM.signOut().then(function () { showLogin('Your session ended. Please sign in again.'); }); return; }
      var b = $('load-error');
      b.hidden = false;
      b.textContent = err.network ? 'Could not reach the database. Check your connection and reload.' : 'Could not load clients (' + err.message + ').';
    }).then(function () { updateSyncBanner(); });
  }

  function updateSyncBanner() {
    var b = $('sync-banner');
    CRM.lastSync().then(function (s) {
      b.className = 'banner';
      if (!s) { b.textContent = 'Google Sheets: no sync has run yet. If sheet sync is set up, it starts with the next inquiry, or press Sync now.'; return; }
      if (s.ok) { b.className = 'banner banner--ok'; b.textContent = 'Google Sheets last synced ' + new Date(s.at).toLocaleString() + (s.row_count != null ? ' (' + s.row_count + ' clients)' : '') + '.'; }
      else { b.className = 'banner banner--error'; b.textContent = 'Google Sheets sync failed on ' + new Date(s.at).toLocaleString() + ': ' + (s.message || 'unknown error') + '. Your data is safe in the database; press Sync now to retry.'; }
    }, function () { b.textContent = ''; });
  }

  // ------------------------------------------------------------------ nav / routing
  function viewList(id) { return VIEWS.filter(function (v) { return v.id === id; })[0]; }
  function countFor(v) {
    if (!v.test) return null;
    if (v.id === 'followups') {
      var t = todayISO();
      return clients.filter(function (c) { return v.test(c) && c.next_followup <= t; }).length;
    }
    return clients.filter(v.test).length;
  }
  function buildNav() {
    var nav = clear($('nav'));
    VIEWS.forEach(function (v) {
      var a = el('a');
      a.href = '#/' + v.id;
      a.dataset.view = v.id;
      a.appendChild(el('span', null, v.label));
      var n = countFor(v);
      if (n != null) { var c = el('span', 'count' + (v.id === 'followups' && n ? ' hot' : ''), String(n)); a.appendChild(c); }
      a.addEventListener('click', function () { $('side').classList.remove('open'); $('menu-btn').setAttribute('aria-expanded', 'false'); });
      nav.appendChild(a);
    });
  }
  function route() {
    var id = (location.hash.replace(/^#\/?/, '') || 'dashboard');
    if (!viewList(id)) id = 'dashboard';
    current = id;
    buildNav();
    Array.prototype.forEach.call($('nav').children, function (a) { if (a.dataset.view === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('view-title').textContent = viewList(id).label;
    document.title = viewList(id).label + ' — Client Desk';
    var host = clear($('view'));
    if (id === 'dashboard') renderDashboard(host);
    else if (id === 'followups') renderFollowups(host);
    else renderList(host, viewList(id));
  }
  window.addEventListener('hashchange', function () { if (!$('app').hidden) route(); });
  $('menu-btn').addEventListener('click', function () { var o = $('side').classList.toggle('open'); this.setAttribute('aria-expanded', String(o)); });

  // ------------------------------------------------------------------ dashboard
  function stats() {
    var now = new Date();
    var ym = now.getFullYear() + '-' + pad(now.getMonth() + 1);
    var total = clients.length;
    var monthly = clients.filter(function (c) { var d = new Date(c.created_at); return d.getFullYear() + '-' + pad(d.getMonth() + 1) === ym; }).length;
    var won = clients.filter(function (c) { return c.status === 'ACTIVE CLIENT' || c.status === 'COMPLETED'; }).length;
    var revenue = clients.filter(function (c) { return PIPELINE.indexOf(c.status) >= 0; }).reduce(function (s, c) { return s + (Number(c.project_value) || 0); }, 0);
    return {
      total: total, monthly: monthly, won: won, revenue: revenue,
      newLeads: clients.filter(function (c) { return c.status === 'NEW LEAD'; }).length,
      active: clients.filter(function (c) { return c.status === 'ACTIVE CLIENT'; }).length,
      completed: clients.filter(function (c) { return c.status === 'COMPLETED'; }).length,
      rate: total ? Math.round((won / total) * 1000) / 10 : 0
    };
  }
  function kpi(label, value, sub, accent) {
    var c = el('div', 'card' + (accent ? ' kpi--accent' : ''));
    c.appendChild(el('div', 'kpi__label', label));
    c.appendChild(el('div', 'kpi__value', value));
    if (sub) c.appendChild(el('div', 'kpi__sub', sub));
    return c;
  }
  function renderDashboard(host) {
    if (!clients.length) {
      var e = el('div', 'card empty');
      e.appendChild(el('h2', null, 'No inquiries yet'));
      e.appendChild(el('p', null, 'When someone fills in the contact form, the inquiry appears here with a Client ID such as AS-0001. You can also add a client yourself.'));
      host.appendChild(e);
      return;
    }
    var s = stats();
    var k = el('div', 'kpis');
    k.appendChild(kpi('Total inquiries', String(s.total), 'all time'));
    k.appendChild(kpi('New leads', String(s.newLeads), 'not contacted yet'));
    k.appendChild(kpi('Active clients', String(s.active), 'projects in progress'));
    k.appendChild(kpi('Completed projects', String(s.completed)));
    k.appendChild(kpi('Potential revenue', money(s.revenue), 'open leads, from project value', true));
    k.appendChild(kpi('Inquiries this month', String(s.monthly)));
    k.appendChild(kpi('Conversion rate', s.rate + '%', s.won + ' of ' + s.total + ' became clients'));
    host.appendChild(k);

    var g = el('div', 'grid2');
    var c1 = el('div', 'card');
    c1.appendChild(el('h2', null, 'Inquiries per month'));
    c1.appendChild(monthChart());
    g.appendChild(c1);
    var c2 = el('div', 'card');
    c2.appendChild(el('h2', null, 'Pipeline'));
    var bars = el('div', 'bars');
    var max = 1;
    STATUSES.forEach(function (st) { max = Math.max(max, clients.filter(function (c) { return c.status === st; }).length); });
    STATUSES.forEach(function (st) {
      var n = clients.filter(function (c) { return c.status === st; }).length;
      var row = el('div', 'bar');
      row.appendChild(el('span', null, st));
      var tr = el('span', 'bar__track');
      var f = el('span', 'bar__fill');
      f.style.display = 'block';
      f.style.width = Math.round((n / max) * 100) + '%';
      tr.appendChild(f);
      row.appendChild(tr);
      row.appendChild(el('span', null, String(n)));
      bars.appendChild(row);
    });
    c2.appendChild(bars);
    g.appendChild(c2);
    host.appendChild(g);

    var due = clients.filter(function (c) { return viewList('followups').test(c) && c.next_followup <= addDays(todayISO(), 7); }).sort(function (a, b) { return a.next_followup < b.next_followup ? -1 : 1; }).slice(0, 6);
    var c3 = el('div', 'card');
    c3.appendChild(el('h2', null, 'Follow-ups due in the next 7 days'));
    if (!due.length) c3.appendChild(el('p', 'muted', 'Nothing due. Set a follow-up date on a client to see it here.'));
    due.forEach(function (c) { c3.appendChild(reminderRow(c, false)); });
    host.appendChild(c3);
  }
  function monthChart() {
    var NS = 'http://www.w3.org/2000/svg';
    var now = new Date();
    var months = [];
    for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + pad(d.getMonth() + 1), label: d.toLocaleDateString(undefined, { month: 'short' }), n: 0 }); }
    clients.forEach(function (c) { var d = new Date(c.created_at); var k = d.getFullYear() + '-' + pad(d.getMonth() + 1); months.forEach(function (m) { if (m.key === k) m.n++; }); });
    var max = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 360 170');
    svg.setAttribute('class', 'chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Inquiries per month: ' + months.map(function (m) { return m.label + ' ' + m.n; }).join(', '));
    months.forEach(function (m, i) {
      var h = Math.round((m.n / max) * 110), x = 14 + i * 57;
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', 130 - h); r.setAttribute('width', 40); r.setAttribute('height', Math.max(h, 2)); r.setAttribute('rx', 8); r.setAttribute('fill', '#A33A93'); r.setAttribute('opacity', m.n ? '1' : '.25');
      svg.appendChild(r);
      var t = document.createElementNS(NS, 'text'); t.setAttribute('x', x + 20); t.setAttribute('y', 152); t.setAttribute('text-anchor', 'middle'); t.textContent = m.label; svg.appendChild(t);
      var v = document.createElementNS(NS, 'text'); v.setAttribute('x', x + 20); v.setAttribute('y', 124 - h); v.setAttribute('text-anchor', 'middle'); v.textContent = String(m.n); svg.appendChild(v);
    });
    return svg;
  }

  // ------------------------------------------------------------------ list views
  function statusPill(s) { return el('span', 'pill pill--' + statusKey(s), s); }
  function matches(c) {
    if (filt.status && c.status !== filt.status) return false;
    if (filt.priority && c.priority !== filt.priority) return false;
    if (filt.q) {
      var hay = [c.client_id, c.name, c.company, c.email, c.whatsapp, c.project_type, c.description].join(' ').toLowerCase();
      if (hay.indexOf(filt.q.toLowerCase()) < 0) return false;
    }
    return true;
  }
  function renderList(host, view) {
    var f = el('div', 'filters');
    var q = el('input'); q.type = 'search'; q.placeholder = 'Search name, company, email, ID…'; q.value = filt.q; q.setAttribute('aria-label', 'Search clients');
    var st = el('select'); st.setAttribute('aria-label', 'Filter by status');
    [''].concat(STATUSES).forEach(function (s) { var o = el('option', null, s || 'All statuses'); o.value = s; st.appendChild(o); });
    st.value = filt.status;
    var pr = el('select'); pr.setAttribute('aria-label', 'Filter by priority');
    [''].concat(PRIORITIES).forEach(function (s) { var o = el('option', null, s ? s + ' priority' : 'All priorities'); o.value = s; pr.appendChild(o); });
    pr.value = filt.priority;
    var so = el('select'); so.setAttribute('aria-label', 'Sort');
    [['new', 'Newest first'], ['old', 'Oldest first'], ['value', 'Highest value'], ['follow', 'Next follow-up'], ['name', 'Name A–Z']].forEach(function (p) { var o = el('option', null, p[1]); o.value = p[0]; so.appendChild(o); });
    so.value = filt.sort;
    f.appendChild(q); f.appendChild(st); f.appendChild(pr); f.appendChild(so);
    host.appendChild(f);
    var body = el('div');
    host.appendChild(body);

    function paint() {
      clear(body);
      var rows = clients.filter(view.test).filter(matches);
      rows.sort(function (a, b) {
        if (filt.sort === 'old') return a.created_at < b.created_at ? -1 : 1;
        if (filt.sort === 'value') return (Number(b.project_value) || 0) - (Number(a.project_value) || 0);
        if (filt.sort === 'follow') return (a.next_followup || '9999') < (b.next_followup || '9999') ? -1 : 1;
        if (filt.sort === 'name') return a.name.localeCompare(b.name);
        return a.created_at < b.created_at ? 1 : -1;
      });
      if (!rows.length) {
        var e = el('div', 'card empty');
        var any = clients.filter(view.test).length;
        e.appendChild(el('h2', null, any ? 'No clients match these filters' : 'Nothing here yet'));
        e.appendChild(el('p', null, any ? 'Clear the search or filters to see everyone in this section.' : 'Clients appear here as their status changes.'));
        body.appendChild(e);
        return;
      }
      body.appendChild(el('p', 'count-line', rows.length + (rows.length === 1 ? ' client' : ' clients')));
      var wrap = el('div', 'tablewrap');
      var t = el('table');
      var hr = el('tr');
      ['Client', 'Project', 'Status', 'Priority', 'Value', 'Next follow-up', 'Received'].forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; hr.appendChild(th); });
      var thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
      var tb = el('tbody');
      rows.forEach(function (c) {
        var tr = el('tr');
        tr.tabIndex = 0;
        tr.setAttribute('aria-label', 'Open ' + c.client_id + ' ' + c.name);
        var td = el('td');
        td.appendChild(el('strong', null, c.name));
        td.appendChild(el('div', 'sub', c.client_id + (c.company ? ' · ' + c.company : '')));
        tr.appendChild(td);
        td = el('td'); td.appendChild(document.createTextNode(c.project_type)); if (c.budget) td.appendChild(el('div', 'sub', c.budget)); tr.appendChild(td);
        td = el('td'); td.appendChild(statusPill(c.status)); tr.appendChild(td);
        tr.appendChild(el('td', 'pri--' + c.priority, c.priority));
        tr.appendChild(el('td', null, money(c.project_value, c.currency) || '—'));
        var late = c.next_followup && c.next_followup < todayISO() && CLOSED.indexOf(c.status) < 0;
        tr.appendChild(el('td', late ? 'due--over' : null, c.next_followup ? fmtDate(c.next_followup) + (late ? ' (overdue)' : '') : '—'));
        tr.appendChild(el('td', null, fmtDate(c.created_at)));
        tr.addEventListener('click', function () { openDrawer(c); });
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(c); } });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      wrap.appendChild(t);
      body.appendChild(wrap);
    }
    q.addEventListener('input', function () { filt.q = q.value; paint(); });
    st.addEventListener('change', function () { filt.status = st.value; paint(); });
    pr.addEventListener('change', function () { filt.priority = pr.value; paint(); });
    so.addEventListener('change', function () { filt.sort = so.value; paint(); });
    paint();
  }

  // ------------------------------------------------------------------ follow-ups
  function reminderRow(c, withActions) {
    var r = el('div', 'rem');
    var m = el('div', 'rem__main');
    m.tabIndex = 0;
    m.appendChild(el('strong', null, c.name + ' · ' + c.client_id));
    var sub = el('span', 'small muted', fmtDate(c.next_followup) + ' · ' + c.project_type + (c.priority === 'High' ? ' · High priority' : ''));
    m.appendChild(sub);
    m.addEventListener('click', function () { openDrawer(c); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Enter') openDrawer(c); });
    r.appendChild(m);
    var a = el('div', 'rem__acts');
    a.appendChild(statusPill(c.status));
    if (withActions) {
      var done = el('button', 'btn btn--ghost btn--sm', 'Mark contacted');
      done.type = 'button';
      done.addEventListener('click', function () {
        done.disabled = true;
        saveClient(c, { last_contact: todayISO(), next_followup: null }).then(route, function () { done.disabled = false; });
      });
      a.appendChild(done);
    }
    r.appendChild(a);
    return r;
  }
  function renderFollowups(host) {
    var t = todayISO(), wk = addDays(t, 7);
    var rows = clients.filter(viewList('followups').test).sort(function (a, b) { return a.next_followup < b.next_followup ? -1 : 1; });
    if (!rows.length) {
      var e = el('div', 'card empty');
      e.appendChild(el('h2', null, 'No follow-ups scheduled'));
      e.appendChild(el('p', null, 'Open a client and set the next follow-up date. Reminders appear here, grouped by how soon they are due.'));
      host.appendChild(e);
      return;
    }
    [['Overdue', function (c) { return c.next_followup < t; }], ['Today', function (c) { return c.next_followup === t; }], ['Next 7 days', function (c) { return c.next_followup > t && c.next_followup <= wk; }], ['Later', function (c) { return c.next_followup > wk; }]].forEach(function (g) {
      var list = rows.filter(g[1]);
      if (!list.length) return;
      var box = el('div', 'group');
      box.appendChild(el('h2', null, g[0] + ' (' + list.length + ')'));
      list.forEach(function (c) { box.appendChild(reminderRow(c, true)); });
      host.appendChild(box);
    });
  }

  // ------------------------------------------------------------------ drawer editor
  var lastFocus = null;
  function field(label, node, wide) { var l = el('label', 'f' + (wide ? ' wide' : ''), label); l.appendChild(node); return l; }
  function input(type, value, max) { var i = el('input'); i.type = type; i.value = value == null ? '' : value; if (max) i.maxLength = max; return i; }
  function select(opts, value) { var s = el('select'); opts.forEach(function (o) { var op = el('option', null, o); op.value = o; s.appendChild(op); }); s.value = value; return s; }

  function saveClient(c, patch) {
    return CRM.updateClient(c.id, patch).then(function (row) {
      if (row) { var i = clients.indexOf(c); if (i >= 0) clients[i] = row; Object.keys(row).forEach(function (k) { c[k] = row[k]; }); }
      setTimeout(updateSyncBanner, 4000);
      return row;
    });
  }

  function openDrawer(c) {
    var isNew = !c;
    c = c || { name: '', company: '', email: '', whatsapp: '', project_type: PROJECT_TYPES[0], budget: '', description: '', status: 'NEW LEAD', priority: 'Medium', project_value: null, agreed_budget: null, currency: 'USD', last_contact: null, next_followup: null, internal_notes: '' };
    lastFocus = document.activeElement;
    var d = clear($('drawer'));
    var head = el('div', 'drawer__head');
    var hl = el('div');
    var title = el('h2', null, isNew ? 'Add client' : c.name);
    title.id = 'drawer-title';
    hl.appendChild(title);
    if (!isNew) {
      hl.appendChild(el('p', 'small muted', c.client_id + ' · received ' + fmtDate(c.created_at) + (c.source ? ' · ' + c.source : '')));
    }
    head.appendChild(hl);
    var x = el('button', 'btn btn--ghost btn--sm', 'Close'); x.type = 'button'; x.addEventListener('click', closeDrawer);
    head.appendChild(x);
    d.appendChild(head);

    if (!isNew) {
      var acts = el('div', 'drawer__acts');
      var num = digits(c.whatsapp);
      if (num) {
        var w = el('a', 'btn btn--sm', 'Open WhatsApp');
        w.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent('Hello ' + c.name + ', this is Abdur from Abdur Studio, following up on your inquiry ' + c.client_id + '.');
        w.target = '_blank'; w.rel = 'noopener noreferrer';
        acts.appendChild(w);
      }
      if (c.email) {
        var m = el('a', 'btn btn--sm', 'Send email');
        m.href = 'mailto:' + c.email + '?subject=' + encodeURIComponent('Your inquiry ' + c.client_id + ' – Abdur Studio');
        acts.appendChild(m);
      }
      if (acts.children.length) d.appendChild(acts);
    }

    var f = el('form', 'fgrid');
    f.noValidate = true;
    var i = {
      name: input('text', c.name, 120), company: input('text', c.company, 160), email: input('email', c.email, 160), whatsapp: input('tel', c.whatsapp, 25),
      type: select(PROJECT_TYPES.indexOf(c.project_type) >= 0 ? PROJECT_TYPES : PROJECT_TYPES.concat([c.project_type]), c.project_type), budget: input('text', c.budget, 60),
      status: select(STATUSES, c.status), priority: select(PRIORITIES, c.priority), value: input('number', c.project_value), agreed: input('number', c.agreed_budget),
      last: input('date', c.last_contact), next: input('date', c.next_followup),
      desc: el('textarea'), notes: el('textarea')
    };
    i.value.min = i.agreed.min = '0'; i.value.step = i.agreed.step = '1';
    i.desc.value = c.description || ''; i.desc.maxLength = 1500;
    i.notes.value = c.internal_notes || ''; i.notes.maxLength = 5000; i.notes.rows = 5;
    f.appendChild(field('Name', i.name)); f.appendChild(field('Company', i.company));
    f.appendChild(field('Email', i.email)); f.appendChild(field('WhatsApp', i.whatsapp));
    f.appendChild(field('Project type', i.type)); f.appendChild(field('Budget (from form)', i.budget));
    f.appendChild(field('Status', i.status)); f.appendChild(field('Priority', i.priority));
    f.appendChild(field('Project value (' + (c.currency || 'USD') + ')', i.value)); f.appendChild(field('Agreed budget (' + (c.currency || 'USD') + ')', i.agreed));
    f.appendChild(field('Last contact', i.last)); f.appendChild(field('Next follow-up', i.next));
    f.appendChild(field('Project description', i.desc, true));
    f.appendChild(field('Internal notes (private)', i.notes, true));
    var foot = el('div', 'drawer__foot wide');
    var save = el('button', 'btn btn--primary', isNew ? 'Add client' : 'Save changes'); save.type = 'submit';
    var msg = el('p', 'msg'); msg.setAttribute('role', 'status');
    foot.appendChild(save); foot.appendChild(msg);
    f.appendChild(foot);
    d.appendChild(f);

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'msg'; msg.textContent = '';
      var row = {
        name: i.name.value.trim(), company: i.company.value.trim() || null, email: i.email.value.trim() || null, whatsapp: i.whatsapp.value.trim() || null,
        project_type: i.type.value, budget: i.budget.value.trim() || null, description: i.desc.value.trim(), status: i.status.value, priority: i.priority.value,
        project_value: i.value.value === '' ? null : Number(i.value.value), agreed_budget: i.agreed.value === '' ? null : Number(i.agreed.value),
        last_contact: i.last.value || null, next_followup: i.next.value || null, internal_notes: i.notes.value.trim()
      };
      if (!row.name) { msg.textContent = 'Name is required.'; return; }
      if (!row.description) { msg.textContent = 'Project description is required.'; return; }
      if (!row.email && !row.whatsapp) { msg.textContent = 'Add an email or a WhatsApp number.'; return; }
      if ((row.project_value != null && row.project_value < 0) || (row.agreed_budget != null && row.agreed_budget < 0)) { msg.textContent = 'Amounts cannot be negative.'; return; }
      save.disabled = true;
      var p = isNew ? CRM.addClient(row).then(function (r) { if (r) clients.unshift(r); return r; }) : saveClient(c, row);
      p.then(function () {
        save.disabled = false;
        msg.className = 'msg ok';
        msg.textContent = 'Saved.';
        title.textContent = row.name;
        route();
        if (isNew) setTimeout(closeDrawer, 600);
      }, function (err) {
        save.disabled = false;
        msg.textContent = err.network ? 'Could not reach the database. Nothing was saved; try again.' : 'Could not save: ' + err.message;
      });
    });
    $('drawer-wrap').hidden = false;
    document.body.style.overflow = 'hidden';
    i.name.focus();
  }
  function closeDrawer() {
    $('drawer-wrap').hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }
  $('scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('drawer-wrap').hidden) closeDrawer(); });
  $('btn-new').addEventListener('click', function () { openDrawer(null); });

  // ------------------------------------------------------------------ sync / export / backup
  $('btn-sync').addEventListener('click', function () {
    var b = this, ban = $('sync-banner');
    b.disabled = true;
    ban.className = 'banner';
    ban.textContent = 'Syncing to Google Sheets…';
    CRM.syncNow().then(function (r) {
      b.disabled = false;
      ban.className = 'banner banner--ok';
      ban.textContent = 'Google Sheets synced: ' + (r && r.total != null ? r.total + ' clients' : 'done') + '.';
    }, function (err) {
      b.disabled = false;
      ban.className = 'banner banner--error';
      ban.textContent = err.status === 404 ? 'Sheet sync is not set up yet (the sync function is not deployed). See CRM_SETUP.md.' : 'Sync failed: ' + err.message + '. Your data is safe in the database.';
    }).then(function () { setTimeout(updateSyncBanner, 1500); });
  });

  var COLS = [
    ['Client ID', function (c) { return c.client_id; }], ['Submission date', function (c) { return fmtStamp(c.created_at); }], ['Name', function (c) { return c.name; }],
    ['Company', function (c) { return c.company || ''; }], ['Email', function (c) { return c.email || ''; }], ['WhatsApp', function (c) { return c.whatsapp || ''; }],
    ['Project type', function (c) { return c.project_type; }], ['Budget', function (c) { return c.budget || ''; }], ['Status', function (c) { return c.status; }],
    ['Priority', function (c) { return c.priority; }], ['Project value', function (c) { return c.project_value == null ? '' : Number(c.project_value); }],
    ['Agreed budget', function (c) { return c.agreed_budget == null ? '' : Number(c.agreed_budget); }], ['Last contact', function (c) { return c.last_contact || ''; }],
    ['Follow-up date', function (c) { return c.next_followup || ''; }], ['Notes', function (c) { return c.internal_notes || ''; }], ['Project description', function (c) { return c.description || ''; }]
  ];
  function fmtStamp(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var SHEETS = [
    ['All Clients', function () { return true; }], ['New Leads', function (c) { return c.status === 'NEW LEAD'; }],
    ['Active Projects', function (c) { return c.status === 'ACTIVE CLIENT'; }], ['Completed Projects', function (c) { return c.status === 'COMPLETED'; }],
    ['Lost Leads', function (c) { return c.status === 'LOST' || c.status === 'ARCHIVED'; }]
  ];

  function download(name, mime, data) {
    var url = URL.createObjectURL(new Blob([data], { type: mime }));
    var a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function stamp() { return todayISO(); }
  $('btn-json').addEventListener('click', function () {
    download('abdur-studio-clients-' + stamp() + '.json', 'application/json', JSON.stringify({ exported_at: new Date().toISOString(), count: clients.length, clients: clients }, null, 2));
  });
  $('btn-xlsx').addEventListener('click', function () {
    var sheets = SHEETS.map(function (s) {
      var rows = [COLS.map(function (c) { return c[0]; })];
      clients.filter(s[1]).slice().sort(function (a, b) { return a.client_id < b.client_id ? -1 : 1; }).forEach(function (c) { rows.push(COLS.map(function (col) { return col[1](c); })); });
      return { name: s[0], rows: rows };
    });
    download('abdur-studio-clients-' + stamp() + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buildXlsx(sheets));
  });

  // Minimal .xlsx writer: a zip of XML parts (stored, not compressed). Text goes in as inline strings, so cells are never read as formulas.
  var crcTable = (function () { var t = [], n, c, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function xmlEsc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function colName(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function sheetXml(rows) {
    var out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'];
    rows.forEach(function (r, ri) {
      out.push('<row r="' + (ri + 1) + '">');
      r.forEach(function (v, ci) {
        var ref = colName(ci) + (ri + 1);
        if (typeof v === 'number' && isFinite(v)) out.push('<c r="' + ref + '"><v>' + v + '</v></c>');
        else if (v !== '' && v != null) out.push('<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>');
      });
      out.push('</row>');
    });
    out.push('</sheetData></worksheet>');
    return out.join('');
  }
  function buildXlsx(sheets) {
    var files = [];
    files.push(['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>']);
    files.push(['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
    files.push(['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + xmlEsc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>']);
    files.push(['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '</Relationships>']);
    sheets.forEach(function (s, i) { files.push(['xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(s.rows)]); });
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var dt = new Date(), dosTime = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), dosDate = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]));
  }
  window.__buildXlsx = buildXlsx; // exposed for tests

  boot();
})();
