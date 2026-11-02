// BandPulse site: mobile menu, equalizer bars, screenshot lightbox.
(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  var eq = document.querySelector('.eq');
  if (eq) {
    for (var i = 0; i < 28; i++) {
      var s = document.createElement('span');
      s.style.animationDelay = (-(i * 137) % 1100) + 'ms';
      s.style.animationDuration = (700 + (i * 53) % 600) + 'ms';
      eq.appendChild(s);
    }
  }

  var box = document.querySelector('.lightbox');
  if (box) {
    var img = box.querySelector('img');
    var close = box.querySelector('button');
    var last = null;
    function hide() { box.classList.remove('open'); img.removeAttribute('src'); if (last) last.focus(); }
    document.querySelectorAll('.gallery button').forEach(function (b) {
      b.addEventListener('click', function () {
        last = b;
        img.src = b.getAttribute('data-full');
        img.alt = b.querySelector('img').alt;
        box.classList.add('open');
        close.focus();
      });
    });
    close.addEventListener('click', hide);
    box.addEventListener('click', function (e) { if (e.target === box) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) hide(); });
  }
})();
