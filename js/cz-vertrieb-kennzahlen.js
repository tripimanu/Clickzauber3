/* clickzauber — Plattform & Vertrieb (clickzauber-plattform.html): eine Leiste für alle Reiter.
   Seit 09.10.2026 „Kundenübersicht“ (Karten, Kundenakte mit Checkliste; Inhalt: js/cz-kundenakte.js), direkt nach „Überblick“.
   Seit 08.10.2026 auch „Überblick“, „Meldungen“, „Rundmail“ und „Protokoll“ der Plattform (Inhalt: js/cz-plattform.js).
   Vertrieb: Reiter „Termine“ (seit 07.10.2026), „Demos“ und „Kennzahlen“ (seit 05.10.2026), in derselben Leiste wie „Kunden & Zahlen“ und „Potenzielle Kunden“.
   Termine: Termin-Links für Interessenten (js/cz-vertrieb-termine.js).
   Kunden: wie bisher. Demos: persönliche Links, Links für Facebook-Gruppen, QR-Codes und alles Verschickte (js/cz-vertrieb-demos.js).
   Kennzahlen: wie weit die Demos kommen, woher die Leute kommen, wen man jetzt anrufen sollte
   (GET /api/demo-zugang?aktion=kennzahlen, lib/demo-zugang.js). Zeitraum: die Auswahl oben rechts. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function k() { return (typeof key !== 'undefined' && key) || ''; }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function zeitraum() { return (typeof tage !== 'undefined' && +tage) || 90; }
  var REITER = [['ueberblick', 'Überblick'], ['akten', 'Kundenübersicht'], ['kunden', 'Kunden & Zahlen'], ['termine', 'Termine'], ['demos', '7-Tage-Demos'], ['kennzahlen', 'Kennzahlen'], ['meldungen', 'Meldungen'], ['rundmail', 'Rundmail'], ['protokoll', 'Protokoll']];
  var VOR_P = ['termine', 'demos', 'kennzahlen'], NACH_P = ['meldungen', 'rundmail', 'protokoll'];
  var KOPF = {
    ueberblick: ['Überblick', 'Wartung, Updates, App-Versionen und die Zahlen der ganzen Plattform.'],
    akten: ['Kundenübersicht', 'Alles zu einem Betrieb an einem Ort: Kontakt, Formular, Cockpit und jeder Schritt bis zum echten Konto. Neue Konten erscheinen von selbst.'],
    meldungen: ['Meldungen & Netzwerk', 'Gemeldete und automatisch blockierte Inhalte, neue Bilder, Profile und Kontakte im Netzwerk.'],
    rundmail: ['Rundmail', 'Eine E-Mail an eine Gruppe von Kunden, zum Beispiel bei Neuerungen oder einer Wartung.'],
    protokoll: ['Protokoll', 'Wer wann gesperrt, freigegeben, angeschrieben, gemahnt oder aktualisiert wurde.'],
    termine: ['Termine', 'Gesprächstermine mit Interessenten. Er wählt selbst, Sie bekommen eine Push-Nachricht, der Kontakt steht im Kontaktbuch (js/cz-vertrieb-termine.js).'],
    demos: ['7-Tage-Demos', 'Jeder Interessent hat seine eigene Demo: persönlicher Link, QR-Code oder Link für Gruppen. Antippen zeigt Name, Betrieb und jeden Klick. 30 Tage nach Ablauf löscht der Server alles.'],
    kennzahlen: ['Kennzahlen', 'Wie weit Ihre Demos kommen und woher die Leute kommen. Der Zeitraum richtet sich nach der Auswahl oben rechts.']
  };
  var BRN = { friseur: 'Friseur & Beauty', catering: 'Food Truck & Catering', hochzeit: 'Hochzeit & Location', handwerk: 'Handwerk & Solar', beratung: 'Makler & Finanzen' };
  var BER = { leads: 'Anfragen', kalender: 'Kalender', zeiten: 'Zeiten & Team', settings: 'Einstellungen', overview: 'Übersicht', dashboard: 'Übersicht', widget: 'Formulare', konfigurator: 'Konfigurator', recht: 'Rechtliches', team: 'Team', umsatz: 'Umsatz', embed: 'Einbauen & teilen', stats: 'Auswertung', historie: 'Historienbuch', stammkunden: 'Stammkunden' };

  var css = document.createElement('style');
  css.textContent = ''
    /* Eine Zeile zum Wischen, damit die Leiste am Handy nicht drei Zeilen hoch wird */
    + '#app .pk-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:4px}#app .pk-tabs::-webkit-scrollbar{display:none}#app .pk-tabs button{flex:0 0 auto;white-space:nowrap;display:inline-flex;align-items:center;gap:7px}'
    + '.vt-eigen{display:flex;flex-wrap:wrap;gap:6px;padding:10px clamp(14px,3vw,26px) 0;max-width:1500px;margin:0 auto}'
    + '.vt-eigen button{font:inherit;font-size:14px;background:none;border:1px solid var(--line-2);color:var(--ink-2);border-radius:10px;padding:0 16px;min-height:42px;cursor:pointer}'
    + '.vt-eigen button.on{background:var(--panel-2);color:var(--ink);border-color:var(--accent)}'
    + '.vt-seite[hidden]{display:none}'
    + '.kz-kopf{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 14px}.kz-kopf p{margin:0;font-size:12.5px;color:var(--ink-2)}'
    + '.kz-u{font-size:12px;color:var(--ink-2);line-height:1.4;margin-top:2px;text-wrap:pretty}'
    + '.kz-k{margin:0 0 16px}'
    + '.kz-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:16px;align-items:start;margin:0 0 16px}.kz-g .kz-k{margin:0}'
    + '.kz-b{display:grid;grid-template-columns:minmax(110px,190px) minmax(0,1fr) auto;gap:10px;align-items:center;font-size:13px;margin:0 0 8px}'
    + '.kz-b>span:first-child{overflow-wrap:anywhere}.kz-b .bb{height:8px;border-radius:99px;background:var(--line-2);overflow:hidden}.kz-b .bb i{display:block;height:100%;background:var(--accent);border-radius:99px}'
    + '.kz-b .r{color:var(--ink-2);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}'
    + '.kz-heiss{display:flex;flex-direction:column;gap:8px}'
    + '.kz-h{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line)}'
    + '.kz-hn{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left;background:none;border:0;padding:0;color:var(--ink);font:inherit;cursor:pointer;min-height:44px;justify-content:center}'
    + '.kz-hn b{font-size:14.5px;overflow-wrap:anywhere}.kz-hn span{font-size:12.5px;color:var(--ink-2);overflow-wrap:anywhere}.kz-hn small{font-size:12px;color:var(--ink-2);line-height:1.45}.kz-hn:hover b{color:var(--accent)}'
    + '.kz-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}'
    + '.kz-t{width:100%;border-collapse:collapse;font-size:13px}.kz-t th,.kz-t td{padding:9px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;vertical-align:top}'
    + '.kz-t th:first-child,.kz-t td:first-child{text-align:left;white-space:normal;min-width:170px}.kz-t th{font-size:11.5px;font-weight:600;color:var(--ink-2)}'
    + '.kz-t .klein{display:block;font-size:11.5px;color:var(--ink-2);font-weight:400}'
    + '.kz-ende{margin:0;padding:0;list-style:none;font-size:13px;display:flex;flex-direction:column;gap:7px}.kz-ende li{display:flex;gap:10px}.kz-ende b{min-width:30px;text-align:right;font-variant-numeric:tabular-nums}'
    + '@media(max-width:560px){.kz-b{grid-template-columns:minmax(0,1fr) auto}.kz-b .bb{grid-column:1/-1;grid-row:2}}';
  document.head.appendChild(css);

  /* ── Reiter ──
     Eine Leiste für alles: „Kunden & Zahlen | Demos | Kennzahlen | Potenzielle Kunden“. Die Leiste legt js/cz-potenzial.js an (.pk-tabs),
     diese Datei hängt „Demos“ und „Kennzahlen“ hinein. Lädt cz-potenzial.js später, wird nachgezogen. Fehlt es nach drei Sekunden, gibt es eine eigene Leiste. */
  var JETZT = 'kunden', ERSTER = '';
  function wrapEl() { return document.querySelector('#app .wrap'); }
  function leisteEl() { return document.querySelector('#app .pk-tabs:not(.vt-eigen)') || document.querySelector('#app .vt-eigen'); }
  function aufbauen() {
    var w = wrapEl(); if (!w) return false;
    if ($('vt-kunden')) return true;
    var kd = document.createElement('div'); kd.id = 'vt-kunden'; kd.className = 'vt-seite';
    while (w.firstChild) kd.appendChild(w.firstChild);
    w.appendChild(kd);
    REITER.forEach(function (r) {
      var n = r[0]; if (n === 'kunden') return;
      var s = document.createElement('div'); s.id = 'vt-' + n; s.className = 'vt-seite'; s.hidden = true;
      s.innerHTML = '<h1>' + KOPF[n][0] + '</h1><p class="sub">' + KOPF[n][1] + '</p><p class="leer vt-ohne" hidden>Gibt es nur mit Zugangsschlüssel.</p>'
        + (n === 'kennzahlen' ? '<div class="kz-kopf"><p id="kz-stand"></p><button type="button" class="dz-b" id="kz-neu">Aktualisieren</button></div><div id="kz-inhalt"></div>' : '');
      w.appendChild(s);
    });
    /* Karten, die js/cz-vertrieb-demos.js schon vorher angelegt hat, gehören in den Reiter „Demos“. Die alte Auswertung ersetzen die Kennzahlen. */
    ['demoCard', 'lkCard', 'qrCard'].forEach(function (id) { var c = $(id); if (c) $('vt-demos').appendChild(c); });
    var alt = $('dzAusw'); if (alt) alt.remove();
    $('kz-neu').onclick = function () { laden(true); };
    var rng = $('rng'); if (rng) rng.addEventListener('click', function () { setTimeout(function () { if (!$('vt-kennzahlen').hidden) laden(true); }, 30); });
    $('kz-inhalt').addEventListener('click', function (ev) { var b = ev.target.closest('[data-kzdemo]'); if (b && window.czDemoOeffnen) window.czDemoOeffnen(b.getAttribute('data-kzdemo')); });
    var h = location.hash || '';
    ERSTER = /^#termin-/.test(h) ? 'termine' : /^#akte/.test(h) ? 'akten' : /^#demo-/.test(h) ? 'demos' : /^#kennzahlen/.test(h) ? 'kennzahlen' : /^#(plattform|ueberblick)/.test(h) ? 'ueberblick' : /^#meldungen/.test(h) ? 'meldungen' : '';
    if (!ERSTER) try { ERSTER = localStorage.getItem('cz_vt_reiter') || ''; } catch (e) {}
    zeigen(REITER.some(function (r) { return r[0] === ERSTER; }) ? ERSTER : 'ueberblick', true);
    leiste();
    return true;
  }
  /* „Demos“ und „Kennzahlen“ in die Leiste von cz-potenzial.js hängen, zwischen „Kunden & Zahlen“ und „Potenzielle Kunden“ */
  function leiste() {
    var t = document.querySelector('#app .pk-tabs:not(.vt-eigen)'); if (!t) return;
    var eigen = document.querySelector('#app .vt-eigen'); if (eigen) eigen.remove();
    if (!t.querySelector('[data-vt="demos"]')) {
      var k0 = t.querySelector('[data-pk="0"]'), p1 = t.querySelector('[data-pk="1"]');
      if (k0) k0.setAttribute('data-vt', 'kunden');
      var neu = function (n) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-vt', n); b.textContent = REITER.filter(function (r) { return r[0] === n; })[0][1]; return b; };
      t.insertBefore(neu('ueberblick'), k0 || t.firstChild);
      t.insertBefore(neu('akten'), k0 || null);
      VOR_P.forEach(function (n) { t.insertBefore(neu(n), p1 || null); });
      NACH_P.forEach(function (n) { t.appendChild(neu(n)); });
      t.addEventListener('click', klick);
      if (ERSTER === 'potenzial' && p1) { ERSTER = ''; p1.click(); return; }
    }
    markieren();
  }
  function eigeneLeiste() {
    var bar = document.querySelector('#app .bar'); if (!bar || leisteEl()) return;
    var t = document.createElement('div'); t.className = 'pk-tabs vt-eigen'; t.setAttribute('role', 'tablist'); t.setAttribute('aria-label', 'Bereiche');
    t.innerHTML = REITER.map(function (r) { return '<button type="button" data-vt="' + r[0] + '">' + esc(r[1]) + '</button>'; }).join('');
    bar.insertAdjacentElement('afterend', t);
    t.addEventListener('click', klick);
    markieren();
  }
  function klick(ev) {
    var b = ev.target.closest && ev.target.closest('button'); if (!b || !this.contains(b)) return;
    if (b.getAttribute('data-pk') === '1') { merken('potenzial'); return; }   // die Liste zeigt js/cz-potenzial.js
    var n = b.getAttribute('data-vt'); if (!n) return;
    if (b.hasAttribute('data-pk')) { setTimeout(function () { zeigen(n); }, 0); return; }   // erst cz-potenzial.js, dann hier
    oeffnen(n);
  }
  function oeffnen(n) {
    var w = wrapEl(), pk = document.querySelector('#app .pk');
    if (w) w.hidden = false; if (pk) pk.hidden = true;
    zeigen(n);
  }
  function markieren() {
    var t = leisteEl(), pk = document.querySelector('#app .pk'); if (!t || (pk && !pk.hidden)) return;
    [].forEach.call(t.querySelectorAll('button'), function (b) {
      var an = b.getAttribute('data-vt') === JETZT; b.classList.toggle('on', an); b.setAttribute('aria-selected', an ? 'true' : 'false');
      /* Aktiven Reiter in der Wisch-Leiste sichtbar halten (ohne scrollIntoView) */
      if (an && t.scrollWidth > t.clientWidth) { var l = b.offsetLeft - t.offsetLeft, r = l + b.offsetWidth; if (l < t.scrollLeft) t.scrollLeft = l - 12; else if (r > t.scrollLeft + t.clientWidth) t.scrollLeft = r - t.clientWidth + 12; }
    });
  }
  function merken(n) { try { localStorage.setItem('cz_vt_reiter', n); } catch (e) {} }
  function zeigen(n, still) {
    if (!$('vt-' + n)) n = 'kunden';
    JETZT = n;
    REITER.forEach(function (r) { var s = $('vt-' + r[0]); if (s) s.hidden = r[0] !== n; });
    [].forEach.call(document.querySelectorAll('.vt-ohne'), function (p) { p.hidden = !!k(); });
    markieren(); merken(n);
    if (n === 'kennzahlen') laden();
    if (window.czPfZeigen) window.czPfZeigen(n);
    if (window.czAkteZeigen) window.czAkteZeigen(n);
    if (!still) window.scrollTo(0, 0);
  }
  window.czVtSeite = function (n) { aufbauen(); return $('vt-' + n); };
  window.czVtReiter = function (n) { aufbauen(); oeffnen(n); };

  /* ── Kennzahlen ── */
  var DATEN = null, LAEDT = false, ZEIT = 0;
  function laden(neu) {
    var box = $('kz-inhalt'); if (!box) return;
    if (!k()) { box.innerHTML = ''; $('kz-stand').textContent = ''; return; }
    if (LAEDT) return;
    if (!neu && DATEN && DATEN.tage === zeitraum() && Date.now() - ZEIT < 120000) return;
    LAEDT = true;
    if (!DATEN || DATEN.tage !== zeitraum()) box.innerHTML = '<p class="leer">Wird ausgewertet …</p>';
    $('kz-stand').textContent = 'Wird aktualisiert …';
    fetch(api() + '/demo-zugang?aktion=kennzahlen&tage=' + zeitraum() + '&key=' + encodeURIComponent(k()), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      LAEDT = false;
      if (!j || !j.ok) { $('kz-stand').textContent = ''; box.innerHTML = '<p class="dz-msg bad">' + esc((j && j.error) || 'Die Kennzahlen laden nicht. Ist die neue lib/demo-zugang.js schon bei GitHub?') + '</p>'; return; }
      DATEN = j; ZEIT = Date.now(); zeichnen(j);
    }).catch(function () { LAEDT = false; $('kz-stand').textContent = ''; box.innerHTML = '<p class="dz-msg bad">Keine Verbindung zum Server.</p>'; });
  }
  function n0(x) { return (x || 0).toLocaleString('de-DE'); }
  function pz(a, b) { return b ? Math.round(a / b * 100) + ' %' : '–'; }
  function dauer(s) { s = Math.round(s || 0); return s < 60 ? s + ' Sek.' : s < 3600 ? Math.round(s / 60) + ' Min.' : (Math.round(s / 360) / 10).toLocaleString('de-DE') + ' Std.'; }
  function stunden(h) { return h < 1 ? Math.max(1, Math.round(h * 60)) + ' Min.' : h < 48 ? Math.round(h) + ' Std.' : Math.round(h / 24) + ' Tagen'; }
  function vor(t) {
    var m = Math.round((Date.now() - new Date(t).getTime()) / 6e4), d = Math.round(m / 1440);
    return m < 2 ? 'gerade eben' : m < 60 ? 'vor ' + m + ' Min.' : m < 1440 ? 'vor ' + Math.round(m / 60) + ' Std.' : 'vor ' + d + (d === 1 ? ' Tag' : ' Tagen');
  }
  function kachel(l, v, u, cls) { return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><div class="l">' + esc(l) + '</div><div class="v">' + esc(v) + '</div>' + (u ? '<div class="kz-u">' + esc(u) + '</div>' : '') + '</div>'; }
  function balken(l, n, von, r) {
    var p = von ? Math.round(n / von * 100) : 0;
    return '<div class="kz-b"><span>' + esc(l) + '</span><span class="bb"><i style="width:' + (n ? Math.max(3, p) : 0) + '%"></i></span><span class="r">' + esc(r || n0(n) + ' · ' + p + ' %') + '</span></div>';
  }
  function zelle(a, d) { return d ? n0(a) + '<span class="klein">' + pz(a, d) + '</span>' : '–'; }
  function endeText(w) { var t = String(w || '').split(' · '); return (BER[t[0]] || t[0]) + (t[1] ? ' · ' + t.slice(1).join(' · ') : ''); }
  function heissZeile(x) {
    var tel = String(x.telefon || '').replace(/[^\d+]/g, '');
    var info = [x.stufe, dauer(x.sek) + ' aktiv', x.besuche + (x.besuche === 1 ? ' Besuch' : ' Besuche'), x.fragen ? x.fragen + (x.fragen === 1 ? ' Frage' : ' Fragen') : '', x.interesse ? 'will es nutzen' : '', x.konto ? 'wollte ein Konto anlegen' : '', 'zuletzt ' + vor(x.zuletzt)];
    return '<div class="kz-h"><button type="button" class="kz-hn" data-kzdemo="' + esc(x.code) + '"><b>' + esc(x.wer || x.betrieb) + '</b><span>' + esc([x.wer ? x.betrieb : '', x.quelle].filter(Boolean).join(' · ')) + '</span>'
      + '<small>' + esc(info.filter(Boolean).join(' · ')) + '</small></button>' + (tel ? '<a class="dz-b go" href="tel:' + esc(tel) + '">Anrufen</a>' : '') + '</div>';
  }
  function quellenHTML(j) {
    var Q = j.quellen || [];
    return '<div class="card kz-k"><h2>Woher sie kommen</h2><p class="cs">Aufrufe: jedes Öffnen eines Links oder QR-Codes seit dem Anlegen, bei persönlichen Links jedes Öffnen. Alle anderen Zahlen gelten für Demos aus dem Zeitraum.</p>'
      + (Q.length ? '<div class="kz-tw"><table class="kz-t"><thead><tr><th>Quelle</th><th>Aufrufe</th><th>Demos</th><th>Länger als 2 Min.</th><th>Anfrage ausprobiert</th><th>Kontakt</th><th>Will es nutzen</th><th>Pilot</th></tr></thead><tbody>'
        + Q.map(function (q) {
          var d = q.demos;
          return '<tr><td>' + esc(q.name) + (q.sek ? '<span class="klein">Ø ' + dauer(q.sek) + ' in der Demo</span>' : '') + '</td><td>' + n0(q.aufrufe) + '</td><td>' + n0(d) + '</td><td>' + zelle(q.zwei, d) + '</td><td>' + zelle(q.anfrage, d)
            + '</td><td>' + (q.art === 'link' ? zelle(q.kontakt, d) : '–') + '</td><td>' + zelle(q.interesse, d) + '</td><td>' + zelle(q.pilot, d) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="leer">Noch keine Links oder QR-Codes.</p>') + '</div>';
  }
  function zeichnen(j) {
    var box = $('kz-inhalt'), p = j.persoenlich || {}, h = '';
    $('kz-stand').textContent = (j.tage >= 730 ? 'Alles' : j.tage === 365 ? 'Letztes Jahr' : 'Letzte ' + j.tage + ' Tage') + ' · Stand ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    if (!j.demos) { box.innerHTML = '<p class="leer">In diesem Zeitraum gibt es noch keine Demos.</p>' + quellenHTML(j); return; }
    h += '<div class="kpis">'
      + kachel('Demos', n0(j.demos), j.links ? 'davon ' + n0(j.links) + ' aus Links' : 'im Zeitraum')
      + (p.n ? kachel('Persönliche Links geöffnet', pz(p.geoeffnet, p.n), n0(p.geoeffnet) + ' von ' + n0(p.n) + (p.median_std != null ? ' · meist nach ' + stunden(p.median_std) : ''), p.geoeffnet / p.n >= 0.6 ? 'gut' : '') : '')
      + kachel('Zeit in der Demo', dauer(j.sek_schnitt), 'im Schnitt je geöffnete Demo')
      + (j.links ? kachel('Kontakte aus Links', n0(j.kontakt), pz(j.kontakt, j.links) + ' der Besucher', j.kontakt ? 'gut' : '') : '')
      + kachel('Will es nutzen', n0(j.interesse), j.konto ? n0(j.konto) + '× „Konto anlegen“ angetippt' : 'Antwort am letzten Tag der Demo', j.interesse ? 'gut' : '')
      + kachel('Piloten', n0(j.piloten), pz(j.piloten, j.demos) + ' aller Demos', j.piloten ? 'gut' : '')
      + '</div>';
    h += '<div class="card kz-k"><h2>Jetzt nachfassen</h2><p class="cs">Wer in den letzten 14 Tagen am meisten ausprobiert hat und noch kein Pilot ist. Antippen zeigt jeden Klick.</p>'
      + (j.heiss && j.heiss.length ? '<div class="kz-heiss">' + j.heiss.map(heissZeile).join('') + '</div>' : '<p class="leer">Gerade niemand. Sobald jemand länger in einer Demo ist, steht er hier.</p>') + '</div>';
    h += quellenHTML(j);
    h += '<div class="kz-g"><div class="card kz-k"><h2>Wie weit sie kommen</h2><p class="cs">Von ' + n0(j.demos) + ' Demos im Zeitraum.</p>' + (j.trichter || []).map(function (t) { return balken(t.s, t.n, j.demos); }).join('') + '</div>'
      + '<div class="card kz-k"><h2>Nach Branche</h2><p class="cs">Wie viele Demos länger als 2 Minuten offen waren.</p>'
      + (j.branchen || []).map(function (b) { return balken(BRN[b.b] || b.b, b.zwei, b.demos, n0(b.demos) + (b.demos === 1 ? ' Demo' : ' Demos') + ' · ' + pz(b.zwei, b.demos) + (b.pilot ? ' · ' + n0(b.pilot) + (b.pilot === 1 ? ' Pilot' : ' Piloten') : '')); }).join('') + '</div></div>';
    h += '<div class="kz-g"><div class="card kz-k"><h2>Was sie sich ansehen</h2><p class="cs">Wie viele der geöffneten Demos einen Bereich angesehen haben und wie lange im Schnitt.</p>'
      + ((j.bereiche || []).length ? j.bereiche.map(function (x) { return balken(BER[x.b] || x.b, x.demos, j.geoeffnet, n0(x.demos) + ' · Ø ' + dauer(x.sek)); }).join('') : '<p class="leer">Noch keine Klicks.</p>') + '</div>'
      + '<div class="card kz-k"><h2>Hier hören sie auf</h2><p class="cs">Der letzte Klick, bevor die Demo verlassen wurde.</p>'
      + ((j.ende || []).length ? '<ul class="kz-ende">' + j.ende.map(function (x) { return '<li><b>' + n0(x.n) + '×</b><span>' + esc(endeText(x.was)) + '</span></li>'; }).join('') + '</ul>' : '<p class="leer">Noch keine Klicks.</p>') + '</div></div>';
    box.innerHTML = h;
  }

  aufbauen();
  var APP = $('app');
  if (APP) new MutationObserver(function () { var t = document.querySelector('#app .pk-tabs:not(.vt-eigen)'); if (t && !t.querySelector('[data-vt="demos"]')) leiste(); }).observe(APP, { childList: true });
  setTimeout(function () { if (!document.querySelector('#app .pk-tabs')) eigeneLeiste(); }, 3000);
  /* Nach dem Anmelden (Schlüssel da): Reiter neu zeigen, damit Demos und Kennzahlen laden */
  (function warte(n) {
    var app = $('app');
    if (app && app.style.display === 'block') { zeigen(JETZT, true); return; }
    if (n < 1500) setTimeout(function () { warte(n + 1); }, 400);
  })(0);
})();
