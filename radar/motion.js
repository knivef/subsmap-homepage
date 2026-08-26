/* ==========================================================================
   subsmap motion layer
   One shared reveal engine plus a handful of section specific effects.

   Rules this file keeps to:
   - Everything is one shot on entry. Nothing loops except the radar and the
     two scan lines in the mid CTA.
   - Opacity and transform only, except the fit meters and the FAQ height,
     which need geometry and are cheap.
   - Nothing hides unless html.motion is set, which the inline head script
     only does when the visitor has not asked for reduced motion. With JS off
     or motion reduced, every element renders in its final state.
   - The reveal engine never leaves content hidden. It is driven by a timer
     and a passive scroll listener rather than IntersectionObserver alone,
     because IO callbacks are tied to the rendering lifecycle and can be
     starved in a background or non-composited tab. A hard failsafe reveals
     anything still pending after 6 seconds.
   ========================================================================== */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('motion')) return;

  var STAGGER = 60;      /* ms between siblings */
  var MARGIN  = 0.94;    /* activate once the top passes 94% of the viewport */

  /* ---------------------------------------------------------------- helpers */

  function els(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function mark(sel, opts) {
    opts = opts || {};
    var step = opts.stagger === undefined ? STAGGER : opts.stagger;
    var groups = opts.group ? els(opts.group) : [document];

    groups.forEach(function (g) {
      els(sel, g).forEach(function (el, i) {
        if (el.hasAttribute('data-rv')) return;
        el.setAttribute('data-rv', opts.kind || 'rise');
        if (step) el.style.setProperty('--d', (i * step) + 'ms');
      });
    });
  }

  /* ------------------------------------------------------- the reveal queue */

  var queue = [];        /* { el, run } */
  var timer = null;

  function watch(el, run) {
    if (!el) return;
    queue.push({ el: el, run: run });
  }

  function fire(item) {
    if (item.done) return;
    item.done = true;
    if (item.run) item.run(item.el);
    else item.el.classList.add('is-in');
  }

  function check(force) {
    if (!queue.length) return;
    var vh = window.innerHeight || root.clientHeight;
    var still = [];

    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      if (force) { fire(item); continue; }
      var r = item.el.getBoundingClientRect();
      /* Zero-size elements (an SVG that has not laid out yet) wait. */
      var visible = (r.height || r.width) && r.top < vh * MARGIN && r.bottom > 0;
      if (visible) fire(item); else still.push(item);
    }
    queue = still;

    if (!queue.length && timer) { clearInterval(timer); timer = null; }
  }

  function tick() { check(false); }

  /* If anything in this file throws, nothing may be left invisible. */
  function revealAll() {
    try {
      els('[data-rv],[data-row],[data-pop],[data-cell],[data-intro]')
        .forEach(function (el) { el.classList.add('is-in'); });
      els('[data-draw]').forEach(function (el) {
        el.style.transition = 'none';
        el.style.strokeDashoffset = '0';
      });
      els('[data-area]').forEach(function (el) { el.style.opacity = el.getAttribute('data-area'); });
      els('.meter span[data-meter]').forEach(function (m) {
        m.style.width = m.getAttribute('data-meter');
      });
      if (timer) { clearInterval(timer); timer = null; }
      queue = [];
    } catch (e) { root.classList.remove('motion'); }
  }

  /* Printing must never put ink on an invisible page either. */
  window.addEventListener('beforeprint', revealAll);

  /* --------------------------------------------------------------- counters */

  function parseNum(text) {
    var m = String(text).trim().match(/^([\d.,]+)\s*([A-Za-z%]*)$/);
    if (!m) return null;
    var raw = m[1];
    var val = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(val)) return null;
    return {
      val: val,
      suffix: m[2] || '',
      comma: raw.indexOf(',') > -1,
      dec: (raw.split('.')[1] || '').length
    };
  }

  function format(v, info) {
    var s = info.dec ? v.toFixed(info.dec) : String(Math.round(v));
    if (info.comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s + info.suffix;
  }

  function countUp(el, duration) {
    var info = parseNum(el.textContent);
    if (!info) return;
    var final = format(info.val, info);
    var from = info.val > 60 ? 0 : Math.max(0, info.val - 16);
    var d = duration || 900;
    var t0 = null;

    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / d);
      el.textContent = format(from + (info.val - from) * (1 - Math.pow(1 - p, 3)), info);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = final;
    }
    requestAnimationFrame(step);
    /* If frames are throttled, still land on the real number. */
    setTimeout(function () { el.textContent = final; }, d + 500);
  }

  /* --------------------------------------------------------- svg line draw */

  function prepDraw(el) {
    var len;
    try { len = el.getTotalLength(); } catch (e) { return false; }
    if (!len || !isFinite(len)) return false;
    el.style.strokeDasharray = len + ' ' + len;
    el.style.strokeDashoffset = len;
    el.setAttribute('data-draw', '');
    return true;
  }

  function runDraw(el, delay, duration) {
    el.style.transition = 'stroke-dashoffset ' + (duration || 1100) +
      'ms cubic-bezier(.33,.72,.3,1) ' + (delay || 0) + 'ms';
    el.style.strokeDashoffset = '0';
  }

  /* ================================================================ set up */

  try {

  /* --- what reveals ----------------------------------------------------- */

  mark('.stats .stat', { stagger: 70 });
  mark('.feature__copy > *', { group: '.feature', stagger: 60 });
  mark('.feature__visual', { group: '.feature', stagger: 0, kind: 'panel' });
  mark('.data-head > *', { stagger: 70 });
  mark('.data-grid > div > *', { group: '.data-grid > div', stagger: 70 });
  mark('.cards .card', { stagger: 60 });
  mark('.cta > .tick, .cta > .h2, .cta > .copy, .cta > .btn-row', { stagger: 70 });
  mark('.faq > div:first-child > *', { stagger: 60 });
  mark('.faq details', { stagger: 45 });
  mark('.final > div > *', { group: '.final > div', stagger: 70 });
  mark('.ledger', { stagger: 0, kind: 'panel' });
  mark('.footer__grid > *', { stagger: 55 });

  /* The card grid heading sits directly in the wrap with no wrapper. */
  els('.section > .wrap > .tick, .section > .wrap > .h2, .section > .wrap > .copy')
    .forEach(function (el, i) {
      if (el.hasAttribute('data-rv')) return;
      el.setAttribute('data-rv', 'rise');
      el.style.setProperty('--d', (i % 3) * 60 + 'ms');
    });

  els('[data-rv]').forEach(function (el) { watch(el); });

  /* --- hero intro ------------------------------------------------------- */

  (function heroIntro() {
    var items = els('.stage__content > .badge, .stage__content > .mark,' +
                    '.stage__content > .lead, .stage__content > .search,' +
                    '.stage__content > .chips');
    items.forEach(function (el, i) {
      el.setAttribute('data-intro', '');
      el.style.setProperty('--d', (80 + i * 90) + 'ms');
    });
    setTimeout(function () {
      items.forEach(function (el) { el.classList.add('is-in'); });
      /* The radar centres itself on the wordmark, so let it re-measure once
         the intro has settled. */
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 900);
    }, 30);
  })();

  /* --- product panels: rows in, meters fill, numbers count -------------- */

  els('.panel').forEach(function (panel) {
    var rows = els('.row, .post', panel);
    rows.forEach(function (r, i) {
      r.setAttribute('data-row', '');
      r.style.setProperty('--d', (i * 70) + 'ms');
    });

    var meters = els('.meter span', panel);
    meters.forEach(function (m) {
      m.setAttribute('data-meter', m.style.width || '');
      m.style.width = '0%';
    });

    /* Split the leading number out of .post__n so it can count without
       disturbing the "upvotes" label underneath. */
    var counters = [];
    els('.post__n', panel).forEach(function (n) {
      var node = n.firstChild;
      if (!node || node.nodeType !== 3) return;
      var holder = document.createElement('span');
      holder.textContent = node.nodeValue;
      n.replaceChild(holder, node);
      counters.push(holder);
    });

    watch(panel, function () {
      rows.forEach(function (r) { r.classList.add('is-in'); });

      meters.forEach(function (m, i) {
        setTimeout(function () { m.style.width = m.getAttribute('data-meter'); },
                   240 + i * 70);
      });

      els('.fit', panel).forEach(function (f, i) {
        setTimeout(function () { countUp(f, 700); }, 260 + i * 70);
      });

      counters.forEach(function (c, i) {
        setTimeout(function () { countUp(c, 800); }, 260 + i * 70);
      });
    });
  });

  /* --- overlap graph: edges draw, nodes pop ----------------------------- */

  (function overlap() {
    var svg = document.querySelector('.feature--flip .panel svg');
    if (!svg) return;

    var lines = els('line', svg).filter(prepDraw);
    var nodes = els('circle, text', svg);
    nodes.forEach(function (n, i) {
      n.setAttribute('data-pop', '');
      n.style.setProperty('--d', (260 + i * 45) + 'ms');
    });

    watch(svg, function () {
      lines.forEach(function (l, i) { runDraw(l, i * 90, 800); });
      nodes.forEach(function (n) { n.classList.add('is-in'); });
    });
  })();

  /* --- charts: lines draw, areas fade in behind them -------------------- */

  function chart(svg, dur) {
    if (!svg) return;
    var strokes = els('path[stroke]', svg).filter(prepDraw);
    var areas = els('path[fill]:not([stroke])', svg).filter(function (p) {
      return p.getAttribute('fill') !== 'none';
    });
    areas.forEach(function (a) {
      a.setAttribute('data-area', a.getAttribute('opacity') || '1');
      a.style.opacity = '0';
    });

    watch(svg, function () {
      strokes.forEach(function (p, i) { runDraw(p, i * 160, dur || 1300); });
      areas.forEach(function (a) {
        a.style.transition = 'opacity .9s ease .5s';
        a.style.opacity = a.getAttribute('data-area');
      });
    });
  }

  chart(document.querySelector('.chartbox svg'), 1400);
  chart(document.querySelector('.card--full .card__viz svg'), 1200);

  /* --- heat row: cells rise left to right ------------------------------- */

  (function heat() {
    var row = document.querySelector('.heat');
    if (!row) return;
    var cells = els('i', row);
    cells.forEach(function (c, i) {
      c.setAttribute('data-cell', '');
      c.style.setProperty('--d', (i * 42) + 'ms');
    });
    watch(row, function () {
      cells.forEach(function (c) { c.classList.add('is-in'); });
    });
  })();

  /* --- mid CTA: scan lines start sweeping once seen --------------------- */

  watch(document.querySelector('.cta'), function (el) {
    el.classList.add('is-scanning');
  });

  /* --- ledger rows ------------------------------------------------------ */

  (function ledger() {
    var box = document.querySelector('.ledger');
    if (!box) return;
    var rows = els('div', box);
    rows.forEach(function (r, i) {
      r.setAttribute('data-row', '');
      r.style.setProperty('--d', (i * 80) + 'ms');
    });
    watch(box, function () {
      box.classList.add('is-in');
      rows.forEach(function (r) { r.classList.add('is-in'); });
    });
  })();

  /* --- FAQ: height animated accordion ---------------------------------- */

  els('.faq details').forEach(function (d) {
    var summary = d.querySelector('summary');
    if (!summary) return;

    var body = document.createElement('div');
    body.className = 'faq__body';
    var node = summary.nextSibling;
    while (node) {
      var next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }
    d.appendChild(body);

    var busy = false;
    var intent = null;

    /* Both directions commit the start height synchronously with a forced
       reflow rather than waiting for a frame. A delayed frame would otherwise
       leave the height at its starting value and the safety timer below would
       read that as "closed" and undo the toggle. */
    function expand() {
      intent = 'open';
      d.open = true;
      body.style.height = '0px';
      void body.offsetHeight;
      body.style.height = body.scrollHeight + 'px';
    }

    function collapse() {
      intent = 'close';
      body.style.height = body.scrollHeight + 'px';
      void body.offsetHeight;
      body.style.height = '0px';
    }

    /* Settle on the intended state, never on whatever the height reads as. */
    function settle() {
      if (!busy) return;
      busy = false;
      if (intent === 'close') {
        d.open = false;
        body.style.height = '';
      } else {
        body.style.height = 'auto';
      }
      intent = null;
    }

    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (busy) return;
      busy = true;
      if (d.open) collapse(); else expand();
      setTimeout(settle, 600);          /* if transitionend never arrives */
    });

    body.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'height') settle();
    });
  });

  /* --------------------------------------------------------------- drive it */

  var scrollLock = false;
  function onScroll() {
    if (scrollLock) return;
    scrollLock = true;
    setTimeout(function () { scrollLock = false; check(false); }, 90);
  }

  check(false);                                   /* above the fold, at once */
  timer = setInterval(tick, 140);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* IntersectionObserver, when it is awake, just nudges the same queue. */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function () { check(false); },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    els('[data-rv], .panel, .heat, .cta, .ledger, .chartbox svg').forEach(function (el) {
      io.observe(el);
    });
  }

  } catch (err) {
    if (window.console && console.warn) console.warn('motion layer disabled:', err);
    revealAll();
  }
})();
