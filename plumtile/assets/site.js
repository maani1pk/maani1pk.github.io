// Plumtile site: mobile menu (same as the other sites) and a graceful look for screenshots that are not there yet.
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

  document.querySelectorAll('.shots img').forEach(function (img) {
    function miss() { img.classList.add('missing'); img.removeAttribute('src'); }
    img.addEventListener('error', miss);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) miss();
  });
})();
