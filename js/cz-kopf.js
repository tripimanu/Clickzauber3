/* Anmelde-Token und Betreiber-Schlüssel nicht in Adressen (seit 15.10.2026).
   Viele Abfragen an die API hängen ?token=… oder ?key=… an die Adresse. Adressen landen in den Protokollen von Vercel.
   Dieses Skript schiebt beides vor dem Senden in Kopfzeilen (Authorization: Bearer …, X-CZ-Key), ohne dass die
   einzelnen Stellen im Code sich ändern müssen. Der Server übernimmt sie in den Sammel-Funktionen (lib/_lib.js kopfNachQuery).
   Sicherung: Verschoben wird erst, wenn /api/status „kopf: true“ meldet, der Server es also versteht. Lehnt der Server
   trotzdem ab (401/403) oder kommt gar keine Antwort (Netzfehler, z. B. weil ein alter Server die Kopfzeile in der
   Vorabanfrage nicht erlaubt), kommt ein zweiter Versuch auf dem alten Weg. So geht nie eine Anmeldung verloren, egal in
   welcher Reihenfolge Server und Website hochgeladen werden.
   Einbinden im <head> vor allen anderen Skripten. */
(function () {
  if (window.czKopf || !window.fetch) return;
  window.czKopf = true;
  var orig = window.fetch.bind(window), MERK = 'cz_kopf_ok', ok = false, geprueft = {};
  try { ok = localStorage.getItem(MERK) === '1'; } catch (e) {}

  function pruefen(basis) {
    if (geprueft[basis]) return; geprueft[basis] = 1;
    orig(basis + '/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.kopf) { ok = true; try { localStorage.setItem(MERK, '1'); } catch (e) {} }
    }).catch(function () {});
  }

  window.fetch = function (input, init) {
    try {
      if (typeof input !== 'string' || !/[?&](token|key)=/.test(input)) return orig(input, init);
      var u = new URL(input, location.href), i = u.pathname.indexOf('/api/');
      if (i < 0) return orig(input, init);
      if (!ok) { pruefen(u.origin + u.pathname.slice(0, i + 4)); return orig(input, init); }
      var t = u.searchParams.get('token'), k = u.searchParams.get('key');
      if (!t && !k) return orig(input, init);
      var h = new Headers((init && init.headers) || {});
      if (t) { h.set('Authorization', 'Bearer ' + t); u.searchParams.delete('token'); }
      if (k) { h.set('X-CZ-Key', k); u.searchParams.delete('key'); }
      // Zweiter Versuch auf dem alten Weg. Klappt er, kann der Server die Kopfzeilen nicht (mehr): Merker weg.
      var alterWeg = function () {
        return orig(input, init).then(function (r2) {
          if (r2.ok) { ok = false; try { localStorage.removeItem(MERK); } catch (e) {} }
          return r2;
        });
      };
      return orig(u.toString(), Object.assign({}, init || {}, { headers: h })).then(function (r) {
        return r.status === 401 || r.status === 403 ? alterWeg() : r;
      }, alterWeg);   // Netzfehler: Ein alter Server lehnt die Kopfzeile schon in der Vorabanfrage ab (CORS), dann kommt gar keine Antwort.
    } catch (e) { return orig(input, init); }
  };
})();
