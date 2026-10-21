/* clickzauber · Nach unten ziehen zum Aktualisieren (seit 20.10.2026)
   Ganz oben auf der Seite nach unten ziehen und loslassen: Die Seite lädt neu, wie man es aus Apps kennt.
   Nur in der App (html.cz-app, Capacitor) und vom Home-Bildschirm (display-mode: standalone). Im normalen Browser macht das der
   Browser selbst, sonst lüde die Seite zweimal. Zum Ausprobieren im Browser: ?ziehen=1 (nur mit Finger, nicht mit der Maus).
   Nicht, wenn ein Feld aktiv ist, ein großes Fenster offen ist (festes Element über 40 % der Höhe), ein innerer Bereich nicht
   ganz oben steht oder ein anderes Skript die Bewegung schon nutzt (Kacheln ordnen, js/cz-kacheln.js). data-kein-ziehen schaltet es
   für ein Element aus. Vor dem Neuladen: window.czZiehenVorher() — false = nicht neu laden, Text = diese Adresse laden
   (Konfigurator: sichert den Entwurf, clickzauber-editor.html).
   Eingebunden in clickzauber-cockpit-live.html, clickzauber-editor.html, clickzauber-plattform.html. */
(function () {
  'use strict';
  if (window.czZiehen || window.top !== window) return;
  window.czZiehen = true;
  var D = document, H = D.documentElement, ZIEL = 64, MAX = 120, T = null, EL = null, BUSY = false;

  function an() {
    if (/[?&]ziehen=1/.test(location.search) || H.classList.contains('cz-app')) return true;
    var C = window.Capacitor;
    if (C && (C.isNativePlatform ? C.isNativePlatform() : C.isNative)) return true;
    if (navigator.standalone === true) return true;
    try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches; } catch (e) { return false; }
  }
  function oben() { return (window.pageYOffset || H.scrollTop || (D.body && D.body.scrollTop) || 0) <= 0; }
  function frei(t) {
    var a = D.activeElement;
    if (a && a !== D.body && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return false;
    var hs = getComputedStyle(H), bs = getComputedStyle(D.body);
    if (hs.overflowY === 'hidden' || bs.overflowY === 'hidden' || bs.position === 'fixed') return false;
    for (var n = t && t.nodeType === 1 ? t : t && t.parentElement; n && n !== D.body && n !== H; n = n.parentElement) {
      if (n.hasAttribute('data-kein-ziehen')) return false;
      if (/^(TEXTAREA|SELECT|VIDEO|CANVAS|IFRAME)$/.test(n.tagName)) return false;
      if (n.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(n.type)) return false;
      var cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2 && n.scrollTop > 0) return false;
      if (cs.position === 'fixed' && n.getBoundingClientRect().height > innerHeight * 0.4) return false;
    }
    return true;
  }

  function bau() {
    if (EL) return EL;
    if (!D.getElementById('cz-ziehen-css')) {
      var s = D.createElement('style'); s.id = 'cz-ziehen-css';
      s.textContent = '#cz-ziehen{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:99980;display:flex;align-items:center;gap:9px;height:42px;padding:0 16px 0 6px;border-radius:999px;background:#fffdf8;color:#1f1d1a;border:1px solid #e4ddcf;box-shadow:0 10px 28px rgba(30,25,15,.18);font:600 14px/1 Figtree,system-ui,-apple-system,sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transform:translate(-50%,-64px);will-change:transform,opacity}'
        + '#cz-ziehen.zur{transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .28s}'
        + '#cz-ziehen .czz-k{width:30px;height:30px;border-radius:50%;background:#efe9dd;color:#2f7d59;display:grid;place-items:center;transition:background .15s,color .15s}'
        + '#cz-ziehen svg{width:17px;height:17px;display:block}'
        + '#cz-ziehen.bereit .czz-k,#cz-ziehen.laed .czz-k{background:#2f7d59;color:#fff}'
        + '#cz-ziehen.laed svg{animation:czZiehenDreh .75s linear infinite}'
        + '@keyframes czZiehenDreh{to{transform:rotate(360deg)}}'
        + '@media (prefers-reduced-motion:reduce){#cz-ziehen.laed svg{animation:none}}';
      D.head.appendChild(s);
    }
    EL = D.createElement('div'); EL.id = 'cz-ziehen'; EL.setAttribute('role', 'status');
    EL.innerHTML = '<span class="czz-k"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></span><span class="czz-t"></span>';
    D.body.appendChild(EL);
    return EL;
  }
  function text(t) { var s = EL.querySelector('.czz-t'); if (s.textContent !== t) s.textContent = t; }
  function tick() {
    try {
      var h = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (h && h.impact) h.impact({ style: 'LIGHT' }).catch(function () {});
      else if (navigator.vibrate) navigator.vibrate(8);
    } catch (e) {}
  }
  function zeig(z) {
    var e = bau(), b = z >= ZIEL;
    e.classList.remove('zur');
    e.style.opacity = String(Math.min(1, z / 36));
    e.style.transform = 'translate(-50%,' + Math.round(z - 64) + 'px)';
    e.querySelector('svg').style.transform = 'rotate(' + Math.round(z * 3.2) + 'deg)';
    if (b !== e.classList.contains('bereit')) { e.classList.toggle('bereit', b); if (b) tick(); }
    text(b ? 'Loslassen zum Aktualisieren' : 'Zum Aktualisieren ziehen');
  }
  function weg() {
    if (!EL) return;
    EL.classList.add('zur'); EL.classList.remove('bereit', 'laed');
    EL.style.opacity = '0'; EL.style.transform = 'translate(-50%,-64px)';
  }
  function laden() {
    BUSY = true;
    var e = bau(), ziel = true;
    e.classList.add('zur', 'laed'); e.classList.remove('bereit');
    e.style.opacity = '1'; e.style.transform = 'translate(-50%,0)'; e.querySelector('svg').style.transform = '';
    text('Wird aktualisiert …');
    try { if (typeof window.czZiehenVorher === 'function') ziel = window.czZiehenVorher(); } catch (x) { ziel = true; }
    if (ziel === false) { text('Bitte zuerst speichern.'); setTimeout(function () { BUSY = false; weg(); }, 1900); return; }
    setTimeout(function () {
      if (typeof ziel === 'string' && ziel && ziel !== location.href) location.replace(ziel); else location.reload();
    }, 220);
  }
  function ende(ok) {
    var t = T; T = null;
    if (!t || !t.an) return;
    if (ok && t.z >= ZIEL) laden(); else weg();
  }

  window.addEventListener('touchstart', function (ev) {
    T = null;
    if (BUSY || ev.touches.length !== 1 || !an() || !oben() || !frei(ev.target)) return;
    T = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, an: false, z: 0 };
  }, { passive: true });
  /* Am Fenster, nicht am Dokument: So laufen die Skripte der Seite zuerst, und defaultPrevented zeigt, ob eins die Bewegung nutzt. */
  window.addEventListener('touchmove', function (ev) {
    if (!T) return;
    if (ev.touches.length !== 1) { ende(false); return; }
    var p = ev.touches[0], dx = p.clientX - T.x, dy = p.clientY - T.y;
    if (!T.an) {
      /* Gleich bei der ersten Bewegung entscheiden: Danach lässt das iPhone das Scrollen nicht mehr aufhalten. */
      if (ev.defaultPrevented || dy <= 0 || Math.abs(dx) > dy + 3 || !oben()) { T = null; return; }
      T.an = true;
    }
    if (ev.cancelable) ev.preventDefault();
    T.z = MAX * (1 - Math.exp(-Math.max(0, dy) / 170));
    zeig(T.z);
  }, { passive: false });
  window.addEventListener('touchend', function () { ende(true); }, { passive: true });
  window.addEventListener('touchcancel', function () { ende(false); }, { passive: true });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { BUSY = false; T = null; weg(); } });
})();
