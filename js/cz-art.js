/* clickzauber — Cockpit passt sich der Art des Formulars an.
   termin   = Friseur, Nagelstudio, Wimpern, Kosmetik: Uhrzeit-Termine annehmen, ablehnen, andere Zeit vorschlagen
   auftrag  = Catering, Food Truck, Foto & Video: Angebote, aber keine Räume und keine Warteliste
   location = Hochzeitslocation, Tagungshaus & Co.: alles wie bisher, mit Räumen und Warteliste
   Die Art kommt vom Server (lib/profile.js → widgets[].art). Oben links wählt man das Formular,
   das Cockpit stellt sich darauf ein. In „Alle Formulare“ gilt: nur Termin-Formulare → Termin-Ansicht. */
(function () {
  'use strict';
  var NAME = { termin: 'Termine', auftrag: 'Aufträge', location: 'Location', pipeline: 'Anfragen' };
  var IC = { termin: '✂', auftrag: '❖', location: '⌂', pipeline: '◈' };
  var WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function $(id) { return document.getElementById(id); }
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function plusT(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function kurzDatum(s) { var d = new Date(s + 'T12:00:00'); return WT[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.'; }
  function ws() { return window.SRV_WIDGETS || []; }
  /* Die Art kommt vom Server. Fehlt sie (Server noch auf altem Stand), aus Kennung und Name schließen,
     damit ein Friseur-Formular nie im Location-Cockpit landet. */
  var TERMIN_WORT = /friseur|frisoer|frisör|salon|barbier|barber|nagel|nails|wimpern|lash|kosmetik|cosmetic|beauty|massage|termin/i;
  var PIPELINE_WORT = /solar|photovolt|waerme|wärme|heizung|dach|fenster|elektr|smart.?home|makler|immobil|finanzier|kredit|versicher|agentur|webdesign|marketing|steuer|buchhalt/i;
  var AUFTRAG_WORT = /food|truck|catering|foto|video|musik|dj|flor|deko|konditor|torte/i;
  var TERMIN_ZG = ['friseur', 'nagel', 'wimpern', 'kosmetik', 'barbier', 'massage'];
  var AUFTRAG_ZG = ['foodtruck', 'fotovideo', 'catering', 'musik', 'floristik', 'deko', 'konditorei'];
  /* Was der Konfigurator auf diesem Gerät zuletzt gespeichert hat. So stellt sich das Cockpit sofort um,
     wenn im Konfigurator die Friseur-Vorlage gewählt und gespeichert wird. */
  function artLokal(slug) {
    try {
      var l = JSON.parse(localStorage.getItem('cz_widgets') || '[]');
      var w = l.filter(function (x) { return x && x.id === slug; })[0];
      var c = w && w.config; if (!c) return '';
      if (c.zielgruppe && window.CZ_BRANCHEN && CZ_BRANCHEN.zgTyp[c.zielgruppe]) return CZ_BRANCHEN.artVonZg(c.zielgruppe);
      if (TERMIN_ZG.indexOf(c.zielgruppe) >= 0) return 'termin';
      if (AUFTRAG_ZG.indexOf(c.zielgruppe) >= 0) return 'auftrag';
      if (c.termin && c.termin.gefuehrt) return 'termin';
      return c.zielgruppe ? 'location' : '';
    } catch (x) { return ''; }
  }
  function artVon(slug) {
    /* Seit 13.10.2026 zuerst die Art vom Server. Ein alter Entwurf auf diesem Gerät zeigte sonst das falsche Cockpit. */
    var w = ws().filter(function (x) { return x.slug === slug; })[0];
    if (w && w.art) return w.art;
    var lok = artLokal(slug); if (lok) return lok;
    var t = String(slug || '') + ' ' + String((w && w.name) || '');
    if (TERMIN_WORT.test(t)) return 'termin';
    if (PIPELINE_WORT.test(t)) return 'pipeline';
    if (AUFTRAG_WORT.test(t)) return 'auftrag';
    return 'location';
  }
  function artLead(l) { return artVon((l && l.widget_id) || window.widget); }
  window.czArtVon = artVon; window.czArtLead = artLead;
  function aktiv() { return window.ALLE ? ws().map(function (x) { return x.slug; }) : [window.widget]; }
  function nurTermin() { var a = aktiv(); return a.length > 0 && a.every(function (s) { return artVon(s) === 'termin'; }); }
  function mitLocation() { return aktiv().some(function (s) { return artVon(s) === 'location'; }); }
  function holen(q) { return fetch(API + '/termine?token=' + encodeURIComponent(token) + '&' + q).then(function (r) { return r.json(); }); }
  function senden(d) {
    d.token = token;
    return fetch(API + '/termine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Server nicht erreichbar.' }; }); });
  }

  /* ── Umschalter oben links ─────────────────────────────── */
  function wahlBauen() {
    var main = document.querySelector('main.main'); if (!main) return null;
    var box = $('art-wahl');
    if (!box) {
      box = document.createElement('div'); box.className = 'art-wahl'; box.id = 'art-wahl';
      box.innerHTML = '<span class="art-ic" id="art-ic"></span><label class="art-l"><span>Formular</span><select id="art-sel" aria-label="Formular wählen"></select><b id="art-name"></b></label>';
      main.insertBefore(box, main.firstChild);
      $('art-sel').addEventListener('change', function () {
        var a = $('wsel'); if (!a) return;
        a.value = this.value; if (a.onchange) a.onchange();
      });
    }
    return box;
  }
  function wahlZeichnen() {
    var box = wahlBauen(), a = $('wsel'); if (!box || !a) return;
    var sel = $('art-sel'), name = $('art-name'), liste = ws();
    /* Wählen lässt sich erst ab zwei Formularen. Bei einem steht nichts zur Wahl. */
    var echte = Array.prototype.filter.call(a.options, function (o) { return o.value && o.value !== '__alle'; }).length;
    document.body.classList.toggle('ein-formular', echte < 2);
    box.hidden = echte < 2;
    if (echte < 2) return;
    var mehrere = a.options.length > 1;
    sel.innerHTML = Array.prototype.map.call(a.options, function (o) {
      var art = o.value === '__alle' ? '' : artVon(o.value);
      return '<option value="' + e(o.value) + '">' + (art ? IC[art] + '  ' : '') + e(o.textContent) + (art ? ' · ' + NAME[art] : '') + '</option>';
    }).join('');
    sel.value = a.value; sel.hidden = !mehrere; name.hidden = mehrere;
    var art = window.ALLE ? (nurTermin() ? 'termin' : '') : artVon(window.widget);
    var gewaehlt = a.selectedOptions && a.selectedOptions[0] ? a.selectedOptions[0] : a.options[0];
    name.textContent = (gewaehlt ? gewaehlt.textContent : '') + (art ? ' · ' + NAME[art] : '');
    $('art-ic').textContent = art ? IC[art] : '◎';
  }

  /* ── Ansicht umstellen ─────────────────────────────────── */
  function anwenden() {
    var b = document.body, t = nurTermin();
    b.classList.toggle('art-termin', t);
    b.classList.toggle('mit-location', mitLocation());
    var akt = aktiv();
    b.classList.toggle('art-pipeline', akt.length > 0 && akt.every(function (s) { return artVon(s) === 'pipeline'; }));
    b.classList.toggle('art-auftrag', akt.length > 0 && akt.every(function (s) { return artVon(s) === 'auftrag'; }));
    /* Seit 13.10.2026: Art je Formular merken. Das Skript am Anfang von <body> setzt sie beim nächsten Öffnen sofort. */
    if (Array.isArray(window.SRV_WIDGETS)) {
      var demo = window.token === 'demo' || /[?&](demo|beispiel|probe|rahmen)=/.test(location.search);
      if (window.SRV_WIDGETS.length && !demo) {
        try {
          var m = JSON.parse(localStorage.getItem('cz_art_vorab') || '{}') || {};
          m[window.widget || ''] = ['art-termin', 'mit-location', 'art-pipeline', 'art-auftrag'].filter(function (c) { return b.classList.contains(c); });
          if (!window._admin) m._ = { w: window.widget || '', t: String(window.token || '').slice(-10) };
          localStorage.setItem('cz_art_vorab', JSON.stringify(m));
        } catch (x) {}
      }
      b.classList.remove('art-warten');
    }
    try { window.dispatchEvent(new Event('cz-art')); } catch (x) {}
    wahlZeichnen();
    if (t) homeLaden();
  }
  window.czArtAnwenden = anwenden;
  /* Konfigurator speichert (auch im eingebetteten Fenster): Cockpit sofort umstellen. */
  window.addEventListener('storage', function (ev) { if (ev.key === 'cz_widgets') { try { ws().forEach(function (w) { var l = artLokal(w.slug); if (l) w.art = l; }); anwenden(); if (window.czSalonNeu) czSalonNeu(); } catch (x) {} } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { try { anwenden(); } catch (x) {} } });
  var altLoad = window.load;
  if (typeof altLoad === 'function') window.load = function () { var r = altLoad.apply(this, arguments); try { anwenden(); } catch (x) {} return r; };

  /* ── Startseite für Termin-Betriebe ────────────────────── */
  var HOME = null, SETUP = null, HOME_T = 0, GAST_HOST = '';
  var STAMM_T = 0;
  function stammLaden() {
    if (!token || window._admin) return;
    var h = iso(new Date());
    holen('aktion=liste&von=' + plusT(h, -91) + '&bis=' + h).then(function (j) {
      if (!j || !j.ok) return;
      var m = {};
      (j.termine || []).forEach(function (t) {
        if (t.eigen || t.status === 'abgelehnt' || t.status === 'abgesagt') return;
        var k = kundeSchl(t); if (!k) return;
        var x = m[k] || (m[k] = { n: 0, name: t.name, telefon: t.telefon, email: t.email, letzt: '', ma: {} });
        if (!x.email && t.email) x.email = t.email;
        x.n++; if (t.datum > x.letzt) { x.letzt = t.datum; x.name = t.name || x.name; }
        if (t.personal_name) x.ma[t.personal_name] = (x.ma[t.personal_name] || 0) + 1;
      });
      STAMM = m; stammZeichnen(); if (HOME) homeZeichnen();
    }).catch(function () {});
  }
  window.czStammNeu = stammLaden;
  function stammZeichnen() {
    var liste = Object.keys(STAMM).map(function (k) { return STAMM[k]; }).filter(function (x) { return x.n >= 4; }).sort(function (a, b) { return b.n - a.n; });
    var nb = $('nav-stamm'); if (nb) { nb.textContent = liste.length; nb.hidden = !liste.length; }
    var box = $('tm-stamm'); if (!box) return;
    box.innerHTML = liste.length ? '<div class="card"><div class="tm-liste">' + liste.map(function (x) {
      var ma = Object.keys(x.ma).sort(function (a, b) { return x.ma[b] - x.ma[a]; })[0];
      var tel = String(x.telefon || '').replace(/[^\d+]/g, '');
      return '<div class="tm-z st-fest tm-sk" role="button" tabindex="0" data-kk-name="' + e(x.name || '') + '" data-kk-tel="' + e(x.telefon || '') + '" data-kk-mail="' + e(x.email || '') + '"><span class="tm-zt">' + x.n + '×</span><span class="tm-zn"><b>' + e(x.name || 'Kunde') + '</b><span>'
        + e(['zuletzt ' + kurzDatum(x.letzt), ma ? 'meist bei ' + ma : ''].filter(Boolean).join(' · ')) + '</span></span>'
        + (tel ? '<a class="tm-sk-tel" href="tel:' + e(tel) + '">' + e(x.telefon) + '</a>' : '') + '</div>';
    }).join('') + '</div></div>'
      : '<div class="card"><p class="muted">Noch keine Stammkunden. Wer innerhalb von drei Monaten viermal über Ihr Formular bucht, erscheint hier automatisch.</p></div>';
  }
  window.czHomeNeu = function () { homeLaden(true); };
  function homeLaden(sofort) {
    if (!STAMM_T || Date.now() - STAMM_T > 300000) { STAMM_T = Date.now(); stammLaden(); }
    if (!token || window._admin) return;
    if (!sofort && HOME && Date.now() - HOME_T < 60000) { homeZeichnen(); return; }
    var h = iso(new Date());
    var p1 = holen('aktion=liste&von=' + plusT(h, -30) + '&bis=' + plusT(h, 14));
    var p2 = SETUP ? Promise.resolve({ ok: true, leistungen: SETUP }) : holen('aktion=setup');
    Promise.all([p1, p2]).then(function (r) {
      if (!r[0] || !r[0].ok) { $('tm-home').innerHTML = '<div class="card"><p class="muted">Die Termine konnten gerade nicht geladen werden.</p></div>'; return; }
      HOME = r[0].termine || []; HOME_T = Date.now();
      if (r[1] && r[1].ok) { SETUP = r[1].leistungen || []; if (r[1].gast_host) GAST_HOST = String(r[1].gast_host).replace(/\/+$/, ''); }
      homeZeichnen();
    }).catch(function () {});
  }
  function preisVon(name) { var l = (SETUP || []).filter(function (x) { return x.name === name; })[0]; return l && l.preis != null ? +l.preis : null; }
  /* Jeder Mitarbeiter bekommt eine eigene, deutlich andere Farbe. */
  var MA_FARBEN = ['#2f6fd6', '#e0762b', '#8e44c9', '#d23d77', '#139a8c', '#b07d0c', '#5b6472'];
  var MA_REIHE = {};
  function maFarbe(pid) {
    if (!pid) return '#5b6472';
    if (!(pid in MA_REIHE)) MA_REIHE[pid] = Object.keys(MA_REIHE).length;
    return MA_FARBEN[MA_REIHE[pid] % MA_FARBEN.length];
  }
  window.czMaFarbe = maFarbe;
  var STAMM = {};
  function kundeSchl(t) { var tel = String(t.telefon || '').replace(/\D/g, '').replace(/^49/, '0'); return tel.length >= 6 ? 't' + tel : (t.email ? 'm' + String(t.email).toLowerCase() : (t.name ? 'n' + String(t.name).toLowerCase().trim() : '')); }
  window.czIstStamm = function (t) { var k = kundeSchl(t); return !!(k && STAMM[k] && STAMM[k].n >= 4); };
  function zeile(t, knoepfe) {
    var st = { wunsch: 'wartet', vorschlag: 'Vorschlag offen', fest: 'bestätigt', abgelehnt: 'abgelehnt', abgesagt: 'abgesagt' }[t.status] || t.status;
    var gesperrt = t.eigen && t.leistung === 'Gesperrt', f = maFarbe(t.personal_id), waN = t.telefon && !gesperrt ? telWa(t.telefon) : '';
    return '<div class="tm-z st-' + e(t.status) + '" style="--ma:' + f + '"' + (gesperrt ? '' : ' data-tmauf="' + e(t.id) + '"') + (t.lead_id ? ' data-tmlead="' + e(t.lead_id) + '"' : '') + '>'
      + '<span class="tm-zt">' + e(t.zeit) + '</span>'
      + '<span class="tm-zn">' + (t.personal_name ? '<em class="tm-ma">' + e(t.personal_name) + '</em>' : '')
      + '<b>' + e(t.name || 'Kunde') + (window.czIstStamm(t) ? ' <i class="tm-stamm">Stammkunde</i>' : '') + '</b>'
      + '<span>' + e(t.leistung && !gesperrt ? t.leistung : (gesperrt ? 'Gesperrt' : '')) + '</span>'
      + (t.nachricht ? '<small class="tm-notiz">„' + e(t.nachricht) + '“</small>' : '') + '</span>'
      + (knoepfe && t.status === 'wunsch'
        ? '<span class="tm-zk"><button class="tm-ja" data-tmset="fest" data-tmid="' + e(t.id) + '">Annehmen</button><button class="tm-nein" data-tmset="abgelehnt" data-tmid="' + e(t.id) + '">Ablehnen</button></span>'
        /* Seit 13.10.2026: Nach „Annehmen“ steht hier der grüne Knopf, solange der Kunde nicht informiert ist (termine.bescheid, Text vom Server). */
        : knoepfe && t.bescheid && waN.length >= 8 && (t.status === 'fest' || t.status === 'vorschlag')
        ? '<span class="tm-zk tm-wz"><a class="tm-wa" data-bid="' + e(t.id) + '" target="_blank" rel="noopener" href="https://wa.me/' + waN + '?text=' + encodeURIComponent(t.bescheid) + '">Per WhatsApp Bescheid sagen</a></span>'
        : '<span class="tm-zs">' + e(st) + '</span>')
      + '</div>';
  }
  function balken(paare, leer) {
    if (!paare.length) return '<p class="muted">' + leer + '</p>';
    var max = Math.max.apply(null, paare.map(function (p) { return p[1]; }));
    return '<div class="tm-bal">' + paare.map(function (p) {
      return '<div><span>' + e(p[0]) + '</span><i><b style="width:' + Math.round(p[1] / max * 100) + '%"></b></i><em>' + p[1] + '</em></div>';
    }).join('') + '</div>';
  }
  /* Sperren (Früher Schluss, Frei) sind keine Termine (seit 13.10.2026): nicht mitzählen, unter „Heute“ je Mitarbeiter eine Zeile „gesperrt“.
     Der Server legt lange Sperren in Stücken von höchstens 10 Stunden an, die Zeile fasst sie zusammen. */
  function istSp(t) { return !!(t.eigen && t.leistung === 'Gesperrt'); }
  function sperrenZusammen(l) {
    var r = [];
    l.slice().sort(function (a, b) { return String(a.personal_id).localeCompare(String(b.personal_id)) || String(a.start).localeCompare(String(b.start)); }).forEach(function (t) {
      var v = r[r.length - 1];
      if (v && v.personal_id === t.personal_id && new Date(t.start).getTime() <= new Date(v.ende).getTime() + 60000) { v.ids.push(t.id); if (new Date(t.ende) > new Date(v.ende)) { v.ende = t.ende; v.bis_zeit = t.bis_zeit; } }
      else r.push(Object.assign({}, t, { ids: [t.id] }));
    });
    return r;
  }
  function sperrZeile(t) {
    var frei = t.name === 'Frei', bis = t.bis_zeit || '', tagEnde = !bis || bis === '00:00' || bis >= '23:55' || (t.ende && iso(new Date(t.ende)) > t.datum);
    var was = frei ? 'Ganzer Tag gesperrt' : tagEnde ? 'Rest des Tages gesperrt' : 'Gesperrt bis ' + bis + ' Uhr';
    return '<div class="tm-z tm-sperre" style="--ma:' + maFarbe(t.personal_id) + '"><span class="tm-zt">' + (frei ? '—' : e(t.zeit)) + '</span>'
      + '<span class="tm-zn">' + (t.personal_name ? '<em class="tm-ma">' + e(t.personal_name) + '</em>' : '') + '<b>' + e(t.name || 'Gesperrt') + '</b><span>' + e(was) + '</span></span>'
      + '<button type="button" class="tm-auf" data-auf="' + e((t.ids || [t.id]).join(',')) + '">Wieder öffnen</button></div>';
  }
  function homeZeichnen() {
    var box = $('tm-home'); if (!box || !HOME) return;
    var heute = iso(new Date()), aktivT = HOME.filter(function (t) { return !istSp(t) && (t.status === 'wunsch' || t.status === 'vorschlag' || t.status === 'fest'); });
    var d = new Date(), mo = new Date(d); mo.setDate(d.getDate() - ((d.getDay() + 6) % 7)); var woVon = iso(mo), woBis = plusT(woVon, 6);
    var hT = aktivT.filter(function (t) { return t.datum === heute; });
    var hL = hT.concat(sperrenZusammen(HOME.filter(function (t) { return istSp(t) && t.datum === heute && t.status === 'fest'; }))).sort(function (a, b) { return String(a.zeit).localeCompare(String(b.zeit)); });
    var offen = aktivT.filter(function (t) { return t.status !== 'fest' && t.datum >= heute; });
    var woche = HOME.filter(function (t) { return !istSp(t) && t.status === 'fest' && t.datum >= woVon && t.datum <= woBis; });
    var umsatz = 0, mitPreis = 0;
    woche.forEach(function (t) { var p = preisVon(t.leistung); if (p != null) { umsatz += p; mitPreis++; } });
    var alt = HOME.filter(function (t) { return !istSp(t) && t.datum >= plusT(heute, -30) && t.datum <= heute; });
    var absagen = alt.filter(function (t) { return t.status === 'abgesagt'; }).length;
    var kpi4 = '<div class="kpi"><div class="l">Absagen</div><div class="v">' + absagen + '</div><div class="d">letzte 30 Tage</div></div>';
    var nc = $('nav-count'), anz = nc ? (parseInt(nc.textContent, 10) || 0) : 0;
    var kpi0 = '<div class="kpi" data-salr-k="anfragen" title="Zu den offenen Anfragen"><div class="l">Anfragen</div><div class="v">' + anz + '</div><div class="d">' + (offen.length ? offen.length + ' warten auf Antwort' : 'alle beantwortet') + '</div></div>';
    var zaehl = function (feld, liste) { var m = {}; liste.forEach(function (t) { var k = t[feld]; if (k) m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6); };
    var gezaehlt = alt.filter(function (t) { return t.status === 'fest' || t.status === 'wunsch'; });
    var tage = [1, 2, 3, 4, 5, 6, 0].map(function (w) { return [WT[w], gezaehlt.filter(function (t) { return new Date(t.datum + 'T12:00:00').getDay() === w; }).length]; }).filter(function (p, i) { return p[1] > 0 || i < 6; });
    box.innerHTML =
      '<div class="kpis">' + kpi0
      + '<div class="kpi" data-view="kalender"><div class="l">Termine heute</div><div class="v">' + hT.length + '</div><div class="d">' + (hT.filter(function (t) { return t.status !== 'fest'; }).length || 'keiner') + ' davon noch offen</div></div>'
      + '<div class="kpi" data-view="kalender"><div class="l">Diese Woche</div><div class="v">' + woche.length + '</div><div class="d">bestätigte Termine</div></div>'
      + kpi4 + '</div>'
      + '<div class="card tm-heute"><div class="hd"><div><h2>Heute</h2><p class="cs" style="margin:2px 0 0">' + kurzDatum(heute) + '</p></div><button class="karte-mehr" data-view="kalender" style="margin:0">Alle Termine →</button></div>'
      + (hL.length ? '<div class="tm-liste">' + hL.map(function (t) { return istSp(t) ? sperrZeile(t) : zeile(t, true); }).join('') + '</div>' : '<p class="muted">Heute steht noch nichts an.</p>') + '</div>'
      + '<div class="grid">'
      + '<div class="card"><h2>Beliebte Leistungen</h2><p class="cs">Letzte 30 Tage</p>' + balken(zaehl('leistung', gezaehlt), 'Noch keine Termine im Zeitraum.') + '</div>'
      + '<div class="card"><h2>Volle Tage</h2><p class="cs">Termine je Wochentag, letzte 30 Tage</p>' + balken(gezaehlt.length ? tage : [], 'Noch keine Termine im Zeitraum.') + '</div>'
      + '</div>'
      + (zaehl('personal_name', woche).length > 1 ? '<div class="card" style="margin-bottom:14px"><h2>Wer diese Woche wie gefragt ist</h2>' + balken(zaehl('personal_name', woche), '') + '</div>' : '');
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('.tm-wz')) return;
    var b = ev.target.closest('[data-tmset]');
    if (b) {
      ev.stopPropagation();
      var st = b.getAttribute('data-tmset');
      if (st === 'abgelehnt' && !confirm('Diesen Terminwunsch ablehnen? Die Uhrzeit ist danach wieder frei.')) return;
      b.disabled = true;
      senden({ aktion: 'status', id: b.getAttribute('data-tmid'), status: st }).then(function (j) {
        if (!j.ok) { b.disabled = false; alert(j.error || 'Das hat nicht geklappt.'); return; }
        homeLaden(true); if (window.load) setTimeout(window.load, 300);
      });
      return;
    }
    var a = ev.target.closest('[data-tmauf]');
    if (a && window.czSchnellTermin) {
      var t = (HOME || []).filter(function (x) { return String(x.id) === a.getAttribute('data-tmauf'); })[0];
      if (t) { czSchnellTermin(t); return; }
    }
    var z = ev.target.closest('[data-tmlead]');
    if (z && window.LEADS && LEADS[z.getAttribute('data-tmlead')] && window.dtOeffnen) dtOeffnen(z.getAttribute('data-tmlead'));
  });

  /* ── Anfrage im Detail ─────────────────────────────────── */
  var TM = {}, TM_OFFEN = null;
  var LBL = { termin_uhrzeit: 'Termin', nachricht: 'Nachricht', leistung: 'Leistung' };
  function termineVon(l, fertig) {
    /* Alle Termine der Anfrage, auch wenn der Kunde inzwischen einen anderen Tag gewählt hat (lead=…, seit 14.10.2026).
       Ältere Server ohne lead= liefern den Bereich um den Tag der Anfrage bis vier Wochen nach heute. Offene zuerst, dann feste. */
    var h = iso(new Date()), d = String(l.termin || (l.answers && l.answers.termin) || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) d = h;
    var alt = d < plusT(h, -30), von = plusT(d < h ? d : h, -1), bis = alt ? plusT(d, 1) : plusT(d > h ? d : h, 28);
    holen('aktion=liste&lead=' + encodeURIComponent(l.id) + '&von=' + von + '&bis=' + bis).then(function (j) {
      var o = { wunsch: 0, vorschlag: 0, fest: 1 }, r = function (t) { return t.status in o ? o[t.status] : 2; };
      TM[l.id] = (j && j.ok ? j.termine : []).filter(function (t) { return t.lead_id === l.id; })
        .sort(function (a, b) { return (r(a) - r(b)) || String(a.start || '').localeCompare(String(b.start || '')); });
      fertig();
    }).catch(function () { TM[l.id] = []; fertig(); });
  }
  function telWa(tel) { var t = String(tel || '').replace(/[^\d+]/g, ''); if (t.indexOf('+') === 0) return t.slice(1); if (t.indexOf('00') === 0) return t.slice(2); if (t.indexOf('0') === 0) return '49' + t.slice(1); return t; }
  function gastLink(t) { return (GAST_HOST || API.replace(/\/api\/?$/, '')) + '/api/termine?aktion=antwort&id=' + encodeURIComponent(t.id) + '&k=' + encodeURIComponent(t.gast_key || ''); }
  function vorschlagText(t, l) {
    var vv = t.vorschlag_von ? new Date(t.vorschlag_von) : null;
    var alt = vv ? vv.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '';
    /* Bisherige Zeit an einem anderen Tag als der Vorschlag: den Tag mit nennen (Hin und Her über mehrere Tage) */
    var altTag = vv ? vv.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }) : '';
    var vn = String(t.name || l.name || '').split(/\s+/)[0];
    return 'Guten Tag' + (vn ? ' ' + vn : '') + ', ' + (alt ? (altTag && altTag !== t.datum ? 'am ' + kurzDatum(altTag) + ' um ' : 'um ') + alt + ' Uhr ist es bei uns leider schon voll. ' : '') + 'Passt Ihnen ' + kurzDatum(t.datum) + ' um ' + t.zeit + ' Uhr? '
      + 'Kurz bestätigen: ' + gastLink(t) + '&ja=1 – Passt nicht: ' + gastLink(t) + '&ja=0';
  }
  function terminBox(l) {
    var box = $('dt-termin'); if (!box) return;
    var liste = TM[l.id];
    if (!liste) { box.innerHTML = '<p class="muted">Lade …</p>'; termineVon(l, function () { if (window.DT_ID === l.id) { terminBox(l); if (window.dtAktionen) dtAktionen(l); } }); return; }
    if (!liste.length) { box.innerHTML = '<p class="bl-hint">Zu dieser Anfrage gibt es keinen Uhrzeit-Termin. Rufen Sie den Kunden an oder tragen Sie ihn unter Termine ein.</p>'; return; }
    var t = liste[0], tel = String(l.phone || l.telefon || t.telefon || '').trim();
    var STT = { wunsch: 'Wartet auf Ihre Bestätigung', vorschlag: 'Sie haben diese Zeit vorgeschlagen. Der Kunde hat noch nicht geantwortet.', fest: 'Bestätigt', abgelehnt: 'Abgelehnt', abgesagt: 'Abgesagt' };
    var h = liste.map(function (x) {
      return '<div class="tm-karte st-' + e(x.status) + '"><div><b>' + kurzDatum(x.datum) + ' · ' + e(x.zeit) + (x.bis_zeit ? '–' + e(x.bis_zeit) : '') + ' Uhr</b>'
        + '<span>' + e([x.leistung, x.personal_name].filter(Boolean).join(' · ')) + '</span></div><em>' + e(STT[x.status] || x.status) + '</em></div>';
    }).join('');
    var knoepfe = '';
    if (t.status === 'wunsch') knoepfe = '<button class="big" data-tmakt="fest">Annehmen</button><button class="linkbtn warn" data-tmakt="abgelehnt">Ablehnen</button><button class="linkbtn" data-tmakt="andere">Andere Uhrzeit vorschlagen</button>';
    else if (t.status === 'vorschlag') knoepfe = (tel ? '<a class="linkbtn" target="_blank" rel="noopener" href="https://wa.me/' + telWa(tel) + '?text=' + encodeURIComponent(vorschlagText(t, l)) + '">Per WhatsApp senden</a><a class="linkbtn" href="sms:' + e(tel.replace(/\s/g, '')) + '?&body=' + encodeURIComponent(vorschlagText(t, l)) + '">Per SMS senden</a>' : '')
      + '<button class="linkbtn" data-tmakt="fest">Kunde hat zugesagt</button><button class="linkbtn" data-tmakt="andere">Andere Zeit</button><button class="linkbtn warn" data-tmakt="abgesagt">Absagen</button>';
    else if (t.status === 'fest') knoepfe = '<button class="linkbtn" data-tmakt="andere">Verschieben</button><button class="linkbtn warn" data-tmakt="abgesagt">Absagen</button>';
    box.innerHTML = h + (knoepfe ? '<div class="dt-reihe">' + knoepfe + '</div>' : '')
      + '<div class="tm-andere" id="tm-andere"' + (TM_OFFEN === l.id ? '' : ' hidden') + '>'
      + '<p class="cs">Welche Zeit passt Ihnen statt dessen? Der Kunde bekommt einen Link und bestätigt mit einem Tipp.</p>'
      + '<div class="bz-zeit"><label>Tag<input type="date" id="tm-d" value="' + e(t.datum) + '"></label><label>Uhrzeit<input type="time" id="tm-z" step="300" value="' + e(t.zeit) + '"></label>'
      + '<button class="big" data-tmakt="senden">Vorschlag senden</button></div></div>'
      + '<div class="dt-msg" id="tm-msg"></div>';
  }
  function tmMeldung(t, gut) { var m = $('tm-msg'); if (m) { m.className = 'dt-msg ' + (gut ? 'gut' : 'bad'); m.textContent = t; } }
  function neuLaden(l, msg, gut) {
    delete TM[l.id];
    if (window.load) window.load();
    HOME_T = 0;
    try { if (window.czSalonNeu) czSalonNeu(); } catch (x) {}
    termineVon(l, function () { if (window.DT_ID === l.id) { terminBox(l); if (msg) tmMeldung(msg, gut); } if (window.LEADS && LEADS[l.id] && window.dtAktionen) dtAktionen(LEADS[l.id]); });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tmakt]'); if (!b || !window.DT_ID) return;
    var l = LEADS[DT_ID]; if (!l) return;
    var liste = TM[l.id] || [], t = liste[0], was = b.getAttribute('data-tmakt');
    if (!t) { var z = $('dt-termin-box'); if (z && window.dtScrollZu) dtScrollZu(z); return; }
    if (was === 'andere') { TM_OFFEN = l.id; var a = $('tm-andere'); if (a) { a.hidden = false; if (window.dtScrollZu) dtScrollZu(a); var zi = $('tm-z'); if (zi) zi.focus(); } return; }
    if (was === 'senden') {
      var d = $('tm-d').value, zt = $('tm-z').value;
      if (!d || !zt) { tmMeldung('Bitte Tag und Uhrzeit eintragen.', false); return; }
      b.disabled = true;
      senden({ aktion: 'vorschlag', id: t.id, datum: d, zeit: zt }).then(function (j) {
        b.disabled = false;
        if (!j.ok) { tmMeldung(j.error || 'Das hat nicht geklappt.', false); return; }
        TM_OFFEN = null;
        neuLaden(l, j.mail ? 'Vorschlag per E-Mail gesendet. Schicken Sie ihn zusätzlich per WhatsApp, dann sieht der Kunde ihn schneller.' : 'Vorschlag gespeichert. Jetzt per WhatsApp oder SMS an den Kunden schicken.', true);
      });
      return;
    }
    if (was === 'abgelehnt' && !confirm('Terminwunsch ablehnen? Die Uhrzeit ist danach wieder frei.')) return;
    if (was === 'abgesagt' && !confirm('Termin absagen? Die Uhrzeit ist danach wieder frei.')) return;
    /* Nur Termine, für die der Schritt erlaubt ist (wie am Server): Annehmen und Ablehnen nur offene, Absagen auch feste.
       Eine offene Umbuchung fällt beim Absagen des festen Termins am Server mit weg. Bleibt ein fester Termin, wird die Anfrage nicht „verloren“. */
    var VON = { fest: ['wunsch', 'vorschlag'], abgelehnt: ['wunsch', 'vorschlag'], abgesagt: ['wunsch', 'vorschlag', 'fest'] }[was] || [];
    var ziel = liste.filter(function (x) { return VON.indexOf(x.status) >= 0; });
    if (was === 'abgesagt') ziel = ziel.filter(function (x) { return !(x.ersetzt && ziel.some(function (y) { return String(y.id) === String(x.ersetzt); })); });
    var bleibt = liste.some(function (x) { return x.status === 'fest' && ziel.indexOf(x) < 0; });
    if (!ziel.length) { tmMeldung('Dieser Termin wurde schon bearbeitet. Bitte die Anfrage neu öffnen.', false); return; }
    b.disabled = true;
    Promise.all(ziel.map(function (x) { return senden({ aktion: 'status', id: x.id, status: was }); }))
      .then(function (r) {
        b.disabled = false;
        var f = r.filter(function (j) { return !j.ok; })[0];
        if (f) { tmMeldung(f.error || 'Das hat nicht geklappt.', false); return; }
        if (was !== 'fest' && !bleibt && window.dtSenden) dtSenden({ status: 'verloren' });
        var mail = r.some(function (j) { return j.mail; });
        neuLaden(l, was === 'fest' ? 'Angenommen. ' + (mail ? 'Der Kunde hat eine Bestätigung per E-Mail bekommen.' : 'Der Kunde hat keine E-Mail angegeben. Kurz anrufen oder per WhatsApp bestätigen.') : (was === 'abgelehnt' ? 'Abgelehnt. Die Uhrzeit ist wieder frei.' : 'Abgesagt. Die Uhrzeit ist wieder frei.'), true);
      });
  });

  function verstecken(id, weg) { var x = $(id); if (x) x.hidden = !!weg; }
  var altZ = window.dtZeichnen;
  if (typeof altZ === 'function') window.dtZeichnen = function (l) {
    altZ.apply(this, arguments);
    var art = artLead(l), tm = art === 'termin';
    ['dt-stand-box', 'dt-posten-box', 'dt-bel-box', 'dt-angebot-box', 'dt-anz-box', 'dt-antw-box'].forEach(function (id) { if (tm) verstecken(id, true); });
    if (!tm) { verstecken('dt-stand-box', false); verstecken('dt-angebot-box', false); verstecken('dt-anz-box', false); verstecken('dt-bel-box', false); verstecken('dt-antw-box', false); }
    verstecken('dt-termin-box', !tm);
    var hh = $('dt-angaben-h'); if (hh) hh.textContent = art === 'location' ? 'Angaben des Gastes' : 'Angaben des Kunden';
    var a = l.answers || {};
    var ein = Object.keys(a).filter(function (k) { return k !== 'text' && k.charAt(0) !== '_' && a[k] && typeof a[k] !== 'object' && !(tm && k === 'termin_uhrzeit'); });
    var dl = $('dt-angaben');
    if (dl) dl.innerHTML = ein.map(function (k) {
      var v = (k === 'termin' || k === 'ausweich') && window.deDate ? (deDate(a[k]) || a[k]) : a[k];
      return '<dt>' + e((window.DT_LABEL && DT_LABEL[k]) || LBL[k] || (window.czFeldLabel && czFeldLabel(l, k)) || k) + '</dt><dd>' + e(v) + '</dd>';
    }).join('');
    verstecken('dt-angaben-box', !ein.length);
    if (tm) { var sp = $('dt-spick'); if (sp) sp.hidden = true; terminBox(l); }
    else woerter(art);
  };
  /* Keine Räume außer bei Locations: Catering und Food Truck haben „Aufträge“. */
  function woerter(art) {
    var box = $('dt-bel'); if (!box) return;
    var eins = (window.RAEUME || []).length <= 1;
    if (art === 'location' && !eins) return;
    box.innerHTML = box.innerHTML
      .replace(/ — \d+ von \d+ Räumen bereits vergeben\./, art === 'location' ? ' — an diesem Tag ist schon etwas eingeplant.' : ' — an diesem Tag ist schon ein Auftrag eingeplant.')
      .replace(' — alle Räume frei.', ' — der Tag ist noch frei.')
      .replace('An diesem Tag ist kein Raum mehr frei.', art === 'location' ? 'Dieser Tag ist schon vergeben.' : 'An diesem Tag sind Sie schon ausgebucht.');
  }
  var altA = window.dtAktionen;
  if (typeof altA === 'function') window.dtAktionen = function (l) {
    altA.apply(this, arguments);
    if (artLead(l) !== 'termin') return;
    var box = $('dt-akt'); if (!box) return;
    var tel = String(l.phone || l.telefon || '').trim(), t = (TM[l.id] || [])[0], offen = !t || t.status === 'wunsch';
    var I = window.DT_IC || {};
    box.innerHTML =
      '<a class="a' + (tel ? '' : ' aus') + '" href="' + (tel ? 'tel:' + e(tel.replace(/\s/g, '')) : '#') + '"><i>' + (I.tel || '') + '</i>Anrufen</a>'
      + '<button class="a' + (offen ? '' : ' aus') + '" type="button" data-tmakt="fest"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i>Annehmen</button>'
      + '<button class="a' + (offen ? '' : ' aus') + '" type="button" data-tmakt="abgelehnt"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></i>Ablehnen</button>'
      + '<button class="a" type="button" data-tmakt="andere"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></i>Andere Zeit</button>';
  };
  var altS = window.spickBauen;
  if (typeof altS === 'function') window.spickBauen = function (l) {
    var h = altS.apply(this, arguments);
    if (artLead(l) === 'location') return h;
    return h.replace('Alle Räume sind an dem Tag vergeben. Ausweichtermin vorbereiten.', 'An dem Tag sind Sie schon ausgebucht. Ausweichtermin vorbereiten.')
      .replace(/\d+ von \d+ Räumen an dem Tag schon vergeben\./, 'An dem Tag steht schon ein Auftrag.');
  };

  /* ── Aus der Push-Nachricht: #anfrage-ID öffnet die Anfrage ── */
  function ausHash() {
    var m = /^#anfrage-([\w-]+)/.exec(location.hash || ''); if (!m) return;
    var id = m[1], n = 0;
    var iv = setInterval(function () {
      if (++n > 40) { clearInterval(iv); return; }
      if (window.czSchnellOeffnen) { clearInterval(iv); return; }   // die Schnellkarte übernimmt
      if (window.LEADS && LEADS[id] && window.dtOeffnen) {
        clearInterval(iv);
        try { anwenden(); } catch (x) {}
        if (window.show) try { show('leads'); } catch (x) {}
        dtOeffnen(id);
        try { history.replaceState(null, '', location.pathname + location.search + '#leads'); } catch (x) {}
      }
    }, 500);
  }
  window.addEventListener('hashchange', ausHash);
  ausHash();
  setTimeout(anwenden, 50);
})();

