/* Try-it demo: trace the letter A with a mouse, finger or pen. Same idea as the app: numbered start dots, arrows, three strokes.
   Plain JavaScript, no libraries, no network, nothing is stored or sent anywhere. */
(function () {
  'use strict';
  var canvas = document.getElementById('demo-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var msg = document.getElementById('demo-msg');
  var chip = document.getElementById('demo-chip');
  var bar = document.getElementById('demo-bar');
  var btnWatch = document.getElementById('demo-watch');
  var btnReset = document.getElementById('demo-reset');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Letter A in a 300 x 340 box: left diagonal up, right diagonal down, crossbar left to right.
  var VW = 300, VH = 340;
  var STROKES = [
    [[50, 310], [150, 30]],
    [[150, 30], [250, 310]],
    [[84, 215], [216, 215]]
  ];
  var TRACK = 46, FILL = 30, TOL = 30, GRAB = 44, DONE_AT = 0.965, MAX_JUMP = 90;
  var BLUE = '#2a8cf0', GREEN = '#2fc48d', ORANGE = '#ff8a3d', INK = '#2b2a4c';
  var TRACK_COL = canvas.getAttribute('data-track') || '#e1e4f5', DOT_COL = canvas.getAttribute('data-dots') || '#8d8fb0';

  // ----- geometry -----
  function segLens(pts) { var out = [], t = 0; for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); out.push(l); t += l; } return { segs: out, total: t }; }
  var META = STROKES.map(segLens);
  function pointAt(si, d) {
    var pts = STROKES[si], m = META[si]; d = Math.max(0, Math.min(m.total, d));
    for (var i = 0; i < m.segs.length; i++) {
      if (d <= m.segs[i] || i === m.segs.length - 1) { var t = m.segs[i] ? d / m.segs[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; }
      d -= m.segs[i];
    }
    return pts[pts.length - 1];
  }
  function project(si, p) {
    var pts = STROKES[si], m = META[si], best = { d: 0, dist: 1e9 }, acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0;
      var qx = ax + dx * t, qy = ay + dy * t, dist = Math.hypot(p[0] - qx, p[1] - qy);
      if (dist < best.dist) best = { d: acc + t * m.segs[i - 1], dist: dist };
      acc += m.segs[i - 1];
    }
    return best;
  }

  // ----- state -----
  var idx = 0, prog = 0, dragging = false, finished = false, demoing = false, confetti = [], raf = 0, pulse = 0;
  function reset() { idx = 0; prog = 0; dragging = false; finished = false; demoing = false; confetti = []; say('Start at the green dot, then drag along the path.'); updateChip(); draw(); }
  function say(t) { if (msg) msg.textContent = t; }
  function updateChip() {
    if (chip) chip.textContent = finished ? 'All done!' : 'Stroke ' + (idx + 1) + ' of ' + STROKES.length;
    if (bar) bar.style.width = ((finished ? 1 : (idx + prog / META[idx].total) / STROKES.length) * 100) + '%';
  }

  // ----- canvas sizing (sharp on high-DPI screens) -----
  var scale = 1;
  function resize() {
    var w = canvas.clientWidth || 300; var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * VH / VW * dpr);
    scale = canvas.width / VW; draw();
  }
  window.addEventListener('resize', resize);

  // ----- drawing -----
  function line(pts, width, color, dash, upTo) {
    ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width; ctx.strokeStyle = color; ctx.setLineDash(dash || []);
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (upTo === undefined) { for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
    else { var steps = Math.max(2, Math.ceil(upTo / 6)); for (var s = 1; s <= steps; s++) { var q = pointAt(pts.si, upTo * s / steps); ctx.lineTo(q[0], q[1]); } }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function badge(p, n, active) {
    ctx.beginPath(); ctx.arc(p[0], p[1], 16, 0, 6.2832); ctx.fillStyle = active ? GREEN : '#fff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = active ? '#fff' : '#b9bad3'; ctx.stroke();
    ctx.fillStyle = active ? '#fff' : '#8b8cab'; ctx.font = '600 17px Fredoka, Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), p[0], p[1] + 1);
  }
  function arrow(si, dim) {
    var m = META[si], p = pointAt(si, m.total * .5), q = pointAt(si, m.total * .5 + 4), a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
    ctx.fillStyle = dim ? 'rgba(43,42,76,.28)' : INK; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(scale, 0, 0, scale, 0, 0);
    var i;
    // the pale track under the whole letter
    for (i = 0; i < STROKES.length; i++) line(STROKES[i], TRACK, TRACK_COL);
    // dotted guide
    for (i = 0; i < STROKES.length; i++) line(STROKES[i], 5, DOT_COL, [0.1, 13]);
    // finished strokes and the part traced so far
    for (i = 0; i < STROKES.length; i++) {
      if (i < idx || finished) line(STROKES[i], FILL, BLUE);
      else if (i === idx && prog > 0) { var tmp = STROKES[i].slice(); tmp.si = i; line(tmp, FILL, BLUE, null, prog); }
    }
    if (!finished) {
      for (i = 0; i < STROKES.length; i++) if (i >= idx) arrow(i, i !== idx);
      // numbered start dots for the strokes still to do
      for (i = idx; i < STROKES.length; i++) { if (i === idx && prog > 0) continue; badge(STROKES[i][0], i + 1, i === idx); }
      // pulsing ring where to start (before the first touch), or the pen head while tracing
      var head = pointAt(idx, prog);
      if (prog === 0 && !dragging && !demoing) { var r = 22 + 5 * Math.sin(pulse); ctx.beginPath(); ctx.arc(head[0], head[1], r, 0, 6.2832); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(47,196,141,.55)'; ctx.stroke(); }
      if (prog > 0 || demoing) { ctx.beginPath(); ctx.arc(head[0], head[1], 15, 0, 6.2832); ctx.fillStyle = ORANGE; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); }
    }
    // confetti
    for (i = 0; i < confetti.length; i++) { var c = confetti[i]; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; if (c.star) { ctx.beginPath(); for (var k = 0; k < 10; k++) { var rad = k % 2 ? c.s * .45 : c.s; ctx.lineTo(Math.cos(k * .6283 - 1.5708) * rad, Math.sin(k * .6283 - 1.5708) * rad); } ctx.closePath(); ctx.fill(); } else ctx.fillRect(-c.s / 2, -c.s / 3, c.s, c.s * .66); ctx.restore(); }
  }

  // ----- animation loop (only runs while something is moving) -----
  function loop() {
    pulse += 0.12;
    for (var i = confetti.length - 1; i >= 0; i--) { var c = confetti[i]; c.x += c.vx; c.y += c.vy; c.vy += 0.18; c.r += c.vr; c.life--; if (c.life <= 0 || c.y > VH + 20) confetti.splice(i, 1); }
    draw();
    if (confetti.length || (!finished && prog === 0 && !dragging && !demoing && !reduce)) raf = requestAnimationFrame(loop); else raf = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function burst() {
    if (reduce) return; var cols = [BLUE, GREEN, ORANGE, '#ff6fae', '#8b6cff', '#ffd23f'];
    for (var i = 0; i < 70; i++) confetti.push({ x: 150 + (Math.random() - .5) * 60, y: 150, vx: (Math.random() - .5) * 7, vy: -Math.random() * 7 - 2, r: Math.random() * 6, vr: (Math.random() - .5) * .3, s: 8 + Math.random() * 9, c: cols[i % cols.length], star: i % 4 === 0, life: 90 + Math.random() * 40 });
    kick();
  }

  // ----- game logic -----
  function completeStroke() {
    prog = 0; idx++; dragging = false;
    if (idx >= STROKES.length) { idx = STROKES.length - 1; finished = true; say('Great job! You made an A! A is for Apple.'); updateChip(); burst(); draw(); return; }
    say(idx === 1 ? 'Nice! Now start at the top and go down.' : 'Almost there! Now the bar across the middle.'); updateChip(); draw();
  }
  function toLocal(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height]; }
  canvas.addEventListener('pointerdown', function (e) {
    if (finished || demoing) return; e.preventDefault();
    var p = toLocal(e), head = pointAt(idx, prog);
    if (Math.hypot(p[0] - head[0], p[1] - head[1]) <= GRAB) { dragging = true; try { canvas.setPointerCapture(e.pointerId); } catch (x) { } say(prog > 0 ? 'Keep going!' : 'Follow the dotted path.'); draw(); }
    else say(prog > 0 ? 'Put your finger on the orange dot to carry on.' : 'Start at the green dot!');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return; e.preventDefault();
    var pr = project(idx, toLocal(e));
    if (pr.dist <= TOL) { if (pr.d > prog && pr.d - prog <= MAX_JUMP) prog = pr.d; }
    else if (pr.dist > TOL * 2.2) say('Stay on the path.');
    if (prog >= META[idx].total * DONE_AT) { completeStroke(); return; }
    updateChip(); draw();
  });
  function up() { if (!dragging) return; dragging = false; if (!finished) say('Put your finger back on the orange dot to continue.'); draw(); kick(); }
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  // ----- "Watch how" demo, also works without a mouse -----
  function watch() {
    if (demoing) return; reset(); demoing = true; say('Watch: one stroke at a time.'); var t0 = null, si = 0, dur = 1100, gap = 350;
    function step(ts) {
      if (!demoing) return; if (t0 === null) t0 = ts; var el = ts - t0;
      if (el < dur) { idx = si; prog = META[si].total * (el / dur); updateChip(); draw(); }
      else if (el < dur + gap) { idx = si; prog = META[si].total; draw(); }
      else { si++; t0 = ts; idx = Math.min(si, STROKES.length - 1); prog = 0; if (si >= STROKES.length) { demoing = false; reset(); say('Now you try! Start at the green dot.'); kick(); return; } }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (btnWatch) btnWatch.addEventListener('click', watch);
  if (btnReset) btnReset.addEventListener('click', function () { demoing = false; reset(); kick(); });

  // go
  resize(); reset(); kick();
})();
