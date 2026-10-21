/* clickzauber — Hinweis während einer Wartung (Schalter: Plattform → Überblick, lib/status.js).
   Das Formular für die Gäste läuft weiter; nur Speichern ist kurz gesperrt.
   Seit 08.10.2026: prüft alle 20 Sekunden (und sofort beim Zurückholen), zeigt beim Start einmal ein Fenster
   und solange die Wartung läuft einen Streifen oben. Ist sie vorbei, kommt kurz „Wartung beendet“. */
(function () {
  if (window.czWartungAn) return; window.czWartungAn = 1;
  var API = window.API || 'https://clickzauber-api.vercel.app/api', bar = null, dlg = null, LIEF = false, K = 'cz_wartung_gesehen';
  function satz(j) { return 'Kurze Wartung' + (j.text ? ' (' + j.text + ')' : '') + '. Ihr Formular nimmt weiter Anfragen an. Speichern geht in wenigen Minuten wieder.'; }
  function kurz(t) {
    var x = document.createElement('div'); x.setAttribute('role', 'status'); x.textContent = t;
    x.style.cssText = 'position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;max-width:min(92vw,460px);padding:12px 18px;border-radius:14px;background:#2f7d59;color:#fff;font:600 14.5px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.25);text-align:center';
    document.body.appendChild(x); setTimeout(function () { x.remove(); }, 5000);
  }
  function fenster(j) {
    var s = String(j.seit || 'an');
    try { if (localStorage.getItem(K) === s) return; localStorage.setItem(K, s); } catch (e) {}
    if (dlg) return;
    dlg = document.createElement('div'); dlg.id = 'cz-wartung-fenster';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(20,16,10,.5)';
    dlg.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="czw-t" style="width:100%;max-width:400px;background:#fffdf8;color:#211d16;border-radius:20px;padding:24px 22px 20px;box-shadow:0 30px 80px rgba(0,0,0,.35);font:15px/1.55 system-ui,-apple-system,sans-serif">'
      + '<div style="width:44px;height:44px;border-radius:12px;background:#f6e3dc;color:#a8543c;display:grid;place-items:center;margin-bottom:12px"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/></svg></div>'
      + '<h2 id="czw-t" style="margin:0 0 6px;font-size:19px;letter-spacing:-.01em">Kurze Wartung</h2>'
      + '<p style="margin:0;color:#5f584a">' + (j.text ? 'Hinweis: ' + String(j.text).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '. ' : '') + 'Wir spielen gerade eine Verbesserung ein. Ihr Formular nimmt in dieser Zeit ganz normal Anfragen an. Ändern und Speichern geht in wenigen Minuten wieder.</p>'
      + '<button type="button" style="margin-top:18px;width:100%;min-height:48px;border:0;border-radius:12px;background:#2f7d59;color:#fff;font:600 15px system-ui,-apple-system,sans-serif;cursor:pointer">Verstanden</button></div>';
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('button')) { dlg.remove(); dlg = null; } });
    document.body.appendChild(dlg);
  }
  function zeigen(j) {
    if (!j || !j.wartung) {
      if (bar) { bar.remove(); bar = null; } if (dlg) { dlg.remove(); dlg = null; }
      if (LIEF) kurz('Wartung beendet. Alles läuft wieder.');
      LIEF = false; return;
    }
    LIEF = true;
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'cz-wartung'; bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483000;background:#a8543c;color:#fff;font:600 14px/1.45 system-ui,-apple-system,sans-serif;text-align:center;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;box-shadow:0 4px 18px rgba(0,0,0,.18)';
      document.body.appendChild(bar);
    }
    bar.textContent = satz(j);
    fenster(j);
  }
  var LAEUFT = false;
  function holen() {
    if (LAEUFT || document.hidden) return; LAEUFT = true;
    fetch(API + '/status?_=' + Math.floor(Date.now() / 10000), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { LAEUFT = false; zeigen(j); }).catch(function () { LAEUFT = false; });
  }
  function start() { holen(); setInterval(holen, 20000); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) holen(); });
  window.addEventListener('focus', holen);
})();
