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
  function splitWords(n, step) {
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
      var start = parseFloat(getComputedStyle(root).getPropertyValue('--t0')) * 1000 || 0;
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
      }, start + 1800);
    });
  }

  // Basic page chrome: progress bar, sticky header state, scroll-linked effects.
  function chrome(parallax, drift, art) {
    var header = document.querySelector('.site-header');
    var bar = el('div', 'progress');
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var vh = window.innerHeight, y = window.scrollY;
      var h = root.scrollHeight - vh;
      bar.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0);
      if (header) header.classList.toggle('is-stuck', y > 12);
      if (!REDUCE) {
        if (art) art.style.translate = '0 ' + Math.min(y, 900) * 0.1 + 'px';
        parallax.forEach(function (n) {
          var r = n.getBoundingClientRect();
          if (r.bottom < -120 || r.top > vh + 120) return;
          n.style.transform = 'translate3d(0,' + (((r.top + r.height / 2) - vh / 2) * -0.05).toFixed(1) + 'px,0)';
        });
        drift.forEach(function (n) {
          var r = n.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var f = parseFloat(n.getAttribute('data-drift')) || 0.3;
          n.style.transform = 'translate3d(' + (((r.top + r.height / 2) - vh / 2) * f).toFixed(1) + 'px,0,0)';
        });
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } });
    update();
  }

  function pageTransitions() {
    var wipe = document.querySelector('.wipe');
    if (!wipe) return;
    var OWN = { '/': 1, '/work/': 1, '/services/': 1, '/contact/': 1 };
    function norm(p) { return p.replace(/index\.html$/, ''); }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target || a.hasAttribute('download')) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !OWN[norm(u.pathname)] || norm(u.pathname) === norm(location.pathname)) return;
      e.preventDefault();
      try { sessionStorage.setItem('as-wipe', '1'); } catch (x) { /* storage blocked: skip the arrival sweep */ }
      wipe.classList.add('on');
      setTimeout(function () { location.href = u.href; }, 560);
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) wipe.classList.remove('on'); });
  }

  function cursor() {
    var ring = el('div', 'cursor'), dot = el('div', 'cursor-dot');
    ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true');
    var glow = el('div', 'cursor-glow');
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow); document.body.appendChild(ring); document.body.appendChild(dot);
    var tx = 0, ty = 0, rx = 0, ry = 0, raf = 0;
    function loop() {
      rx += (tx - rx) * 0.2; ry += (ty - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      glow.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      raf = (Math.abs(tx - rx) > 0.15 || Math.abs(ty - ry) > 0.15) ? requestAnimationFrame(loop) : 0;
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      ring.classList.add('on'); dot.classList.add('on');
      if (!raf) raf = requestAnimationFrame(loop);
      var t = e.target.closest ? e.target.closest('a,button,summary,select,.card,.mega') : null;
      var tf = e.target.closest ? e.target.closest('input,textarea') : null;
      ring.classList.toggle('is-link', !!t);
      ring.classList.toggle('is-text', !!tf);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { ring.classList.remove('on'); dot.classList.remove('on'); });
  }

  function interactions() {
    // magnetic buttons
    document.addEventListener('pointermove', function (e) {
      var m = e.target.closest && e.target.closest('.btn--primary, .btn--ghost, .mega__arrow');
      if (!m) return;
      var r = m.getBoundingClientRect();
      m.style.translate = ((e.clientX - (r.left + r.width / 2)) * 0.16).toFixed(1) + 'px ' + ((e.clientY - (r.top + r.height / 2)) * 0.28).toFixed(1) + 'px';
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var m = e.target.closest && e.target.closest('.btn--primary, .btn--ghost, .mega__arrow');
      if (m && (!e.relatedTarget || !m.contains(e.relatedTarget))) m.style.translate = '';
    });
    // 3D tilt + inner image parallax on cards
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty('--mx', (x * 2).toFixed(2));
      c.style.setProperty('--my', (y * 2).toFixed(2));
      c.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-4px)';
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (c && (!e.relatedTarget || !c.contains(e.relatedTarget))) { c.style.transform = ''; c.style.setProperty('--mx', 0); c.style.setProperty('--my', 0); }
    });
    // hero pointer parallax
    var hero = document.querySelector('[data-hero]');
    var art = document.querySelector('.hero__art');
    if (hero && art) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        art.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        art.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
      hero.addEventListener('pointerleave', function () { art.style.setProperty('--px', 0); art.style.setProperty('--py', 0); });
    }
  }

  function motion() {
    root.classList.add('js');
    var art = document.querySelector('.hero__art');

    // headings: split into words; parallax on selected headlines; drifting statement lines
    var heads = Array.prototype.slice.call(document.querySelectorAll('.h2, main > h1, .contact__info > h1')).filter(function (n) { return !n.classList.contains('hero-title'); });
    if (!REDUCE) heads.forEach(function (n) { splitWords(n); });
    var parallax = REDUCE ? [] : Array.prototype.slice.call(document.querySelectorAll('.section-head .h2, .split .h2'));
    var drift = REDUCE ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-drift]'));
    chrome(parallax, drift, art);
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
    pageTransitions();
    if (FINE) { cursor(); interactions(); }
    // logo intro cleanup (CSS already hides it on its own)
    var loader = document.querySelector('.loader');
    if (loader) setTimeout(function () { loader.remove(); root.classList.remove('intro'); }, 3300);
  }

  applyBrand();
  navToggle();
  motion();
  renderFeatured();
  renderPortfolio();
  contactForm();
  document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
