/* clickzauber — „Gast Bescheid geben“ nach jeder Entscheidung zu einer Anfrage ohne Uhrzeit-Termin (Locations).
   Bisher änderten „Annehmen“ und „Ablehnen“ in der Push-Karte, „Tag sperren“ und „Absage vormerken“ nur den Stand.
   Der Gast erfuhr nichts. Jetzt erscheint danach ein Kasten mit fertigem Text:
   · WhatsApp (mit Telefonnummer) · Per Mail senden (mit E-Mail, geht über /anfrage { antwort } aus clickzauber raus)
   · Nicht nötig. Arten: kontakt, absage, fest, storno. Gilt auch für Handwerk, Solar, Makler, Finanzen (body.art-pipeline).
   Aufruf: czBescheidBox(lead, art) → Element zum Einhängen. */
(function () {
  'use strict';
  if (window.czBescheidBox) return;
  var WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tok() { return (typeof token !== 'undefined' && token) || window.token || ''; }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function demo() { return tok() === 'demo' || /[?&]demo=1/.test(location.search); }
  function datum(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return ''; var d = new Date(+m[1], +m[2] - 1, +m[3]); return WT[d.getDay()] + ', ' + (+m[3]) + '.' + (+m[2]) + '.' + m[1]; }
  function betrieb() { var u = window.user || {}; return u.firma || [u.vorname, u.nachname].filter(Boolean).join(' ') || ''; }
  function waNr(t) { return window.czWaNr ? czWaNr(t) : String(t || '').replace(/\D/g, ''); }

  function texte(l, art) {
    var vn = String(l.name || '').split(/\s|&/)[0], d = datum(l.termin), hallo = 'Hallo' + (vn ? ' ' + vn : '') + ',\n\n', g = '\n\nViele Grüße' + (betrieb() ? '\n' + betrieb() : '');
    /* Handwerk, Solar, Makler, Finanzen: „Kunde“ und „Auftrag“ statt „Gast“ und „Feier“. */
    var pl = document.body.classList.contains('art-pipeline'), wer = pl ? 'Kunden' : 'Gast';
    if (art === 'kontakt') return { b: 'Ihre Anfrage' + (d ? ' für ' + d : ''), t: hallo + 'vielen Dank für Ihre Anfrage' + (d ? ' für ' + d : '') + '! Wir haben sie erhalten und melden uns in Kürze persönlich bei Ihnen.' + g, f: 'Dem ' + wer + ' sagen, dass sich jemand kümmert?' };
    if (art === 'absage') return { b: 'Ihre Anfrage' + (d ? ' für ' + d : ''), t: hallo + 'vielen Dank für Ihre Anfrage' + (d ? ' für ' + d : '') + '. ' + (pl ? 'Leider können wir diesen Auftrag nicht übernehmen. Danke für Ihr Interesse!' : 'Leider können wir Ihnen diesmal nicht zusagen. Wir wünschen Ihnen eine wunderschöne Feier!') + g, f: 'Dem ' + wer + ' absagen?' };
    if (art === 'fest') return pl
      ? { b: 'Ihr Auftrag ist bestätigt', t: hallo + 'vielen Dank für Ihren Auftrag! Wir haben ihn fest eingetragen und melden uns mit den nächsten Schritten.' + g, f: 'Dem Kunden den Auftrag bestätigen?' }
      : { b: 'Ihr Termin' + (d ? ' am ' + d : '') + ' ist fest', t: hallo + 'wunderbar: Ihr Termin' + (d ? ' am ' + d : '') + ' ist bei uns fest eingetragen. Der Tag ist für Sie reserviert. Wir freuen uns auf Sie!' + g, f: 'Dem Gast den Termin bestätigen?' };
    return { b: 'Ihre Absage' + (d ? ' für ' + d : ''), t: hallo + 'wir haben Ihre Absage' + (d ? ' für ' + d : '') + ' eingetragen. Schade, dass es nicht klappt. Alles Gute für Sie!' + g, f: 'Dem ' + wer + ' die Absage bestätigen?' };
  }

  var css = document.createElement('style');
  css.textContent = ''
    + '.czb{margin:12px 0 0;padding:14px;border-radius:14px;background:var(--panel-2,#f3efe6);display:flex;flex-direction:column;gap:8px;text-align:left}'
    + '.czb h4{margin:0;font-size:16px;line-height:1.3;color:var(--ink)}'
    + '.czb p{margin:0;font-size:14px;line-height:1.5;color:var(--ink-2);white-space:pre-line}'
    + '.czb a,.czb button{display:flex;align-items:center;justify-content:center;min-height:50px;border-radius:12px;border:0;font:inherit;font-size:16px;font-weight:700;text-decoration:none;cursor:pointer;padding:0 12px;text-align:center}'
    + '.czb .wa{background:#25d366;color:#fff}.czb .ml{background:var(--accent,#2f6b4f);color:#fff}.czb .nn{background:none;border:1.5px solid var(--line-2,#ddd);color:var(--ink-2);font-weight:600;min-height:44px}'
    + '.czb button:disabled{opacity:.6}.czb .m{font-weight:600}.czb .m.bad{color:var(--bad,#c0392b)}.czb .m.gut{color:var(--accent,#2f6b4f)}'
    + '.czb.fertig{background:none;padding:6px 0 0}';
  document.head.appendChild(css);

  window.czBescheidBox = function (l, art) {
    var x = texte(l || {}, art), tel = l.telefon || l.phone || '', n = waNr(tel), mail = l.email || '';
    var box = document.createElement('div'); box.className = 'czb';
    if (!n && !mail) { box.innerHTML = '<p class="m bad">' + e((l.name || 'Der Gast') + ' hat weder Telefonnummer noch E-Mail hinterlassen. Bitte selbst Bescheid geben.') + '</p>'; return box; }
    function malen() {
    box.innerHTML = '<h4>' + e(x.f) + '</h4><p>' + e(x.t) + '</p>'
      + (n ? '<a class="wa" target="_blank" rel="noopener" href="https://wa.me/' + e(n) + '?text=' + encodeURIComponent(x.t) + '">Per WhatsApp senden</a>' : '')
      + (mail ? '<button type="button" class="ml" data-czb="mail">Per Mail senden</button>' : '')
      + '<button type="button" class="nn" data-czb="nein">Nicht nötig</button><p class="m" role="status"></p>';
    }
    malen();
    /* Feste Termine: Link „Absagen oder anderen Tag wünschen“ (meine-anfrage.html) anhängen. */
    if ((art === 'fest' || art === 'kontakt') && !demo() && l.id) {
      fetch(api() + '/auftrag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aktion: 'gast-link', token: tok(), id: l.id }) })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (!j || !j.link || !box.querySelector('[data-czb="nein"]')) return;
          x.t = x.t.replace(/\n\nViele Grüße/, '\n\nFalls etwas dazwischenkommt, können Sie hier absagen oder einen anderen Tag wünschen: ' + j.link + '\n\nViele Grüße');
          malen();
        }).catch(function () {});
    }
    var m = { set className(v) { var q = box.querySelector('.m'); if (q) q.className = v; }, set textContent(v) { var q = box.querySelector('.m'); if (q) q.textContent = v; } };
    function fertig(t) { box.className = 'czb fertig'; box.innerHTML = '<p class="m gut">' + e(t) + '</p>'; }
    box.addEventListener('click', function (ev) {
      if (ev.target.closest('a.wa')) { setTimeout(function () { fertig('WhatsApp ist mit dem Text geöffnet. Bitte dort auf Senden tippen.'); }, 300); return; }
      var b = ev.target.closest('[data-czb]'); if (!b) return;
      if (b.getAttribute('data-czb') === 'nein') { box.remove(); return; }
      if (demo()) { fertig('Im Beispiel wird nichts gesendet. Echt geht jetzt eine Mail an ' + mail + '.'); return; }
      b.disabled = true; m.className = 'm'; m.textContent = 'Wird gesendet …';
      fetch(api() + '/anfrage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), id: l.id, antwort: x.t, betreff: x.b }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (j) { if (j && j.ok) fertig('Mail an ' + mail + ' ist raus.'); else { b.disabled = false; m.className = 'm bad'; m.textContent = (j && j.error) || 'Das hat nicht geklappt.'; } })
        .catch(function () { b.disabled = false; m.className = 'm bad'; m.textContent = 'Keine Verbindung.'; });
    });
    return box;
  };
})();
