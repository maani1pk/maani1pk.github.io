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

  // ---------------------------------------------------------------- WhatsApp + email inquiry
  var WA_ICON = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
  var SOURCE = 'Abdur Studio Portfolio';

  // Digits only, 8 to 15 digits (international format without +). Empty or invalid means "not configured".
  function waNumber() {
    var n = String(SITE.whatsappNumber || '').replace(/[\s+\-().]/g, '');
    return /^[1-9]\d{7,14}$/.test(n) ? n : '';
  }
  function waLink(text) { return 'https://wa.me/' + waNumber() + (text ? '?text=' + encodeURIComponent(text) : ''); }

  // Floating WhatsApp button on every page (only when a number is configured). It opens a chat; it never sends anything.
  function whatsappFab() {
    if (!waNumber() || document.querySelector('.wa-fab')) return;
    var a = el('a', 'wa-fab');
    a.href = waLink('Hello Abdur Studio, I found your portfolio and would like to discuss a project.');
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Chat on WhatsApp');
    a.innerHTML = WA_ICON + '<span class="wa-fab__tip" aria-hidden="true">Chat on WhatsApp</span>';
    document.body.appendChild(a);
    document.body.classList.add('has-fab');
    document.querySelectorAll('[data-wa-direct]').forEach(function (l) {
      l.href = waLink('Hello Abdur Studio, I found your portfolio and would like to discuss a project.');
      l.target = '_blank';
      l.rel = 'noopener';
      l.hidden = false;
    });
  }

  // Contact form. With the CRM configured (Supabase): the inquiry is saved first, success is shown only after the database
  // confirms it (with the Client ID), and then WhatsApp and email are offered. Without it: the form builds one formatted
  // message and hands it to WhatsApp (wa.me click-to-chat) or the visitor's email app.
  // Nothing is ever sent automatically: the visitor still presses Send in WhatsApp or in their email app.
  function inquiryForm() {
    var form = document.getElementById('inquiry-form');
    if (!form) return;
    var status = document.getElementById('inquiry-status');
    var submitBtn = document.getElementById('send-submit');
    var waBtn = document.getElementById('send-wa');
    var mailBtn = document.getElementById('send-email');
    var note = document.getElementById('send-note');
    var result = document.getElementById('inquiry-result');
    var hasWa = !!waNumber();
    var useCrm = !!(window.CRM && window.CRM.configured());

    if (useCrm) {
      submitBtn.hidden = false;
      waBtn.hidden = true;
      mailBtn.hidden = true;
      note.textContent = 'Your details are saved so I can follow up. After saving you can continue on WhatsApp or by email.';
    } else if (hasWa) {
      waBtn.hidden = false;
    } else {
      mailBtn.className = 'btn btn--primary';
      mailBtn.type = 'submit';
    }

    function say(content, kind) {
      status.className = 'form-status' + (kind ? ' form-status--' + kind : '');
      status.textContent = '';
      if (typeof content === 'string') status.textContent = content; else status.appendChild(content);
    }
    function val(n) { return (form.elements[n].value || '').replace(/\r\n?/g, '\n').trim(); }
    function collect() {
      return { name: val('name'), email: val('email'), whatsapp: val('whatsapp'), company: val('company'), type: val('category'), budget: val('budget'), message: val('message'), website: val('website') };
    }
    function valid() {
      ['name', 'message', 'email', 'whatsapp'].forEach(function (n) { form.elements[n].setCustomValidity(''); });
      var d = collect();
      if (!d.name) form.elements.name.setCustomValidity('Please enter your name.');
      if (!d.message) form.elements.message.setCustomValidity('Please describe your project.');
      if (d.whatsapp && !/^[0-9+() .\-]{6,25}$/.test(d.whatsapp)) form.elements.whatsapp.setCustomValidity('Use digits with the country code, for example +44 7700 900123.');
      if (useCrm && !d.email && !d.whatsapp) form.elements.email.setCustomValidity('Please add an email address or a WhatsApp number so I can reach you.');
      return form.reportValidity() ? d : null;
    }
    ['name', 'message', 'email', 'whatsapp'].forEach(function (n) { form.elements[n].addEventListener('input', function () { form.elements.email.setCustomValidity(''); this.setCustomValidity(''); }); });

    function whatsappText(d, id) {
      return [
        'Hello Abdur Studio, I would like to discuss a project.',
        '',
        id ? '*Reference:* ' + id : null,
        '*Name:* ' + d.name,
        '*Company:* ' + (d.company || '-'),
        '*Project type:* ' + d.type,
        '*Budget:* ' + (d.budget || '-'),
        d.email ? '*Email:* ' + d.email : null,
        d.whatsapp ? '*My WhatsApp:* ' + d.whatsapp : null,
        '',
        '*Project description:*',
        d.message,
        '',
        'Website source: ' + SOURCE
      ].filter(function (l) { return l !== null; }).join('\n');
    }
    function emailParts(d, id) {
      var body = [
        'Hello Abdur,',
        '',
        'I would like to discuss a project. My details are below.',
        '',
        id ? 'Reference: ' + id : null,
        'Name: ' + d.name,
        'Company: ' + (d.company || '-'),
        'Project type: ' + d.type,
        'Budget: ' + (d.budget || '-'),
        d.email ? 'Email: ' + d.email : null,
        d.whatsapp ? 'WhatsApp: ' + d.whatsapp : null,
        '',
        'Project description:',
        d.message,
        '',
        'Website source: ' + SOURCE,
        '',
        'Kind regards,',
        d.name
      ].filter(function (l) { return l !== null; }).join('\n');
      return { subject: 'Project inquiry' + (id ? ' ' + id : '') + ': ' + d.type + ' (' + d.name + ')', body: body };
    }
    // mailto bodies need CRLF line breaks, and every part percent-encoded
    function mailtoUrl(d, id) {
      var m = emailParts(d, id);
      return 'mailto:' + SITE.studioEmail + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body.replace(/\n/g, '\r\n'));
    }
    function openWhatsApp(d, id) {
      var url = waLink(whatsappText(d, id));
      var win = window.open(url, '_blank', 'noopener');
      if (!win) location.href = url; // pop-up blocked: open in this tab
    }
    function openEmail(d, id) { location.href = mailtoUrl(d, id); }
    function mailFallbackNote() {
      var frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode('Your email app should open with the message ready. If nothing opens, write to '));
      var a = el('a', null, SITE.studioEmail);
      a.href = 'mailto:' + SITE.studioEmail;
      frag.appendChild(a);
      frag.appendChild(document.createTextNode(' directly.'));
      return frag;
    }

    // Saved: replace the form with the confirmation and the two ways to continue.
    function showSaved(d, id) {
      form.querySelectorAll('.form__grid, .field, .send, .send__note, .form-status, #form-lead, .hp').forEach(function (n) { n.hidden = true; });
      result.hidden = false;
      result.textContent = '';
      var ico = el('div', 'form-done__icon');
      ico.innerHTML = '<svg viewBox="0 0 52 52" width="64" height="64" aria-hidden="true"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 27l8 8 14-17" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      result.appendChild(ico);
      result.appendChild(el('h2', null, 'Inquiry received'));
      var ref = el('p', 'form-done__ref');
      ref.appendChild(document.createTextNode('Your reference: '));
      ref.appendChild(el('strong', null, id));
      result.appendChild(ref);
      result.appendChild(el('p', 'muted', 'Thank you, ' + d.name + '. Your details are saved, so nothing is lost if you close WhatsApp or your email app. To get a faster reply, send the same details now:'));
      var row = el('div', 'send');
      if (hasWa) {
        var w = el('button', 'btn btn--wa');
        w.type = 'button';
        w.innerHTML = WA_ICON.replace('width="30" height="30"', 'width="22" height="22"') + 'Continue on WhatsApp';
        w.addEventListener('click', function () { openWhatsApp(d, id); });
        row.appendChild(w);
      }
      var m = el('button', hasWa ? 'btn btn--ghost' : 'btn btn--primary', 'Send via Email');
      m.type = 'button';
      m.addEventListener('click', function () { openEmail(d, id); });
      row.appendChild(m);
      result.appendChild(row);
      var again = el('button', 'btn btn--text', 'Send another inquiry');
      again.type = 'button';
      again.addEventListener('click', function () { location.reload(); });
      result.appendChild(again);
      result.scrollIntoView({ block: 'center', behavior: REDUCE ? 'auto' : 'smooth' });
    }

    // Could not save (offline, service down): never lose the lead, let the visitor send it directly.
    function showSaveFailed(d, err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Try again';
      if (err.validation) { say(err.message, 'error'); return; }
      say('Your inquiry could not be saved right now. You can try again, or send it directly:', 'error');
      if (hasWa) waBtn.hidden = false;
      mailBtn.hidden = false;
      mailBtn.className = 'btn btn--ghost';
    }

    function saveInquiry() {
      var d = valid();
      if (!d) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
      say('', '');
      window.CRM.submitInquiry(d).then(function (id) { showSaved(d, id); }, function (err) { showSaveFailed(d, err); });
    }
    function sendWhatsApp() { var d = valid(); if (!d) return; openWhatsApp(d, ''); say('WhatsApp is opening with your message ready. Press Send there to deliver it.', 'ok'); }
    function sendEmail() { var d = valid(); if (!d) return; openEmail(d, ''); say(mailFallbackNote(), 'ok'); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (useCrm) saveInquiry(); else if (hasWa) sendWhatsApp(); else sendEmail();
    });
    waBtn.addEventListener('click', function (e) { if (waBtn.type === 'submit' && !useCrm) return; e.preventDefault(); sendWhatsApp(); });
    mailBtn.addEventListener('click', function (e) { if (mailBtn.type === 'submit' && !useCrm && !hasWa) return; e.preventDefault(); sendEmail(); });

    if (!useCrm && !hasWa) {
      var lead = document.getElementById('form-lead');
      var intro = document.getElementById('contact-lead');
      if (lead) lead.textContent = 'Fill this in and send it by email. Nothing is sent until you press Send in your email app.';
      if (intro) intro.textContent = 'Games, mobile apps, AR, Meta Quest and 3D experiences. Share a few details and send them by email.';
      if (note) note.textContent = 'This opens your email app with the message ready. You can also write to ' + SITE.studioEmail + ' directly.';
    }
    if (useCrm) {
      var lead2 = document.getElementById('form-lead');
      if (lead2) lead2.textContent = 'Fill this in and submit. I will see it right away, and you can then continue on WhatsApp or by email.';
    }

    // used by tests and by anyone who wants to inspect the exact messages
    window.__inquiry = { whatsappText: whatsappText, emailParts: emailParts, mailtoUrl: mailtoUrl, waLink: waLink, collect: collect };
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
  inquiryForm();
  whatsappFab();
  document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
