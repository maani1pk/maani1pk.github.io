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

  var root = document.documentElement;
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reveal = function () {}; // replaced by motion() when motion is allowed

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
    function close() { btn.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); }
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
    });
    // Close after following an in-page link such as /#studio, or with Escape.
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  function card(p, i) {
    var a = el('article', 'card');
    if (p.img) {
      var fig = el('div', 'card__media' + (p.imgFit === 'phone' ? ' card__media--phone' : ''));
      var img = el('img');
      img.src = p.img; img.alt = p.alt || p.name; img.loading = 'lazy'; img.decoding = 'async';
      fig.appendChild(img);
      fig.appendChild(el('span', 'card__idx', (i < 9 ? '0' : '') + (i + 1)));
      if (p.link) { var cue = el('span', 'card__cue', p.link.indexOf('http') === 0 ? '↗' : '→'); cue.setAttribute('aria-hidden', 'true'); fig.appendChild(cue); }
      a.appendChild(fig);
      if (p.stock) a.appendChild(el('p', 'card__note', 'Illustrative stock photo · captures coming soon'));
    } else {
      var empty = el('div', 'card__media card__media--empty', p.name);
      empty.appendChild(el('span', 'card__idx', (i < 9 ? '0' : '') + (i + 1)));
      a.appendChild(empty);
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
    PROJECTS.filter(function (p) { return p.featured; }).forEach(function (p, i) { box.appendChild(card(p, i)); });
    reveal(Array.prototype.slice.call(box.children));
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
      list.forEach(function (p, i) { grid.appendChild(card(p, i)); });
      reveal(Array.prototype.slice.call(grid.children));
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
      if (s) {
        s.textContent = 'Your email app should open with the message ready. If it doesn’t, email ' + SITE.studioEmail + ' directly.';
        s.classList.add('pop');
      }
    });
  }

  // ---------------------------------------------------------------- motion
  function splitWords(n) {
    if (n.children.length || n.dataset.split) return;
    var words = n.textContent.trim().split(/\s+/);
    n.dataset.split = '1';
    n.textContent = '';
    n.classList.add('stxt');
    words.forEach(function (w, i) {
      var o = el('span', 'sw'), inn = el('span', 'sw__i', w);
      inn.style.setProperty('--i', i);
      o.appendChild(inn);
      n.appendChild(o);
      if (i < words.length - 1) n.appendChild(document.createTextNode(' '));
    });
  }

  function rotator() {
    document.querySelectorAll('.rotator__words').forEach(function (box) {
      var words = Array.prototype.slice.call(box.children);
      if (words.length < 2) return;
      words.forEach(function (w) {
        var t = w.textContent;
        w.textContent = '';
        Array.from(t).forEach(function (ch, i) {
          var s = el('span', 'rc', ch === ' ' ? ' ' : ch);
          s.style.setProperty('--c', i);
          w.appendChild(s);
        });
      });
      box.setAttribute('data-rot', '');
      var i = 0;
      words[0].classList.add('is-on');
      if (REDUCE) return;
      setTimeout(function () {
        setInterval(function () {
          if (document.hidden) return;
          var cur = words[i];
          i = (i + 1) % words.length;
          cur.classList.remove('is-on');
          cur.classList.add('is-off');
          words[i].classList.add('is-on');
          setTimeout(function () {
            cur.classList.add('reset');
            cur.classList.remove('is-off');
            setTimeout(function () { cur.classList.remove('reset'); }, 80);
          }, 800);
        }, 2800);
      }, 2200);
    });
  }

  // Page chrome: progress bar, sticky header state, gentle scroll drift on the hero mark.
  function chrome(art) {
    var header = document.querySelector('.site-header');
    var bar = el('div', 'progress');
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var y = window.scrollY;
      var h = root.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0);
      if (header) header.classList.toggle('is-stuck', y > 12);
      if (art && !REDUCE) art.style.translate = '0 ' + Math.min(y, 900) * 0.1 + 'px';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  // Hero mark follows the pointer a little (desktop only).
  function heroPointer() {
    var hero = document.querySelector('[data-hero]');
    var art = document.querySelector('.hero__art');
    if (!hero || !art) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      art.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      art.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    });
    hero.addEventListener('pointerleave', function () { art.style.setProperty('--px', 0); art.style.setProperty('--py', 0); });
  }

  function motion() {
    root.classList.add('js');
    chrome(document.querySelector('.hero__art'));

    // headings: split into words so they can rise in one by one
    if (!REDUCE) {
      Array.prototype.slice.call(document.querySelectorAll('.h2, main > h1, .contact__info > h1'))
        .filter(function (n) { return !n.classList.contains('hero-title'); })
        .forEach(splitWords);
    }
    if (REDUCE) {
      rotator();
      document.querySelectorAll('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
      return;
    }

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;

    function watch(n) { if (io) io.observe(n); else n.classList.add('in'); }
    reveal = function (nodes) {
      nodes.forEach(function (n, i) {
        if (!n.classList.contains('rv')) {
          n.classList.add('rv');
          n.style.setProperty('--d', (i % 4) * 0.08 + 's');
        }
        watch(n);
      });
    };
    document.querySelectorAll('.stxt').forEach(watch);
    reveal(Array.prototype.slice.call(document.querySelectorAll(
      '.section-head, .split > *, .steps li, .gallery figure, .cta, .strip li, .stats > div, .features > *, ' +
      '.service, .tags, .contact__info > *, .form, main > .eyebrow, main > .lead, .filters, .feature, .mega, .hero__copy > .rv')));

    // fail-safe: never leave content hidden if an observer callback is missed
    setTimeout(function () {
      document.querySelectorAll('.rv:not(.in), .stxt:not(.in)').forEach(function (n) {
        if (n.getBoundingClientRect().top < window.innerHeight * 1.2) n.classList.add('in');
      });
    }, 3800);

    rotator();
    if (FINE) heroPointer();
  }

  applyBrand();
  navToggle();
  motion();
  renderFeatured();
  renderPortfolio();
  contactForm();
  document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
