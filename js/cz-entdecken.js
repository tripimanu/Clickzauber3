/* cz-entdecken.js — Bereich „Entdecken“ im Cockpit: weitere Rechner als klickbare Vorschau.
   Die Vorlagen entsprechen TEMPLATES.energie und TEMPLATES.handwerk im Editor. */
(function () {
  'use strict';
  var R = {
    energie: { name: 'Solar-Rechner', fuer: 'Photovoltaik und Solar', akz: '#c98512', art: 'solar', ende: 'Ihr grober Kostenrahmen',
      text: 'Hausbesitzer beantworten fünf kurze Fragen zu Stromrechnung, Haushalt und Dach. Jede Frage erklärt, wo man die Antwort findet. Sie bekommen eine vollständige Anfrage für ein Beratungsgespräch.',
      steps: [{"frage":"Wie hoch ist Ihre Stromrechnung im Monat?","u":"Den Betrag finden Sie auf Ihrer letzten Stromrechnung oder als monatlichen Abschlag im Kontoauszug.","o":["Unter 100 €","100–180 €","Über 180 €"],"d":["bis etwa 3.400 kWh im Jahr","etwa 3.400 bis 6.000 kWh im Jahr","mehr als 6.000 kWh, z. B. mit Wärmepumpe"]},{"frage":"Wie viele Menschen leben im Haushalt?","u":"Mehr Personen brauchen mehr Strom. Daraus schätzen wir die passende Größe der Anlage.","o":["1–2 Personen","3–4 Personen","5 oder mehr"],"d":["z. B. Paar oder allein","typische Familie","große Familie oder mehrere Generationen"]},{"frage":"Wohin zeigt Ihr Dach?","u":"Süddächer bringen den meisten Strom. Ost-West-Dächer liefern morgens und abends, das passt gut zum Alltag.","h":"Tipp: In der Satellitenansicht von Google Maps sehen Sie Ihr Dach von oben.","o":["Eher nach Süden","Ost / West","Weiß ich nicht"],"d":["höchster Ertrag","etwas weniger Ertrag, dafür gleichmäßiger über den Tag","kein Problem, wir prüfen das beim Termin"]},{"frage":"Wie groß ist Ihre Dachfläche?","u":"Gemeint ist nur die Seite, auf die Module sollen. Grob reicht: Hauslänge mal halbe Hausbreite.","o":["Bis 40 m²","40–80 m²","Über 80 m²"],"d":["Platz für etwa 7 kWp","Platz für etwa 7 bis 14 kWp","Platz für eine große Anlage"]},{"frage":"Laden Sie ein E-Auto (oder planen es)?","u":"Ein E-Auto braucht etwa 2.000 kWh im Jahr. Mit eigenem Solarstrom laden ist deutlich günstiger.","o":["Ja","Nein"],"d":["wir planen die Wallbox gleich mit ein","lässt sich später jederzeit nachrüsten"]}] },
    handwerk: { name: 'Terrassen-Kalkulator', fuer: 'Garten- und Landschaftsbau', akz: '#a8472f', art: 'terrasse', ende: 'Ihr grober Kostenrahmen',
      text: 'Kunden wählen Größe, Belag und Unterbau und nennen den Wunschtermin. Zu jeder Wahl steht, was sie bedeutet. Sie sehen sofort, ob das Projekt zu Ihnen passt.',
      steps: [{"frage":"Wie groß soll Ihre Terrasse werden?","u":"Rechnen Sie Länge mal Breite. Ein Tisch mit vier bis sechs Stühlen braucht etwa 15 m².","o":["Bis 20 m²","20–50 m²","Über 50 m²"],"d":["für Tisch und Stühle","Platz für Essbereich und Lounge","große Fläche, z. B. ums Haus herum"]},{"frage":"Welchen Belag wünschen Sie?","u":"Der Belag bestimmt Preis, Aussehen und wie viel Pflege die Terrasse braucht.","o":["Betonplatte / Pflaster (Standard)","Hochwertiges WPC","Feinsteinzeug / Naturstein (Premium)"],"d":["günstig, robust, viele Farben","sieht aus wie Holz, splittert nicht, kaum Pflege","edel und langlebig, Flecken lassen sich leicht entfernen"]},{"frage":"Ist ein neuer Unterbau nötig?","u":"Der Unterbau trägt die Terrasse. Ohne festen, geraden Untergrund sackt der Belag mit der Zeit ab.","o":["Ja, Aushub + Schotterbett neu","Nein, Untergrund ist vorhanden","Weiß ich nicht"],"d":["wenn jetzt Rasen oder Erde dort ist","z. B. alte Terrasse oder Betonplatte","wir schauen uns das vor Ort an"]},{"frage":"Wann soll es losgehen?","u":"Ein ungefährer Termin reicht. Wir melden uns mit einem Vorschlag.","h":"Im Frühjahr sind viele Betriebe früh ausgebucht. Wer früh anfragt, bekommt eher den Wunschtermin.","datum":true}] }
  };
  var ST = {};
  /* Beispielwerte nach Marktpreisen 2026 (Fachbetrieb, Deutschland). Der Betrieb ersetzt sie im Editor durch eigene. */
  var MARKT = {
    handwerk: { flaeche: [15, 35, 65], belag: [[55, 100], [65, 160], [90, 200]], unterbau: [[30, 80], [0, 0], [0, 80]] },
    energie: { kwp: [6, 9, 12], dach: [7, 13, 18], eauto: 2, eur: [1000, 1600], speicher: [4000, 7000] }
  };
  function r100(x) { return Math.round(x / 100) * 100; }
  function eur(x) { return r100(x).toLocaleString('de-DE') + ' €'; }
  function preis(id, k) {
    var m = MARKT[id], v, b;
    if (id === 'handwerk') {
      var f = m.flaeche[k[0]], be = m.belag[k[1]], u = m.unterbau[k[2]];
      v = f * (be[0] + u[0]); b = f * (be[1] + u[1]);
      return '<div class="ez-p"><span>Grober Rahmen bei etwa ' + f + ' m²</span><b>' + eur(v) + ' bis ' + eur(b) + '</b><small>inklusive Material und Verlegung' + (k[2] === 1 ? '' : ', mit Unterbau') + '</small></div>';
    }
    var kwp = Math.min(m.kwp[k[0]] + (k[1] === 2 ? 1 : 0) + (k[4] === 0 ? m.eauto : 0), m.dach[k[3]]);
    v = kwp * m.eur[0]; b = kwp * m.eur[1];
    return '<div class="ez-p"><span>Passende Anlage: etwa ' + kwp + ' kWp</span><b>' + eur(v) + ' bis ' + eur(b) + '</b><small>schlüsselfertig ohne Speicher. Mit Speicher (10 kWh) zusätzlich etwa ' + eur(m.speicher[0]) + ' bis ' + eur(m.speicher[1]) + '.</small></div>';
  }
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lauf(id) {
    var r = R[id], s = ST[id] || (ST[id] = { i: 0, a: [], k: [] }), n = r.steps.length;
    var kopf = '<div class="ez-lk"><span>' + e(r.name) + '</span><i>' + Math.min(s.i + 1, n) + ' / ' + n + '</i></div><div class="ez-bar"><b style="width:' + Math.round(Math.min(s.i, n) / n * 100) + '%"></b></div>';
    if (s.i >= n) {
      return kopf + '<div class="ez-q">' + e(r.ende) + '</div><ul class="ez-sum">' + r.steps.map(function (st, k) {
        return '<li><span>' + e(st.frage) + '</span><b>' + e(s.a[k] || '–') + '</b></li>';
      }).join('') + '</ul>' + preis(id, s.k) + '<p class="ez-hin">Beispielwerte nach Marktpreisen 2026. Ihre eigenen Preise tragen Sie im Editor ein. Im echten Formular folgen danach die Kontaktfelder.</p><button class="ez-zur" data-ez-neu="' + id + '">Noch einmal</button>';
    }
    var st = r.steps[s.i];
    return kopf + '<div class="ez-q">' + e(st.frage) + '</div>' + (st.u ? '<p class="ez-u">' + e(st.u) + '</p>' : '')
      + (st.datum ? '<input type="date" class="ez-dat" data-ez-dat="' + id + '"><button class="ez-o ez-weiter" data-ez-w="' + id + '">Weiter</button>'
        : '<div class="ez-os">' + st.o.map(function (o, n) { return '<button class="ez-o" data-ez-o="' + id + '" data-n="' + n + '" data-w="' + e(o) + '"><b>' + e(o) + '</b>' + (st.d && st.d[n] ? '<small>' + e(st.d[n]) + '</small>' : '') + '</button>'; }).join('') + '</div>')
      + (st.h ? '<div class="ez-tipp">' + e(st.h) + '</div>' : '')
      + (s.i ? '<button class="ez-zur" data-ez-zur="' + id + '">‹ Zurück</button>' : '');
  }
  function malen(id) { var b = document.getElementById('ez-' + id); if (b) { b.innerHTML = lauf(id); b.style.setProperty('--ez', R[id].akz); } }
  function zeichnen() {
    var el = document.getElementById('ez-box'); if (!el || el.getAttribute('data-ok')) return;
    el.setAttribute('data-ok', '1');
    el.innerHTML = '<div class="ez-grid">' + Object.keys(R).map(function (id) {
      var r = R[id];
      return '<div class="card ez-k ez-' + r.art + '" style="--ez:' + r.akz + '"><div class="ez-band"><span class="ez-ic">' + (r.art === 'solar' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 15l9-5 9 5-9 5z"/><path d="M7.5 12.5l9 5M16.5 12.5l-9 5"/></svg>') + '</span></div><div class="ez-kopf"><span class="ez-tag">Vorschau</span><h2>' + e(r.name) + '</h2><div class="ez-fuer">' + e(r.fuer) + '</div><p class="cs">' + e(r.text) + '</p></div>'
        + '<div class="ez-w" id="ez-' + id + '"></div>'
        + '<div class="ez-f"><a class="linkbtn gut" href="clickzauber-editor.html?vorlage=' + id + '">Diese Vorlage verwenden</a></div></div>';
    }).join('') + '</div>';
    Object.keys(R).forEach(malen);
  }
  document.addEventListener('click', function (ev) {
    var x = ev.target.closest('[data-ez-o],[data-ez-w],[data-ez-zur],[data-ez-neu]'); if (!x) return;
    var id = x.getAttribute('data-ez-o') || x.getAttribute('data-ez-w') || x.getAttribute('data-ez-zur') || x.getAttribute('data-ez-neu'), s = ST[id];
    if (x.hasAttribute('data-ez-o')) { s.a[s.i] = x.getAttribute('data-w'); s.k[s.i] = +x.getAttribute('data-n'); s.i++; }
    else if (x.hasAttribute('data-ez-w')) { var d = document.querySelector('[data-ez-dat="' + id + '"]').value; s.a[s.i] = d ? d.split('-').reverse().join('.') : 'Noch offen'; s.i++; }
    else if (x.hasAttribute('data-ez-zur')) s.i = Math.max(0, s.i - 1);
    else ST[id] = { i: 0, a: [], k: [] };
    malen(id);
  });
  var alt = window.show;
  window.show = function (v) { alt.apply(this, arguments); if (v === 'entdecken') zeichnen(); };
  setTimeout(function () { var v = document.querySelector('.view.on'); if (v && v.getAttribute('data-v') === 'entdecken') zeichnen(); }, 800);
  var css = document.createElement('style');
  css.textContent = [
    '.ez-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:16px;align-items:start}',
    '.ez-k{display:flex;flex-direction:column;gap:16px}.ez-kopf h2{margin:6px 0 2px}.ez-fuer{font-size:12.5px;color:var(--ink-3);margin-bottom:8px}',
    '.ez-tag{display:inline-block;font-family:var(--fm);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--panel-2);color:var(--ink-2)}',
    '.ez-w{--ez:#2f7d59;background:#fffdf8;color:#241f19;border:1px solid rgba(36,31,25,.12);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:12px;min-height:300px}',
    '.ez-lk{display:flex;justify-content:space-between;font-size:12px;color:#7a7263}.ez-lk span{font-weight:600;color:var(--ez)}.ez-lk i{font-style:normal;font-family:var(--fm)}',
    '.ez-bar{height:4px;border-radius:4px;background:rgba(36,31,25,.08);overflow:hidden}.ez-bar b{display:block;height:100%;background:var(--ez);transition:width .25s}',
    '.ez-q{font-size:19px;font-weight:650;letter-spacing:-.015em;line-height:1.3;margin-top:6px;text-wrap:pretty}',
    '.ez-os{display:flex;flex-direction:column;gap:8px}',
    '.ez-o{font:inherit;font-size:14.5px;text-align:left;padding:13px 15px;min-height:48px;border-radius:12px;border:1.5px solid rgba(36,31,25,.14);background:#fff;color:#241f19;cursor:pointer}',
    '.ez-o:hover{border-color:var(--ez)}.ez-weiter{background:var(--ez);color:#fff;border-color:var(--ez);text-align:center;font-weight:600}',
    '.ez-dat{font:inherit;font-size:15px;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(36,31,25,.14);background:#fff;color:#241f19}',
    '.ez-zur{align-self:flex-start;background:none;border:none;padding:4px 0;font:inherit;font-size:13px;color:#7a7263;cursor:pointer}',
    '.ez-sum{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}.ez-sum li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid rgba(36,31,25,.08);font-size:13px}',
    '.ez-sum li span{color:#7a7263}.ez-sum li b{text-align:right}.ez-hin{margin:0;font-size:12.5px;color:#7a7263}',
    '.ez-f{display:flex;gap:8px;flex-wrap:wrap}',
    '.ez-k{overflow:hidden;padding:0 !important;gap:0 !important}.ez-k>.ez-kopf{padding:18px 22px 0}.ez-k>.ez-w{margin:16px 22px 0}.ez-k>.ez-f{padding:16px 22px 22px}',
    '@media(max-width:700px){.ez-k>.ez-kopf{padding:16px 16px 0}.ez-k>.ez-w{margin:14px 14px 0}.ez-k>.ez-f{padding:14px 16px 16px}.ez-band{padding:0 16px !important}}',
    '.ez-band{height:74px;position:relative;display:flex;align-items:center;padding:0 22px}',
    '.ez-solar .ez-band{background:linear-gradient(180deg,#dcebf6 0%,#f4ead2 100%)}',
    '.ez-solar .ez-band::after{content:"";position:absolute;right:22px;bottom:12px;width:120px;height:36px;background:repeating-linear-gradient(90deg,#27476b 0 18px,#8fb0cc 18px 19.5px),#27476b;clip-path:polygon(12% 0,100% 0,88% 100%,0 100%);opacity:.9}',
    '.ez-terrasse .ez-band{background:repeating-linear-gradient(90deg,#e6d9c7 0 38px,#dccdb8 38px 40px),#e6d9c7}',
    '.ez-ic{width:44px;height:44px;border-radius:50%;background:#fffdf8;color:var(--ez);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(36,31,25,.12)}.ez-ic svg{width:24px;height:24px}',
    '.ez-u{margin:-4px 0 2px;font-size:13.5px;line-height:1.5;color:#5c5446;text-wrap:pretty}',
    '.ez-o{display:flex;flex-direction:column;gap:2px}.ez-o b{font-weight:600}.ez-o small{font-size:12.5px;color:#7a7263;line-height:1.4}',
    '.ez-o:hover small{color:#5c5446}',
    '.ez-tipp{font-size:12.5px;line-height:1.45;color:#5c5446;background:color-mix(in srgb,var(--ez) 9%,#fff);border-radius:10px;padding:9px 12px}',
    '.ez-solar .ez-w{background:linear-gradient(180deg,#fbfdff,#fffdf8 40%)}',
    '.ez-p{display:flex;flex-direction:column;gap:3px;padding:14px 16px;border-radius:12px;background:color-mix(in srgb,var(--ez) 10%,#fff);border:1px solid color-mix(in srgb,var(--ez) 30%,transparent)}',
    '.ez-p span{font-size:12.5px;color:#5c5446}.ez-p b{font-size:22px;letter-spacing:-.02em;color:#241f19}.ez-p small{font-size:12px;color:#5c5446;line-height:1.45}'
  ].join('\n');
  document.head.appendChild(css);
})();
