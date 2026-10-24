(function () {
  'use strict';
  var SITE = window.SITE || {};
  var PROJECTS = window.PROJECTS || [];

  var STATUS = {
    released: ['Released', 'chip--released'],
    soon: ['Coming soon', 'chip--soon'],
    dev: ['In development', 'chip--dev'],
    prototype: ['Prototype', 'chip--proto'],
    client: ['Client work', 'chip--client']
  };
  var OWNER = { personal: 'Personal product', vimersive: 'Vimersive Studio' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Brand values: <span data-brand="studioName">, <a data-brand-href="studioEmail">
  function applyBrand() {
    document.querySelectorAll('[data-brand]').forEach(function (n) {
      var v = SITE[n.getAttribute('data-brand')];
      if (v) n.textContent = v;
    });
    document.querySelectorAll('[data-brand-href]').forEach(function (n) {
      var v = SITE[n.getAttribute('data-brand-href')];
      if (v) n.setAttribute('href', 'mailto:' + v);
    });
  }

  function navToggle() {
    var btn = document.querySelector('.nav-toggle');
    var menu = document.getElementById('site-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
    });
    // Close after following an in-page link such as /#studio.
    menu.addEventListener('click', function (e) {
      if (!e.target.closest('a')) return;
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    });
  }

  function card(p) {
    var a = el('article', 'card');
    if (p.img) {
      var fig = el('div', 'card__media' + (p.imgFit === 'phone' ? ' card__media--phone' : ''));
      var img = el('img');
      img.src = p.img; img.alt = p.alt || p.name; img.loading = 'lazy'; img.decoding = 'async';
      fig.appendChild(img);
      a.appendChild(fig);
      if (p.stock) a.appendChild(el('p', 'card__note', 'Illustrative stock photo · captures coming soon'));
    } else {
      a.appendChild(el('div', 'card__media card__media--empty', p.name));
    }
    var body = el('div', 'card__body');
    var chips = el('div', 'chips');
    var st = STATUS[p.status] || STATUS.dev;
    chips.appendChild(el('span', 'chip ' + st[1], p.statusLabel || st[0]));
    chips.appendChild(el('span', 'chip', OWNER[p.owner] || ''));
    body.appendChild(chips);
    body.appendChild(el('h3', 'card__title', p.name));
    body.appendChild(el('p', 'card__desc', p.desc));
    var dl = el('dl', 'card__meta');
    [['Platform', p.platform], ['Tech', p.tech], ['Role', p.role]].forEach(function (r) {
      if (!r[1]) return;
      dl.appendChild(el('dt', null, r[0]));
      dl.appendChild(el('dd', null, r[1]));
    });
    body.appendChild(dl);
    if (p.link) {
      var l = el('a', 'card__link', (p.linkLabel || 'View project') + (/^https?:/.test(p.link) ? ' ↗' : ' →'));
      l.href = p.link;
      l.setAttribute('aria-label', (p.linkLabel || 'View project') + ': ' + p.name);
      body.appendChild(l);
    }
    a.appendChild(body);
    return a;
  }

  function renderFeatured() {
    var box = document.getElementById('featured-projects');
    if (!box) return;
    PROJECTS.filter(function (p) { return p.featured; }).forEach(function (p) { box.appendChild(card(p)); });
  }

  function renderPortfolio() {
    var grid = document.getElementById('project-grid');
    var bar = document.getElementById('project-filters');
    var count = document.getElementById('project-count');
    var empty = document.getElementById('project-empty');
    if (!grid || !bar) return;
    var buttons = [];

    function show(cat) {
      grid.textContent = '';
      var list = PROJECTS.filter(function (p) { return cat === 'all' || p.cats.indexOf(cat) !== -1; });
      list.forEach(function (p) { grid.appendChild(card(p)); });
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === cat)); });
      count.textContent = list.length + (list.length === 1 ? ' project' : ' projects');
      empty.hidden = list.length !== 0;
    }

    (window.PROJECT_FILTERS || []).forEach(function (f) {
      var b = el('button', 'filter', f[1]);
      b.type = 'button';
      b.dataset.cat = f[0];
      b.addEventListener('click', function () {
        show(f[0]);
        history.replaceState(null, '', f[0] === 'all' ? location.pathname : '#' + f[0]);
      });
      buttons.push(b);
      bar.appendChild(b);
    });
    function fromHash() {
      var h = location.hash.slice(1);
      show(buttons.some(function (b) { return b.dataset.cat === h; }) ? h : 'all');
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  // No backend: the form builds a mailto: link and opens the visitor's email app.
  function contactForm() {
    var form = document.getElementById('inquiry-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var body = 'Name: ' + d.get('name') + '\nCompany: ' + (d.get('company') || '-') +
        '\nProject type: ' + d.get('category') + '\nBudget: ' + d.get('budget') + '\n\n' + d.get('message');
      location.href = 'mailto:' + SITE.studioEmail +
        '?subject=' + encodeURIComponent('Project inquiry: ' + d.get('category')) +
        '&body=' + encodeURIComponent(body);
      var s = document.getElementById('inquiry-status');
      if (s) s.textContent = 'Your email app should open with the message ready. If it doesn’t, email ' + SITE.studioEmail + ' directly.';
    });
  }

  applyBrand();
  navToggle();
  renderFeatured();
  renderPortfolio();
  contactForm();
  document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
