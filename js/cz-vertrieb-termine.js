/* clickzauber — Vertrieb: Reiter „Termine“ (seit 07.10.2026, lib/vertrieb-termin.js, sql/64).
   Termin-Link für einen Interessenten anlegen (clickzauber.de/t/CODE) und per WhatsApp oder E-Mail schicken.
   Er wählt selbst einen Vorschlag und wie er die Bestätigung bekommt: per Mail mit Kalender-Eintrag oder per WhatsApp von Ihnen.
   Danach: Push-Nachricht, Eintrag im Kontaktbuch (Stufe „Termin“), auf Wunsch eine eigene 7-Tage-Demo, Erinnerung am Vortag.
   Nutzt API, key, buchLesen() und buchHolen() aus clickzauber-vertrieb.html und die Stile aus js/cz-vertrieb-demos.js. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function k() { return (typeof key !== 'undefined' && key) || ''; }
  function api() { return ((typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api') + '/vertrieb-termin'; }
  var BR = [['friseur', 'Friseur & Beauty'], ['catering', 'Food Truck & Catering'], ['hochzeit', 'Hochzeit & Location'], ['handwerk', 'Handwerk & Solar'], ['beratung', 'Makler & Finanzen']];
  var BRN = {}; BR.forEach(function (b) { BRN[b[0]] = b[1]; });
  var ART = { telefon: 'Telefonat', video: 'Videogespräch', vor_ort: 'Treffen vor Ort' };
  var WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var FILT = [['alle', 'Alle'], ['offen', 'Warten auf Antwort'], ['bestaetigt', 'Termin steht'], ['anderer', 'Anderer Wunsch'], ['abgesagt', 'Abgesagt']];
  var L = [], OFFEN = null, FST = 'alle', NEU = null;

  var css = document.createElement('style');
  css.textContent = ''
    + '#vtCard,#vtListeCard{margin:0 0 16px}#vtCard h2,#vtListeCard h2{display:flex;align-items:baseline;gap:8px}'
    + '.vt-vs{display:flex;flex-direction:column;gap:8px;margin:0 0 10px}.vt-v{display:grid;grid-template-columns:minmax(0,1fr) 120px 44px;gap:8px;align-items:center}'
    + '.vt-v input{background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:11px;padding:9px 12px;font:inherit;font-size:14.5px;color:var(--ink);min-height:44px;min-width:0;color-scheme:dark}'
    + '.vt-v button{min-height:44px;border-radius:11px;border:1.5px solid var(--line-2);background:none;color:var(--ink-2);font:inherit;font-size:18px;cursor:pointer}'
    + '.vt-lbl{font-size:12.5px;color:var(--ink-2);margin:4px 0 6px}'
    + '.vt-chk{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--ink-2);margin:4px 0 12px;cursor:pointer}.vt-chk input{width:20px;height:20px;margin:1px 0 0;flex:0 0 20px;accent-color:var(--accent)}'
    + '.vt-text{width:100%;box-sizing:border-box;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:11px;padding:10px 12px;font:inherit;font-size:14.5px;color:var(--ink);min-height:70px;resize:vertical;margin:0 0 10px}'
    + '.vt-wann{padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,var(--panel-2));border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);margin:0 0 12px}'
    + '.vt-wann b{display:block;font-size:16px;color:var(--ink)}.vt-wann span{font-size:13px;color:var(--ink-2)}'
    + '.vt-wunsch{padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--warn) 12%,var(--panel-2));margin:0 0 12px;font-size:14px;color:var(--ink);white-space:pre-wrap}'
    + '.vt-zeit{font-size:12.5px;color:var(--ink-2);line-height:1.7}';
  document.head.appendChild(css);

  /* ── Datum und Text ── */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function werktag(n) { var d = new Date(); d.setDate(d.getDate() + n); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d; }
  function tagLang(s) { var d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return WT[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()]; }
  function wann(v) { return v ? tagLang(v.datum) + ', ' + v.zeit + ' Uhr' : ''; }
  function ms(v) { var p = v.datum.split('-'), z = v.zeit.split(':'); return new Date(+p[0], +p[1] - 1, +p[2], +z[0], +z[1]).getTime(); }
  function vorbei(v) { return !v || ms(v) < Date.now(); }
  function zeit(t) { if (!t) return '–'; var d = new Date(t); return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
  function vn(t) { return String(t.name || '').trim().split(/\s+/)[0] || ''; }
  function hallo(t) { return vn(t) ? 'Hallo ' + vn(t) + ',' : 'Guten Tag,'; }
  function waNr(s) { var n = String(s || '').replace(/\D/g, ''); if (n.indexOf('00') === 0) n = n.slice(2); else if (n.charAt(0) === '0') n = '49' + n.slice(1); return n; }
  function wa(t, text) { var n = waNr(t.telefon); return 'https://wa.me/' + (n.length >= 9 ? n : '') + '?text=' + encodeURIComponent(text); }
  function wo(t) {
    if (t.art === 'telefon') return t.telefon ? 'Ich rufe Sie unter ' + t.telefon + ' an.' : 'Ich rufe Sie an.';
    if (t.art === 'video') return t.ort ? 'Link zum Gespräch: ' + t.ort : 'Den Link zum Gespräch schicke ich Ihnen vorher.';
    return t.ort ? 'Ort: ' + t.ort : 'Ich komme zu Ihnen in den Betrieb.';
  }
  function zukunftV(t) { return (t.vorschlaege || []).filter(function (v) { return !vorbei(v); }); }
  function einladung(t, neu) {
    var V = zukunftV(t), art = ART[t.art] || 'Gespräch';
    if (V.length === 1) return hallo(t) + ' hier ist Manuel Tripi von clickzauber. ' + (neu ? 'Hier ist mein neuer Vorschlag' : 'Wie besprochen') + ': ' + art + ' am ' + wann(V[0]) + ', etwa ' + (t.dauer || 30) + ' Minuten. Bitte bestätigen Sie mit einem Tipp: ' + t.link + '\n\nViele Grüße, Manuel';
    return hallo(t) + ' hier ist Manuel Tripi von clickzauber. ' + (neu ? 'Hier sind neue Vorschläge für unser ' + art + '.' : 'Gern zeige ich Ihnen in einem kurzen ' + art + ' (etwa ' + (t.dauer || 30) + ' Minuten), wie clickzauber alle Anfragen an einer Stelle sammelt.') + ' Hier wählen Sie mit einem Tipp, wann es Ihnen passt: ' + t.link + '\n\nViele Grüße, Manuel';
  }
  function bestaetigung(t) {
    return hallo(t) + ' danke! Unser Termin steht: ' + wann(t.gewaehlt) + '. ' + (ART[t.art] || 'Gespräch') + ', etwa ' + (t.dauer || 30) + ' Minuten. ' + wo(t)
      + (t.demo_link ? '\n\nBis dahin können Sie clickzauber schon ausprobieren, Ihre eigene Demo für 7 Tage: ' + t.demo_link : '')
      + '\n\nKommt etwas dazwischen? Hier können Sie den Termin ändern: ' + t.link + '\n\nViele Grüße, Manuel';
  }
  function erinnerung(t) {
    var d = new Date(); d.setDate(d.getDate() + 1);
    var morgen = iso(d) === t.gewaehlt.datum;
    return hallo(t) + ' kurze Erinnerung an unser ' + (ART[t.art] || 'Gespräch') + ' ' + (morgen ? 'morgen um ' + t.gewaehlt.zeit + ' Uhr' : 'am ' + wann(t.gewaehlt)) + '. ' + wo(t) + '\n\nPasst es doch nicht? ' + t.link + '\n\nViele Grüße, Manuel';
  }
  function mailto(t, neu) { return 'mailto:' + encodeURIComponent(t.email || '') + '?subject=' + encodeURIComponent('Termin für unser Gespräch · clickzauber') + '&body=' + encodeURIComponent(einladung(t, neu)); }
  function icsUrl(t) {
    var a = new Date(ms(t.gewaehlt)), b = new Date(a.getTime() + (t.dauer || 30) * 6e4);
    var f = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var x = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); };
    var info = [ART[t.art] || 'Gespräch', wo(t), [t.name, t.telefon, t.email].filter(Boolean).join(' · '), t.link].join('\n');
    var s = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//clickzauber//Vertrieb//DE', 'BEGIN:VEVENT', 'UID:' + t.code + '-v@clickzauber.de', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(a), 'DTEND:' + f(b),
      'SUMMARY:' + x('clickzauber · ' + (t.betrieb || t.name || 'Interessent')), 'DESCRIPTION:' + x(info), t.art === 'vor_ort' && t.ort ? 'LOCATION:' + x(t.ort) : '',
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + x('Gespräch ' + (t.betrieb || t.name || '')), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    return URL.createObjectURL(new Blob([s], { type: 'text/calendar' }));
  }
  function stand(t) {
    if (t.status === 'abgesagt') return ['Abgesagt', 'bad'];
    if (t.status === 'anderer') return ['Anderer Wunsch', 'warn'];
    if (t.status === 'bestaetigt' && t.gewaehlt) {
      if (vorbei(t.gewaehlt)) return ['Vorbei', 'aus'];
      if (t.weg === 'whatsapp' && !t.wa_bestaetigt_am) return ['WhatsApp-Bestätigung fehlt', 'warn'];
      return ['Termin steht', 'gut'];
    }
    if (!zukunftV(t).length) return ['Vorschläge vorbei', 'warn'];
    return [t.geoeffnet_am ? 'Geöffnet, noch keine Wahl' : 'Wartet', 'aus'];
  }

  /* ── Server ── */
  function post(d) {
    d.key = k();
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Antwort unlesbar (' + r.status + ')' }; }); })
      .catch(function () { return { ok: false, error: 'Keine Verbindung.' }; });
  }
  function laden() {
    if (!k()) return Promise.resolve();
    return fetch(api() + '?aktion=liste&key=' + encodeURIComponent(k()), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { meld('vtMsg', 'Liste lädt nicht: ' + ((j && j.error) || 'Ist lib/vertrieb-termin.js schon bei GitHub?'), true); return; }
      L = j.termine || []; liste();
    }).catch(function () { meld('vtMsg', 'Keine Verbindung zum Server.', true); });
  }
  function meld(id, t, bad) { var m = $(id); if (m) { m.textContent = t || ''; m.className = 'dz-msg' + (bad ? ' bad' : ''); } }

  /* ── Formular ── */
  function vRow(v) {
    return '<div class="vt-v"><input type="date" data-vd value="' + esc(v ? v.datum : '') + '" min="' + iso(new Date()) + '" aria-label="Tag"><input type="time" data-vz value="' + esc(v ? v.zeit : '') + '" step="900" aria-label="Uhrzeit"><button type="button" data-vweg aria-label="Vorschlag entfernen">×</button></div>';
  }
  function vLesen(box) {
    return [].map.call(box.querySelectorAll('.vt-v'), function (r) { return { datum: r.querySelector('[data-vd]').value, zeit: r.querySelector('[data-vz]').value }; })
      .filter(function (v) { return v.datum && v.zeit; });
  }
  function karte() {
    if ($('vtCard')) return;
    var ziel = window.czVtSeite ? window.czVtSeite('termine') : null; if (!ziel) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'vtCard';
    c.innerHTML = '<h2>Termin-Link anlegen</h2>'
      + '<p class="cs">Der Interessent wählt mit einem Tipp, wann es passt, und ob er die Bestätigung per E-Mail mit Kalender-Eintrag oder per WhatsApp von Ihnen möchte. Danach steht er im Kontaktbuch und bekommt auf Wunsch seine eigene Demo. So erlebt er clickzauber, bevor Sie ein Wort gesagt haben.</p>'
      + '<div class="dz-form"><label>Aus dem Kontaktbuch<select id="vtKontakt"><option value="">Neuer Kontakt</option></select></label></div>'
      + '<div class="dz-form"><label>Betrieb<input id="vtBetrieb" maxlength="80" placeholder="Pizza Mobil"></label>'
      + '<label>Ansprechpartner<input id="vtName" maxlength="80" placeholder="Sandra Keller" autocomplete="off"></label>'
      + '<label>Branche<select id="vtBranche">' + BR.map(function (b) { return '<option value="' + b[0] + '">' + esc(b[1]) + '</option>'; }).join('') + '</select></label>'
      + '<label>E-Mail<input id="vtMail" type="email" maxlength="120" inputmode="email" autocomplete="off"></label>'
      + '<label>Handynummer<input id="vtTel" type="tel" maxlength="40" inputmode="tel" autocomplete="off"></label></div>'
      + '<div class="dz-form"><label>Art<select id="vtArt"><option value="telefon">Telefonat</option><option value="video">Videogespräch</option><option value="vor_ort">Treffen vor Ort</option></select></label>'
      + '<label id="vtOrtL" hidden><span id="vtOrtT">Adresse</span><input id="vtOrt" maxlength="300"></label>'
      + '<label>Dauer<select id="vtDauer"><option value="15">15 Minuten</option><option value="30" selected>30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option></select></label></div>'
      + '<p class="vt-lbl">Vorschläge (einer genügt, wenn der Tag schon besprochen ist)</p><div class="vt-vs" id="vtVs">' + vRow({ datum: iso(werktag(1)), zeit: '10:00' }) + vRow(null) + vRow(null) + '</div>'
      + '<div class="dz-kn" style="margin:0 0 12px"><button type="button" class="dz-b" id="vtPlus">+ Vorschlag</button></div>'
      + '<label class="vt-lbl" for="vtText">Nachricht auf der Seite (freiwillig)</label><textarea class="vt-text" id="vtText" maxlength="600" placeholder="z. B. Ich zeige Ihnen, wie Anfragen für Ihren Food Truck an einer Stelle ankommen."></textarea>'
      + '<label class="vt-chk"><input type="checkbox" id="vtDemo" checked><span>Nach der Bestätigung eigene Demo für 7 Tage, mit Beispieldaten seiner Branche</span></label>'
      + '<div class="dz-kn"><button type="button" class="dz-b go" id="vtAnlegen">Termin-Link anlegen</button></div>'
      + '<p class="dz-msg" id="vtMsg" role="status"></p><div id="vtNeu"></div>';
    ziel.appendChild(c);
    var l = document.createElement('div'); l.className = 'card'; l.id = 'vtListeCard';
    l.innerHTML = '<h2>Termin-Links <span class="zn-anz" id="vtAnz"></span></h2><p class="cs">Antippen zeigt alles zum Termin: bestätigen per WhatsApp, erinnern, neue Vorschläge, Demo.</p>'
      + '<div class="fil" id="vtFil">' + FILT.map(function (f, i) { return '<button type="button" data-vtf="' + f[0] + '"' + (i ? '' : ' class="on"') + '>' + f[1] + '</button>'; }).join('') + '</div>'
      + '<div class="dz-liste" id="vtListe"><p class="leer">Lädt …</p></div>';
    ziel.appendChild(l);
    kontakte();
    $('vtKontakt').addEventListener('focus', kontakte);
    $('vtKontakt').addEventListener('change', function () {
      var x = (window.buchLesen ? buchLesen() : []).filter(function (b) { return b.id === this.value; }, this)[0];
      if (!x) return;
      $('vtBetrieb').value = x.firma || ''; $('vtName').value = x.name || ''; $('vtMail').value = x.email || ''; $('vtTel').value = x.telefon || '';
    });
    $('vtArt').addEventListener('change', artFeld);
    $('vtPlus').onclick = function () { var b = $('vtVs'); if (b.children.length < 5) b.insertAdjacentHTML('beforeend', vRow(null)); };
    c.addEventListener('click', function (ev) { var x = ev.target.closest('[data-vweg]'); if (!x) return; var r = x.closest('.vt-v'), b = r.parentNode; if (b.children.length > 1) r.remove(); else { r.querySelector('[data-vd]').value = ''; r.querySelector('[data-vz]').value = ''; } });
    $('vtAnlegen').onclick = anlegen;
    $('vtListe').addEventListener('click', function (ev) { var b = ev.target.closest('[data-vt]'); if (b) oeffnen(b.getAttribute('data-vt')); });
    $('vtFil').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-vtf]'); if (!b) return; FST = b.getAttribute('data-vtf');
      [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); liste();
    });
  }
  function kontakte() {
    var s = $('vtKontakt'); if (!s || !window.buchLesen) return;
    var wert = s.value, B = buchLesen().slice().sort(function (a, b) { return String(a.firma || a.name || '').localeCompare(String(b.firma || b.name || ''), 'de'); });
    s.innerHTML = '<option value="">Neuer Kontakt</option>' + B.map(function (b) { return '<option value="' + esc(b.id) + '">' + esc([b.firma, b.name].filter(Boolean).join(' · ') || 'Ohne Namen') + '</option>'; }).join('');
    s.value = wert;
  }
  function artFeld() {
    var a = $('vtArt').value; $('vtOrtL').hidden = a === 'telefon';
    $('vtOrtT').textContent = a === 'video' ? 'Link zum Gespräch (freiwillig)' : 'Adresse';
    $('vtOrt').placeholder = a === 'video' ? 'https://meet.google.com/…' : 'Straße, Ort';
  }
  function anlegen() {
    var b = $('vtAnlegen'), V = vLesen($('vtVs'));
    var d = { aktion: 'neu', kontakt_id: $('vtKontakt').value || '', betrieb: $('vtBetrieb').value.trim(), name: $('vtName').value.trim(), branche: $('vtBranche').value, email: $('vtMail').value.trim(), telefon: $('vtTel').value.trim(),
      art: $('vtArt').value, ort: $('vtArt').value === 'telefon' ? '' : $('vtOrt').value.trim(), dauer: $('vtDauer').value, vorschlaege: V, nachricht: $('vtText').value.trim(), demo: $('vtDemo').checked };
    if (d.betrieb.length < 2 && d.name.length < 2) { meld('vtMsg', 'Bitte Betrieb oder Namen eintragen.', true); $('vtBetrieb').focus(); return; }
    if (!V.length) { meld('vtMsg', 'Bitte mindestens einen Vorschlag mit Tag und Uhrzeit eintragen.', true); return; }
    if (V.some(vorbei)) { meld('vtMsg', 'Ein Vorschlag liegt in der Vergangenheit.', true); return; }
    if (!d.telefon && !d.email) { meld('vtMsg', 'Bitte Handynummer oder E-Mail eintragen, sonst kommt der Link nicht an.', true); $('vtTel').focus(); return; }
    b.disabled = true; meld('vtMsg', 'Wird angelegt …');
    post(d).then(function (j) {
      b.disabled = false;
      if (!j.ok) { meld('vtMsg', j.error || 'Hat nicht geklappt.', true); return; }
      meld('vtMsg', ''); NEU = j.termin;
      ['vtKontakt', 'vtBetrieb', 'vtName', 'vtMail', 'vtTel', 'vtOrt', 'vtText'].forEach(function (i) { $(i).value = ''; });
      $('vtVs').innerHTML = vRow({ datum: iso(werktag(1)), zeit: '10:00' }) + vRow(null) + vRow(null);
      $('vtNeu').innerHTML = '<div class="dz-neu"><span>Termin-Link für <b>' + esc(j.termin.betrieb || j.termin.name) + '</b> steht. Jetzt schicken:</span><code>' + esc(j.termin.link) + '</code>' + teilen(j.termin, false) + '</div>';
      laden(); if (window.buchHolen) setTimeout(buchHolen, 600);
    });
  }
  function teilen(t, neu) {
    return '<div class="dz-kn">' + (t.telefon ? '<a class="dz-b go" target="_blank" rel="noopener" data-vtweg="whatsapp" data-vtc="' + esc(t.code) + '" href="' + esc(wa(t, einladung(t, neu))) + '">Per WhatsApp schicken</a>' : '')
      + (t.email ? '<a class="dz-b' + (t.telefon ? '' : ' go') + '" data-vtweg="mail" data-vtc="' + esc(t.code) + '" href="' + esc(mailto(t, neu)) + '">Per E-Mail schicken</a>' : '')
      + '<button type="button" class="dz-b" data-vtweg="kopiert" data-vtc="' + esc(t.code) + '" data-vtkopie="' + esc(t.link) + '">Link kopieren</button></div>';
  }

  /* ── Liste ── */
  function rang(t) {
    if (t.status === 'bestaetigt' && t.gewaehlt && !vorbei(t.gewaehlt)) return 0;
    if (t.status === 'anderer') return 1;
    if (t.status === 'offen') return 2;
    return 3;
  }
  function liste() {
    var box = $('vtListe'); if (!box) return;
    $('vtAnz').textContent = L.length || '';
    var LL = L.filter(function (t) { return FST === 'alle' || t.status === FST; }).sort(function (a, b) {
      var r = rang(a) - rang(b); if (r) return r;
      if (rang(a) === 0) return ms(a.gewaehlt) - ms(b.gewaehlt);
      return new Date(b.erstellt_am) - new Date(a.erstellt_am);
    });
    box.innerHTML = LL.length ? LL.map(function (t) {
      var s = stand(t), V = zukunftV(t), x = t.verschickt || [], lx = x[x.length - 1];
      var info = t.status === 'bestaetigt' && t.gewaehlt ? wann(t.gewaehlt) + ' · ' + (ART[t.art] || '') + ' · Bestätigung per ' + (t.weg === 'whatsapp' ? 'WhatsApp' : 'E-Mail')
        : t.status === 'anderer' ? 'Wunsch: ' + (t.wunsch || '–')
        : t.status === 'abgesagt' ? (t.wunsch ? 'Grund: ' + t.wunsch : 'abgesagt')
        : (V.length === 1 ? wann(V[0]) : V.length + ' Vorschläge') + (t.aufrufe ? ' · ' + t.aufrufe + '× geöffnet' : ' · noch nicht geöffnet') + (lx ? ' · ' + (lx.weg === 'whatsapp' ? 'per WhatsApp' : lx.weg === 'mail' ? 'per E-Mail' : 'Link kopiert') + ' ' + zeit(lx.am) : ' · noch nicht verschickt');
      return '<button type="button" class="dz-z" data-vt="' + esc(t.code) + '"><b>' + esc([t.betrieb, t.name].filter(Boolean).join(' · ')) + '</b><span class="dz-st ' + s[1] + '">' + esc(s[0]) + '</span>'
        + '<small>' + esc((BRN[t.branche] || '') + ' · ' + info) + (t.demo_code ? ' · Demo läuft' : '') + '</small></button>';
    }).join('') : '<p class="leer">' + (L.length ? 'Nichts in dieser Auswahl.' : 'Noch keine Termin-Links.') + '</p>';
  }

  /* ── Einzelner Termin ── */
  function oeffnen(code, still) {
    var t = L.filter(function (x) { return x.code === code; })[0]; if (!t) return;
    OFFEN = code;
    var m = $('vtM');
    if (!m) {
      m = document.createElement('div'); m.id = 'vtM'; m.className = 'dz-m'; document.body.appendChild(m);
      m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.closest('[data-vtzu]')) zu(); });
      m.addEventListener('click', aktion);
    }
    var s = stand(t), fest = t.status === 'bestaetigt' && t.gewaehlt, V = zukunftV(t);
    var h = '<div class="dz-box" role="dialog" aria-modal="true"><div class="dz-kn" style="justify-content:space-between"><h2>' + esc([t.betrieb, t.name].filter(Boolean).join(' · ')) + '</h2><button type="button" class="dz-b" data-vtzu="1">Schließen</button></div>'
      + '<p class="cs"><span class="dz-st ' + s[1] + '">' + esc(s[0]) + '</span> · ' + esc(BRN[t.branche] || '') + ' · angelegt ' + zeit(t.erstellt_am)
      + (t.telefon ? ' · <a href="tel:' + esc(t.telefon.replace(/\s/g, '')) + '" style="color:var(--accent)">' + esc(t.telefon) + '</a>' : '') + (t.email ? ' · <a href="mailto:' + esc(t.email) + '" style="color:var(--accent)">' + esc(t.email) + '</a>' : '') + '</p>';
    if (fest) {
      h += '<div class="vt-wann"><b>' + esc(wann(t.gewaehlt)) + '</b><span>' + esc((ART[t.art] || 'Gespräch') + ', ' + (t.dauer || 30) + ' Minuten · ' + wo(t)) + '</span></div>'
        + '<p class="cs">' + (t.weg === 'whatsapp' ? (t.wa_bestaetigt_am ? 'Per WhatsApp bestätigt ' + zeit(t.wa_bestaetigt_am) + '.' : '<b style="color:var(--warn)">Er möchte die Bestätigung per WhatsApp. Bitte jetzt schicken.</b>') : 'Bestätigung mit Kalender-Eintrag ging per E-Mail an ' + esc(t.email) + '. Am Vortag bekommt er eine Erinnerung.')
        + (t.erinnert_am ? ' Erinnert ' + zeit(t.erinnert_am) + '.' : '') + '</p><div class="dz-kn">'
        + (t.weg === 'whatsapp' || t.telefon ? '<a class="dz-b' + (t.weg === 'whatsapp' && !t.wa_bestaetigt_am ? ' go' : '') + '" target="_blank" rel="noopener" data-a="wa-bestaetigt" href="' + esc(wa(t, bestaetigung(t))) + '">' + (t.wa_bestaetigt_am ? 'Noch einmal per WhatsApp bestätigen' : 'Per WhatsApp bestätigen') + '</a>' : '')
        + (!vorbei(t.gewaehlt) && t.telefon ? '<a class="dz-b" target="_blank" rel="noopener" data-a="wa-erinnert" href="' + esc(wa(t, erinnerung(t))) + '">Erinnerung per WhatsApp</a>' : '')
        + '<a class="dz-b" download="termin-' + esc(t.code) + '.ics" href="' + esc(icsUrl(t)) + '">In meinen Kalender</a>'
        + (t.telefon ? '<a class="dz-b" href="tel:' + esc(t.telefon.replace(/\s/g, '')) + '">Anrufen</a>' : '') + '</div>';
    } else if (t.status === 'anderer') {
      h += '<h3>Sein Wunsch</h3><div class="vt-wunsch">' + esc(t.wunsch || '–') + '</div><p class="cs">Schicken Sie unten neue Vorschläge. Er bekommt denselben Link.</p>';
    } else if (t.status === 'abgesagt') {
      h += '<h3>Abgesagt</h3>' + (t.wunsch ? '<div class="vt-wunsch">' + esc(t.wunsch) + '</div>' : '') + '<p class="cs">Mit neuen Vorschlägen ist der Link wieder offen.</p>';
    } else {
      h += '<h3>Vorschläge</h3><p class="cs">' + (V.length ? V.map(function (v) { return esc(wann(v)); }).join('<br>') : '<b style="color:var(--warn)">Alle Vorschläge sind vorbei. Bitte unten neue schicken.</b>') + '</p>'
        + '<p class="cs">' + (t.aufrufe ? t.aufrufe + '× geöffnet, zuerst ' + zeit(t.geoeffnet_am) : 'Noch nicht geöffnet.') + '</p>' + (V.length ? teilen(t, false) : '');
    }
    if (t.demo_code) h += '<h3>Seine Demo</h3><p class="cs">Läuft 7 Tage ab der Bestätigung. Was er anklickt, sehen Sie im Reiter „7-Tage-Demos“.</p><div class="dz-kn"><button type="button" class="dz-b" data-a="demo">Demo ansehen</button><button type="button" class="dz-b" data-vtkopie="' + esc(t.demo_link) + '">Demo-Link kopieren</button></div>';
    else if (t.demo && !fest) h += '<p class="cs">Nach der Bestätigung bekommt er eine eigene Demo für 7 Tage.</p>';
    h += '<h3>Neue Vorschläge</h3><div class="vt-vs" id="vtNv">' + vRow(null) + vRow(null) + '</div>'
      + '<textarea class="vt-text" id="vtNt" maxlength="600" placeholder="Nachricht auf der Seite (freiwillig)">' + esc(t.nachricht || '') + '</textarea>'
      + '<div class="dz-kn"><button type="button" class="dz-b go" data-a="vorschlaege">Speichern</button></div><div id="vtNvOk"></div>'
      + '<p class="dz-msg" id="vtMMsg" role="status"></p>'
      + '<h3>Verlauf</h3><p class="vt-zeit">' + verlauf(t) + '</p>'
      + '<h3>Steuern</h3><div class="dz-kn"><button type="button" class="dz-b" data-vtkopie="' + esc(t.link) + '">Link kopieren</button>'
      + (t.status !== 'abgesagt' ? '<button type="button" class="dz-b bad" data-a="absagen">Absagen</button>' : '') + '<button type="button" class="dz-b bad" data-a="loeschen">Löschen</button></div></div>';
    var alt = m.querySelector('.dz-box'), y = alt ? alt.scrollTop : 0;
    m.innerHTML = h; m.hidden = false;
    if (still) m.querySelector('.dz-box').scrollTop = y;
  }
  function verlauf(t) {
    var z = [['Angelegt', t.erstellt_am]];
    (t.verschickt || []).forEach(function (x) { z.push([x.weg === 'whatsapp' ? 'Per WhatsApp verschickt' : x.weg === 'mail' ? 'Per E-Mail verschickt' : 'Link kopiert', x.am]); });
    if (t.geoeffnet_am) z.push(['Zuerst geöffnet', t.geoeffnet_am]);
    if (t.bestaetigt_am) z.push(['Termin gewählt', t.bestaetigt_am]);
    if (t.wa_bestaetigt_am) z.push(['Per WhatsApp bestätigt', t.wa_bestaetigt_am]);
    if (t.erinnert_am) z.push(['Erinnert', t.erinnert_am]);
    if (t.geaendert_am && t.status !== 'offen') z.push(['Zuletzt geändert', t.geaendert_am]);
    return z.sort(function (a, b) { return new Date(a[1]) - new Date(b[1]); }).map(function (x) { return zeit(x[1]) + ' · ' + esc(x[0]); }).join('<br>');
  }
  function zu() { var m = $('vtM'); if (m) m.hidden = true; OFFEN = null; }
  function aktion(ev) {
    var b = ev.target.closest && ev.target.closest('[data-a]'); if (!b || !OFFEN) return;
    var a = b.getAttribute('data-a'), code = OFFEN, t = L.filter(function (x) { return x.code === code; })[0]; if (!t) return;
    if (a === 'demo') { zu(); if (window.czVtReiter) czVtReiter('demos'); if (window.czDemoOeffnen) setTimeout(function () { czDemoOeffnen(t.demo_code); }, 200); return; }
    if (a === 'wa-bestaetigt' || a === 'wa-erinnert') { post({ aktion: a, c: code }).then(function () { laden().then(function () { if (OFFEN === code) oeffnen(code, true); }); }); return; }   // der Link öffnet WhatsApp
    var d = { aktion: a, c: code };
    if (a === 'vorschlaege') {
      d.vorschlaege = vLesen($('vtNv')); d.nachricht = $('vtNt').value.trim();
      if (!d.vorschlaege.length) { meld('vtMMsg', 'Bitte mindestens einen Vorschlag mit Tag und Uhrzeit eintragen.', true); return; }
      if (d.vorschlaege.some(vorbei)) { meld('vtMMsg', 'Ein Vorschlag liegt in der Vergangenheit.', true); return; }
    }
    if (a === 'absagen' && !confirm('Gespräch absagen? Er bekommt keine Nachricht. Mit neuen Vorschlägen ist der Link wieder offen.')) return;
    if (a === 'loeschen' && !confirm('Termin-Link endgültig löschen? Der Link funktioniert danach nicht mehr. Der Eintrag im Kontaktbuch bleibt.')) return;
    b.disabled = true; meld('vtMMsg', 'Einen Moment …');
    post(d).then(function (j) {
      b.disabled = false;
      if (!j.ok) { meld('vtMMsg', j.error || 'Hat nicht geklappt.', true); return; }
      if (a === 'loeschen') { zu(); laden(); return; }
      laden().then(function () {
        if (a !== 'vorschlaege') { oeffnen(code, true); meld('vtMMsg', 'Gespeichert.'); return; }
        var n = L.filter(function (x) { return x.code === code; })[0];
        oeffnen(code);
        if (n) $('vtNvOk').innerHTML = '<div class="dz-neu"><span>Neue Vorschläge gespeichert. Jetzt Bescheid geben:</span>' + teilen(n, true) + '</div>';
        if (window.buchHolen) setTimeout(buchHolen, 600);
      });
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-vtkopie]'); if (!b) return;
    var t = b.getAttribute('data-vtkopie');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Kopiert'; }, function () { window.prompt('Link kopieren:', t); });
  });
  /* Versand festhalten: WhatsApp oder Mail geöffnet, Link kopiert */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-vtweg]'); if (!b) return;
    post({ aktion: 'verschickt', c: b.getAttribute('data-vtc'), weg: b.getAttribute('data-vtweg') }).then(function (j) { if (j && j.ok) laden(); });
  });
  window.czVtTerminOeffnen = function (code) { (L.some(function (t) { return t.code === code; }) ? Promise.resolve() : laden()).then(function () { oeffnen(code); }); };

  (function start(n) {
    var app = $('app');
    if (app && app.style.display === 'block' && k() && window.czVtSeite) {
      karte(); artFeld();
      laden().then(function () { var m = (location.hash || '').match(/^#termin-([a-z0-9]+)/); if (m) { if (window.czVtReiter) czVtReiter('termine'); oeffnen(m[1]); } });
      setInterval(function () { var s = window.czVtSeite && czVtSeite('termine'); if (!document.hidden && s && !s.hidden) laden(); }, 60000);
      return;
    }
    if (n < 600) setTimeout(function () { start(n + 1); }, 500);
  })(0);
})();
