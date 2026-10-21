/* clickzauber — Plattform-Teil der Seite „Plattform & Vertrieb“ (clickzauber-plattform.html, seit 08.10.2026).
   Reiter „Überblick“ (Wartung, Nach dem Hochladen, App-Versionen, Zahlen, Anmeldungen), „Meldungen“ (Meldungen,
   automatisch blockiert, Netzwerk, Regeln), „Rundmail“ und „Protokoll“. Daten: GET /api/moderation (lib/moderation.js),
   Wartung und App-Versionen: /api/status. Nutzt API, key und kontoAktion() der Seite.
   Die Reiter legt js/cz-vertrieb-kennzahlen.js an (czVtSeite, czVtReiter), gezeichnet wird hier (czPfZeigen). */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function k() { return (typeof key !== 'undefined' && key) || ''; }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function zeit(d) { if (!d) return ''; var x = new Date(d), m = Math.round((Date.now() - x) / 6e4); if (m < 1) return 'gerade eben'; if (m < 60) return 'vor ' + m + ' Min.'; if (m < 1440) return 'vor ' + Math.round(m / 60) + ' Std.'; return x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + x.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
  function zahl(n) { return (n || 0).toLocaleString('de-DE'); }
  function av(p) { var n = (p && p.name) || '?'; return '<span class="av"' + (p && p.bild ? ' style="background-image:url(\'' + esc(p.bild) + '\')"' : '') + '>' + (p && p.bild ? '' : esc(n.charAt(0).toUpperCase())) + '</span>'; }
  var SEITEN = ['ueberblick', 'meldungen', 'rundmail', 'protokoll'];
  var D = null, WS = null, GELADEN = 0, LAEUFT = null, FEHLER = '', WTXT = '', ALLE_ANM = false, SUB = 'meldungen';
  try { SUB = localStorage.getItem('cz_pf_sub') || 'meldungen'; } catch (e) {}

  var css = document.createElement('style'); css.id = 'cz-plattform-css';
  css.textContent = ''
    + '.pf{display:flex;flex-direction:column;gap:16px}.pf .kpis{margin:0}'
    + '.pf .card h2{margin:0 0 4px}.pf .card .cs{margin:0 0 12px;line-height:1.5;text-wrap:pretty}'
    + '.pf .dr{background:color-mix(in srgb,var(--bad) 14%,var(--panel));border-color:color-mix(in srgb,var(--bad) 45%,transparent)}.pf .dr h2{color:#f3a292}'
    + '.pf .gr{font-family:var(--fm);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 -6px}'
    + '.pf .chart{display:flex;align-items:flex-end;gap:3px;height:120px;padding-top:8px}.pf .chart i{flex:1;min-width:0;background:var(--accent);border-radius:3px 3px 0 0;opacity:.85}.pf .chart i.null{background:var(--line-2);height:3px!important}'
    + '.pf .ax{display:flex;justify-content:space-between;font-family:var(--fm);font-size:10.5px;color:var(--ink-3);margin-top:6px}'
    + '.pf .liste{display:flex;flex-direction:column}.pf .zl{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-top:1px solid var(--line)}.pf .zl:first-child{border-top:0;padding-top:0}'
    + '.pf .zl[data-suche]{cursor:pointer}.pf .zl[data-suche]:hover .t1 b{color:var(--accent)}'
    + '.pf .av{flex:none;width:40px;height:40px;border-radius:50%;background:var(--panel-2) center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:var(--ink-2)}'
    + '.pf .zl .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.pf .zl .t1{font-size:14.5px;line-height:1.4}.pf .zl .t2{font-size:12.5px;color:var(--ink-3);font-family:var(--fm);overflow-wrap:anywhere}'
    + '.pf .zl .zi{font-size:14px;color:var(--ink);background:var(--panel-2);border-radius:10px;padding:9px 12px;margin-top:4px;line-height:1.45;white-space:pre-wrap;word-break:break-word}'
    + '.pf .zl .bi{width:120px;height:90px;border-radius:10px;object-fit:cover;margin-top:6px;background:var(--panel-2)}'
    + '.pf .pill.ok{background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)}.pf .pill.w{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}.pf .pill.b{background:color-mix(in srgb,var(--bad) 20%,transparent);color:#f3a292}'
    + '.pf .galerie{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.pf .galerie figure{margin:0;display:flex;flex-direction:column;gap:5px}.pf .galerie img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:var(--panel-2)}'
    + '.pf .galerie figcaption{font-size:12px;color:var(--ink-2);display:flex;justify-content:space-between;gap:6px;align-items:center}.pf .galerie figcaption span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pf .galerie figcaption button{background:none;border:0;color:#f3a292;font:inherit;font-size:12px;padding:2px 0;flex:none;cursor:pointer}'
    + '.pf .hilfe{font-size:13.5px;color:var(--ink-2);line-height:1.55}.pf .hilfe b{color:var(--ink)}.pf .hilfe p{margin:6px 0 0}.pf .hilfe ol{margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:5px}'
    + '.pf .pf-in,.pf .rm input,.pf .rm select,.pf .rm textarea{width:100%;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;color:var(--ink);min-height:44px}'
    + '.pf .pf-in:focus,.pf .rm input:focus,.pf .rm select:focus,.pf .rm textarea:focus{outline:none;border-color:var(--accent)}'
    + '.pf .rm{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}.pf .rm label{display:flex;flex-direction:column;gap:5px;font-family:var(--fm);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}.pf .rm label.voll{grid-column:1/-1}.pf .rm label[hidden]{display:none}'
    + '.pf .rm input,.pf .rm select,.pf .rm textarea{font-family:var(--fd);letter-spacing:0;text-transform:none}.pf .rm textarea{min-height:200px;resize:vertical;line-height:1.5}@media(max-width:600px){.pf .rm{grid-template-columns:1fr}}'
    + '.pf .pf-in{margin-bottom:10px}.pf .pf-felder{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:10px}.pf .pf-felder label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-2)}.pf .pf-felder .pf-in{margin:0}'
    + '.pf .pf-stand{margin:10px 0 0;font-size:13px;color:var(--ink-2);line-height:1.5}.pf .pf-stand.gut{color:var(--accent);font-weight:600}'
    + '.pf .pf-sub{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:4px}.pf .pf-sub::-webkit-scrollbar{display:none}'
    + '.pf .pf-sub button{flex:0 0 auto;white-space:nowrap;background:none;border:0;color:var(--ink-2);font:inherit;font-size:13.5px;padding:0 13px;min-height:40px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.pf .pf-sub button.an{background:var(--panel-2);color:var(--ink)}'
    + '.pf-bd{font-family:var(--fm);font-size:11px;font-weight:500;background:var(--warn);color:#1a1813;border-radius:999px;padding:1px 7px;line-height:1.5}.pf-bd.rot{background:var(--bad)}'
    + '.pf .mehr{background:none;border:0;color:var(--accent);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;padding:10px 0 0;min-height:40px;text-align:left}'
    /* Knöpfe und Fenster: auch für das Fenster „Funktionen“ (js/cz-funktionen.js) */
    + '.akt{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}.akt button,.akt a.kn{white-space:nowrap;background:var(--panel-2);border:1px solid var(--line-2);color:var(--ink);border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;min-height:38px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}'
    + '.akt button:hover,.akt a.kn:hover{border-color:var(--accent);color:var(--accent)}.akt button:disabled{opacity:.55;cursor:default}.akt button.rot{color:#f3a292;border-color:color-mix(in srgb,var(--bad) 45%,transparent)}.akt button.rot:hover{background:color-mix(in srgb,var(--bad) 18%,transparent)}'
    + '.akt button.p{background:var(--accent);border-color:var(--accent);color:#1a1813;font-weight:600}.akt button.p:hover{color:#1a1813}'
    + '.ov{position:fixed;inset:0;background:rgba(10,9,7,.6);display:flex;align-items:center;justify-content:center;padding:16px;z-index:80}.ov[hidden]{display:none}'
    + '.mdl{width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;background:var(--panel);border:1px solid var(--line-2);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:12px}'
    + '.mdl h3{margin:0;font-size:17px}.mdl p{margin:0;color:var(--ink-2);font-size:13.5px;line-height:1.5}'
    + '.mdl input,.mdl textarea{width:100%;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;color:var(--ink);min-height:44px}.mdl textarea{min-height:170px;resize:vertical;line-height:1.5}'
    + '.mdl input:focus,.mdl textarea:focus{outline:none;border-color:var(--accent)}'
    + '#pf-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translate(-50%,10px);background:var(--ink);color:#1a1813;border-radius:14px;padding:11px 18px;font-size:14px;font-weight:600;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;z-index:90;max-width:min(92vw,480px);text-align:center;line-height:1.4}'
    + '#pf-toast.da{opacity:1;transform:translate(-50%,0)}';
  document.head.appendChild(css);

  function toast(t, lang) {
    var e = $('pf-toast'); if (!e) { e = document.createElement('div'); e.id = 'pf-toast'; e.setAttribute('role', 'status'); document.body.appendChild(e); }
    e.textContent = t; e.classList.add('da'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('da'); }, lang ? 6000 : 2800);
  }
  window.czPfToast = toast;

  /* ── Daten ── */
  function laden() {
    if (!k()) return Promise.resolve(null);
    if (LAEUFT) return LAEUFT;
    LAEUFT = fetch(api() + '/moderation?key=' + encodeURIComponent(k()), { cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        LAEUFT = null;
        if (!j || !j.ok) { FEHLER = (j && j.error === 'kein Zugriff') ? 'Schlüssel stimmt nicht.' : 'Server nicht erreichbar oder sql/38 fehlt in Supabase.'; zeichnen(); return null; }
        D = j; GELADEN = Date.now(); FEHLER = ''; zeichnen(true); badge(); return j;
      }, function () { LAEUFT = null; FEHLER = 'Keine Verbindung zum Server.'; zeichnen(); return null; });
    return LAEUFT;
  }
  window.czPfLaden = function () { WS = null; return laden(); };
  function post(aktion, daten) {
    return fetch(api() + '/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: k(), aktion: aktion }, daten)) })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'Fehler'); return laden(); });
  }
  function wartungHolen() {
    fetch(api() + '/status?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { WS = j || {}; if (aktiv() === 'ueberblick') zeichnen(); }, function () { WS = { fehler: 1 }; if (aktiv() === 'ueberblick') zeichnen(); });
  }

  /* ── Zeichnen ── */
  function aktiv() { for (var i = 0; i < SEITEN.length; i++) { var s = $('vt-' + SEITEN[i]); if (s && !s.hidden) return SEITEN[i]; } return ''; }
  function ziel(n) {
    var s = window.czVtSeite ? window.czVtSeite(n) : $('vt-' + n); if (!s) return null;
    var c = s.querySelector('.pf-inhalt'); if (!c) { c = document.createElement('div'); c.className = 'pf pf-inhalt'; s.appendChild(c); }
    return c;
  }
  function tippt() { var a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('.pf')); }
  function zeichnen(still) { var n = aktiv(); if (!n) return; if (still && tippt()) return; render(n); }
  function render(n) {
    var c = ziel(n); if (!c) return;
    if (!k()) { c.innerHTML = ''; return; }
    if (!D) { c.innerHTML = '<p class="lade">' + (FEHLER ? esc(FEHLER) : 'lade …') + '</p>'; if (!LAEUFT && !FEHLER) laden(); return; }
    var h = dringend();
    if (n === 'ueberblick') h += wartungKarte() + updateKarte() + kiKarte() + appKarte() + ueberblick();
    else if (n === 'meldungen') h += meldungenSeite();
    else if (n === 'rundmail') h += rundmailHtml();
    else if (n === 'protokoll') h += protokollHtml();
    c.innerHTML = h;
  }
  window.czPfZeigen = function (n) {
    if (SEITEN.indexOf(n) < 0) return;
    render(n);
    if (k() && D && Date.now() - GELADEN > 60000) laden();
  };
  function offenZahl() { return D ? D.meldungen.filter(function (m) { return m.status === 'offen'; }).length : 0; }
  function dringZahl() { return D ? D.blockiert.filter(function (b) { return b.status === 'dringend'; }).length : 0; }
  function badge() {
    var b = document.querySelector('#app [data-vt="meldungen"]'); if (!b) return;
    var o = offenZahl(), d = dringZahl();
    b.innerHTML = 'Meldungen' + (d ? '<span class="pf-bd rot">' + d + '</span>' : (o ? '<span class="pf-bd">' + o + '</span>' : ''));
  }
  function dringend() {
    var dr = dringZahl(); if (!dr) return '';
    return '<div class="card dr"><h2>' + dr + ' dringender Fall</h2><p class="cs" style="margin:0">Verdacht auf Darstellung Minderjähriger. Das Bild wurde nicht gespeichert, das Profil ist gesperrt. Nicht selbst nach dem Inhalt suchen. Erstatten Sie Anzeige bei der Onlinewache der Polizei und geben Sie Betrieb und Zeitpunkt an.</p><div class="akt"><button type="button" data-pfgo="meldungen" data-pfsub="blockiert">Zum Fall</button></div></div>';
  }
  function kpi(l, v, d, cls) { return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><div class="l">' + l + '</div><div class="v">' + zahl(v) + '</div>' + (d ? '<div class="d">' + d + '</div>' : '') + '</div>'; }
  function statusPill(s) { return s === 'aktiv' ? '<span class="pill ok">zahlt</span>' : (s === 'zahlung offen' ? '<span class="pill w">Zahlung offen</span>' : '<span class="pill">' + esc(s || 'inaktiv') + '</span>'); }

  /* Überblick */
  function wartungKarte() {
    if (WS === null) { WS = { laden: 1 }; wartungHolen(); }
    if (WS.laden) return '<div class="card"><h2>Wartung</h2><p class="cs" style="margin:0">Stand wird geladen …</p></div>';
    if (WS.fehler) return '<div class="card"><h2>Wartung</h2><p class="cs" style="margin:0">Der Stand lässt sich gerade nicht abrufen. Läuft die API?</p></div>';
    var an = !!WS.wartung, seit = WS.seit ? new Date(WS.seit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="card' + (an ? ' dr' : '') + '"><h2>' + (an ? 'Wartung läuft' : 'Wartung') + '</h2><p class="cs">'
      + (an ? 'Seit ' + esc(seit) + ' Uhr' + (WS.text ? ' · „' + esc(WS.text) + '“' : '') + '. Jedes offene Cockpit und der Konfigurator zeigen nach spätestens 20 Sekunden einmal das Fenster „Kurze Wartung“ und oben einen roten Streifen. Speichern ist gesperrt. Formulare, Anfragen und Terminantworten der Gäste laufen weiter.'
        : 'Vor größeren Änderungen einschalten. Jedes offene Cockpit zeigt dann nach spätestens 20 Sekunden ein Fenster „Kurze Wartung“ und oben einen roten Streifen, Speichern ist kurz gesperrt. Formulare nehmen weiter Anfragen an. Nach dem Beenden steht dort kurz „Wartung beendet“.') + '</p>'
      + (an ? '' : '<input id="pf-ws-text" class="pf-in" maxlength="120" placeholder="Hinweis für Kunden, z. B. bis etwa 21 Uhr" value="' + esc(WTXT) + '">')
      + '<div class="akt"><button type="button" class="' + (an ? 'p' : 'rot') + '" data-wartung="' + (an ? 'aus' : 'an') + '">' + (an ? 'Wartung beenden' : 'Wartung starten') + '</button>' + (an ? '<button type="button" data-wartung="mail">Kunden per Rundmail informieren</button>' : '') + '</div></div>';
  }
  function letzteAktualisierung() {
    var a = null; try { a = JSON.parse(localStorage.getItem('cz_pf_allneu') || 'null'); } catch (e) {}
    var p = D && (D.protokoll || []).filter(function (x) { return x.was === 'alle_neu_laden'; })[0], b = p ? { am: p.am, n: p.anzahl } : null;
    var z = !a ? b : (!b ? a : (new Date(a.am) > new Date(b.am) ? a : b));
    return z;
  }
  function updateKarte() {
    var z = letzteAktualisierung(), frisch = z && Date.now() - new Date(z.am).getTime() < 3 * 6e4;
    return '<div class="card"><h2>Nach dem Hochladen</h2><p class="cs">Erst drücken, wenn alles hochgeladen ist und Vercel „Ready“ zeigt. Offene Cockpits laden sich in spätestens 20 Sekunden neu, sobald dort niemand tippt, und zeigen danach kurz „Aktualisiert“. Wer gerade tippt, sieht „Neue Version bereit“. Ohne den Knopf passiert das beim Zurückholen oder nach spätestens 5 Minuten.</p>'
      + '<div class="akt" style="margin-top:0"><button type="button" class="p" data-allneu>Alle Cockpits jetzt aktualisieren</button></div>'
      + '<p class="pf-stand' + (frisch ? ' gut' : '') + '" id="pf-allneu-msg">' + (z ? (frisch ? '✓ Ausgelöst ' : 'Zuletzt ausgelöst: ') + esc(zeit(z.am)) + (z.n ? ' · ' + zahl(z.n) + ' Betriebe' : '') + (frisch ? '. Offene Cockpits laden in spätestens 20 Sekunden neu.' : '') : 'Noch nie ausgelöst.') + '</p></div>';
  }
  /* Architekt: KI für „In eigenen Worten“ im Konfigurator (seit 20.10.2026, sql/73, lib/architekt.js). Standard: aus. */
  function kiKarte() {
    var w = WS || {}; if (w.laden || w.fehler) return '';
    var an = !!w.architekt_an, sch = !!w.architekt_schluessel;
    return '<div class="card"><h2>Architekt: KI im Konfigurator</h2><p class="cs">An: Im Konfigurator erscheint „Lieber in eigenen Worten?“. Der Betrieb schreibt oder diktiert einen Satz, die KI füllt die drei Felder (Was, Wo, Details), er prüft und übernimmt selbst. Aus: nur die drei Felder, ohne KI. Gilt für alle Konten, sofort.</p>'
      + '<p class="pf-stand' + (an && sch ? ' gut' : '') + '">' + (an ? (sch ? 'Eingeschaltet.' : 'Eingeschaltet, aber bei Vercel fehlt ANTHROPIC_API_KEY. Bis dahin bleibt die KI aus.') : 'Ausgeschaltet.' + (sch ? '' : ' Bei Vercel fehlt noch ANTHROPIC_API_KEY.')) + '</p>'
      + '<div class="akt"><button type="button" class="' + (an ? 'rot' : 'p') + '" data-kiarch="' + (an ? 'aus' : 'an') + '">' + (an ? 'KI ausschalten' : 'KI einschalten') + '</button></div></div>';
  }
  /* App-Versionen (sql/61, js/cz-native.js) */
  function appKarte() {
    var w = WS || {}; if (w.laden || w.fehler) return '';
    var feld = function (id, l, v, ph) { return '<label>' + l + '<input id="' + id + '" class="pf-in" value="' + esc(v || '') + '" placeholder="' + ph + '"></label>'; };
    return '<div class="card"><h2>App-Versionen</h2><p class="cs">Ist eine App älter als die Mindestversion, zeigt sie „Bitte aktualisieren“ und geht erst nach dem Update weiter. Leer lassen heißt: keine Sperre. Gibt es im Store eine neuere Version, weist die App von selbst darauf hin.</p>'
      + '<div class="pf-felder">' + feld('pf-av-ios', 'Mindestversion iPhone', w.app_min_ios, 'z. B. 1.2.0') + feld('pf-av-and', 'Mindestversion Android', w.app_min_android, 'z. B. 1.2.0') + feld('pf-av-id', 'Apple-ID der App', w.ios_app_id, 'Zahl aus App Store Connect') + '</div>'
      + '<div class="akt"><button type="button" class="p" data-appver>Speichern</button></div></div>';
  }
  function anmZeile(u) {
    return '<div class="zl" data-suche="' + esc(u.email) + '">' + av({ name: u.firma || u.name || u.email }) + '<div class="tx"><div class="t1"><b>' + esc(u.firma || u.name || 'Ohne Namen') + '</b> ' + statusPill(u.status) + (u.bestaetigt ? '' : ' <span class="pill w">E-Mail offen</span>') + (u.gesperrt ? ' <span class="pill b">gesperrt</span>' : '') + '</div><div class="t2">' + esc(u.email) + (u.plan ? ' · ' + esc(u.plan) : '') + ' · ' + zeit(u.am) + '</div></div></div>';
  }
  function ueberblick() {
    var z = D.zahlen || {}, v = D.verlauf || [];
    var max = Math.max(1, Math.max.apply(null, v.map(function (x) { return x.n; }).concat([0])));
    var chart = '<div class="chart">' + v.map(function (x) { return '<i' + (x.n ? '' : ' class="null"') + ' style="height:' + Math.round(x.n / max * 100) + '%" title="' + esc(String(x.tag).split('-').reverse().join('.')) + ': ' + x.n + '"></i>'; }).join('') + '</div><div class="ax"><span>vor 30 Tagen</span><span>heute</span></div>';
    var an = D.anmeldungen || [], zeig = ALLE_ANM ? an : an.slice(0, 8);
    return '<p class="gr">Anmeldungen</p><div class="kpis">' + kpi('Heute neu', z.neu_heute, 'letzte 24 Std.', z.neu_heute ? 'gut' : '') + kpi('Letzte 7 Tage', z.neu_7) + kpi('Letzte 30 Tage', z.neu_30) + kpi('Konten gesamt', z.konten) + kpi('Zahlende Kunden', z.zahlend, '', z.zahlend ? 'gut' : '') + kpi('Widgets live', z.widgets_live) + kpi('Anfragen', z.anfragen_7, 'letzte 7 Tage') + kpi('Konten gesperrt', z.gesperrt_konten, '', z.gesperrt_konten ? 'warn' : '') + '</div>'
      + '<div class="card"><h2>Neue Anmeldungen je Tag</h2>' + chart + '</div>'
      + '<div class="card"><h2>Zuletzt angemeldet</h2><p class="cs">Antippen öffnet das Konto unter „Kunden &amp; Zahlen“: sperren, löschen, Tarif, Funktionen, Pilotplatz.</p><div class="liste">' + (zeig.map(anmZeile).join('') || '<p class="leer">Noch keine Anmeldungen.</p>') + '</div>'
      + (an.length > 8 ? '<button type="button" class="mehr" data-pfmehr>' + (ALLE_ANM ? 'Weniger zeigen' : 'Alle ' + an.length + ' zeigen') + '</button>' : '') + '</div>'
      + '<p class="gr">Netzwerk</p><div class="kpis">' + kpi('Profile', z.profile) + kpi('Nachrichten', z.nachrichten_7, 'letzte 7 Tage') + kpi('Neue Kontakte', z.verbindungen_7, 'letzte 7 Tage') + kpi('Gefällt mir', z.likes_7, 'letzte 7 Tage') + kpi('Offene Meldungen', z.meldungen_offen, '', z.meldungen_offen ? 'warn' : '') + kpi('Blockiert', z.blockiert_7, 'letzte 7 Tage', z.blockiert_7 ? 'warn' : '') + kpi('Profile gesperrt', z.profile_gesperrt, '', z.profile_gesperrt ? 'warn' : '') + '</div>';
  }

  /* Meldungen & Netzwerk */
  var SUBS = [['meldungen', 'Meldungen'], ['blockiert', 'Automatisch blockiert'], ['netz', 'Netzwerk'], ['regeln', 'So funktioniert es']];
  function meldungenSeite() {
    if (!SUBS.some(function (s) { return s[0] === SUB; })) SUB = 'meldungen';
    var o = offenZahl(), dr = dringZahl();
    var h = '<div class="pf-sub" role="tablist">' + SUBS.map(function (s) { var bd = s[0] === 'meldungen' && o ? '<span class="pf-bd">' + o + '</span>' : (s[0] === 'blockiert' && dr ? '<span class="pf-bd rot">' + dr + '</span>' : ''); return '<button type="button" role="tab" data-pfsub="' + s[0] + '"' + (SUB === s[0] ? ' class="an" aria-selected="true"' : ' aria-selected="false"') + '>' + s[1] + bd + '</button>'; }).join('') + '</div>';
    if (SUB === 'blockiert') return h + blockiert();
    if (SUB === 'netz') return h + netz();
    if (SUB === 'regeln') return h + regeln();
    return h + meldungen();
  }
  function aktionen(t, bild) {
    var p = t || {};
    return '<div class="akt">' + (bild ? '<button type="button" class="rot" data-bildweg="' + esc(p.id) + '" data-bild="' + esc(bild) + '">Bild entfernen</button>' : '')
      + (p.gesperrt ? '<button type="button" data-frei="' + esc(p.id) + '">Sperre aufheben</button>' : '<button type="button" class="rot" data-sperren="' + esc(p.id) + '" data-name="' + esc(p.name) + '">Profil sperren</button>');
  }
  function meldungen() {
    var o = D.meldungen.filter(function (m) { return m.status === 'offen'; }), e = D.meldungen.filter(function (m) { return m.status !== 'offen'; });
    function zeile(m) {
      return '<div class="zl">' + av(m.ziel) + '<div class="tx"><div class="t1"><b>' + esc(m.ziel.name) + '</b>' + (m.ziel.gesperrt ? ' <span class="pill b">gesperrt</span>' : '') + ' gemeldet von ' + esc(m.von.name) + '</div><div class="t2">' + zeit(m.am) + (m.art === 'nachricht' ? ' · Nachrichten' : (m.bild ? ' · einzelnes Bild' : ' · ganzes Profil')) + '</div>'
        + (m.grund ? '<div class="zi">' + esc(m.grund) + '</div>' : '') + (m.auszug ? '<div class="t2" style="margin-top:6px">Nachrichten des Gemeldeten</div><div class="zi" style="font-family:var(--fm);font-size:12.5px">' + esc(m.auszug) + '</div>' : '') + (m.bild && m.bild.url ? '<img class="bi" src="' + esc(m.bild.url) + '" alt="">' : '')
        + (m.status === 'offen' ? aktionen(m.ziel, m.bild && m.bild.url ? m.bild.id : '') + '<button type="button" data-erledigt="' + esc(m.id) + '">Kein Verstoß, erledigt</button></div>' : (m.notiz ? '<div class="t2">Notiz: ' + esc(m.notiz) + '</div>' : '')) + '</div></div>';
    }
    return '<div class="card"><h2>Offene Meldungen</h2><p class="cs">Mitglieder melden hier Profile oder Bilder. Nach dem Digital Services Act müssen Sie Meldungen zeitnah prüfen. Wer gesperrt wird oder ein Bild verliert, bekommt automatisch eine E-Mail mit Grund und kann widersprechen.</p><div class="liste">' + (o.map(zeile).join('') || '<p class="leer">Keine offenen Meldungen.</p>') + '</div></div>'
      + (e.length ? '<div class="card"><h2>Erledigt</h2><div class="liste">' + e.slice(0, 20).map(zeile).join('') + '</div></div>' : '');
  }
  var ART = { profil: 'Profiltext', bild: 'Bild', nachricht: 'Nachricht' };
  function blockiert() {
    return '<div class="card"><h2>Automatisch blockiert</h2><p class="cs">Diese Inhalte hat die Prüfung abgefangen, bevor sie jemand gesehen hat. Bilder werden nie gespeichert. Das Mitglied bekam einen Hinweis und konnte es ändern.</p><div class="liste">'
      + (D.blockiert.map(function (b) {
        return '<div class="zl">' + av(b.wer) + '<div class="tx"><div class="t1"><b>' + esc(b.wer.name) + '</b> <span class="pill' + (b.schwer ? ' b' : ' w') + '">' + esc(b.grund || 'blockiert') + '</span>' + (b.status === 'gesehen' ? ' <span class="pill">gesehen</span>' : '') + '</div><div class="t2">' + (ART[b.art] || esc(b.art)) + ' · ' + zeit(b.am) + '</div>'
          + (b.auszug && !b.schwer ? '<div class="zi">' + esc(b.auszug) + '</div>' : '') + (b.schwer ? '<div class="zi">Profil automatisch gesperrt. Bitte Anzeige erstatten: Onlinewache der Polizei Ihres Bundeslandes, Angaben: Betrieb „' + esc(b.wer.name) + '“, Kennung ' + esc(b.wer.id) + ', Zeitpunkt ' + esc(new Date(b.am).toLocaleString('de-DE')) + '.</div>' : '')
          + '<div class="akt">' + (b.status !== 'gesehen' ? '<button type="button" data-gesehen="' + esc(b.id) + '">Gesehen</button>' : '') + (b.wer.gesperrt ? '<button type="button" data-frei="' + esc(b.wer.id) + '">Sperre aufheben</button>' : '<button type="button" class="rot" data-sperren="' + esc(b.wer.id) + '" data-name="' + esc(b.wer.name) + '">Profil sperren</button>') + '</div></div></div>';
      }).join('') || '<p class="leer">Noch nichts blockiert.</p>') + '</div></div>';
  }
  function netz() {
    return '<div class="card"><h2>Neue Bilder</h2><p class="cs">Alle Bilder wurden vor dem Speichern geprüft. Fällt Ihnen trotzdem etwas auf, entfernen Sie es hier.</p>'
      + (D.bilder.length ? '<div class="galerie">' + D.bilder.map(function (b) { return '<figure><img src="' + esc(b.url) + '" alt="" loading="lazy"><figcaption><span>' + esc(b.name || '') + '</span><button type="button" data-bildweg="' + esc(b.tenant) + '" data-bild="' + esc(b.id) + '">Entfernen</button></figcaption></figure>'; }).join('') + '</div>' : '<p class="leer">Noch keine Bilder.</p>') + '</div>'
      + '<div class="card"><h2>Profile</h2><div class="liste">' + (D.profile.map(function (p) { return '<div class="zl">' + av(p) + '<div class="tx"><div class="t1"><b>' + esc(p.name || 'Ohne Namen') + '</b> ' + (p.gesperrt ? '<span class="pill b">gesperrt</span>' : (p.sichtbar ? '<span class="pill ok">sichtbar</span>' : '<span class="pill">ausgeblendet</span>')) + '</div><div class="t2">' + esc([p.branche, p.ort].filter(Boolean).join(' · ')) + ' · ' + p.bilder + ' Bilder · ' + zeit(p.am) + '</div>' + (p.grund ? '<div class="t2">Grund: ' + esc(p.grund) + '</div>' : '') + aktionen(p) + '</div></div></div>'; }).join('') || '<p class="leer">Noch keine Profile.</p>') + '</div></div>'
      + '<div class="card"><h2>Neue Kontakte</h2><div class="liste">' + (D.verbindungen.map(function (v) { return '<div class="zl">' + av(v.von) + '<div class="tx"><div class="t1"><b>' + esc(v.von.name) + '</b> → <b>' + esc(v.an.name) + '</b> ' + (v.status === 'ok' ? '<span class="pill ok">vernetzt</span>' : '<span class="pill">' + esc(v.status) + '</span>') + '</div><div class="t2">' + zeit(v.am) + '</div></div></div>'; }).join('') || '<p class="leer">Noch keine Kontakte.</p>') + '</div></div>';
  }
  function regeln() {
    return '<div class="card hilfe"><h2>Was automatisch geprüft wird</h2><p>Jeder Profiltext, jedes Bild und jede Nachricht geht vor dem Speichern durch eine automatische Prüfung. Sie erkennt Hass und Hetze, Beleidigungen und Drohungen, Gewalt, sexuelle Inhalte, Darstellungen von Minderjährigen, Selbstverletzung und Anleitungen zu Straftaten. Was hängen bleibt, wird nicht gespeichert und erscheint unter „Automatisch blockiert“. Nachrichten lesen Sie nicht mit; Sie sehen sie nur, wenn sie blockiert oder gemeldet wurden.</p></div>'
      + '<div class="card hilfe"><h2>Wenn der Verdacht auf Kinderpornografie besteht</h2><ol><li>Das System speichert das Bild <b>nicht</b>, sperrt das Profil sofort und schickt Ihnen eine E-Mail mit „DRINGEND“.</li><li>Suchen, öffnen oder weiterleiten Sie den Inhalt <b>nicht</b>. Schon das Ansehen und Besitzen ist strafbar.</li><li>Erstatten Sie Anzeige bei der Onlinewache der Polizei Ihres Bundeslandes. Nennen Sie Betrieb, Kennung und Zeitpunkt aus dem Fall.</li><li>Sperren Sie unter „Kunden &amp; Zahlen“ zusätzlich das ganze Konto.</li></ol></div>'
      + '<div class="card hilfe"><h2>Wenn ein Mitglied etwas meldet</h2><ol><li>Die Meldung erscheint unter „Meldungen“, Sie bekommen eine E-Mail.</li><li>Prüfen Sie zeitnah. Bei einem Verstoß: Bild entfernen oder Profil sperren. Das Mitglied erfährt Grund und kann widersprechen.</li><li>Kein Verstoß: „Kein Verstoß, erledigt“.</li><li>Meldungen und Vermerke werden nach 12 Monaten automatisch gelöscht.</li></ol></div>';
  }

  /* Rundmail */
  var BRANCHEN = { hochzeit: 'Hochzeitslocation', foodtruck: 'Food Truck', catering: 'Catering', foto: 'Foto & Video', floristik: 'Floristik', deko: 'Dekoration & Verleih', musik: 'Musik & DJ', konditorei: 'Konditorei & Torten', planung: 'Hochzeitsplanung', friseur: 'Friseur & Styling', tagung: 'Tagungshaus', sonstige: 'Sonstiges' };
  var RM = { gruppe: 'alle', branche: 'hochzeit', betreff: '', text: 'Guten Tag {vorname},\n\n\n\nViele Grüße\nManuel Tripi\nclickzauber', anzahl: null };
  function rundmailHtml() {
    var gr = [['alle', 'Alle Kunden'], ['zahlend', 'Nur zahlende Kunden'], ['ohne_abo', 'Ohne Abo (Test, gekündigt, nie gekauft)'], ['zahlung_offen', 'Zahlung offen'], ['branche', 'Eine Branche']];
    return '<div class="card"><h2>Neue Rundmail</h2><p class="cs">Jeder bekommt sie einzeln, niemand sieht die anderen Empfänger. Komplett gesperrte Konten sind ausgenommen. {vorname} wird durch den Vornamen ersetzt.</p>'
      + '<div class="rm"><label>Empfänger<select id="rm-gruppe">' + gr.map(function (g) { return '<option value="' + g[0] + '"' + (RM.gruppe === g[0] ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select></label>'
      + '<label id="rm-br-l"' + (RM.gruppe === 'branche' ? '' : ' hidden') + '>Branche<select id="rm-branche">' + Object.keys(BRANCHEN).map(function (x) { return '<option value="' + x + '"' + (RM.branche === x ? ' selected' : '') + '>' + BRANCHEN[x] + '</option>'; }).join('') + '</select></label>'
      + '<label class="voll">Betreff<input id="rm-betreff" value="' + esc(RM.betreff) + '" maxlength="150"></label>'
      + '<label class="voll">Text<textarea id="rm-text">' + esc(RM.text) + '</textarea></label></div>'
      + '<div class="akt"><button type="button" data-rm="zaehlen">Empfänger zählen</button><button type="button" data-rm="test">Test an mich</button><button type="button" class="p" data-rm="senden">Senden</button><span class="t2" id="rm-msg" style="font-size:13px;color:var(--ink-2)">' + (RM.anzahl != null ? RM.anzahl + ' Empfänger' : '') + '</span></div></div>'
      + '<div class="card"><h2>Bisher verschickt</h2><div class="liste">' + ((D.protokoll || []).filter(function (x) { return x.was === 'rundmail'; }).map(function (x) { return '<div class="zl"><div class="tx"><div class="t1">' + esc(x.hinweis || '') + '</div><div class="t2">' + x.anzahl + ' Empfänger · ' + zeit(x.am) + '</div></div></div>'; }).join('') || '<p class="leer">Noch keine Rundmail verschickt.</p>') + '</div></div>';
  }
  function rmLesen() { var g = $('rm-gruppe'); if (!g) return; RM.gruppe = g.value; RM.branche = $('rm-branche').value; RM.betreff = $('rm-betreff').value; RM.text = $('rm-text').value; }
  function rmPost(extra) { rmLesen(); return fetch(api() + '/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: k(), aktion: 'rundmail', gruppe: RM.gruppe, branche: RM.branche, betreff: RM.betreff, text: RM.text }, extra)) }).then(function (r) { return r.json(); }); }

  /* Protokoll */
  var PW = { akte_geprueft: 'Geprüft und getestet', akte_versendet: 'Einladung verschickt', konto_vorgebaut: 'Konto vorgebaut', einladung_eingeloest: 'Einladung angenommen', alle_neu_laden: 'Alle Cockpits aktualisiert', funktionen_geaendert: 'Funktionen geändert', cockpit_neu_laden: 'Cockpit neu laden lassen', einrichtung_gebucht: 'Einrichtung gebucht (129 €)', pilot_vergeben: 'Pilotplatz vergeben', pilot_entzogen: 'Pilotplatz entzogen', konto_gesperrt: 'Widget gesperrt', konto_komplett_gesperrt: 'Komplett gesperrt', konto_entsperrt: 'Sperre aufgehoben', netz_gesperrt: 'Netzwerk gesperrt', netz_frei: 'Netzwerk freigegeben', mail_vom_betreiber: 'E-Mail geschrieben', tarif_von_hand: 'Tarif geändert', konto_uebergeben: 'Konto übergeben', konto_geloescht: 'Konto gelöscht', kostenlos_bis: 'Kostenlos freigeschaltet', kostenlos_aufgehoben: 'Kostenlos aufgehoben', mahnung: 'Zahlungserinnerung', auto_gesperrt: 'Automatisch pausiert (Zahlung)', zahlung_wieder_da: 'Zahlung eingegangen', rundmail: 'Rundmail', bild_entfernt: 'Bild entfernt', profil_gesperrt: 'Profil gesperrt', profil_frei: 'Profil freigegeben', meldung_erledigt: 'Meldung erledigt' };
  var ROT = { konto_gesperrt: 1, konto_komplett_gesperrt: 1, netz_gesperrt: 1, auto_gesperrt: 1, bild_entfernt: 1, profil_gesperrt: 1, konto_geloescht: 1 };
  function protokollHtml() {
    return '<div class="card"><p class="cs">Die letzten 80 Einträge.</p><div class="liste">'
      + ((D.protokoll || []).map(function (x) {
        var wer = (x.wer || '').replace('Betreiber · ', ''), gut = x.was === 'zahlung_wieder_da' || x.was === 'alle_neu_laden' || x.was.slice(-4) === 'frei' || x.was === 'konto_entsperrt';
        return '<div class="zl"><div class="tx"><div class="t1"><span class="pill' + (ROT[x.was] ? ' b' : (gut ? ' ok' : '')) + '">' + esc(PW[x.was] || x.was) + '</span> <b>' + esc((x.betrieb && x.betrieb.name) || (wer && wer !== 'Betreiber' && wer !== 'automatisch' ? wer : '')) + '</b></div><div class="t2">' + zeit(x.am) + (x.wer === 'automatisch' ? ' · automatisch' : '') + (wer && x.betrieb && x.betrieb.name ? ' · ' + esc(wer) : '') + (x.was === 'alle_neu_laden' && x.anzahl ? ' · ' + x.anzahl + ' Betriebe' : '') + '</div>' + (x.hinweis ? '<div class="t2">' + esc(x.hinweis) + '</div>' : '') + '</div></div>';
      }).join('') || '<p class="leer">Noch keine Einträge.</p>') + '</div></div>';
  }

  /* ── E-Mail an einen Kunden (auch aus „Kunden & Zahlen“) ── */
  function mailFenster() {
    var o = $('pf-ov'); if (o) return o;
    o = document.createElement('div'); o.className = 'ov'; o.id = 'pf-ov'; o.hidden = true;
    o.innerHTML = '<div class="mdl" role="dialog" aria-modal="true" aria-labelledby="pf-mdl-t"><h3 id="pf-mdl-t">E-Mail schreiben</h3><p id="pf-mdl-an"></p><input id="pf-mdl-betreff" placeholder="Betreff" maxlength="150"><textarea id="pf-mdl-text" placeholder="Nachricht"></textarea><p>Antworten des Kunden gehen an projekt@clickzauber.de.</p><div class="akt" style="justify-content:flex-end;margin-top:0"><button type="button" data-pfmail="zu">Abbrechen</button><button type="button" class="p" data-pfmail="go">Senden</button></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) {
      if (e.target === o || e.target.closest('[data-pfmail="zu"]')) { o.hidden = true; return; }
      var b = e.target.closest('[data-pfmail="go"]'); if (!b) return;
      var betreff = $('pf-mdl-betreff').value.trim(), text = $('pf-mdl-text').value.trim();
      if (!betreff || !text) { toast('Betreff und Text fehlen'); return; }
      b.disabled = true;
      window.kontoAktion('nachricht', { email: o.getAttribute('data-mail'), betreff: betreff, text: text })
        .then(function () { b.disabled = false; o.hidden = true; toast('E-Mail gesendet'); }, function (er) { b.disabled = false; toast((er && er.message) || 'Hat nicht geklappt.'); });
    });
    return o;
  }
  window.czPfMail = function (email, name) {
    var o = mailFenster();
    $('pf-mdl-an').textContent = 'An ' + (name ? name + ' · ' : '') + email; $('pf-mdl-betreff').value = ''; $('pf-mdl-text').value = 'Guten Tag,\n\n\n\nViele Grüße\nManuel Tripi\nclickzauber';
    o.setAttribute('data-mail', email); o.hidden = false; setTimeout(function () { $('pf-mdl-betreff').focus(); }, 30);
  };

  /* ── Klicks ── */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'pf-ws-text') WTXT = e.target.value;
    if (/^rm-(betreff|text)$/.test(e.target.id)) rmLesen();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'rm-gruppe') { RM.gruppe = e.target.value; RM.anzahl = null; var l = $('rm-br-l'); if (l) l.hidden = RM.gruppe !== 'branche'; var m = $('rm-msg'); if (m) m.textContent = ''; }
    if (e.target.id === 'rm-branche') { RM.branche = e.target.value; RM.anzahl = null; }
  });
  document.addEventListener('click', function (e) {
    var t = e.target, x; if (!t.closest || !t.closest('.pf')) return;
    if ((x = t.closest('[data-suche]')) && !t.closest('a,button')) { if (window.czKundeSuchen) window.czKundeSuchen(x.getAttribute('data-suche')); return; }
    if ((x = t.closest('[data-pfsub]'))) { SUB = x.getAttribute('data-pfsub'); try { localStorage.setItem('cz_pf_sub', SUB); } catch (er) {} var go = x.getAttribute('data-pfgo'); if (go && window.czVtReiter && aktiv() !== go) window.czVtReiter(go); else render(aktiv()); return; }
    if ((x = t.closest('[data-pfmehr]'))) { ALLE_ANM = !ALLE_ANM; render('ueberblick'); return; }
    if ((x = t.closest('[data-allneu]'))) {
      if (!confirm('Alle offenen Cockpits jetzt neu laden?\n\nErst drücken, wenn alles hochgeladen ist und Vercel „Ready“ zeigt.')) return;
      var m = $('pf-allneu-msg'); x.disabled = true; x.textContent = 'Wird ausgelöst …'; if (m) { m.className = 'pf-stand'; m.textContent = 'Einen Moment …'; }
      window.kontoAktion('alle_neu_laden', {}).then(function (j) {
        try { localStorage.setItem('cz_pf_allneu', JSON.stringify({ am: new Date().toISOString(), n: j.anzahl || 0 })); } catch (er) {}
        toast('Erledigt: ' + zahl(j.anzahl || 0) + ' Cockpits laden in spätestens 20 Sekunden neu.', true);
        render('ueberblick');
      }, function (er) { x.disabled = false; x.textContent = 'Alle Cockpits jetzt aktualisieren'; if (m) { m.className = 'pf-stand'; m.style.color = '#f3a292'; m.textContent = (er && er.message) || 'Hat nicht geklappt.'; } toast((er && er.message) || 'Hat nicht geklappt.'); });
      return;
    }
    if ((x = t.closest('[data-kiarch]'))) {
      var kan = x.getAttribute('data-kiarch') === 'an';
      if (kan && !confirm('KI im Architekten einschalten?\n\nVorher müssen Datenschutzerklärung, AV-Vertrag und AGB § 1h angepasst und hochgeladen sein (Entwürfe: NICHT-HOCHLADEN/einrichtung/Architekt-KI-Rechtstexte.html).')) return;
      x.disabled = true;
      fetch(api() + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k(), architekt: kan }) })
        .then(function (r) { return r.json(); }).then(function (j) { x.disabled = false; if (!j || !j.ok) { toast((j && j.error) || 'Hat nicht geklappt.'); return; } toast(kan ? (j.architekt_schluessel ? 'KI eingeschaltet. Im Konfigurator erscheint „In eigenen Worten“.' : 'Eingeschaltet, aber ANTHROPIC_API_KEY fehlt noch bei Vercel.') : 'KI ausgeschaltet.', true); WS = null; render('ueberblick'); }, function () { x.disabled = false; toast('Keine Verbindung.'); });
      return;
    }
    if ((x = t.closest('[data-appver]'))) {
      x.disabled = true;
      fetch(api() + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k(), app: { min_ios: $('pf-av-ios').value, min_android: $('pf-av-and').value, ios_id: $('pf-av-id').value } }) })
        .then(function (r) { return r.json(); }).then(function (j) { x.disabled = false; if (!j || !j.ok) { toast((j && j.error) || 'Hat nicht geklappt.'); return; } toast('App-Versionen gespeichert'); WS = null; render('ueberblick'); }, function () { x.disabled = false; toast('Keine Verbindung.'); });
      return;
    }
    if ((x = t.closest('[data-wartung]'))) {
      var w = x.getAttribute('data-wartung');
      if (w === 'mail') { RM.gruppe = 'alle'; RM.anzahl = null; RM.betreff = 'Kurze Wartung bei clickzauber'; RM.text = 'Guten Tag {vorname},\n\nwir spielen gerade eine Verbesserung ein' + (WS && WS.text ? ' (' + WS.text + ')' : '') + '. Ihr Formular nimmt in dieser Zeit ganz normal Anfragen an. Im Cockpit können Sie für kurze Zeit nichts ändern.\n\nViele Grüße\nManuel von clickzauber'; if (window.czVtReiter) window.czVtReiter('rundmail'); return; }
      var an = w === 'an';
      if (!confirm(an ? 'Wartung starten? Alle offenen Cockpits zeigen nach spätestens 20 Sekunden den Hinweis, Speichern ist gesperrt. Formulare laufen weiter.' : 'Wartung beenden?')) return;
      x.disabled = true;
      fetch(api() + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k(), wartung: an, text: an ? WTXT : '' }) })
        .then(function (r) { return r.json(); }).then(function (j) {
          x.disabled = false; if (!j || !j.ok) { toast((j && j.error) || 'Hat nicht geklappt.'); return; }
          toast(an ? 'Wartung läuft. Die Cockpits zeigen den Hinweis in spätestens 20 Sekunden.' : 'Wartung beendet. Die Cockpits zeigen kurz „Wartung beendet“.', true);
          if (!an) WTXT = ''; WS = null; render('ueberblick');
        }, function () { x.disabled = false; toast('Keine Verbindung.'); });
      return;
    }
    if ((x = t.closest('[data-rm]'))) {
      var r = x.getAttribute('data-rm'), msg = $('rm-msg');
      if (r === 'zaehlen') { rmPost({ nur_zaehlen: 1 }).then(function (j) { RM.anzahl = j.anzahl; msg.textContent = j.anzahl + ' Empfänger'; }); return; }
      rmLesen(); if (!RM.betreff.trim() || !RM.text.trim()) { toast('Betreff und Text fehlen'); return; }
      if (r === 'test') { x.disabled = true; rmPost({ test: 1 }).then(function (j) { x.disabled = false; toast(j.ok ? 'Test an Sie gesendet' : (j.error || 'Fehlgeschlagen')); }); return; }
      rmPost({ nur_zaehlen: 1 }).then(function (j) {
        if (!j.anzahl) { toast('Keine Empfänger in dieser Gruppe'); return; }
        if (!confirm('Rundmail „' + RM.betreff + '“ jetzt an ' + j.anzahl + ' Kunden senden?')) return;
        x.disabled = true; msg.textContent = 'Wird gesendet …';
        rmPost({}).then(function (j2) { x.disabled = false; if (!j2.ok) { toast(j2.error || 'Fehlgeschlagen'); msg.textContent = ''; return; } toast(j2.gesendet + ' von ' + j2.von + ' gesendet'); RM.betreff = ''; RM.anzahl = null; laden(); });
      });
      return;
    }
    if ((x = t.closest('[data-erledigt]'))) { var n = prompt('Notiz (optional):', ''); if (n === null) return; post('erledigt', { id: x.getAttribute('data-erledigt'), notiz: n }).then(function () { toast('Erledigt'); }, function (er) { toast(er.message); }); return; }
    if ((x = t.closest('[data-gesehen]'))) { post('gesehen', { id: x.getAttribute('data-gesehen') }).then(function () { toast('Markiert'); }, function (er) { toast(er.message); }); return; }
    if ((x = t.closest('[data-bildweg]'))) { var g = prompt('Grund für das Mitglied:', 'Das Bild verstößt gegen § 1j Abs. 4 der AGB.'); if (g === null) return; post('bild_weg', { tenant: x.getAttribute('data-bildweg'), bild: x.getAttribute('data-bild'), grund: g }).then(function () { toast('Bild entfernt, Mitglied informiert'); }, function (er) { toast(er.message); }); return; }
    if ((x = t.closest('[data-sperren]'))) { var g2 = prompt('Profil „' + x.getAttribute('data-name') + '“ sperren. Grund für das Mitglied:', 'Verstoß gegen § 1j Abs. 4 der AGB.'); if (g2 === null) return; post('sperren', { tenant: x.getAttribute('data-sperren'), grund: g2 }).then(function () { toast('Gesperrt, Mitglied informiert'); }, function (er) { toast(er.message); }); return; }
    if ((x = t.closest('[data-frei]'))) { if (!confirm('Sperre aufheben?')) return; post('freigeben', { tenant: x.getAttribute('data-frei') }).then(function () { toast('Freigegeben'); }, function (er) { toast(er.message); }); return; }
  });
  setInterval(function () { if (k() && !document.hidden && D && aktiv()) laden(); }, 60000);
})();
