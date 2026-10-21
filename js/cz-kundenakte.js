/* clickzauber — Plattform & Vertrieb: Reiter „Kundenübersicht“ (seit 09.10.2026, sql/68).
   Übersicht: eine Karte je Betrieb (ohne Betreiber-Konten). Neue Konten erscheinen von selbst, vorgebaute und selbst angemeldete.
   Betriebe aus kunden/akten.js mit „vorbauen“, die noch kein Konto haben, stehen als vorgemerkt dabei („Jetzt vorbauen“).
   Akte: Kopf, Checkliste „Weg zum echten Konto“, Kontakt mit Notiz, Zum Zeigen, Angebot, Bilder (Logo, Angebot usw. aus kunden/akten.js).
   Checkliste: „Bearbeiten und testen“ (Haken „Alles geprüft und getestet?“) und „Erstversendung“ hakt Manuel selbst ab
   (POST /api/konto-admin 'schritt'). Was der Kunde tut, meldet der Server (lib/einladung.js, lib/save.js) und sein Cockpit
   (js/cz-test.js). Erledigtes wird grau und bekommt am Ende einen Haken. Die offene Akte fragt alle 15 Sekunden nach,
   neu Erledigtes kommt kurz als Meldung. #akte-ID öffnet eine Akte (Mitteilungen an Manuel führen dorthin).
   Ohne Server ansehen: clickzauber-plattform.html?akten=beispiel (Beispieldaten, nichts wird gespeichert oder verschickt).
   Seit 10.10.2026: Schalter „Formular online testen“ im Schritt „Bearbeiten und testen“ (POST /api/konto-admin 'online_test'). Der Haken
   „Alles geprüft und getestet?“ schaltet ihn aus, löscht die Test-Anfragen, danach braucht es wieder die bestätigte E-Mail-Adresse des Kunden.
   Texte je Art des Formulars (Terminbuchung oder Anfrage-Formular, aus kunden/akten.js). Im Beispiel: Barber by Becks vorgebaut, Speckrausch vorgemerkt. */
