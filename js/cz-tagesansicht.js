/* clickzauber — Ansicht 2 für Termin-Betriebe (Friseur, Kosmetik), seit 13.10.2026.
   Auf der Startseite oben ein Schalter „Ansicht 1 | Ansicht 2“. Ansicht 1 = bisherige Liste (#tm-home).
   Ansicht 2 = Tagesplan: Mitarbeiter nebeneinander, Uhrzeiten im Halbstunden-Takt nach Arbeitszeiten (personal.zeiten).
   Freie Zeit antippen → Termin eintragen (aktion 'eigen'). „Feierabend“ öffnet czSchluss, Sperren mit „Wieder öffnen“ (czSperreAuf).
   Die Wahl merkt sich jedes Gerät (localStorage cz_ansicht). Skizze: NICHT-HOCHLADEN/skizzen-und-vorschlaege/Tagesansicht-Mitarbeiter-nebeneinander.html */
(function () {
  var home = document.getElementById('tm-home'); if (!home) return;
  var API = window.API || 'https://clickzauber-api.vercel.app/api';
  var WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], FARBEN = ['#2f7d59', '#3b6ea8', '#a0522d', '#7a4fa0', '#b07d0c', '#2a8a8a'];
  var CUR_P = [], CUR_S = [];
  var tag = iso(new Date()), SETUP = null, LISTE = [], E = null, ladeNr = 0;
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function plus(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function m(x) { var a = String(x || '0:0').split(':'); return (+a[0]) * 60 + (+a[1] || 0); }
  function z(n) { return ('0' + Math.floor(n / 60)).slice(-2) + ':' + ('0' + (n % 60)).slice(-2); }
  function tok() { return window.token || localStorage.getItem('cz_user_token') || ''; }
  function istTermin() { return document.body.classList.contains('art-termin'); }
  function wahl() { try { return localStorage.getItem('cz_ansicht') === '2' ? 2 : 1; } catch (e) { return 1; } }

  var css = document.createElement('style');
  css.textContent = '#ta-wahl{display:none;gap:4px;padding:4px;border-radius:12px;background:var(--panel-2,#f1ede4);border:1px solid var(--line);width:max-content;max-width:100%;margin:0 0 14px}'
    + 'body.art-termin.ta-ov #ta-wahl{display:flex}body:not(.ta-ov) #ta{display:none!important}#ta-wahl button{min-height:40px;padding:0 16px;border:0;border-radius:9px;background:none;font:inherit;font-size:14px;color:var(--ink-2);cursor:pointer}#ta-wahl button.an{background:var(--card,#fff);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}'
    + 'body.ta-ov.ta-2 #tm-home,body.art-termin.ta-ov.ta-2 #tm-home,body.salon.ta-ov.ta-2 #tm-home,html body.ta-ov.ta-2 div#tm-home{display:none!important}#ta{display:none}body.art-termin.ta-2.ta-ov #ta{display:block}'
    + '.ta-k{background:var(--card,#fff);border:1px solid var(--line);border-radius:16px;overflow:hidden}'
    + '.ta-kopf{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px;border-bottom:1px solid var(--line)}'
    + '.ta-tage{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:1 1 260px;min-width:0}.ta-tage::-webkit-scrollbar{display:none}'
    + '.ta-tag{flex:none;min-height:40px;padding:0 13px;border-radius:999px;border:1.5px solid var(--line);background:none;font:inherit;font-size:13.5px;color:var(--ink);cursor:pointer;white-space:nowrap}.ta-tag.an{background:var(--ink);border-color:var(--ink);color:var(--card,#fff)}'
    + '.ta-fa{flex:none;min-height:40px;padding:0 14px;border-radius:10px;border:1.5px solid var(--ink);background:none;color:var(--ink);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}'
    + '.ta-box{overflow:auto;max-height:70vh;max-height:70dvh;position:relative}'
    + '.ta-mk{position:sticky;top:0;z-index:3;display:grid;gap:4px;padding:8px 10px;background:var(--card,#fff);border-bottom:1px solid var(--line)}'
    + '.ta-mk>div{min-width:0;text-align:center;font-weight:600;font-size:14px;line-height:1.2;overflow-wrap:anywhere;color:var(--ma)}.ta-mk small{display:block;font-weight:400;font-size:12px;color:var(--ink-2);margin-top:2px}'
    + '.ta-auf{margin-top:6px;width:100%;min-height:36px;border-radius:8px;border:1.5px solid var(--accent);background:none;color:var(--accent);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:normal;line-height:1.15}'
    + '.ta-r{display:grid;column-gap:4px;row-gap:0;padding:8px 10px 14px}.ta-r>*{margin:2px 0}'
    + '.ta-b.k{padding:2px 6px;justify-content:center}.ta-b.k span{display:none}.ta-frei.k{font-size:12px}'
    + '.ta-uz{font-size:12px;color:var(--ink-2);text-align:right;padding:2px 4px 0 0;font-variant-numeric:tabular-nums}.ta-uz.h{opacity:.55}'
    + '.ta-frei{min-width:0;padding:0;border:1.5px dashed color-mix(in srgb,var(--accent) 40%,transparent);background:none;border-radius:10px;color:var(--accent);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;font-variant-numeric:tabular-nums}.ta-frei:hover{background:color-mix(in srgb,var(--accent) 9%,transparent);border-style:solid}'
    + '.ta-frei.ta-dim{border-color:var(--line);color:var(--ink-3)}'
    + '.ta-weg{min-width:0;border-radius:10px;border:1px solid var(--line);color:var(--ink-3);font-size:11.5px;display:flex;align-items:center;justify-content:center;overflow:hidden}'
    + '.ta-sp{min-width:0;border-radius:10px;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--ink) 9%,transparent) 0 6px,transparent 6px 12px);color:var(--ink-3);font-size:11.5px;display:flex;align-items:center;justify-content:center;overflow:hidden}'
    + '.ta-b{min-width:0;border:0;font:inherit;text-align:left;cursor:pointer;border-radius:10px;background:var(--ma);color:#fff;padding:5px 7px;font-size:12px;line-height:1.25;overflow:hidden;display:flex;flex-direction:column;gap:1px}.ta-b.w{background:color-mix(in srgb,var(--ma) 55%,#fff);color:#1f1d1a}'
    + '.ta-b b,.ta-b span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ta-b b{font-size:12.5px}'
    + '.ta-b{touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.ta-b.ta-zieht{opacity:.35}.ta-geist{position:fixed;z-index:400;pointer-events:none;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);opacity:.92;transform:scale(1.04)}.ta-frei.ta-ziel{background:var(--accent);color:#fff;border-style:solid}'
    + '.ta-info{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:350;width:min(460px,calc(100% - 24px));background:var(--card,#fff);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:14px 44px 14px 16px;display:flex;flex-direction:column;gap:10px}.ta-info b{font-size:15px}.ta-info p{margin:0;font-size:13.5px;color:var(--ink-2)}.ta-info .ta-x{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;background:none;font-size:20px;line-height:1;color:var(--ink-2);cursor:pointer;border-radius:8px}.ta-info .ta-wa{display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:12px;background:#15803d;color:#fff;font-weight:600;text-decoration:none}.ta-info .ta-ja{display:flex;gap:8px}.ta-info .ta-ja button{flex:1;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:none;font:inherit;font-size:14px;color:var(--ink);cursor:pointer}.ta-info .ta-ja button.j{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}.ta-info[hidden]{display:none}'
    + '.ta-zbox{position:fixed;z-index:390;pointer-events:none;border:2.5px solid var(--accent);border-radius:10px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);font-size:12px;font-weight:700;padding:4px 6px;box-sizing:border-box}.ta-zbox.nein{border-color:#b42318;background:rgba(180,35,24,.1);color:#b42318}.ta-zbox[hidden]{display:none}'
    + '.ta-leer{padding:28px 16px;text-align:center;color:var(--ink-2)}'
    + '.ta-bg{position:fixed;inset:0;z-index:300;background:rgba(20,18,12,.4);display:flex;align-items:flex-end;justify-content:center}.ta-bg[hidden]{display:none}'
    + '.ta-bl{width:100%;max-width:520px;background:var(--card,#fff);color:var(--ink);border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:14px;max-height:90vh;overflow-y:auto}'
    + '@media(min-width:700px){.ta-bg{align-items:center}.ta-bl{border-radius:20px}}'
    + '.ta-bl h3{margin:0;font-size:18px}.ta-bl .u{margin:-10px 0 0;color:var(--ink-2);font-size:14px}'
    + '.ta-ws{display:flex;flex-wrap:wrap;gap:8px}.ta-c{min-height:44px;padding:6px 14px;border-radius:12px;border:1.5px solid var(--line);background:none;font:inherit;font-size:14px;color:var(--ink);cursor:pointer;text-align:left;max-width:100%;overflow-wrap:anywhere}.ta-c small{display:block;font-size:12px;color:var(--ink-2)}.ta-c.an{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);font-weight:600}.ta-c:disabled{opacity:.45;cursor:default}'
    + '.ta-f{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--ink-2)}.ta-f input{font:inherit;font-size:16px;min-height:46px;border:1.5px solid var(--line);border-radius:10px;padding:0 12px;color:var(--ink);background:var(--card,#fff)}'
    + '.ta-z{display:flex;gap:10px}.ta-go{flex:1;min-height:48px;border-radius:12px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer}.ta-go:disabled{opacity:.5}.ta-ab{min-height:48px;padding:0 16px;border-radius:12px;border:1.5px solid var(--line);background:none;font:inherit;font-size:15px;color:var(--ink);cursor:pointer}.ta-m{margin:0;font-size:13.5px;color:var(--ink-2)}.ta-m.bad{color:#b42318}';
  document.head.appendChild(css);

  var w = document.createElement('div'); w.id = 'ta-wahl'; w.setAttribute('role', 'tablist');
  w.innerHTML = '<button type="button" data-ta="1">Ansicht 1</button><button type="button" data-ta="2">Ansicht 2</button>';
  var box = document.createElement('div'); box.id = 'ta';
  home.parentNode.insertBefore(w, home); home.parentNode.insertBefore(box, home.nextSibling);
  var bg = document.createElement('div'); bg.className = 'ta-bg'; bg.hidden = true; bg.innerHTML = '<div class="ta-bl" role="dialog" aria-modal="true"></div>'; document.body.appendChild(bg);

  function setzen(n) {
    try { localStorage.setItem('cz_ansicht', String(n)); } catch (e) {}
    document.body.classList.toggle('ta-2', n === 2);
    [].forEach.call(w.children, function (b) { b.classList.toggle('an', +b.getAttribute('data-ta') === n); b.setAttribute('aria-selected', +b.getAttribute('data-ta') === n ? 'true' : 'false'); });
    if (n === 2) laden(true);
  }
  /* Ansicht 2 gibt es nur auf der Startseite („Heute“). Unter Anfragen, Kalender usw. gibt es keinen Schalter. */
  function ov(v) { var on = (v || ((document.querySelector('.view.on') || {}).getAttribute || function () { return ''; }).call(document.querySelector('.view.on'), 'data-v')) === 'overview'; document.body.classList.toggle('ta-ov', on); if (on && wahl() === 2) laden(); }
  var altShow = window.show; if (altShow) window.show = function (v) { altShow.apply(this, arguments); ov(v); };
  ov();
  w.addEventListener('click', function (ev) { var b = ev.target.closest('[data-ta]'); if (b) setzen(+b.getAttribute('data-ta')); });

  /* Beispiel-Cockpit (?demo=1, Test-Cockpit): Ansicht 2 mit Beispieldaten, Eintragen und Absagen nur im Browser. */
  var DEMO = /[?&]demo=1/.test(location.search) || tok() === 'demo';
  var DEMO_L = null;
  function demoSetup() {
    var z = {}; [1, 2, 3, 4, 5].forEach(function (d) { z[d] = [['09:00', '18:00']]; }); z[6] = [['09:00', '14:00']];
    var L = null; try { var b = window.DEMO_BRANCHE || window.CZ_DEMO || {}; L = (b.leistungen || b.termin_leistungen || null); } catch (e) {}
    if (!Array.isArray(L) || !L.length) L = [{ name: 'Haarschnitt', dauer: 30, preis: 25 }, { name: 'Haare & Bart', dauer: 60, preis: 35 }, { name: 'Bart trimmen', dauer: 20, preis: 15 }, { name: 'Kinderschnitt', dauer: 30, preis: 18 }];
    return { personal: [{ id: 'd1', name: 'Chef', zeiten: z }, { id: 'd2', name: 'Mitarbeiter 1', zeiten: z }], setup: { leistungen: L } };
  }
  function demoListe() {
    if (DEMO_L && DEMO_L.tag === tag) return DEMO_L.l;
    var wd = new Date(tag + 'T12:00:00').getDay(), l = [];
    if (wd !== 0) {
      var x = function (pid, pn, zeit, dauer, name, leistung, status) { l.push({ id: 'b' + l.length + tag, personal_id: pid, personal_name: pn, datum: tag, zeit: zeit, dauer: dauer, name: name, leistung: leistung, status: status || 'fest' }); };
      x('d1', 'Chef', '09:30', 30, 'Jonas K.', 'Haarschnitt'); x('d1', 'Chef', '11:00', 60, 'Murat B.', 'Haare & Bart'); x('d1', 'Chef', '14:00', 30, 'Leon S.', 'Haarschnitt', 'wunsch');
      x('d2', 'Mitarbeiter 1', '10:00', 30, 'David R.', 'Haarschnitt'); x('d2', 'Mitarbeiter 1', '12:30', 60, 'Ali T.', 'Haare & Bart');
    }
    DEMO_L = { tag: tag, l: l }; return l;
  }
  function laden(mitSetup) {
    if (!istTermin() || wahl() !== 2) return;
    var t = tok(), nr = ++ladeNr;
    if (!box.innerHTML) box.innerHTML = '<div class="ta-k"><p class="ta-leer">Tagesplan wird geladen …</p></div>';
    var q = API + '/termine?token=' + encodeURIComponent(t) + '&aktion=';
    Promise.all([(SETUP && !mitSetup) ? Promise.resolve(SETUP) : fetch(q + 'setup').then(function (r) { return r.json(); }), fetch(q + 'liste&von=' + tag + '&bis=' + tag).then(function (r) { return r.json(); })]).then(function (r) {
      if (nr !== ladeNr) return;
      if (r[0] && r[0].ok !== false) SETUP = r[0];
      /* Nur dieser Tag (das Beispiel-Cockpit liefert alle Tage auf einmal). */
      LISTE = ((r[1] && r[1].termine) || []).filter(function (x) { return !x.datum || x.datum === tag; });
      zeichnen();
    }).catch(function () { if (nr === ladeNr) box.innerHTML = '<div class="ta-k"><p class="ta-leer">Der Tagesplan konnte gerade nicht geladen werden.</p></div>'; });
  }

  function team() { return ((SETUP && SETUP.personal) || []).filter(function (p) { return p && p.id && p.aktiv !== false; }); }
  function zeitenAm(p) { var wd = new Date(tag + 'T12:00:00').getDay(), zz = p.zeiten || {}, iv = zz[wd] || zz[String(wd)] || []; return Array.isArray(iv) ? iv.filter(function (x) { return Array.isArray(x) && x[0] < x[1]; }) : []; }
  function arbeitet(p, n) { return zeitenAm(p).some(function (x) { return n >= m(x[0]) && n + 30 <= m(x[1]) + 0; }); }
  function aktiv(t) { return t.status === 'fest' || t.status === 'wunsch' || t.status === 'vorschlag'; }
  function istSp(t) { return t.eigen && t.leistung === 'Gesperrt'; }
  function von(t) { return t.zeit ? m(t.zeit) : m(new Date(t.start).toTimeString().slice(0, 5)); }
  function bis(t) { return von(t) + (+t.dauer || Math.round((new Date(t.ende) - new Date(t.start)) / 60000) || 30); }
  function wer(t) { var P = team(); return t.personal_id && P.some(function (p) { return p.id === t.personal_id; }) ? t.personal_id : (P[0] && P[0].id); }
  /* Seit 20.10.2026: Raster in 5-Minuten-Zeilen (6 je halbe Stunde). Vorher in Halbstunden: Ein Termin, der nicht zur vollen oder halben
     Stunde anfing (z. B. 10:15 nach „Dauert länger +15“ beim Termin davor), fiel in dieselbe Zelle wie der vorige und wurde nie gezeichnet. */
  var R = 6;
  function belegt(p, s, e, ohne) { return LISTE.some(function (t) { return t !== ohne && wer(t) === p.id && aktiv(t) && von(t) < e && bis(t) > s; }); }

  function zeichnen() {
    var P = team(), heute = iso(new Date()), jetzt = new Date().getHours() * 60 + new Date().getMinutes();
    var tage = ''; for (var i = 0; i < 14; i++) { var d = plus(heute, i), dd = new Date(d + 'T12:00:00'); tage += '<button type="button" class="ta-tag' + (d === tag ? ' an' : '') + '" data-tag="' + d + '">' + (i === 0 ? 'Heute' : i === 1 ? 'Morgen' : WT[dd.getDay()] + ' ' + dd.getDate() + '.' + (dd.getMonth() + 1) + '.') + '</button>'; }
    var kopf = '<div class="ta-kopf"><div class="ta-tage">' + tage + '</div><button type="button" class="ta-fa" data-fa>Feierabend</button></div>';
    if (!P.length) { box.innerHTML = '<div class="ta-k">' + kopf + '<p class="ta-leer">Noch keine Mitarbeiter angelegt.</p></div>'; return; }
    var a = 1440, e = 0; P.forEach(function (p) { zeitenAm(p).forEach(function (x) { a = Math.min(a, m(x[0])); e = Math.max(e, m(x[1])); }); });
    LISTE.forEach(function (t) { if (aktiv(t) && !istSp(t)) { a = Math.min(a, Math.floor(von(t) / 30) * 30); e = Math.max(e, Math.ceil(bis(t) / 30) * 30); } });
    var ruhetag = a >= e; if (ruhetag) { a = 540; e = 1080; }
    a = Math.floor(a / 30) * 30;
    var S = []; for (var n = a; n < e; n += 30) S.push(n);
    var cols = '44px repeat(' + P.length + ',minmax(' + (P.length > 3 ? '84px' : '0') + ',1fr))';
    var mk = '<div></div>' + P.map(function (p, i) {
      var sp = LISTE.filter(function (t) { return t.personal_id === p.id && istSp(t) && t.status === 'fest'; }), anz = LISTE.filter(function (t) { return t.personal_id === p.id && aktiv(t) && !istSp(t); }).length;
      var info = sp.length ? (sp.some(function (t) { return t.name === 'Frei'; }) ? 'Ganzer Tag frei' : 'Feierabend ab ' + z(Math.min.apply(null, sp.map(von)))) : anz + ' Termin' + (anz === 1 ? '' : 'e');
      return '<div style="--ma:' + FARBEN[i % FARBEN.length] + '">' + esc(p.name) + '<small>' + esc(info) + '</small>' + (sp.length ? '<button type="button" class="ta-auf" data-auf="' + esc(sp.map(function (t) { return t.id; }).join(',')) + '">Wieder öffnen</button>' : '') + '</div>';
    }).join('');
    var h = '', zr = function (x) { return Math.round((x - a) / 5) + 1; };
    S.forEach(function (n, r) { h += '<div class="ta-uz' + (n % 60 ? ' h' : '') + '" data-n="' + n + '" style="grid-row:' + (r * R + 1) + ' / span ' + R + ';grid-column:1">' + z(n) + '</div>'; });
    P.forEach(function (p, i) {
      var col = i + 2, farbe = FARBEN[i % FARBEN.length];
      var T = LISTE.filter(function (t) { return wer(t) === p.id && aktiv(t) && !istSp(t); }).sort(function (x, y) { return von(x) - von(y); });
      /* Überschneiden sich Termine (Doppelbuchung von Hand), stehen sie nebeneinander statt übereinander. */
      var alle = [], grp = [], spuren = [], gEnde = -1;
      var schluss = function () { var nL = 0; grp.forEach(function (g) { nL = Math.max(nL, g.l + 1); }); grp.forEach(function (g) { g.n = nL; }); grp = []; spuren = []; };
      T.forEach(function (t) { if (von(t) >= gEnde) schluss(); var l = 0; while (spuren[l] > von(t)) l++; spuren[l] = bis(t); var o = { t: t, l: l }; grp.push(o); alle.push(o); gEnde = Math.max(gEnde, bis(t)); });
      schluss();
      alle.forEach(function (o) {
        var b = o.t, s = Math.max(von(b), a), e2 = Math.min(bis(b), e); if (e2 <= s) return;
        var sp = Math.max(1, Math.round((e2 - s) / 5)), kurz = sp < 5;
        var neben = o.n > 1 ? ';justify-self:start;width:calc((100% - ' + (o.n - 1) * 3 + 'px) / ' + o.n + ');margin-left:calc((100% + 3px) / ' + o.n + ' * ' + o.l + ')' : '';
        h += '<button type="button" data-tb="' + esc(b.id) + '" class="ta-b' + (b.status === 'fest' ? '' : ' w') + (kurz ? ' k' : '') + '" style="--ma:' + farbe + ';grid-row:' + zr(s) + ' / span ' + sp + ';grid-column:' + col + neben + '" title="' + esc((b.name || 'Termin') + ' · ' + z(von(b)) + '–' + z(bis(b))) + '"><b>' + esc(b.name || 'Termin') + '</b><span>' + esc(b.leistung || '') + '</span>' + (sp >= R + 3 ? '<span>' + z(von(b)) + '–' + z(bis(b)) + '</span>' : '') + (b.status === 'fest' ? '' : '<span>offen</span>') + '</button>';
      });
      S.forEach(function (n, r) {
        var bel = LISTE.filter(function (t) { return wer(t) === p.id && aktiv(t) && von(t) < n + 30 && bis(t) > n; });
        var knopf = function (s, len) { var dim = !arbeitet(p, s) || (tag === heute && s + len <= jetzt); h += '<button type="button" class="ta-frei' + (dim ? ' ta-dim' : '') + (len < 30 ? ' k' : '') + '" data-p="' + esc(p.id) + '" data-n="' + s + '" style="grid-row:' + zr(s) + ' / span ' + Math.round(len / 5) + ';grid-column:' + col + '" aria-label="' + z(s) + ' bei ' + esc(p.name) + ' frei">' + z(s) + '</button>'; };
        if (!bel.length) { knopf(n, 30); return; }
        if (bel.every(istSp)) { h += '<div class="ta-sp" style="grid-row:' + (r * R + 1) + ' / span ' + R + ';grid-column:' + col + '">gesperrt</div>'; return; }
        /* Halb belegte halbe Stunde: freie Reste ab 15 Minuten zum Antippen. */
        var c = n; bel.map(function (t) { return [Math.max(von(t), n), Math.min(bis(t), n + 30)]; }).sort(function (x, y) { return x[0] - y[0]; }).forEach(function (iv) { if (iv[0] - c >= 15) knopf(c, iv[0] - c); c = Math.max(c, iv[1]); });
        if (n + 30 - c >= 15) knopf(c, n + 30 - c);
      });
    });
    CUR_P = P; CUR_S = S;
    box.innerHTML = '<div class="ta-k">' + kopf + (ruhetag ? '<p class="ta-m" style="padding:10px 12px 0">An diesem Tag arbeitet laut Arbeitszeiten niemand. Eintragen geht trotzdem, etwa für einen Sondertermin.</p>' : '') + '<div class="ta-box"><div class="ta-mk" style="grid-template-columns:' + cols + '">' + mk + '</div><div class="ta-r" style="grid-template-columns:' + cols + ';grid-template-rows:repeat(' + S.length * R + ',8px)">' + h + '</div></div></div>';
    var an = box.querySelector('.ta-tag.an'); if (an && an.parentNode) an.parentNode.scrollLeft = an.offsetLeft - 12;
  }

  function frei(p, n, d) { return !belegt(p, n, n + d); }
  function demoTermin(t) {
    E = { t: t };
    blatt('<h3>' + esc(t.name) + '</h3><p class="u">' + esc(t.zeit) + '–' + z(m(t.zeit) + (+t.dauer || 30)) + ' Uhr · ' + esc(t.leistung || '') + ' · bei ' + esc(t.personal_name) + '</p>'
      + '<p class="ta-m">Im echten Cockpit öffnet sich hier das bekannte Termin-Fenster mit ' + (t.status === 'fest' ? '' : 'Annehmen, ') + 'Verschieben, Absagen und WhatsApp.</p>'
      + '<div class="ta-z"><button type="button" class="ta-ab" data-zu>Schließen</button><button type="button" class="ta-go" data-demo-ab="' + esc(t.id) + '">Absagen (Beispiel)</button></div>');
  }
  function blatt(html) { bg.firstChild.innerHTML = html; bg.hidden = false; }
  function zu() { bg.hidden = true; E = null; }
  function eintragen(pid, n) {
    var p = team().filter(function (x) { return x.id === pid; })[0]; if (!p) return;
    /* Leistungen liegen in setup.setup.leistungen (lib/_termine.js setupLaden), dieselbe Liste wie im Formular. Bei jedem Antippen frisch geholt, damit neue Leistungen sofort da sind. */
    var L = ((SETUP && SETUP.setup && SETUP.setup.leistungen) || (SETUP && SETUP.leistungen) || []).filter(function (l) { return l && l.name && l.aktiv !== false && !l.beratung; });
    E = { p: p, n: n, l: -1, L: L };
    var dd = new Date(tag + 'T12:00:00');
    blatt('<h3>Welche Leistung?</h3><p class="u">' + WT[dd.getDay()] + ' ' + dd.getDate() + '.' + (dd.getMonth() + 1) + '. · ' + z(n) + ' Uhr · bei ' + esc(p.name) + '</p>'
      + (L.length ? '<div class="ta-ws">' + L.map(function (l, i) { var d = Math.max(5, +l.dauer || 30), ok = frei(p, n, d); return '<button type="button" class="ta-c" data-l="' + i + '"' + (ok ? '' : ' disabled') + '>' + esc(l.name) + '<small>' + d + ' Min' + (l.preis ? ' · ' + (l.ab ? 'ab ' : '') + l.preis + ' €' : '') + (ok ? '' : ' · passt nicht') + '</small></button>'; }).join('') + '</div>' : '')
      + '<label class="ta-f">Name, freiwillig<input id="ta-n" autocomplete="off" placeholder="z. B. Jonas"></label>'
      + '<label class="ta-f">Telefon, freiwillig<input id="ta-t" type="tel" inputmode="tel" autocomplete="off" placeholder="0176 …"></label>'
      + '<p class="ta-m" id="ta-m"></p><div class="ta-z"><button type="button" class="ta-ab" data-zu>Abbrechen</button><button type="button" class="ta-go" id="ta-go" disabled>Eintragen</button></div>');
    if (!L.length) { E.l = -2; bg.querySelector('.u').insertAdjacentHTML('afterend', '<p class="ta-m bad">Noch keine Leistungen eingetragen. Im Konfigurator oder unter Kalender → Uhrzeit-Termine anlegen.</p>'); }
    $('ta-n').addEventListener('input', pruef); pruef();
  }
  function waehle(i) { E.l = i; [].forEach.call(bg.querySelectorAll('[data-l]'), function (b) { b.classList.toggle('an', +b.getAttribute('data-l') === i); }); pruef(); }
  function pruef() { var g = $('ta-go'); if (g && E) { g.disabled = E.l === -1; var l = E.l >= 0 ? E.L[E.l] : null, d = l ? Math.max(5, +l.dauer || 30) : 30; g.textContent = 'Eintragen · ' + z(E.n) + '–' + z(E.n + d); } }
  function speichern() {
    var l = E.l >= 0 ? E.L[E.l] : null, g = $('ta-go'), x = E;
    g.disabled = true; $('ta-m').textContent = 'Wird eingetragen …'; $('ta-m').className = 'ta-m';
    fetch(API + '/termine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), aktion: 'eigen', datum: tag, zeit: z(x.n), dauer: l ? Math.max(5, +l.dauer || 30) : 30, personal_id: x.p.id, leistung: l ? l.name : null, name: $('ta-n').value.trim() || (l ? l.name : 'Telefon-Termin'), telefon: $('ta-t').value.trim() || null }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (j) {
        if (!j || !j.ok) { g.disabled = false; $('ta-m').textContent = (j && j.error) || 'Hat nicht geklappt.'; $('ta-m').className = 'ta-m bad'; return; }
        zu(); laden(); try { if (window.czHomeNeu) window.czHomeNeu(); } catch (e) {}
      }).catch(function () { g.disabled = false; $('ta-m').textContent = 'Keine Verbindung.'; $('ta-m').className = 'ta-m bad'; });
  }

  /* Ziehen (seit 13.10.2026): Termin festhalten und auf eine freie Uhrzeit ziehen, auch zu einem anderen Mitarbeiter.
     Maus: sofort ziehen. Finger: kurz halten (0,3 Sek.), dann ziehen, damit Scrollen weiter geht. Danach WhatsApp-Hinweis. */
  var Z = null, nachZug = 0;
  /* Ziel = Spalte (Mitarbeiter) unter dem Finger und Zeile (Uhrzeit). So geht auch „30 Minuten später“ über dem eigenen Termin
     und jeder Wechsel zu einem anderen Mitarbeiter. */
  function zielUnter(x, y) {
    var ks = box.querySelectorAll('.ta-mk > div[style]'), rs = box.querySelectorAll('.ta-uz'), ci = -1, ri = -1, cr = null, rr = null;
    for (var i = 0; i < ks.length; i++) { var r = ks[i].getBoundingClientRect(); if (x >= r.left - 2 && x <= r.right + 2) { ci = i; cr = r; break; } }
    for (var k = 0; k < rs.length; k++) { var q = rs[k].getBoundingClientRect(), nx = rs[k + 1] && rs[k + 1].getBoundingClientRect(); if (y >= q.top - 2 && y < (nx ? nx.top - 2 : q.bottom + 2)) { ri = k; rr = q; break; } }
    if (ci < 0 || ri < 0 || !CUR_P[ci]) return null;
    return { p: CUR_P[ci], n: +rs[ri].getAttribute('data-n'), l: cr.left, t: rr.top, w: cr.width, h: rr.height };
  }
  var zielBox = null;
  function zielZeigen(zz, d, tt) {
    if (!zielBox) { zielBox = document.createElement('div'); zielBox.className = 'ta-zbox'; document.body.appendChild(zielBox); }
    if (!zz) { zielBox.hidden = true; return; }
    var ok = passtFuer(tt, zz.p, zz.n, d), sp = Math.max(1, Math.ceil(d / 30));
    zielBox.hidden = false; zielBox.className = 'ta-zbox' + (ok ? '' : ' nein');
    zielBox.style.cssText = 'left:' + zz.l + 'px;top:' + zz.t + 'px;width:' + zz.w + 'px;height:' + Math.round((zz.h + 4) * d / 30 - 4) + 'px';
    zielBox.textContent = z(zz.n) + ' · ' + zz.p.name;
  }
  function passtFuer(t, p, n, d) { return !belegt(p, n, n + d, t); }
  function zugStart(ev, b) {
    var r = b.getBoundingClientRect(), g = b.cloneNode(true); g.className = b.className + ' ta-geist'; g.removeAttribute('data-tb');
    g.style.cssText += ';left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px'; document.body.appendChild(g);
    b.classList.add('ta-zieht'); Z.an = true; Z.g = g; Z.dx = ev.clientX - r.left; Z.dy = ev.clientY - r.top;
    try { navigator.vibrate && navigator.vibrate(15); } catch (e) {}
  }
  function stopTouch(e) { if (Z && Z.an) e.preventDefault(); }
  box.addEventListener('pointerdown', function (ev) {
    var b = ev.target.closest && ev.target.closest('.ta-b[data-tb]'); if (!b || ev.button > 0) return;
    Z = { b: b, x: ev.clientX, y: ev.clientY, an: false, ziel: null, touch: ev.pointerType !== 'mouse' };
    if (Z.touch) Z.uhr = setTimeout(function () { if (Z && !Z.an) zugStart({ clientX: Z.x, clientY: Z.y }, b); }, 300);
    document.addEventListener('touchmove', stopTouch, { passive: false });
  });
  document.addEventListener('pointermove', function (ev) {
    if (!Z) return;
    if (!Z.an) { var w = Math.abs(ev.clientX - Z.x) + Math.abs(ev.clientY - Z.y); if (Z.touch) { if (w > 8) { clearTimeout(Z.uhr); zugEnde(); } return; } if (w < 6) return; zugStart(ev, Z.b); }
    ev.preventDefault(); Z.g.style.left = (ev.clientX - Z.dx) + 'px'; Z.g.style.top = (ev.clientY - Z.dy) + 'px';
    var tt = LISTE.filter(function (x) { return String(x.id) === Z.b.getAttribute('data-tb'); })[0], d0 = tt ? (+tt.dauer || (bis(tt) - von(tt)) || 30) : 30;
    Z.ziel = zielUnter(ev.clientX, ev.clientY); zielZeigen(Z.ziel, d0, tt);
    var bx = box.querySelector('.ta-box'); if (bx) { var r = bx.getBoundingClientRect(); if (ev.clientY > r.bottom - 40) bx.scrollTop += 12; else if (ev.clientY < r.top + 70) bx.scrollTop -= 12; }
  }, { passive: false });
  function zugEnde() { document.removeEventListener('touchmove', stopTouch); if (!Z) return; clearTimeout(Z.uhr); if (Z.g) Z.g.remove(); Z.b.classList.remove('ta-zieht'); zielZeigen(null); var z0 = Z; Z = null; return z0; }
  document.addEventListener('pointerup', function () { if (!Z) return; var war = Z.an, z0 = zugEnde(); if (!war) return; nachZug = Date.now(); if (z0.ziel) verschieben(z0.b.getAttribute('data-tb'), z0.ziel.p.id, z0.ziel.n); });
  document.addEventListener('pointercancel', zugEnde);
  function verschieben(id, pid, n, trotz) {
    var t = LISTE.filter(function (x) { return String(x.id) === String(id); })[0]; if (!t) return;
    var p = team().filter(function (x) { return String(x.id) === String(pid); })[0]; if (!p) return;
    if (von(t) === n && wer(t) === p.id) return;
    var d = +t.dauer || (bis(t) - von(t)) || 30;
    var jetzt = new Date(); if (!trotz && tag === iso(jetzt) && n < jetzt.getHours() * 60 + jetzt.getMinutes()) { PAST = { id: id, pid: pid, n: n }; info('<b>Diese Uhrzeit ist schon vorbei</b><p>Trotzdem auf ' + z(n) + ' Uhr bei ' + esc(p.name) + ' verschieben?</p><div class="ta-ja"><button type="button" data-tazu>Abbrechen</button><button type="button" class="j" data-tatrotz>Trotzdem verschieben</button></div>'); return; }
    if (!passtFuer(t, p, n, d)) { { info('<b>Passt nicht</b><p>' + esc(t.leistung || 'Der Termin') + ' dauert ' + d + ' Minuten. Ab ' + z(n) + ' Uhr ist bei ' + esc(p.name) + ' nicht so lange frei.</p>'); return; } }
    var alt = { zeit: t.zeit, personal_id: t.personal_id, personal_name: t.personal_name, start: t.start, ende: t.ende };
    t.zeit = z(n); t.personal_id = p.id; t.personal_name = p.name; t.start = tag + 'T' + z(n) + ':00'; t.ende = tag + 'T' + z(n + d) + ':00'; zeichnen();
    var fertig = function (j) { j = j || {}; try { if (alt0) alt0(); } catch (e) {} if (istSp(t)) { info('<b>Verschoben auf ' + esc(t.zeit) + ' Uhr</b>'); return; } wa(t, p, j.link || '', j.text || '', j.mail, j.status !== 'vorschlag' && !DEMO); };
    if (DEMO) { if (!istSp(t)) t.status = 'vorschlag'; zeichnen(); fertig({ status: 'vorschlag', link: 'https://clickzauber.de/meine-anfrage.html?beispiel=1' }); return; }
    fetch(API + '/termine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), aktion: 'verschieben', id: t.id, datum: tag, zeit: z(n), personal_id: p.id }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (j) {
        if (!j || !j.ok) { Object.assign(t, alt); zeichnen(); info('<b>Nicht verschoben</b><p>' + esc((j && j.error) || 'Hat nicht geklappt.') + '</p>'); return; }
        if (j.status) t.status = j.status; laden(); fertig(j);
      }).catch(function () { Object.assign(t, alt); zeichnen(); info('<b>Keine Verbindung</b><p>Der Termin bleibt, wo er war.</p>'); });
  }
  var infoBox = null, WA_LETZT = null, PAST = null;
  function info(html) { if (!infoBox) { infoBox = document.createElement('div'); infoBox.className = 'ta-info'; infoBox.setAttribute('role', 'status'); document.body.appendChild(infoBox); } infoBox.innerHTML = '<button type="button" class="ta-x" aria-label="Schließen">×</button>' + html; infoBox.hidden = false; }
  function infoZu() { if (infoBox) infoBox.hidden = true; }
  function waNr(t) { var n = String(t || '').replace(/[^\d+]/g, ''); if (n.indexOf('+') === 0) n = n.slice(1); else if (n.indexOf('00') === 0) n = n.slice(2); else if (n.indexOf('0') === 0) n = '49' + n.slice(1); return n.length >= 8 ? n : ''; }
  /* Seit 17.10.2026: Verschieben ist ein Vorschlag. Der Text kommt vom Server (wie bei „Anderen Termin vorschlagen“), mit Link zum Bestätigen oder für eine andere Zeit. */
  function wa(t, p, link, stext, mail, nurInfo) {
    var dd = new Date(tag + 'T12:00:00'), wann = WT[dd.getDay()] + ', ' + dd.getDate() + '.' + (dd.getMonth() + 1) + '. um ' + t.zeit + ' Uhr', nr = waNr(t.telefon);
    var wer = (window.SETUP && window.SETUP.betrieb) || '', vn = t.name ? ' ' + String(t.name).split(/\s+/)[0] : '';
    var text = stext || ('Hallo' + vn + ', wir schlagen Ihnen für Ihren Termin' + (t.leistung ? ' (' + t.leistung + ')' : '') + ' ' + wann + (p && p.name ? ' bei ' + p.name : '') + ' vor.' + (link ? ' Bitte hier bestätigen oder eine andere Zeit wählen: ' + link : '') + ' Viele Grüße' + (wer ? ', ' + wer : ''));
    var kopf = (nurInfo ? 'Verschoben auf ' : 'Vorschlag ') + esc(t.zeit) + ' Uhr', mz = mail ? ' Eine E-Mail ist schon unterwegs.' : '';
    WA_LETZT = null;
    if (!nr) { info('<b>' + kopf + '</b><p>Der Termin wartet jetzt auf die Bestätigung von ' + esc(t.name || 'Ihrem Kunden') + '.' + mz + (mail ? '' : ' Keine Handynummer gespeichert: bitte selbst Bescheid sagen.') + '</p>'); return; }
    WA_LETZT = function () { wa(t, p, link, stext, mail, nurInfo); };
    info('<b>' + kopf + ': jetzt per WhatsApp fragen</b><p>' + esc(t.name || '') + ' · ' + esc(wann) + '. Der Kunde bestätigt oder wählt eine andere Zeit.' + mz + '</p><a class="ta-wa" data-tawa="' + esc(t.id) + '" target="_blank" rel="noopener" href="https://wa.me/' + nr + '?text=' + encodeURIComponent(text) + '">Vorschlag per WhatsApp</a>');
  }
  document.addEventListener('click', function (ev) {
    if (!infoBox || infoBox.hidden || !infoBox.contains(ev.target)) return;
    if (ev.target.closest('.ta-x')) { WA_LETZT = null; PAST = null; infoZu(); return; }
    if (ev.target.closest('[data-tazu]')) { PAST = null; infoZu(); return; }
    if (ev.target.closest('[data-tatrotz]')) { var q = PAST; PAST = null; infoZu(); if (q) verschieben(q.id, q.pid, q.n, true); return; }
    var a = ev.target.closest('[data-tawa]');
    if (a) { var id = a.getAttribute('data-tawa'); setTimeout(function () { info('<b>Kunde informiert?</b><p>Haben Sie die WhatsApp-Nachricht abgeschickt?</p><div class="ta-ja"><button type="button" data-tano>Noch nicht</button><button type="button" class="j" data-taja="' + esc(id) + '">Ja, informiert</button></div>'); }, 600); return; }
    var j = ev.target.closest('[data-taja]');
    if (j) { var id2 = j.getAttribute('data-taja'); if (!DEMO && window.czBescheid) { try { window.czBescheid(id2).catch(function () {}); } catch (e) {} } WA_LETZT = null; info('<b>✓ Kunde informiert</b>'); setTimeout(infoZu, 2200); laden(); return; }
    if (ev.target.closest('[data-tano]')) { if (WA_LETZT) WA_LETZT(); else infoZu(); }
  });
  var alt0 = null;
  box.addEventListener('click', function (ev) {
    if (Date.now() - nachZug < 400) { ev.stopPropagation(); return; }
    var b = ev.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-tag')) { tag = b.getAttribute('data-tag'); laden(true); }
    else if (b.hasAttribute('data-fa')) { if (window.czSchluss) window.czSchluss({ datum: tag }); }
    else if (b.hasAttribute('data-tb')) { var t = LISTE.filter(function (x) { return String(x.id) === b.getAttribute('data-tb'); })[0]; if (!t) return; if (window.czSchnellTermin) { var lp = (((SETUP && SETUP.setup && SETUP.setup.leistungen) || []).filter(function (x) { return x && x.name === t.leistung; })[0] || {}).preis; window.czSchnellTermin(Object.assign({ preis: lp || 0, start: tag + 'T' + t.zeit + ':00', ende: tag + 'T' + z(m(t.zeit) + (+t.dauer || 30)) + ':00' }, t)); } else if (DEMO) demoTermin(t); }
    else if (b.hasAttribute('data-p')) eintragen(b.getAttribute('data-p'), +b.getAttribute('data-n'));
  });
  bg.addEventListener('click', function (ev) {
    if (ev.target === bg) { zu(); return; }
    var b = ev.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-l')) waehle(+b.getAttribute('data-l'));
    else if (b.id === 'ta-go') speichern();
    else if (b.hasAttribute('data-zu')) zu();
    else if (b.hasAttribute('data-demo-ab')) { var l = demoListe(), id = b.getAttribute('data-demo-ab'); for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i].status = 'abgesagt'; zu(); zeichnen(); }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !bg.hidden) zu(); });

  var alt = window.czHomeNeu; alt0 = function () { try { if (alt) alt(); } catch (e) {} };
  Object.defineProperty(window, 'czHomeNeu', { configurable: true, get: function () { return function () { try { if (alt) alt(); } catch (e) {} laden(); }; }, set: function (f) { alt = f; } });
  setInterval(function () { if (!document.hidden && bg.hidden && !Z) laden(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) laden(true); });
  (function () { var sa = $('sa'); if (!sa || !window.MutationObserver) return; new MutationObserver(function () { if (sa.hidden && wahl() === 2 && !Z) setTimeout(laden, 300); }).observe(sa, { attributes: true, attributeFilter: ['hidden'] }); })();
  setzen(wahl());
  /* Seit 15.10.2026 lädt das Cockpit seine Zusatz-Dateien gleichzeitig. Dann läuft diese Datei oft, bevor die Art feststeht (body.art-termin),
     und laden() bricht ab. Deshalb nachziehen, sobald die Art gesetzt wird. */
  if (!istTermin() && window.MutationObserver) {
    var artMo = new MutationObserver(function () { if (istTermin()) { artMo.disconnect(); if (wahl() === 2) laden(true); } });
    artMo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
