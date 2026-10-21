/* clickzauber · Historienbuch (seit 05.10.2026)
   Kunden der letzten 30 Tage, die da waren, mit allen Angaben. Ältere Einträge verschwinden aus dem Buch;
   wer sie behalten will, lädt sie vorher als CSV herunter (Stand der letzten Sicherung je Gerät im Browserspeicher).
   Eingänge: Friseur & Co. Reiter neben „Anfragen“ (js/cz-salon.js), Food Truck & Co. Reiter neben „Zugesagt“ (js/cz-auftrag.js),
   alle anderen Reiter neben „Auswertung“ in der Übersicht.
   Daten: Uhrzeit-Termine über /termine?aktion=liste (fest, vorbei, nicht „nicht erschienen“),
   sonst Anfragen (CZ_LEADS_ALL) mit Stand „gebucht“, deren Tag vorbei ist.
   Die Daten selbst löscht der Server weiter nach der Löschfrist (Einstellungen). */
(function () {
  'use strict';
  if (window.czHistorie) return;
  var TAGE = 30;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function plus(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function heute() { return iso(new Date()); }
  function jetztStempel() { var d = new Date(); return iso(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var WT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  function lang(s) { var d = new Date(s + 'T12:00:00'); return WT[d.getDay()] + ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function kurz(s) { return s.slice(8, 10) + '.' + s.slice(5, 7) + '.'; }
  function hat(c) { return document.body.classList.contains(c); }
  function wid() { return window.widget || ''; }
  function schl() { return 'cz_hist_csv_' + (wid() || 'alle'); }
  function gesichert() { try { return localStorage.getItem(schl()) || ''; } catch (e) { return ''; } }
  function text(v) {
    if (v == null || v === false) return '';
    if (Array.isArray(v)) return v.map(text).filter(Boolean).join(', ');
    if (typeof v === 'object') return Object.keys(v).map(function (k) { return k + ': ' + text(v[k]); }).join(', ');
    return String(v).trim();
  }
  var NAMEN = { anlass: 'Anlass', gaeste: 'Gäste', personen: 'Personen', art: 'Art', getraenke: 'Getränke', ort: 'Ort', budget: 'Budget', catering: 'Catering', saison: 'Saison', trauung: 'Trauung', uebernachtung: 'Übernachtung', nachricht: 'Nachricht', uhrzeit: 'Uhrzeit' };
  function tagVon(l) {
    var a = l.answers || {}, x = String(l.termin || a.termin || a.datum || a.Datum || a.wunschtermin || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '';
  }
  function ausTermin(t) {
    var tag = t.datum || String(t.start || '').slice(0, 10);
    return { q: 't', id: t.id, tag: tag, zeit: t.zeit || '', ab: tag + ' ' + (t.bis_zeit || t.zeit || '00:00'), name: t.name || 'Ohne Namen', tel: t.telefon || '', mail: t.email || '',
      was: [t.leistung, t.personal_name ? 'bei ' + t.personal_name : '', t.dauer ? t.dauer + ' Min.' : ''].filter(Boolean).join(' · '),
      angaben: [['Leistung', t.leistung], ['Mitarbeiter', t.personal_name], ['Uhrzeit', t.zeit ? t.zeit + (t.bis_zeit ? ' bis ' + t.bis_zeit : '') + ' Uhr' : ''], ['Dauer', t.dauer ? t.dauer + ' Min.' : ''],
        ['Preis', t.preis ? t.preis + ' €' : ''], ['Telefon', t.telefon], ['E-Mail', t.email], ['Nachricht', t.nachricht], ['Notiz zum Kunden', t.kunden_notiz && t.kunden_notiz.notiz]] };
  }
  function ausLead(l) {
    var a = l.answers || {}, tag = tagVon(l), betrag = l.betrag || l.value_est, pers = text(a.gaeste || a.personen || a.Personen);
    var ang = [['Telefon', l.telefon || l.phone], ['E-Mail', l.email], ['Ort', l.ort], ['Betrag', betrag ? Number(betrag).toLocaleString('de-DE') + ' €' : ''], ['Angebot', l.angebot_nr]];
    Object.keys(a).forEach(function (k) { if (!/^(termin|datum|Datum|wunschtermin)$/.test(k)) ang.push([NAMEN[k] || (k.charAt(0).toUpperCase() + k.slice(1)), a[k]]); });
    if (l.notiz) ang.push(['Notiz', l.notiz]);
    return { q: 'l', id: l.id, tag: tag, zeit: text(a.uhrzeit), ab: plus(tag, 1) + ' 00:00', name: l.name || l.email || 'Ohne Namen', tel: l.telefon || l.phone || '', mail: l.email || '',
      was: [text(a.anlass || a.art), pers ? pers + (/^\d+$/.test(pers) ? ' Personen' : ' Gäste') : '', l.ort || ''].filter(Boolean).join(' · '), angaben: ang };
  }
  function sortiert() {
    return (STAND.liste || []).slice().sort(function (a, b) { return a.tag !== b.tag ? (a.tag < b.tag ? 1 : -1) : (a.zeit < b.zeit ? 1 : a.zeit > b.zeit ? -1 : 0); });
  }

  var STAND = { liste: null, fehler: false, laedt: false };
  function laden() {
    var h = heute(), ab = plus(h, -TAGE);
    if (hat('art-termin')) {
      if (STAND.laedt) return;
      STAND.laedt = true; zeichnen();
      fetch((window.API || 'https://clickzauber-api.vercel.app/api') + '/termine?token=' + encodeURIComponent(window.token || '') + '&aktion=liste&von=' + ab + '&bis=' + h)
        .then(function (r) { return r.json(); }).then(function (j) {
          if (!j || !j.ok) throw j;
          var d = new Date(), hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
          STAND.liste = (j.termine || []).filter(function (t) {
            var tag = t.datum || String(t.start || '').slice(0, 10);
            if (t.status !== 'fest' || t.nicht_da || (t.eigen && t.leistung === 'Gesperrt')) return false;
            if (tag < ab || tag > h) return false;
            return tag < h || (t.bis_zeit || t.zeit || '99:99') <= hm;
          }).map(ausTermin);
          STAND.fehler = false;
        }).catch(function () { STAND.fehler = true; }).then(function () { STAND.laedt = false; zeichnen(); });
      return;
    }
    var w = wid();
    STAND.liste = (window.CZ_LEADS_ALL || []).filter(function (l) {
      if (l.status !== 'gebucht') return false;
      if (w && l.widget_id && l.widget_id !== w) return false;
      var tag = tagVon(l);
      return tag && tag >= ab && tag < h;
    }).map(ausLead);
    STAND.fehler = false; zeichnen();
  }

  function tabs() {
    var t = $('hb-tabs'); if (!t) return;
    var l = hat('art-termin') || hat('art-auftrag') ? [['overview', 'Übersicht'], ['historie', 'Historie']] : [['overview', 'Zahlen'], ['stats', 'Auswertung'], ['historie', 'Historie']];
    var h = l.map(function (x) { return '<button type="button" data-view="' + x[0] + '"' + (x[0] === 'historie' ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('');
    if (t.innerHTML !== h) t.innerHTML = h;
  }
  function zeichnen() {
    var box = $('hb-liste'); if (!box) return;
    tabs();
    if (STAND.laedt && !STAND.liste) { box.innerHTML = '<p class="hb-leer">Wird geladen …</p>'; return; }
    if (STAND.fehler) { box.innerHTML = '<div class="hb-leer">Das Historienbuch lässt sich gerade nicht laden.<br><button type="button" class="hb-knopf" data-hb-neu>Noch einmal versuchen</button></div>'; return; }
    var q = ($('hb-suche').value || '').trim().toLowerCase(), qn = q.replace(/[^\d]/g, '');
    var alle = sortiert(), g = gesichert(), h = heute(), bald = plus(h, 7);
    var liste = alle.filter(function (x) {
      return !q || x.name.toLowerCase().indexOf(q) >= 0 || String(x.mail).toLowerCase().indexOf(q) >= 0 || (qn.length >= 3 && String(x.tel).replace(/[^\d]/g, '').indexOf(qn) >= 0);
    });
    var offen = alle.filter(function (x) { return !(g && g >= x.ab) && plus(x.tag, TAGE) <= bald; }).length;
    var st = alle.length ? alle.length + (alle.length === 1 ? ' Kunde' : ' Kunden') + ' in den letzten ' + TAGE + ' Tagen. ' : '';
    st += g ? 'Zuletzt als CSV gesichert am ' + lang(g.slice(0, 10)) + ', ' + g.slice(11, 16) + ' Uhr.' : 'Noch nicht als CSV gesichert.';
    $('hb-stand').innerHTML = esc(st) + (offen ? ' <b>' + offen + (offen === 1 ? ' Eintrag verschwindet' : ' Einträge verschwinden') + ' in den nächsten 7 Tagen und ' + (offen === 1 ? 'ist' : 'sind') + ' noch nicht gesichert.</b>' : '');
    $('hb-csv').disabled = !alle.length;
    if (!liste.length) {
      box.innerHTML = '<p class="hb-leer">' + (q ? 'Niemand gefunden.' : 'Noch keine Kunden in den letzten ' + TAGE + ' Tagen. Hier steht jeder, ' + (hat('art-termin') ? 'dessen bestätigter Termin vorbei ist.' : 'dessen Auftrag fest war und dessen Tag vorbei ist.')) + '</p>';
      return;
    }
    var html = '', letzt = '';
    liste.forEach(function (x) {
      if (x.tag !== letzt) { if (letzt) html += '</div>'; letzt = x.tag; html += '<div class="hb-tag"><h3>' + esc(lang(x.tag)) + '<span>bleibt bis ' + esc(kurz(plus(x.tag, TAGE))) + '</span></h3>'; }
      var sicher = g && g >= x.ab, tel = String(x.tel).replace(/[^\d+]/g, '');
      html += '<div class="hb-e"><div class="hb-k">' + (x.zeit ? '<span class="hb-z">' + esc(x.zeit) + '</span>' : '')
        + '<div class="hb-w"><button type="button" class="hb-n" data-hb-n="' + esc(x.id) + '">' + esc(x.name) + '</button>' + (x.was ? '<span>' + esc(x.was) + '</span>' : '')
        + (!sicher && plus(x.tag, TAGE) <= bald ? '<em class="hb-warn">noch nicht gesichert</em>' : '') + '</div>'
        + (tel ? '<a class="hb-a" href="tel:' + esc(tel) + '">Anrufen</a>' : x.mail ? '<a class="hb-a" href="mailto:' + esc(x.mail) + '">E-Mail</a>' : '') + '</div>'
        + '<details class="hb-d"><summary>Alle Angaben</summary><dl>' + x.angaben.filter(function (p) { return text(p[1]); })
          .map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(text(p[1])) + '</dd>'; }).join('') + '</dl></details></div>';
    });
    box.innerHTML = html + '</div>';
  }

  function csv() {
    var alle = sortiert(); if (!alle.length) return;
    var spalten = ['Datum', 'Uhrzeit', 'Name'];
    alle.forEach(function (x) { x.angaben.forEach(function (p) { if (text(p[1]) && spalten.indexOf(p[0]) < 0) spalten.push(p[0]); }); });
    var q = function (v) { v = text(v); if (/^[=@]/.test(v) || /^[+\-](?!\d)/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    var zeilen = [spalten.map(q).join(';')].concat(alle.map(function (x) {
      var m = {}; x.angaben.forEach(function (p) { m[p[0]] = p[1]; });
      return spalten.map(function (s) { return q(s === 'Datum' ? kurz(x.tag) + x.tag.slice(0, 4) : s === 'Uhrzeit' ? x.zeit : s === 'Name' ? x.name : m[s]); }).join(';');
    }));
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + zeilen.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'historienbuch-' + (wid() || 'clickzauber') + '-' + heute() + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    try { localStorage.setItem(schl(), jetztStempel()); } catch (e) {}
    zeichnen();
  }

  function seite() {
    if ($('hb-liste')) return true;
    var main = document.querySelector('main.main') || document.querySelector('.main'); if (!main) return false;
    var s = document.createElement('section');
    s.className = 'view'; s.setAttribute('data-v', 'historie'); s.setAttribute('data-screen-label', 'Historienbuch');
    s.innerHTML = '<div class="top"><div><h1>Historienbuch</h1><div class="sub">Alle Kunden der letzten ' + TAGE + ' Tage mit allen Angaben. Nach ' + TAGE + ' Tagen verschwindet ein Eintrag aus dem Buch. Wer ihn behalten möchte, lädt die Liste vorher als CSV herunter.</div></div></div>'
      + '<div class="vtabs" id="hb-tabs"></div>'
      + '<div class="hb-leiste"><input type="search" id="hb-suche" placeholder="Name, Telefon oder E-Mail" autocomplete="off" aria-label="Im Historienbuch suchen"><button type="button" class="hb-knopf" id="hb-csv">Als CSV herunterladen</button></div>'
      + '<p class="hb-stand" id="hb-stand"></p><div id="hb-liste"></div>';
    main.appendChild(s);
    $('hb-suche').addEventListener('input', zeichnen);
    return true;
  }
  function knopf() { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-hb-auf', ''); b.textContent = 'Historie'; return b; }
  function einhaengen() {
    var vt = document.querySelector('.view[data-v="overview"] .vtabs');
    if (vt && !vt.querySelector('[data-view="historie"]')) { var b = document.createElement('button'); b.type = 'button'; b.className = 'hb-vt'; b.setAttribute('data-view', 'historie'); b.textContent = 'Historie'; vt.appendChild(b); }
    [['.sal-reiter [data-salr="anfragen"]'], ['#au-reiter [data-aur="fest"]']].forEach(function (s) {
      var x = document.querySelector(s[0]);
      if (x && !(x.nextElementSibling && x.nextElementSibling.hasAttribute('data-hb-auf'))) x.parentNode.insertBefore(knopf(), x.nextSibling);
    });
  }
  function markNav() {
    document.querySelectorAll('.side .nav-i[data-view="overview"], .unten button[data-view="overview"]').forEach(function (b) { b.classList.add('on'); });
  }
  function wrap() {
    var alt = window.show; if (typeof alt !== 'function') return false;
    if (alt._hb) return true;
    var neu = function (v) { var r = alt.apply(this, arguments); if (v === 'historie') { laden(); markNav(); } return r; };
    for (var k in alt) if (Object.prototype.hasOwnProperty.call(alt, k)) neu[k] = alt[k];
    neu._hb = true; window.show = neu; return true;
  }
  function oeffnen() { wrap(); if (window.show) window.show('historie'); }

  var css = '.hb-leiste{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 10px}'
    + '.hb-leiste input{flex:1 1 240px;min-width:0;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--ink);font:inherit;font-size:15px}'
    + '.hb-knopf{min-height:44px;padding:0 16px;border-radius:12px;border:0;background:var(--accent);color:var(--on-accent,#fff);font:inherit;font-weight:600;font-size:14.5px;cursor:pointer}.hb-knopf:disabled{opacity:.45;cursor:default}'
    + '.hb-stand{margin:0 0 16px;font-size:14px;line-height:1.55;color:var(--ink-2)}.hb-stand b{color:var(--warn);font-weight:600}'
    + '.hb-tag{margin:0 0 18px}.hb-tag h3{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin:0 0 8px;font-family:var(--fm);font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}.hb-tag h3 span{letter-spacing:0;text-transform:none}'
    + '.hb-e{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 8px}'
    + '.hb-k{display:flex;gap:12px;align-items:flex-start}.hb-z{flex:0 0 auto;min-width:44px;padding-top:2px;font-family:var(--fm);font-size:13px;color:var(--ink-2)}'
    + '.hb-w{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.hb-w span{font-size:13.5px;color:var(--ink-2);overflow-wrap:anywhere}'
    + '.hb-n{align-self:flex-start;background:none;border:0;padding:0;font:inherit;font-size:15.5px;font-weight:600;color:var(--ink);text-align:left;cursor:pointer;overflow-wrap:anywhere}.hb-n:hover{color:var(--accent)}'
    + '.hb-warn{align-self:flex-start;margin-top:4px;font-style:normal;font-family:var(--fm);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:2px 8px;background:color-mix(in srgb,var(--warn) 15%,transparent);color:var(--warn)}'
    + '.hb-a{flex:0 0 auto;display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;color:var(--ink);text-decoration:none;font-size:13.5px;font-weight:600}.hb-a:hover{border-color:var(--accent);color:var(--ink)}'
    + '.hb-d{margin-top:6px}.hb-d summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--accent);padding:8px 0}'
    + '.hb-d dl{display:grid;grid-template-columns:minmax(110px,auto) minmax(0,1fr);gap:6px 14px;margin:4px 0 2px;font-size:14px}.hb-d dt{color:var(--ink-3)}.hb-d dd{margin:0;color:var(--ink);overflow-wrap:anywhere}'
    + '.hb-leer{padding:26px 4px;color:var(--ink-2);font-size:15px;line-height:1.6}.hb-leer .hb-knopf{margin-top:12px}'
    + 'body.art-termin .hb-vt,body.art-auftrag .hb-vt{display:none!important}'
    + '@media(max-width:760px){.hb-d dl{grid-template-columns:minmax(0,1fr);gap:2px}.hb-d dt{margin-top:6px}}';
  var st = document.createElement('style'); st.id = 'cz-historie-css'; st.textContent = css; document.head.appendChild(st);

  document.addEventListener('click', function (ev) {
    var t = ev.target, x; if (!t || !t.closest) return;
    if (t.closest('[data-hb-auf]') || t.closest('.vtabs [data-view="historie"]')) { ev.preventDefault(); oeffnen(); return; }
    if ((x = t.closest('#hb-tabs [data-view]'))) { if (x.getAttribute('data-view') !== 'historie' && window.show) window.show(x.getAttribute('data-view')); return; }
    if (t.closest('#hb-csv')) { csv(); return; }
    if (t.closest('[data-hb-neu]')) { laden(); return; }
    if ((x = t.closest('[data-hb-n]'))) {
      var id = x.getAttribute('data-hb-n'), e = (STAND.liste || []).filter(function (y) { return String(y.id) === id; })[0]; if (!e) return;
      if (e.q === 't' && window.czKundenkarte && (e.tel || e.mail)) { window.czKundenkarte({ name: e.name, telefon: e.tel, email: e.mail }); return; }
      if (e.q === 'l' && typeof window.dtOeffnen === 'function') { try { window.dtOeffnen(e.id); return; } catch (err) {} }
      var d = x.closest('.hb-e').querySelector('details'); if (d) d.open = !d.open;
    }
  });

  function start() {
    if (!seite()) { setTimeout(start, 400); return; }
    if (!wrap()) setTimeout(wrap, 1000);
    einhaengen();
    new MutationObserver(einhaengen).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('cz-art', function () { if (document.querySelector('.view.on[data-v="historie"]')) laden(); });
    if (location.hash === '#historie') setTimeout(oeffnen, 900);
  }
  window.czHistorie = { oeffnen: oeffnen };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
