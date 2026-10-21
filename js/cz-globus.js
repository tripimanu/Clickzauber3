/* cz-globus.js — schwebender Globus zum Wechseln der Cockpit-Sprache.
   Verschiebbar. An den linken oder rechten Rand geschoben, wird er zu einer schmalen Lasche mit Pfeil.
   Antippen der Lasche holt den Globus zurück. Position pro Gerät in localStorage „cz_globus“. */
(function () {
  'use strict';
  var KEY = 'cz_globus', RAND = 26, W = 48;
  /* data-ohne-zahnrad am Script-Tag: nur der Globus, ohne Einstellungs-Knopf (Anmeldung, Konfigurator). */
  var OHNE_ZR = !!(document.currentScript && document.currentScript.hasAttribute('data-ohne-zahnrad'));
  /* data-oben="76": Startposition unter einer Kopfleiste, damit der Globus keine Knöpfe verdeckt (Konfigurator). */
  var OBEN = document.currentScript ? parseInt(document.currentScript.getAttribute('data-oben') || '0', 10) || 0 : 0;
  var NAMEN = { de: 'Deutsch', sq: 'Shqip', en: 'English', fr: 'Français', it: 'Italiano', es: 'Español', tr: 'Türkçe' };
  var pos = null;
  try { pos = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  var GLOBUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
  var b, menu, zr;
  var ZAHN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  function vw() { return document.documentElement.clientWidth; }
  function vh() { return window.innerHeight; }
  function klemm(v, a, z) { return Math.max(a, Math.min(z, v)); }
  function merken() { try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch (e) {} }
  function standard() { return { x: vw() - W - 14, y: Math.max(OBEN, vw() <= 760 ? 64 : 18), weg: '' }; }
  /* Platz für die Missionsbox oben rechts (js/cz-missionen.js): Globus und Zahnrad rücken darunter. */
  var PLATZ = 0, REIHE = 0;
  window.czGlobusPlatz = function (px) { px = Math.max(0, Math.round(px || 0)); if (px === PLATZ) return; PLATZ = px; if (b) setzen(); };
  /* Reihe oben rechts: Globus, Zahnrad, dann die Punkte (js/cz-missionen.js). rechts = Abstand der Reihe vom rechten Rand. Fest, nicht verschiebbar. */
  window.czGlobusReihe = function (rechts) { rechts = Math.max(0, Math.round(rechts || 0)); if (rechts === REIHE) return; REIHE = rechts; if (b) { menuZu(); setzen(); } };
  function setzen() {
    if (!pos) pos = standard();
    if (REIHE) {
      b.classList.remove('weg', 'li');
      /* Reihe von rechts: Live-Schalter (js/cz-live.js), Sprache, Zahnrad. Auf dem Handy sitzt sie in der Kopfleiste. */
      var kl = vw() <= 760, wk = kl ? 42 : W, gx = vw() - REIHE - wk, gy = kl ? 10 : 13, sp = window.czSprache ? window.czSprache.get() : 'de';
      b.classList.toggle('klein', kl); if (zr) zr.classList.toggle('klein', kl);
      b.style.left = gx + 'px'; b.style.top = gy + 'px';
      b.innerHTML = GLOBUS + '<i>' + sp.toUpperCase() + '</i>'; b.setAttribute('aria-label', 'Sprache wählen');
      if (zr) { zr.hidden = false; zr.style.left = (gx - wk - (kl ? 8 : 10)) + 'px'; zr.style.top = gy + 'px'; }
      return;
    }
    b.classList.remove('klein'); if (zr) zr.classList.remove('klein');
    b.classList.toggle('weg', !!pos.weg);
    b.classList.toggle('li', pos.weg === 'l');
    var y = klemm(pos.y, 8, vh() - W - 90);
    if (PLATZ && pos.x >= vw() - W - 40) y = Math.max(y, 18 + PLATZ);
    if (pos.weg) {
      b.style.left = pos.weg === 'l' ? '0px' : (vw() - 22) + 'px';
      b.style.top = y + 'px';
      b.innerHTML = '<span class="gl-pf">' + (pos.weg === 'l' ? '›' : '‹') + '</span>';
      b.setAttribute('aria-label', 'Sprachwahl einblenden');
    } else {
      b.style.left = klemm(pos.x, 8, vw() - W - 8) + 'px';
      b.style.top = y + 'px';
      var l = window.czSprache ? window.czSprache.get() : 'de';
      b.innerHTML = GLOBUS + '<i>' + l.toUpperCase() + '</i>';
      b.setAttribute('aria-label', 'Sprache wählen');
    }
    if (zr) { zr.hidden = !!pos.weg; zr.style.left = b.style.left; zr.style.top = (parseFloat(b.style.top) + W + 10) + 'px'; }
  }
  function menuZu() { if (menu) menu.hidden = true; }
  function menuAuf() {
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'gl-menu'; menu.setAttribute('data-no-tr', ''); menu.hidden = true;
      document.body.appendChild(menu);
    }
    var l = window.czSprache ? window.czSprache.get() : 'de';
    menu.innerHTML = Object.keys(NAMEN).map(function (c) {
      return '<button lang="' + c + '" data-gl="' + c + '"' + (c === l ? ' class="on"' : '') + '>' + NAMEN[c] + '</button>';
    }).join('');
    menu.hidden = false;
    var r = b.getBoundingClientRect(), mw = 170, mh = menu.offsetHeight;
    menu.style.left = klemm(r.right - mw, 8, vw() - mw - 8) + 'px';
    menu.style.top = (r.bottom + 8 + mh > vh() - 80 ? Math.max(8, r.top - mh - 8) : r.bottom + 8) + 'px';
  }
  function bauen() {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'gl-btn'; b.setAttribute('data-no-tr', '');
    document.body.appendChild(b);
    if (!OHNE_ZR) {
      zr = document.createElement('button');
      zr.type = 'button'; zr.className = 'gl-btn gl-zr'; zr.setAttribute('aria-label', 'Einstellungen'); zr.innerHTML = ZAHN;
      zr.addEventListener('click', function () { menuZu(); if (typeof window.show === 'function') window.show('settings'); });
      document.body.appendChild(zr);
    }
    setzen();
    var start = null;
    b.addEventListener('pointerdown', function (ev) {
      start = { px: ev.clientX, py: ev.clientY, x: b.offsetLeft, y: b.offsetTop, zug: false };
      b.setPointerCapture(ev.pointerId);
    });
    b.addEventListener('pointermove', function (ev) {
      if (!start || REIHE) return;
      var dx = ev.clientX - start.px, dy = ev.clientY - start.py;
      if (!start.zug && Math.abs(dx) + Math.abs(dy) < 7) return;
      if (!start.zug) { start.zug = true; menuZu(); if (pos.weg) { pos.weg = ''; setzen(); start.x = b.offsetLeft - (pos.weg === '' && b.classList.contains('li') ? 0 : 0); } b.classList.add('zieht'); }
      b.style.left = klemm(start.x + dx, -10, vw() - W + 10) + 'px';
      b.style.top = klemm(start.y + dy, 8, vh() - W - 90) + 'px';
      if (zr) { zr.hidden = true; }
    });
    function los(ev) {
      if (!start) return;
      var s = start; start = null; b.classList.remove('zieht');
      if (!s.zug) {
        if (pos.weg && !REIHE) { pos.weg = ''; pos.x = pos.x < vw() / 2 ? 14 : vw() - W - 14; merken(); setzen(); return; }
        if (menu && !menu.hidden) menuZu(); else menuAuf();
        return;
      }
      var x = b.offsetLeft, y = b.offsetTop;
      pos = { x: x, y: y, weg: x < RAND - 10 ? 'l' : x > vw() - W - RAND + 10 ? 'r' : '' };
      merken(); setzen();
    }
    b.addEventListener('pointerup', los);
    b.addEventListener('pointercancel', los);
    document.addEventListener('click', function (ev) {
      var x = ev.target.closest && ev.target.closest('[data-gl]');
      if (x) { if (window.czSprache) window.czSprache.set(x.getAttribute('data-gl')); menuZu(); setTimeout(setzen, 300); return; }
      if (menu && !menu.hidden && !ev.target.closest('.gl-menu') && !ev.target.closest('.gl-btn')) menuZu();
    });
    window.addEventListener('resize', function () { setzen(); menuZu(); });
    document.addEventListener('cz:sprache', function () { setzen(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') menuZu(); });
  }
  var css = document.createElement('style');
  css.textContent = [
    '.gl-btn{position:fixed;z-index:70;width:48px;height:48px;border-radius:50%;border:1px solid var(--gl-line,var(--line-2,rgba(33,29,22,.16)));background:var(--gl-bg,color-mix(in srgb,var(--panel,#fffdf8) 92%,transparent));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:var(--gl-ink,var(--ink,#27241d));box-shadow:0 8px 24px rgba(0,0,0,.16);display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;padding:0;transition:border-radius .2s,width .2s,box-shadow .2s}',
    '.gl-btn svg{width:22px;height:22px}.gl-btn i{position:absolute;right:-4px;bottom:-3px;font-style:normal;font-family:var(--fm,ui-monospace,monospace);font-size:9.5px;font-weight:600;background:var(--gl-accent,var(--accent,#2f7d59));color:var(--gl-on-accent,var(--on-accent,#fff));border-radius:999px;padding:1px 5px;line-height:1.4}',
    '.gl-zr{cursor:pointer;touch-action:auto}.gl-zr[hidden]{display:none}',
    '.gl-btn.klein{width:42px;height:42px}',
    '.gl-btn.zieht{cursor:grabbing;box-shadow:0 14px 34px rgba(0,0,0,.24);transition:none}',
    '.gl-btn.weg{width:22px;height:64px;border-radius:14px 0 0 14px;border-right:none;box-shadow:0 6px 18px rgba(0,0,0,.14)}',
    '.gl-btn.weg.li{border-radius:0 14px 14px 0;border-left:none;border-right:1px solid var(--gl-line,var(--line-2,rgba(33,29,22,.16)))}',
    '.gl-pf{font-size:26px;line-height:1;color:var(--gl-ink,var(--ink-2,#615c50));margin-top:-3px}',
    '.gl-menu{position:fixed;z-index:71;width:170px;background:var(--gl-menu,var(--panel,#fff));border:1px solid var(--gl-line,var(--line-2,rgba(33,29,22,.16)));border-radius:14px;box-shadow:0 18px 44px rgba(0,0,0,.2);padding:6px;display:flex;flex-direction:column}',
    '.gl-menu[hidden]{display:none}',
    '.gl-menu button{font:inherit;font-size:14px;text-align:left;background:none;border:none;color:var(--gl-ink,var(--ink,#27241d));padding:10px 12px;border-radius:9px;cursor:pointer;min-height:42px}',
    '.gl-menu button:hover{background:var(--gl-hover,var(--panel-2,rgba(128,120,100,.12)))}.gl-menu button.on{color:var(--gl-accent,var(--accent,#2f7d59));font-weight:600}'
  ].join('\n');
  document.head.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bauen); else bauen();
})();