(function () {
  var c = document.createElement('style');
  /* Oben links steht die Formularwahl schon. Die zweite Auswahl neben den Überschriften wäre doppelt. */
  c.textContent = 'body.ein-formular #wsel,body.ein-formular #kv-wsel,body.ein-formular .wsel,body.ein-formular #art-wahl{display:none!important}body:has(#art-wahl:not([hidden])) .top #wsel,body:has(#art-wahl:not([hidden])) .top #kv-wsel{display:none!important}.tm-heute{margin-bottom:14px}'
    + '.tm-z{border-left:6px solid var(--ma,var(--line))!important;align-items:flex-start}'
    + '.tm-z[data-tmauf]:hover{background:color-mix(in srgb,var(--ma,#888) 6%,var(--panel-2))}'
    + '.tm-zn{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}'
    + '.tm-ma{font-style:normal;font-size:15px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ma,var(--ink-2))}'
    + '.tm-notiz{font-size:12.5px;color:var(--ink-3);line-height:1.4;font-style:italic;overflow-wrap:anywhere}'
    + '.tm-stamm{font-style:normal;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:color-mix(in srgb,#b07d0c 16%,transparent);color:#7a5608;vertical-align:2px;margin-left:4px}'
    + '.tm-zt{padding-top:2px}.tm-zk,.tm-zs{align-self:center}'
    + '.tm-wz{flex-wrap:wrap}.tm-wa{display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px 16px;border-radius:10px;background:#15803d;color:#fff!important;font-weight:600;text-decoration:none;text-align:center;line-height:1.2}.tm-wa:hover{background:#166534}.tm-wz .sa-gs{flex:1 1 100%;min-height:0!important;font-size:13.5px;line-height:1.4}'
    + '.tm-sperre{border-left-style:dashed!important;cursor:default}.tm-sperre .tm-zn b{font-weight:600;color:var(--ink-2)}.tm-sperre .tm-zs{color:var(--ink-3)}'
    + '.tm-sk{border-left-color:#b07d0c!important;cursor:default}.tm-sk-tel{align-self:center;font-family:var(--fm);font-size:13px;color:var(--accent);white-space:nowrap}'
    /* Handy: Name nie zusammendrücken. Knöpfe rutschen in eine eigene, volle Zeile darunter. */
    + '.tm-z{flex-wrap:wrap}.tm-zn{flex:1 1 160px;overflow-wrap:break-word;word-break:normal}.tm-zn b,.tm-zn span{white-space:normal}'
    + '@media(max-width:700px){'
    + '.tm-z{gap:6px 12px;padding:14px 14px 14px 12px}'
    + '.tm-zt{font-size:20px;font-weight:700;flex:0 0 auto}'
    + '.tm-zn{flex:1 1 0;min-width:0}.tm-zn b{font-size:17px}.tm-ma{font-size:14px}.tm-notiz{font-size:13.5px}'
    + '.tm-zk{flex:1 1 100%;display:flex;gap:8px;margin:6px 0 0}.tm-zk>*{flex:1 1 0;min-width:0;min-height:52px;font-size:16px;white-space:normal;line-height:1.15;padding-left:8px;padding-right:8px}'
    + '.tm-zs{flex:0 0 auto;align-self:flex-start}'
    + '.kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px}.kpi .v{font-size:28px}'
    + '}';
  document.head.appendChild(c);
})();
