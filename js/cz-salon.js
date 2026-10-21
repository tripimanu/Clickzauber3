/* clickzauber — schlanke Salon-Ansicht (Friseur, Nagelstudio, Wimpern, Kosmetik, Barbier, Massage)
   Ziel: zwischen zwei Haarschnitten mit nassen Fingern am Handy bedienbar.
   · Tab „Anfragen“ = das Cockpit: nur HEUTE, zwei Spalten (offen | bestätigt), chronologisch
   · Eine Kachel → ein Vollbild-Blatt mit riesigen Knöpfen (Anrufen, Annehmen, Ablehnen, Verschieben, Nachricht)
   · Schnell-Termin am Telefon: Uhrzeit, Mitarbeiter, Name — fertig
   · Alles aus dem Angebots- und Anzahlungs-Geschäft bleibt verborgen
   Angeschaltet wird die Ansicht, sobald das Formular ein Termin-Formular ist (js/cz-art.js)
   oder sobald unter „Uhrzeit-Termine“ Mitarbeiter eingetragen sind. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function heute() { return iso(new Date()); }
  function plusT(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function mn(z) { var p = String(z || '').split(':'); return (+p[0]) * 60 + (+(p[1] || 0)); }
  function tagText(s) { var d = new Date(s + 'T12:00:00'); return WT[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
  function holen(q) { return fetch(API + '/termine?token=' + encodeURIComponent(window.token || '') + '&' + q).then(function (r) { return r.json(); }); }
  function senden(d) { d.token = window.token; return fetch(API + '/termine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Server nicht erreichbar.' }; }); }); }

  /* ── Aussehen ─────────────────────────────────────────── */
  var CSS = [
    /* Reparatur für alle: Knopfreihen dürfen nie senkrecht zerquetscht werden */
    '.zt-nav,.kv-kopf,.zt-kopf{flex-wrap:wrap}',
    '.zt-nav button,.zt-nav a,.kv-kopf button{flex:0 0 auto;white-space:nowrap;min-height:48px}',
    '.zt-kopf>div:first-child{flex:1 1 220px;min-width:0}',
    /* Punkte-Feld darf keine Knöpfe verdecken */
    'body.cz-pkt-weg #msn{opacity:0;transform:translateY(16px);pointer-events:none}',
    '#msn{transition:opacity .18s ease,transform .18s ease}',
    /* ── Salon-Modus ── */
    /* Vernetzen und Entdecken bleiben erreichbar — nur die Reihenfolge ändert sich: die Termine von heute zuerst. */
    'body.salon .unten button[data-view="overview"]{order:1}body.salon .unten button[data-view="kalender"]{order:2}body.salon .unten button[data-view="widget"]{order:3}body.salon .unten button[data-view="netzprofil"]{order:4}body.salon .unten button[data-view="entdecken"]{order:5}',
    'body.salon [data-v="kalender"] .card.kal p.cs,body.salon [data-v="kalender"] .card .hd p.cs,body.salon [data-v="kalender"] .abo-hin{display:none}',
    'body.salon [data-v="leads"] .vtabs,body.salon [data-v="leads"] .lsuche,body.salon [data-v="leads"] .lchips,body.salon [data-v="leads"]>.card{display:none!important}',
    'body.salon [data-v="leads"] .top{margin-bottom:14px}',
    'body.salon [data-v="kalender"] .top .sub,body.salon [data-v="zeiten"] .top .sub{display:none}',
    'body.salon .sal-aus{display:none!important}',
    /* Platz unten, damit das Punkte-Feld nie die letzte Kachel verdeckt */
    'body.salon .main{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}',
    'body.salon .unten button[data-view="leads"]{display:none!important}',
    'body.salon #tm-home,body.salon .nav-i.nur-termin{display:block!important}',
    'body.salon [data-v="overview"] .vtabs{display:none!important}',
    /* Reiter „Heute“ zeigt die bewährte Liste aus der Übersicht (bestätigt und Anfragen untereinander). */
    '#sal-heute{display:none!important}body.salon.sal-r-anfragen #tm-home .tm-heute{display:none!important}',
    'body.salon #tm-home .tm-heute .tm-z.sal-weg{display:none!important}',
    'body.salon #tm-home .kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin-bottom:14px!important}',
    'body.salon #tm-home .kpis{align-items:stretch!important}body.salon #tm-home .kpi{padding:12px 10px!important;border-radius:14px!important;display:flex!important;flex-direction:column!important;height:auto!important}',
    /* Titel bekommt immer zwei Zeilen Platz, damit alle Zahlen auf einer Höhe stehen */
    'body.salon #tm-home .kpi .l{font-size:11.5px!important;line-height:1.25;white-space:normal;min-height:2.5em;align-items:flex-start!important}',
    'body.salon #tm-home .kpi .v{font-size:24px!important;margin:auto 0 0!important;padding-top:6px;line-height:1}',
    'body.salon #tm-home .kpi .d{display:none}',
    '#sal-box{margin:0 0 18px}',
    '.sal-reiter{display:flex;gap:4px;border-bottom:1.5px solid var(--line-2);margin:0 0 14px}',
    '.sal-reiter button{flex:0 0 auto;min-height:48px;padding:0 16px;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-1.5px;font:inherit;font-size:16.5px;font-weight:600;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;gap:6px}',
    '.sal-reiter button.an{color:var(--ink);border-bottom-color:var(--accent)}',
    '.sal-reiter em{font-style:normal;font-size:12.5px;min-width:22px;padding:2px 7px;border-radius:99px;background:var(--warn);color:#fff}',
    '.sal-reiter em:empty{display:none}',
    '.sal-ma{display:flex;gap:8px;overflow-x:auto;padding:0 0 12px;scrollbar-width:none}',
    '.sal-ma::-webkit-scrollbar{display:none}',
    '.sal-ma button{flex:0 0 auto;min-height:44px;padding:0 16px;border-radius:99px;border:1.5px solid var(--ma,var(--line-2));background:var(--card,var(--panel));color:var(--ma,var(--ink));font:inherit;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.sal-ma button.an{background:var(--ma,var(--ink));border-color:var(--ma,var(--ink));color:#fff}',
    '.sal-raster{display:grid;grid-template-columns:repeat(var(--sp,2),minmax(0,1fr));gap:10px;align-items:start;overflow-x:auto}',
    '.sal-raster:has(.sal-leer:only-child){display:block}',
    '.sal-sp-ma{color:var(--ma,var(--ink-2))!important;font-weight:800}',
    '@media(max-width:620px){.sal-raster{grid-template-columns:repeat(var(--sp,2),minmax(150px,1fr))}}',
    '.sal-k .sal-tag{display:block;font-size:13px;font-weight:700;color:var(--ink-2);margin-top:6px}',
    '@media(max-width:420px){body.salon #tm-home .kpi{padding:10px 7px!important}body.salon #tm-home .kpi .l{font-size:10.5px!important}body.salon #tm-home .kpi .v{font-size:21px!important}}',
    /* Kein Angebots- und Anzahlungsgeschäft im Salon: ein Friseur schneidet Haare */
    'body.salon #dt-stand-box,body.salon #dt-posten-box,body.salon #dt-bel-box,body.salon #dt-angebot-box,body.salon #dt-anz-box,body.salon #dt-weiter-box,body.salon #dt-antw-box,body.salon #dt-spick{display:none!important}',
    'body.salon #dt-akt [data-akt="spick"],body.salon #dt-akt [data-akt="bel"]{display:none}',
    'body.salon .nav-i[data-view="umsatz"]{display:none}',
    'body.salon .tbl .amp,body.salon .tbl .pill,body.salon .tbl .st-pill,body.salon .tbl .why{display:none!important}',
    /* Kopf der Heute-Ansicht */
    '.sal-kopf{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 16px}',
    '.sal-kopf input{flex:1 1 140px;min-width:0;min-height:52px;border-radius:14px;border:1.5px solid var(--line-2);background:var(--card,var(--panel));color:var(--ink);font-size:16.5px;padding:0 16px;font-family:inherit}',
    '.sal-neu{flex:0 0 auto;white-space:nowrap;min-height:52px;padding:0 18px;border-radius:14px;border:0;background:var(--accent);color:var(--on-accent);font-size:16.5px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:8px}',
    '.sal-neu b{font-size:22px;font-weight:600;line-height:1}',
    /* Zwei Spalten */
    '.sal-spalten{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}',
    '.sal-sp>h2{margin:0 0 10px;font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:baseline;gap:7px}',
    '.sal-sp>h2 em{font-style:normal;font-family:var(--fm);color:var(--ink-2)}',
    '.sal-liste{display:flex;flex-direction:column;gap:10px}',
    /* Kacheln */
    '.sal-k{display:block;width:100%;text-align:left;font-family:inherit;cursor:pointer;background:var(--card,var(--panel));border:1.5px solid var(--line-2);border-radius:16px;padding:14px 15px;min-height:48px}',
    '.sal-k:disabled{cursor:default;opacity:.72}',
    '.sal-k .sal-wer{font-size:15px;letter-spacing:.06em;text-transform:uppercase;font-weight:800;color:var(--ma,var(--ink-2));display:block}',
    '.sal-k{border-left:6px solid var(--ma,var(--line-2))!important}',
    '.sal-k .sal-uhr{display:block;font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.08;margin:6px 0 2px;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.sal-k .sal-name{display:block;font-size:17px;font-weight:600;color:var(--ink);line-height:1.3}',
    '.sal-k .sal-tel{display:block;font-size:15px;color:var(--ink-2);font-family:var(--fm);margin-top:2px}',
    '.sal-k .sal-was{display:block;font-size:15px;color:var(--ink-2);margin-top:5px;line-height:1.4}',
    '.sal-k .sal-mit{display:block;font-size:14px;font-weight:600;color:var(--accent);margin-top:6px;line-height:1.4}',
    '.sal-k .sal-ruf{display:block;font-size:14.5px;font-weight:600;color:var(--warn);margin-top:7px;line-height:1.4}',
    '.sal-k.offen{border-color:var(--warn);border-left-width:5px;background:color-mix(in srgb,var(--warn) 7%,var(--card,var(--panel)))}',
    '.sal-k.fest{border-color:color-mix(in srgb,var(--accent) 40%,var(--line-2))}',
    '.sal-k.fest .sal-wer{padding-bottom:9px;border-bottom:1.5px solid color-mix(in srgb,var(--accent) 34%,var(--line-2));margin-bottom:3px}',
    '.sal-k.antwort{border-color:var(--accent);border-width:2.5px;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 14%,transparent)}',
    '.sal-leer{padding:18px 16px;border:1.5px dashed var(--line-2);border-radius:16px;color:var(--ink-3);font-size:15px;line-height:1.5}',
    /* Zwei Spalten bleiben auch am Handy stehen — nebeneinander ist weniger Sucherei als scrollen */
    '@media(max-width:620px){.sal-spalten{gap:9px}.sal-k{padding:12px 11px;border-radius:14px}.sal-k .sal-uhr{font-size:25px;margin:4px 0 2px}.sal-k .sal-name{font-size:16px}.sal-k .sal-tel{font-size:13.5px;letter-spacing:-.02em}.sal-k .sal-was,.sal-k .sal-ruf{font-size:13.5px}.sal-k .sal-mit{font-size:13px}.sal-k .sal-wer{font-size:11.5px}.sal-sp>h2{font-size:12px}}',
    '@media(max-width:420px){.sal-neu{padding:0 14px;font-size:15.5px}.sal-k .sal-uhr{font-size:23px}}',
    /* Vollbild-Blatt */
    'body.salon #sa.sa-bg{align-items:stretch}',
    'body.salon #sa>.sa{max-width:none;border-radius:0;min-height:100%;max-height:none;padding:20px 18px calc(28px + env(safe-area-inset-bottom))}',
    'body.salon #sa h2{font-size:28px}',
    'body.salon #sa .sa-z{font-size:17px}body.salon #sa .sa-z b{font-size:28px}',
    'body.salon #sa .sa-kn{grid-template-columns:minmax(0,1fr)}',
    'body.salon #sa .sa-kn button{min-height:72px;font-size:20px}',
    'body.salon #sa .sa-vs-k{min-height:66px;font-size:18px}',
    'body.salon #sa .sa-wa{min-height:66px;font-size:18px}',
    'body.salon #sa .sa-lang button{min-height:58px;font-size:17px}',
    'body.salon #sa .sa-mehr{display:none}',
    '.sal-ruf-k{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:56px;margin:0 0 10px;border-radius:14px;border:0;background:var(--ink);color:var(--card,var(--panel));font-size:17px;font-weight:600;font-family:inherit;text-decoration:none;cursor:pointer;letter-spacing:.01em}',
    '.sal-ruf-k svg{width:20px;height:20px;flex:0 0 auto}',
    /* Termin-Blatt ruhiger und kompakter (13.10.2026): gleicher Inhalt, kleinere Knöpfe, mittig mit Rand am Computer, Blatt von unten am Handy. */
    'body.salon #sa>.sa{max-width:560px;margin:0 auto;border-radius:22px 22px 0 0;min-height:0;max-height:94vh;max-height:94dvh;overflow-y:auto;padding:16px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.18)}',
    'body.salon #sa.sa-bg{align-items:flex-end}',
    '@media(min-width:700px){body.salon #sa.sa-bg{align-items:center;padding:24px}body.salon #sa>.sa{border-radius:22px;max-height:calc(100vh - 48px)}}',
    'body.salon #sa .sa-k{margin-bottom:6px}body.salon #sa .sa-k button{width:40px;height:40px;font-size:22px;border-radius:50%;background:var(--panel-2)}',
    'body.salon #sa h2{font-size:22px;margin:0 0 2px;letter-spacing:-.01em}',
    'body.salon #sa .sa-z{font-size:14.5px;gap:3px;margin:8px 0 14px}body.salon #sa .sa-z b{font-size:20px;letter-spacing:-.01em}',
    'body.salon #sa .sa-aw{padding:12px 14px;border-radius:14px;margin-bottom:12px}body.salon #sa .sa-aw dl{font-size:14.5px}',
    'body.salon #sa .sa-kn{gap:8px}body.salon #sa .sa-kn button{min-height:52px;font-size:16px;border-radius:14px}',
    'body.salon #sa .sa-ja:disabled{opacity:1;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}',
    'body.salon #sa .sa-vs-k{min-height:50px;font-size:15.5px;border-radius:14px;margin-top:8px}',
    'body.salon #sa .sa-wa{min-height:50px;font-size:15.5px;border-radius:14px}',
    'body.salon #sa .sa-lang{margin-top:16px}body.salon #sa .sa-lang b{font-size:13px;color:var(--ink-2);font-weight:600}body.salon #sa .sa-lang button{min-height:44px;font-size:14.5px;border-radius:12px}',
    'body.salon #sa .sa-opt>summary{min-height:48px;font-size:15px}',
    '@media(max-width:420px){body.salon #sa>.sa{padding:14px 14px calc(18px + env(safe-area-inset-bottom))}body.salon #sa h2{font-size:20px}body.salon #sa .sa-z b{font-size:18px}body.salon #sa .sa-kn button{min-height:50px;font-size:15.5px}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'cz-salon-css'; st.textContent = CSS; document.head.appendChild(st);

  /* ── Modus ────────────────────────────────────────────── */
  var SETUP = null, AN = false;
  function pruefeModus() {
    var artT = document.body.classList.contains('art-termin');
    var hatPersonal = !!(SETUP && (SETUP.personal || []).filter(function (m) { return m.id && m.aktiv !== false; }).length);
    var an = artT || (hatPersonal && !['mit-location', 'art-auftrag', 'art-pipeline'].some(function (k) { return document.body.classList.contains(k); }));
    if (an === AN) return;
    AN = an;
    document.body.classList.toggle('salon', an);
    if (!an) { var bx = $('sal-box'); if (bx && bx.parentNode) bx.parentNode.removeChild(bx); var kp = window._salKopf; if (kp && kp.parentNode) kp.parentNode.removeChild(kp); }
    if (!an) return;
    kopfBauen(); homeBeobachten(); leisteUmbauen(); laden(true);
    /* Das Cockpit eines Salons startet bei den Terminen von heute, nicht bei Zahlen. */
    var jetzt = document.querySelector('.view.on');
    void jetzt;
  }
  function setupLaden() {
    if (!window.token || window._admin || SETUP) return;
    holen('aktion=setup').then(function (j) { if (j && j.ok) { SETUP = j; pruefeModus(); } }).catch(function () {});
  }

  /* ── Übersicht: vier Kacheln, darunter Suche + Schnell-Termin, dann Reiter Heute | Anfragen ── */
  var LISTE = [], OFFENE = [], FILTER = '', MA = '', REITER = 'heute', T_LETZT = 0;
  function kopfBauen() {
    if ($('sal-box') || window._salBox) { einhaengen(); return; }
    var box = document.createElement('div'); box.id = 'sal-box';
    box.innerHTML = '<div class="sal-kopf"><input type="search" id="sal-suche" placeholder="Name oder Telefon" autocomplete="off" aria-label="Nach Name oder Telefonnummer suchen">'
      + '<button type="button" class="sal-neu" id="sal-neu"><b>+</b>Schnell-Termin</button></div>'
      + '<div class="sal-reiter" role="tablist"><button type="button" class="an" data-salr="heute">Heute</button><button type="button" data-salr="anfragen">Anfragen <em id="sal-zr"></em></button></div>'
      + '<div id="sal-heute"><div class="sal-spalten"><div class="sal-sp"><h2>Offen <em id="sal-z1"></em></h2><div class="sal-liste" id="sal-offen"></div></div>'
      + '<div class="sal-sp"><h2>Bestätigt <em id="sal-z2"></em></h2><div class="sal-liste" id="sal-fest"></div></div></div></div>'
      + '<div id="sal-anfr" hidden><div class="sal-ma" id="sal-ma"></div><div class="sal-raster" id="sal-anfr-l"></div></div>';
    $('sal-suche') || null;
    box.querySelector('#sal-suche').addEventListener('input', function () { FILTER = this.value.trim().toLowerCase(); zeichnen(); });
    box.querySelector('#sal-neu').addEventListener('click', function () { neuOeffnen(); });
    box.addEventListener('click', function (ev) {
      var r = ev.target.closest('[data-salr]');
      if (r) { REITER = r.getAttribute('data-salr'); zeichnen(); return; }
      var m = ev.target.closest('[data-salma]');
      if (m) { MA = m.getAttribute('data-salma'); zeichnen(); }
    });
    window._salBox = box;
    einhaengen();
  }
  /* cz-art zeichnet #tm-home immer wieder neu. Die Box bleibt dasselbe Element und wird nur wieder hinter die Kacheln gesetzt. */
  function einhaengen() {
    var box = window._salBox, home = $('tm-home'); if (!box || !home) return;
    /* Suche und Schnell-Termin stehen immer ganz oben, vor den Kacheln. */
    var kp = window._salKopf || box.querySelector('.sal-kopf'); if (kp) window._salKopf = kp;
    if (kp && home.firstChild !== kp) home.insertBefore(kp, home.firstChild);
    Array.prototype.forEach.call(document.querySelectorAll('.sal-kopf'), function (x) { if (x !== kp && x.parentNode) x.parentNode.removeChild(x); });
    var k = home.querySelector('.kpis');
    if (k) { if (k.nextSibling !== box) home.insertBefore(box, k.nextSibling); }
    else if (box.parentNode !== home) home.insertBefore(box, kp && kp.parentNode === home ? kp.nextSibling : home.firstChild);
  }
  /* Suche wirkt auch auf die Heute-Liste */
  function heuteFiltern() {
    Array.prototype.forEach.call(document.querySelectorAll('#tm-home .tm-heute .tm-z'), function (z) {
      var txt = z.textContent.toLowerCase(), dig = FILTER.replace(/\D/g, '');
      var ok = !FILTER || txt.indexOf(FILTER) >= 0 || (dig && txt.replace(/\D/g, '').indexOf(dig) >= 0);
      z.classList.toggle('sal-weg', !ok);
    });
  }
  var homeBeo = null;
  function homeBeobachten() {
    var home = $('tm-home'); if (!home || homeBeo || !window.MutationObserver) return;
    homeBeo = new MutationObserver(function () { if (!AN) return; einhaengen(); heuteFiltern(); });
    homeBeo.observe(home, { childList: true });
  }
  function laden(sofort) {
    if (!AN || !window.token || window._admin) return;
    if (!sofort && Date.now() - T_LETZT < 20000) { zeichnen(); return; }
    var h = heute();
    holen('aktion=liste&von=' + h + '&bis=' + plusT(h, 60)).then(function (j) {
      if (!j || !j.ok) return;
      T_LETZT = Date.now();
      var alle = j.termine || [];
      LISTE = alle.filter(function (t) { return t.datum === h; });
      OFFENE = alle.filter(function (t) { return t.status === 'wunsch' || t.status === 'vorschlag'; });
      zeichnen();
    }).catch(function () {});
  }
  window.czSalonNeu = function () { laden(true); };
  function passt(t) {
    if (!FILTER) return true;
    return (String(t.name || '') + ' ' + String(t.telefon || '')).toLowerCase().indexOf(FILTER) >= 0
      || String(t.telefon || '').replace(/\D/g, '').indexOf(FILTER.replace(/\D/g, '')) >= 0 && !!FILTER.replace(/\D/g, '');
  }
  function kachel(t) {
    var offen = t.status === 'wunsch' || t.status === 'vorschlag';
    var sperre = t.eigen && t.leistung === 'Gesperrt';
    var stumm = t.eigen && !t.telefon;                        /* am Telefon eingetragen, keine Nummer: nicht weiter bearbeitbar */
    var antwort = t.status === 'wunsch' && !!(t.hinweis || t.ersetzt);   /* Kunde hat auf einen Vorschlag geantwortet */
    /* Leistung plus alles, was der Kunde im Formular dazu gewählt hat, und der Gesamtbetrag (lib/termine.js aus answers._auswahl) */
    var was = [t.leistung && t.leistung !== 'Gesperrt' ? t.leistung + (t.extras ? ' + ' + t.extras : '') : '', t.wert > 0 ? (window.czEur ? czEur(t.wert) : t.wert + ' €') : '', t.nachricht ? '„' + t.nachricht + '“' : ''].filter(Boolean).join(' · ');
    /* „+ Termin für eine weitere Person“: jede Person hat ihre eigene Kachel und wird einzeln beantwortet. */
    var mit = t.gruppe ? LISTE.concat(OFFENE).filter(function (x, i, a) { return a.indexOf(x) === i; }).filter(function (x) { return x.gruppe === t.gruppe && String(x.id) !== String(t.id); }) : [];
    var kl = 'sal-k ' + (offen ? 'offen' : 'fest') + (antwort ? ' antwort' : '');
    var maf = window.czMaFarbe ? czMaFarbe(t.personal_id) : '';
    var tag = t.datum && t.datum !== heute() ? '<span class="sal-tag">' + e(tagText(t.datum)) + '</span>' : '';
    return '<button type="button" class="' + kl + '" style="--ma:' + maf + '"' + (stumm || sperre ? ' disabled' : ' data-salk="' + e(String(t.id)) + '"') + '>'
      + '<span class="sal-wer">' + e(sperre ? 'Gesperrt' : (t.personal_name || 'Betrieb')) + '</span>'
      + tag + '<span class="sal-uhr">' + e(t.zeit) + '</span>'
      + '<span class="sal-name">' + e(t.name || 'Ohne Namen') + '</span>'
      + (t.telefon ? '<span class="sal-tel">' + e(t.telefon) + '</span>' : (stumm ? '<span class="sal-tel">am Telefon eingetragen</span>' : ''))
      + (was ? '<span class="sal-was">' + e(was) + '</span>' : '')
      + (mit.length ? '<span class="sal-mit">zusammen mit ' + e(mit.map(function (x) { return (x.name || 'Begleitung') + ' ' + x.zeit; }).join(', ')) + '</span>' : '')
      + (t.hinweis ? '<span class="sal-ruf">' + e(t.hinweis) + '</span>' : '')
      + (t.bescheid ? '<span class="sal-ruf">Kunde noch nicht informiert</span>' : '')
      + '</button>';
  }
  function zeichnen() {
    if (!AN || !$('sal-offen')) return;
    einhaengen();
    Array.prototype.forEach.call(document.querySelectorAll('[data-salr]'), function (b) { b.classList.toggle('an', b.getAttribute('data-salr') === REITER); });
    $('sal-heute').hidden = true;
    document.body.classList.toggle('sal-r-anfragen', REITER === 'anfragen');
    heuteFiltern();
    $('sal-anfr').hidden = REITER !== 'anfragen';
    /* Reiter „Anfragen“: nur offene, alle kommenden Tage, nach Mitarbeiter filterbar */
    var ma = {}; OFFENE.forEach(function (t) { if (t.personal_id) ma[t.personal_id] = t.personal_name || 'Mitarbeiter'; });
    ((SETUP && SETUP.personal) || []).forEach(function (m) { if (m.id && m.aktiv !== false) ma[m.id] = m.name; });
    if (MA && !ma[MA]) MA = '';
    $('sal-ma').innerHTML = '<button type="button" data-salma=""' + (MA ? '' : ' class="an"') + '>Alle</button>'
      + Object.keys(ma).map(function (id) { return '<button type="button" data-salma="' + e(id) + '" style="--ma:' + (window.czMaFarbe ? czMaFarbe(id) : '') + '"' + (MA === id ? ' class="an"' : '') + '>' + e(ma[id]) + '</button>'; }).join('');
    var anfr = OFFENE.filter(passt).filter(function (t) { return !MA || t.personal_id === MA; })
      .sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : mn(a.zeit) - mn(b.zeit); });
    /* Je Mitarbeiter eine eigene Spalte: links Mitarbeiter 1, rechts Mitarbeiter 2 … */
    var ids = MA ? [MA] : Object.keys(ma);
    if (!MA && anfr.some(function (t) { return !t.personal_id; })) ids.push('');
    $('sal-anfr-l').style.setProperty('--sp', Math.max(1, ids.length));
    $('sal-anfr-l').innerHTML = !anfr.length ? '<p class="sal-leer">Keine offenen Anfragen' + (MA ? ' für ' + e(ma[MA]) : '') + '.</p>'
      : ids.map(function (id) {
          var eig = anfr.filter(function (t) { return (t.personal_id || '') === id; });
          return '<div class="sal-sp" style="--ma:' + (window.czMaFarbe ? czMaFarbe(id) : '') + '"><h2 class="sal-sp-ma">' + e(id ? ma[id] : 'Ohne Mitarbeiter') + ' <em>' + (eig.length || '') + '</em></h2>'
            + '<div class="sal-liste">' + (eig.length ? eig.map(kachel).join('') : '<p class="sal-leer">Nichts offen.</p>') + '</div></div>';
        }).join('');
    $('sal-zr').textContent = OFFENE.length || '';
    var nachZeit = function (a, b) { return mn(a.zeit) - mn(b.zeit); };
    var aktiv = LISTE.filter(function (t) { return t.status !== 'abgelehnt' && t.status !== 'abgesagt'; }).filter(passt);
    var offen = aktiv.filter(function (t) { return t.status === 'wunsch' || t.status === 'vorschlag'; }).sort(nachZeit);
    var fest = aktiv.filter(function (t) { return t.status === 'fest'; }).sort(nachZeit);
    $('sal-offen').innerHTML = offen.length ? offen.map(kachel).join('') : '<p class="sal-leer">Nichts offen. Alle Anfragen von heute sind beantwortet.</p>';
    $('sal-fest').innerHTML = fest.length ? fest.map(kachel).join('') : '<p class="sal-leer">Heute noch kein fester Termin.</p>';
    $('sal-z1').textContent = offen.length || '';
    $('sal-z2').textContent = fest.length || '';
  }
  window.czSchnellNeu = neuOeffnen;
  document.addEventListener('click', function (ev) {
    var k = ev.target.closest && ev.target.closest('[data-salr-k]'); if (!k || !AN) return;
    REITER = 'anfragen'; zeichnen();
    var b = $('sal-box'); if (b) window.scrollTo({ top: b.getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' });
  });
  document.addEventListener('click', function (ev) {
    var n = ev.target.closest && ev.target.closest('[data-salneu]');
    if (n) { neuOeffnen(n.getAttribute('data-salneu')); return; }
    var b = ev.target.closest && ev.target.closest('[data-salk]'); if (!b) return;
    var t = LISTE.concat(OFFENE).filter(function (x) { return String(x.id) === b.getAttribute('data-salk'); })[0];
    if (t && window.czSchnellTermin) czSchnellTermin(t);
  });

  /* Untere Leiste: „Zahlen“ heißt „Übersicht“ und steht vorn. „Anfragen“ fällt weg, das steckt jetzt in der Übersicht. */
  function leisteUmbauen() {
    var b = document.querySelector('.unten button[data-view="overview"]'); if (!b || b._sal) return;
    b._sal = 1;
    Array.prototype.forEach.call(b.childNodes, function (n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = 'Übersicht'; });
  }

  /* ── Vollbild-Blatt: großer Anrufen-Knopf oben ────────── */
  function rufKnopf() {
    var sa = $('sa'); if (!sa || sa.hidden || !AN) return;
    var alt = $('sal-ruf'); if (alt) alt.remove();
    var nr = $('sa-z') && $('sa-z').getAttribute('data-tel');
    if (!nr) return;
    var a = document.createElement('a');
    a.id = 'sal-ruf'; a.className = 'sal-ruf-k'; a.href = 'tel:' + nr.replace(/[^\d+]/g, '');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>' + 'Anrufen · ' + e(nr);
    var kn = $('sa-kn'); if (kn && kn.parentNode) kn.parentNode.insertBefore(a, kn);
  }
  var saBeo = null;
  function saBeobachten() {
    var sa = $('sa'); if (!sa || saBeo || !window.MutationObserver) return;
    /* Nur das Blatt selbst und nur sein hidden-Merkmal: beobachtet man den Inhalt mit,
       löst der eingefügte Anrufen-Knopf den Beobachter selbst wieder aus. */
    saBeo = new MutationObserver(function () { pktPruefen(); setTimeout(rufKnopf, 30); });
    saBeo.observe(sa, { attributes: true, attributeFilter: ['hidden'] });
    ['czSchnellTermin', 'czSchnellOeffnen'].forEach(function (n) {
      var alt = window[n];
      if (typeof alt !== 'function' || alt.czSalon) return;
      var neu = function () { var r = alt.apply(this, arguments); setTimeout(rufKnopf, 60); setTimeout(rufKnopf, 400); setTimeout(pktPruefen, 60); return r; };
      neu.czSalon = true; window[n] = neu;
    });
  }

  /* ── Schnell-Termin am Telefon: Uhrzeit, Mitarbeiter, Name ── */
  function neuBauen() {
    if ($('sal-neu-bl')) return;
    var d = document.createElement('div');
    d.className = 'sa-bg'; d.id = 'sal-neu-bl'; d.hidden = true;
    d.innerHTML = '<div class="sa" role="dialog" aria-modal="true" aria-labelledby="sal-neu-h">'
      + '<div class="sa-k"><span>Am Telefon</span><button type="button" id="sal-neu-zu" aria-label="Schließen">×</button></div>'
      + '<h2 id="sal-neu-h">Termin eintragen</h2>'
      + '<div class="sa-chips" id="sal-neu-tage"><button type="button" data-saltag="0" class="an">Heute</button><button type="button" data-saltag="1">Morgen</button><button type="button" data-saltag="x">Anderer Tag</button></div>'
      + '<div class="sa-vs" style="margin-top:0">'
      + '<div class="sa-vs-r" id="sal-neu-dz" hidden><div><label for="sal-neu-d">Tag</label><input type="date" id="sal-neu-d"></div><div></div></div>'
      + '<div class="sa-vs-r"><div><label for="sal-neu-z">Uhrzeit</label><input type="time" id="sal-neu-z" step="300"></div>'
      + '<div><label for="sal-neu-p">Mitarbeiter</label><select id="sal-neu-p"></select></div></div>'
      + '<div class="sa-vs-r"><div><label for="sal-neu-n">Name</label><input type="text" id="sal-neu-n" autocomplete="off" placeholder="Vorname genügt"></div>'
      + '<div><label for="sal-neu-tel">Telefon (freiwillig)</label><input type="tel" id="sal-neu-tel" autocomplete="off" placeholder="für Rückruf und Absage"></div></div>'
      + '<div class="sa-vs-r"><div style="grid-column:1/-1"><label for="sal-neu-t">Leistung oder Notiz (freiwillig)</label><input type="text" id="sal-neu-t" autocomplete="off" list="sal-neu-l" placeholder="z. B. Herrenschnitt"><datalist id="sal-neu-l"></datalist></div></div>'
      + '<button type="button" class="sa-vs-go" id="sal-neu-go" style="background:var(--accent);min-height:62px;font-size:18px">Speichern</button></div>'
      + '<p class="sa-m" id="sal-neu-m"></p></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (ev) {
      if (ev.target === d || ev.target.id === 'sal-neu-zu') { d.hidden = true; pktPruefen(); return; }
      var tg = ev.target.closest('[data-saltag]');
      if (tg) {
        Array.prototype.forEach.call(d.querySelectorAll('[data-saltag]'), function (x) { x.classList.toggle('an', x === tg); });
        var w = tg.getAttribute('data-saltag');
        $('sal-neu-dz').hidden = w !== 'x';
        if (w !== 'x') $('sal-neu-d').value = plusT(heute(), +w);
        return;
      }
      if (ev.target.id === 'sal-neu-go') speichern();
    });
  }
  function neuOeffnen(tag) {
    neuBauen(); if (!SETUP) setupLaden();
    var d = $('sal-neu-bl'), jetzt = new Date();
    jetzt.setMinutes(jetzt.getMinutes() + (15 - jetzt.getMinutes() % 15));
    $('sal-neu-d').value = heute();
    $('sal-neu-z').value = String(jetzt.getHours()).padStart(2, '0') + ':' + String(jetzt.getMinutes()).padStart(2, '0');
    $('sal-neu-n').value = ''; $('sal-neu-t').value = ''; $('sal-neu-tel').value = ''; $('sal-neu-m').textContent = '';
    Array.prototype.forEach.call(d.querySelectorAll('[data-saltag]'), function (x, i) { x.classList.toggle('an', i === 0); });
    $('sal-neu-dz').hidden = true;
    if (typeof tag === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tag) && tag !== heute()) {
      $('sal-neu-d').value = tag; $('sal-neu-z').value = '09:00';
      Array.prototype.forEach.call(d.querySelectorAll('[data-saltag]'), function (x) { x.classList.toggle('an', x.getAttribute('data-saltag') === (tag === plusT(heute(), 1) ? '1' : 'x')); });
      $('sal-neu-dz').hidden = tag === plusT(heute(), 1);
    }
    var ps = ((SETUP && SETUP.personal) || []).filter(function (m) { return m.id && m.aktiv !== false; });
    $('sal-neu-p').innerHTML = ps.map(function (m) { return '<option value="' + e(m.id) + '">' + e(m.name) + '</option>'; }).join('');
    $('sal-neu-l').innerHTML = leistungen().map(function (l) { return l && l.name ? '<option value="' + e(l.name) + '"></option>' : ''; }).join('');
    d.hidden = false; pktPruefen();
    setTimeout(function () { $('sal-neu-n').focus(); }, 60);
  }
  /* Wie lange blockt der Termin? Aus der Leistung, nicht aus dem Buchungsraster —
     sonst sperrt ein Herrenschnitt nur 15 Minuten und das Formular bucht mitten hinein. */
  function leistungen() { return (SETUP && (SETUP.leistungen || (SETUP.setup && SETUP.setup.leistungen))) || []; }
  function dauerVon(text) {
    var t = String(text || '').toLowerCase(), raster = (SETUP && SETUP.setup && +SETUP.setup.raster) || 5;
    var tr = leistungen().filter(function (l) { return l && l.name && t && t.indexOf(String(l.name).toLowerCase()) >= 0; })[0];
    var d = tr && +tr.dauer ? +tr.dauer : 30;
    return Math.ceil(d / raster) * raster;
  }
  function speichern() {
    var b = $('sal-neu-go'), m = $('sal-neu-m');
    var d = $('sal-neu-d').value, z = $('sal-neu-z').value, p = $('sal-neu-p').value, n = $('sal-neu-n').value.trim();
    m.className = 'sa-m';
    if (!p) { m.className = 'sa-m bad'; m.textContent = 'Legen Sie zuerst unter „Uhrzeit-Termine“ einen Mitarbeiter an.'; return; }
    if (!z) { m.className = 'sa-m bad'; m.textContent = 'Bitte eine Uhrzeit eintragen.'; return; }
    if (!n) { m.className = 'sa-m bad'; m.textContent = 'Bitte einen Namen eintragen.'; return; }
    b.disabled = true; m.textContent = 'Wird gespeichert …';
    var was = $('sal-neu-t').value.trim();
    senden({ aktion: 'eigen', datum: d, zeit: z, dauer: dauerVon(was), personal_id: p, name: n, leistung: was || null, telefon: $('sal-neu-tel').value.trim() || null })
      .then(function (j) {
        b.disabled = false;
        if (!j.ok) { m.className = 'sa-m bad'; m.textContent = j.error || 'Das hat nicht geklappt.'; return; }
        m.className = 'sa-m gut'; m.textContent = 'Eingetragen. Die Zeit ist jetzt gesperrt.';
        laden(true);
        try { if (window.czZtNeu) czZtNeu(); if (window.kvLaden) kvLaden(); if (window.czStammNeu) czStammNeu(); } catch (x) {}
        setTimeout(function () { $('sal-neu-bl').hidden = true; pktPruefen(); }, 900);
      });
  }

  /* ── Zahlen-Tab: Anfragen, Verlauf, neueste Anfragen ──── */
  function zahlenRaeumen() {
    var v = document.querySelector('[data-v="overview"]'); if (!v) return;
    var tabs = v.querySelector('.vtabs'); if (tabs) tabs.classList.add('sal-aus');
    var tm = $('tm-home'); if (tm) tm.classList.add('sal-aus');
    Array.prototype.forEach.call(v.querySelectorAll('.kpis'), function (k) { k.classList.remove('nicht-termin'); });
    Array.prototype.forEach.call(v.querySelectorAll('.kpi'), function (k, i) { if (i > 0) k.classList.add('sal-aus'); });
    Array.prototype.forEach.call(v.querySelectorAll('.grid'), function (g) {
      g.classList.remove('nicht-termin');
      var behalten = g.querySelector('#chart');
      if (!behalten) { g.classList.add('sal-aus'); return; }
      g.style.gridTemplateColumns = 'minmax(0,1fr)';
      Array.prototype.forEach.call(g.children, function (c) { if (!c.contains(g.querySelector('#chart'))) c.classList.add('sal-aus'); });
    });
    var rng = v.querySelector('.rng'); if (rng) rng.classList.remove('sal-aus');
  }

  /* ── Punkte-Feld: weg beim Scrollen und bei offenem Blatt ── */
  var pktZeit = null;
  function blattOffen() {
    return ['sa', 'sz', 'er', 'sal-neu-bl'].some(function (id) { var x = $(id); return x && !x.hidden; });
  }
  function pktPruefen() { document.body.classList.toggle('cz-pkt-weg', blattOffen()); }
  window.addEventListener('scroll', function () {
    document.body.classList.add('cz-pkt-weg');
    clearTimeout(pktZeit);
    pktZeit = setTimeout(function () { if (!blattOffen()) document.body.classList.remove('cz-pkt-weg'); }, 900);
  }, { passive: true });
  document.addEventListener('click', function () { setTimeout(pktPruefen, 120); });

  /* ── Start ────────────────────────────────────────────── */
  var altShow = window.show;
  if (typeof altShow === 'function') window.show = function (v) {
    var r = altShow.apply(this, arguments);
    if (AN && v === 'leads') { try { altShow.call(this, 'overview'); } catch (x) {} v = 'overview'; }
    if (AN && v === 'overview') { einhaengen(); laden(false); }
    setTimeout(pktPruefen, 60);
    return r;
  };
  var altArt = window.czArtAnwenden;
  if (typeof altArt === 'function') window.czArtAnwenden = function () { var r = altArt.apply(this, arguments); pruefeModus(); return r; };
  document.addEventListener('visibilitychange', function () { if (!document.hidden && AN) laden(false); });
  setInterval(function () { if (AN && !document.hidden && !blattOffen()) laden(false); }, 45000);
  setTimeout(function () { setupLaden(); pruefeModus(); saBeobachten(); }, 300);
  if (window.MutationObserver) new MutationObserver(function () { pruefeModus(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  setTimeout(saBeobachten, 1500);
})();
