/* ==========================================================================
   Version switcher
   Injects a fixed pill with the three builds, marks the current one, supports
   1 / 2 / 3 to jump and H to hide. Self contained: no globals beyond one
   IIFE, no dependency on anything in the host page, and it appends its own
   stylesheet link so each page only needs this one script tag.
   ========================================================================== */
(function () {
  var VERSIONS = [
    { slug: 'cartographic', label: 'Cartographic', key: '1' },
    { slug: 'editorial',    label: 'Editorial',    key: '2' },
    { slug: 'radar',        label: 'Radar',        key: '3' }
  ];

  var STORE = 'subsmap-switcher-hidden';

  /* Resolve paths relative to the site root, so this works at any depth and
     on both the Vercel deploy and a local static server. */
  function rootPath() {
    var parts = location.pathname.split('/').filter(Boolean);
    /* Drop a trailing file name, then drop the version folder. */
    if (parts.length && parts[parts.length - 1].indexOf('.') > -1) parts.pop();
    if (parts.length) parts.pop();
    return '/' + (parts.length ? parts.join('/') + '/' : '');
  }

  function currentSlug() {
    var m = location.pathname.match(/\/(cartographic|editorial|radar)(\/|$)/);
    return m ? m[1] : null;
  }

  function build() {
    var base = rootPath();
    var here = currentSlug();

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'switcher.css';
    document.head.appendChild(css);

    var bar = document.createElement('nav');
    bar.className = 'vsw';
    bar.setAttribute('aria-label', 'Design version');

    var label = document.createElement('span');
    label.className = 'vsw__label';
    label.textContent = 'Version';
    bar.appendChild(label);

    VERSIONS.forEach(function (v) {
      var a = document.createElement('a');
      a.href = base + v.slug + '/';
      a.textContent = v.label;
      if (v.slug === here) a.setAttribute('aria-current', 'page');
      var kbd = document.createElement('kbd');
      kbd.textContent = v.key;
      a.appendChild(kbd);
      bar.appendChild(a);
    });

    var hide = document.createElement('button');
    hide.className = 'vsw__hide';
    hide.type = 'button';
    hide.title = 'Hide switcher (H)';
    hide.setAttribute('aria-label', 'Hide version switcher');
    hide.innerHTML = '&times;';
    bar.appendChild(hide);

    var peek = document.createElement('button');
    peek.className = 'vsw-peek';
    peek.type = 'button';
    peek.textContent = 'Versions';
    peek.setAttribute('aria-label', 'Show version switcher');

    document.body.appendChild(bar);
    document.body.appendChild(peek);

    function setHidden(on) {
      bar.classList.toggle('is-hidden', on);
      peek.classList.toggle('is-shown', on);
      try { on ? localStorage.setItem(STORE, '1') : localStorage.removeItem(STORE); } catch (e) {}
    }

    hide.addEventListener('click', function () { setHidden(true); });
    peek.addEventListener('click', function () { setHidden(false); });

    try { if (localStorage.getItem(STORE) === '1') setHidden(true); } catch (e) {}

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.key === 'h' || e.key === 'H') {
        setHidden(!bar.classList.contains('is-hidden'));
        return;
      }
      for (var i = 0; i < VERSIONS.length; i++) {
        if (e.key === VERSIONS[i].key) {
          if (VERSIONS[i].slug !== here) location.href = base + VERSIONS[i].slug + '/';
          return;
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
