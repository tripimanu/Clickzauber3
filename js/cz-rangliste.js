/* clickzauber · Rangliste nach Vertrauenspunkten (sql/44, /api/netz?was=rangliste)
   Filter: Gebiet (eigenes PLZ-Gebiet, Deutschland, Österreich, Schweiz, alle drei) und Branche.
   Platz 1 bis 3 als Podest, darunter Top 10, Top 50 und Top 100. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function zahl(n) { return Number(n || 0).toLocaleString('de-DE'); }
  var AZ = window.czAbzeichen;
  var LAND = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' };
  var BR0 = { hochzeit: 'Hochzeitslocation', foodtruck: 'Food Truck', catering: 'Catering', foto: 'Foto & Video', floristik: 'Floristik', deko: 'Dekoration & Verleih', musik: 'Musik & DJ', konditorei: 'Konditorei & Torten', planung: 'Hochzeitsplanung', friseur: 'Friseur & Styling', tagung: 'Tagungshaus', sonstige: 'Sonstiges' };
  var F = { gebiet: 'region', branche: '' };
  var KRONE = '<svg class="rg-kr" viewBox="0 0 24 24" width="15" height="15" aria-label="Monatssieger"><title>Monatssieger im PLZ-Gebiet</title><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z" fill="#e0b23a" stroke="#8a6410" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  var KRONE_DEMO = { 'd-glut': 1, x8: 1, x17: 1, x23: 1 };
  try { var g0 = JSON.parse(localStorage.getItem('cz_rang_filter') || 'null'); if (g0) { F.gebiet = g0.gebiet || 'region'; F.branche = g0.branche || ''; } } catch (e) {}

  var css = ''
    + '.rg-filter{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 18px}'
    + '.rg-seg{display:flex;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:4px;flex-wrap:wrap}'
    + '.rg-seg button{background:none;border:none;color:var(--ink-2);font-family:var(--fd);font-size:13.5px;font-weight:500;padding:8px 13px;border-radius:8px;cursor:pointer;min-height:40px;white-space:nowrap}'
    + '.rg-seg button:hover{color:var(--ink)}.rg-seg button.on{background:var(--panel-2);color:var(--ink);font-weight:600}'
    + '.rg-filter select{min-height:48px;border-radius:11px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-family:var(--fd);font-size:13.5px;padding:0 12px}'
    + '.rg-ich{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;margin-bottom:18px}'
    + '.rg-ich .pl{font-size:40px;font-weight:700;letter-spacing:-.04em;line-height:1}.rg-ich .pl small{font-size:14px;font-weight:500;color:var(--ink-3);letter-spacing:0;margin-left:6px}'
    + '.rg-ich .tx{display:flex;flex-direction:column;gap:5px;min-width:0}.rg-ich .tx p{margin:0;font-size:13.5px;color:var(--ink-2);text-wrap:pretty}'
    + '.rg-band{display:inline-flex;align-self:flex-start;font-family:var(--fm);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 10px;background:var(--panel-2);border:1px solid var(--line);color:var(--ink-2);white-space:nowrap}'
    + '.rg-band.p1{background:#fbeebb;border-color:#e8c95a;color:#6b4e0c}.rg-band.p10{background:color-mix(in srgb,var(--accent) 14%,var(--panel));border-color:color-mix(in srgb,var(--accent) 40%,transparent);color:var(--ink)}'
    + '.rg-ich .pk{text-align:right}.rg-ich .pk b{display:block;font-size:22px;letter-spacing:-.02em}.rg-ich .pk span{display:block;font-size:12.5px;color:var(--ink-3)}'
    + '.rg-hin{margin:0 0 18px;font-size:13.5px;color:var(--ink-2);background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:12px 14px}'
    + '.rg-pod{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:end;margin-bottom:22px}'
    + '.rg-p{position:relative;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 14px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;cursor:pointer;font:inherit;color:inherit;min-width:0}'
    + '.rg-p:hover{border-color:var(--accent)}.rg-p.ich{box-shadow:0 0 0 2px var(--accent)}'
    + '.rg-p.p1{padding-top:26px;background:linear-gradient(180deg,#fdf3cf 0,var(--card) 55%)}.rg-p.p2{background:linear-gradient(180deg,#eef1f4 0,var(--card) 55%)}.rg-p.p3{background:linear-gradient(180deg,#f7e3d2 0,var(--card) 55%)}'
    + '.rg-med{position:absolute;top:-13px;left:50%;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#fff;box-shadow:0 3px 8px rgba(0,0,0,.18)}'
    + '.p1 .rg-med{background:linear-gradient(135deg,#f6d670,#b3831c)}.p2 .rg-med{background:linear-gradient(135deg,#dfe4e8,#8e98a1)}.p3 .rg-med{background:linear-gradient(135deg,#e7a86a,#9a5f2c)}'
    + '.rg-p b{font-size:15px;line-height:1.25;overflow-wrap:anywhere}.rg-p .tx{display:flex;flex-direction:column;gap:3px;align-items:inherit;min-width:0}.rg-p .m{font-size:12.5px;color:var(--ink-3)}.rg-p .pk{font-family:var(--fm);font-size:13px;color:var(--ink)}'
    + '.rg-abschnitt{margin-top:16px}.rg-abschnitt h3{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin:0 0 8px;font-size:15px}.rg-abschnitt h3 small{font-weight:400;font-size:12.5px;color:var(--ink-3)}'
    + '.rg-abschnitt summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;font-size:15px;font-weight:600;padding:10px 0;min-height:44px}.rg-abschnitt summary::-webkit-details-marker{display:none}'
    + '.rg-abschnitt summary::after{content:"";width:8px;height:8px;border-right:2px solid var(--ink-3);border-bottom:2px solid var(--ink-3);transform:rotate(45deg);margin-left:4px;align-self:center}.rg-abschnitt[open] summary::after{transform:rotate(-135deg)}'
    + '.rg-abschnitt summary small{font-weight:400;font-size:12.5px;color:var(--ink-3)}'
    + '.rg-liste{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}'
    + '.rg-z{display:grid;grid-template-columns:44px 36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 14px;border:none;border-top:1px solid var(--line);background:none;font:inherit;color:inherit;text-align:left;width:100%;min-height:54px}'
    + '.rg-z:first-child{border-top:none}button.rg-z{cursor:pointer}button.rg-z:hover{background:var(--panel-2)}'
    + '.rg-z.ich{background:color-mix(in srgb,var(--accent) 10%,var(--card))}.rg-z .n{font-family:var(--fm);font-size:13px;color:var(--ink-3)}'
    + '.rg-z .tx{min-width:0}.rg-z .tx b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rg-z .tx span{display:block;font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.rg-z .pk{font-family:var(--fm);font-size:13px}'
    + '.rg-kr{vertical-align:-2px;margin-left:2px}'
    + '.rg-fuss{margin:22px 0 0;font-size:12.5px;color:var(--ink-3);line-height:1.6;max-width:72ch;text-wrap:pretty}'
    + '@media(max-width:760px){.rg-pod{grid-template-columns:1fr}.rg-p{flex-direction:row;text-align:left;padding:14px;gap:12px}.rg-p.p1{padding-top:14px}.rg-p .tx{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.rg-med{position:static;transform:none;flex:0 0 auto}.rg-ich{grid-template-columns:auto minmax(0,1fr)}.rg-ich .pk{grid-column:1/-1;text-align:left}}';
  var st = document.createElement('style'); st.id = 'cz-rangliste-css'; st.textContent = css; document.head.appendChild(st);

  /* ── Beispiel-Modus: erfundene Betriebe ─────────────── */
  var DEMO = [
    ['d-glut', 'Glutwerk', 'foodtruck', 'Ravensburg', '88212', 'DE', 4820], ['d-blueten', 'Blütenwerk', 'floristik', 'Meersburg', '88709', 'DE', 1460],
    ['d-licht', 'Lichtmoment', 'foto', 'Konstanz', '78462', 'DE', 7340], ['d-pasta', 'Pasta Rossa', 'foodtruck', 'Friedrichshafen', '88045', 'DE', 380],
    ['d-tafel', 'Tafelrunde Catering', 'catering', 'Friedrichshafen', '88046', 'DE', 720], ['d-zucker', 'Zuckerwerk Torten', 'konditorei', 'Überlingen', '88662', 'DE', 190],
    ['d-klang', 'Klangraum DJs', 'musik', 'Lindau', '88131', 'DE', 64], ['d-crepes', 'Seeglück Crepes', 'foodtruck', 'Lindau', '88131', 'DE', 310],
    ['x1', 'Schloss Seeblick', 'hochzeit', 'Überlingen', '88662', 'DE', 10480], ['x2', 'Hofgut Linde', 'hochzeit', 'Tettnang', '88069', 'DE', 2890],
    ['x3', 'Haarwerk Lindau', 'friseur', 'Lindau', '88131', 'DE', 2310], ['x4', 'Salon Seegold', 'friseur', 'Friedrichshafen', '88045', 'DE', 960],
    ['x5', 'Kaffeeküche Mobil', 'foodtruck', 'Markdorf', '88677', 'DE', 140],
    ['x6', 'Gut Sonnenhof', 'hochzeit', 'Bad Tölz', '83646', 'DE', 5210], ['x7', 'Eventscheune Allgäu', 'hochzeit', 'Kempten', '87435', 'DE', 3920],
    ['x8', 'Barbershop Nord', 'friseur', 'Hamburg', '20095', 'DE', 8150], ['x9', 'Rauchzeichen BBQ', 'foodtruck', 'Köln', '50667', 'DE', 2640],
    ['x10', 'Villa Weinberg', 'hochzeit', 'Stuttgart', '70173', 'DE', 1880], ['x11', 'Tagungshaus am Wald', 'tagung', 'Freiburg', '79098', 'DE', 1320],
    ['x12', 'Studio Lichtblick', 'foto', 'München', '80331', 'DE', 1150], ['x13', 'Florentina Blumen', 'floristik', 'Augsburg', '86150', 'DE', 870],
    ['x14', 'DJ Nachtfalter', 'musik', 'Ulm', '89073', 'DE', 540], ['x15', 'Torte & Tüll', 'konditorei', 'Nürnberg', '90402', 'DE', 410],
    ['x16', 'Kiez Catering', 'catering', 'Berlin', '10115', 'DE', 3010],
    ['x17', 'Schlossgut Wachau', 'hochzeit', 'Krems', '3500', 'AT', 6480], ['x18', 'Friseur Kopfsache', 'friseur', 'Wien', '1070', 'AT', 4410],
    ['x19', 'Almhof Tirol', 'hochzeit', 'Kitzbühel', '6370', 'AT', 2750], ['x20', 'Käsespätzle Mobil', 'foodtruck', 'Bregenz', '6900', 'AT', 980],
    ['x21', 'Blütenzauber Salzburg', 'floristik', 'Salzburg', '5020', 'AT', 620], ['x22', 'Seminarhof Kärnten', 'tagung', 'Velden', '9220', 'AT', 1570],
    ['x23', 'Seehotel Uferlicht', 'hochzeit', 'Luzern', '6004', 'CH', 7920], ['x24', 'Coiffure Lara', 'friseur', 'Zürich', '8001', 'CH', 3380],
    ['x25', 'Alpenbühne Events', 'hochzeit', 'Interlaken', '3800', 'CH', 2210], ['x26', 'Raclette Rolli', 'foodtruck', 'Bern', '3011', 'CH', 1390],
    ['x27', 'Fotografie Bergblick', 'foto', 'St. Gallen', '9000', 'CH', 760], ['x28', 'Tafelglück Catering', 'catering', 'Basel', '4051', 'CH', 590]
  ];
  function demoAntwort(gebiet, branche, eigene) {
    var ich = { id: 'd-seerose', name: 'Gut Seerose', branche: 'hochzeit', ort: 'Meersburg', plz: '88709', land: 'DE', punkte: eigene };
    var alle = DEMO.map(function (x) { return { id: x[0], name: x[1], branche: x[2], ort: x[3], plz: x[4], land: x[5], punkte: x[6] }; }).concat([ich]);
    var drin = alle.filter(function (x) {
      if (gebiet === 'region' && !(x.land === 'DE' && x.plz.indexOf('88') === 0)) return false;
      if (LAND[gebiet] && x.land !== gebiet) return false;
      return !branche || x.branche === branche;
    }).sort(function (a, b) { return b.punkte - a.punkte || (a.name < b.name ? -1 : 1); });
    var liste = drin.slice(0, 100).map(function (x) {
      return { id: x.id, platz: 1 + drin.filter(function (y) { return y.punkte > x.punkte; }).length, punkte: x.punkte, stufe: AZ.stufeVon(x.punkte), name: x.name, branche: x.branche, branche_text: BR0[x.branche], ort: x.ort, land: x.land, ich: x.id === 'd-seerose', krone: !!KRONE_DEMO[x.id] };
    });
    return { ok: true, demo: true, gebiet: gebiet, branche: branche, branchen: BR0, region: '88', land: 'DE', liste: liste,
      ich: { punkte: eigene, stufe: AZ.stufeVon(eigene), platz: 1 + drin.filter(function (y) { return y.punkte > eigene; }).length, gesamt: drin.length, profil: true, drin: true } };
  }
  function eigenePunkte() { return window.czVertrauenPunkte ? window.czVertrauenPunkte() : 0; }
  window.czRangKurz = function (p) {
    if (window.token !== 'demo') return '';
    var j = demoAntwort('region', '', p);
    return 'Platz ' + j.ich.platz + ' im PLZ-Gebiet 88';
  };

  /* ── Laden und Zeichnen ─────────────────────────────── */
  var LETZTE = null, NR = 0;
  function laden() {
    var el = $('rang-inhalt'); if (!el) return;
    if (!LETZTE) el.innerHTML = '<p class="muted">Lade …</p>';
    var nr = ++NR;
    var p = window.token === 'demo' ? Promise.resolve(demoAntwort(F.gebiet, F.branche, eigenePunkte()))
      : window.czNetzGet ? window.czNetzGet('rangliste', { gebiet: F.gebiet, branche: F.branche }) : Promise.resolve({ ok: false });
    p.then(function (j) { if (nr !== NR) return; LETZTE = j; zeichnen(j); });
  }
  function gebietName(j, g) {
    if (g === 'region') return j.region ? 'PLZ-Gebiet ' + j.region : 'Meine Region';
    if (g === 'dach') return 'D-A-CH';
    return LAND[g];
  }
  function band(pl) {
    if (!pl) return ['', ''];
    if (pl <= 3) return ['Podest · Platz ' + pl, 'p1'];
    if (pl <= 10) return ['Top 10', 'p10'];
    if (pl <= 50) return ['Top 50', ''];
    if (pl <= 100) return ['Top 100', ''];
    return ['Außerhalb der Top 100', ''];
  }
  function ziel(ich, liste) {
    var p = ich.punkte, pl = ich.platz;
    if (pl === 1) return 'Sie stehen ganz oben.';
    var st = [[100, 'in die Top 100'], [50, 'in die Top 50'], [10, 'in die Top 10'], [3, 'aufs Podest']], w = null;
    st.forEach(function (x) { if (x[0] < pl && liste.length >= x[0]) w = x; });
    if (w) {
      /* Bandgrenze bereits dicht? Dann lieber den nächsten Platz nennen. */
      var g = liste[w[0] - 1].punkte;
      return 'Noch ' + zahl(g - p + 1) + ' Punkte ' + w[1] + '.';
    }
    var ueber = liste.filter(function (x) { return x.punkte > p; }), n = ueber[ueber.length - 1];
    return n ? 'Noch ' + zahl(n.punkte - p + 1) + ' Punkte bis Platz ' + n.platz + '.' : '';
  }
  function klickbar(x) { return window.token !== 'demo' || /^d-/.test(x.id); }
  function meta(x) { return esc(x.branche_text || '') + (x.ort ? ' · ' + esc(x.ort) : '') + (F.gebiet === 'dach' && x.land ? ' · ' + x.land : ''); }
  function zeile(x) {
    var tag = klickbar(x) && !x.ich ? 'button' : 'div', at = tag === 'button' ? ' data-nz-profil="' + esc(x.id) + '"' : '';
    return '<' + tag + ' class="rg-z' + (x.ich ? ' ich' : '') + '"' + at + '><span class="n">' + x.platz + '.</span>' + AZ.svg(x.stufe, 34, { anim: x.stufe >= 8 }) + '<span class="tx"><b>' + esc(x.name) + (x.krone ? ' ' + KRONE : '') + (x.ich ? ' · Sie' : '') + '</b><span>' + meta(x) + ' · ' + esc(AZ.name(x.stufe)) + '</span></span><span class="pk">' + zahl(x.punkte) + '</span></' + tag + '>';
  }
  function podest(x) {
    if (!x) return '<div></div>';
    var k = 'p' + Math.min(3, x.platz), tag = klickbar(x) && !x.ich ? 'button' : 'div', at = tag === 'button' ? ' data-nz-profil="' + esc(x.id) + '"' : '';
    return '<' + tag + ' class="rg-p ' + k + (x.ich ? ' ich' : '') + '"' + at + '><span class="rg-med">' + x.platz + '</span>' + AZ.svg(x.stufe, x.platz === 1 ? 96 : 76) + '<span class="tx"><b>' + esc(x.name) + (x.krone ? ' ' + KRONE : '') + (x.ich ? ' · Sie' : '') + '</b><span class="m">' + meta(x) + '</span><span class="pk">' + zahl(x.punkte) + ' Punkte · ' + esc(AZ.name(x.stufe)) + '</span></span></' + tag + '>';
  }
  function abschnitt(titel, von, bis, liste, offen) {
    var t = liste.filter(function (x) { return x.platz >= von && x.platz <= bis; });
    if (!t.length) return '';
    var info = 'Plätze ' + t[0].platz + ' bis ' + t[t.length - 1].platz + ' · ' + t.length + ' Betriebe';
    if (offen) return '<div class="rg-abschnitt"><h3>' + titel + ' <small>' + info + '</small></h3><div class="rg-liste">' + t.map(zeile).join('') + '</div></div>';
    var mitMir = t.some(function (x) { return x.ich; });
    return '<details class="rg-abschnitt"' + (mitMir ? ' open' : '') + '><summary>' + titel + ' <small>' + info + '</small></summary><div class="rg-liste">' + t.map(zeile).join('') + '</div></details>';
  }
  function zeichnen(j) {
    var el = $('rang-inhalt'); if (!el) return;
    if (!j || !j.ok) { el.innerHTML = '<div class="rg-hin">' + esc((j && j.error) || 'Die Rangliste ist gerade nicht verfügbar. Bitte später noch einmal versuchen.') + '</div>'; return; }
    var br = j.branchen || BR0, liste = j.liste || [], ich = j.ich || {};
    var h = '<div class="rg-filter"><div class="rg-seg" role="group" aria-label="Gebiet">' + ['region', 'DE', 'AT', 'CH', 'dach'].map(function (g) {
      return '<button data-rang-gebiet="' + g + '"' + (F.gebiet === g ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(gebietName(j, g)) + '</button>';
    }).join('') + '</div><select id="rang-branche" aria-label="Branche"><option value="">Alle Branchen</option>' + Object.keys(br).map(function (k) {
      return '<option value="' + k + '"' + (F.branche === k ? ' selected' : '') + '>' + esc(br[k]) + '</option>';
    }).join('') + '</select></div>';
    var b = band(ich.platz);
    h += '<div class="card rg-ich">' + AZ.svg(ich.stufe, 72) + '<div class="tx"><span class="pl">' + (ich.platz ? 'Platz ' + ich.platz : '–') + '<small>von ' + zahl(Math.max(ich.gesamt || 0, ich.platz || 0)) + ' · ' + esc(gebietName(j, F.gebiet)) + '</small></span>'
      + (b[0] ? '<span class="rg-band ' + b[1] + '">' + esc(b[0]) + '</span>' : '')
      + '<p>' + esc(ziel(ich, liste)) + '</p></div><div class="pk"><b>' + zahl(ich.punkte) + '</b><span>Vertrauenspunkte</span><span>' + esc(AZ.name(ich.stufe)) + '</span></div></div>';
    if (!ich.drin) {
      h += '<div class="rg-hin">' + (ich.profil ? 'Sie erscheinen gerade nicht in der Rangliste. Der Platz oben zeigt, wo Sie stehen würden. Einschalten können Sie das unter <a href="#netzprofil" data-view="netzprofil">Mein Profil</a>.'
        : 'Legen Sie unter <a href="#netzprofil" data-view="netzprofil">Mein Profil</a> ein Profil an, dann erscheinen Sie in der Rangliste. Der Platz oben zeigt, wo Sie stehen würden.') + '</div>';
    }
    if (!liste.length) {
      h += '<div class="rg-hin">In diesem Gebiet hat noch kein Betrieb Vertrauenspunkte gesammelt.' + (F.branche ? ' Versuchen Sie „Alle Branchen“.' : '') + '</div>';
    } else {
      var p = liste.filter(function (x) { return x.platz <= 3; });
      h += '<div class="rg-pod">' + (innerWidth <= 760 ? podest(p[0]) + podest(p[1]) + podest(p[2]) : podest(p[1]) + podest(p[0]) + podest(p[2])) + '</div>';
      /* Gleichstand auf dem Podest: dort stehen nur die ersten drei Einträge. */
      var rest = liste.slice(p.length > 3 ? 3 : p.length);
      h += abschnitt('Top 10', 1, 10, rest, true) + abschnitt('Top 50', 11, 50, rest, false) + abschnitt('Top 100', 51, 100, rest, false);
    }
    h += '<p class="rg-fuss">Vertrauenspunkte gibt es für erfüllte Missionen, 2 je Anfrage und 10 je Abschluss. Jede Gast-Adresse zählt einmal, eigene Adressen zählen nicht. Andere Betriebe sehen Ihre Punkte und Ihren Platz, nicht die Zahl Ihrer Anfragen. Die Krone trägt einen Monat lang, wer im Vormonat im PLZ-Gebiet am meisten dazugewonnen hat. Wer nicht erscheinen möchte, schaltet es unter Mein Profil ab.' + (j.demo ? ' Im Beispiel sind alle Betriebe außer Ihren Kontakten erfunden.' : '') + '</p>';
    el.innerHTML = h;
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if (!t.closest) return;
    if ((x = t.closest('[data-rang-gebiet]'))) { F.gebiet = x.getAttribute('data-rang-gebiet'); merken(); laden(); return; }
    if ((x = t.closest('#rang-inhalt a[data-view]'))) { ev.preventDefault(); window.show(x.getAttribute('data-view')); }
  });
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'rang-branche') { F.branche = ev.target.value; merken(); laden(); } });
  function merken() { try { localStorage.setItem('cz_rang_filter', JSON.stringify(F)); } catch (e) {} }

  var ALT = window.show;
  window.show = function (v) { var r = ALT.apply(this, arguments); if (v === 'rangliste') { var s = document.querySelector('.view[data-v="rangliste"]'); if (s && s.classList.contains('on')) laden(); } return r; };
  var jetzt = document.querySelector('.view.on[data-v="rangliste"]'); if (jetzt) laden();
  window.czRangliste = laden;
})();
