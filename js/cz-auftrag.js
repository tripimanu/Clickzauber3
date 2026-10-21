/* clickzauber — Auftrags-Cockpit: Food Truck, Catering, Foto & Video, DJ, Floristik, Konditorei.
   Gilt bei body.art-auftrag (js/cz-art.js). Übersicht: vier Kacheln, nächste Samstage, Karte „Heute“,
   Reiter Offen | Zugesagt | Danke sagen. Eine Kachel öffnet das Vollbild-Blatt mit drei großen Knöpfen:
   Annehmen & Angebot senden · Ausweichtermin anbieten · Absagen. Dazu „Auftrag fest eintragen“ (seit 03.10.2026):
   bei Zusage online, per WhatsApp oder am Telefon. Steht vorn, sobald ein Angebot raus ist oder der Kunde zugesagt hat.
   Unter „Absagen“: „Kunde hat selbst abgesagt“ ohne Nachricht. Grenzen und Preise kommen aus dem Konfigurator (cfg.auftrag). */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function heute() { return iso(new Date()); }
  function plusT(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function tagText(s) { if (!s) return ''; var d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return WT[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
  function eur(n) { return Math.round(n || 0).toLocaleString('de-DE') + ' €'; }
  /* Beispiel-Cockpit: ?demo=1 oder Start über den Beispiel-Knopf (token = 'demo'). Dann wird nichts gesendet. */
  function istDemo() { return window.token === 'demo' || /[?&]demo=1/.test(location.search); }
  var AN = false, REITER = 'offen', FILTER = '', AU = {}, BELEGT = {}, LETZT = null, GRUND = '', AKT = null;
  var DANKE = {}; try { DANKE = JSON.parse(localStorage.getItem('cz_au_danke') || '{}'); } catch (x) {}

  /* ── Anfrage lesen ─────────────────────────────────── */
  function alle() { return window.CZ_LEADS_ALL || []; }
  function tel(l) { return l.telefon || l.phone || ''; }
  function ant(l, re) { var a = l.answers || {}; for (var k in a) { if (k.charAt(0) !== '_' && re.test(k)) return a[k]; } return ''; }
  function ort(l) { return l.ort || ant(l, /^ort$|standort|adresse|wo soll/i); }
  function km(l) { var v = ant(l, /anfahrt \(km\)/i); return v === '' || v == null ? null : +v; }
  function personen(l) { return ant(l, /portion|personen|gäste|gaeste/i); }
  function maxPers(l) { var m = String(personen(l)).match(/\d+/g); return m ? +m[m.length - 1] : 0; }
  function tag(l) { return l.termin ? String(l.termin).slice(0, 10) : ''; }
  function istOffen(l) { return ['neu', 'angerufen', 'angebot'].indexOf(l.status || 'neu') >= 0; }
  function istFest(l) { return l.status === 'gebucht'; }
  function vorname(l) { return String(l.name || '').split(' ')[0]; }
  function ausw(l) { return (l.answers || {})._ausweich || null; }
  /* Kunde hat schon Ja gesagt: online angenommen oder einen Ausweichtag gewählt. Dann ist „Auftrag fest eintragen“ der erste Knopf. */
  function zugesagt(l) { var aw = ausw(l); return !!l.angenommen_am || !!(aw && aw.gewaehlt); }
  /* Kunde hat über meine-anfrage.html abgesagt oder will verschieben. Erledigt, sobald der Betrieb danach etwas eingetragen hat. */
  function gastMeldung(l) {
    var g = (l.answers || {})._gast; if (!g || l.status === 'verloren') return null;
    var spaeter = (Array.isArray(l.verlauf) ? l.verlauf : []).some(function (v) { return v.am > g.am && v.wer && v.wer !== 'Gast'; });
    return spaeter ? null : g;
  }
  function wannText(s) { var d = new Date(s); return isNaN(d) ? '' : WT[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '. um ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' Uhr'; }
  function betrieb() { var u = window.user || {}; return u.firma || u.betrieb || u.name || ''; }
  function gruss() { return '\n\nViele Grüße' + (betrieb() ? '\n' + betrieb() : ''); }
  function belegtAm(t, ohne) { var n = BELEGT[t] || 0; alle().forEach(function (l) { if (istFest(l) && tag(l) === t && l.id !== ohne) n++; }); return n; }
  function voll(t, ohne) { return belegtAm(t, ohne) >= (AU.proTag || 1); }
  function warnungen(l) {
    var w = [], s = String(ant(l, /^strom/i)), f = String(ant(l, /stellfl|fl(ä|ae)che/i)), z = String(ant(l, /zufahrt/i)), k = km(l), p = maxPers(l);
    if (/kein strom/i.test(s)) w.push('Kein Strom → Generator'); else if (/weiß ich nicht/i.test(s)) w.push('Strom unklar');
    if (/unter 6/i.test(f)) w.push('Unter 6 m Platz');
    if (/wiese|feldweg/i.test(z)) w.push('Zufahrt über Wiese'); else if (/zu fuß/i.test(z)) w.push('Nur zu Fuß erreichbar');
    if (k != null && AU.maxKm && k > AU.maxKm) w.push('Über ' + AU.maxKm + ' km');
    if (p && AU.minPersonen && p < AU.minPersonen) w.push('Unter ' + AU.minPersonen + ' Personen');
    if (tag(l) && istOffen(l) && voll(tag(l), l.id)) w.push('Tag schon belegt');
    else if (istOffen(l) && (l.answers || {})._kal_belegt) w.push('Im eigenen Kalender steht an dem Tag schon etwas');
    return w;
  }

  /* ── Einstellungen und belegte Tage ────────────────── */
  /* Grenzen (cfg.auftrag) und Fragen-Beschriftungen des gewählten Formulars. Reihenfolge: Server-Profil, dieses Gerät, veröffentlichte Fassung. */
  var KURZ = {}, REIHE = [], CFG = {};
  function schritteMerken(c) {
    if (!c || !Array.isArray(c.steps) || !c.steps.length) return;
    KURZ = {}; REIHE = [];
    c.steps.forEach(function (s) { if (s && s.key) { KURZ[s.key] = s.kurz || s.frage || s.key; REIHE.push(s.key); } });
  }
  function einstellungen() {
    var slug = window.widget; AU = {}; KURZ = {}; REIHE = [];
    if (!slug) return;
    var w = (window.SRV_WIDGETS || []).filter(function (x) { return x.slug === slug || x.id === slug; })[0];
    if (w && w.auftrag) AU = w.auftrag;
    try { var l = JSON.parse(localStorage.getItem('cz_widgets') || '[]').filter(function (x) { return x.id === slug; })[0]; if (l && l.config) { if (l.config.auftrag) AU = l.config.auftrag; schritteMerken(l.config); } } catch (x) {}
    var c = CFG[slug];
    if (c) { if (!Object.keys(AU).length && c.auftrag) AU = c.auftrag; if (!REIHE.length) schritteMerken(c); return; }
    if (!window.API || istDemo()) return;
    CFG[slug] = {};
    fetch(API + '/config?widget=' + encodeURIComponent(slug)).then(function (r) { return r.json(); }).then(function (j) {
      CFG[slug] = (j && (j.config || j)) || {};
      if (window.widget === slug && AN) { einstellungen(); LETZT = null; zeichnen(true); }
    }).catch(function () {});
  }
  /* Alle Antworten fürs Vollbild-Blatt, in der Reihenfolge des Formulars. Adresse, Datum und Nachricht stehen schon oben. */
  function felderVon(l) {
    var a = l.answers || {}, weg = /^(termin|ort|adresse|lieferadresse|freitext|nachricht|gefunden)$/i;
    var keys = Object.keys(a).filter(function (k) { var v = a[k]; return k.charAt(0) !== '_' && !weg.test(k) && !/^anfahrt \(km\)$/i.test(k) && v !== '' && v != null && typeof v !== 'object'; });
    keys.sort(function (x, y) { var i = REIHE.indexOf(x), j = REIHE.indexOf(y); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j); });
    return keys.map(function (k) { var v = String(a[k]); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v = tagText(v); return [KURZ[k] || (window.czFeldLabel && czFeldLabel(l, k)) || (k.charAt(0).toUpperCase() + k.slice(1)), v]; });
  }
  function notiz(l) { return l.message || l.nachricht || ant(l, /^(freitext|nachricht)$/i); }
  function belegungLaden() {
    var slug = window.widget; if (!slug || !window.API) return;
    fetch(API + '/belegung?widget=' + encodeURIComponent(slug)).then(function (r) { return r.json(); }).then(function (j) {
      var l = (j && (j.gesperrt || j.belegt)) || [];
      BELEGT = {};
      (Array.isArray(l) ? l : Object.keys(l)).forEach(function (x) { var t = typeof x === 'string' ? x : (x && (x.datum || x.tag)); if (t) BELEGT[String(t).slice(0, 10)] = 99; });
      zeichnen(true);
    }).catch(function () {});
  }

  /* ── Aussehen ──────────────────────────────────────── */
  var c = document.createElement('style');
  c.textContent = ''
    + '#au-box{display:none}body.art-auftrag #au-box{display:block}'
    + 'body.art-auftrag [data-v="overview"] .vtabs,body.art-auftrag #tm-home,body.art-auftrag [data-v="overview"]>.kpis,body.art-auftrag [data-v="overview"] .au-weg,body.art-auftrag [data-v="overview"]>.grid,body.art-auftrag [data-v="overview"]>.card.nicht-termin,body.art-auftrag [data-v="overview"] .top .rng,body.art-auftrag #sub{display:none!important}'
    + 'body.art-auftrag .unten button[data-view="leads"]{display:none!important}'
    + 'body.art-auftrag .unten button[data-view="overview"]{order:1}body.art-auftrag .unten button[data-view="kalender"]{order:2}body.art-auftrag .unten button[data-view="widget"]{order:3}body.art-auftrag .unten button[data-view="netzprofil"]{order:4}body.art-auftrag .unten button[data-view="entdecken"]{order:5}'
    + 'body.art-auftrag .main{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}'
    + '.au-kopf{display:flex;gap:10px;margin:0 0 14px}'
    + '.au-kopf input{flex:1 1 auto;min-width:0;min-height:54px;border-radius:14px;border:1.5px solid var(--line-2);background:var(--card,var(--panel));color:var(--ink);font:inherit;font-size:16.5px;padding:0 16px}'
    + '.au-neu{flex:0 0 auto;display:flex;align-items:center;gap:8px;min-height:54px;padding:0 18px;border:0;border-radius:14px;background:var(--accent);color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer;white-space:nowrap}.au-neu b{font-size:22px;line-height:1;font-weight:600}'
    + '.au-mon{background:var(--card,var(--panel));border:1px solid var(--line-2);border-radius:20px;padding:18px 18px 14px;margin:0 0 16px}'
    + '.au-mon-z{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:0 0 16px}'
    + '.au-zahl{display:flex;flex-direction:column;gap:3px;min-width:0;text-align:left;background:none;border:0;padding:0;font:inherit;color:var(--ink)}button.au-zahl{cursor:pointer}'
    + '.au-zahl+.au-zahl{border-left:1px solid var(--line-2);padding-left:18px}'
    + '.au-zahl span{font-size:13.5px;color:var(--ink-2)}.au-zahl b{font-size:clamp(24px,6.5vw,34px);font-weight:700;letter-spacing:-.02em;line-height:1.05;font-variant-numeric:tabular-nums}.au-zahl small{font-size:13px;color:var(--ink-3)}'
    + '.au-sa-t{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;color:var(--ink-2);margin:0 0 8px;border-top:1px solid var(--line-2);padding-top:12px}.au-sa-t b{font-weight:600;color:var(--ink)}'
    + '.au-sa{display:flex;gap:6px;overflow-x:auto;padding:2px 0;scrollbar-width:none}.au-sa::-webkit-scrollbar{display:none}'
    + '.au-s{flex:1 0 56px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:12px;background:var(--panel-2)}'
    + '.au-s b{font-size:14px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}.au-s i{font-style:normal;font-size:11.5px;color:var(--ink-3)}'
    + '.au-s.voll{background:color-mix(in srgb,var(--accent) 16%,var(--card,#fff))}.au-s.voll i{color:var(--accent);font-weight:700}'
    + '.au-heute{background:var(--ink);color:var(--card,#fff);border-radius:16px;padding:16px;margin:0 0 14px}'
    + '.au-heute h2{margin:0 0 4px;font-size:20px;color:inherit}.au-heute p{margin:0 0 12px;font-size:14.5px;line-height:1.5;opacity:.9}'
    + '.au-hk{display:flex;flex-wrap:wrap;gap:8px}.au-hk .au-btn{flex:1 1 130px}'
    + '.au-reiter{display:flex;gap:4px;border-bottom:1.5px solid var(--line-2);margin:0 0 14px;overflow-x:auto}'
    + '.au-reiter button{flex:0 0 auto;min-height:48px;padding:0 14px;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-1.5px;font:inherit;font-size:16px;font-weight:600;color:var(--ink-3);cursor:pointer;white-space:nowrap}'
    + '.au-reiter button.an{color:var(--ink);border-bottom-color:var(--accent)}.au-reiter em{font-style:normal;font-size:12.5px;margin-left:4px;color:var(--ink-2)}'
    + '.au-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:10px;align-items:start}'
    + '.au-k{display:flex;flex-direction:column;gap:3px;width:100%;text-align:left;font:inherit;cursor:pointer;background:var(--card,var(--panel));border:1.5px solid var(--line-2);border-left:6px solid var(--warn);border-radius:16px;padding:14px 15px;min-height:48px;color:var(--ink)}'
    + '.au-k.fest{border-left-color:var(--accent)}.au-k.danke{border-left-color:var(--ink-3)}'
    + '.au-dat{font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1}.au-name{font-size:17px;font-weight:600}'
    + '.au-ort,.au-pers{font-size:14.5px;color:var(--ink-2);line-height:1.4}'
    + '.au-ws{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.au-ws i{font-style:normal;font-size:12.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--ink)}'
    + '.au-st{font-size:13.5px;font-weight:600;color:var(--accent);margin-top:5px}'
    + '.au-leer{padding:18px 16px;border:1.5px dashed var(--line-2);border-radius:16px;color:var(--ink-3);font-size:15px;line-height:1.5;grid-column:1/-1}'
    /* Vollbild-Blatt */
    + '.au-bl{position:fixed;inset:0;z-index:9400;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch}.au-bl[hidden]{display:none}'
    + '.au-bl-in{max-width:640px;margin:0 auto;padding:16px 18px calc(28px + env(safe-area-inset-bottom))}'
    + '.au-bl-k{display:flex;align-items:center;justify-content:space-between;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}'
    + '.au-bl-k button{width:48px;height:48px;border:0;background:none;font-size:30px;line-height:1;color:var(--ink-2);cursor:pointer}'
    + '.au-bl-dat{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:4px 0 2px}.au-bl h2{margin:0;font-size:24px}'
    + '.au-bl-z{margin:4px 0 12px;font-size:16px;color:var(--ink-2)}.au-bl-z a{color:var(--accent)}'
    + '.au-bl-f{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0 0 12px;font-size:15.5px}.au-bl-f dt{color:var(--ink-3)}.au-bl-f dd{margin:0;color:var(--ink)}'
    + '.au-bl-n{background:var(--panel-2);border-radius:12px;padding:10px 12px;font-size:15.5px;line-height:1.5;margin:0 0 12px}'
    + '.au-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:64px;margin:0 0 10px;border-radius:14px;border:0;font:inherit;font-size:18px;font-weight:700;text-decoration:none;cursor:pointer;color:#fff;text-align:center;padding:0 14px}'
    + '.au-btn.ruf{background:var(--ink);color:var(--card,#fff)}.au-btn.gruen{background:var(--accent)}.au-btn.gelb{background:var(--warn)}.au-btn.rot{background:var(--bad)}'
    + '.au-btn.hell{background:var(--panel-2);color:var(--ink)}.au-btn.navi{background:#2f6fd6}.au-btn:disabled{opacity:.6}'
    + '.au-heute .au-btn{min-height:52px;font-size:16px;margin:0}'
    + '.au-preis{display:flex;align-items:center;gap:10px;margin:4px 0 12px;font-size:15px;color:var(--ink-2)}.au-preis input{flex:1;min-height:56px;border-radius:12px;border:1.5px solid var(--line-2);font:inherit;font-size:22px;font-weight:700;padding:0 14px;background:var(--card,var(--panel));color:var(--ink);min-width:0}'
    + '.au-mehr{background:var(--panel-2);border-radius:14px;padding:12px;margin:-2px 0 12px}.au-mehr p{margin:0 0 8px;font-size:15px}'
    + '.au-tage{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 10px}.au-tage input{min-height:52px;border-radius:12px;border:1.5px solid var(--line-2);font:inherit;font-size:16px;padding:0 10px;background:var(--card,var(--panel));color:var(--ink);min-width:0}'
    + '.au-gr{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 10px}.au-gr button{min-height:52px;border-radius:12px;border:1.5px solid var(--line-2);background:var(--card,var(--panel));font:inherit;font-size:15.5px;font-weight:600;color:var(--ink);cursor:pointer}'
    + '.au-gr button.an{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,var(--card,#fff))}'
    + '.au-akt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 10px}'
    + '.au-akt a,.au-akt button,.au-akt span{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:72px;border-radius:14px;border:1.5px solid var(--line-2);background:var(--card,var(--panel));color:var(--ink);font:inherit;font-size:15px;font-weight:700;text-decoration:none;cursor:pointer;padding:6px}'
    + '.au-akt svg{width:24px;height:24px;color:var(--accent)}.au-akt .aus{opacity:.4;cursor:default}'
    + '.au-karten{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 12px}.au-karten[hidden]{display:none}'
    + '.au-karten a{display:flex;align-items:center;justify-content:center;min-height:54px;border-radius:12px;background:#2f6fd6;color:#fff;font-weight:700;text-decoration:none;font-size:16px}'
    + '.au-adr{display:block;width:100%;text-align:left;background:none;border:0;padding:0;margin:0 0 14px;font:inherit;font-size:16px;line-height:1.45;color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:3px}'
    + '.au-bl-t{font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 8px}'
    + '.au-alle{margin:0 0 12px}.au-alle summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--ink-2)}'
    + '.au-trenn{border:0;border-top:1px solid var(--line-2);margin:16px 0 14px}'
    + '.au-nf{display:grid;gap:10px}.au-nf label{display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:600;color:var(--ink-2)}'
    + '.au-nf input{min-height:54px;border-radius:12px;border:1.5px solid var(--line-2);background:var(--card,var(--panel));color:var(--ink);font:inherit;font-size:16.5px;font-weight:400;padding:0 14px;min-width:0}'
    + '.au-m{min-height:1.4em;font-size:15px;font-weight:600;margin:4px 0 0}.au-m.bad{color:var(--bad)}'
    + '.au-hin{background:color-mix(in srgb,var(--accent) 12%,var(--card,#fff));border:1.5px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:14px;padding:12px 14px;margin:0 0 14px;font-size:15.5px;line-height:1.5;color:var(--ink)}.au-hin.gelb{background:color-mix(in srgb,var(--warn) 14%,var(--card,#fff));border-color:color-mix(in srgb,var(--warn) 55%,transparent)}.au-hin b{display:block;font-size:16.5px;margin:0 0 2px}'
    + '.au-klein{margin:-4px 0 14px;font-size:14px;line-height:1.45;color:var(--ink-2);text-align:center;text-wrap:pretty}'
    + '.au-ok{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:18px auto 12px;border-radius:50%;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);font-size:32px;font-weight:700}.au-fertig{text-align:center}.au-fertig h2{margin:0 0 6px}'
    + '@media(max-width:420px){.au-mon{padding:16px 14px 12px}.au-zahl+.au-zahl{padding-left:14px}.au-neu{padding:0 14px}.au-dat{font-size:23px}}';
  document.head.appendChild(c);

  /* ── Übersicht ─────────────────────────────────────── */
  function bauen() {
    var v = document.querySelector('[data-v="overview"]'); if (!v || $('au-box')) return;
    var box = document.createElement('div'); box.id = 'au-box';
    box.innerHTML = '<div class="au-kopf"><input type="search" id="au-suche" placeholder="Name oder Telefon" autocomplete="off" aria-label="Nach Name oder Telefonnummer suchen"><button type="button" class="au-neu" id="au-neu"><b>+</b>Schnell-Termin</button></div>'
      + '<div class="au-mon"><div class="au-mon-z"><div class="au-zahl"><span id="au-k1t">Zugesagt</span><b id="au-k1"></b><small id="au-k1n"></small></div>'
      + '<button type="button" class="au-zahl" data-aur="offen"><span>Offen</span><b id="au-k2"></b><small id="au-k2n"></small></button></div>'
      + '<p class="au-sa-t"><span>Nächste Samstage</span><b id="au-k3"></b></p><div class="au-sa" id="au-sa"></div></div>'
      + '<div id="au-heute"></div>'
      + '<div class="au-reiter" id="au-reiter" role="tablist"></div><div class="au-liste" id="au-liste"></div>';
    /* Ganz oben: Hinweis „Live schalten“ (js/cz-live.js), dann Suche und Schnell-Termin. Verlauf, Auswertung und „Neueste Anfragen“ blendet das CSS aus. */
    var ref = $('cz-live') || v.querySelector('.top');
    if (ref && ref.parentNode === v) v.insertBefore(box, ref.nextSibling); else v.insertBefore(box, v.firstChild);
    $('au-neu').addEventListener('click', neuOeffnen);
    $('au-suche').addEventListener('input', function () { FILTER = this.value.trim().toLowerCase(); zeichnen(true); });
    box.addEventListener('click', function (ev) {
      var r = ev.target.closest('[data-aur]'); if (r) { REITER = r.getAttribute('data-aur'); zeichnen(true); return; }
      var k = ev.target.closest('[data-auk]'); if (k) oeffnen(k.getAttribute('data-auk'));
    });
    var b = document.querySelector('.unten button[data-view="overview"]');
    if (b && !b._au) { b._au = 1; Array.prototype.forEach.call(b.childNodes, function (n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = 'Übersicht'; }); }
  }
  function passt(l) {
    if (!FILTER) return true;
    var h = [l.name, tel(l), ort(l), l.email].join(' ').toLowerCase(), d = FILTER.replace(/\D/g, '');
    return h.indexOf(FILTER) >= 0 || (d.length > 2 && h.replace(/\D/g, '').indexOf(d) >= 0);
  }
  function nachTag(a, b) { var x = tag(a) || '9999', y = tag(b) || '9999'; return x < y ? -1 : x > y ? 1 : 0; }
  function kachel(l, art) {
    var k = km(l), w = warnungen(l), aw = ausw(l), st = '', gm = gastMeldung(l);
    if (window.czWaOffen && czWaOffen(l.id)) st = 'WhatsApp noch nicht verschickt';
    else if (gm) st = gm.was === 'absage' ? 'Kunde möchte absagen' : 'Kunde möchte verschieben' + (gm.wunsch ? ' · Wunsch: ' + tagText(gm.wunsch) : '');
    else if (l.angenommen_am && istOffen(l)) st = 'Online angenommen · jetzt fest eintragen';
    else if (aw && aw.gewaehlt && istOffen(l)) st = 'Hat Ausweichtermin gewählt: ' + tagText(aw.gewaehlt);
    else if (aw && aw.keiner && istOffen(l)) st = 'Kein Ausweichtag passt' + (aw.keiner.wunsch ? ' · Wunsch: ' + tagText(aw.keiner.wunsch) : '');
    else if (aw && aw.tage && istOffen(l)) st = 'Ausweichtermin vorgeschlagen';
    else if (l.status === 'angebot') st = 'Angebot gesendet';
    var pr = Number(l.value_est);
    return '<button type="button" class="au-k ' + art + '" data-auk="' + e(l.id) + '">'
      + '<span class="au-dat">' + e(tag(l) ? tagText(tag(l)) : 'Ohne Datum') + '</span>'
      + '<span class="au-name">' + e(l.name || 'Ohne Namen') + '</span>'
      + (ort(l) || k != null ? '<span class="au-ort">' + e([ort(l), k != null ? 'ca. ' + k + ' km' : ''].filter(Boolean).join(' · ')) + '</span>' : '')
      + (personen(l) || pr > 0 ? '<span class="au-pers">' + e([personen(l), pr > 0 ? 'ca. ' + eur(pr) : ''].filter(Boolean).join(' · ')) + '</span>' : '')
      + (w.length ? '<span class="au-ws">' + w.map(function (x) { return '<i>' + e(x) + '</i>'; }).join('') + '</span>' : '')
      + (st ? '<span class="au-st">' + e(st) + '</span>' : '')
      + (window.czWvFaellig && czWvFaellig(l) ? '<span class="au-st"><em class="cz-wv-ab">' + (czWvFaellig(l) === 'ueber' ? 'Erinnerung überfällig' : 'Heute erinnern') + '</em></span>' : '') + '</button>';
  }
  function zeichnen(sofort) {
    if (!AN || !$('au-liste')) return;
    var L = alle(); if (!sofort && L === LETZT) return; LETZT = L;
    var h = heute(), monat = h.slice(0, 7), d = new Date();
    var fest = L.filter(istFest), offen = L.filter(istOffen);
    $('au-k1t').textContent = 'Zugesagt im ' + MON[d.getMonth()];
    var summe = function (a) { return a.reduce(function (s, l) { return s + (+l.value_est || 0); }, 0); };
    var festMon = fest.filter(function (l) { return tag(l).slice(0, 7) === monat; }), offenK = offen.filter(function (l) { return !tag(l) || tag(l) >= h; });
    $('au-k1').textContent = eur(summe(festMon));
    $('au-k1n').textContent = festMon.length === 1 ? '1 Auftrag' : festMon.length + ' Aufträge';
    $('au-k2').textContent = eur(summe(offenK));
    $('au-k2n').textContent = offenK.length === 1 ? '1 Anfrage' : offenK.length + ' Anfragen';
    var sa = [], t = h; while (new Date(t + 'T12:00:00').getDay() !== 6) t = plusT(t, 1);
    for (var i = 0; i < 8; i++) { sa.push(t); t = plusT(t, 7); }
    var frei = sa.filter(function (x) { return !voll(x); }).length;
    $('au-k3').textContent = frei + ' von 8 frei';
    $('au-sa').innerHTML = sa.map(function (x) { var v = voll(x); return '<span class="au-s ' + (v ? 'voll' : 'frei') + '"><b>' + e(x.slice(8, 10).replace(/^0/, '') + '.' + String(+x.slice(5, 7)) + '.') + '</b><i>' + (v ? 'belegt' : 'frei') + '</i></span>'; }).join('');
    var jetzt = fest.filter(function (l) { return tag(l) === h; });
    $('au-heute').innerHTML = jetzt.map(function (l) {
      var o = ort(l), info = [ant(l, /zeitfenster|uhrzeit|beginn/i), personen(l), ant(l, /^strom/i), ant(l, /stellfl|fl(ä|ae)che/i)].filter(Boolean).join(' · ');
      return '<div class="au-heute"><h2>Heute · ' + e(l.name || 'Auftrag') + '</h2><p>' + e([o, info].filter(Boolean).join(' · ')) + '</p><div class="au-hk">'
        + karten(o).map(function (x) { return '<a class="au-btn navi" ' + x[2] + ' href="' + e(x[1]) + '">' + e(x[0]) + '</a>'; }).join('')
        + (tel(l) ? '<a class="au-btn hell" href="tel:' + e(String(tel(l)).replace(/[^\d+]/g, '')) + '">Anrufen</a>' : '') + '</div></div>';
    }).join('');
    var gruppen = {
      offen: offen.filter(passt).sort(function (a, b) { var pa = tag(a) && tag(a) < h, pb = tag(b) && tag(b) < h; return pa !== pb ? (pa ? 1 : -1) : nachTag(a, b); }),
      fest: fest.filter(function (l) { return !tag(l) || tag(l) >= h; }).filter(passt).sort(nachTag),
      danke: fest.filter(function (l) { return tag(l) && tag(l) < h && tag(l) >= plusT(h, -30) && !DANKE[l.id]; }).filter(passt).sort(nachTag)
    };
    if (REITER === 'danke' && !gruppen.danke.length) REITER = 'offen';
    $('au-reiter').innerHTML = [['offen', 'Offen'], ['fest', 'Zugesagt'], ['danke', 'Danke sagen']].filter(function (r) { return r[0] !== 'danke' || gruppen.danke.length; })
      .map(function (r) { return '<button type="button" data-aur="' + r[0] + '"' + (REITER === r[0] ? ' class="an"' : '') + '>' + r[1] + '<em>' + (gruppen[r[0]].length || '') + '</em></button>'; }).join('');
    var g = gruppen[REITER];
    $('au-liste').innerHTML = g.length ? g.map(function (l) { return kachel(l, REITER); }).join('')
      : '<p class="au-leer">' + (REITER === 'offen' ? 'Keine offenen Anfragen.' : REITER === 'fest' ? 'Noch keine zugesagten Aufträge.' : 'Alle bedankt.') + '</p>';
  }

  /* ── Vollbild-Blatt ────────────────────────────────── */
  function blatt() {
    var b = $('au-bl'); if (b) return b;
    b = document.createElement('div'); b.id = 'au-bl'; b.className = 'au-bl'; b.hidden = true;
    b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true');
    document.body.appendChild(b);
    b.addEventListener('click', klick);
    return b;
  }
  function zu() { var b = $('au-bl'); if (b) b.hidden = true; AKT = null; if (/^#anfrage-/.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {} }
  function meldung(t, bad) { var m = $('au-m'); if (m) { m.textContent = t; m.className = 'au-m' + (bad ? ' bad' : ''); } }
  function vorschlaege(l) {
    var basis = tag(l) || heute(), h = heute(), r = [];
    [1, 7, -1, 6, 8, 14, 13, 15, 21, 28].forEach(function (o) { var t = plusT(basis, o); if (r.length < 2 && t > h && !voll(t, l.id)) r.push(t); });
    return r;
  }
  /* Route: Google Maps überall, Apple Karten auf Apple-Geräten, auf Android zusätzlich die Karten-App des Geräts. */
  var APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent), ANDROID = /Android/i.test(navigator.userAgent);
  function karten(o) {
    if (!o) return [];
    var q = encodeURIComponent(o), neu = 'target="_blank" rel="noopener"', r = [['Google Maps', 'https://www.google.com/maps/dir/?api=1&destination=' + q, neu]];
    if (APPLE) r.push(['Apple Karten', 'https://maps.apple.com/?daddr=' + q, neu]);
    if (ANDROID) r.push(['Andere Karten-App', 'geo:0,0?q=' + q, '']);
    return r;
  }
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON = {
    ruf: SVG + '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: SVG + '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    route: SVG + '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };
  /* Nur das Wichtigste oben: Personen, Zeit, Anlass, Speisen oder Paket, Budget, Dauer. Der Rest klappt auf. */
  var WICHTIG = [/portion|personen|gäste|gaeste/i, /zeitfenster|uhrzeit|beginn|^zeit/i, /anlass|veranstaltung|^art$/i, /menü|menu|speise|paket|gericht|leistung|torte|sorte/i, /budget/i, /stunden|dauer/i];
  function wichtige(f) {
    var top = [], rest = f.slice();
    WICHTIG.forEach(function (re) { for (var i = 0; i < rest.length; i++) { if (re.test(rest[i][0])) { top.push(rest.splice(i, 1)[0]); return; } } });
    while (top.length < 4 && rest.length) top.push(rest.shift());
    return { top: top, rest: rest };
  }
  function liste(z) { return '<dl class="au-bl-f">' + z.map(function (f) { return '<dt>' + e(f[0]) + '</dt><dd>' + e(f[1]) + '</dd>'; }).join('') + '</dl>'; }
  function oeffnen(id, obj) {
    var l = obj || alle().filter(function (x) { return String(x.id) === String(id); })[0]; if (!l) return;
    AKT = l; GRUND = '';
    var b = blatt(), offen = istOffen(l), fest = istFest(l), o = ort(l), k = km(l), w = warnungen(l), nr = tel(l), pr = Number(l.value_est);
    var fe = wichtige(felderVon(l)), kt = karten(o), vorbei = tag(l) && tag(l) < heute(), v = vorschlaege(l);
    var mail = l.email ? 'mailto:' + l.email + '?subject=' + encodeURIComponent('Ihre Anfrage' + (tag(l) ? ' für ' + tagText(tag(l)) : '')) + '&body=' + encodeURIComponent('Hallo' + (vorname(l) ? ' ' + vorname(l) : '') + ',\n' + gruss()) : '';
    var ruf = nr ? '<a href="tel:' + e(String(nr).replace(/[^\d+]/g, '')) + '">' + ICON.ruf + 'Anrufen</a>' : '<span class="aus">' + ICON.ruf + 'Anrufen</span>';
    var em = mail ? '<a href="' + e(mail) + '">' + ICON.mail + 'E-Mail</a>' : '<span class="aus">' + ICON.mail + 'E-Mail</span>';
    var rt = !kt.length ? '<span class="aus">' + ICON.route + 'Route</span>'
      : kt.length === 1 ? '<a ' + kt[0][2] + ' href="' + e(kt[0][1]) + '">' + ICON.route + 'Route</a>'
      : '<button type="button" data-au="route">' + ICON.route + 'Route</button>';
    var adrText = e(o) + (k != null ? ' · ca. ' + k + ' km' : '');
    var adr = !o ? '' : kt.length > 1 ? '<button type="button" class="au-adr" data-au="route">' + adrText + '</button>' : '<a class="au-adr" ' + kt[0][2] + ' href="' + e(kt[0][1]) + '">' + adrText + '</a>';
    var info = fe.top.slice(); if (pr > 0) info.push(['Richtwert', 'ca. ' + eur(pr)]);
    var aw = ausw(l), vorn = offen && (l.status === 'angebot' || zugesagt(l)), hin = '', wo = window.czWaOffen && czWaOffen(l.id), gg = gastMeldung(l);
    if (gg) hin += '<div class="au-hin gelb"><b>' + (gg.was === 'absage' ? 'Der Kunde möchte absagen' : 'Der Kunde möchte verschieben') + '</b>' + e([gg.wunsch ? 'Wunsch: ' + tagText(gg.wunsch) + '.' : '', gg.text ? '„' + gg.text + '“' : ''].filter(Boolean).join(' ') || (gg.was === 'absage' ? 'Unten unter „Absagen“: „Kunde hat selbst abgesagt“.' : fest ? 'Unten: „Auf anderen Tag verschieben“. Der Wunschtag ist schon eingetragen.' : 'Unten: „Auftrag fest eintragen“ mit dem neuen Tag oder „Ausweichtermin anbieten“.')) + '</div>';
    if (wo) hin += '<div class="au-hin gelb"><b>WhatsApp noch nicht verschickt</b>Die Nachricht ist noch nicht beim Kunden.<button type="button" class="au-btn gruen" data-au="wa-nochmal" style="margin:10px 0 0">WhatsApp öffnen</button></div>';
    if (offen && l.angenommen_am) hin += '<div class="au-hin"><b>Angebot online angenommen</b>' + e((l.angenommen_von || vorname(l) || 'Der Kunde') + (wannText(l.angenommen_am) ? ', ' + wannText(l.angenommen_am) : '') + '. Tragen Sie den Auftrag jetzt fest ein.') + '</div>';
    else if (offen && aw && aw.gewaehlt) hin += '<div class="au-hin"><b>Ausweichtag gewählt: ' + e(tagText(aw.gewaehlt)) + '</b>Tragen Sie den Auftrag fest ein oder schicken Sie zuerst ein Angebot.</div>';
    else if (offen && aw && aw.keiner) hin += '<div class="au-hin gelb"><b>Keiner der vorgeschlagenen Tage passt</b>' + e([aw.keiner.wunsch ? 'Wunschtag: ' + tagText(aw.keiner.wunsch) + '.' : '', aw.keiner.text ? '„' + aw.keiner.text + '“' : ''].filter(Boolean).join(' ') || 'Schlagen Sie andere Tage vor oder sagen Sie ab.') + '</div>';
    var festK = '<button type="button" class="au-btn ' + (vorn ? 'gruen' : 'hell') + '" data-au="fest">' + (vorn ? 'Auftrag fest eintragen' : 'Schon zugesagt? Auftrag fest eintragen') + '</button>'
      + (vorn ? '<p class="au-klein">Für jede Zusage: online, per WhatsApp oder am Telefon. Der Tag wird damit belegt.</p>' : '')
      + '<div class="au-mehr" id="au-fest" hidden><p>An welchem Tag?</p><div class="au-tage" style="grid-template-columns:1fr"><input type="date" id="au-f-tag" min="' + heute() + '" value="' + e((gg && gg.wunsch) || '') + '"></div><button type="button" class="au-btn gruen" data-au="fest-go">Eintragen</button></div>';
    var angebotK = '<label class="au-preis">Preis<input id="au-betrag" inputmode="numeric" value="' + (pr > 0 ? Math.round(pr) : '') + '" placeholder="z. B. 900">€</label>'
      + '<button type="button" class="au-btn ' + (vorn ? 'hell' : 'gruen') + '" data-au="an">' + (l.status === 'angebot' ? 'Angebot noch einmal senden' : 'Annehmen &amp; Angebot senden') + '</button>';
    var ausK = '<button type="button" class="au-btn gelb" data-au="aus">' + (aw && aw.keiner ? 'Andere Tage vorschlagen' : 'Ausweichtermin anbieten') + '</button>'
      + '<div class="au-mehr" id="au-aus" hidden><p>' + (v.length ? 'Diese Tage sind noch frei:' : 'Bitte zwei Tage wählen:') + '</p><div class="au-tage"><input type="date" id="au-t1" value="' + e((aw && aw.keiner && aw.keiner.wunsch) || v[0] || '') + '"><input type="date" id="au-t2" value="' + e((aw && aw.keiner && aw.keiner.wunsch ? v[0] : v[1]) || '') + '"></div>'
      + '<button type="button" class="au-btn gelb" data-au="aus-go">Vorschlag senden</button></div>';
    b.innerHTML = '<div class="au-bl-in"><div class="au-bl-k"><span>' + (fest ? 'Auftrag' : 'Anfrage') + '</span><button type="button" data-au="zu" aria-label="Schließen">×</button></div>'
      + '<div class="au-bl-dat">' + e(tag(l) ? tagText(tag(l)) : 'Ohne Datum') + '</div><h2>' + e(l.name || 'Ohne Namen') + '</h2>'
      + '<div class="au-akt">' + ruf + em + rt + '</div>'
      + (kt.length > 1 ? '<div class="au-karten" id="au-karten" hidden>' + kt.map(function (x) { return '<a ' + x[2] + ' href="' + e(x[1]) + '">' + e(x[0]) + '</a>'; }).join('') + '</div>' : '')
      + adr + hin
      + (w.length ? '<p class="au-ws" style="margin:0 0 12px">' + w.map(function (x) { return '<i>' + e(x) + '</i>'; }).join('') + '</p>' : '')
      + (info.length ? '<p class="au-bl-t">Angefragt</p>' + liste(info) : '')
      + (notiz(l) ? '<p class="au-bl-n">„' + e(notiz(l)) + '“</p>' : '')
      + '<details class="au-alle au-wv"' + (l.wv_am ? ' open' : '') + '><summary>' + (l.wv_am ? 'Erinnerung' : 'Erinnere mich am …') + '</summary><div id="au-wv"></div></details>'
      + (fe.rest.length ? '<details class="au-alle"><summary>Alle Angaben (' + fe.rest.length + ' weitere)</summary>' + liste(fe.rest) + '</details>' : '')
      + (offen || (fest && (!vorbei || !DANKE[l.id])) ? '<hr class="au-trenn">' : '')
      + (offen ? (vorn ? festK + angebotK + ausK : angebotK + ausK + festK) : '')
      + (fest && vorbei && !DANKE[l.id] ? '<button type="button" class="au-btn gruen" data-au="danke">Danke-Nachricht senden</button>' : '')
      + (fest && !vorbei ? '<button type="button" class="au-btn ' + (gg && gg.was === 'verschieben' ? 'gruen' : 'hell') + '" data-au="umb">Auf anderen Tag verschieben</button>'
        + '<div class="au-mehr" id="au-umb"' + (gg && gg.was === 'verschieben' ? '' : ' hidden') + '><p>Neuer Tag:</p><div class="au-tage" style="grid-template-columns:1fr"><input type="date" id="au-u-tag" min="' + heute() + '" value="' + e((gg && gg.wunsch) || '') + '"></div>'
        + '<button type="button" class="au-btn gruen" data-au="umb-go">Verschieben und Kunde Bescheid geben</button><p class="au-klein">Der neue Tag wird belegt, der bisherige wird frei.</p></div>' : '')
      + (offen || (fest && !vorbei) ? '<button type="button" class="au-btn rot" data-au="ab">Absagen</button>'
        + '<div class="au-mehr" id="au-ab" hidden>' + (offen ? '<p>Warum?</p><div class="au-gr"><button type="button" data-grund="weit">Zu weit weg</button><button type="button" data-grund="klein">Zu wenige Personen</button><button type="button" data-grund="voll">Ausgebucht</button><button type="button" data-grund="passt">Passt nicht</button></div>' : '<p>Der Kunde bekommt eine Absage mit Entschuldigung.</p>')
        + '<button type="button" class="au-btn rot" data-au="ab-go">Absage senden</button>' + (offen ? '<button type="button" class="au-btn hell" data-au="partner">An Partner weitergeben</button>' : '')
        + '<button type="button" class="au-btn hell" data-au="selbst">Kunde hat selbst abgesagt</button><p class="au-klein">Zum Beispiel per WhatsApp. Es geht keine Nachricht an den Kunden.' + (fest ? ' Der Tag wird wieder frei.' : '') + '</p></div>' : '')
      + '<p class="au-m" id="au-m" role="status"></p>' + '<button type="button" data-au="block" style="display:block;margin:14px auto 0;padding:10px 12px;background:none;border:0;color:#a8442f;font:inherit;font-size:14px;text-decoration:underline;cursor:pointer">Diese Person blockieren</button></div>';
    b.hidden = false; b.scrollTop = 0;
    if (window.czWvFuellen && $('au-wv')) czWvFuellen($('au-wv'), l);
  }
  /* Auftrag fest eintragen: Tag im Kalender und im Formular belegen (/buchung), Stand „gebucht“.
     Ist der Tag schon vergeben (mehrere Aufträge pro Tag), wird nur der Stand gesetzt. Danach auf Wunsch die Bestätigung an den Kunden. */
  function festGo(a, l, t) {
    a.disabled = true; meldung('Wird eingetragen …');
    /* mehrfach: so viele Aufträge passen an einen Tag. Jeder steht danach im Kalender und sperrt mit (lib/buchung.js).
       Ist die Anfrage schon an dem Tag eingetragen, reicht der Stand. Jeder andere Fehler wird angezeigt, nichts wird still übergangen. */
    post('/buchung', { widget: l.widget_id || window.widget, lead: l.id, datum: t, mehrfach: AU.proTag || 1 }).then(function (j) {
      if (j && j.ok) return j;
      if (j && /bereits eingeplant/i.test(j.error || '')) return post('/anfrage', { id: l.id, status: 'gebucht' }).then(function (k) { if (!k || !k.ok) throw k; return k; });
      throw j;
    }).then(function () {
      l.status = 'gebucht'; l.termin = t; LETZT = null;
      belegungLaden(); zeichnen(true);
      try { if (window.blLaden) blLaden(); } catch (x) {}
      festFertig(l);
    }).catch(function (j) { a.disabled = false; meldung((j && j.error) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.', true); });
  }
  function festFertig(l) {
    var b = blatt(), n = tel(l), wie = n ? 'per WhatsApp' : l.email ? 'per E-Mail' : '';
    b.innerHTML = '<div class="au-bl-in"><div class="au-bl-k"><span>Auftrag</span><button type="button" data-au="fertig" aria-label="Schließen">×</button></div>'
      + '<div class="au-fertig"><div class="au-ok" aria-hidden="true">✓</div><h2>Fest eingetragen</h2><p class="au-bl-z">' + e((l.name || 'Der Auftrag') + ' · ' + tagText(tag(l)) + ' ist belegt.') + '</p></div>'
      + '<button type="button" class="au-btn gruen" data-au="best">' + (wie ? 'Bestätigung ' + wie + ' senden' : 'Bestätigung kopieren') + '</button>'
      + '<button type="button" class="au-btn hell" data-au="fertig">Nicht nötig, schon besprochen</button>'
      + '<p class="au-m" id="au-m" role="status"></p>' + '<button type="button" data-au="block" style="display:block;margin:14px auto 0;padding:10px 12px;background:none;border:0;color:#a8442f;font:inherit;font-size:14px;text-decoration:underline;cursor:pointer">Diese Person blockieren</button></div>';
    b.scrollTop = 0;
  }
  /* Push „Angebot angenommen“ oder „Ausweichtermin gewählt“ öffnet direkt dieses Blatt (#anfrage-…). */
  window.addEventListener('cz-wa-offen', function () { LETZT = null; zeichnen(true); if (AKT && AKT.id && $('au-bl') && !$('au-bl').hidden) oeffnen(AKT.id, AKT); });
  window.czAuOeffnen = function (id) {
    if (alle().some(function (x) { return String(x.id) === String(id); })) { oeffnen(id); return; }
    if (istDemo() || !window.API) return;
    fetch(API + '/anfrage?id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(window.token)).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && j.anfrage) oeffnen(id, j.anfrage); }).catch(function () {});
  };
  /* Schnell-Termin am Telefon: Tag, worum es geht, Kontakt. Der Tag ist danach belegt wie bei einer Anfrage. */
  function neuOeffnen() {
    AKT = { neu: true };
    var b = blatt(), h = heute();
    b.innerHTML = '<div class="au-bl-in"><div class="au-bl-k"><span>Am Telefon</span><button type="button" data-au="zu" aria-label="Schließen">×</button></div>'
      + '<h2 style="margin:4px 0 14px">Termin eintragen</h2>'
      + '<div class="au-nf"><label>Tag<input type="date" id="au-n-tag" value="' + h + '" min="' + h + '"></label>'
      + '<label>Worum geht es?<input id="au-n-titel" maxlength="110" placeholder="z. B. Hochzeit Familie Berger"></label>'
      + '<label>Telefon<input type="tel" id="au-n-tel" maxlength="40" placeholder="freiwillig"></label>'
      + '<label>Personen<input inputmode="numeric" id="au-n-pers" maxlength="6" placeholder="freiwillig"></label>'
      + '<label>Ort<input id="au-n-ort" maxlength="120" placeholder="freiwillig"></label>'
      + '<label>Notiz<input id="au-n-notiz" maxlength="180" placeholder="freiwillig"></label></div>'
      + '<p class="au-bl-z" style="margin:14px 0">Der Tag wird damit in Ihrem Kalender belegt.</p>'
      + '<button type="button" class="au-btn gruen" data-au="neu-go">Eintragen</button>'
      + '<p class="au-m" id="au-m" role="status"></p>' + '<button type="button" data-au="block" style="display:block;margin:14px auto 0;padding:10px 12px;background:none;border:0;color:#a8442f;font:inherit;font-size:14px;text-decoration:underline;cursor:pointer">Diese Person blockieren</button></div>';
    b.hidden = false; b.scrollTop = 0;
    setTimeout(function () { var t = $('au-n-titel'); if (t) t.focus(); }, 60);
  }
  function neuSpeichern(a) {
    var t = $('au-n-tag').value, ti = $('au-n-titel').value.trim(), pe = $('au-n-pers').value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) { meldung('Bitte einen Tag wählen.', true); return; }
    if (ti.length < 2) { meldung('Bitte eintragen, worum es geht.', true); $('au-n-titel').focus(); return; }
    var no = [pe ? pe + ' Personen' : '', $('au-n-ort').value.trim(), $('au-n-notiz').value.trim()].filter(Boolean).join(' · ').slice(0, 180);
    if (istDemo()) { meldung('Im Beispiel wird nichts gespeichert. Echt ist ' + tagText(t) + ' jetzt belegt.'); return; }
    a.disabled = true; meldung('Wird eingetragen …');
    fetch(API + '/buchung', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window.token, widget: window.widget, aktion: 'eigen', mehrfach: AU.proTag || 1, datum: t, titel: ti, telefon: $('au-n-tel').value.trim(), notiz: no }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: 'Keine Verbindung.' }; })
      .then(function (j) {
        a.disabled = false;
        if (!j || !j.ok) { meldung((j && j.error) || 'Das hat nicht geklappt.', true); return; }
        meldung('Eingetragen. ' + tagText(t) + ' ist belegt.');
        belegungLaden(); try { if (window.blLaden) blLaden(); } catch (x) {}
        setTimeout(function () { zu(); LETZT = null; zeichnen(true); }, 1300);
      });
  }
  /* Am Handy kein leeres Fenster vorab: das blieb nach WhatsApp als weiße Seite stehen. js/cz-whatsapp.js öffnet dort direkt die App. */
  function vorab() { if (istDemo() || (window.czWaMobil && czWaMobil())) return null; try { return window.open('', '_blank'); } catch (x) { return null; } }
  function schicken(win, l, text, art) {
    var n = window.waNummer ? waNummer(tel(l)) : String(tel(l)).replace(/\D/g, ''), url = '';
    if (n) url = 'https://wa.me/' + n + '?text=' + encodeURIComponent(text);
    else if (l.email) url = 'mailto:' + l.email + '?subject=' + encodeURIComponent('Ihre Anfrage') + '&body=' + encodeURIComponent(text);
    if (istDemo() && !l._eigen) { meldung('Im Beispiel wird nichts gesendet. Echt öffnet sich jetzt WhatsApp mit fertigem Text.'); return; }
    if (istDemo() && url.indexOf('https://wa.me/') === 0 && window.czWaAuf) { czWaAuf(url); return; }
    if (!url) { if (win) win.close(); try { navigator.clipboard.writeText(text); } catch (x) {} meldung('Keine Nummer und keine E-Mail. Der Text ist kopiert.', true); return; }
    if (url.indexOf('mailto:') === 0) { if (win) win.close(); location.href = url; return; }
    var info = art ? { id: l.id, name: l.name || '', datum: tag(l) || '', art: 'lead-' + art } : null;
    if (!win && window.czWaAuf) { czWaAuf(url, info); return; }
    if (win && info && window.czWaMerken) czWaMerken(url, info);
    if (win) win.location.href = url; else location.href = url;
  }
  function post(pfad, d) {
    if (istDemo()) return Promise.resolve({ ok: true, link: 'https://clickzauber.de/', annahme_link: 'https://clickzauber.de/', status: d.status });
    return fetch(API + pfad, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: window.token }, d)) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Server nicht erreichbar.' }; });
  }
  function fertig(l, status, text) { if (status) l.status = status; meldung(text); LETZT = null; setTimeout(function () { zu(); zeichnen(true); try { if (window.load && !istDemo()) load(); } catch (x) {} }, 1300); }
  function klick(ev) {
    var l = AKT; if (!l) return;
    var gb = ev.target.closest('[data-grund]');
    if (gb) { GRUND = gb.getAttribute('data-grund'); Array.prototype.forEach.call(document.querySelectorAll('[data-grund]'), function (x) { x.classList.toggle('an', x === gb); }); return; }
    var a = ev.target.closest('[data-au]'); if (!a) return;
    var was = a.getAttribute('data-au'), t = tag(l) ? tagText(tag(l)) : '', o = ort(l), hallo = 'Hallo' + (vorname(l) ? ' ' + vorname(l) : '') + ', ';
    if (was === 'zu') { zu(); return; }
    if (was === 'route') { var kr = $('au-karten'); if (kr) kr.hidden = !kr.hidden; return; }
    if (was === 'neu-go') { neuSpeichern(a); return; }
    if (was === 'fertig') { zu(); LETZT = null; zeichnen(true); try { if (window.load && !istDemo()) load(); } catch (x) {} return; }
    if (was === 'umb') { var um = $('au-umb'); if (um) um.hidden = !um.hidden; return; }
    if (was === 'umb-go') {
      var nt = $('au-u-tag').value, altT = tag(l);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nt) || nt === altT) { meldung('Bitte einen anderen Tag wählen.', true); return; }
      a.disabled = true; meldung('Wird verschoben …'); var wu = vorab();
      /* Erst den neuen Tag belegen, dann den alten freigeben: klappt der neue nicht, bleibt alles, wie es war. */
      post('/buchung', { widget: l.widget_id || window.widget, lead: l.id, datum: nt, mehrfach: AU.proTag || 1 }).then(function (j) {
        if (!j || !j.ok) throw j;
        return altT ? post('/buchung', { widget: l.widget_id || window.widget, lead: l.id, datum: altT, aktion: 'freigeben' }) : j;
      }).then(function () { return istDemo() ? {} : post('/auftrag', { aktion: 'gast-link', id: l.id }).catch(function () { return {}; }); })
        .then(function (j) {
          l.termin = nt; belegungLaden(); try { if (window.blLaden) blLaden(); } catch (x) {}
          schicken(wu, l, hallo + 'Ihr Auftrag ist jetzt am ' + tagText(nt) + (o ? ' in ' + o : '') + ' eingetragen. Wir freuen uns auf Sie!' + (j && j.link ? '\n\nFalls noch etwas dazwischenkommt, können Sie hier absagen oder einen anderen Tag wünschen: ' + j.link : '') + gruss(), 'best');
          fertig(l, 'gebucht', 'Verschoben auf ' + tagText(nt) + '. Der bisherige Tag ist frei.');
        }).catch(function (j) { a.disabled = false; if (wu) wu.close(); meldung((j && j.error) || 'Das hat nicht geklappt. Der bisherige Tag bleibt.', true); });
      return;
    }
    if (was === 'fest') { var gw = gastMeldung(l); if (tag(l) && !(gw && gw.wunsch)) festGo(a, l, tag(l)); else { var fm = $('au-fest'); if (fm) { fm.hidden = !fm.hidden; if (!fm.hidden) $('au-f-tag').focus(); } } return; }
    if (was === 'fest-go') { var ft = $('au-f-tag').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(ft)) { meldung('Bitte einen Tag wählen.', true); return; } festGo(a, l, ft); return; }
    if (was === 'best') {
      var pb = Number(l.value_est), wb = vorab();
      var btxt = hallo + 'vielen Dank für Ihre Zusage! Ihr Auftrag' + (t ? ' am ' + t : '') + (o ? ' in ' + o : '') + ' ist fest eingetragen' + (pb > 0 ? ' (' + eur(pb) + ')' : '') + '. Wir freuen uns auf Sie!';
      (istDemo() ? Promise.resolve({}) : post('/auftrag', { aktion: 'gast-link', id: l.id }).catch(function () { return {}; })).then(function (j) {
        schicken(wb, l, btxt + (j && j.link ? '\n\nFalls etwas dazwischenkommt, können Sie hier absagen oder einen anderen Tag wünschen: ' + j.link : '') + gruss(), 'best');
        fertig(l, null, !tel(l) && !l.email ? 'Der Text ist kopiert. Bitte selbst an den Kunden schicken.' : 'Bestätigung gesendet.');
      });
      return;
    }
    if (was === 'wa-nochmal') { var wo = window.czWaOffen && czWaOffen(l.id); if (wo && window.czWaAuf) czWaAuf(wo.url, { id: l.id, name: l.name || '', datum: tag(l) || '', art: wo.art }); return; }
    if (was === 'selbst') {
      var warFest = istFest(l), ft2 = tag(l);
      a.disabled = true;
      post('/anfrage', { id: l.id, status: 'verloren' }).then(function (j) {
        if (!j.ok) throw j;
        if (warFest && ft2) post('/buchung', { widget: l.widget_id || window.widget, lead: l.id, datum: ft2, aktion: 'freigeben' }).then(function () { belegungLaden(); }, function () {});
        fertig(l, 'verloren', 'Eingetragen: Kunde hat abgesagt.' + (warFest ? ' Der Tag ist wieder frei.' : ''));
      }).catch(function (j) { a.disabled = false; meldung((j && j.error) || 'Das hat nicht geklappt.', true); });
      return;
    }
    /* Blockieren (seit 15.10.2026, wie im Termin-Blatt): Person merkt nichts, Blatt geht danach zu. */
    if (was === 'block') { if (window.czBlockieren) czBlockieren(l.id, function () { var bb = $('au-blatt') || a.closest('[hidden]') ; try { var z = document.querySelector('[data-au="zu"],.au-zu'); if (z) z.click(); } catch (e) {} }); return; }
    if (was === 'aus' || was === 'ab') { var m = $(was === 'aus' ? 'au-aus' : 'au-ab'); if (m) m.hidden = !m.hidden; return; }
    if (was === 'an') {
      var betrag = parseInt(String($('au-betrag').value).replace(/\D/g, ''), 10) || 0;
      if (!betrag) { meldung('Bitte einen Preis eintragen.', true); $('au-betrag').focus(); return; }
      a.disabled = true; var win = vorab();
      var ptext = 'Ihr Auftrag' + (t ? ' am ' + t : '') + (o ? ' in ' + o : '') + (personen(l) ? ', ' + personen(l) : '');
      post('/anfrage', { id: l.id, betrag: betrag, posten_text: ptext }).then(function (j) {
        if (!j.ok) throw j;
        return istDemo() ? { ok: true, annahme_link: 'https://clickzauber.de/' } : fetch(API + '/angebot?senden=1&id=' + encodeURIComponent(l.id) + '&token=' + encodeURIComponent(window.token)).then(function (r) { return r.json(); });
      }).then(function (j) {
        if (!j || !j.ok || !j.annahme_link) throw (j || {});
        schicken(win, l, hallo + 'gern sind wir' + (t ? ' am ' + t : '') + (o ? ' in ' + o : '') + ' für Sie da. Unser Angebot: ' + eur(betrag) + '. Hier können Sie es ansehen und mit einem Tipp annehmen: ' + j.annahme_link + gruss(), 'angebot');
        return post('/anfrage', { id: l.id, status: 'angebot' });
      }).then(function () { l.value_est = betrag; fertig(l, 'angebot', 'Angebot gesendet.'); })
        .catch(function (j) { a.disabled = false; if (win) win.close(); meldung((j && j.error) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.', true); });
      return;
    }
    if (was === 'aus-go') {
      var tage = [$('au-t1').value, $('au-t2').value].filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x) && x >= heute(); });
      if (!tage.length) { meldung('Bitte mindestens einen freien Tag wählen.', true); return; }
      a.disabled = true; var w2 = vorab();
      post('/auftrag', { aktion: 'ausweich', id: l.id, tage: tage }).then(function (j) {
        if (!j.ok || !j.link) throw j;
        schicken(w2, l, hallo + (t ? 'am ' + t + ' sind wir leider schon ausgebucht. ' : '') + 'Wäre ' + tage.map(tagText).join(' oder ') + ' eine Option? Hier mit einem Tipp auswählen: ' + j.link + gruss(), 'ausweich');
        l.answers = Object.assign({}, l.answers, { _ausweich: { tage: tage } });
        fertig(l, null, 'Vorschlag gesendet. Sobald der Kunde wählt, kommt eine Nachricht aufs Handy.');
      }).catch(function (j) { a.disabled = false; if (w2) w2.close(); meldung((j && j.error) || 'Das hat nicht geklappt.', true); });
      return;
    }
    if (was === 'ab-go') {
      var offen = istOffen(l);
      if (offen && !GRUND) { meldung('Bitte zuerst einen Grund antippen.', true); return; }
      var grund = !offen ? 'Leider müssen wir unseren Termin' + (t ? ' am ' + t : '') + ' absagen. Das tut uns sehr leid.'
        : GRUND === 'weit' ? (o ? o + ' liegt' : 'Ihr Ort liegt') + ' leider außerhalb unseres Einsatzgebiets, deshalb können wir diesmal nicht kommen.'
        : GRUND === 'klein' ? 'Für Gruppen ' + (AU.minPersonen ? 'unter ' + AU.minPersonen + ' Personen' : 'in dieser Größe') + ' können wir leider nicht kommen.'
        : GRUND === 'voll' ? (t ? 'Am ' + t + ' sind wir leider schon ausgebucht.' : 'An diesem Tag sind wir leider schon ausgebucht.')
        : 'Diesen Auftrag können wir leider nicht übernehmen.';
      a.disabled = true; var w3 = vorab();
      post('/anfrage', { id: l.id, status: 'verloren' }).then(function (j) {
        if (!j.ok) throw j;
        if (!offen && tag(l)) post('/buchung', { widget: l.widget_id || window.widget, lead: l.id, datum: tag(l), aktion: 'freigeben' }).then(function () { belegungLaden(); }, function () {});
        schicken(w3, l, hallo + (offen ? 'vielen Dank für Ihre Anfrage! ' : '') + grund + ' Wir wünschen Ihnen eine schöne Veranstaltung!' + gruss(), 'absage');
        fertig(l, 'verloren', 'Abgesagt.');
      }).catch(function (j) { a.disabled = false; if (w3) w3.close(); meldung((j && j.error) || 'Das hat nicht geklappt.', true); });
      return;
    }
    if (was === 'partner') {
      zu();
      if (window.dtOeffnen) dtOeffnen(l.id);
      setTimeout(function () { var x = $('dt-weiter-box'), bl = document.querySelector('#dt .blatt'); if (x && bl) bl.scrollTop = Math.max(0, x.offsetTop - 20); }, 600);
      return;
    }
    if (was === 'danke') {
      schicken(vorab(), l, hallo + 'vielen Dank, dass wir' + (t ? ' am ' + t : '') + ' dabei sein durften!' + (AU.bewertung ? ' Wenn es Ihnen gefallen hat, freuen wir uns sehr über eine kurze Bewertung: ' + AU.bewertung : '') + gruss());
      DANKE[l.id] = 1; try { localStorage.setItem('cz_au_danke', JSON.stringify(DANKE)); } catch (x) {}
      fertig(l, null, 'Danke gesendet.');
    }
  }

  /* ── Start ─────────────────────────────────────────── */
  function pruefen() {
    var an = document.body.classList.contains('art-auftrag');
    if (an !== AN) { AN = an; if (an) { einstellungen(); belegungLaden(); bauen(); zeichnen(true); } }
  }
  window.addEventListener('cz-art', function () { pruefen(); if (AN) { einstellungen(); belegungLaden(); LETZT = null; zeichnen(true); } });
  if (window.MutationObserver) new MutationObserver(pruefen).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  setInterval(function () { if (AN && !document.hidden) zeichnen(false); }, 1000);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && AKT) zu(); });
  setTimeout(pruefen, 400);
})();
