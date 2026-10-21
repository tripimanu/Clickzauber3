/* clickzauber — Kopf und Fuß im Cockpit (seit 15.10.2026, Manuels Wunsch).
   Oben auf der Startseite: das Logo des Betriebs aus seinem Formular (logo oder theme.logo), ohne Logo nur „Live“.
   Ganz unten: ein Spruch zur Motivation, wechselt alle zehn Sekunden (gemischt, keiner doppelt, bis alle dran waren).
   Woher das Logo kommt: echtes Konto und Betreiber-Ansicht über /api/config (nur live geschaltete Formulare),
   sonst der zuletzt gemerkte Stand oder der Konfigurator-Stand dieses Geräts (cz_widgets).
   Beispiel-Cockpit mit probe=Betrieb: aus kunden/akten.js (formular.logo, sonst logo).
   Helle Logos aus dunklen Formularen bekommen einen dunklen Grund, wie auf der Seite „Ihr Termin“ (lib/termine.js betriebLogo).
   Aufruf: clickzauber-cockpit-live.html buildWidgetSelect() und Formular-Auswahl → czKopfLogo(widget). */
(function () {
  'use strict';
  if (window.czKopfLogo) return;
  var Q = location.search, DEMO = /[?&](demo|beispiel|probe)=/.test(Q);
  var DUNKEL = ['glass-sunset', 'glass-blue', 'glass-garden', 'glass-gold', 'glass-blush', 'glass-lake', 'glass-minimal', 'dunkel-minimal', 'concierge', 'terminal', 'glass'];
  var KEY = 'cz_kopf_logo';
  function $(i) { return document.getElementById(i); }

  /* ── Logo ── */
  function gueltig(u) {
    u = String(u || '').trim();
    if (/^https:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(u)) return u;
    if (/^\/?[\w-]+(\/[\w.%-]+)+$/.test(u) && u.indexOf('..') < 0) return u.replace(/^\/+/, '');
    return '';
  }
  function dunkleFarbe(h) {
    var m = String(h || '').match(/^#?([0-9a-f]{6})$/i); if (!m) return '';
    var n = parseInt(m[1], 16);
    return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 140 ? '#' + m[1] : '';
  }
  function grundVon(c) {
    c = c || {}; var th = c.theme || {}, ei = th.eigen || c.eigen || null;
    if (ei) return dunkleFarbe(ei.flaeche) || (ei.bild ? '#1c1a16' : '');
    return DUNKEL.indexOf(String(th.skin || c.skin || '')) >= 0 ? '#1c1a16' : '';
  }
  function logoVon(c) { c = c || {}; return gueltig(c.logo || (c.theme || {}).logo); }
  function firma() { try { return (typeof user === 'object' && user && user.firma) || ''; } catch (e) { return ''; } }
  /* Vorschau außerhalb von clickzauber.de: relative Bilder brauchen dort das Zeichen t= aus der eigenen Adresse (wie mit() im Cockpit für Skripte). */
  var TQ = location.search.match(/[?&]t=([^&#]+)/);
  function vs(u) {
    if (!TQ || /(^|\.)clickzauber\.de$/.test(location.hostname) || /^(https?:|data:)/i.test(u) || /[?&]t=/.test(u)) return u;
    return u + (u.indexOf('?') < 0 ? '?' : '&') + 't=' + TQ[1];
  }
  function zeigen(u, grund, name) {
    var box = $('kopf-logo'), img = $('kopf-logo-img'), live = $('kopf-live');
    if (!box || !img) return;
    function ohne() { box.hidden = true; if (live) live.hidden = false; }
    if (!u) { ohne(); return; }
    u = vs(u);
    img.onload = function () { box.hidden = false; if (live) live.hidden = true; };
    img.onerror = ohne;
    box.classList.toggle('dunkel', !!grund);
    box.style.background = grund || '';
    img.alt = 'Logo ' + (name || firma() || '');
    if (img.getAttribute('src') !== u) img.src = u;
    else if (img.complete && img.naturalWidth) img.onload();
  }
  function gemerkt() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function merken(slug, u, g) {
    var m = gemerkt();
    if (u && u.length > 150000) delete m[slug]; else m[slug] = { u: u || '', g: g || '' };
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
  }
  function lokal(slug) {
    try {
      var w = (JSON.parse(localStorage.getItem('cz_widgets') || '[]') || []).filter(function (x) { return x && x.id === slug; })[0];
      if (w && w.config) return { u: logoVon(w.config), g: grundVon(w.config) };
    } catch (e) {}
    return { u: '', g: '' };
  }
  function akten(fertig) {
    if (window.CZ_AKTEN) { fertig(); return; }
    /* Mit leer=1 lädt das Cockpit kunden/akten.js selbst (Leistungen und Arbeitstage), sonst laden wir sie hier. */
    if (!window._czAkten && !window._czAktenKopf && !/[?&]leer=1/.test(Q)) {
      window._czAktenKopf = 1;
      var s = document.createElement('script'); s.src = 'kunden/akten.js'; document.head.appendChild(s);
    }
    var bis = Date.now() + 6000;
    (function warte() { if (window.CZ_AKTEN || Date.now() > bis) fertig(); else setTimeout(warte, 150); })();
  }
  function demoLogo() {
    var p = '';
    try { p = (new URLSearchParams(Q).get('probe') || '').trim(); } catch (e) {}
    if (!p) { zeigen(''); return; }
    akten(function () {
      var n = p.toLowerCase();
      var a = (window.CZ_AKTEN || []).filter(function (x) { return String(x.firma || '').trim().toLowerCase() === n; })[0];
      if (!a) { zeigen(''); return; }
      var f = a.formular || {}, fl = gueltig(f.logo);
      zeigen(fl || gueltig(a.logo), fl ? grundVon(f) : (a.logo_grund || ''), a.firma);
    });
  }
  var NR = 0;
  window.czKopfLogo = function (slug) {
    if (DEMO) { demoLogo(); return; }
    slug = String(slug || ''); var nr = ++NR;
    if (!slug) { zeigen(''); return; }
    var alt = gemerkt()[slug];
    if (alt) zeigen(alt.u, alt.g);
    var api = (typeof API === 'string' && API) || 'https://clickzauber-api.vercel.app/api';
    function sonst() { if (nr !== NR || alt) return; var l = lokal(slug); zeigen(l.u, l.g); }
    fetch(api + '/config?widget=' + encodeURIComponent(slug))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (nr !== NR) return;
        /* Nicht live, pausiert oder ohne Tarif: dann bleibt, was gemerkt ist */
        if (!j || j.pausiert || j.error) { sonst(); return; }
        var u = logoVon(j), g = grundVon(j);
        merken(slug, u, g); zeigen(u, g);
      }, sonst);
  };

  /* ── Sprüche ── */
  var SP = [
    'Jede Anfrage ist ein Mensch, der sich für Sie entschieden hat.',
    'Wer heute schnell antwortet, hat morgen den Termin.',
    'Gute Arbeit spricht sich herum. Ihre auch.',
    'Ein voller Kalender beginnt mit einer einzigen Anfrage.',
    'Stammkunden entstehen aus vielen kleinen guten Momenten.',
    'Sie müssen nicht alles heute schaffen. Nur das Nächste.',
    'Ordnung im Kalender schafft Ruhe im Kopf.',
    'Zufriedene Kunden sind die beste Werbung, die es gibt.',
    'Was Sie heute gut machen, empfiehlt Sie morgen.',
    'Ein freundliches Wort kostet nichts und bringt oft den nächsten Kunden.',
    'Erfolg ist die Summe gut gemachter Tage.',
    'Jeder Profi hat einmal mit dem ersten Kunden angefangen.',
    'Wer zuhört, versteht, was der Kunde wirklich will.',
    'Pausen gehören zur Arbeit. Gönnen Sie sich eine.',
    'Ein Nein heute schafft Platz für ein Ja morgen.',
    'Kleine Schritte jeden Tag bringen Sie weiter als ein großer irgendwann.',
    'Ihr Können ist der Grund, warum Kunden wiederkommen.',
    'Heute ist ein guter Tag für gute Arbeit.',
    'Vertrauen wächst mit jedem gehaltenen Versprechen.',
    'Wer sich Zeit für Kunden nimmt, bekommt Treue zurück.',
    'Ihr Formular arbeitet auch dann, wenn Sie schlafen.',
    'Klare Abläufe sparen Zeit, für Sie und für Ihre Kunden.',
    'Feierabend ist auch ein Erfolg.',
    'Mut wächst beim Machen.',
    'Ein gutes Gefühl beim Kunden ist mehr wert als jeder Rabatt.',
    'Der erste Eindruck zählt. Der letzte bleibt.',
    'Bleiben Sie dran. Viele hören kurz vor dem Ziel auf.',
    'Jeder zufriedene Kunde bringt den nächsten mit.',
    'Ein Betrieb wächst mit den Menschen, die ihm vertrauen.',
    'Sie haben angefangen. Jetzt ziehen Sie es durch.'
  ];
  function sprueche() {
    var el = $('cz-spruch'); if (!el) return;
    var reihe = [], letzter = '';
    function naechster() {
      if (!reihe.length) {
        reihe = SP.slice();
        for (var i = reihe.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = reihe[i]; reihe[i] = reihe[j]; reihe[j] = t; }
        if (reihe[0] === letzter) reihe.push(reihe.shift());
      }
      return (letzter = reihe.shift());
    }
    el.textContent = naechster();
    var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    setInterval(function () {
      if (document.hidden) return;
      var s = naechster();
      if (ruhig) { el.textContent = s; return; }
      el.classList.add('weg');
      setTimeout(function () { el.textContent = s; el.classList.remove('weg'); }, 500);
    }, 10000);
  }

  function start() {
    sprueche();
    if (DEMO) { demoLogo(); return; }
    try { if (typeof widget === 'string' && widget) window.czKopfLogo(widget); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
