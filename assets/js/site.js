(function () {
  'use strict';
  var SITE = window.SITE || {};
  var root = document.documentElement;
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

  // /work/ filters: the links work without JavaScript (they go to category pages);
  // with JavaScript the cards are filtered in place, with a short fade and no reload.
  function projectFilter() {
    var grid = document.getElementById('project-grid');
    var bar = document.getElementById('project-filters');
    if (!grid || !bar) return;
    var links = Array.prototype.slice.call(bar.querySelectorAll('.filter[data-filter]'));
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var count = document.getElementById('project-count');
    var empty = document.getElementById('empty-filter');
    var LEGACY = { kids: 'apps', training: 'vr', i3d: 'interactive', client: 'all', proto: 'all' };
    var NAMES = {};
    links.forEach(function (l) { NAMES[l.getAttribute('data-filter')] = l.textContent.replace(/\d+\s*$/, '').trim(); });
    var timer;

    function apply(cat) {
      var shown = 0;
      clearTimeout(timer);
      cards.forEach(function (c) {
        var match = cat === 'all' || c.getAttribute('data-cats').split(' ').indexOf(cat) !== -1;
        if (match) shown++;
        if (REDUCE) { c.hidden = !match; return; }
        if (match) {
          if (c.hidden) { c.hidden = false; void c.offsetWidth; }
          c.classList.remove('is-out');
        } else {
          c.classList.add('is-out');
        }
      });
      if (!REDUCE) {
        timer = setTimeout(function () {
          cards.forEach(function (c) {
            var match = cat === 'all' || c.getAttribute('data-cats').split(' ').indexOf(cat) !== -1;
            c.hidden = !match;
          });
        }, 360);
      }
      links.forEach(function (l) {
        if (l.getAttribute('data-filter') === cat) l.setAttribute('aria-current', 'page');
        else l.removeAttribute('aria-current');
      });
      if (count) count.textContent = shown + (shown === 1 ? ' project' : ' projects');
      if (empty) {
        empty.hidden = shown !== 0;
        var h = empty.querySelector('h3');
        if (h) h.textContent = 'Case studies for ' + (NAMES[cat] || 'this category') + ' are in preparation';
      }
    }

    function fromHash() {
      var h = location.hash.slice(1);
      h = LEGACY[h] || h;
      apply(NAMES[h] ? h : 'all');
    }

    links.forEach(function (l) {
      l.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        var cat = l.getAttribute('data-filter');
        apply(cat);
        history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
      });
    });
    window.addEventListener('hashchange', fromHash);
    if (location.hash) fromHash();
  }

  // Inquiry form: sent in the background through FormSubmit (a form-to-email service) to the studio inbox.
  // Without JavaScript the form posts to the same service as a normal page; if the service cannot be reached,
  // the visitor gets a ready-made email to send instead.
  function contactForm() {
    var form = document.getElementById('inquiry-form');
    if (!form) return;
    var status = document.getElementById('inquiry-status');
    var btn = document.getElementById('inquiry-send');
    var endpoint = 'https://formsubmit.co/ajax/' + SITE.studioEmail;

    function say(text, kind) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form-status' + (kind ? ' form-status--' + kind : '');
    }
    function mailtoHref(d) {
      var body = 'Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\nCompany: ' + (d.get('company') || '-') +
        '\nProject type: ' + d.get('category') + '\nBudget: ' + d.get('budget') + '\n\n' + d.get('message');
      return 'mailto:' + SITE.studioEmail + '?subject=' + encodeURIComponent('Project inquiry: ' + d.get('category')) + '&body=' + encodeURIComponent(body);
    }
    function done(d) {
      form.innerHTML = '';
      var box = el('div', 'form-done');
      box.setAttribute('role', 'status');
      box.innerHTML = '<svg viewBox="0 0 52 52" width="64" height="64" aria-hidden="true"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 27l8 8 14-17" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      box.appendChild(el('h2', null, 'Message sent'));
      box.appendChild(el('p', 'muted', 'Thanks' + (d.get('name') ? ', ' + d.get('name') : '') + '. I will reply to ' + (d.get('email') || 'the email address you entered') + '.'));
      var again = el('button', 'btn btn--ghost', 'Send another message');
      again.type = 'button';
      again.addEventListener('click', function () { location.href = '/contact/'; });
      box.appendChild(again);
      form.appendChild(box);
      box.scrollIntoView({ block: 'center', behavior: REDUCE ? 'auto' : 'smooth' });
    }

    if (/[?&]sent=1/.test(location.search)) {
      done(new FormData());
      return;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var d = new FormData(form);
      if (d.get('_honey')) { done(d); return; } // a bot filled the hidden field: pretend it worked
      d.set('_subject', 'New project inquiry: ' + d.get('category') + ' (' + d.get('name') + ')');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      say('', '');
      var failed = function () {
        btn.disabled = false;
        btn.textContent = 'Send message';
        status.className = 'form-status form-status--error';
        status.textContent = 'The message could not be sent. ';
        var a = el('a', null, 'Send it from your email app instead');
        a.href = mailtoHref(d);
        status.appendChild(a);
        status.appendChild(document.createTextNode(' or write to ' + SITE.studioEmail + '.'));
      };
      fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: d })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && (res.j.success === true || res.j.success === 'true')) done(d);
          else failed();
        })
        .catch(failed);
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
      Array.prototype.slice.call(document.querySelectorAll('.h2, main > h1, .page-head .h1, .contact__info > h1'))
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
    function reveal(nodes) {
      nodes.forEach(function (n, i) {
        if (!n.classList.contains('rv')) {
          n.classList.add('rv');
          n.style.setProperty('--d', (i % 4) * 0.08 + 's');
        }
        watch(n);
      });
    }
    document.querySelectorAll('.stxt').forEach(watch);
    reveal(Array.prototype.slice.call(document.querySelectorAll(
      '.section-head, .disc li, .card, .tech > div, .split > *, .steps li, .gallery figure, .cta, .strip li, .stats > div, .features > *, ' +
      '.service, .tags, .contact__info > *, .form, .page-head > *, .cat-head .wrap > *, .pj__copy > *, .mega, .hero__copy > .rv')));

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
  projectFilter();
  contactForm();
  document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
