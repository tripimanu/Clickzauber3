/* clickzauber Cockpit · neue Gestaltung (seit 17.10.2026). Legt sich über clickzauber-cockpit-live.html, die Funktionen bleiben dieselben.
   Version 1.0 (vorher) liegt in NICHT-HOCHLADEN/archiv/cockpit-version-1.0/.
   Leiste unten, Kalender-Kopf, Missionen still, Kacheln lange drücken (js/cz-kacheln.js),
   Reihe Liste | Tagesplan | Zeitraum | Abzeichen, Einstellungen in Gruppen (Rechtliches, Funktionen …),
   nur Lese- und Dunkelmodus, ein „Kalender verbinden“, Formular-Reiter (Vorschau nur im Beispiel-Cockpit).
   Offen: Konfigurator (erste Seite in Einzelseiten, Übersicht aller Seiten). */
(function () {
  'use strict';
  var d = document, de = d.documentElement; de.classList.add('c3');
  function $(id) { return d.getElementById(id); }
  function art() { var c = d.body.classList; return c.contains('art-termin') ? 'termin' : c.contains('art-auftrag') ? 'auftrag' : 'anfrage'; }
  function reiter(r, sub) {
    if (r === 'stamm') { window.show && show('stammkunden'); return; }
    window.show && show('leads');
    if (sub === 'offen') { var b = d.querySelector('#l-chips [data-f="offen"]'); if (b) b.click(); }
  }
  window.CZ2 = window.CZ2 || { art: art, reiter: reiter };
  function lg(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function hinweis(t) {
    var x = $('c3-hin'); if (!x) { x = d.createElement('div'); x.id = 'c3-hin'; x.setAttribute('role', 'status'); d.body.appendChild(x); }
    x.textContent = t; x.classList.add('an'); clearTimeout(x._t); x._t = setTimeout(function () { x.classList.remove('an'); }, 3200);
  }
  var PFEIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';

  /* ── Lesemodus / Dunkelmodus ── */
  function modus(m) {
    if (m === 'dunkel') de.setAttribute('data-theme', 'dunkel'); else de.removeAttribute('data-theme');
    lg('cz_thema', m === 'dunkel' ? 'dunkel' : 'hell');
    var mt = d.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', m === 'dunkel' ? '#1a1813' : '#f5f2ea');
    markieren();
  }
  function istDunkel() { return de.getAttribute('data-theme') === 'dunkel'; }

  /* ── Zeitraum (7 Tage, 30 Tage, Jahr) ── */
  function zeitraum() { var b = d.querySelector('#rng button.on'); return b ? b.textContent.trim() : '30 Tage'; }
  function zeitraumSetzen(n) { var b = d.querySelector('#rng button[data-d="' + n + '"]'); if (b) b.click(); markieren(); }
  function markieren() {
    [].forEach.call(d.querySelectorAll('[data-c3-modus]'), function (b) { var an = (b.getAttribute('data-c3-modus') === 'dunkel') === istDunkel(); b.classList.toggle('an', an); b.setAttribute('aria-pressed', an); });
    var on = d.querySelector('#rng button.on'), dd = on ? on.getAttribute('data-d') : '30';
    [].forEach.call(d.querySelectorAll('[data-c3-zr]'), function (b) { var an = b.getAttribute('data-c3-zr') === dd; b.classList.toggle('an', an); b.setAttribute('aria-pressed', an); });
  }

  /* ── Reihe auf der Übersicht: Liste | Tagesplan | Zeitraum | Abzeichen ── */
  function reihe() {
    var ov = d.querySelector('[data-v="overview"]'); if (!ov) return;
    var r = $('c3-reihe');
    if (!r) {
      r = d.createElement('div'); r.id = 'c3-reihe';
      r.innerHTML = '<div class="c3-ansicht" id="c3-ansicht"></div>'
        + '<button type="button" class="c3-t" id="c3-zr"><small>Zeitraum</small><b></b></button>'
        + '<button type="button" class="c3-t" id="c3-az"><span class="c3-az-b"></span><span><small>Abzeichen</small><b></b></span></button>';
      r.querySelector('#c3-zr').addEventListener('click', function () { window.show && show('settings'); gruppeAuf('darstellung'); });
      r.querySelector('#c3-az').addEventListener('click', function () { if (!(window.czTrophaeen && window.czTrophaeen('missionen'))) hinweis('Missionen laden noch …'); });
    }
    var w = $('ta-wahl'), home = $('tm-home'), k = $('c2-kacheln'), an = r.querySelector('.c3-ansicht');
    if (w && w.parentNode !== an) an.appendChild(w);
    r.classList.toggle('ohne-ansicht', art() !== 'termin');
    /* Einmal einsetzen, danach bleibt die Reihe stehen; die Kacheln setzen sich selbst davor */
    if (!r.parentNode || !ov.contains(r)) {
      var vor = art() === 'termin' && home ? home : ov.querySelector(':scope>.kpis');
      if (k && k.parentNode && ov.contains(k)) vor = k.nextSibling;
      (vor ? vor.parentNode : ov).insertBefore(r, vor || null);
    }
    /* Liste und Tagesplan stehen direkt unter der Reihe */
    var ta = $('ta');
    if (art() === 'termin' && home && home.parentNode === r.parentNode && r.nextSibling !== home) r.parentNode.insertBefore(home, r.nextSibling);
    if (ta && home && ta.parentNode === home.parentNode && home.nextSibling !== ta) home.parentNode.insertBefore(ta, home.nextSibling);
    var zr = r.querySelector('#c3-zr b'); if (zr.textContent !== zeitraum()) zr.textContent = zeitraum();
    var AZ = window.czAbzeichen, st = window.czVertrauenStufe ? window.czVertrauenStufe() : -1;
    if (AZ && r._st !== st) {
      r._st = st;
      r.querySelector('.c3-az-b').innerHTML = AZ.svg(Math.max(st, 0), 34, {});
      r.querySelector('#c3-az b').textContent = st < 0 ? 'Noch keins' : (AZ.STUFEN[st] || {}).n || '';
    }
  }
  function namen() {
    var a = d.querySelector('#ta-wahl [data-ta="1"]'), b = d.querySelector('#ta-wahl [data-ta="2"]');
    if (a && a.textContent !== 'Liste') a.textContent = 'Liste';
    if (b && b.textContent !== 'Tagesplan') b.textContent = 'Tagesplan';
  }

  /* ── Einstellungen in Gruppen ── */
  var GRUPPEN = [
    { id: 'darstellung', t: 'Darstellung & Übersicht', s: 'Lesemodus oder Dunkelmodus, Zeitraum, Kacheln', k: [] },
    { id: 'konto', t: 'Konto & Betrieb', s: 'Anmeldung, Ihre Daten, Kontakt für Gäste', k: ['Konto', 'Ihre Daten', 'Kontakt für Ihre Gäste'] },
    { id: 'nachrichten', t: 'Benachrichtigungen & Berichte', s: 'E-Mails, Mitteilungen, Monatsbericht, Bewertungen', k: ['Benachrichtigungen', 'Berichte & Bewertungen'] },
    { id: 'formular', t: 'Formular & Einbauen', s: 'Link, QR-Code, Website, Pause', k: ['Formular vorübergehend abschalten'] },
    { id: 'funktionen', t: 'Funktionen', s: 'Ein- und ausschalten, alles kennenlernen', k: ['Funktionen'] },
    { id: 'recht', t: 'Rechtliches', s: 'Datenschutz, Verträge, AGB, AV-Vertrag, Impressum', k: ['Datenschutz'] },
    { id: 'loeschen', t: 'Konto löschen', s: 'Alles endgültig entfernen', k: ['Konto löschen'], leise: true }
  ];
  function gruppeAuf(id) {
    var g = d.querySelector('.c3-g[data-g="' + id + '"]'); if (!g) return;
    [].forEach.call(d.querySelectorAll('.c3-g.auf'), function (x) { if (x !== g) { x.classList.remove('auf'); x.querySelector('.c3-gk').setAttribute('aria-expanded', 'false'); } });
    g.classList.add('auf'); g.querySelector('.c3-gk').setAttribute('aria-expanded', 'true');
    setTimeout(function () { var y = g.getBoundingClientRect().top + scrollY - 80; scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }, 30);
  }
  function knopf(t, s, attr) { return '<button type="button" class="c3-lk" ' + attr + '><span><b>' + t + '</b><i>' + s + '</i></span>' + PFEIL + '</button>'; }
  function link(t, s, href) { return '<a class="c3-lk" href="' + href + '" target="_blank" rel="noopener"><span><b>' + t + '</b><i>' + s + '</i></span>' + PFEIL + '</a>'; }
  function einstellungen() {
    var v = d.querySelector('[data-v="settings"]'); if (!v) return;
    if (!$('c3-gruppen')) {
      var box = d.createElement('div'); box.id = 'c3-gruppen';
      GRUPPEN.forEach(function (g) {
        var el = d.createElement('div'); el.className = 'c3-g' + (g.leise ? ' leise' : ''); el.setAttribute('data-g', g.id);
        el.innerHTML = '<button type="button" class="c3-gk" aria-expanded="false"><span><b>' + g.t + '</b><i>' + g.s + '</i></span>' + PFEIL + '</button><div class="c3-gb"></div>';
        el.querySelector('.c3-gk').addEventListener('click', function () {
          if (g.direkt) { if (window.czFxMenue) window.czFxMenue.auf(); return; }
          if (el.classList.contains('auf')) { el.classList.remove('auf'); this.setAttribute('aria-expanded', 'false'); } else gruppeAuf(g.id);
        });
        box.appendChild(el);
      });
      var top = v.querySelector(':scope>.top'); v.insertBefore(box, top ? top.nextSibling : v.firstChild);
      var sub = top && top.querySelector('.sub'); if (sub) sub.textContent = 'Tippen Sie auf ein Thema.';
      /* Darstellung */
      var dar = d.createElement('div'); dar.className = 'card c3-dar'; dar.id = 'c2-dar';
      dar.innerHTML = '<div class="setrow"><div class="l"><h3>Modus</h3><p>Lesemodus ist hell und warm, Dunkelmodus schont abends die Augen.</p></div><div class="r"><div class="c3-seg"><button type="button" data-c3-modus="hell">Lesemodus</button><button type="button" data-c3-modus="dunkel">Dunkelmodus</button></div></div></div>'
        + '<div class="setrow"><div class="l"><h3>Zeitraum der Zahlen</h3><p>Für die Kacheln und Auswertungen auf der Übersicht.</p></div><div class="r"><div class="c3-seg"><button type="button" data-c3-zr="7">7 Tage</button><button type="button" data-c3-zr="30">30 Tage</button><button type="button" data-c3-zr="365">Jahr</button></div></div></div>';
      dar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-c3-modus]'); if (b) modus(b.getAttribute('data-c3-modus'));
        b = e.target.closest('[data-c3-zr]'); if (b) zeitraumSetzen(b.getAttribute('data-c3-zr'));
      });
      gb('darstellung').appendChild(dar);
      /* Zusatz-Knöpfe in den Gruppen */
      var kz = d.createElement('div'); kz.className = 'c3-lks';
      kz.innerHTML = knopf('Mein Profil', 'Auftritt im Netzwerk', 'data-view="netzprofil"'); gb('konto').appendChild(kz);
      var fz = d.createElement('div'); fz.className = 'c3-lks';
      fz.innerHTML = knopf('Einbauen & teilen', 'Link, QR-Code und Code für Ihre Website', 'data-view="embed"'); gb('formular').insertBefore(fz, gb('formular').firstChild);
      var fx = d.createElement('div'); fx.className = 'c3-lks';
      fx.innerHTML = knopf('Alle Funktionen kennenlernen', 'Von den Grundlagen bis für Fortgeschrittene, mit „Zeigen“', 'data-c3-fxm');
      fx.addEventListener('click', function () { if (window.czFxMenue) window.czFxMenue.auf(); });
      gb('funktionen').appendChild(fx);
      var rz = d.createElement('div'); rz.className = 'c3-lks';
      rz.innerHTML = link('Datenschutzerklärung', 'Von clickzauber', 'datenschutz.html') + link('AGB', 'Nutzungsbedingungen', 'agb.html') + link('AV-Vertrag', 'Auftragsverarbeitung', 'av-vertrag.html') + link('Impressum', 'Anbieter', 'impressum.html');
      gb('recht').appendChild(rz);
      /* Inhalt der bisherigen Seite „Rechtliches“ dazu */
      var rv = d.querySelector('[data-v="recht"]');
      if (rv) [].slice.call(rv.querySelectorAll(':scope>.card')).forEach(function (c) { c.classList.add('c3-rk'); gb('recht').appendChild(c); });
      markieren();
    }
    /* Karten einsortieren (auch später hinzugekommene) */
    [].slice.call(v.querySelectorAll(':scope>.card')).forEach(function (c) {
      var t = c.dataset.akk || ((c.querySelector('h2') || {}).textContent || '').trim(), ziel = 'darstellung';
      if (c.id === 'fx-card') t = 'Funktionen';
      GRUPPEN.forEach(function (g) { if (g.k.indexOf(t) >= 0) ziel = g.id; });
      if (ziel === 'darstellung' && !/Kachel/i.test(t)) ziel = c.classList.contains('gefahr') ? 'loeschen' : 'konto';
      c.classList.add('auf'); var kk = c.querySelector('.akk-kopf'); if (kk) kk.setAttribute('aria-expanded', 'true');
      gb(ziel).appendChild(c);
    });
  }
  function gb(id) { return d.querySelector('.c3-g[data-g="' + id + '"] .c3-gb'); }
  /* „Rechtliches“ von anderswo öffnet die Gruppe in den Einstellungen */
  function showUmleiten() {
    if (!window.show || window.show._c3) return;
    var alt = window.show;
    window.show = function (v) {
      if (v === 'recht') { alt.call(this, 'settings'); setTimeout(function () { gruppeAuf('recht'); }, 60); return; }
      var r = alt.apply(this, arguments); setTimeout(tick, 30); return r;
    };
    window.show._c3 = true;
  }

  /* ── Kalender verbinden ── */
  var KAL = [
    { id: 'apple', t: 'Apple Kalender', s: 'iPhone, iPad, Mac', ersatz: '' },
    { id: 'google', t: 'Google Kalender', s: 'Android und Browser', ersatz: 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl' },
    { id: 'outlook', t: 'Outlook', s: 'Windows und Microsoft 365', ersatz: 'https://outlook.live.com/calendar/0/addfromweb' }
  ];
  function verbunden() { try { return JSON.parse(lg('c3_kal') || '{}') || {}; } catch (e) { return {}; } }
  /* Nur noch ein „Kalender verbinden“: die echte Verbindung (#kd, Google, Outlook, iCloud). Abo-Karte und „Umgekehrt …“ fallen weg.
     Verbunden = dieser Kalender ausgegraut, daneben „Entkoppeln“ (löst „Verbindung trennen“ aus). */
  function kalender() {
    var ab = $('abo2-karte'); if (ab) ab.classList.add('c3-weg');
    var feed = $('kal-stand') && $('kal-stand').closest('.card'); if (feed) feed.classList.add('c3-weg');
    var alt = $('c3-spruch'); if (alt) alt.remove();
    var kd = $('kd'); if (!kd) return;
    var h = kd.querySelector('h2'); if (h && h.textContent !== 'Kalender verbinden') h.textContent = 'Kalender verbinden';
    [].forEach.call(kd.querySelectorAll('.kd-knoepfe>[data-kd]'), function (b) {
      var z = d.createElement('div'); z.className = 'c3-kdz'; z.setAttribute('data-c3-kd', b.getAttribute('data-kd'));
      b.parentNode.insertBefore(z, b); z.appendChild(b);
      var e = d.createElement('button'); e.type = 'button'; e.className = 'c3-ent'; e.textContent = 'Entkoppeln';
      e.addEventListener('click', function () { var w = $('kd-weg'); if (w) w.click(); });
      z.appendChild(e);
    });
    var an = !!$('kd-an') && !$('kd-an').hidden, wer = an ? ($('kd-wer') || {}).textContent || '' : '';
    var art = /Google/.test(wer) ? 'google' : /Outlook/.test(wer) ? 'microsoft' : /iCloud/.test(wer) ? 'icloud' : '';
    kd.classList.toggle('c3-an', an);
    [].forEach.call(kd.querySelectorAll('.c3-kdz'), function (z) { z.classList.toggle('aus', an && z.getAttribute('data-c3-kd') === art); });
  }
  function kalAlt() {
    var karte = $('abo2-karte'); if (!karte) return;
    var box = $('c3-kal');
    if (!box) {
      box = d.createElement('div'); box.id = 'c3-kal';
      box.innerHTML = '<h2>Kalender verbinden</h2><div class="c3-kal-l"></div><p class="c3-kal-hin">Entkoppeln entfernt die Verbindung hier. Im Kalender selbst bitte das Abo „clickzauber“ ebenfalls löschen.</p>';
      karte.appendChild(box); karte.classList.add('c3-kal-karte');
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-c3-kal]'), x = e.target.closest('[data-c3-ent]'), V = verbunden();
        if (x) { delete V[x.getAttribute('data-c3-ent')]; lg('c3_kal', JSON.stringify(V)); kalZeichnen(); hinweis('Kalender entkoppelt'); return; }
        if (!b) return;
        var k = KAL.filter(function (z) { return z.id === b.getAttribute('data-c3-kal'); })[0], a = $('abo2-' + k.id), href = a && a.getAttribute('href');
        if (!href || href === '#') { var los = $('abo2-btn'); if (los && window.token !== 'demo') los.click(); href = k.ersatz; }
        if (href) window.open(href, '_blank', 'noopener'); else hinweis('Im Test-Cockpit öffnet sich hier Apple Kalender.');
        V[k.id] = Date.now(); lg('c3_kal', JSON.stringify(V)); kalZeichnen();
      });
      kalZeichnen();
    }
    var sp = $('cz-spruch'), kv = d.querySelector('[data-v="kalender"]');
    if (sp && kv && !$('c3-spruch')) { var s = d.createElement('p'); s.id = 'c3-spruch'; kv.appendChild(s); }
    if (sp && $('c3-spruch') && $('c3-spruch').textContent !== sp.textContent) $('c3-spruch').textContent = sp.textContent;
    /* Belegung (Anfrage-Cockpits): nur „Kalender verbinden“, ohne Erklärtext */
    var kd = $('kd'); if (kd) { var h = kd.querySelector('h2'); if (h && h.textContent !== 'Kalender verbinden') h.textContent = 'Kalender verbinden'; }
  }
  function kalZeichnen() {
    var V = verbunden(), l = d.querySelector('#c3-kal .c3-kal-l'); if (!l) return;
    l.innerHTML = KAL.map(function (k) {
      return V[k.id]
        ? '<div class="c3-kal-z aus"><span class="c3-kal-k"><b>' + k.t + '</b><i>Verbunden</i></span><button type="button" class="c3-ent" data-c3-ent="' + k.id + '">Entkoppeln</button></div>'
        : '<div class="c3-kal-z"><button type="button" class="c3-kal-k" data-c3-kal="' + k.id + '"><b>' + k.t + '</b><i>' + k.s + '</i></button></div>';
    }).join('');
    $('c3-kal').classList.toggle('hat', Object.keys(V).length > 0);
  }
  function kal() { var v = d.querySelector('.view.on'); d.body.classList.toggle('c3-kal', !!v && v.getAttribute('data-v') === 'kalender'); }

  /* ── Formular: Vorschau in der App, Antippen öffnet den Konfigurator ── */
  var VORSCHAU = { friseur: 'friseur', kosmetik: 'kosmetik', catering: 'speckrausch', foodtruck: 'speckrausch', hochzeit: 'savoca', location: 'savoca' };
  function formularUrl() {
    /* Nur im Test-Cockpit: im echten Konto würde die Vorschau als Besuch des Formulars zählen */
    if (window.token !== 'demo') return '';
    var b = (location.search.match(/[?&]branche=([a-z]+)/) || [])[1] || 'friseur';
    return 'verkaufsslides/inhaltsverzeichnis.html?vorschau=1&v=' + (VORSCHAU[b] || 'friseur');
  }
  function hatFormular() { return window.token === 'demo' || !!((window.SRV_WIDGETS || []).length); }
  function formular() {
    var v = d.querySelector('[data-v="widget"]'); if (!v) return;
    var hat = hatFormular(), h1 = v.querySelector('h1'), sub = v.querySelector('.top .sub');
    var t = hat ? 'Mein Formular' : 'Formular bauen';
    if (h1 && h1.textContent !== t) h1.textContent = t;
    if (sub) { var st = hat ? 'So sieht es für Ihre Gäste aus. Antippen öffnet den Konfigurator.' : 'Noch kein Formular. In wenigen Minuten gebaut.'; if (sub.textContent !== st) sub.textContent = st; }
    var nb = d.querySelector('#unten [data-view="widget"]');
    if (nb) { var tn = [].filter.call(nb.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); }).pop(); var lt = hat ? 'Formular' : 'Formular bauen'; if (tn && tn.textContent.trim() !== lt) tn.textContent = lt; }
    var fv = $('c3-fv');
    if (hat && !fv) {
      var url = formularUrl(); if (!url) return;
      fv = d.createElement('a'); fv.id = 'c3-fv'; fv.href = 'clickzauber-editor.html'; fv.setAttribute('aria-label', 'Formular im Konfigurator bearbeiten');
      fv.innerHTML = '<div class="c3-fv-rahmen"><iframe src="' + url + '" title="Vorschau Ihres Formulars" tabindex="-1" loading="lazy"></iframe></div><span class="c3-fv-k">Im Konfigurator bearbeiten' + PFEIL + '</span>';
      var top = v.querySelector(':scope>.top'); v.insertBefore(fv, top ? top.nextSibling : v.firstChild);
    }
    v.classList.toggle('c3-hat', hat && !!$('c3-fv'));
  }

  /* ── Missionen: Feier nur bei neuem Abzeichen, sonst still weiter ── */
  function feier() {
    var f = $('msn-feier'); if (!f || f.hidden) return;
    if (/Vertrauensabzeichen/.test(f.textContent)) { f.classList.add('c3-zeigen'); return; }
    f.classList.remove('c3-zeigen'); var w = f.querySelector('[data-msn-weiter]'); if (w) w.click();
  }

  function tick() {
    [showUmleiten, namen, reihe, kal, feier, einstellungen, kalender, formular, markieren].forEach(function (f) {
      try { f(); } catch (e) { if (!f._w) { f._w = 1; console.warn('Cockpit 3 · ' + f.name + ': ' + (e && e.message)); } }
    });
  }
  setInterval(tick, 500); tick();
})();
