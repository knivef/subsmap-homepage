/* ==========================================================================
   subsmap hero radar
   A perspective polar grid with a clockwise sweep that "detects" subreddits.
   Rebuilt from the deepsec hero: concentric ellipses, straight spokes, outer
   tick marks, an angular fading wedge behind a bright leading edge, and
   labelled blips that pop when the beam crosses them and fade out.

   Palette: #FF4500 for the beam and hot finds, black at opacity for the grid.
   ========================================================================== */
(function () {
  var canvas = document.getElementById('radar');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Tunables -------------------------------------------------------------- */
  var PERIOD   = 8000;   /* ms for one full clockwise revolution */
  var TRAIL    = 1.34;   /* radians of fading wedge behind the leading edge */
  var SLICES   = 34;     /* wedge is drawn as N slices, alpha falls off */
  var RINGS    = [0.25, 0.5, 0.72, 1];
  var SPOKES   = 12;
  var TICKS    = 76;
  var LIFE     = 2800;   /* ms a detected blip stays on screen */

  var ORANGE = '255,69,0';

  /* The finds. Angles in radians, radius as a fraction of the outer ring.
     Labels are decorative: the canvas is aria-hidden and the real hero copy
     lives in the DOM. */
  /* Angles are biased to the upper half so blips land on the radar rather
     than on the subhead and the search field below the wordmark. Anything in
     the lower half sits out at the rim, clear of the copy. */
  var finds = [
    { a: -2.70, r: 0.74, label: 'r/SideProject',  hot: false, fit: 74 },
    { a: -2.05, r: 0.52, label: 'r/webdev',       hot: false, fit: 52 },
    { a: -1.42, r: 0.80, label: 'r/SaaS',         hot: true,  fit: 94 },
    { a: -0.86, r: 0.46, label: 'r/microsaas',    hot: true,  fit: 81 },
    { a: -0.34, r: 0.90, label: 'r/indiehackers', hot: true,  fit: 89 },
    { a:  0.44, r: 0.96, label: 'r/marketing',    hot: true,  fit: 83 },
    { a:  1.18, r: 0.99, label: 'r/Entrepreneur', hot: false, fit: 66 },
    { a:  2.40, r: 0.97, label: 'r/startups',     hot: false, fit: 48 }
  ];
  for (var i = 0; i < finds.length; i++) finds[i].hit = -1e9;

  /* Geometry -------------------------------------------------------------- */
  var W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0, dpr = 1;

  function measure() {
    var box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, box.width);
    H = Math.max(1, box.height);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var narrow = W < 760;
    rx = narrow ? W * 0.74 : Math.min(W * 0.48, 720);
    ry = rx * (narrow ? 0.44 : 0.275);

    cx = W / 2;
    /* Centre the radar on the wordmark, the way the reference does. */
    var mark = document.querySelector('.mark');
    if (mark) {
      var m = mark.getBoundingClientRect();
      cy = (m.top - box.top) + m.height * 0.54;
    } else {
      cy = H * 0.42;
    }
  }

  function px(a, r) { return cx + rx * r * Math.cos(a); }
  function py(a, r) { return cy + ry * r * Math.sin(a); }

  /* Drawing --------------------------------------------------------------- */

  function drawGrid(sweep) {
    var k, a, r;

    /* concentric rings */
    ctx.lineWidth = 1;
    for (k = 0; k < RINGS.length; k++) {
      r = RINGS[k];
      ctx.strokeStyle = 'rgba(0,0,0,' + (k === RINGS.length - 1 ? 0.16 : 0.1) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * r, ry * r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* straight spokes */
    ctx.strokeStyle = 'rgba(0,0,0,.09)';
    ctx.beginPath();
    for (k = 0; k < SPOKES; k++) {
      a = (k / SPOKES) * Math.PI * 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(px(a, 1), py(a, 1));
    }
    ctx.stroke();

    /* outer tick marks, brightening where the beam is */
    for (k = 0; k < TICKS; k++) {
      a = (k / TICKS) * Math.PI * 2;
      var d = Math.abs(angleDelta(a, sweep));
      var near = d < 0.34 ? (1 - d / 0.34) : 0;
      ctx.strokeStyle = near > 0
        ? 'rgba(' + ORANGE + ',' + (0.18 + near * 0.7).toFixed(3) + ')'
        : 'rgba(0,0,0,.22)';
      ctx.lineWidth = near > 0.5 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(px(a, 1.004), py(a, 1.004));
      ctx.lineTo(px(a, 1.042), py(a, 1.042));
      ctx.stroke();
    }
  }

  function drawSweep(sweep) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);   /* squash a circle into the perspective ellipse */

    if (ctx.createConicGradient) {
      /* One smooth wedge. A conic gradient inherits the squash, so the
         falloff follows the ellipse instead of banding into slices. */
      var g = ctx.createConicGradient(sweep - TRAIL, 0, 0);
      var lead = TRAIL / (Math.PI * 2);
      g.addColorStop(0, 'rgba(' + ORANGE + ',0)');
      g.addColorStop(lead * 0.45, 'rgba(' + ORANGE + ',.035)');
      g.addColorStop(lead * 0.78, 'rgba(' + ORANGE + ',.10)');
      g.addColorStop(lead * 0.96, 'rgba(' + ORANGE + ',.20)');
      g.addColorStop(Math.min(lead, 0.999), 'rgba(' + ORANGE + ',.30)');
      g.addColorStop(1, 'rgba(' + ORANGE + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rx, sweep - TRAIL, sweep);
      ctx.closePath();
      ctx.fill();
    } else {
      /* Fallback: stack thin slices with a falling alpha. */
      var step = TRAIL / SLICES;
      for (var i = 0; i < SLICES; i++) {
        var a2 = sweep - i * step;
        var a1 = a2 - step * 1.06;
        var alpha = Math.pow(1 - i / SLICES, 1.7) * 0.24;
        ctx.fillStyle = 'rgba(' + ORANGE + ',' + alpha.toFixed(4) + ')';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, rx, a1, a2);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    /* leading edge */
    ctx.save();
    ctx.strokeStyle = 'rgba(' + ORANGE + ',.92)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(' + ORANGE + ',.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px(sweep, 1), py(sweep, 1));
    ctx.stroke();
    ctx.restore();

    /* centre node */
    ctx.fillStyle = 'rgba(' + ORANGE + ',.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFinds(now) {
    for (var i = 0; i < finds.length; i++) {
      var f = finds[i];
      var age = now - f.hit;
      if (age < 0 || age > LIFE) continue;

      var t = age / LIFE;
      var alpha;
      if (age < 130)       alpha = age / 130;          /* pop in */
      else if (t < 0.42)   alpha = 1;                  /* hold */
      else                 alpha = 1 - (t - 0.42) / 0.58;
      alpha = Math.max(0, Math.min(1, alpha));

      var x = px(f.a, f.r), y = py(f.a, f.r);
      var col = f.hot ? ORANGE : '0,0,0';

      /* halo */
      var g = ctx.createRadialGradient(x, y, 0, x, y, 22);
      g.addColorStop(0, 'rgba(' + col + ',' + (alpha * (f.hot ? 0.3 : 0.14)).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      /* dot */
      var pop = age < 130 ? 1 + (1 - age / 130) * 1.6 : 1;
      ctx.fillStyle = 'rgba(' + col + ',' + (alpha * 0.95).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 3 * pop, 0, Math.PI * 2);
      ctx.fill();

      /* label, mono, bracketed, above and left like the reference */
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      var text = '[' + f.label + ' ' + f.fit + ']';
      var w = ctx.measureText(text).width;
      var lx = x - w - 8;
      if (lx < 6) lx = x + 10;                 /* flip if it would clip */
      ctx.fillStyle = 'rgba(' + col + ',' + (alpha * (f.hot ? 0.92 : 0.6)).toFixed(3) + ')';
      ctx.fillText(text, lx, y - 9);
    }
  }

  /* Helpers --------------------------------------------------------------- */

  function angleDelta(a, b) {          /* shortest signed distance a - b */
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function crossed(target, from, to) { /* did the sweep pass target? */
    var span = (to - from + Math.PI * 2) % (Math.PI * 2);
    var off  = (target - from + Math.PI * 2) % (Math.PI * 2);
    return off <= span;
  }

  /* Loop ------------------------------------------------------------------ */

  var prevSweep = null;
  var running = false;
  var rafId = null;

  function frame(ts) {
    var now = ts || performance.now();
    var sweep = ((now % PERIOD) / PERIOD) * Math.PI * 2 - Math.PI / 2;

    if (prevSweep !== null) {
      for (var i = 0; i < finds.length; i++) {
        if (crossed(finds[i].a, prevSweep, sweep)) finds[i].hit = now;
      }
    }
    prevSweep = sweep;

    ctx.clearRect(0, 0, W, H);
    drawGrid(sweep);
    drawSweep(sweep);
    drawFinds(now);

    if (running) rafId = requestAnimationFrame(frame);
  }

  function still() {
    /* One composed frame for reduced motion or when the hero is off screen. */
    var sweep = -0.62;
    var now = performance.now();
    for (var i = 0; i < finds.length; i++) {
      finds[i].hit = (i % 3 === 0) ? now - 600 : -1e9;
    }
    ctx.clearRect(0, 0, W, H);
    drawGrid(sweep);
    drawSweep(sweep);
    drawFinds(now);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    prevSweep = null;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* Wiring ---------------------------------------------------------------- */

  measure();
  if (reduceMotion) { still(); } else { start(); }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      if (reduceMotion || !running) still();
    }, 120);
  });

  /* Do not burn frames when the hero is scrolled away or the tab is hidden. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  /* Fonts land after first paint; redraw the static frame once they do. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); if (!running) still(); });
  }
})();