(function () {
  'use strict';
  var BSP = /[?&]akten=beispiel/.test(location.search);
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function k() { return (typeof key !== 'undefined' && key) || ''; }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function darf() { return BSP || !!k(); }
  function extras() { return Array.isArray(window.CZ_AKTEN) ? window.CZ_AKTEN : []; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ''); }
  function extraVon(f) { var n = norm(f); return (n && extras().filter(function (x) { return norm(x.firma) === n; })[0]) || null; }
  function toast(t) { if (window.czPfToast) window.czPfToast(t); }
  function fehlerToast(e) { toast((e && e.message) || 'Hat nicht geklappt.'); }
  function aktion(akt, d) {
    if (typeof window.kontoAktion !== 'function') return Promise.reject(new Error('Bitte die Seite neu laden.'));
    return window.kontoAktion(akt, d || {});
  }
  var HAKEN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>';
  var LISTE = null, AKTE = null, OFFEN = '', SIG = '', FEHLER = '', ZEIT = 0, STAND = 0, FRAGE = '', WIE = '', LAEDT = 0;

  var css = document.createElement('style');
  css.textContent = ''
    + '#vt-akten.ka-auf>h1,#vt-akten.ka-auf>.sub{display:none}'
    + '.ka-bsp{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:space-between;background:var(--panel-2);border:1px dashed var(--line-2);border-radius:12px;padding:10px 14px;margin:0 0 16px;font-size:13.5px;color:var(--ink-2)}'
    + '.ka-msg{margin:0 0 14px;font-size:13.5px;line-height:1.5;color:var(--ink-2)}.ka-msg.bad{color:#eda292}'
    + '.ka-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}'
    + '.ka-karte{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;align-items:center;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px;color:var(--ink);font:inherit;cursor:pointer;min-height:92px}'
    + '.ka-karte:hover{border-color:var(--line-2)}.ka-karte:focus-visible{outline:2px solid var(--accent);outline-offset:2px}'
    + '.ka-logo{width:56px;height:56px;border-radius:12px;background:#fff;display:grid;place-items:center;overflow:hidden;flex:0 0 auto}'
    + '.ka-logo img{width:100%;height:100%;object-fit:contain}'
    + '.ka-logo.ini{background:var(--panel-2);border:1px solid var(--line-2);color:var(--ink-2);font-weight:700;font-size:17px;letter-spacing:.02em}'
    + '.ka-logo.gross{width:88px;height:88px;border-radius:18px}.ka-logo.gross.ini{font-size:26px}'
    + '.ka-kt{display:flex;flex-direction:column;gap:2px;min-width:0}.ka-kt b{font-size:16px;letter-spacing:-.01em;overflow-wrap:anywhere}'
    + '.ka-kt>span{font-size:13px;color:var(--ink-2);overflow-wrap:anywhere;line-height:1.4}.ka-kt .ka-st{color:var(--ink)}.ka-st.gut{color:var(--accent)}.ka-st.bad{color:#eda292}'
    + '.ka-dran{display:inline-flex;width:fit-content;margin-top:5px;font-family:var(--fm);font-size:10.5px;letter-spacing:.05em;padding:3px 8px;border-radius:999px;background:rgba(244,239,226,.07);color:var(--ink-2)!important}'
    + '.ka-dran.sie{background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn)!important}'
    + '.ka-fort{font-family:var(--fm);font-size:12px;color:var(--ink-2);align-self:start;white-space:nowrap}'
    + '.ka-zur{background:none;border:0;color:var(--accent);font:inherit;font-size:14px;cursor:pointer;min-height:44px;padding:0;margin:0 0 4px}'
    + '.ka-akopf{display:grid;grid-template-columns:88px minmax(0,1fr);gap:18px;align-items:center;margin:0 0 14px}'
    + '.ka-ak h1{margin:0}.ka-ak p{margin:4px 0 8px;color:var(--ink-2);font-size:14.5px;line-height:1.45;text-wrap:pretty}'
    + '.ka-kopfakt{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}'
    + '.ka-raster{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}'
    + '@media(min-width:1080px){.ka-raster{grid-template-columns:minmax(0,1fr) 380px}}'
    + '.ka-haupt,.ka-seite{display:flex;flex-direction:column;gap:16px;min-width:0}.ka-haupt>.card,.ka-seite>.card{margin:0}'
    + '.ka-chk{display:flex;justify-content:space-between;align-items:baseline;gap:4px 14px;flex-wrap:wrap}.ka-zahl{font-family:var(--fm);font-size:12px;color:var(--ink-2)}'
    + '.ka-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}'
    + '.ka-s{display:grid;grid-template-columns:28px minmax(0,1fr) 28px;gap:12px;padding:13px 14px;border:1px solid var(--line-2);border-radius:14px;background:var(--panel-2)}'
    + '.ka-s.jetzt{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}'
    + '.ka-s.ok{background:rgba(244,239,226,.025);border-color:var(--line)}.ka-s.ok h3{color:var(--ink-2);font-weight:600}'
    + '.ka-s.zu{border-style:dashed}'
    + '.ka-n{width:28px;height:28px;border-radius:50%;border:2px solid var(--line-2);display:grid;place-items:center;font-size:12.5px;font-weight:700;color:var(--ink-2);box-sizing:border-box}'
    + '.ka-s.jetzt .ka-n{border-color:var(--accent);color:var(--accent)}.ka-s.ok .ka-n{border-color:var(--line)}'
    + '.ka-ende{width:28px;height:28px;border-radius:50%;display:grid;place-items:center}.ka-s.ok .ka-ende{background:var(--accent);color:#10130f}'
    + '.ka-sb{min-width:0}.ka-st1{display:flex;align-items:baseline;gap:4px 10px;flex-wrap:wrap}'
    + '.ka-s h3{margin:3px 0 0;font-size:15px;letter-spacing:-.01em;line-height:1.35}'
    + '.ka-wer{font-family:var(--fm);font-size:10.5px;letter-spacing:.05em;color:var(--ink-2);padding:3px 8px;border-radius:999px;background:rgba(244,239,226,.06);white-space:nowrap}'
    + '.ka-wer.sie{color:var(--warn);background:color-mix(in srgb,var(--warn) 14%,transparent)}.ka-s.ok .ka-wer{color:var(--ink-2);background:rgba(244,239,226,.05)}'
    + '.ka-s p{margin:5px 0 0;font-size:13.5px;line-height:1.5;color:var(--ink-2);text-wrap:pretty}.ka-s.jetzt p{color:var(--ink)}'
    + '.ka-sub{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--ink-2)}.ka-s:not(.ok) .ka-sub{color:var(--ink)}'
    + '.ka-sub li{display:flex;gap:9px;align-items:baseline;overflow-wrap:anywhere}'
    + '.ka-sub li::before{content:"";flex:0 0 auto;width:8px;height:8px;border-radius:50%;border:1.5px solid var(--ink-2);transform:translateY(-1px)}'
    + '.ka-sub li.ja::before{background:var(--accent);border-color:var(--accent)}.ka-sub li.nein::before{border-color:var(--warn)}.ka-sub li.info::before{border-color:transparent;background:var(--line-2)}'
    + '.ka-akt{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:12px}'
    + '.ka-kn{display:flex;flex-wrap:wrap;gap:8px}'
    + '.ka-b{min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid var(--line-2);background:none;color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none;box-sizing:border-box}'
    + '.ka-b:hover{border-color:var(--accent);color:var(--ink)}.ka-b.go{background:var(--accent);border-color:transparent;color:#10130f}.ka-b.go:hover{color:#10130f;filter:brightness(1.07)}.ka-b:disabled{opacity:.55;cursor:default}'
    + '.ka-haken{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14.5px;font-weight:600;cursor:pointer;color:var(--ink)}.ka-haken input{width:22px;height:22px;margin:0;accent-color:var(--accent);cursor:pointer}'
    + '.ka-frage{background:color-mix(in srgb,var(--warn) 12%,transparent);border:1px solid color-mix(in srgb,var(--warn) 40%,transparent);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;align-self:stretch}'
    + '.ka-frage b{font-size:14.5px}.ka-frage span{font-size:13px;color:var(--ink-2)}.ka-frage .ka-kn{margin-top:6px}'
    + '.ka-link{font-family:var(--fm);font-size:12px;color:var(--ink-2)!important;margin:0!important;overflow-wrap:anywhere}'
    + '.ka-zu{font-size:13px!important;color:var(--ink-2)!important}'
    + '.ka-warn{margin-top:10px;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--bad) 14%,transparent);display:flex;flex-direction:column;gap:8px;align-items:flex-start}.ka-warn p{margin:0;color:#f3b4a6!important}'
    + '.ka-rueck{background:none;border:0;color:var(--ink-2);font:inherit;font-size:12.5px;text-decoration:underline;cursor:pointer;padding:0;margin-top:4px;min-height:32px}'
    + '.ka-zit{margin:8px 0 0;padding:9px 12px;border-radius:10px;background:rgba(244,239,226,.05);font-size:13.5px;line-height:1.5;color:var(--ink);white-space:pre-wrap;overflow-wrap:anywhere}'
    + '.ka-dl{display:grid;grid-template-columns:96px minmax(0,1fr);gap:7px 12px;margin:12px 0 0;font-size:13.5px;line-height:1.45}.ka-dl dt{color:var(--ink-2)}.ka-dl dd{margin:0;overflow-wrap:anywhere}'
    + '.ka-notiz{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--ink-2);white-space:pre-wrap}'
    + '.ka-wege{display:flex;flex-direction:column;gap:8px;margin-top:12px}'
    + '.ka-weg{display:flex;flex-direction:column;gap:3px;padding:12px 14px;border:1px solid var(--line-2);border-radius:12px;text-decoration:none;color:var(--ink)}.ka-weg:hover{border-color:var(--accent);color:var(--ink)}'
    + '.ka-weg b{color:var(--accent);font-size:14.5px}.ka-weg span{font-size:13px;color:var(--ink-2);line-height:1.45}'
    + '.ka-tw{overflow-x:auto;margin-top:8px}.ka-tab{min-width:0!important;width:100%;border-collapse:collapse}'
    + '.ka-tab th{font-family:var(--fd);font-size:12px;letter-spacing:0;text-transform:none;font-weight:600;padding:6px 8px 8px 0}'
    + '.ka-tab td{padding:8px 8px 8px 0;font-size:13.5px}.ka-tab .z{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.ka-tab tr.gr td{padding-top:14px;font-weight:700;border-bottom:0}'
    + '.ka-bilder{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.ka-bilder figure{margin:0}'
    + '.ka-bilder img{width:100%;aspect-ratio:16/10;object-fit:contain;background:#fff;border-radius:10px;display:block}.ka-bilder figcaption{font-size:12.5px;color:var(--ink-2);margin-top:5px;line-height:1.4}'
    + '.ka-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}'
    + '.ka-ot{align-self:stretch;display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:1px solid var(--line-2);border-radius:12px;background:rgba(244,239,226,.03)}'
    + '.ka-ot.an{border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 9%,transparent)}'
    + '.ka-sw{position:relative;display:grid;grid-template-columns:46px minmax(0,1fr);gap:12px;align-items:start;cursor:pointer;min-height:44px}'
    + '.ka-sw input{position:absolute;left:0;top:0;width:46px;height:28px;margin:0;opacity:0;cursor:pointer}'
    + '.ka-sw i{position:relative;width:46px;height:28px;border-radius:999px;background:var(--line-2);transition:background .2s}'
    + '.ka-sw i::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#f4efe2;transition:transform .2s}'
    + '.ka-sw input:checked+i{background:var(--accent)}.ka-sw input:checked+i::after{transform:translateX(18px)}'
    + '.ka-sw input:focus-visible+i{outline:2px solid var(--accent);outline-offset:2px}.ka-sw input:disabled+i{opacity:.5}'
    + '.ka-sw b{display:block;font-size:14.5px;line-height:1.35;margin-top:3px}.ka-sw small{display:block;font-size:13px;line-height:1.5;color:var(--ink-2);margin-top:3px;text-wrap:pretty}'
    + '@media(max-width:560px){.ka-akopf{grid-template-columns:64px minmax(0,1fr);gap:14px}.ka-logo.gross{width:64px;height:64px;border-radius:14px}.ka-s{grid-template-columns:26px minmax(0,1fr) 26px;gap:10px;padding:12px}.ka-dl{grid-template-columns:minmax(0,1fr);gap:2px}.ka-dl dd{margin-bottom:6px}}';
  document.head.appendChild(css);

  /* ── Hilfen ── */
  function zeit(t) { if (!t) return ''; var d = new Date(t); return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'; }
  function tag(t) { return t ? new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' }) : ''; }
  function rufname(a) { var x = extraVon(a.firma); return (x && x.name) || String(a.vorname || '').split(' ')[0] || a.firma || 'der Kunde'; }
  function anrede(a) { var x = extraVon(a.firma); return (x && x.name) || String(a.vorname || '').split(' ')[0] || ''; }
  function gen(n) { return /[sßxz]$/i.test(n) ? n + '’' : n + 's'; }
  function istLive(a) { return (a.formulare || []).some(function (f) { return f.live; }); }
  function rest(a) { return a.test_bis ? Math.ceil((Date.parse(a.test_bis) - Date.now()) / 864e5) : null; }
  function knopf(was, text, haupt) { return '<button type="button" class="ka-b' + (haupt ? ' go' : '') + '" data-ka="' + was + '">' + esc(text) + '</button>'; }
  function fehlend(a) { return [['Vorname', a.vorname], ['Nachname', a.nachname], ['Telefon', a.telefon]].filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; }).join(', '); }
  function nummer(t) { t = String(t || '').replace(/[^\d+]/g, ''); if (/^\+/.test(t)) t = t.slice(1); else if (/^00/.test(t)) t = t.slice(2); else if (/^0/.test(t)) t = '49' + t.slice(1); return t.length >= 8 ? t : ''; }
  function ohneHttp(u) { return String(u || '').replace(/^https?:\/\//i, '').replace(/\/$/, ''); }
  function formLink(s) { return api().replace(/\/api\/?$/, '') + '/share.html?w=' + encodeURIComponent(s); }
  function slugVon(f) { return String(f || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'betrieb'; }
  /* Art des Formulars aus kunden/akten.js: Anfrage-Formular (seiten, z. B. Speckrausch) oder Terminbuchung (Kate, Amar). Ohne Eintrag: '' */
  function artVon(a) { var x = extraVon(a.firma), f = x && x.formular; return f ? (f.seiten ? 'anfrage' : 'termin') : ''; }
  /* Link für den Online-Test. Im Beispiel die Vorschau aus verkaufsslides/inhaltsverzeichnis.html (formular.v in kunden/akten.js). */
  function testLink(a) { var f0 = (a.formulare || [])[0], x = extraVon(a.firma), v = x && x.formular && x.formular.v; return BSP ? (v ? 'verkaufsslides/inhaltsverzeichnis.html?v=' + encodeURIComponent(v) : '') : f0 ? formLink(f0.slug) : ''; }
  function waLink(a) { var n = anrede(a), t = artVon(a); return 'https://wa.me/' + nummer(a.telefon) + '?text=' + encodeURIComponent('Hallo' + (n ? ' ' + n : '') + ', ich habe dir ' + (t === 'anfrage' ? 'dein Online-Anfrageformular' : t === 'termin' ? 'deine Online-Terminanfrage' : 'dein Online-Formular') + ' gebaut. Hier geht es los, dauert 2 Minuten: ' + a.link); }
  function kopieren(v) { return (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('Link kopiert'); }, function () { prompt('Link kopieren:', v); }); }

  /* ── Checkliste ── */
  /* Online-Test (seit 10.10.2026) im Schritt „Bearbeiten und testen“ */
  function onlineHTML(a, N, hatF) {
    if (!hatF) return '';
    var S = a.schritte || {}, ot = !!S.online_test, tl = testLink(a);
    return '<div class="ka-ot' + (ot ? ' an' : '') + '"><label class="ka-sw"><input type="checkbox" role="switch" data-ka="online"' + (ot ? ' checked' : '') + '><i aria-hidden="true"></i><span><b>Formular online testen</b><small>'
      + (ot ? 'An seit ' + esc(zeit(S.online_test)) + '. Das Formular ist über den echten Link erreichbar, auch ohne bestätigte E-Mail-Adresse. Jede Anfrage kommt in ' + esc(gen(N)) + ' Cockpit an. Der Haken unten schaltet es wieder aus und löscht Ihre Test-Anfragen.'
        : 'Schaltet das Formular für Ihren eigenen Test ein, ohne E-Mail-Bestätigung. Sie öffnen den echten Link am Handy und schicken eine Anfrage. Mit dem Haken unten ist es wieder aus, und ' + esc(N) + ' muss die eigene E-Mail-Adresse bestätigen, bevor es angeht.')
      + '</small></span></label>'
      + (ot && tl ? '<div class="ka-kn"><a class="ka-b" href="' + esc(tl) + '" target="_blank" rel="noopener" data-ka="otauf">Formular öffnen</a>' + knopf('otkopie', 'Link kopieren') + '</div>' + (BSP ? '' : '<p class="ka-link">' + esc(tl) + '</p>') : '')
      + '</div>';
  }
  function schritteEinladung(a) {
    var S = a.schritte || {}, N = rufname(a), ein = !!a.eingeloest_am, vg = !!a.vorgemerkt;
    var g = !!S.geprueft, hatF = (a.formulare || []).length > 0, angaben = !!(a.vorname && a.nachname && a.telefon);
    var o = S.geoeffnet || (ein ? a.eingeloest_am : null), an = istLive(a), gesehen = S.formular || S.probe || null;
    var n = +a.anfragen_seit_start || 0, rm = a.rueckmeldungen || [], rmN = +a.rm_n || rm.length, r = rest(a), fertig = ein && !a.test_bis;
    var FV = Array.isArray(S.fehlversuche) ? S.fehlversuche : [];   // seit 10.10.2026, lib/einladung.js
    var L = [];
    L.push(vg
      ? { id: 'vorgebaut', wer: 'sie', h: 'Konto vorbauen', ok: false, p: 'Angaben und Datenschutz-Link sind schon eingetragen. Danach steht hier ' + gen(N) + ' Konto.', akt: knopf('vorbauen', 'Jetzt vorbauen', 1) }
      : { id: 'vorgebaut', wer: 'sie', h: 'Konto vorgebaut', ok: true, am: a.seit, p: 'Angelegt am ' + tag(a.seit) + '.' });
    var sub = [[hatF, hatF ? 'Formular gespeichert: ' + (a.formulare || []).map(function (f) { return f.name || f.slug; }).join(', ') : 'Noch kein Formular gespeichert'], [angaben, angaben ? 'Vorname, Nachname und Telefon stehen drin' : 'Fehlt im Cockpit unter Einstellungen: ' + fehlend(a)]];
    var fx = extraVon(a.firma), fertigF = !!(fx && fx.formular);
    if ('datenschutz_url' in a) sub.push([!!a.datenschutz_url, a.datenschutz_url ? 'Datenschutz-Link steht drin' : 'Datenschutz-Link fehlt (Cockpit → Einstellungen)']);
    L.push({ id: 'geprueft', wer: 'sie', nur: 1, h: 'Bearbeiten und testen', ok: g || ein, am: S.geprueft,
      p: g ? 'Geprüft und getestet am ' + zeit(S.geprueft) + '. So bekommt es ' + N + '.'
        : ein ? 'Übersprungen: ' + N + ' hat das Konto schon übernommen.'
        : !hatF && fertigF ? 'Das Formular, das wir für ' + N + ' gebaut haben, kommt mit einem Tipp ins Konto: ganzes Angebot, Bild, Text und Farben. Danach öffnet sich ' + gen(N) + ' Cockpit, noch ohne Anfragen. Ändern lässt es sich jederzeit im Konfigurator.'
        : 'Öffnet das echte Konto in einem neuen Tab. Das ist keine Testumgebung: Was Sie dort ändern und speichern, gilt sofort, auch für ' + N + '. Auf diesem Gerät sind Sie danach im Cockpit als ' + (a.firma || 'dieser Betrieb') + ' angemeldet.',
      sub: g || ein || vg ? null : sub,
      gesperrt: vg ? 'Erst das Konto vorbauen.' : '',
      akt: (!hatF && fertigF
        ? '<div class="ka-kn">' + knopf('einsetzen', 'Fertiges Formular einsetzen', 1) + '</div>'
        : '<div class="ka-kn">' + knopf('bauen', 'Cockpit öffnen und testen', 1) + (hatF ? knopf('konfig', 'Im Konfigurator ändern') : '') + (hatF && fertigF ? knopf('abgleichen', 'Mit der Akte abgleichen') : '') + '</div>')
        + onlineHTML(a, N, hatF)
        + '<label class="ka-haken"><input type="checkbox" data-ka="geprueft"' + (hatF ? '' : ' disabled') + '><span>Alles geprüft und getestet?</span></label>',
      rueck: g && !ein ? 'geprueft' : '' });
    var vx = vxVon(a), vsWeiter = !!(S.versendet || o || ein);
    L.push({ id: 'vorschau', wer: 'sie', h: 'Vorschau senden (24 Stunden)', ok: !!S.vorschau || vsWeiter, am: S.vorschau,
      p: S.vorschau ? 'Verschickt am ' + zeit(S.vorschau) + '. Der Link galt 24 Stunden.' : vsWeiter ? 'Übersprungen.' : 'Sein Formular und ein Beispiel-Cockpit zum Ansehen, ohne Zugang. Eine Testanfrage erscheint sofort im Cockpit. Nach 24 Stunden geht der Link nicht mehr. Freiwillig, danach kommt die Erstversendung.',
      gesperrt: vx ? '' : 'Dafür braucht der Betrieb ein fertiges Formular in kunden/akten.js.',
      akt: vx && !S.vorschau && !vsWeiter ? vsVersand(a) : '',
      rueck: S.vorschau && !vsWeiter ? 'vorschau' : '' });
    L.push({ id: 'versendet', wer: 'sie', h: 'Erstversendung', ok: !!(S.versendet || o), am: S.versendet,
      p: S.versendet ? 'Verschickt am ' + zeit(S.versendet) + (S.versendet_wie === 'whatsapp' ? ' per WhatsApp.' : '.') : o ? 'Der Link ist angekommen.' : 'Den Einladungs-Link per WhatsApp an ' + N + ' schicken. Danach fragt die Seite, ob er wirklich raus ist.',
      gesperrt: vg || !g ? 'Erst bearbeiten und testen (Schritt 2).' : '',
      akt: versand(a),
      rueck: S.versendet && !o ? 'versendet' : '' });
    L.push({ id: 'geoeffnet', wer: 'kunde', h: 'Link geöffnet', ok: !!o, am: o,
      p: o ? 'Geöffnet am ' + zeit(o) + (S.aufrufe > 1 ? ', insgesamt ' + S.aufrufe + '-mal' + (S.zuletzt ? ', zuletzt am ' + zeit(S.zuletzt) : '') : '') + '.'
        : 'Sobald ' + N + ' auf den Link tippt, steht es hier, und Sie bekommen eine Mitteilung.' });
    L.push({ id: 'zugang', wer: 'kunde', h: 'E-Mail und Passwort angelegt', ok: ein, am: a.eingeloest_am,
      p: ein ? 'Am ' + zeit(a.eingeloest_am) + '. Seitdem läuft der Test, und nur noch ' + N + ' kommt in das Konto.' : N + ' trägt die eigene E-Mail-Adresse und ein Passwort ein. Ab dann läuft der Test 14 Tage.',
      sub: ein ? [[null, 'E-Mail: ' + a.email], [null, 'Passwort: •••••••• (selbst gewählt, für Sie nicht sichtbar)']].concat(FV.length ? [[null, 'Vorher ' + FV.length + (FV.length === 1 ? ' Fehlversuch' : ' Fehlversuche')]] : [])
        : FV.length ? FV.slice(-3).reverse().map(function (f) { return [false, 'Fehlversuch am ' + zeit(f.am) + ': ' + f.grund + (f.email ? ' (' + f.email + ')' : '')]; }).concat(FV.length > 3 ? [[null, 'Insgesamt ' + FV.length + ' Fehlversuche']] : []) : null,
      warn: ein && a.eigen ? '<p>Das ist Ihre eigene Test-Adresse. Bevor ' + esc(N) + ' den Link bekommt: Einladung zurücksetzen. Formular und Angaben bleiben, es gibt einen neuen Link.</p>' + knopf('zuruecksetzen', 'Einladung zurücksetzen') : '' });
    L.push({ id: 'bestaetigt', wer: 'kunde', h: 'E-Mail-Adresse bestätigt', ok: ein && !!a.bestaetigt, am: S.bestaetigt || null,
      p: ein && a.bestaetigt ? 'Bestätigt. Dorthin gehen die Anfragen.' : 'Nach dem Anlegen kommt eine Mail mit einem Link. Ohne Bestätigung lässt sich das Formular nicht einschalten.',
      akt: ein && !a.bestaetigt ? '<div class="ka-kn">' + knopf('mail', 'Bestätigungs-Mail noch einmal senden') + '</div>' : '' });
    L.push({ id: 'formular', wer: 'kunde', h: 'Formular angesehen und eingeschaltet', ok: ein && an, am: S.live,
      p: ein && an ? 'Ab jetzt sind die Anfragen echt.' : 'Im Cockpit oben rechts sitzt der grüne Schalter „Live schalten“.',
      sub: ein ? [[!!gesehen, gesehen ? 'Formular angesehen am ' + zeit(gesehen) : 'Formular angesehen: noch nicht gemeldet'], [an, an ? 'Eingeschaltet' + (S.live ? ' am ' + zeit(S.live) : '') : 'Eingeschaltet: noch nicht']] : null });
    L.push({ id: 'home', wer: 'kunde', h: 'Cockpit auf dem Home-Bildschirm', ok: !!S.home, am: S.home,
      p: S.home ? 'Seit ' + zeit(S.home) + '.' : 'Meldet ' + gen(N) + ' Gerät, sobald das Cockpit als App auf dem Home-Bildschirm liegt.',
      sub: ein && 'mitteilungen' in a ? [[a.mitteilungen > 0, a.mitteilungen ? 'Mitteilungen an, auf ' + a.mitteilungen + (a.mitteilungen === 1 ? ' Gerät' : ' Geräten') : 'Mitteilungen: noch aus']] : null });
    L.push({ id: 'probe', wer: 'kunde', h: 'Selbst eine Anfrage geschickt', ok: n > 0, am: a.erste_anfrage,
      p: n ? (a.erste_anfrage ? 'Erste Anfrage am ' + zeit(a.erste_anfrage) + '. ' : '') + n + (n === 1 ? ' Anfrage' : ' Anfragen') + ' seit dem Start.' : N + ' füllt das Formular einmal selbst aus. Zählt, sobald die Anfrage im Cockpit ankommt.' });
    L.push({ id: 'teilen', wer: 'kunde', h: 'Bekannte testen lassen', ok: !!S.teilen || n >= 2, am: S.teilen,
      p: (S.teilen ? 'Weitergeschickt am ' + zeit(S.teilen) + '. ' : '') + (n >= 2 ? n + ' Anfragen seit dem Start.' : S.teilen ? 'Die Anfragen der Bekannten zählen hier mit.' : artVon(a) === 'anfrage' ? 'Zwei, drei Bekannte schicken einmal eine Anfrage. Diese Anfragen sind echt.' : 'Zwei, drei Bekannte fragen einmal einen Termin an. Diese Anfragen sind echt.') });
    L.push({ id: 'rueckmeldung', wer: 'kunde', h: 'Rückmeldung an Sie', ok: rmN > 0, am: rm[0] && rm[0].am,
      p: rmN ? (rmN === 1 ? 'Eine Rückmeldung' : rmN + ' Rückmeldungen') + (rm[0] ? ', zuletzt am ' + zeit(rm[0].am) + ':' : '.') : 'Im Cockpit steht „Rückmeldung an Manuel“. Sie kommt bei Ihnen als Mitteilung und Mail an.',
      zitat: rm[0] ? rm[0].text : '' });
    L.push({ id: 'entscheidung', wer: 'sie', h: 'Nach dem Test: echtes Konto', ok: fertig, am: fertig ? a.pilot_seit : null,
      p: fertig ? (a.pilot_seit ? 'Echtes Konto, Pilotbetrieb seit ' + tag(a.pilot_seit) + ': kostenlos bis zum Verkaufsstart, danach 40 % Rabatt.' : 'Echtes Konto ohne Testablauf.')
        : !ein ? 'Der Test dauert 14 Tage ab dem Anlegen des Zugangs. Zwei Tage vor dem Ende kommt eine Erinnerung.'
        : r > 0 ? 'Der Test läuft noch ' + r + (r === 1 ? ' Tag' : ' Tage') + ', bis ' + tag(a.test_bis) + '. Zwei Tage vor dem Ende kommt eine Erinnerung.'
        : 'Der Test ist am ' + tag(a.test_bis) + ' abgelaufen. Das Formular auf der Website ist aus, das Cockpit bleibt offen.',
      gesperrt: !ein ? 'Erst wenn ' + N + ' den Zugang angelegt hat.' : '',
      akt: '<div class="ka-kn">' + knopf('ueberfuehren', 'In echtes Konto überführen', 1) + knopf('verlaengern', '+ 14 Tage') + '</div>' });
    return L;
  }
  function schritteNormal(a) {
    var an = istLive(a), fs = a.formulare || [], n = +a.anfragen || 0, bek = 'anfragen' in a;
    return [
      { id: 'konto', wer: 'kunde', h: 'Konto angelegt', ok: true, am: a.seit, p: 'Am ' + zeit(a.seit) + '.' },
      { id: 'bestaetigt', wer: 'kunde', h: 'E-Mail-Adresse bestätigt', ok: !!a.bestaetigt, p: a.bestaetigt ? 'Bestätigt. Dorthin gehen die Anfragen.' : 'Ohne Bestätigung lässt sich das Formular nicht einschalten.', akt: a.bestaetigt ? '' : '<div class="ka-kn">' + knopf('mail', 'Bestätigungs-Mail noch einmal senden') + '</div>' },
      { id: 'gebaut', wer: 'kunde', h: 'Formular gespeichert', ok: fs.length > 0, p: fs.length ? fs.map(function (f) { return f.name || f.slug; }).join(', ') : 'Noch kein Formular gespeichert.' },
      { id: 'live', wer: 'kunde', h: 'Formular eingeschaltet', ok: an, p: an ? 'Die Anfragen sind echt.' : 'Noch aus.' },
      { id: 'anfrage', wer: 'kunde', h: 'Erste Anfrage', ok: bek && n > 0, p: bek ? (n ? n + (n === 1 ? ' Anfrage' : ' Anfragen') + ' insgesamt.' : 'Noch keine.') : '' }
    ];
  }
  function schritte(a) { return a.einladung || a.vorgemerkt ? schritteEinladung(a) : schritteNormal(a); }
  function offenErst(a) { return schritte(a).filter(function (s) { return !s.ok; })[0] || null; }
  function okMenge(a) { var m = {}; schritte(a).forEach(function (s) { if (s.ok) m[s.id] = s.h; }); return m; }
  function stand(a) {
    if (a.vorgemerkt) return ['Konto noch nicht vorgebaut', 'warn'];
    if ((a.papierkorb || []).length && !(a.formulare || []).length) return ['Formular im Papierkorb', 'bad'];
    if (a.komplett) return ['Komplett gesperrt', 'bad'];
    if (a.einladung) {
      var j = offenErst(a), r = rest(a);
      if (!j) return ['Echtes Konto' + (a.pilot_seit ? ' · Pilotbetrieb' : ''), 'gut'];
      var T = { geprueft: (a.schritte || {}).online_test ? 'Vorgebaut · Online-Test läuft' : 'Vorgebaut · bearbeiten und testen', versendet: 'Geprüft · Link verschicken', geoeffnet: 'Link verschickt · noch nicht geöffnet', zugang: 'Link geöffnet · Zugang fehlt noch', bestaetigt: 'Zugang angelegt · E-Mail noch nicht bestätigt', formular: 'E-Mail bestätigt · Formular noch aus' };
      return [T[j.id] || (r === null ? 'Test läuft' : r > 0 ? 'Test läuft · noch ' + r + (r === 1 ? ' Tag' : ' Tage') : 'Test abgelaufen'), j.wer === 'sie' ? 'warn' : ''];
    }
    if (a.gesperrt) return ['Formular gesperrt', 'bad'];
    if (a.status === 'aktiv') return ['Kunde · ' + (a.plan || 'zahlt'), 'gut'];
    if (istLive(a)) return [(a.pilot_seit ? 'Pilotbetrieb · ' : '') + 'Formular live', 'gut'];
    if ((a.formulare || []).length) return ['Formular gebaut, noch aus', ''];
    return [a.bestaetigt ? 'Konto angelegt' : 'Konto angelegt · E-Mail unbestätigt', ''];
  }

  /* ── Daten ── */
  function vorgemerkt(x) {
    var v = x.vorbauen || {};
    return { id: 'vm-' + norm(x.firma), vorgemerkt: true, firma: x.firma, vorname: v.vorname || '', nachname: v.nachname || '', telefon: v.telefon || '', website: v.website || '', strasse: v.strasse || '', plz_ort: v.plz_ort || '', datenschutz_url: v.datenschutz_url || '', schritte: {}, formulare: [] };
  }
  function rang(a) { if (a.vorgemerkt) return 0; if (!a.einladung) return 3; var j = offenErst(a); return !j ? 3 : j.wer === 'sie' ? 1 : 2; }
  function alle() {
    var l = (LISTE || []).slice(), da = {};
    l.forEach(function (a) { da[norm(a.firma)] = 1; });
    extras().forEach(function (x) { if (x.vorbauen && !da[norm(x.firma)]) l.push(vorgemerkt(x)); });
    return l.sort(function (a, b) { return rang(a) - rang(b) || String(b.seit || '').localeCompare(String(a.seit || '')); });
  }
  function finden(id) { return alle().filter(function (x) { return x.id === id; })[0] || null; }
  function aktuell() { return OFFEN ? (AKTE && AKTE.id === OFFEN ? AKTE : finden(OFFEN)) : null; }
  function fehlerText(e) {
    var m = (e && e.message) || '';
    return /E-Mail fehlt|Unbekannte|unbekannt/.test(m) ? 'Die Kundenübersicht braucht den neuen Stand auf dem Server: lib/konto-admin.js bei GitHub und sql/68 in Supabase. Bis dahin stehen hier nur die vorgemerkten Betriebe.' : (m || 'Server nicht erreichbar.');
  }
  function listeLaden() {
    if (BSP) { if (!LISTE) LISTE = beispiel(); ZEIT = Date.now(); zeichnen(); return; }
    if (!k() || LAEDT & 1) return;
    LAEDT |= 1;
    aktion('akten').then(function (j) {
      LAEDT &= ~1; LISTE = j.akten || []; ZEIT = STAND = Date.now(); FEHLER = '';
      /* Gerade vorgebaut: gleich die Akte des neuen Kontos zeigen */
      if (/^vm-/.test(OFFEN)) { var n = OFFEN.slice(3), neu = LISTE.filter(function (a) { return norm(a.firma) === n; })[0]; if (neu) { oeffnen(neu.id, true); return; } }
      zeichnen();
    }).catch(function (e) { LAEDT &= ~1; ZEIT = Date.now(); FEHLER = fehlerText(e); zeichnen(); });
  }
  function akteLaden() {
    var id = OFFEN;
    if (!id || /^vm-/.test(id)) return;
    if (BSP) { AKTE = finden(id); zeichnen(); return; }
    if (!k() || LAEDT & 2) return;
    LAEDT |= 2;
    aktion('akte', { id: id }).then(function (j) {
      LAEDT &= ~2; if (OFFEN !== id || !j.akte) return;
      FEHLER = ''; STAND = Date.now(); uebernehmen(j.akte);
    }).catch(function (e) {
      LAEDT &= ~2; if (OFFEN !== id) return;
      if (/Kein Konto/.test((e && e.message) || '')) { toast('Dieses Konto gibt es nicht mehr.'); oeffnen(''); listeLaden(); return; }
      FEHLER = fehlerText(e); zeichnen();
    });
  }
  function uebernehmen(a) {
    var alt = AKTE && AKTE.id === a.id ? okMenge(AKTE) : null;
    AKTE = a;
    if (LISTE) LISTE = LISTE.map(function (x) { return x.id === a.id ? a : x; });
    if (alt) { var neu = okMenge(a); Object.keys(neu).forEach(function (id) { if (!alt[id]) toast(rufname(a) + ': ' + neu[id] + ' ✓'); }); }
    zeichnen();
  }

  /* ── Zeichnen ── */
  function logoHTML(a, x, gross) {
    var c = 'ka-logo' + (gross ? ' gross' : '');
    if (x && x.logo) return '<span class="' + c + '"' + (x.logo_grund ? ' style="background:' + esc(x.logo_grund) + '"' : '') + '><img src="' + esc(x.logo) + '" alt="" loading="lazy"></span>';
    var t = String(a.firma || a.email || '?').split(/[\s@.&+-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    return '<span class="' + c + ' ini" aria-hidden="true">' + esc(t) + '</span>';
  }
  function kurz(a, x) {
    if (x && x.kurz) return x.kurz;
    var ort = String(a.plz_ort || '').replace(/^\s*\d{4,5}\s*/, ''), f = (a.formulare || [])[0];
    return [f && f.name, ort].filter(Boolean).join(' · ') || (a.intern ? 'Vorgebaut' : a.email || '');
  }
  function karteHTML(a) {
    var x = extraVon(a.firma), st = stand(a), mit = a.einladung || a.vorgemerkt, L = mit ? schritte(a) : null, j = mit ? offenErst(a) : null;
    var dran = j ? (j.wer === 'sie' ? '<span class="ka-dran sie">Sie sind dran</span>' : '<span class="ka-dran">Wartet auf ' + esc(rufname(a)) + '</span>') : '';
    return '<button type="button" class="ka-karte" data-akte="' + esc(a.id) + '">' + logoHTML(a, x)
      + '<span class="ka-kt"><b>' + esc(a.firma || a.email) + '</b><span>' + esc(kurz(a, x)) + '</span><span class="ka-st' + (st[1] === 'gut' || st[1] === 'bad' ? ' ' + st[1] : '') + '">' + esc(st[0]) + '</span>' + dran + '</span>'
      + (L ? '<span class="ka-fort" title="Schritte erledigt">' + L.filter(function (s) { return s.ok; }).length + '/' + L.length + '</span>' : '') + '</button>';
  }
  function bspLeiste() { var a = BSP && OFFEN ? aktuell() : null; return BSP ? '<div class="ka-bsp"><span>Beispieldaten. Nichts wird gespeichert oder verschickt.</span>' + knopf('sim', 'Nächsten Schritt von ' + (a && a.einladung ? rufname(a) : 'Kate') + ' durchspielen') + '</div>' : ''; }
  function uebersichtHTML() {
    var h = bspLeiste() + (FEHLER ? '<p class="ka-msg bad">' + esc(FEHLER) + '</p>' : '');
    if (!LISTE && !FEHLER) return h + '<p class="leer">Wird geladen …</p>';
    var l = alle();
    if (!l.length) return h + '<p class="leer">Noch keine Kunden. Jedes neue Konto erscheint hier von selbst, ob vorgebaut oder selbst angemeldet.</p>';
    return h + '<div class="ka-liste">' + l.map(karteHTML).join('') + '</div>';
  }
  /* Vorschau für 24 Stunden (seit 13.10.2026, vorschau.html): sein Formular und ein Beispiel-Cockpit, ohne Zugang. Eine Testanfrage erscheint sofort im Cockpit.
     Der Ablauf steht im Link (bis) und wird im Browser geprüft, k ist eine Prüfsumme gegen versehentliches Ändern. */
  var VS_FRAGE = '', VS_BIS = {};
  function pz(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function vxVon(a) { var x = extraVon(a.firma); return (x && x.formular && x.formular.v) || ''; }
  function vsLink(a) { var v = vxVon(a), bis = VS_BIS[a.id] || (VS_BIS[a.id] = Date.now() + 864e5); return (BSP ? '' : 'https://clickzauber.de/') + 'vorschau.html?v=' + encodeURIComponent(v) + '&bis=' + bis + '&k=' + pz(v + '|' + bis + '|clickzauber'); }
  function vsWa(a) { var n = anrede(a); return 'https://wa.me/' + nummer(a.telefon) + '?text=' + encodeURIComponent('Hallo' + (n ? ' ' + n : '') + ', ich habe dir dein Formular und dein Cockpit gebaut. Schau es dir in Ruhe an, der Link gilt 24 Stunden:\n' + vsLink(a) + '\nSchick ruhig eine Testanfrage ab, sie erscheint sofort in deinem Cockpit.'); }
  function vsVersand(a) {
    var N = rufname(a);
    if (VS_FRAGE === a.id) return '<div class="ka-frage" role="group" aria-label="Rückfrage"><b>Haben Sie die Vorschau an ' + esc(N) + ' geschickt?</b><div class="ka-kn">' + knopf('vsja', 'Ja, verschickt', 1) + knopf('vsnein', 'Noch nicht') + '</div></div>';
    return '<div class="ka-kn"><a class="ka-b go" data-ka="vswa" href="' + esc(BSP ? '#' : vsWa(a)) + '" target="_blank" rel="noopener">Per WhatsApp an ' + esc(N) + '</a>' + knopf('vskopie', 'Link kopieren') + '<a class="ka-b" href="' + esc(vsLink(a)) + '" target="_blank" rel="noopener">Selbst ansehen</a></div>';
  }
  function versand(a) {
    var N = rufname(a);
    if (!a.link) return '<div class="ka-kn">' + knopf('link', 'Einladungs-Link holen', 1) + '</div>';
    if (FRAGE === a.id) return '<div class="ka-frage" role="group" aria-label="Rückfrage"><b>Haben Sie den Link an ' + esc(N) + ' geschickt?</b><span>Ab dann meldet die Checkliste, wenn ' + esc(N) + ' ihn öffnet.</span><div class="ka-kn">' + knopf('ja', 'Ja, verschickt', 1) + knopf('nein', 'Noch nicht') + '</div></div>';
    return '<div class="ka-kn"><a class="ka-b go" data-ka="wa" href="' + esc(BSP ? '#' : waLink(a)) + '" target="_blank" rel="noopener">Per WhatsApp an ' + esc(N) + '</a>' + knopf('kopie', 'Link kopieren') + '</div><p class="ka-link">' + esc(a.link) + '</p>';
  }
  function schrittHTML(s, i, jetzt, N) {
    var zu = !s.ok && !!s.gesperrt, cls = 'ka-s' + (s.ok ? ' ok' : jetzt && !zu ? ' jetzt' : '') + (zu ? ' zu' : '');
    var wer = s.wer === 'sie' ? (s.nur ? 'Nur Sie' : jetzt && !s.ok ? 'Sie sind dran' : 'Sie') : (jetzt && !s.ok ? 'Wartet auf ' + N : N + ', meldet sich selbst');
    return '<li class="' + cls + '"><span class="ka-n">' + (i + 1) + '</span><div class="ka-sb">'
      + '<div class="ka-st1"><h3>' + esc(s.h) + '</h3><span class="ka-wer' + (s.wer === 'sie' ? ' sie' : '') + '">' + esc(wer) + '</span></div>'
      + (s.p ? '<p>' + esc(s.p) + '</p>' : '')
      + (s.sub ? '<ul class="ka-sub">' + s.sub.map(function (z) { return '<li class="' + (z[0] === true ? 'ja' : z[0] === false ? 'nein' : 'info') + '">' + esc(z[1]) + '</li>'; }).join('') + '</ul>' : '')
      + (s.zitat ? '<blockquote class="ka-zit">' + esc(s.zitat) + '</blockquote>' : '')
      + (zu ? '<p class="ka-zu">' + esc(s.gesperrt) + '</p>' : '')
      + (!s.ok && !zu && s.akt ? '<div class="ka-akt">' + s.akt + '</div>' : '')
      + (s.warn ? '<div class="ka-warn">' + s.warn + '</div>' : '')
      + (s.ok && s.rueck ? '<button type="button" class="ka-rueck" data-ka="rueck" data-was="' + s.rueck + '">Haken zurücknehmen</button>' : '')
      + '</div><span class="ka-ende">' + (s.ok ? HAKEN + '<span class="ka-sr">erledigt</span>' : '') + '</span></li>';
  }
  function kopfAktionen(a) {
    if (a.vorgemerkt) return '<div class="ka-kopfakt">' + knopf('vorbauen', 'Jetzt vorbauen', 1) + '</div>';
    var f = (a.formulare || [])[0], t = [];
    if (a.einladung && !a.eingeloest_am) { t.push(knopf('bauen', 'Konto öffnen')); if (f) t.push(knopf('konfig', 'Konfigurator')); }
    else if (f) t.push('<a class="ka-b" href="clickzauber-cockpit-live.html?admin=1&amp;widget=' + encodeURIComponent(f.slug) + '" target="_blank" rel="noopener">Cockpit ansehen</a>');
    t.push(knopf('verwalten', 'Konto verwalten'));
    return '<div class="ka-kopfakt">' + t.join('') + '</div>';
  }
  function kontaktHTML(a, x) {
    var z = [], name = [a.vorname, a.nachname].filter(Boolean).join(' '), adr = [a.strasse, a.plz_ort].filter(Boolean).join(', '), nr = nummer(a.telefon);
    if (name) z.push(['Name', esc(name)]);
    if (adr) z.push(['Adresse', esc(adr)]);
    if (a.telefon) z.push(['Telefon', '<a href="tel:' + esc(String(a.telefon).replace(/[^\d+]/g, '')) + '">' + esc(a.telefon) + '</a>' + (nr ? ' · <a href="https://wa.me/' + nr + '" target="_blank" rel="noopener">WhatsApp</a>' : '')]);
    if (x && x.email) z.push(['E-Mail', '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>']);
    if (a.intern) z.push(['Zugang', 'noch keiner, das Konto ist vorgebaut']);
    else if (!a.vorgemerkt && a.email && !(x && x.email && x.email.toLowerCase() === String(a.email).toLowerCase())) z.push(['Zugang', esc(a.email)]);
    // Seit 15.10.2026 nur echte Web-Adressen als Link: Website und Datenschutz-Link trägt der Kunde selbst ein, „javascript:…“ würde hier mit dem Betreiber-Schlüssel laufen.
    var web = function (u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(u) ? 'https://' + u : ''; };
    if (a.website) z.push(['Website', web(a.website) ? '<a href="' + esc(web(a.website)) + '" target="_blank" rel="noopener">' + esc(ohneHttp(a.website)) + '</a>' : esc(a.website)]);
    if (a.datenschutz_url) z.push(['Datenschutz', web(a.datenschutz_url) ? '<a href="' + esc(web(a.datenschutz_url)) + '" target="_blank" rel="noopener">' + esc(ohneHttp(a.datenschutz_url)) + '</a>' : esc(a.datenschutz_url)]);
    if (x && x.ust) z.push(['USt-IdNr.', esc(x.ust)]);
    var notiz = a.vorgemerkt ? '' : '<div class="ka-notiz"><span>' + (a.notiz ? esc(a.notiz) : 'Noch keine Notiz. Sie sieht nur der Betreiber.') + '</span>' + knopf('notiz', a.notiz ? 'Notiz ändern' : 'Notiz anlegen') + '</div>';
    return '<section class="card"><h2>Kontakt</h2>' + (z.length ? '<dl class="ka-dl">' + z.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' : '<p class="cs">Noch keine Angaben.</p>') + notiz + '</section>';
  }
  function zeigenHTML(a, x) {
    var w = (x && x.zeigen) || [], f = (a.formulare || []).filter(function (y) { return y.live; })[0];
    var t = w.map(function (z) { return '<a class="ka-weg" href="' + esc(z[1]) + '" target="_blank" rel="noopener"><b>' + esc(z[0]) + '</b><span>' + esc(z[2]) + '</span></a>'; });
    /* Seit 17.10.2026: Abgleich auch nach dem Einlösen erreichbar (in der Checkliste ist „Bearbeiten und testen“ dann zu). */
    if ((a.formulare || []).length && x && x.formular) t.unshift('<div class="ka-weg"><b>Formular aktualisieren</b><span>Übernimmt Logo, Farben und Leistungen mit Preisen aus der Akte ins echte Formular und ins Cockpit. Link und Mitarbeiter bleiben, live bleibt live.</span><div class="ka-kn" style="margin-top:10px">' + knopf('abgleichen', 'Mit der Akte abgleichen', 1) + '</div></div>');
    if (f) t.unshift('<a class="ka-weg" href="' + esc(formLink(f.slug)) + '" target="_blank" rel="noopener"><b>Echtes Formular</b><span>' + ((a.schritte || {}).online_test && !a.eingeloest_am ? 'Online-Test läuft. Was Sie hier abschicken, kommt im Cockpit an und wird mit dem Haken „Alles geprüft und getestet?“ gelöscht.' : 'Eingeschaltet. Jede Anfrage darüber ist echt.') + '</span></a>');
    return t.length ? '<section class="card"><h2>Zum Zeigen</h2><div class="ka-wege">' + t.join('') + '</div></section>' : '';
  }
  function angebotHTML(x) {
    if (!x || !x.angebot || !x.angebot.length) return '';
    return '<section class="card"><h2>Angebot</h2><div class="ka-tw"><table class="ka-tab"><thead><tr><th>Leistung</th><th class="z">' + esc(x.angebot_spalte || 'Dauer') + '</th><th class="z">Preis</th></tr></thead><tbody>'
      + x.angebot.map(function (g) { return '<tr class="gr"><td colspan="3">' + esc(g[0]) + '</td></tr>' + g[1].map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="z">' + esc(r[1]) + '</td><td class="z">' + esc(r[2]) + '</td></tr>'; }).join(''); }).join('')
      + '</tbody></table></div>' + (x.angebot_hinweis ? '<p class="cs" style="margin:10px 0 0">' + esc(x.angebot_hinweis) + '</p>' : '') + '</section>';
  }
  function bilderHTML(x) {
    if (!x || !x.bilder || !x.bilder.length) return '';
    return '<section class="card"><h2>Bilder</h2><div class="ka-bilder">' + x.bilder.map(function (b) { return '<figure><img src="' + esc(b[0]) + '" alt="" loading="lazy"><figcaption>' + esc(b[1]) + '</figcaption></figure>'; }).join('') + '</div></section>';
  }
  /* Papierkorb (seit 21.10.2026, lib/widget-loeschen.js): gelöschte Formulare 30 Tage zurückholbar. */
  function papierkorbHTML(a) {
    var p = a.papierkorb || []; if (!p.length) return '';
    return '<section class="card" style="border-color:#a8442f"><h2>Formular im Papierkorb</h2>' + p.map(function (f) {
      return '<p class="cs">„' + esc(f.name) + '“ wurde am ' + esc(tag(f.am)) + ' gelöscht und ist nicht auf der Website. Anfragen und Termine sind noch da. Endgültig weg am ' + esc(tag(f.bis)) + '.</p>'
        + '<div class="akt"><button type="button" class="ka-b go" data-ka="pk-zurueck" data-slug="' + esc(f.slug) + '">Zurückholen</button></div>';
    }).join('') + '</section>';
  }
  function pkZurueck(a, el) {
    var slug = el.getAttribute('data-slug'), f = (a.papierkorb || []).filter(function (x) { return x.slug === slug; })[0]; if (!f) return;
    var fertig = function (live) {
      a.papierkorb = (a.papierkorb || []).filter(function (x) { return x.slug !== slug; });
      a.formulare = (a.formulare || []).concat([{ slug: slug, name: f.name, live: live }]);
      zeichnen(true); toast(live ? 'Zurückgeholt. Das Formular läuft wieder auf der Website.' : 'Zurückgeholt. Es ist ein Entwurf und muss im Cockpit live geschaltet werden.');
    };
    if (BSP) { fertig(true); return; }
    el.disabled = true;
    fetch(api() + '/widget-loeschen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: k(), widget: slug, aktion: 'zurueck' }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.hinweis || j.error || 'Hat nicht geklappt.'); fertig(j.status === 'live'); })
      .catch(function (e) { el.disabled = false; fehlerToast(e); });
  }
  function akteHTML(a) {
    var x = extraVon(a.firma), N = rufname(a), L = schritte(a), st = stand(a), mit = a.einladung || a.vorgemerkt, j = -1;
    L.forEach(function (s, i) { if (j < 0 && !s.ok) j = i; });
    var pill = { gut: 'kunde', warn: 'gebaut', bad: 'offen' }[st[1]] || 'qual';
    return bspLeiste() + '<button type="button" class="ka-zur" data-ka="zurueck">← Alle Kunden</button>'
      + '<div class="ka-akopf">' + logoHTML(a, x, 1) + '<div class="ka-ak"><h1>' + esc(a.firma || a.email) + '</h1>' + (x && x.zeile ? '<p>' + esc(x.zeile) + '</p>' : '') + '<span class="pill ' + pill + '">' + esc(st[0]) + '</span></div></div>'
      + kopfAktionen(a) + (FEHLER ? '<p class="ka-msg bad">' + esc(FEHLER) + '</p>' : '') + papierkorbHTML(a)
      + '<div class="ka-raster"><div class="ka-haupt"><section class="card"><div class="ka-chk"><h2>' + (mit ? 'Weg zum echten Konto' : 'Stand') + '</h2><span class="ka-zahl">' + L.filter(function (s) { return s.ok; }).length + ' von ' + L.length + ' erledigt</span></div>'
      + '<p class="cs">' + (mit ? 'Was ' + esc(N) + ' tut, meldet sich von selbst. Erledigtes wird grau und bekommt einen Haken.' : 'Meldet sich von selbst.') + ' <span id="ka-stempel"></span></p>'
      + '<ol class="ka-l">' + L.map(function (s, i) { return schrittHTML(s, i, i === j, N); }).join('') + '</ol></section>'
      + angebotHTML(x) + '</div><div class="ka-seite">' + kontaktHTML(a, x) + zeigenHTML(a, x) + bilderHTML(x) + '</div></div>';
  }
  function stempel() { var e = $('ka-stempel'); if (e) e.textContent = BSP ? '' : STAND ? 'Stand ' + new Date(STAND).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' Uhr.' : ''; }
  function box() {
    var s = window.czVtSeite ? window.czVtSeite('akten') : null; if (!s) return null;
    var b = $('ka'); if (!b) { b = document.createElement('div'); b.id = 'ka'; s.appendChild(b); }
    return b;
  }
  function zeichnen(neu) {
    var b = box(); if (!b) return;
    var s = b.parentNode;
    if (BSP) { var o = s.querySelector('.vt-ohne'); if (o) o.hidden = true; }
    if (!darf()) { b.innerHTML = ''; SIG = ''; s.classList.remove('ka-auf'); return; }
    var a = aktuell();
    if (OFFEN && !a && LISTE) { OFFEN = ''; hashSetzen(''); }
    s.classList.toggle('ka-auf', !!OFFEN);
    var sig = JSON.stringify([OFFEN, a, OFFEN ? 0 : alle(), FRAGE, FEHLER, !!LISTE]);
    if (!neu && sig === SIG) { stempel(); return; }
    SIG = sig;
    b.innerHTML = OFFEN ? (a ? akteHTML(a) : '<p class="leer">Wird geladen …</p>') : uebersichtHTML();
    stempel();
  }
  function hashSetzen(id) { try { history.replaceState(null, '', location.pathname + location.search + (id ? '#akte-' + encodeURIComponent(id) : '')); } catch (e) {} }
  function oeffnen(id, still) {
    OFFEN = id || ''; AKTE = null; FRAGE = ''; FEHLER = '';
    hashSetzen(OFFEN);
    zeichnen(true);
    if (!still) window.scrollTo(0, 0);
    if (OFFEN) akteLaden(); else if (!LISTE || Date.now() - ZEIT > 30000) listeLaden();
  }

  /* ── Aktionen ── */
  function haken(a, was, an, wie, meldung) {
    var fertig = function (s, fs) {
      a.schritte = s; if (fs) a.formulare = fs;
      if (AKTE && AKTE.id === a.id) { AKTE.schritte = s; if (fs) AKTE.formulare = fs; }
      FRAGE = ''; zeichnen(true); if (meldung) toast(meldung);
    };
    if (BSP) {
      var s = Object.assign({}, a.schritte), fs = null;
      if (an) {
        s[was] = new Date().toISOString(); if (wie) s.versendet_wie = wie;
        /* wie lib/konto-admin.js: Online-Test aus, Formular wieder Entwurf, Test-Anfragen weg */
        if (was === 'geprueft') { delete s.online_test; fs = (a.formulare || []).map(function (f) { return Object.assign({}, f, { live: false }); }); a.anfragen = 0; }
      } else { delete s[was]; if (was === 'versendet') delete s.versendet_wie; }
      fertig(s, fs); return;
    }
    aktion('schritt', { id: a.id, schritt: was, an: an, wie: wie || undefined }).then(function (j) { fertig(j.schritte || {}, j.formulare); }).catch(function (e) { fehlerToast(e); zeichnen(true); });
  }
  function onlineTest(a, el) {
    var an = el.checked, N = rufname(a);
    if (an && !confirm('Formular von ' + (a.firma || N) + ' online testen?\n\nEs ist dann über den echten Link erreichbar, auch ohne bestätigte E-Mail-Adresse. Schicken Sie den Link nur an sich selbst. Jede Anfrage kommt in ' + gen(N) + ' Cockpit an.\n\nDer Haken „Alles geprüft und getestet?“ schaltet es wieder aus und löscht die Test-Anfragen.')) { el.checked = false; return; }
    el.disabled = true;
    var fertig = function (s, fs) {
      a.schritte = s; if (fs) a.formulare = fs;
      if (AKTE && AKTE.id === a.id) { AKTE.schritte = s; if (fs) AKTE.formulare = fs; }
      zeichnen(true); toast(an ? 'Online-Test an. Das Formular ist erreichbar.' : 'Online-Test aus. Das Formular ist wieder ein Entwurf.');
    };
    if (BSP) { var s = Object.assign({}, a.schritte); if (an) s.online_test = new Date().toISOString(); else delete s.online_test; fertig(s, (a.formulare || []).map(function (f) { return Object.assign({}, f, { live: an }); })); return; }
    aktion('online_test', { id: a.id, an: an }).then(function (j) { fertig(j.schritte || {}, j.formulare); }).catch(function (e) { el.checked = !an; el.disabled = false; fehlerToast(e); });
  }
  function geprueft(a, el) {
    var N = rufname(a), fehlt = [];
    if (!(a.formulare || []).length) fehlt.push('ein gespeichertes Formular');
    if (!(a.vorname && a.nachname && a.telefon)) fehlt.push(fehlend(a));
    if ('datenschutz_url' in a && !a.datenschutz_url) fehlt.push('der Datenschutz-Link');
    var ot = !!(a.schritte || {}).online_test;
    var t = 'Alles geprüft und getestet?\n\nFormular, Leistungen und Einstellungen bleiben, wie Sie sie eingerichtet haben. Für ' + N + ' beginnt alles frisch: Ihre Test-Anfragen und Termine werden gelöscht, Rundgänge und Missionen sieht ' + N + ' zum ersten Mal, Mitteilungen dieses Kontos auf Ihren Geräten enden.'
      + '\n\nDas Formular ist danach aus' + (ot ? ', der Online-Test endet' : '') + '. Einschalten kann es nur ' + N + ', nachdem die eigene E-Mail-Adresse bestätigt ist.'
      + (fehlt.length ? '\n\nEs fehlt noch: ' + fehlt.join(', ') + '. So kann ' + N + ' das Formular nicht einschalten.' : '');
    if (!confirm(t)) { el.checked = false; return; }
    haken(a, 'geprueft', true, null, 'Geprüft und getestet');
  }
  function bauen(a, ziel, text) {
    if (BSP) { toast(text || 'Beispiel: Hier öffnet sich das echte Konto in einem neuen Tab.'); return; }
    var w = null; try { w = window.open('', '_blank'); } catch (e) {}
    aktion('oeffnen', { id: a.id }).then(function (j) {
      try { localStorage.setItem('cz_user_token', j.token); localStorage.setItem('cz_user_email', j.email); } catch (e) {}
      var u = new URL(ziel || 'clickzauber-cockpit-live.html', location.href).href;
      if (w && !w.closed) w.location.href = u; else location.href = u;
      if (ziel && /einsetzen=/.test(ziel)) setTimeout(akteLaden, 6000);
    }).catch(function (e) { if (w) { try { w.close(); } catch (x) {} } alert((e && e.message) || 'Öffnen fehlgeschlagen.'); });
  }
  function mailNeu(a, el) {
    if (BSP) { toast('Beispiel: Die Bestätigungs-Mail ist raus.'); return; }
    el.disabled = true; el.textContent = 'Wird gesendet …';
    fetch(api() + '/auth/bestaetigung-neu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a.email }) })
      .then(function (r) { el.textContent = r.ok ? 'Gesendet' : 'Hat nicht geklappt'; if (r.ok) toast('Bestätigungs-Mail an ' + a.email); })
      .catch(function () { el.disabled = false; el.textContent = 'Bestätigungs-Mail noch einmal senden'; toast('Keine Verbindung.'); });
  }
  function nachher(meldung) { return function () { toast(meldung); listeLaden(); akteLaden(); }; }
  function tun(was, a, el, ev) {
    if (was === 'zurueck') { oeffnen(''); return; }
    if (was === 'sim') { simulieren(); return; }
    if (!a) return;
    if (was === 'vorbauen') {
      if (BSP) { var nb = bspKonto(a.firma, 'b-' + slugVon(a.firma)); LISTE = [nb].concat(LISTE || []); toast('Beispiel: Konto vorgebaut. Angaben und Datenschutz-Link stehen schon drin.'); oeffnen(nb.id, true); return; }
      var x = extraVon(a.firma);
      if (typeof window.vorbauenDialog === 'function') window.vorbauenDialog((x && x.vorbauen) || { firma: a.firma });
    } else if (was === 'bauen') bauen(a);
    else if (was === 'einsetzen') {
      if (BSP) { var fx0 = extraVon(a.firma); a.formulare = [{ slug: slugVon(a.firma), name: (fx0 && fx0.formular && fx0.formular.name) || a.firma, live: false }]; zeichnen(true); toast('Beispiel: Formular eingesetzt, Cockpit öffnet sich.'); return; }
      if (!confirm('Das fertige Formular in das Konto von ' + (a.firma || 'diesem Betrieb') + ' einsetzen?\n\nEs wird als Entwurf gespeichert, Leistungen und Mitarbeiter kommen ins Cockpit. In einem neuen Tab öffnet sich danach das Cockpit. Auf diesem Gerät sind Sie dann als dieser Betrieb angemeldet.')) return;
      bauen(a, 'clickzauber-editor.html?einsetzen=' + encodeURIComponent(a.firma));
    } else if (was === 'abgleichen') {
      /* Seit 17.10.2026: bestehendes Formular mit kunden/akten.js abgleichen (Logo, Farben, Leistungen, Preise). Fragen, Link und Stand bleiben. */
      var f1 = (a.formulare || [])[0]; if (!f1) return;
      if (!confirm('Logo, Farben und Leistungen mit Preisen aus der Akte in das Formular von ' + (a.firma || 'diesem Betrieb') + ' übernehmen?\n\nLink, Fragen und Mitarbeiter bleiben. Ist es live, bleibt es live.')) return;
      if (BSP) { toast('Beispiel: Hier würde das Formular mit der Akte abgeglichen.'); return; }
      /* Direkt auf dem Server (lib/konto-admin.js 'abgleichen'): geht auch, wenn der Kunde die Einladung schon eingelöst hat. */
      var xf = extraVon(a.firma), ff = xf && xf.formular; if (!ff) { toast('In kunden/akten.js steht für diesen Betrieb kein Formular.'); return; }
      var abs1 = function (p) { return !p ? '' : /^https?:/.test(p) ? p : 'https://clickzauber.de/' + String(p).replace(/^\.?\//, ''); };
      var ver = (Date.now() / 1000 | 0).toString(36);
      var daten = { theme: { accent: ff.accent, skin: ff.skin, font: ff.font, fontAnswer: ff.fontAnswer || ff.font, logo: ff.logo ? abs1(ff.logo) + '?v=' + ver : undefined, eigen: ff.eigen || undefined },
        termin: { leistungen: ff.leistungen || [], salon: ff.salon || undefined } };
      toast('Wird abgeglichen …');
      aktion('abgleichen', { id: a.id, formular: daten }).then(function (j) {
        if (j.formulare) a.formulare = j.formulare;
        toast('Fertig: ' + (j.leistungen || 0) + ' Leistungen, neues Logo und Farben sind im echten Formular (Version ' + j.version + '). Seite des Kunden neu laden.');
        zeichnen(true);
      }).catch(function (e) { fehlerToast(e); });
    } else if (was === 'konfig') {
      var f0 = (a.formulare || [])[0]; if (!f0) return;
      bauen(a, 'clickzauber-editor.html?bearbeiten=' + encodeURIComponent(f0.slug), 'Beispiel: Hier öffnet sich das Formular im Konfigurator.');
    }
    else if (was === 'otkopie') { if (BSP) toast('Beispiel: Link kopiert.'); else kopieren(testLink(a)); }
    else if (was === 'verwalten') { if (BSP) toast('Beispiel: Hier geht es zu Kunden & Zahlen.'); else if (window.czKundeSuchen) window.czKundeSuchen(a.email); }
    else if (was === 'vswa') { if (BSP) { ev.preventDefault(); toast('Beispiel: Hier öffnet sich WhatsApp mit der Vorschau.'); } VS_FRAGE = a.id; setTimeout(function () { zeichnen(true); }, BSP ? 0 : 400); }
    else if (was === 'vskopie') { kopieren(vsLink(a)); VS_FRAGE = a.id; zeichnen(true); }
    else if (was === 'vsja') { VS_FRAGE = ''; haken(a, 'vorschau', true, null, 'Vorschau verschickt'); }
    else if (was === 'vsnein') { VS_FRAGE = ''; zeichnen(true); }
    else if (was === 'wa') {
      WIE = 'whatsapp';
      if (BSP) { ev.preventDefault(); toast('Beispiel: Hier öffnet sich WhatsApp mit dem Link.'); FRAGE = a.id; zeichnen(true); return; }
      setTimeout(function () { FRAGE = a.id; zeichnen(true); }, 400);
    } else if (was === 'kopie') { WIE = 'link'; kopieren(a.link); FRAGE = a.id; zeichnen(true); }
    else if (was === 'nein') { FRAGE = ''; zeichnen(true); }
    else if (was === 'ja') haken(a, 'versendet', true, WIE || 'whatsapp', 'Erstversendung erledigt');
    else if (was === 'rueck') {
      var w = el.getAttribute('data-was');
      if (confirm('Haken bei „' + (w === 'geprueft' ? 'Bearbeiten und testen' : 'Erstversendung') + '“ zurücknehmen?')) haken(a, w, false, null, 'Haken zurückgenommen');
    } else if (was === 'link') {
      if (BSP) return;
      aktion('einladung', { id: a.id }).then(function (j) { a.link = j.link; if (AKTE && AKTE.id === a.id) AKTE.link = j.link; zeichnen(true); }).catch(fehlerToast);
    } else if (was === 'mail') mailNeu(a, el);
    else if (was === 'notiz') {
      var t = prompt('Notiz zu ' + (a.firma || a.email) + ' (sieht nur der Betreiber):', a.notiz || '');
      if (t === null) return;
      if (BSP) { a.notiz = t.trim(); zeichnen(true); return; }
      aktion('notiz', { id: a.id, text: t }).then(function () { a.notiz = t.trim(); if (AKTE && AKTE.id === a.id) AKTE.notiz = a.notiz; zeichnen(true); toast('Notiz gespeichert'); }).catch(fehlerToast);
    } else if (was === 'ueberfuehren') {
      if (!confirm('Testphase beenden und in ein echtes Konto überführen?\n\nDer Countdown verschwindet, das Formular bleibt eingeschaltet. Der Betrieb bekommt einen Pilotplatz: kostenlos bis zum Verkaufsstart, danach 40 % Rabatt. Im Cockpit erscheint einmal „Ihr Konto ist freigeschaltet“.')) return;
      if (BSP) { a.test_bis = null; a.pilot_seit = new Date().toISOString(); zeichnen(true); toast('Beispiel: Echtes Konto'); return; }
      aktion('ueberfuehren', { id: a.id }).then(nachher('Echtes Konto')).catch(fehlerToast);
    } else if (was === 'verlaengern') {
      if (BSP) { a.test_bis = new Date(Math.max(Date.parse(a.test_bis) || 0, Date.now()) + 14 * 864e5).toISOString(); zeichnen(true); toast('Beispiel: + 14 Tage'); return; }
      aktion('test', { id: a.id, tage: 14 }).then(nachher('Test um 14 Tage verlängert')).catch(fehlerToast);
    } else if (was === 'zuruecksetzen') {
      var zz = prompt('Einladung zurücksetzen, nur nach Ihrem eigenen Test!\n\nFormular, Angaben und Einstellungen bleiben. Gelöscht werden: der Zugang ' + a.email + ', alle Anmeldungen, der Test, die Mitteilungs-Geräte, ALLE Anfragen und Termine, der AV-Vertrag und der Pilotplatz. Das Formular ist danach wieder aus, der alte Link gilt nicht mehr.\n\nZur Bestätigung ZURÜCKSETZEN eintippen:');
      if (!zz || zz.trim().toUpperCase() !== 'ZURÜCKSETZEN') return;
      if (BSP) { toast('Beispiel: zurückgesetzt'); return; }
      aktion('zuruecksetzen', { id: a.id }).then(nachher('Zurückgesetzt. Es gibt einen neuen Link.')).catch(fehlerToast);
    }
  }
  document.addEventListener('click', function (ev) {
    var b = $('ka'); if (!b || !ev.target.closest || !b.contains(ev.target)) return;
    var kt = ev.target.closest('[data-akte]'); if (kt) { oeffnen(kt.getAttribute('data-akte')); return; }
    var el = ev.target.closest('[data-ka]');
    if (!el) { if (BSP && ev.target.closest('a[target="_blank"]:not(.ka-weg)')) { ev.preventDefault(); toast('Beispiel: Hier öffnet sich der Link.'); } return; }
    if (el.tagName === 'INPUT') return;
    if (el.getAttribute('data-ka') === 'pk-zurueck') { var ap = aktuell(); if (ap) pkZurueck(ap, el); return; }
    tun(el.getAttribute('data-ka'), aktuell(), el, ev);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target; if (!el || !el.matches) return;
    if (el.matches('#ka input[data-ka="online"]')) { var a0 = aktuell(); if (a0) onlineTest(a0, el); return; }
    if (!el.matches('#ka input[data-ka="geprueft"]') || !el.checked) return;
    var a = aktuell(); if (a) geprueft(a, el);
  });

  /* ── Beispiel (?akten=beispiel) ── */
  function vorH(h) { return new Date(Date.now() - h * 36e5).toISOString(); }
  /* Vorgebautes Konto im Beispiel, Angaben aus kunden/akten.js (vorbauen) */
  function bspKonto(firma, id, mehr) {
    var x = extraVon(firma), v = (x && x.vorbauen) || {};
    return Object.assign({ id: id, email: 'vorgebaut-' + slugVon(firma).slice(0, 30) + '-b7k2@clickzauber.de', intern: true, firma: firma, vorname: v.vorname || '', nachname: v.nachname || '', telefon: v.telefon || '', website: v.website || '', strasse: v.strasse || '', plz_ort: v.plz_ort || '', datenschutz_url: v.datenschutz_url || '', notiz: '', seit: new Date().toISOString(), bestaetigt: false, passwort: false, einladung: true, link: 'https://clickzauber.de/einladung.html?c=bsp' + slugVon(firma).replace(/-/g, '').slice(0, 8), eingeloest_am: null, test_bis: null, pilot_seit: null, status: 'inaktiv', schritte: {}, formulare: [], anfragen: 0, anfragen_seit_start: 0, rm_n: 0, rueckmeldungen: [], mitteilungen: 0 }, mehr || {});
  }
  function beispiel() {
    return [
      { id: 'b-kate', email: 'vorgebaut-kate-cosmetics-b7k2@clickzauber.de', intern: true, firma: 'Kate Cosmetics', vorname: 'Kathleen Alina', nachname: 'Miner', telefon: '+49 151 10642524', website: 'https://katecosmetics.de', strasse: 'Am Bahnhof 4', plz_ort: '88131 Bodolz/Lindau (Bodensee)', datenschutz_url: 'https://katecosmetics.de/datenschutz', notiz: 'Fragen, ob ihr Foto im Formular stehen darf. Echte Zeiten je Behandlung erfragen.', seit: vorH(26), bestaetigt: false, passwort: false, einladung: true, link: 'https://clickzauber.de/einladung.html?c=beispiel01', eingeloest_am: null, test_bis: null, pilot_seit: null, status: 'inaktiv', schritte: { geprueft: vorH(1) }, formulare: [{ slug: 'kate-cosmetics', name: 'Kosmetikstudio', live: false }], anfragen: 0, anfragen_seit_start: 0, rm_n: 0, rueckmeldungen: [], mitteilungen: 0 },
      bspKonto('Barber by Becks', 'b-amar', { seit: vorH(2), notiz: 'Preise, Arbeitszeiten und Damenschnitte mit Amar klären. Dürfen Foto und Siegel ins Formular?', formulare: [{ slug: 'barber-by-becks', name: 'Barber by Becks', live: false }] }),
      { id: 'b-seeblick', email: 'vorgebaut-cafe-seeblick-x7k2@clickzauber.de', intern: true, firma: 'Café Seeblick', vorname: 'Jonas', nachname: '', telefon: '', plz_ort: '88085 Langenargen', seit: vorH(3), bestaetigt: false, passwort: false, einladung: true, link: 'https://clickzauber.de/einladung.html?c=beispiel02', status: 'inaktiv', schritte: {}, formulare: [], datenschutz_url: '', anfragen: 0, rm_n: 0, rueckmeldungen: [], mitteilungen: 0 },
      { id: 'b-salon', email: 'hallo@salon-am-hafen.de', firma: 'Salon am Hafen', vorname: 'Anna', nachname: 'Berger', telefon: '+49 171 0000000', plz_ort: '88131 Lindau', seit: vorH(24 * 9), bestaetigt: true, passwort: true, einladung: false, pilot_seit: vorH(24 * 9), status: 'inaktiv', schritte: {}, formulare: [{ slug: 'salon-am-hafen', name: 'Friseur Damen & Herren', live: true }], anfragen: 14, rm_n: 0, rueckmeldungen: [], mitteilungen: 2, datenschutz_url: 'https://salon-am-hafen.de/datenschutz' },
      /* Papierkorb (seit 21.10.2026): Formular vor 5 Stunden gelöscht, „Zurückholen“ in der Akte. */
      { id: 'b-seeufer', email: 'hallo@friseur-seeufer.de', firma: 'Friseur am Seeufer', vorname: 'Lena', nachname: 'Kraus', telefon: '+49 170 0000000', plz_ort: '88131 Lindau', seit: vorH(24 * 20), bestaetigt: true, passwort: true, einladung: false, pilot_seit: vorH(24 * 20), status: 'inaktiv', schritte: {}, formulare: [], papierkorb: [{ slug: 'friseur-am-seeufer', name: 'Friseur Damen & Herren', am: vorH(5), bis: new Date(Date.now() - 5 * 36e5 + 30 * 864e5).toISOString() }], anfragen: 23, rm_n: 0, rueckmeldungen: [], mitteilungen: 1, datenschutz_url: 'https://friseur-seeufer.de/datenschutz' }
    ];
  }
  function simulieren() {
    var a = aktuell(); if (!a || !a.einladung) a = (LISTE || []).filter(function (x) { return x.id === 'b-kate'; })[0];
    if (!a) return;
    if (OFFEN !== a.id) oeffnen(a.id, true);
    var j = offenErst(a);
    if (!j) { toast('Alles erledigt.'); return; }
    if (j.wer === 'sie' && j.id !== 'entscheidung') { toast('Jetzt sind Sie dran: ' + j.h); return; }
    if (j.id === 'entscheidung') { toast('Jetzt sind Sie dran: In echtes Konto überführen'); return; }
    var alt = okMenge(a), t = new Date().toISOString(), S = a.schritte = Object.assign({}, a.schritte);
    if (j.id === 'geoeffnet') { S.geoeffnet = t; S.aufrufe = 1; S.zuletzt = t; }
    else if (j.id === 'zugang') { var xz = extraVon(a.firma); a.eingeloest_am = t; a.passwort = true; a.intern = false; a.email = (xz && xz.email) || 'info@' + slugVon(a.firma).replace(/-/g, '') + '.de'; a.test_bis = new Date(Date.now() + 14 * 864e5).toISOString(); }
    else if (j.id === 'bestaetigt') a.bestaetigt = true;
    else if (j.id === 'formular') { S.formular = t; S.live = t; a.formulare = ((a.formulare || []).length ? a.formulare : [{ slug: slugVon(a.firma), name: a.firma }]).map(function (f) { return Object.assign({}, f, { live: true }); }); }
    else if (j.id === 'home') { S.home = t; a.mitteilungen = 1; }
    else if (j.id === 'probe') { a.anfragen_seit_start = a.anfragen = 1; a.erste_anfrage = t; }
    else if (j.id === 'teilen') { S.teilen = t; a.anfragen_seit_start = a.anfragen = 3; }
    else if (j.id === 'rueckmeldung') { a.rm_n = 1; a.rueckmeldungen = [{ text: 'Meine Bekannten fanden es ganz einfach. Kann ich noch ein zweites Foto einbauen?', am: t }]; }
    AKTE = a;
    var neu = okMenge(a); Object.keys(neu).forEach(function (id) { if (!alt[id]) toast(rufname(a) + ': ' + neu[id] + ' ✓'); });
    zeichnen(true);
  }

  /* ── Anschluss an die Reiter (js/cz-vertrieb-kennzahlen.js) und an laden() der Plattform ── */
  window.czAkteZeigen = function (n) {
    if (n !== 'akten') return;
    zeichnen(true);
    if (!LISTE || Date.now() - ZEIT > 30000) listeLaden();
    if (OFFEN) akteLaden();
  };
  window.czAkteLaden = function () { listeLaden(); if (OFFEN) akteLaden(); };
  function sichtbar() { var s = $('vt-akten'); return !!(s && !s.hidden && s.offsetParent !== null && document.visibilityState === 'visible'); }
  setInterval(function () {
    if (BSP || !sichtbar()) return;
    if (OFFEN && !/^vm-/.test(OFFEN)) akteLaden(); else if (Date.now() - ZEIT > 55000) listeLaden();
  }, 15000);
  document.addEventListener('visibilitychange', function () { if (!BSP && sichtbar()) { if (OFFEN) akteLaden(); else listeLaden(); } });

  var m = /^#akte-(.+)$/.exec(location.hash || '');
  if (m) { try { OFFEN = decodeURIComponent(m[1]); } catch (e) { OFFEN = m[1]; } }
  if (BSP) {
    LISTE = beispiel(); ZEIT = Date.now();
    var g = $('gate'), sk = $('btn-skip');
    if (g && g.style.display !== 'none' && sk) sk.click();
    if (window.czVtReiter) window.czVtReiter('akten');
  }
  zeichnen(true);
  if (OFFEN) akteLaden();
})();
