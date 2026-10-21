/* clickzauber — Wiedervorlage: „Erinnere mich am …“ für jede Anfrage.
   Am gewählten Tag kommt ab 8 Uhr eine Push-Nachricht und eine Mail (lib/nachfassen.js, stündlich).
   · czWvFuellen(el, lead)  zeichnet den Kasten in el (Anfrage-Blatt, Auftrags-Blatt)
   · czWvFaellig(lead)      'heute' | 'ueber' | '' für Abzeichen auf Karten
   Gespeichert über /api/anfrage { wiedervorlage, wv_notiz }. Nach dem Speichern: Ereignis 'cz-wv'. */
(function () {
  'use strict';
  if (window.czWvFuellen) return;
  var WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function heute() { return iso(new Date()); }
  function plus(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  function tagText(s) { var d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return WT[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
  function tok() { return (typeof token !== 'undefined' && token) || window.token || ''; }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function demo() { return tok() === 'demo' || /[?&]demo=1/.test(location.search); }

  window.czWvFaellig = function (l) {
    if (!l || !l.wv_am || l.status === 'verloren') return '';
    var t = String(l.wv_am).slice(0, 10), h = heute();
    return t < h ? 'ueber' : t === h ? 'heute' : '';
  };

  var css = document.createElement('style');
  css.textContent = ''
    + '.czwv{display:flex;flex-direction:column;gap:10px}'
    + '.czwv-ist{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:12px;background:var(--panel-2,#f3efe6);font-size:15px;line-height:1.45;color:var(--ink)}'
    + '.czwv-ist.heute{background:color-mix(in srgb,var(--warn,#c98a1b) 18%,var(--card,#fff))}'
    + '.czwv-ist b{font-weight:700}.czwv-ist span{color:var(--ink-2)}'
    + '.czwv-ist button{min-height:40px;padding:0 12px;border-radius:10px;border:1.5px solid var(--line-2,#ddd);background:var(--card,#fff);font:inherit;font-size:14px;font-weight:600;color:var(--ink-2);cursor:pointer}'
    + '.czwv-ch{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}'
    + '.czwv-ch button{min-height:46px;border-radius:12px;border:1.5px solid var(--line-2,#ddd);background:var(--card,#fff);font:inherit;font-size:14.5px;font-weight:600;color:var(--ink);cursor:pointer;padding:0 6px}'
    + '.czwv-ch button.an{border-color:var(--accent,#2f6b4f);background:color-mix(in srgb,var(--accent,#2f6b4f) 12%,var(--card,#fff))}'
    + '.czwv input{min-height:48px;border-radius:12px;border:1.5px solid var(--line-2,#ddd);background:var(--card,#fff);color:var(--ink);font:inherit;font-size:16px;padding:0 12px;min-width:0;width:100%;box-sizing:border-box}'
    + '.czwv-go{min-height:50px;border-radius:12px;border:0;background:var(--ink,#1d1a14);color:var(--card,#fff);font:inherit;font-size:16px;font-weight:700;cursor:pointer}.czwv-go:disabled{opacity:.6}'
    + '.czwv-m{margin:0;font-size:14px;font-weight:600;color:var(--ink-2)}.czwv-m:empty{display:none}.czwv-m.bad{color:var(--bad,#c0392b)}'
    + '.cz-wv-ab{display:inline-flex;align-items:center;font-style:normal;font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;background:color-mix(in srgb,var(--warn,#c98a1b) 22%,transparent);color:var(--ink)}';
  document.head.appendChild(css);

  function speichern(l, am, notiz) {
    if (demo()) return Promise.resolve({ ok: true });
    return fetch(api() + '/anfrage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), id: l.id, wiedervorlage: am || null, wv_notiz: notiz || '' }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: 'Keine Verbindung.' }; });
  }

  window.czWvFuellen = function (el, l) {
    if (!el || !l || !l.id) return;
    var gewaehlt = '', bearb = false;
    function zeichnen(meld, bad) {
      var f = window.czWvFaellig(l);
      if (l.wv_am && !bearb) {
        el.innerHTML = '<div class="czwv"><div class="czwv-ist' + (f ? ' heute' : '') + '"><div><b>' + (f === 'ueber' ? 'Überfällig seit ' : f === 'heute' ? 'Heute: ' : 'Erinnerung am ') + e(tagText(l.wv_am)) + '</b>' + (l.wv_notiz ? '<br><span>' + e(l.wv_notiz) + '</span>' : '') + '</div>'
          + '<div style="display:flex;gap:6px"><button type="button" data-wv="neu">Ändern</button><button type="button" data-wv="weg">' + (f ? 'Erledigt' : 'Löschen') + '</button></div></div><p class="czwv-m' + (bad ? ' bad' : '') + '" role="status">' + e(meld || '') + '</p></div>';
        return;
      }
      el.innerHTML = '<div class="czwv"><div class="czwv-ch">'
        + [['1', 'Morgen'], ['3', 'In 3 Tagen'], ['7', 'In 1 Woche'], ['14', 'In 2 Wochen'], ['30', 'In 1 Monat']].map(function (x) { return '<button type="button" data-wvt="' + x[0] + '"' + (gewaehlt === plus(+x[0]) ? ' class="an"' : '') + '>' + x[1] + '</button>'; }).join('')
        + '</div><input type="date" data-wv="datum" min="' + plus(1) + '" value="' + e(gewaehlt) + '" aria-label="Eigenes Datum">'
        + '<input data-wv="notiz" maxlength="200" placeholder="Worum geht es? (freiwillig, z. B. nachfragen wegen Angebot)">'
        + '<button type="button" class="czwv-go" data-wv="go">Erinnerung speichern</button><p class="czwv-m' + (bad ? ' bad' : '') + '" role="status">' + e(meld || '') + '</p></div>';
    }
    function senden(btn, am, notiz, ok) {
      if (btn) btn.disabled = true;
      speichern(l, am, notiz).then(function (j) {
        if (btn) btn.disabled = false;
        if (!j || !j.ok) { zeichnen((j && j.error) || 'Das hat nicht geklappt.', true); return; }
        l.wv_am = am || null; l.wv_notiz = am ? (notiz || null) : null;
        if (window.LEADS && LEADS[l.id]) { LEADS[l.id].wv_am = l.wv_am; LEADS[l.id].wv_notiz = l.wv_notiz; }
        (window.CZ_LEADS_ALL || []).forEach(function (x) { if (x.id === l.id && x !== l) { x.wv_am = l.wv_am; x.wv_notiz = l.wv_notiz; } });
        gewaehlt = ''; bearb = false;
        zeichnen(ok);
        try { window.dispatchEvent(new CustomEvent('cz-wv', { detail: { id: l.id } })); } catch (x) {}
      });
    }
    el.onclick = function (ev) {
      var t = ev.target.closest('[data-wvt]');
      if (t) { gewaehlt = plus(+t.getAttribute('data-wvt')); var n = el.querySelector('[data-wv="notiz"]'), nv = n ? n.value : ''; zeichnen(); var n2 = el.querySelector('[data-wv="notiz"]'); if (n2) n2.value = nv; return; }
      var b = ev.target.closest('[data-wv]'); if (!b || b.tagName === 'INPUT') return;
      var w = b.getAttribute('data-wv');
      if (w === 'neu') { gewaehlt = String(l.wv_am).slice(0, 10); bearb = true; zeichnen(); var n3 = el.querySelector('[data-wv="notiz"]'); if (n3) n3.value = l.wv_notiz || ''; return; }
      if (w === 'weg') { senden(b, null, '', 'Erinnerung entfernt.'); return; }
      if (w === 'go') {
        var d = el.querySelector('[data-wv="datum"]').value || gewaehlt;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < heute()) { zeichnen('Bitte einen Tag wählen.', true); return; }
        senden(b, d, el.querySelector('[data-wv="notiz"]').value.trim(), 'Gespeichert. Am ' + tagText(d) + ' ab 8 Uhr kommt eine Push-Nachricht und eine Mail.');
      }
    };
    el.oninput = function (ev) { if (ev.target.getAttribute('data-wv') === 'datum') { gewaehlt = ev.target.value; Array.prototype.forEach.call(el.querySelectorAll('[data-wvt]'), function (x) { x.classList.toggle('an', plus(+x.getAttribute('data-wvt')) === gewaehlt); }); } };
    zeichnen();
  };
})();
