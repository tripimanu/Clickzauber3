/* cz-netz.js — Bereich „Vernetzen“ im Cockpit: Profil mit Bildern, Betriebe finden, vernetzen,
   Nachrichten, Gefällt mir, Partner im Formular, Anfrage an Partner weiterleiten.
   Spricht mit /api/netz. Im Beispiel-Modus (token = 'demo') rechnet cz-netz-demo.js die Antworten. */
(function () {
  'use strict';
  var S = null, LADEN = null, CHAT = null, PL = null, SUCHE = { branche: '', region: '', q: '' };
  function $(id) { return document.getElementById(id); }
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tok() { return window.token || ''; }
  function demo() { return tok() === 'demo' && window.CZ_NETZ_DEMO; }
  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function get(was, q) {
    q = q || {};
    if (demo() && (was === 'vertrauen' || was === 'rangliste')) return Promise.resolve({ ok: false, demo: true });
    if (demo()) return Promise.resolve(kopie(CZ_NETZ_DEMO.get(was, q)));
    var s = 'token=' + encodeURIComponent(tok()) + '&was=' + was;
    Object.keys(q).forEach(function (k) { if (q[k] !== '' && q[k] != null) s += '&' + k + '=' + encodeURIComponent(q[k]); });
    return fetch(API + '/netz?' + s).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Keine Verbindung zum Server.' }; });
  }
  function post(aktion, d) {
    d = d || {};
    if (demo()) return Promise.resolve(kopie(CZ_NETZ_DEMO.post(aktion, d)));
    d.token = tok(); d.aktion = aktion;
    return fetch(API + '/netz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: 'Keine Verbindung zum Server.' }; });
  }
  function hue(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function bg(url, name) {
    if (url) return ' style="background-image:url(&quot;' + e(url) + '&quot;)"';
    var h = hue(name);
    return ' style="background:repeating-linear-gradient(135deg,oklch(.93 .035 ' + h + ') 0 14px,oklch(.9 .04 ' + h + ') 14px 28px)"';
  }
  function av(p, cls) {
    var n = (p && p.name) || '?';
    if (p && p.bild) return '<span class="nz-av ' + (cls || '') + '" style="background-image:url(&quot;' + e(p.bild) + '&quot;)"></span>';
    var h = hue(n);
    return '<span class="nz-av ' + (cls || '') + '" style="background:oklch(.9 .05 ' + h + ');color:oklch(.4 .09 ' + h + ')">' + e(n.charAt(0).toUpperCase()) + '</span>';
  }
  function zeit(iso) {
    if (!iso) return '';
    var d = new Date(iso), j = new Date();
    if (d.toDateString() === j.toDateString()) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + (d.getFullYear() !== j.getFullYear() ? d.getFullYear() : '');
  }
  function meta(p) { return [p.branche_text, p.ort].filter(Boolean).map(e).join(' · '); }
  var HERZ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  var MAXB = 6, EDIT = false, NZ_EDIT = false;
  function like(ziel, bild, n, an, nurZahl, cls) {
    var c = 'nz-like' + (an ? ' on' : '') + (cls ? ' ' + cls : '');
    if (nurZahl) return '<span class="' + c + ' still" title="Gefällt mir">' + HERZ + '<span>' + (n || 0) + '</span></span>';
    return '<button class="' + c + '" data-nz-like="' + e(ziel) + '" data-bild="' + e(bild || '') + '" title="Gefällt mir" aria-pressed="' + (an ? 'true' : 'false') + '">' + HERZ + '<span>' + (n || 0) + '</span></button>';
  }
  function flaeche(url, label) {
    if (url) return ' style="background-image:url(&quot;' + e(url) + '&quot;)"';
    return ' data-leer="' + e(label || '') + '"';
  }
  function knopf(p) {
    var id = e(p.id);
    if (p.status === 'ok') return '<button class="linkbtn" data-nz-chat="' + id + '">Nachricht</button>';
    if (p.status === 'offen_raus') return '<span class="nz-pill w">Anfrage gesendet</span>';
    if (p.status === 'offen_rein') return '<button class="linkbtn gut" data-nz-vernetzen="' + id + '" data-name="' + e(p.name) + '" data-direkt="1">Annehmen</button>';
    if (p.status === 'selbst') return '';
    return '<button class="linkbtn gut" data-nz-vernetzen="' + id + '" data-name="' + e(p.name) + '">Vernetzen</button>';
  }
  function meldung(id, t, gut) { var m = $(id); if (!m) return; m.className = 'smsg ' + (gut ? 'gut' : 'bad'); m.textContent = t || ''; }
  function sperre() {
    if (window._admin) return '<div class="card"><p class="cs" style="margin:0">Im Betreiber-Blick ist der Bereich „Vernetzen“ nicht verfügbar. Er gehört dem Betrieb selbst.</p></div>';
    if (!tok()) return '<div class="card"><p class="cs" style="margin:0">Bitte melden Sie sich an.</p></div>';
    return '';
  }

  /* ═══ Laden ═══ */
  function start(neu) {
    if (!neu && LADEN) return LADEN;
    LADEN = get('start').then(function (j) {
      if (j && j.ok) { S = j; PL = null; badges(); window.CZ_NETZ_S = j; if (window.czMissionen) setTimeout(window.czMissionen, 0); }
      else S = { fehler: (j && j.error) || 'Laden fehlgeschlagen.' };
      return S;
    });
    return LADEN;
  }
  function badges() {
    if (!S || S.fehler) return;
    var offen = (S.rein || []).length + (S.partner_bitten || []).filter(function (x) { return !x.zugestimmt; }).length;
    var a = $('nav-netz'), b = $('nav-nachr');
    if (a) { a.textContent = offen; a.hidden = !offen; }
    if (b) { b.textContent = S.ungelesen; b.hidden = !S.ungelesen; }
  }
  function fehlerBox(el) {
    var sp = sperre();
    if (sp) { el.innerHTML = sp; return true; }
    if (S && S.fehler) {
      el.innerHTML = '<div class="card"><p class="cs" style="margin:0">' + (S.fehler === 'nicht angemeldet' ? 'Bitte neu anmelden.' : 'Vernetzen konnte nicht geladen werden. Bitte laden Sie die Seite neu.') + '</p></div>';
      if (S.fehler !== 'nicht angemeldet') console.warn('[clickzauber] Vernetzen: sql/35 in Supabase prüfen', S.fehler);
      return true;
    }
    return false;
  }

  /* ═══ Gründe, täglich hineinzuschauen: Besuche, Antwortzeit, Top-Empfehler, freie Termine (sql/41) ═══ */
  var STUFE = { stunde: 'Antwortet meist innerhalb einer Stunde', '3std': 'Antwortet meist innerhalb von 3 Stunden', tag: 'Antwortet meist am selben Tag' };
  function deTag(t) { var p = String(t).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0].slice(2) : t; }
  function belohnungHTML() {
    var b = S.besuche, a = S.antwort, t = S.top, br = S.branchen || {};
    if (!b && !a && !t) return '';
    var h = '<div class="nz-woche">';
    if (b) {
      var ks = Object.keys(b.branchen || {}).sort(function (x, y) { return b.branchen[y] - b.branchen[x]; }).slice(0, 3);
      var d = b.woche - (b.vorwoche || 0);
      h += '<div class="card nz-w"><span class="nz-wl">Profilbesuche · 7 Tage</span><div class="nz-wz"><b>' + b.woche + '</b>'
        + (b.woche || b.vorwoche ? '<span class="nz-tr ' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + (d === 0 ? 'wie Vorwoche' : (d > 0 ? '+' : '−') + Math.abs(d) + ' zur Vorwoche') + '</span>' : '') + '</div>'
        + (b.woche ? '<div class="nz-wchips">' + ks.map(function (k) { return '<span>' + b.branchen[k] + ' × ' + e(br[k] || 'Sonstiges') + '</span>'; }).join('') + '</div>'
          : '<p class="cs">Noch keine Besuche. Ein Titelbild und drei Bilder machen Ihr Profil sichtbarer.</p>')
        + '<p class="nz-klein">Namen der Besucher zeigen wir nicht.</p></div>';
    }
    if (a) {
      h += '<div class="card nz-w"><span class="nz-wl">Ihre Antwortzeit</span>'
        + (a.stufe ? '<div class="nz-az"><i></i>' + STUFE[a.stufe] + '</div><p class="cs">Steht als Abzeichen in Ihrem Profil und in Ihrem Formular.</p>'
          : '<div class="nz-wz"><b class="nz-leise">Noch kein Abzeichen</b></div><p class="cs">' + (a.anzahl < 5 ? 'Ab 5 beantworteten Anfragen in 90 Tagen berechnen wir Ihre Antwortzeit.' : 'Das Abzeichen gibt es, wenn Sie meist am selben Tag antworten.') + '</p>')
        + '<p class="nz-klein">Als Antwort zählt: Stand ändern, Nachricht oder Angebot an den Gast.</p></div>';
    }
    if (t) {
      var l = t.liste || [], me = t.ich || {};
      h += '<div class="card nz-w"><span class="nz-wl">Top-Empfehler · ' + (t.region ? 'PLZ-Gebiet ' + e(t.region) : 'alle Gebiete') + '</span>'
        + (l.length ? '<ol class="nz-top">' + l.map(function (x) { return '<li' + (x.id === S.ich ? ' class="ich"' : '') + '><i>' + x.platz + '</i><button class="nz-lnk" data-nz-profil="' + e(x.id) + '">' + e(x.name) + '</button><b>' + x.anzahl + '</b></li>'; }).join('') + '</ol>' : '<p class="cs">Diesen Monat hat noch niemand einen Gast weitergegeben.</p>')
        + (me.platz && me.platz > 3 ? '<p class="cs">Ihr Platz: <b>' + me.platz + '</b></p>' : '')
        + (!me.anzahl ? '<p class="cs">Geben Sie diesen Monat einen Gast an einen Partner weiter, dann stehen Sie hier.</p>' : '')
        + '<p class="nz-klein">Gezählt werden Gäste, die Sie diesen Monat an Partner gegeben haben.</p></div>';
    }
    return h + '</div>';
  }
  var FREI = null;
  function freiHTML() {
    if (!S.hat_profil) return '';
    var pf = S.partner_frei || [], p = S.profil || {};
    if (!FREI) FREI = (p.freie_tage || []).slice();
    var h = '<div class="card"><h2>Freie Termine bei Partnern</h2><p class="cs">Tage, die Ihre Kontakte selbst als frei gemeldet haben.</p>'
      + (pf.length ? '<div class="nz-liste">' + pf.map(function (x) {
        return zeile(x, '<button class="linkbtn" data-nz-chat="' + e(x.id) + '">Nachricht</button>', '<span class="nz-tage">' + x.tage.map(function (d) { return '<i>' + deTag(d) + '</i>'; }).join('') + '</span>');
      }).join('') + '</div>' : '<p class="muted" style="padding:0">Noch keine Meldungen.</p>')
      + '<h3 class="nz-h3">Ihre freien Termine</h3><p class="cs">Melden Sie Tage, an denen Sie noch frei sind. Ihre Kontakte bekommen höchstens einmal am Tag eine Nachricht.</p>'
      + '<div class="nz-tage nz-tage-e">' + FREI.map(function (d) { return '<i>' + deTag(d) + '<button data-nz-frei-weg="' + e(d) + '" aria-label="Entfernen">×</button></i>'; }).join('') + '</div>'
      + '<div class="nz-reihe"><input class="sinp" type="date" id="nz-frei-neu" aria-label="Freier Tag"><button class="linkbtn" data-nz-frei-add>Hinzufügen</button></div>'
      + '<label class="nz-check"><input type="checkbox" id="nz-frei-zeigen"' + (p.frei_zeigen === false ? '' : ' checked') + '><span>Im Formular meiner Partner erscheinen, wenn diese ausgebucht sind und ich frei bin.</span></label>'
      + '<p class="smsg" id="nz-frei-msg"></p></div>';
    return h;
  }
  function freiSpeichern(zeigen) {
    var d = { tage: FREI };
    if (typeof zeigen === 'boolean') d.frei_zeigen = zeigen;
    post('frei', d).then(function (j) {
      if (!j || !j.ok) { meldung('nz-frei-msg', (j && j.error) || 'Das ging nicht'); return; }
      start(true).then(function () { FREI = null; findenZeichnen(); hinweis(j.benachrichtigt ? 'Gespeichert. Ihre Kontakte wurden benachrichtigt.' : 'Gespeichert.'); });
    });
  }
  document.addEventListener('click', function (ev) {
    var x = ev.target.closest && ev.target.closest('[data-nz-frei-add],[data-nz-frei-weg]');
    if (!x || !FREI) return;
    if (x.hasAttribute('data-nz-frei-weg')) { var w = x.getAttribute('data-nz-frei-weg'); FREI = FREI.filter(function (d) { return d !== w; }); freiSpeichern(); return; }
    var v = ($('nz-frei-neu') || {}).value || '', heute = new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < heute) { meldung('nz-frei-msg', 'Bitte einen Tag ab heute wählen.'); return; }
    if (FREI.indexOf(v) < 0) { if (FREI.length >= 20) { meldung('nz-frei-msg', 'Höchstens 20 Tage.'); return; } FREI.push(v); FREI.sort(); }
    freiSpeichern();
  });
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'nz-frei-zeigen') freiSpeichern(ev.target.checked); });
  function abzeichenHTML(p) {
    var z = p.abzeichen || {}, h = '';
    var vs = p.eigen && window.czVertrauenStufe != null ? window.czVertrauenStufe() : z.vertrauen;
    if (vs != null && vs > -1 && window.czAbzeichen) h += '<span class="nz-bz vt">' + czAbzeichen.svg(vs, 22) + 'Vertrauen: ' + e(czAbzeichen.name(vs)) + '</span>';
    var kr = p.eigen && window.czVertrauenKrone ? window.czVertrauenKrone() : z.krone;
    if (kr != null && kr !== false) h += '<span class="nz-bz top"><svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-right:4px" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z" fill="#e0b23a" stroke="#8a6410" stroke-width="1.3" stroke-linejoin="round"/></svg>Monatssieger' + (kr ? ' im PLZ-Gebiet ' + e(kr) : '') + '</span>';
    if (z.antwort && STUFE[z.antwort]) h += '<span class="nz-bz az"><i></i>' + STUFE[z.antwort] + '</span>';
    if (z.top) h += '<span class="nz-bz top">Top-Empfehler des Monats</span>';
    var ft = (p.freie_tage || []);
    if (ft.length && !p.eigen) h += '<span class="nz-bz frei">Noch frei:</span>' + '<span class="nz-tage">' + ft.map(function (d) { return '<i>' + deTag(d) + '</i>'; }).join('') + '</span>';
    return h ? '<div class="nz-bzs">' + h + '</div>' : '';
  }

  /* ═══ Übersicht: passende Betriebe, neu in der Nähe, Suche ═══ */
  function findenZeichnen() {
    var el = $('nz-finden'); if (!el) return;
    if (fehlerBox(el)) return;
    var ich = S.profil || {}, plz = String(ich.plz || '').slice(0, 2), h = '';
    h += '<div class="nz-sb" role="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="nz-sb-q" type="search" autocomplete="off" placeholder="Betrieb suchen, z. B. Foodtruck, Floristik oder Ravensburg" aria-label="Betrieb suchen" aria-autocomplete="list" aria-controls="nz-sb-liste" aria-expanded="false"><div class="nz-sb-liste" id="nz-sb-liste" role="listbox" hidden></div></div>';
    var em = S.empfehlungen || {};
    if ((S.kontakte || []).length || em.bekommen || em.geschickt) h += '<div class="card nz-zaehler"><div class="nz-zl"><b>' + (em.bekommen || 0) + '</b><span>Gäste von Partnern bekommen</span></div><div class="nz-zl"><b>' + (em.geschickt || 0) + '</b><span>Anfragen an Partner gegeben</span></div>' + (em.geschickt ? '<div class="nz-zl"><b>' + Math.round(100 * (em.angenommen || 0) / em.geschickt) + ' %</b><span>davon von Partnern beantwortet</span></div>' : '') + '<p class="cs">Dieses Jahr. Gezählt werden Weiterleitungen, gemeinsame Pakete und Anfragen über „Unsere Partner“ im Formular.</p></div>';
    h += belohnungHTML();
    if (!S.hat_profil) h += '<div class="card nz-hinweis"><div><h2>Legen Sie zuerst Ihr Profil an</h2><p class="cs" style="margin:0">Andere Betriebe sollen sehen, wer anfragt: Name, Branche, Ort und ein paar Bilder. Ohne Profil können Sie schauen, aber nicht vernetzen.</p></div><button class="linkbtn gut" data-view="netzprofil">Profil anlegen</button></div>';
    var rein = S.rein || [], bitten = (S.partner_bitten || []).filter(function (x) { return !x.zugestimmt; });
    var offen = (rein.length || bitten.length) ? '<div class="card"><h2>Offene Anfragen</h2><div class="nz-liste">'
      + rein.map(function (p) { return zeile(p, '<button class="linkbtn gut" data-nz-antwort="' + e(p.verbindung) + '" data-ja="1">Annehmen</button><button class="linkbtn" data-nz-antwort="' + e(p.verbindung) + '">Ablehnen</button>', 'möchte sich vernetzen'); }).join('')
      + bitten.map(function (p) { return zeile(p, '<button class="linkbtn gut" data-nz-zustimmen="' + e(p.id) + '" data-ja="1">Zustimmen</button><button class="linkbtn" data-nz-zustimmen="' + e(p.id) + '">Ablehnen</button>', 'möchte Sie als Partner zeigen'); }).join('')
      + '</div></div>' : '';
    h += '<div class="nz-start"><div class="nz-feed">'
      + '<div class="card"><h2>Passt zu Ihnen</h2><p class="cs">' + (ich.branche && PASST[ich.branche] ? 'Branchen, die gut zu ' + e((S.branchen || {})[ich.branche] || 'Ihnen') + ' passen' + (plz ? ', im PLZ-Gebiet ' + e(plz) : '') + '.' : 'Tragen Sie in Ihrem Profil Branche und Postleitzahl ein, dann sehen Sie hier passende Betriebe.') + '</p><div class="nz-karten" id="nz-passt"><p class="muted" style="padding:0">Lade …</p></div></div>'
      + '<div class="card"><h2>Neu in Ihrer Nähe</h2><p class="cs">' + (plz ? 'Zuletzt dazugekommen oder aktualisiert, im PLZ-Gebiet ' + e(plz) + '.' : 'Zuletzt dazugekommen oder aktualisiert.') + '</p><div class="nz-liste" id="nz-neu"><p class="muted" style="padding:0">Lade …</p></div></div></div>'
      + '<aside class="nz-seite">' + offen + freiHTML() + '</aside></div>';
    var br = S.branchen || {};
    h += '<div class="card nz-block"><h2>Alle Betriebe durchsuchen</h2><div class="nz-suche"><select class="sinp" id="nz-s-br" aria-label="Branche"><option value="">Alle Branchen</option>'
      + Object.keys(br).map(function (k) { return '<option value="' + k + '"' + (SUCHE.branche === k ? ' selected' : '') + '>' + e(br[k]) + '</option>'; }).join('')
      + '</select><input class="sinp" id="nz-s-reg" inputmode="numeric" maxlength="5" placeholder="PLZ-Gebiet, z. B. 88" value="' + e(SUCHE.region) + '" aria-label="Postleitzahl-Gebiet">'
      + '<input class="sinp" id="nz-s-q" type="search" placeholder="Name, Ort oder Stichwort" value="' + e(SUCHE.q) + '" aria-label="Stichwort"><button class="linkbtn gut" id="nz-s-go">Suchen</button></div>'
      + '<p class="nz-hilfe" style="margin-bottom:0">Das PLZ-Gebiet sind die ersten zwei Ziffern der Postleitzahl. 88 findet zum Beispiel alle Betriebe rund um den Bodensee.</p></div>'
      + '<div id="nz-treffer"><p class="muted">Lade …</p></div>';
    var k = S.kontakte || [];
    h += '<div class="card nz-block" style="margin-top:22px"><h2>Meine Kontakte <span class="nz-zahl">' + k.length + '</span></h2><p class="cs">Mit diesen Betrieben sind Sie vernetzt. Sie können ihnen schreiben, Anfragen weiterleiten und sie im Formular als Partner zeigen.</p>'
      + (k.length ? '<div class="nz-liste">' + k.map(function (p) { return zeile(p, '<button class="linkbtn" data-nz-chat="' + e(p.id) + '">Nachricht</button>'); }).join('') + '</div>' : '<p class="muted" style="padding:0">Noch keine Kontakte. Oben finden Sie Vorschläge aus Ihrer Nähe.</p>')
      + ((S.raus || []).length ? '<h3 class="nz-h3">Gesendet, noch nicht beantwortet</h3><div class="nz-liste">' + S.raus.map(function (p) { return zeile(p, '<span class="nz-pill w">Anfrage gesendet</span>'); }).join('') + '</div>' : '')
      + '</div>';
    el.innerHTML = h;
    vorschlaege(); suchen();
  }
  function zeile(p, rechts, unter) {
    return '<div class="nz-z"><button class="nz-z-l" data-nz-profil="' + e(p.id) + '">' + av(p, 's') + '<span class="nz-z-tx"><b>' + e(p.name) + '</b><span>' + (unter ? (String(unter).charAt(0) === '<' ? unter : e(unter)) : meta(p)) + '</span></span></button><div class="nz-z-r">' + (rechts || '') + '</div></div>';
  }
  /* Welche Branchen gut zueinander passen. Daraus entstehen die Vorschläge „Passt zu Ihnen“. */
  var PASST = {
    hochzeit: ['foodtruck', 'catering', 'floristik', 'deko', 'musik', 'foto', 'konditorei', 'planung', 'friseur'],
    foodtruck: ['hochzeit', 'tagung', 'musik', 'deko', 'planung'],
    catering: ['hochzeit', 'tagung', 'deko', 'musik', 'planung'],
    foto: ['hochzeit', 'floristik', 'friseur', 'planung', 'deko'],
    floristik: ['hochzeit', 'deko', 'foto', 'planung', 'konditorei'],
    deko: ['hochzeit', 'floristik', 'catering', 'tagung', 'planung'],
    musik: ['hochzeit', 'foodtruck', 'catering', 'tagung', 'planung'],
    konditorei: ['hochzeit', 'catering', 'floristik', 'planung'],
    planung: ['hochzeit', 'catering', 'foto', 'floristik', 'musik', 'deko'],
    friseur: ['hochzeit', 'foto', 'planung'],
    tagung: ['catering', 'foodtruck', 'musik', 'deko']
  };
  function karteKlein(p) {
    return '<div class="nz-karte"><button class="nz-karte-o" data-nz-profil="' + e(p.id) + '"><span class="nz-karte-b"' + (p.titelbild ? ' style="background-image:url(\'' + e(p.titelbild) + '\')"' : ' data-leer=""') + '></span>' + av(p, 'm') + '<b>' + e(p.name) + '</b><span>' + meta(p) + '</span></button><div class="nz-karte-k">' + knopf(p) + '</div></div>';
  }
  function vorschlaege() {
    var passt = $('nz-passt'), neu = $('nz-neu'); if (!passt && !neu) return;
    var ich = S.profil || {}, pz = PASST[ich.branche] || [];
    get('suche', { region: String(ich.plz || '').slice(0, 2) }).then(function (j) {
      var alle = ((j && j.treffer) || []).filter(function (p) { return p.id !== S.ich; });
      var frei = alle.filter(function (p) { return p.status === 'keins' || p.status === 'offen_rein'; });
      var pk = frei.filter(function (p) { return pz.indexOf(p.branche) >= 0; })
        .sort(function (a, b) { return pz.indexOf(a.branche) - pz.indexOf(b.branche); }).slice(0, 6);
      if (passt) passt.innerHTML = pk.length ? pk.map(karteKlein).join('') : '<p class="muted" style="padding:0">Gerade keine passenden Betriebe' + (ich.plz ? ' in Ihrer Nähe' : '') + '. Unten können Sie alle Betriebe durchsuchen.</p>';
      var schon = {}; pk.forEach(function (p) { schon[p.id] = 1; });
      var nk = alle.filter(function (p) { return !schon[p.id]; }).slice(0, 6);
      if (neu) neu.innerHTML = nk.length ? nk.map(function (p) { return zeile(p, p.status === 'ok' ? '<span class="nz-pill ok">Kontakt</span>' : knopf(p)); }).join('') : '<p class="muted" style="padding:0">Noch keine weiteren Betriebe in Ihrer Nähe.</p>';
    });
  }
  function suchen() {
    var box = $('nz-treffer'); if (!box) return;
    get('suche', SUCHE).then(function (j) {
      if (!j || !j.ok) { box.innerHTML = '<p class="muted">Suche nicht möglich.</p>'; return; }
      var t = j.treffer || [];
      if (!t.length) { box.innerHTML = '<div class="card"><p class="cs" style="margin:0">Keine Betriebe gefunden. Versuchen Sie ein größeres PLZ-Gebiet oder eine andere Branche.</p></div>'; return; }
      box.innerHTML = '<div class="nz-grid">' + t.map(karte).join('') + '</div>';
    });
  }
  function karte(p) {
    return '<article class="nz-k" data-nz-profil="' + e(p.id) + '"><div class="nz-k-bild"' + bg(p.titelbild, p.name) + '></div><div class="nz-k-in">'
      + av({ name: p.name, bild: p.bild && p.bild !== p.titelbild ? p.bild : null }, 'm') + '<div><b>' + e(p.name) + '</b><div class="nz-meta">' + meta(p) + '</div></div>'
      + (p.text ? '<p>' + e(p.text) + '</p>' : '') + '<div class="nz-k-fuss">' + like(p.id, '', p.likes, p.ich_like, false, 'mini') + knopf(p) + '</div></div></article>';
  }

  /* ═══ Profil ansehen ═══ */
  function ov() {
    var o = $('nz-ov');
    if (!o) {
      o = document.createElement('div'); o.id = 'nz-ov'; o.className = 'nz-ov'; o.hidden = true;
      o.innerHTML = '<div class="nz-modal" role="dialog" aria-modal="true" aria-label="Profil"><button class="nz-zu" data-nz-zu aria-label="Schließen">×</button><div id="nz-ov-in"></div></div>';
      document.body.appendChild(o);
    }
    return o;
  }
  function profilOeffnen(id) {
    var o = ov(); o.hidden = false; document.body.style.overflow = 'hidden';
    $('nz-ov-in').innerHTML = '<p class="muted" style="padding:40px">Lade …</p>';
    o.setAttribute('data-id', id);
    get('profil', { id: id }).then(function (j) {
      if (o.getAttribute('data-id') !== id) return;
      if (!j || !j.ok) { $('nz-ov-in').innerHTML = '<p class="muted" style="padding:40px">' + e((j && j.error) || 'Profil nicht verfügbar.') + '</p>'; return; }
      $('nz-ov-in').innerHTML = profilHTML(j.profil, j.kontakte || [], j.eigen);
    });
  }
  function profilZu() { var o = $('nz-ov'); if (o) { o.hidden = true; o.removeAttribute('data-id'); } document.body.style.overflow = ''; }
  function aktionen(p, eigen) {
    if (eigen) return '<button class="nz-btn" data-nz-bearbeiten>Profil bearbeiten</button>';
    var id = e(p.id), nm = e(p.name);
    if (p.status === 'ok') return '<button class="nz-btn" data-nz-chat="' + id + '">Nachricht</button><span class="nz-btn o still">✓ Vernetzt</span>';
    if (p.status === 'offen_raus') return '<span class="nz-btn still">Anfrage gesendet</span><button class="nz-btn o" disabled title="Schreiben geht, sobald die Anfrage angenommen ist">Nachricht</button>';
    if (p.status === 'offen_rein') return '<button class="nz-btn" data-nz-vernetzen="' + id + '" data-name="' + nm + '" data-direkt="1">Annehmen</button><button class="nz-btn o" data-nz-chat="' + id + '">Nachricht</button>';
    return '<button class="nz-btn" data-nz-vernetzen="' + id + '" data-name="' + nm + '">Vernetzen</button><button class="nz-btn o" data-nz-vernetzen="' + id + '" data-name="' + nm + '">Nachricht</button>';
  }
  function profilHTML(p, kontakte, eigen) {
    var info = [p.branche_text, p.ort, p.umkreis_km ? 'fährt bis ' + p.umkreis_km + ' km' : ''].filter(Boolean).map(e).join(' · ');
    var person = [p.person_name, p.person_rolle].filter(Boolean).map(e).join(', ');
    var pb = p.personbild || (p.bild && p.bild !== p.titelbild ? p.bild : null);
    var fakten = (p.eckdaten || []).filter(function (f) { return f && f.wert; }).slice(0, 3);
    var bilder = p.bilder || [];
    return '<div class="nz-pf"><div class="nz-cover"' + flaeche(p.titelbild, p.titel_platz || (eigen ? 'Noch kein Titelbild' : '')) + '></div><div class="nz-pf-in">'
      + '<div class="nz-pfav"' + flaeche(pb, pb ? '' : (p.person_platz || '')) + '>' + (!pb && !p.person_platz ? '<span>' + e(String(p.name || '?').charAt(0).toUpperCase()) + '</span>' : '') + '</div>'
      + '<div class="nz-pfh"><div><h3>' + e(p.name) + '</h3>' + (info ? '<div class="nz-pbr">' + info + '</div>' : '') + (person ? '<div class="nz-who">' + person + '</div>' : '') + abzeichenHTML(Object.assign({ eigen: eigen }, p)) + '</div>'
      + '<div class="nz-acts">' + aktionen(p, eigen) + like(p.id, '', p.likes, p.ich_like, eigen) + '</div></div>'
      + (p.text ? '<p class="nz-about">' + e(p.text).replace(/\n/g, '<br>') + '</p>' : '')
      + (fakten.length ? '<div class="nz-facts">' + fakten.map(function (f) { return '<div><b>' + e(f.wert) + '</b><span>' + e(f.label) + '</span></div>'; }).join('') + '</div>' : '')
      + (bilder.length ? '<h4 class="nz-ph">Bilder</h4><div class="nz-pgal">' + bilder.map(function (b) {
        return '<div class="nz-gi"><div class="nz-im"' + flaeche(b.url, b.url ? '' : (b.platz || '')) + '></div>' + like(p.id, b.id, b.likes, b.ich_like, eigen) + '</div>';
      }).join('') + '</div>' : '')
      + (kontakte.length ? '<h4 class="nz-ph">Arbeitet zusammen mit</h4><div class="nz-chips">' + kontakte.map(function (k) {
        return '<button class="nz-chip" data-nz-profil="' + e(k.id) + '">' + e(k.name) + '</button>';
      }).join('') + '</div>' : '')
      + (eigen ? '' : '<div class="nz-pf-fuss">' + (p.status === 'ok' ? '<button class="nz-lnk" data-nz-trennen="' + e(p.id) + '" data-name="' + e(p.name) + '">Kontakt entfernen</button>' : '')
        + '<button class="nz-lnk" data-nz-melden="' + e(p.id) + '">Melden</button><button class="nz-lnk rot" data-nz-block="' + e(p.id) + '" data-name="' + e(p.name) + '">Blockieren</button></div>')
      + '</div></div>';
  }

  /* ═══ Kleiner Dialog mit Textfeld ═══ */
  function frage(titel, sub, platz, knopfText) {
    var d = $('nz-dlg');
    if (!d) {
      d = document.createElement('div'); d.id = 'nz-dlg'; d.className = 'nz-ov oben'; d.hidden = true;
      d.innerHTML = '<div class="nz-modal klein" role="dialog" aria-modal="true"><h3 id="nz-dlg-t"></h3><p class="cs" id="nz-dlg-s"></p><textarea class="nz-ta" id="nz-dlg-ta" maxlength="1000"></textarea><div class="nz-reihe"><button class="linkbtn gut" id="nz-dlg-ok"></button><button class="linkbtn" id="nz-dlg-ab">Abbrechen</button></div></div>';
      document.body.appendChild(d);
    }
    $('nz-dlg-t').textContent = titel; $('nz-dlg-s').textContent = sub; $('nz-dlg-ta').value = ''; $('nz-dlg-ta').placeholder = platz; $('nz-dlg-ok').textContent = knopfText;
    d.hidden = false; setTimeout(function () { $('nz-dlg-ta').focus(); }, 30);
    return new Promise(function (ok) {
      function fertig(w) { d.hidden = true; $('nz-dlg-ok').onclick = $('nz-dlg-ab').onclick = null; ok(w); }
      $('nz-dlg-ok').onclick = function () { fertig($('nz-dlg-ta').value.trim()); };
      $('nz-dlg-ab').onclick = function () { fertig(null); };
    });
  }
  function hinweis(t) {
    var h = $('nz-toast');
    if (!h) { h = document.createElement('div'); h.id = 'nz-toast'; h.className = 'nz-toast'; document.body.appendChild(h); }
    h.textContent = t; h.classList.add('on'); clearTimeout(h._t); h._t = setTimeout(function () { h.classList.remove('on'); }, 3200);
  }
  function neuZeichnen() {
    var v = document.querySelector('.view.on'); v = v && v.getAttribute('data-v');
    return start(true).then(function () {
      if (v === 'vernetzen') findenZeichnen(); else if (v === 'partner') partnerZeichnen(); else if (v === 'nachrichten') chatListe(); else if (v === 'netzprofil') profilForm();
      var o = $('nz-ov'); if (o && !o.hidden && o.getAttribute('data-id')) profilOeffnen(o.getAttribute('data-id'));
    });
  }

  /* ═══ Nachrichten ═══ */
  function chatZeichnen() {
    var el = $('nz-nachr'); if (!el) return;
    if (fehlerBox(el)) return;
    el.innerHTML = '<div class="card nz-chat" id="nz-chat"><div class="nz-th" id="nz-th"><p class="muted">Lade …</p></div><div class="nz-cv" id="nz-cv"><div class="nz-leer">Wählen Sie links ein Gespräch.</div></div></div>';
    chatListe();
  }
  function chatListe() {
    var th = $('nz-th'); if (!th) { chatZeichnen(); return; }
    get('gespraeche').then(function (j) {
      var g = (j && j.gespraeche) || [], da = {};
      g.forEach(function (x) { da[x.mit] = 1; });
      (S.kontakte || []).forEach(function (k) { if (!da[k.id]) g.push({ mit: k.id, name: k.name, bild: k.bild, branche_text: k.branche_text, letzte: '', am: null, ungelesen: 0 }); });
      if (!g.length) { th.innerHTML = '<p class="muted">Noch keine Gespräche. Sobald Sie vernetzt sind, können Sie hier schreiben.</p>'; return; }
      th.innerHTML = g.map(function (x) {
        return '<button class="nz-ti' + (CHAT === x.mit ? ' on' : '') + '" data-nz-chat="' + e(x.mit) + '">' + av({ name: x.name, bild: x.bild }, 's')
          + '<span class="nz-ti-tx"><b>' + e(x.name) + '</b><span>' + (x.letzte ? (x.von_mir ? 'Sie: ' : '') + e(x.letzte) : e(x.branche_text || 'Noch keine Nachricht')) + '</span></span>'
          + '<span class="nz-ti-r">' + (x.am ? '<time>' + e(zeit(x.am)) + '</time>' : '') + (x.ungelesen ? '<i>' + x.ungelesen + '</i>' : '') + '</span></button>';
      }).join('');
      if (CHAT) verlauf(CHAT, true);
    });
  }
  function chatOeffnen(id) {
    CHAT = id; profilZu();
    var v = document.querySelector('.view.on');
    if (!v || v.getAttribute('data-v') !== 'nachrichten') { window.show('nachrichten'); return; }
    document.querySelectorAll('.nz-ti').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-nz-chat') === id); });
    verlauf(id);
  }
  function verlauf(id, still) {
    var cv = $('nz-cv'); if (!cv) return;
    var c = $('nz-chat'); if (c) c.classList.add('offen');
    if (!still) cv.innerHTML = '<div class="nz-leer">Lade …</div>';
    get('verlauf', { mit: id }).then(function (j) {
      if (CHAT !== id || !j || !j.ok) return;
      var m = j.mit || {};
      var alt = $('nz-msgs'), unten = !alt || alt.scrollHeight - alt.scrollTop - alt.clientHeight < 40, entwurf = $('nz-text') ? $('nz-text').value : '';
      cv.innerHTML = '<div class="nz-cv-kopf"><button class="nz-zurueck" data-nz-zurueck aria-label="Zurück">‹</button><button class="nz-z-l" data-nz-profil="' + e(id) + '">' + av(m, 's') + '<span class="nz-z-tx"><b>' + e(m.name) + '</b><span>' + meta(m) + '</span></span></button><span class="nz-cv-akt"><button class="nz-lnk" data-nz-melden="' + e(id) + '" data-chat="1">Melden</button><button class="nz-lnk rot" data-nz-block="' + e(id) + '" data-name="' + e(m.name) + '">Blockieren</button></span></div>'
        + '<div class="nz-msgs" id="nz-msgs">' + (j.nachrichten.length ? j.nachrichten.map(function (x) {
          return '<div class="nz-m' + (x.ich ? ' ich' : '') + '">' + e(x.text) + '<time>' + e(zeit(x.am)) + '</time></div>';
        }).join('') : '<div class="nz-leer">Noch keine Nachricht. Schreiben Sie als Erste.</div>') + '</div>'
        + (j.kontakt ? '<div class="nz-inp"><textarea id="nz-text" rows="1" maxlength="2000" placeholder="Nachricht schreiben"></textarea><button class="linkbtn gut" id="nz-senden">Senden</button></div>'
          : '<div class="nz-inp"><p class="cs" style="margin:0">Schreiben geht, sobald die Vernetzung bestätigt ist.</p></div>');
      var ms = $('nz-msgs'); if (ms && (unten || !still)) ms.scrollTop = ms.scrollHeight;
      if ($('nz-text')) { $('nz-text').value = entwurf; if (!still) $('nz-text').focus(); }
      if (!still) start(true);
    });
  }
  function senden() {
    var ta = $('nz-text'); if (!ta || !CHAT) return;
    var t = ta.value.trim(); if (!t) return;
    var b = $('nz-senden'); b.disabled = true;
    post('nachricht', { an: CHAT, text: t }).then(function (j) {
      b.disabled = false;
      if (!j.ok) { hinweis(j.error || 'Senden fehlgeschlagen.'); return; }
      ta.value = ''; verlauf(CHAT, true); chatListeStill();
    });
  }
  function chatListeStill() { var c = CHAT; chatListe(); CHAT = c; }

  /* ═══ Mein Profil: erst die Ansicht, wie andere sie sehen. Bearbeiten auf Knopfdruck. ═══ */
  function profilForm() {
    var el = $('nz-profil'); if (!el) return;
    if (fehlerBox(el)) return;
    if (EDIT || !S.hat_profil) { formZeichnen(); return; }
    if (!el.querySelector('.nz-eigen')) el.innerHTML = '<p class="muted">Lade …</p>';
    get('profil', { id: S.ich }).then(function (j) {
      if (EDIT) return;
      if (!j || !j.ok) { formZeichnen(); return; }
      el.innerHTML = '<p class="nz-hilfe" style="margin-top:0">So sehen andere Betriebe Ihr Profil.</p><div class="card nz-eigen">' + profilHTML(j.profil, j.kontakte || [], true) + '</div>';
    });
  }
  function formZeichnen() {
    var el = $('nz-profil'); if (!el) return;
    var p = S.profil || {}, br = S.branchen || {}, gal = p.bilder || [], ok = S.hat_profil, ed = p.eckdaten || [];
    var bsp = [['bis 250', 'Portionen'], ['16 A', 'Strom'], ['6 × 3 m', 'Stellfläche']];
    function f(id, label, wert, extra) { return '<label class="nz-f"><span>' + label + '</span><input class="sinp" id="' + id + '" value="' + e(wert) + '"' + (extra || '') + '></label>'; }
    el.innerHTML = '<div class="nz-2"><div class="card"><h2>Bilder</h2><p class="cs">' + (ok ? 'Titelbild oben quer, darunter Ihr Foto rund. Zum Beispiel: im Hintergrund der Food Truck, davor Sie. Höchstens 2 MB je Bild, wir verkleinern automatisch.' : 'Titelbild oben quer, darunter Ihr Foto rund. Beim ersten Bild legen wir Ihr Profil automatisch an.') + '</p>'
      + '<div class="nz-bb"><div class="nz-bb-cover"' + bg(p.titelbild, p.name) + '>' + bildKnoepfe('titel', p.titelbild, true) + '</div>'
      + '<div class="nz-bb-person">' + av({ name: p.name, bild: p.personbild }, 'xl') + bildKnoepfe('person', p.personbild, true) + '</div></div>'
      + '<h3 class="nz-h3">Galerie <span class="nz-zahl">' + gal.length + ' von ' + MAXB + '</span></h3><div class="nz-gal edit">'
      + gal.map(function (b) { return '<figure class="nz-g"><div class="nz-g-img"' + bg(b.url, p.name + b.id) + '></div><button class="nz-g-weg" data-nz-bildweg="' + e(b.id) + '" aria-label="Bild entfernen">×</button>' + (b.likes != null ? like(S.ich, b.id, b.likes, false, true) : '') + '</figure>'; }).join('')
      + (gal.length < MAXB ? '<label class="nz-g neu"><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-nz-upload="galerie" hidden><span>+ Bilder hinzufügen</span></label>' : '')
      + '</div><div class="smsg" id="nzp-bmsg"></div></div>'
      + '<div class="card"><h2>Angaben</h2><p class="cs">So stellen Sie sich anderen Betrieben vor. Gäste sehen nur Name, Branche, Ort und Bild, wenn ein Partner Sie in seinem Formular zeigt.</p>'
      + '<div class="nz-form">' + f('nzp-name', 'Name des Betriebs', p.name, ' maxlength="80"')
      + '<label class="nz-f"><span>Branche</span><select class="sinp" id="nzp-branche">' + Object.keys(br).map(function (k) { return '<option value="' + k + '"' + (p.branche === k ? ' selected' : '') + '>' + e(br[k]) + '</option>'; }).join('') + '</select></label>'
      + f('nzp-person', 'Ihr Name', p.person_name, ' maxlength="80" placeholder="z. B. Tobias Keller"') + f('nzp-rolle', 'Ihre Rolle', p.person_rolle, ' maxlength="60" placeholder="z. B. Inhaber"')
      + f('nzp-ort', 'Ort', p.ort, ' maxlength="80"') + f('nzp-plz', 'Postleitzahl', p.plz, ' maxlength="5" inputmode="numeric"')
      + f('nzp-km', 'Wie weit Sie fahren (km)', p.umkreis_km || '', ' type="number" min="0" max="1000" placeholder="leer = nur vor Ort"')
      + '<label class="nz-f breit"><span>Über uns <em id="nzp-zahl"></em></span><textarea class="nz-ta" id="nzp-text" maxlength="1200" rows="6" placeholder="Was Sie anbieten, für wie viele Gäste, was Sie brauchen (Strom, Stellfläche) …">' + e(p.text) + '</textarea></label>'
      + '<div class="nz-f breit"><span>Eckdaten <em>bis zu drei Kacheln unter dem Text</em></span><div class="nz-ed">' + [0, 1, 2].map(function (i) {
        var x = ed[i] || {};
        return '<input class="sinp" id="nzp-ew' + i + '" maxlength="16" placeholder="z. B. ' + bsp[i][0] + '" value="' + e(x.wert) + '" aria-label="Eckdatum ' + (i + 1) + ', Wert"><input class="sinp" id="nzp-el' + i + '" maxlength="24" placeholder="z. B. ' + bsp[i][1] + '" value="' + e(x.label) + '" aria-label="Eckdatum ' + (i + 1) + ', Bezeichnung">';
      }).join('') + '</div></div>'
      + '<label class="nz-check breit"><input type="checkbox" id="nzp-sichtbar"' + (p.sichtbar !== false ? ' checked' : '') + '><span>Für andere Betriebe auffindbar. Wenn aus, finden Sie nur Betriebe, mit denen Sie schon vernetzt sind.</span></label>'
      + '<label class="nz-f"><span>Land</span><select class="sinp" id="nzp-land">' + [['DE', 'Deutschland'], ['AT', 'Österreich'], ['CH', 'Schweiz']].map(function (x) { return '<option value="' + x[0] + '"' + ((p.land || 'DE') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>'
      + '<label class="nz-check breit"><input type="checkbox" id="nzp-rang"' + (p.rang_zeigen !== false ? ' checked' : '') + '><span>Vertrauensabzeichen im Profil zeigen und in der Rangliste erscheinen. Andere Betriebe sehen dann Ihre Punkte, aber nie, wie viele Anfragen Sie haben.</span></label>'
      + '</div><div class="nz-reihe"><button class="linkbtn gut" id="nzp-speichern">' + (ok ? 'Speichern' : 'Profil anlegen') + '</button>' + (ok ? '<button class="linkbtn" data-nz-ansicht>Zur Profilansicht</button>' : '') + '</div><div class="smsg" id="nzp-msg"></div></div>'
      + '</div>';
    zaehlen();
  }
  function bildKnoepfe(art, da, ok) {
    if (!ok) return '';
    return '<div class="nz-bb-k"><label class="linkbtn">' + (da ? 'Ändern' : (art === 'titel' ? 'Titelbild wählen' : 'Foto wählen')) + '<input type="file" accept="image/jpeg,image/png,image/webp" data-nz-upload="' + art + '" hidden></label>'
      + (da ? '<button class="linkbtn" data-nz-bildweg="" data-art="' + art + '">Entfernen</button>' : '') + '</div>';
  }
  function zaehlen() { var t = $('nzp-text'), z = $('nzp-zahl'); if (t && z) z.textContent = t.value.length + ' / 1200'; }
  function profilSpeichern() {
    var d = { name: $('nzp-name').value.trim(), branche: $('nzp-branche').value, person_name: $('nzp-person').value.trim(), person_rolle: $('nzp-rolle').value.trim(),
      ort: $('nzp-ort').value.trim(), plz: $('nzp-plz').value.trim(), umkreis_km: $('nzp-km').value, text: $('nzp-text').value.trim(), sichtbar: $('nzp-sichtbar').checked,
      land: $('nzp-land') ? $('nzp-land').value : 'DE', rang_zeigen: $('nzp-rang') ? $('nzp-rang').checked : true,
      eckdaten: [0, 1, 2].map(function (i) { return { wert: $('nzp-ew' + i).value.trim(), label: $('nzp-el' + i).value.trim() }; }).filter(function (x) { return x.wert; }) };
    if (!d.name) { meldung('nzp-msg', 'Bitte den Namen des Betriebs angeben.'); return; }
    var b = $('nzp-speichern'); b.disabled = true;
    post('profil', { profil: d }).then(function (j) {
      b.disabled = false;
      if (!j.ok) { meldung('nzp-msg', j.error || 'Speichern fehlgeschlagen.'); return; }
      EDIT = false;
      start(true).then(function () { profilForm(); hinweis('Profil gespeichert.'); });
    });
  }
  function bildLesen(file, max) {
    return new Promise(function (ok, no) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.84));
        };
        im.onerror = function () { no(new Error('Bild nicht lesbar')); };
        im.src = fr.result;
      };
      fr.onerror = no; fr.readAsDataURL(file);
    });
  }
  function hochladen(input) {
    if (!S.hat_profil) {
      var nm = ($('nzp-name') && $('nzp-name').value.trim()) || (S.profil && S.profil.name) || '';
      if (!nm) { meldung('nzp-bmsg', 'Bitte tragen Sie unten zuerst den Namen des Betriebs ein.'); input.value = ''; return; }
      meldung('nzp-bmsg', 'Profil wird angelegt …', true);
      var d0 = { name: nm, branche: $('nzp-branche') ? $('nzp-branche').value : '', ort: $('nzp-ort') ? $('nzp-ort').value.trim() : '', plz: $('nzp-plz') ? $('nzp-plz').value.trim() : '', sichtbar: $('nzp-sichtbar') ? $('nzp-sichtbar').checked : true };
      post('profil', { profil: d0 }).then(function (j) { if (!j.ok) { meldung('nzp-bmsg', j.error || 'Profil ließ sich nicht anlegen.'); return; } return start(true).then(function () { hochladenJetzt(input); }); });
      return;
    }
    hochladenJetzt(input);
  }
  function hochladenJetzt(input) {
    var art = input.getAttribute('data-nz-upload'), files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    var frei = MAXB - ((S.profil && S.profil.bilder) || []).length;
    if (art === 'galerie') files = files.slice(0, Math.max(0, frei)); else files = files.slice(0, 1);
    meldung('nzp-bmsg', 'Lade hoch …', true);
    var kette = Promise.resolve(), fehler = '';
    files.forEach(function (f) {
      kette = kette.then(function () { return bildLesen(f, art === 'person' ? 800 : 1600); })
        .then(function (daten) { return post('bild', { art: art, daten: daten }); })
        .then(function (j) { if (!j.ok) fehler = j.error || 'Hochladen fehlgeschlagen.'; })
        .catch(function () { fehler = 'Dieses Bild lässt sich nicht lesen.'; });
    });
    kette.then(function () { return start(true); }).then(function () { profilForm(); meldung('nzp-bmsg', fehler || 'Hochgeladen.', !fehler); });
  }

  /* ═══ Partner im Formular ═══ */
  function partnerZeichnen() {
    var el = $('nz-partner'); if (!el) return;
    if (fehlerBox(el)) return;
    if (!PL) PL = (S.partner || []).map(function (p) { return p.id; });
    var alle = {}; (S.kontakte || []).concat(S.partner || []).forEach(function (p) { alle[p.id] = p; });
    var zugest = {}; (S.partner || []).forEach(function (p) { zugest[p.id] = p.zugestimmt; });
    var rest = (S.kontakte || []).filter(function (k) { return PL.indexOf(k.id) < 0; });
    var sicht = PL.filter(function (id) { return zugest[id]; }).map(function (id) { return alle[id]; }).filter(Boolean);
    var h = '<div class="nz-2"><div class="card"><h2>Ihre Partner <span class="nz-zahl">' + PL.length + ' von 6</span></h2><p class="cs">Diese Betriebe stehen unter Ihrem Formular, mit Bild und Link zu deren Anfrageseite. So empfehlen Sie Ihr Netzwerk an Ihre Gäste weiter. Jeder Partner muss einmal zustimmen, erst dann ist er sichtbar.</p>'
      + (PL.length ? '<div class="nz-liste">' + PL.map(function (id, i) {
        var p = alle[id] || { id: id, name: '…' };
        return zeile(p, (zugest[id] ? '<span class="nz-pill ok">Sichtbar</span>' : (zugest[id] === false ? '<span class="nz-pill w">Wartet auf Zustimmung</span>' : '<span class="nz-pill">Neu, noch nicht gespeichert</span>'))
          + '<button class="nz-pfeil" data-nz-hoch="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Nach oben">↑</button><button class="nz-pfeil" data-nz-runter="' + i + '"' + (i < PL.length - 1 ? '' : ' disabled') + ' aria-label="Nach unten">↓</button><button class="nz-pfeil" data-nz-pweg="' + i + '" aria-label="Entfernen">×</button>');
      }).join('') + '</div>' : '<p class="muted" style="padding:0">Noch keine Partner ausgewählt.</p>')
      + (rest.length ? '<h3 class="nz-h3">Aus Ihren Kontakten hinzufügen</h3><div class="nz-liste">' + rest.map(function (p) {
        return zeile(p, '<button class="linkbtn" data-nz-padd="' + e(p.id) + '"' + (PL.length >= 6 ? ' disabled' : '') + '>Hinzufügen</button>');
      }).join('') + '</div>' : ((S.kontakte || []).length ? '' : '<p class="cs" style="margin-top:14px">Partner wählen Sie aus Ihren Kontakten. <button class="linkbtn" data-view="vernetzen">Betriebe finden</button></p>'))
      + '<div class="nz-reihe"><button class="linkbtn gut" id="nz-p-speichern">Speichern</button></div><div class="smsg" id="nz-p-msg"></div></div>'
      + '<div class="card"><h2>So sieht es im Formular aus</h2><p class="cs">Oben eine schmale Leiste unter jeder Seite des Formulars, darunter die großen Karten nach dem Absenden. Nur Partner, die zugestimmt haben.</p>'
      + (sicht.length ? '<div class="nz-vs"><div class="nz-vs-l"><span>Unsere Partner:</span>' + sicht.map(function (p) { return '<a>' + av(p, 'xxs') + e(p.name) + '</a>'; }).join('') + '</div>'
        + '<div class="nz-vs-g"><h4>Unsere Partner</h4><p>Mit diesen Betrieben arbeiten wir gern zusammen.</p>' + sicht.map(function (p) {
          return '<div class="nz-vs-k">' + av(p, 's') + '<div><b>' + e(p.name) + '</b><span>' + meta(p) + '</span></div><em>Anfragen ›</em></div>';
        }).join('') + '</div></div>' : '<div class="nz-leer" style="padding:30px 10px">Noch kein sichtbarer Partner.</div>')
      + '<p class="nz-hilfe">Sind Sie mit mindestens einem Betrieb vernetzt, fragt Ihr Formular den Gast außerdem, ob seine Anfrage an Partner weitergegeben werden darf. Nur dann können Sie sie im Cockpit weiterleiten.</p></div></div>';
    h += paketeHTML((S.partner || []).filter(function (p) { return p.zugestimmt; }));
    var b = S.partner_bitten || [];
    if (b.length) h += '<div class="card nz-block" style="margin-top:14px"><h2>Wer Sie als Partner zeigt</h2><p class="cs">Betriebe, die Sie in ihrem Formular empfehlen möchten.</p><div class="nz-liste">' + b.map(function (p) {
      return zeile(p, p.zugestimmt ? '<span class="nz-pill ok">Sie werden gezeigt</span><button class="linkbtn" data-nz-zustimmen="' + e(p.id) + '">Zurückziehen</button>'
        : '<button class="linkbtn gut" data-nz-zustimmen="' + e(p.id) + '" data-ja="1">Zustimmen</button><button class="linkbtn" data-nz-zustimmen="' + e(p.id) + '">Ablehnen</button>');
    }).join('') + '</div></div>';
    el.innerHTML = h;
  }

  /* ═══ Anfrage an Partner weiterleiten (im Detail einer Anfrage) ═══ */
  function weiterLaden(id) {
    var box = $('dt-weiter-box'), el = $('dt-weiter'); if (!box || !el || window._admin || !tok()) return;
    box.hidden = false; el.innerHTML = '<p class="muted" style="padding:0">Lade …</p>';
    get('lead', { id: id }).then(function (j) {
      if (window.DT_ID !== id) return;
      if (!j || !j.ok) { box.hidden = true; return; }
      if (!j.weiter_ok) { el.innerHTML = '<p class="cs" style="margin:0">Der Gast hat im Formular nicht zugestimmt, dass seine Anfrage an Partner weitergegeben wird. Empfehlen Sie ihm den Partner in Ihrer Antwort.</p>'; return; }
      if (!(j.kontakte || []).length) { el.innerHTML = '<p class="cs" style="margin:0 0 10px">Sie sind noch mit keinem Betrieb vernetzt.</p><button class="linkbtn" data-view="vernetzen" data-dt-zu>Betriebe finden</button>'; return; }
      var schon = {}; (j.weitergeleitet || []).forEach(function (w) { schon[w.an] = w; });
      el.innerHTML = '<input class="sinp wide" id="dt-weiter-hin" maxlength="600" placeholder="Hinweis für den Partner, z. B. braucht noch Catering" style="width:100%;margin-bottom:10px">'
        + (j.termin ? '<p class="nz-hilfe" style="margin:0 0 8px">Frei oder belegt am Wunschtermin ' + e(String(j.termin).split('-').reverse().join('.')) + ', laut Kalender der Partner.</p>' : '')
        + '<div class="nz-liste">' + j.kontakte.slice().sort(function (a, b) { var o = { frei: 0, unbekannt: 1, belegt: 2 }; return (a.frei in o ? o[a.frei] : 1) - (b.frei in o ? o[b.frei] : 1); }).map(function (k) {
          return '<div class="nz-z"><span class="nz-z-l">' + av(k, 's') + '<span class="nz-z-tx"><b>' + e(k.name) + '</b><span>' + meta(k) + '</span></span></span><div class="nz-z-r">'
            + (j.termin && k.frei === 'frei' ? '<span class="nz-pill ok">Frei</span>' : j.termin && k.frei === 'belegt' ? '<span class="nz-pill w">Belegt</span>' : '')
            + (schon[k.id] ? '<span class="nz-pill ok">Weitergeleitet ' + e(zeit(schon[k.id].am)) + '</span>' : '<input type="checkbox" class="nz-wk" value="' + e(k.id) + '" data-name="' + e(k.name) + '" aria-label="' + e(k.name) + ' auswählen"' + (j.termin && k.frei === 'frei' ? ' checked' : '') + '>') + '</div></div>';
        }).join('') + '</div>'
        + '<label class="nz-check"><input type="checkbox" id="dt-weiter-gast"' + (j.termin ? ' checked' : '') + '><span>Dem Gast Bescheid geben, an wen seine Anfrage ging (Absage mit Empfehlung)</span></label>'
        + '<textarea class="sinp" id="dt-weiter-gtext" rows="4" maxlength="1200" style="width:100%;margin-top:8px" placeholder="Leer lassen für den Standardtext"></textarea>'
        + '<button class="linkbtn" data-nz-weiter-los style="margin-top:10px">Ausgewählte Partner weiterleiten</button><div class="dt-msg" id="dt-weiter-msg"></div>';
      nzGastText(j.termin);
    });
  }

  function nzGastText(termin) {
    var ta = $('dt-weiter-gtext'); if (!ta) return;
    var n = [].filter.call(document.querySelectorAll('.nz-wk'), function (x) { return x.checked; }).map(function (x) { return x.getAttribute('data-name'); });
    ta.value = 'Vielen Dank für Ihre Anfrage. Leider sind wir' + (termin ? ' am ' + String(termin).split('-').reverse().join('.') : '') + ' schon ausgebucht. Damit Sie nicht weitersuchen müssen, haben wir Ihre Anfrage mit Ihrer Zustimmung an ' + (n.length ? n.join(' und ') : '…') + ' gegeben. Sie melden sich direkt bei Ihnen.';
    ta.setAttribute('data-termin', termin || '');
  }
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.classList && ev.target.classList.contains('nz-wk')) { var ta = $('dt-weiter-gtext'); if (ta && !ta.dataset.eigen) nzGastText(ta.getAttribute('data-termin')); } });
  document.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'dt-weiter-gtext') ev.target.dataset.eigen = '1'; });

  /* ═══ Klicks ═══ */
  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if (t.closest('[data-nz-zu]') || t.id === 'nz-ov') { profilZu(); if (!t.closest('[data-view]')) return; }
    if ((x = t.closest('[data-nz-like]'))) {
      ev.stopPropagation();
      var ziel = x.getAttribute('data-nz-like'), bild = x.getAttribute('data-bild');
      if (x.dataset.laeuft) return; x.dataset.laeuft = '1';
      post('like', { ziel: ziel, bild: bild }).then(function (j) {
        delete x.dataset.laeuft;
        if (!j.ok) { hinweis(j.error || 'Das hat nicht geklappt. Bitte versuchen Sie es erneut.'); return; }
        /* Gleiches Herz an anderer Stelle (Karte in der Liste und offenes Profil) mitziehen */
        document.querySelectorAll('[data-nz-like="' + ziel + '"][data-bild="' + (bild || '') + '"]').forEach(function (h) {
          h.classList.toggle('on', j.an); h.setAttribute('aria-pressed', j.an ? 'true' : 'false'); h.querySelector('span').textContent = j.anzahl;
        });
      });
      return;
    }
    if ((x = t.closest('[data-nz-vernetzen]'))) {
      ev.stopPropagation();
      var an = x.getAttribute('data-nz-vernetzen'), nm = x.getAttribute('data-name');
      if (!S || !S.hat_profil) { hinweis('Bitte legen Sie zuerst Ihr Profil an.'); profilZu(); window.show('netzprofil'); return; }
      var los = function (text) {
        if (text === null) return;
        post('vernetzen', { an: an, nachricht: text || '' }).then(function (j) {
          if (!j.ok) { hinweis(j.error || 'Anfrage fehlgeschlagen.'); return; }
          hinweis(j.status === 'ok' ? 'Sie sind jetzt mit ' + nm + ' vernetzt.' : 'Anfrage an ' + nm + ' gesendet.');
          neuZeichnen(); if ($('nz-treffer')) suchen();
        });
      };
      if (x.getAttribute('data-direkt')) los('');
      else frage('Mit ' + nm + ' vernetzen', nm + ' bekommt Ihre Anfrage per E-Mail und im Cockpit. Eine kurze Nachricht dazu erhöht die Chance, dass angenommen wird.', 'z. B. Hallo, wir sind eine Hochzeitslocation in Meersburg und suchen einen Food Truck für den Abend.', 'Anfrage senden').then(los);
      return;
    }
    if (t.closest('[data-nz-bearbeiten]')) {
      profilZu();
      var cv = document.querySelector('.view.on');
      if (cv && cv.getAttribute('data-v') === 'netzprofil') { EDIT = true; profilForm(); } else { NZ_EDIT = true; window.show('netzprofil'); }
      return;
    }
    if (t.closest('[data-nz-ansicht]')) { EDIT = false; profilForm(); return; }
    if ((x = t.closest('[data-nz-chat]'))) { ev.stopPropagation(); chatOeffnen(x.getAttribute('data-nz-chat')); return; }
    if ((x = t.closest('[data-nz-profil]'))) { if (x.disabled) return; profilOeffnen(x.getAttribute('data-nz-profil')); return; }
    if ((x = t.closest('[data-nz-antwort]'))) {
      post('antwort', { id: x.getAttribute('data-nz-antwort'), ja: !!x.getAttribute('data-ja') }).then(function (j) { if (!j.ok) hinweis(j.error || 'Fehlgeschlagen.'); neuZeichnen(); });
      return;
    }
    if ((x = t.closest('[data-nz-zustimmen]'))) {
      post('partner_zustimmen', { von: x.getAttribute('data-nz-zustimmen'), ja: !!x.getAttribute('data-ja') }).then(function (j) { if (!j.ok) hinweis(j.error || 'Fehlgeschlagen.'); neuZeichnen(); });
      return;
    }
    if ((x = t.closest('[data-nz-trennen]'))) {
      if (!confirm('Kontakt zu ' + x.getAttribute('data-name') + ' entfernen? Sie können sich später wieder vernetzen.')) return;
      post('trennen', { mit: x.getAttribute('data-nz-trennen') }).then(function () { profilZu(); neuZeichnen(); });
      return;
    }
    if ((x = t.closest('[data-nz-block]'))) {
      if (!confirm(x.getAttribute('data-name') + ' blockieren? Der Betrieb kann Sie dann nicht mehr finden und Ihnen nicht mehr schreiben. Eine bestehende Verbindung wird getrennt.')) return;
      post('blockieren', { an: x.getAttribute('data-nz-block') }).then(function () { profilZu(); hinweis('Blockiert.'); if (CHAT === x.getAttribute('data-nz-block')) CHAT = null; neuZeichnen(); });
      return;
    }
    if ((x = t.closest('[data-nz-melden]'))) {
      var ziel2 = x.getAttribute('data-nz-melden');
      frage(x.getAttribute('data-chat') ? 'Gespräch melden' : 'Profil melden', (x.getAttribute('data-chat') ? 'Die letzten Nachrichten dieses Betriebs an Sie gehen zur Prüfung an clickzauber. ' : '') + 'Die Meldung geht an clickzauber. Wir prüfen sie und melden uns bei Ihnen. Der gemeldete Betrieb erfährt nicht, wer gemeldet hat.', 'Was stimmt nicht? Zum Beispiel: Werbung, beleidigende Inhalte, fremde Bilder.', 'Melden').then(function (g) {
        if (g === null) return;
        post('melden', { ziel: ziel2, grund: g, chat: x.getAttribute('data-chat') ? 1 : 0 }).then(function () { hinweis('Danke, die Meldung ist bei uns angekommen.'); });
      });
      return;
    }
    if ((x = t.closest('[data-nz-zurueck]'))) { CHAT = null; var c = $('nz-chat'); if (c) c.classList.remove('offen'); return; }
    if (t.closest('#nz-senden')) { senden(); return; }
    if (t.closest('#nz-s-go')) { suchLesen(); suchen(); return; }
    if (t.closest('#nzp-speichern')) { profilSpeichern(); return; }
    if ((x = t.closest('[data-nz-bildweg]'))) {
      var art = x.getAttribute('data-art') || 'galerie';
      post('bild_weg', { art: art, id: x.getAttribute('data-nz-bildweg') }).then(function () { start(true).then(profilForm); });
      return;
    }
    if ((x = t.closest('[data-nz-padd]'))) { if (PL.length < 6) PL.push(x.getAttribute('data-nz-padd')); partnerZeichnen(); return; }
    if ((x = t.closest('[data-nz-pweg]'))) { PL.splice(+x.getAttribute('data-nz-pweg'), 1); partnerZeichnen(); return; }
    if ((x = t.closest('[data-nz-hoch]'))) { var i = +x.getAttribute('data-nz-hoch'); PL.splice(i - 1, 0, PL.splice(i, 1)[0]); partnerZeichnen(); return; }
    if ((x = t.closest('[data-nz-runter]'))) { var k = +x.getAttribute('data-nz-runter'); PL.splice(k + 1, 0, PL.splice(k, 1)[0]); partnerZeichnen(); return; }
    if (t.closest('#nz-p-speichern')) {
      var liste = PL.slice();
      post('partner', { liste: liste }).then(function (j) {
        if (!j.ok) { meldung('nz-p-msg', j.error || 'Speichern fehlgeschlagen.'); return; }
        start(true).then(function () { partnerZeichnen(); meldung('nz-p-msg', 'Gespeichert. Neue Partner bekommen eine E-Mail und müssen zustimmen.', true); });
      });
      return;
    }
    if ((x = t.closest('[data-nz-weiter-los]'))) {
      var zu = [].filter.call(document.querySelectorAll('.nz-wk'), function (c) { return c.checked; }).map(function (c) { return c.value; }), lid = window.DT_ID, m0 = $('dt-weiter-msg');
      if (!zu.length) { if (m0) m0.textContent = 'Bitte mindestens einen Partner wählen.'; return; }
      var gi = !!($('dt-weiter-gast') || {}).checked, gt = ($('dt-weiter-gtext') || {}).value || '';
      x.disabled = true;
      post('weiterleiten', { lead: lid, an: zu, hinweis: ($('dt-weiter-hin') || {}).value || '', gast_info: gi, gast_text: gt }).then(function (j) {
        if (!j.ok) { x.disabled = false; var m = $('dt-weiter-msg'); if (m) m.textContent = j.error || 'Weiterleiten fehlgeschlagen.'; return; }
        hinweis(j.gesendet + (j.gesendet === 1 ? ' Partner hat' : ' Partner haben') + ' die Anfrage bekommen.' + (gi ? (j.gast ? ' Der Gast wurde informiert.' : ' Die Mail an den Gast ging nicht raus.') : ''));
        weiterLaden(lid);
      });
    }
  });
  /* Suchvorschläge: ab dem ersten Buchstaben, Treffer am Namensanfang zuerst */
  var SB = { t: null, n: 0, liste: [], i: -1 };
  function sbMarke(txt, q) {
    var i = String(txt).toLowerCase().indexOf(q.toLowerCase());
    return i < 0 ? e(txt) : e(txt.slice(0, i)) + '<mark>' + e(txt.slice(i, i + q.length)) + '</mark>' + e(txt.slice(i + q.length));
  }
  function sbZu() { var l = $('nz-sb-liste'), q = $('nz-sb-q'); if (l) l.hidden = true; if (q) q.setAttribute('aria-expanded', 'false'); SB.i = -1; }
  function sbZeichnen(q) {
    var l = $('nz-sb-liste'); if (!l) return;
    var ql = q.toLowerCase();
    var t = SB.liste.slice().sort(function (a, b) {
      var x = String(a.name || '').toLowerCase(), y = String(b.name || '').toLowerCase();
      return (x.indexOf(ql) === 0 ? 0 : 1) - (y.indexOf(ql) === 0 ? 0 : 1) || x.localeCompare(y);
    }).slice(0, 7);
    SB.liste = t; SB.i = -1;
    l.innerHTML = t.length ? t.map(function (p, n) {
      return '<button type="button" class="nz-sb-o" role="option" data-nz-sb="' + e(p.id) + '" data-n="' + n + '">' + av(p, 's') + '<span class="nz-z-tx"><b>' + sbMarke(p.name || '', q) + '</b><span>' + meta(p) + '</span></span>'
        + (p.status === 'ok' ? '<span class="nz-pill ok">Kontakt</span>' : '') + '</button>';
    }).join('') + '<button type="button" class="nz-sb-alle" data-nz-sb-alle>Alle Treffer für „' + e(q) + '“ zeigen</button>'
      : '<p class="nz-sb-leer">Kein Betrieb gefunden, der mit „' + e(q) + '“ beginnt oder es enthält.</p>';
    l.hidden = false; $('nz-sb-q').setAttribute('aria-expanded', 'true');
  }
  function sbLaden(q) {
    clearTimeout(SB.t);
    if (!q) { sbZu(); return; }
    var n = ++SB.n;
    SB.t = setTimeout(function () {
      get('suche', { q: q }).then(function (j) {
        if (n !== SB.n) return;
        SB.liste = (j && j.treffer) || []; sbZeichnen(q);
      });
    }, 160);
  }
  function sbWahl(n) { var l = $('nz-sb-liste'); if (!l) return; var o = l.querySelectorAll('.nz-sb-o'); o.forEach(function (x, k) { x.classList.toggle('an', k === n); }); SB.i = n; }
  document.addEventListener('input', function (ev) { if (ev.target.id === 'nz-sb-q') sbLaden(ev.target.value.trim()); });
  document.addEventListener('keydown', function (ev) {
    if (ev.target.id !== 'nz-sb-q') return;
    var l = $('nz-sb-liste'), anz = l && !l.hidden ? l.querySelectorAll('.nz-sb-o').length : 0;
    if (ev.key === 'ArrowDown' && anz) { ev.preventDefault(); sbWahl((SB.i + 1) % anz); }
    else if (ev.key === 'ArrowUp' && anz) { ev.preventDefault(); sbWahl((SB.i - 1 + anz) % anz); }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (SB.i >= 0 && SB.liste[SB.i]) { var id = SB.liste[SB.i].id; sbZu(); profilOeffnen(id); } else sbAlle(); }
    else if (ev.key === 'Escape') { sbZu(); }
  });
  function sbAlle() {
    var q = ($('nz-sb-q') || {}).value || ''; sbZu();
    SUCHE = { branche: '', region: '', q: q.trim() };
    var f = $('nz-s-q'); if (f) f.value = SUCHE.q; var b = $('nz-s-br'); if (b) b.value = ''; var r = $('nz-s-reg'); if (r) r.value = '';
    suchen();
    var box = $('nz-treffer'); if (box) window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if ((x = t.closest && t.closest('[data-nz-sb]'))) { sbZu(); profilOeffnen(x.getAttribute('data-nz-sb')); return; }
    if (t.closest && t.closest('[data-nz-sb-alle]')) { sbAlle(); return; }
    if (!(t.closest && t.closest('.nz-sb'))) sbZu();
  });
  document.addEventListener('focusin', function (ev) { if (ev.target.id === 'nz-sb-q' && ev.target.value.trim()) sbLaden(ev.target.value.trim()); });
  function suchLesen() { SUCHE = { branche: $('nz-s-br').value, region: $('nz-s-reg').value.replace(/\D/g, ''), q: $('nz-s-q').value.trim() }; }
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.matches && t.matches('[data-nz-upload]')) { hochladen(t); return; }
    if (t.id === 'nz-s-br') { suchLesen(); suchen(); }
  });
  document.addEventListener('input', function (ev) { if (ev.target.id === 'nzp-text') zaehlen(); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { var d = $('nz-dlg'); if (d && !d.hidden) { $('nz-dlg-ab').click(); return; } profilZu(); }
    if (ev.target.id === 'nz-text' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); senden(); }
    if ((ev.target.id === 'nz-s-q' || ev.target.id === 'nz-s-reg') && ev.key === 'Enter') { suchLesen(); suchen(); }
  });

  /* ═══ Anbinden ═══ */
  var SEITEN = { vernetzen: findenZeichnen, nachrichten: chatZeichnen, netzprofil: profilForm, partner: partnerZeichnen };
  var altShow = window.show;
  window.show = function (v) {
    altShow.apply(this, arguments);
    if (!SEITEN[v]) return;
    if (v === 'netzprofil') { EDIT = NZ_EDIT; NZ_EDIT = false; }
    var box = { vernetzen: 'nz-finden', nachrichten: 'nz-nachr', netzprofil: 'nz-profil', partner: 'nz-partner' }[v];
    if (!S && $(box)) $(box).innerHTML = '<p class="muted">Lade …</p>';
    (sperre() ? Promise.resolve() : start(v !== 'nachrichten' || !S)).then(function () { SEITEN[v](); });
  };
  var PK = null;
  function paketeHTML(ok) {
    if (!PK) PK = kopie(S.pakete || []);
    var h = '<div class="card nz-block" style="margin-top:14px"><h2>Gemeinsame Pakete <span class="nz-zahl">' + PK.length + ' von 3</span></h2><p class="cs">Stellen Sie mit Ihren Partnern ein Paket zusammen, zum Beispiel Location, Food Truck und Blumen. Wählt der Gast das Paket im Formular, bekommen alle Partner darin die Anfrage automatisch.</p>';
    if (!ok.length) return h + '<p class="muted" style="padding:0">Sobald ein Partner zugestimmt hat, können Sie hier ein Paket anlegen.</p></div>';
    h += PK.map(function (pk, i) {
      return '<div class="nz-pk"><div class="nz-form"><label class="nz-f"><span>Name des Pakets</span><input class="sinp" data-pk-f="titel" data-i="' + i + '" maxlength="80" value="' + e(pk.titel) + '" placeholder="z. B. Hochzeit komplett"></label>'
        + '<label class="nz-f"><span>Kurzer Text</span><input class="sinp" data-pk-f="text" data-i="' + i + '" maxlength="300" value="' + e(pk.text) + '" placeholder="z. B. Abendessen vom Food Truck und Tischblumen"></label></div>'
        + '<div class="nz-pk-p"><span>Partner im Paket:</span>' + ok.map(function (p) {
          return '<label class="nz-check"><input type="checkbox" data-pk-p="' + e(p.id) + '" data-i="' + i + '"' + ((pk.partner || []).indexOf(p.id) > -1 ? ' checked' : '') + '><span>' + e(p.name) + '</span></label>';
        }).join('') + '</div><button class="nz-lnk rot" data-pk-weg="' + i + '">Paket entfernen</button></div>';
    }).join('');
    return h + '<div class="nz-reihe">' + (PK.length < 3 ? '<button class="linkbtn" data-pk-neu>+ Paket anlegen</button>' : '') + (PK.length || (S.pakete || []).length ? '<button class="linkbtn gut" data-pk-speichern>Pakete speichern</button>' : '') + '</div><div class="smsg" id="nz-pk-msg"></div></div>';
  }
  document.addEventListener('click', function (ev) {
    var x = ev.target.closest && ev.target.closest('[data-pk-neu],[data-pk-weg],[data-pk-speichern]');
    if (!x || !PK) return;
    if (x.hasAttribute('data-pk-neu')) { if (PK.length < 3) PK.push({ titel: '', text: '', partner: [] }); partnerZeichnen(); return; }
    if (x.hasAttribute('data-pk-weg')) { PK.splice(+x.getAttribute('data-pk-weg'), 1); partnerZeichnen(); return; }
    var leer = PK.filter(function (pk) { return !String(pk.titel || '').trim() || !(pk.partner || []).length; });
    if (leer.length) { meldung('nz-pk-msg', 'Jedes Paket braucht einen Namen und mindestens einen Partner.'); return; }
    x.disabled = true;
    post('pakete', { liste: PK }).then(function (j) {
      x.disabled = false;
      if (!j.ok) { meldung('nz-pk-msg', j.error || 'Speichern fehlgeschlagen.'); return; }
      start(true).then(function () { PK = null; partnerZeichnen(); meldung('nz-pk-msg', 'Gespeichert. Ihr Formular zeigt die Pakete ab sofort.', true); });
    });
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target; if (!PK || !t.matches || !t.matches('[data-pk-f]')) return;
    var pk = PK[+t.getAttribute('data-i')]; if (pk) pk[t.getAttribute('data-pk-f')] = t.value;
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!PK || !t.matches || !t.matches('[data-pk-p]')) return;
    var pk = PK[+t.getAttribute('data-i')]; if (!pk) return;
    var l = pk.partner = pk.partner || [], id = t.getAttribute('data-pk-p'), k = l.indexOf(id);
    if (t.checked && k < 0) l.push(id); if (!t.checked && k > -1) l.splice(k, 1);
  });
  var cssPk = document.createElement('style');
  cssPk.textContent = '.nz-zaehler{display:flex;flex-wrap:wrap;gap:10px 28px;align-items:flex-end;margin-bottom:14px}.nz-zaehler .cs{flex:1 1 100%;margin:0}'
    + '.nz-zl{display:flex;flex-direction:column}.nz-zl b{font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1;color:var(--accent)}.nz-zl span{font-size:13px;color:var(--ink-2);margin-top:4px}'
    + '.nz-pk{border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:12px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}.nz-pk .nz-form{width:100%}'
    + '.nz-pk-p{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:12.5px;color:var(--ink-3)}';
  document.head.appendChild(cssPk);
  var altDt = window.dtOeffnen;
  if (altDt) window.dtOeffnen = function (id) { altDt.apply(this, arguments); weiterLaden(id); };
  /* Schnelles Nachladen: kleine Abfrage alle 5 Sekunden in „Nachrichten“, sonst alle 30 Sekunden. */
  var PULS = { u: -1, r: -1, l: null, n: 0 };
  function puls() {
    if (!S || S.fehler || window._admin || !tok() || document.hidden) return;
    get('puls').then(function (j) {
      if (!j || !j.ok) return;
      var erst = PULS.u < 0, rNeu = j.rein !== PULS.r, neu = j.letzte !== PULS.l || rNeu || j.ungelesen !== PULS.u;
      PULS.u = j.ungelesen; PULS.r = j.rein; PULS.l = j.letzte;
      if (erst || !neu) return;
      S.ungelesen = j.ungelesen;
      var b = $('nav-nachr'); if (b) { b.textContent = j.ungelesen; b.hidden = !j.ungelesen; }
      var v = document.querySelector('.view.on'); v = v && v.getAttribute('data-v');
      if (v === 'nachrichten') chatListeStill();
      else if (rNeu) neuZeichnen();
    });
  }
  setInterval(function () {
    var v = document.querySelector('.view.on'); v = v && v.getAttribute('data-v');
    PULS.n++;
    if (v === 'nachrichten' || PULS.n % 6 === 0) puls();
  }, 5000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) puls(); });
  setTimeout(function () {
    if (tok() && !window._admin) start().then(function () {
      var v = document.querySelector('.view.on'); v = v && v.getAttribute('data-v');
      if (SEITEN[v]) SEITEN[v]();
    });
  }, 1200);

  var css = document.createElement('style');
  css.textContent = [
    '.nz-wk{width:22px;height:22px;accent-color:var(--accent);cursor:pointer;flex:0 0 auto}',
    '.nz-woche{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:14px;margin-bottom:18px}.nz-woche .card{margin:0}',
    '.nz-wl{font-family:var(--fm);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}',
    '.nz-wz{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:6px 0 8px}.nz-wz b{font-size:30px;line-height:1;font-weight:600}.nz-wz b.nz-leise{font-size:17px;color:var(--ink-2)}',
    '.nz-tr{font-size:12px;color:var(--ink-3)}.nz-tr.up{color:var(--good,#2f7d59)}.nz-tr.dn{color:var(--ink-3)}',
    '.nz-wchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}.nz-wchips span{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:3px 9px;color:var(--ink-2)}',
    '.nz-klein{font-size:11.5px;color:var(--ink-3);margin:6px 0 0}',
    '.nz-az,.nz-bz.az{display:inline-flex;align-items:center;gap:8px}.nz-az{font-size:15px;font-weight:600;margin:8px 0 6px}.nz-az i,.nz-bz.az i{width:9px;height:9px;border-radius:50%;background:#2f9e6a;box-shadow:0 0 0 3px rgba(47,158,106,.18);flex:0 0 auto}',
    '.nz-top{list-style:none;margin:8px 0 4px;padding:0;display:flex;flex-direction:column;gap:6px}.nz-top li{display:flex;align-items:center;gap:10px;min-width:0}.nz-top li i{font-style:normal;font-family:var(--fm);font-size:11px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--panel-2);flex:0 0 auto}.nz-top li:first-child i{background:#e9c46a;color:#3a2c07}.nz-top li .nz-lnk{flex:1 1 auto;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nz-top li b{font-family:var(--fm);font-size:13px}.nz-top li.ich .nz-lnk{font-weight:600}',
    '.nz-tage{display:inline-flex;flex-wrap:wrap;gap:5px}.nz-tage i{font-style:normal;font-family:var(--fm);font-size:11.5px;border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);color:var(--accent);border-radius:6px;padding:2px 6px;display:inline-flex;align-items:center;gap:4px}.nz-tage i button{border:none;background:none;color:inherit;font:inherit;font-size:14px;line-height:1;padding:0 0 0 2px;cursor:pointer;min-width:20px;min-height:20px}',
    '.nz-tage-e{margin:4px 0 10px}.nz-reihe{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.nz-reihe .sinp{flex:1 1 150px;min-width:0}',
    '.nz-check{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--ink-2);margin-top:12px;cursor:pointer}.nz-check input{margin-top:3px;flex:0 0 auto}',
    '.nz-bzs{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:8px 0 2px}.nz-bz.vt{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--ink)}',
    '.nz-bzs{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:8px 0 2px}.nz-bz{font-size:12.5px;color:var(--ink-2)}.nz-bz.top{background:#fbf1d6;color:#6b4e0c;border-radius:999px;padding:3px 10px}.nz-bz.frei{font-weight:600}',
    '.nz-hinweis{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px;border-color:color-mix(in srgb,var(--accent) 35%,transparent)}',
    '.nz-block{margin-bottom:18px}.nz-zahl{font-family:var(--fm);font-size:11px;color:var(--ink-3);font-weight:500;margin-left:6px}',
    '.nz-h3{font-size:13px;font-weight:600;margin:18px 0 8px;color:var(--ink-2)}',
    '.nz-liste{display:flex;flex-direction:column}',
    '.nz-z{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line);flex-wrap:wrap}.nz-z:first-child{border-top:none}',
    '.nz-z-l{display:flex;align-items:center;gap:11px;min-width:0;flex:1 1 220px;background:none;border:none;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer}',
    'span.nz-z-l{cursor:default}.nz-z-tx{display:flex;flex-direction:column;min-width:0}.nz-z-tx b{font-size:14px;font-weight:600}.nz-z-tx span{font-size:12.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nz-z-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.nz-zeit{font-family:var(--fm);font-size:11px;color:var(--ink-3)}',
    '.nz-av{width:44px;height:44px;border-radius:50%;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;font-weight:650;background-size:cover;background-position:center}',
    '.nz-av.xxs{width:20px;height:20px;font-size:10px}.nz-av.xs{width:24px;height:24px;font-size:11px}.nz-av.s{width:38px;height:38px;font-size:15px}.nz-av.m{width:56px;height:56px;font-size:21px;margin-top:-30px;border:3px solid var(--card)}.nz-av.xl{width:116px;height:116px;font-size:42px;border:4px solid var(--card)}',
    '.nz-pill{display:inline-flex;align-items:center;font-family:var(--fm);font-size:10.5px;padding:4px 10px;border-radius:999px;background:var(--panel-2);color:var(--ink-2);white-space:nowrap}',
    '.nz-pill.ok{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}.nz-pill.w{background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn)}',
    '.nz-sb{position:relative;display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:0 14px;margin-bottom:18px;box-shadow:0 1px 0 rgba(0,0,0,.02)}.nz-sb:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}',
    '.nz-sb>svg{width:19px;height:19px;flex:none;color:var(--ink-3)}.nz-sb input{flex:1;min-width:0;border:0;background:transparent;font:inherit;font-size:15px;color:var(--ink);padding:14px 0;outline:0}',
    '.nz-sb-liste{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:40;background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 14px 40px rgba(20,16,10,.16);padding:6px;max-height:420px;overflow:auto}',
    '.nz-sb-o{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:0;border-radius:10px;padding:8px 10px;font:inherit;color:inherit;cursor:pointer}.nz-sb-o:hover,.nz-sb-o.an{background:var(--panel-2)}.nz-sb-o .nz-z-tx{flex:1;min-width:0}',
    '.nz-sb-o mark{background:color-mix(in srgb,var(--accent) 22%,transparent);color:inherit;border-radius:3px;padding:0 1px}',
    '.nz-sb-alle{display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);margin-top:4px;padding:10px 12px 6px;font:inherit;font-size:13px;color:var(--accent);cursor:pointer}.nz-sb-alle:hover{text-decoration:underline}',
    '.nz-sb-leer{margin:0;padding:12px;font-size:13.5px;color:var(--ink-3)}',
    '.nz-suche{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}.nz-suche .sinp{flex:1 1 170px;min-width:0}',
    '.nz-hilfe{font-size:12.5px;color:var(--ink-3);margin:6px 0 16px;max-width:70ch;text-wrap:pretty}',
    '.nz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}',
    '.nz-k{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--schatten);cursor:pointer;transition:border-color .15s,transform .15s}',
    '.nz-k:hover{border-color:var(--line-2);transform:translateY(-1px)}.nz-k-bild{height:96px;background-size:cover;background-position:center}',
    '.nz-k-in{padding:0 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}.nz-k b{font-size:15px;font-weight:620}',
    '.nz-meta{font-size:12.5px;color:var(--ink-3)}.nz-k p{margin:0;font-size:13px;color:var(--ink-2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    '.nz-k-fuss{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:6px}',
    '.nz-ov{position:fixed;inset:0;z-index:80;background:rgba(20,17,12,.5);display:flex;align-items:flex-start;justify-content:center;padding:4vh 14px;overflow:auto}.nz-ov[hidden]{display:none}.nz-ov.oben{z-index:90;align-items:center}',
    '.nz-modal{position:relative;width:100%;max-width:760px;background:var(--panel);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.25)}',
    '.nz-modal.klein{max-width:480px;padding:24px}.nz-modal.klein h3{margin:0 0 6px;font-size:17px}',
    '.nz-zu{position:absolute;top:12px;right:12px;z-index:2;width:38px;height:38px;border-radius:50%;border:none;background:rgba(255,253,248,.9);color:#241f19;font-size:22px;cursor:pointer;line-height:1}',
    '.nz-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:20px 26px 0}',
    '.nz-g{margin:0;position:relative;border-radius:12px;overflow:hidden;aspect-ratio:4/3;background:var(--panel-2)}.nz-g-img{position:absolute;inset:0;background-size:cover;background-position:center}',
    '.nz-g .nz-like{position:absolute;left:8px;bottom:8px;background:rgba(255,253,248,.92);border-color:transparent;color:#241f19}.nz-g .nz-like.on{color:#bc5138}.nz-g .nz-like.still{padding-left:11px}',
    '.nz-g-weg{position:absolute;top:6px;right:6px;width:30px;height:30px;border-radius:50%;border:none;background:rgba(36,31,25,.72);color:#fff;font-size:17px;cursor:pointer;line-height:1}',
    '.nz-g.neu{display:flex;align-items:center;justify-content:center;border:1.5px dashed var(--line-2);background:none;cursor:pointer;color:var(--accent);font-size:13px;font-weight:600;text-align:center;padding:10px}',
    '.nz-gal.edit{padding:0}',
    '.nz-lnk{background:none;border:none;padding:0;font:inherit;font-size:12.5px;color:var(--ink-3);cursor:pointer}.nz-lnk:hover{color:var(--ink)}.nz-lnk.rot:hover{color:var(--bad)}',
    '.nz-ta{width:100%;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:10px;padding:10px 13px;font-family:var(--fd);font-size:14px;color:var(--ink);resize:vertical;min-height:96px;line-height:1.5}.nz-ta:focus{outline:none;border-color:var(--accent)}',
    '.nz-reihe{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}',
    '.nz-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:12px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:95;max-width:calc(100% - 28px)}.nz-toast.on{opacity:1;transform:translate(-50%,0)}',
    '.nz-chat{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);padding:0 !important;overflow:hidden;min-height:540px}',
    '.nz-th{border-right:1px solid var(--line);overflow:auto;max-height:640px}',
    '.nz-ti{display:flex;align-items:center;gap:10px;width:100%;padding:13px 16px;border:none;border-bottom:1px solid var(--line);background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}',
    '.nz-ti:hover{background:var(--panel-2)}.nz-ti.on{background:color-mix(in srgb,var(--accent) 10%,transparent)}',
    '.nz-ti-tx{display:flex;flex-direction:column;min-width:0;flex:1}.nz-ti-tx b{font-size:14px;font-weight:600}.nz-ti-tx span{font-size:12.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.nz-ti-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.nz-ti-r time{font-family:var(--fm);font-size:10.5px;color:var(--ink-3)}',
    '.nz-ti-r i{font-style:normal;font-family:var(--fm);font-size:10.5px;background:var(--accent);color:var(--on-accent);border-radius:999px;padding:1px 7px}',
    '.nz-cv-akt{margin-left:auto;display:flex;gap:12px;flex:none}.nz-cv-akt .nz-lnk{white-space:nowrap}.nz-cv-kopf{flex-wrap:wrap}.nz-cv-kopf .nz-z-l{min-width:0;flex:1 1 160px}',
    '.nz-cv{display:flex;flex-direction:column;min-width:0}.nz-cv-kopf{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--line)}',
    '.nz-zurueck{display:none;width:36px;height:36px;border:none;background:var(--panel-2);border-radius:50%;font-size:20px;cursor:pointer;color:var(--ink)}',
    '.nz-msgs{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:8px;max-height:520px;min-height:300px}',
    '.nz-m{max-width:78%;padding:10px 13px;border-radius:14px 14px 14px 4px;background:var(--panel-2);font-size:14px;line-height:1.5;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.nz-m.ich{align-self:flex-end;background:var(--accent);color:var(--on-accent);border-radius:14px 14px 4px 14px}.nz-m time{display:block;font-family:var(--fm);font-size:10px;opacity:.65;margin-top:3px}',
    '.nz-inp{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line);align-items:flex-end}',
    '.nz-inp textarea{flex:1;min-width:0;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:12px;padding:10px 13px;font-family:var(--fd);font-size:14px;color:var(--ink);resize:none;min-height:44px;max-height:160px;field-sizing:content}.nz-inp textarea:focus{outline:none;border-color:var(--accent)}',
    '.nz-leer{margin:auto;color:var(--ink-3);font-size:13.5px;text-align:center;padding:40px 20px}',
    '.nz-2{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px;align-items:start}@media(max-width:1050px){.nz-2{grid-template-columns:minmax(0,1fr)}}',
    '.nz-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:560px){.nz-form{grid-template-columns:minmax(0,1fr)}}',
    '.nz-f{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--ink-2);min-width:0}.nz-f .sinp{min-width:0;width:100%}.nz-f em{font-style:normal;font-family:var(--fm);font-size:10.5px;color:var(--ink-3);margin-left:6px}',
    '.nz-f.breit,.nz-check.breit{grid-column:1/-1}.nz-check{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--ink-2);line-height:1.5}.nz-check input{margin-top:3px;accent-color:var(--accent);width:17px;height:17px}',
    '.nz-bb{position:relative;margin-bottom:8px}.nz-bb-cover{height:170px;border-radius:14px;background-size:cover;background-position:center;position:relative}',
    '.nz-bb-cover .nz-bb-k{position:absolute;right:10px;top:10px}.nz-bb-k{display:flex;gap:6px;flex-wrap:wrap}.nz-bb-k .linkbtn{background:var(--panel);cursor:pointer}',
    '.nz-bb-person{display:flex;align-items:flex-end;gap:12px;margin:-52px 0 0 18px;position:relative}.nz-bb-person .nz-bb-k{padding-bottom:6px}',
    '.nz-vs{border:1px solid var(--line);border-radius:14px;padding:16px;background:#fffdf8;color:#241f19}',
    '.nz-vs-l{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:12px;color:#7a7263;padding-bottom:14px;border-bottom:1px solid rgba(36,31,25,.1)}',
    '.nz-vs-l a{display:inline-flex;align-items:center;gap:5px;color:#2f7d59;font-weight:600}',
    '.nz-vs-g{padding-top:14px}.nz-vs-g h4{margin:0 0 2px;font-size:15px}.nz-vs-g>p{margin:0 0 10px;font-size:12.5px;color:#7a7263}',
    '.nz-vs-k{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid rgba(36,31,25,.1);border-radius:12px;margin-top:6px}.nz-vs-k div{flex:1;min-width:0;display:flex;flex-direction:column}',
    '.nz-vs-k b{font-size:13.5px}.nz-vs-k span{font-size:12px;color:#7a7263}.nz-vs-k em{font-style:normal;font-size:12px;color:#2f7d59;font-weight:600;white-space:nowrap}',
    '.nz-pfeil{width:34px;height:34px;border-radius:9px;border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink);cursor:pointer;font-size:14px}.nz-pfeil:disabled{opacity:.35;cursor:default}',
    '[data-leer]{background:repeating-linear-gradient(135deg,#efe9df 0 12px,#e9e2d6 12px 24px);display:grid;place-items:center}',
    '[data-leer]:not([data-leer=""])::after{content:attr(data-leer);font-family:var(--fm);font-size:11px;color:#615c50;background:rgba(255,255,255,.85);padding:4px 8px;border-radius:6px;text-align:center;max-width:80%;line-height:1.35}',
    '.nz-pf{background:var(--card)}.nz-cover{height:clamp(160px,26vw,240px);background-size:cover;background-position:center}',
    '.nz-pf-in{padding:0 clamp(16px,3vw,26px) clamp(18px,3vw,26px);display:flex;flex-direction:column;gap:16px}',
    '.nz-pfav{width:112px;height:112px;border-radius:50%;margin-top:-56px;border:4px solid var(--card);background-color:#efe9df;background-size:cover;background-position:center;position:relative;flex:none;overflow:hidden;display:grid;place-items:center}',
    '.nz-pfav>span{font-size:40px;font-weight:700;color:#615c50}.nz-pfav[data-leer]:not([data-leer=""])::after{font-size:10px;padding:3px 6px}',
    '.nz-pfh{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-end}.nz-pfh h3{margin:0;font-size:22px;letter-spacing:-.015em}',
    '.nz-pbr{font-family:var(--fm);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-top:4px}',
    '.nz-who{font-size:13.5px;color:var(--ink-2);margin-top:4px}.nz-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
    '.nz-btn{font-family:var(--fd);font-size:13.5px;font-weight:600;border-radius:999px;padding:9px 16px;border:1.5px solid var(--accent);background:var(--accent);color:var(--on-accent);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;min-height:40px}',
    '.nz-btn.o{background:transparent;color:var(--accent)}.nz-btn:disabled{opacity:.45;cursor:default}.nz-btn.still{cursor:default}.nz-btn.still:not(.o){opacity:.72}',
    '.nz-like{display:inline-flex;align-items:center;gap:6px;font-family:var(--fd);font-size:13.5px;font-weight:600;border:1.5px solid var(--line-2);background:var(--card);color:var(--ink-2);border-radius:999px;padding:8px 14px;cursor:pointer;white-space:nowrap;min-height:40px}',
    '.nz-like svg{width:15px;height:15px;fill:currentColor}.nz-like.on{color:#b3261e;border-color:#f0c9c5;background:#fdf1f0}',
    '.nz-like.still{cursor:default}.nz-like:not(.still):not(.on):hover{border-color:#f0c9c5;color:#b3261e}',
    '.nz-like.mini{border-color:transparent;background:none;padding:6px 8px;margin:-6px -8px;min-height:32px;font-family:var(--fm);font-size:12px;font-weight:500;cursor:pointer}.nz-like.mini.on{background:none}',
    '.nz-about{margin:0;font-size:14.5px;line-height:1.6;color:var(--ink-2);max-width:620px;text-wrap:pretty}',
    '.nz-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.nz-facts div{border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-width:0}',
    '.nz-facts b{display:block;font-size:16px}.nz-facts span{font-size:12px;color:var(--ink-3)}',
    '.nz-ph{margin:0;font-size:17px;letter-spacing:-.01em}',
    '.nz-pgal{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:560px){.nz-pgal{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.nz-gi{display:flex;flex-direction:column;gap:6px;min-width:0}.nz-im{aspect-ratio:4/3;border-radius:10px;overflow:hidden;background-color:#efe9df;background-size:cover;background-position:center}',
    '.nz-gi .nz-like{align-self:flex-start;padding:5px 11px;font-size:12.5px;min-height:32px}',
    '.nz-chips{display:flex;gap:8px;flex-wrap:wrap}.nz-chip{font:inherit;font-size:13px;padding:6px 12px;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-weight:500;border:none;cursor:pointer}',
    '.nz-pf-fuss{display:flex;gap:18px;padding-top:16px;border-top:1px solid var(--line)}',
    '.nz-eigen{padding:0 !important;overflow:hidden;max-width:860px}',
    '.nz-start{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:18px;align-items:start;margin-bottom:22px}@media(max-width:1050px){.nz-start{grid-template-columns:minmax(0,1fr)}}',
    '.nz-feed,.nz-seite{display:flex;flex-direction:column;gap:14px;min-width:0}.nz-seite .card h2{margin-bottom:2px}',
    '.nz-karten{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}',
    '.nz-karte{border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:var(--panel)}',
    '.nz-karte-o{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;background:none;border:0;padding:0 12px 10px;cursor:pointer;color:inherit;font:inherit}',
    '.nz-karte-b{display:block;align-self:stretch;margin:0 -12px;height:64px;background-size:cover;background-position:center}',
    '.nz-karte-o .nz-av.m{margin-top:-28px;border:3px solid var(--panel)}.nz-karte-o b{font-size:14px;line-height:1.3}.nz-karte-o>span:last-child{font-size:12px;color:var(--ink-3)}',
    '.nz-karte-k{display:flex;justify-content:center;padding:0 10px 12px}',
    '.nz-post{padding:0 !important;overflow:hidden}.nz-post-k{display:flex;align-items:center;gap:10px;padding:14px 16px;flex-wrap:wrap}',
    '.nz-post-t{margin:0;padding:0 16px 12px;font-size:14.5px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;text-wrap:pretty}',
    '.nz-post-b{aspect-ratio:16/10;background-color:#efe9df;background-size:cover;background-position:center}',
    '.nz-post-f{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px}',
    '.nz-pn{display:flex;gap:12px;align-items:flex-start}.nz-pn-in{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}.nz-pn .nz-ta{min-height:64px}',
    '.nz-pn-fuss{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.nz-pn-fuss label{cursor:pointer}.nz-pn-fuss #nz-pn-go{margin-left:auto}',
    '.nz-pn-bild{display:block;max-width:100%;max-height:180px;border-radius:10px}',
    '.nz-ed{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:8px}',
    '@media(max-width:760px){.nz-chat{grid-template-columns:minmax(0,1fr)}.nz-th{border-right:none;max-height:none}.nz-chat .nz-cv{display:none}.nz-chat.offen .nz-cv{display:flex}.nz-chat.offen .nz-th{display:none}.nz-zurueck{display:inline-block}}'
  ].join('\n');
  document.head.appendChild(css);
  window.czNetzGet = get;
  window.czNetzProfil = profilOeffnen;
})();
