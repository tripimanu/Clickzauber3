/* clickzauber — Pipeline-Cockpit (Handwerk, Finanzen & B2B).
   Gilt, wenn alle gewählten Formulare die Art „pipeline“ haben (js/cz-art.js → body.art-pipeline).
   Im Tab „Anfragen“ gibt es zusätzlich die Tafel: eine Spalte je Bearbeitungsstand
   (Neu → Kontakt → Angebot → Auftrag → Verloren). Antippen öffnet das Anfrage-Blatt wie in der Liste,
   dort wird der Stand gesetzt. Suche und Filter wirken auf Liste und Tafel gleich. */
(function () {
  'use strict';
  function $(i) { return document.getElementById(i); }
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var SPALTEN = [['neu', 'Neu'], ['angerufen', 'Kontakt'], ['angebot', 'Angebot'], ['gebucht', 'Auftrag'], ['verloren', 'Verloren']];
  var ANSICHT = 'tafel';
  try { ANSICHT = localStorage.getItem('cz_pl_ansicht') || 'tafel'; } catch (x) {}

  var css = document.createElement('style');
  css.textContent = ''
    + '#pl-box{display:none}body.art-pipeline #pl-box{display:block}'
    + 'body.art-pipeline.pl-tafel [data-v="leads"] .card:has(#rows2){display:none}'
    + 'body.art-pipeline:not(.pl-tafel) #pl-tafel{display:none}'
    + '.pl-um{display:inline-flex;gap:4px;padding:4px;border-radius:12px;background:var(--panel-2);margin:0 0 12px}'
    + '.pl-um button{min-height:40px;padding:0 16px;border:0;border-radius:9px;background:none;font:inherit;font-size:14.5px;font-weight:600;color:var(--ink-2);cursor:pointer}'
    + '.pl-um button.an{background:var(--card,var(--panel));color:var(--ink);box-shadow:var(--schatten)}'
    + '#pl-tafel{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(232px,1fr);gap:10px;overflow-x:auto;padding:0 0 14px;margin:0 0 14px;scroll-snap-type:x mandatory}'
    + '.pl-sp{scroll-snap-align:start;background:var(--panel-2);border-radius:14px;padding:10px;min-height:120px}'
    + '.pl-sp h3{margin:2px 4px 10px;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);display:flex;justify-content:space-between;gap:8px}'
    + '.pl-sp h3 em{font-style:normal;color:var(--ink-3)}'
    + '.pl-k{display:block;width:100%;text-align:left;font:inherit;cursor:pointer;background:var(--card,var(--panel));border:1px solid var(--line-2);border-radius:12px;padding:11px 12px;margin:0 0 8px;min-height:48px}'
    + '.pl-k b{display:block;font-size:15.5px;color:var(--ink);line-height:1.3}'
    + '.pl-k .pl-w{display:block;font-size:13px;color:var(--ink-2);margin-top:3px;line-height:1.4}'
    + '.pl-k .pl-f{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px;color:var(--ink-3)}'
    + '.pl-k .pill{font-size:11px}'
    + '.pl-leer{font-size:13px;color:var(--ink-3);padding:6px 4px}'
    + '.pl-sp.verloren{opacity:.75}'
    + '@media(max-width:700px){#pl-tafel{grid-auto-columns:82%}}';
  document.head.appendChild(css);

  function bauen() {
    var v = document.querySelector('[data-v="leads"]'); if (!v || $('pl-box')) return;
    var box = document.createElement('div'); box.id = 'pl-box';
    box.innerHTML = '<div class="pl-um" role="tablist"><button type="button" data-pl="tafel">Tafel</button><button type="button" data-pl="liste">Liste</button></div><div id="pl-tafel"></div>';
    var karte = $('rows2') && $('rows2').closest('.card');
    if (karte) karte.parentNode.insertBefore(box, karte); else v.appendChild(box);
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-pl]'); if (!b) return;
      ANSICHT = b.getAttribute('data-pl');
      try { localStorage.setItem('cz_pl_ansicht', ANSICHT); } catch (x) {}
      umschalten();
    });
    umschalten();
  }
  function umschalten() {
    document.body.classList.toggle('pl-tafel', ANSICHT === 'tafel');
    Array.prototype.forEach.call(document.querySelectorAll('[data-pl]'), function (b) { b.classList.toggle('an', b.getAttribute('data-pl') === ANSICHT); });
  }

  /* Gleiche Auswahl wie die Liste: Suche und Filter-Knöpfe */
  function gefiltert() {
    var alle = window.CZ_LEADS_ALL || [], q = String(window.CZ_SUCHE || '').trim().toLowerCase(), f = window.CZ_FILTER || 'alle';
    return alle.filter(function (x) {
      if (f === 'offen') { if (x.status && x.status !== 'neu') return false; }
      else if (f !== 'alle' && window.ampel) { if (ampel(x).stufe !== f) return false; }
      if (!q) return true;
      var h = [x.name, x.email, x.telefon, x.ort];
      if (x.answers) for (var k in x.answers) h.push(x.answers[k]);
      return h.filter(Boolean).join(' ').toLowerCase().indexOf(q) > -1;
    });
  }
  function karte(l) {
    if (l.id && window.LEADS) LEADS[l.id] = l;
    var am = window.ampel ? ampel(l) : null, v = Number(l.value_est);
    var lbl = window.AMPEL_LBL && am ? AMPEL_LBL[am.stufe] : '';
    var datum = l.ts ? new Date(l.ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
    return '<button type="button" class="pl-k"' + (l.id ? ' data-lead="' + e(l.id) + '"' : '') + '>'
      + '<b>' + e(l.name || 'Ohne Namen') + '</b>'
      + (am && am.text ? '<span class="pl-w">' + e(am.text) + '</span>' : '')
      + (window.czWvFaellig && czWvFaellig(l) ? '<span class="pl-w"><em class="cz-wv-ab">' + (czWvFaellig(l) === 'ueber' ? 'Erinnerung überfällig' : 'Heute erinnern') + '</em></span>' : '')
      + '<span class="pl-f"><span>' + (v > 0 ? e(v.toLocaleString('de-DE')) + ' €' : e(datum)) + '</span>'
      + (lbl ? '<span class="pill ' + e(am.stufe) + '">' + e(lbl) + '</span>' : '') + '</span></button>';
  }
  function zeichnen() {
    if (!document.body.classList.contains('art-pipeline')) return;
    bauen();
    var t = $('pl-tafel'); if (!t) return;
    var l = gefiltert();
    t.innerHTML = SPALTEN.map(function (s) {
      var d = l.filter(function (x) { return (x.status || 'neu') === s[0]; });
      return '<div class="pl-sp ' + s[0] + '"><h3>' + e(s[1]) + ' <em>' + d.length + '</em></h3>'
        + (d.length ? d.map(karte).join('') : '<div class="pl-leer">Keine</div>') + '</div>';
    }).join('');
  }

  /* Im Pipeline-Cockpit heißt „Termin fest“ „Auftrag“ */
  function woerter() {
    if (!window.STAND_LBL) return;
    STAND_LBL.gebucht = document.body.classList.contains('art-pipeline') ? 'Auftrag' : 'Termin fest';
  }

  var alt = window.czLeadsZeichnen;
  if (typeof alt === 'function') window.czLeadsZeichnen = function () { woerter(); var r = alt.apply(this, arguments); zeichnen(); return r; };
  window.addEventListener('cz-art', function () { woerter(); zeichnen(); });
  if (window.MutationObserver) {
    var rows = $('rows2');
    if (rows) new MutationObserver(function () { zeichnen(); }).observe(rows, { childList: true });
  }
  setTimeout(function () { woerter(); zeichnen(); }, 400);
})();
