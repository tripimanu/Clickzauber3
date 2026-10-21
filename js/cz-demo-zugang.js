/* clickzauber — persönlicher Demo-Zugang (clickzauber.de/demo?z=CODE, lib/demo-zugang.js, sql/55).
   · Ohne gültigen Code zeigt die Demo nur „Dieser Zugang ist nicht mehr gültig.“ Ausnahmen: eingebettet
     (Startseite, Präsentation) und Geräte, auf denen die Vertrieb-Seite angemeldet ist.
   · Prüft alle 45 Sekunden nach: Wird der Zugang gesperrt, schließt sich die Demo sofort.
   · Hält fest, was angeklickt wird (nie, was eingetippt wird), zeigt Hinweise des Betreibers und die Frist.
   · „Nichts für mich?“ öffnet ein kurzes, ehrliches Feedback.
   · Link aus einer Gruppe (clickzauber.de/g/2001, seit 05.10.2026): sofort in eine eigene Demo, ohne Angaben.
     Nach gut anderthalb Minuten oder 15 Klicks bietet die Demo an, eine Nummer zu hinterlassen (höchstens dreimal). */
(function () {
  'use strict';
  if (!/[?&]demo=1/.test(location.search) || window.czZugangPruefen) return;
  var API = 'https://clickzauber-api.vercel.app/api', echt = window.fetch.bind(window);
  var eingebettet = /[?&]rahmen=1/.test(location.search) || window.self !== window.top;
  var STAND = null, WARTE = [];
  window.czZugangPruefen = function (cb) { if (STAND) cb(STAND); else WARTE.push(cb); };
  function bereit(j) { STAND = j; window.CZ_ZUGANG = j; WARTE.splice(0).forEach(function (f) { try { f(j); } catch (x) {} }); }
  if (eingebettet) { bereit({ ok: true, frei: true }); return; }

  var q = new URLSearchParams(location.search), z = String(q.get('z') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  try { if (z) sessionStorage.setItem('cz_demo_z', z); else z = sessionStorage.getItem('cz_demo_z') || ''; } catch (x) {}
  var admin = false; try { admin = !!localStorage.getItem('cz_admin_key'); } catch (x) {}
  window.czZugangCode = function () { return z; };
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  var css = document.createElement('style');
  css.textContent = ''
    + 'html.czz-warte body{visibility:hidden}'
    + 'html.czz-qr body>*:not(#czz-qrm){display:none!important}html.czz-qr body{background:#f0e9dc}#czz-qrm{background:#f0e9dc;align-items:flex-start;overflow:auto}#czz-qrm .czz-box{margin:auto 0;box-shadow:0 20px 60px -20px rgba(40,30,15,.35)}'
    + '.czz-box select{font:inherit;font-weight:400;font-size:16px;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line-2,#ccc);background:var(--panel-2,#faf8f4);color:inherit;min-height:46px}'
    + 'html.czz-zu body>*:not(#czz){display:none!important}html.czz-zu body{visibility:visible;background:#f4f1ea}'
    + '#czz{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;font:600 20px/1.4 system-ui,sans-serif;color:#1d1a14;text-align:center;text-wrap:balance}'
    + '.czz-frist{display:inline-flex;flex-wrap:wrap;gap:6px 10px;align-items:center}'
    + '.czz-frist button{font:inherit;font-weight:700;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer;min-height:32px}'
    + '.czz-pille{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:8500;max-width:calc(100% - 24px);padding:8px 16px;border-radius:999px;background:#1c1a14;color:#f4f1ea;font:500 13.5px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3)}'
    + '.czz-m{position:fixed;inset:0;z-index:9800;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(20,16,10,.6)}.czz-m[hidden]{display:none}'
    + '.czz-box{width:min(480px,100%);max-height:calc(100dvh - 36px);overflow:auto;box-sizing:border-box;background:var(--panel,#fff);color:var(--ink,#1d1a14);border-radius:20px;padding:22px 20px;box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:var(--fd,system-ui,sans-serif)}'
    + '.czz-box h2{margin:0 0 8px;font-size:21px;letter-spacing:-.01em;text-wrap:balance}.czz-box p{margin:0 0 14px;font-size:15px;line-height:1.5;color:var(--ink-2,#555);text-wrap:pretty}'
    + '.czz-box label{display:flex;flex-direction:column;gap:6px;margin:0 0 12px;font-size:14.5px;font-weight:600}'
    + '.czz-box textarea,.czz-box input{font:inherit;font-weight:400;font-size:16px;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line-2,#ccc);background:var(--panel-2,#faf8f4);color:inherit;min-height:46px;box-sizing:border-box}.czz-box textarea{resize:vertical;min-height:64px}.czz-box a{color:inherit}'
    + '.czz-kn{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}.czz-kn button{flex:1 1 140px;min-height:50px;border-radius:14px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;border:1.5px solid var(--line-2,#ccc);background:none;color:inherit}'
    + '.czz-kn .go{background:var(--accent,#2f6b4f);color:var(--on-accent,#fff);border-color:transparent}'
    + '.czz-msg{min-height:1.4em;font-size:14px;font-weight:600}.czz-msg.bad{color:var(--bad,#c0392b)}'
    + '.czz-wahl{display:flex;flex-direction:column;gap:10px;margin:4px 0 6px}.czz-wahl button{min-height:54px;border:0;border-radius:14px;background:var(--accent,#2f6b4f);color:var(--on-accent,#fff);font:inherit;font-weight:700;font-size:16px;cursor:pointer;padding:0 16px}'
    + '.czz-h{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9750;width:min(440px,calc(100% - 20px));box-sizing:border-box;padding:14px 16px;border-radius:16px;background:#fffdf8;color:#1d1a14;box-shadow:0 18px 50px rgba(0,0,0,.35);font:15px/1.45 system-ui,sans-serif}'
    + '.czz-h b{display:block;font-size:13px;color:#6b665c;margin-bottom:4px}.czz-h p{margin:0 0 10px;white-space:pre-wrap}'
    + '.czz-h button{min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#1c1a14;color:#fff;font:inherit;font-weight:700;cursor:pointer}';
  document.head.appendChild(css);

  function sperren() {
    window._czGesperrt = true;
    var h = document.documentElement; h.classList.remove('czz-warte'); h.classList.add('czz-zu');
    function zeig() { if (!document.body) { setTimeout(zeig, 30); return; } if (!$('czz')) { var d = document.createElement('div'); d.id = 'czz'; d.textContent = 'Dieser Zugang ist nicht mehr gültig.'; document.body.appendChild(d); } }
    zeig();
  }
  var GID = ''; try { GID = localStorage.getItem('cz_demo_g') || ''; if (!GID) { GID = (Math.random().toString(36) + Math.random().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 16); localStorage.setItem('cz_demo_g', GID); } } catch (x) {}
  /* QR-Code (clickzauber.de/q/1005): erst Branche und Angaben, dann entsteht eine eigene Demo mit eigenem Code */
  var QR = String(q.get('qr') || '').replace(/\D/g, '');
  if (QR && !q.get('z')) { qrStart(QR); return; }
  if (!z) { if (admin) bereit({ ok: true, frei: true }); else sperren(); return; }

  document.documentElement.classList.add('czz-warte');
  var ERST = true; try { ERST = !sessionStorage.getItem('cz_demo_da_' + z); sessionStorage.setItem('cz_demo_da_' + z, '1'); } catch (x) {}
  echt(API + '/demo-zugang?z=' + encodeURIComponent(z) + (ERST ? '' : '&poll=1') + '&g=' + encodeURIComponent(GID)).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.ok) { sperren(); return; }
    document.documentElement.classList.remove('czz-warte');
    bereit(j); start(j);
  }).catch(function () {
    sperren(); var d = $('czz'); if (d) d.textContent = 'Der Zugang lässt sich gerade nicht prüfen. Bitte laden Sie die Seite neu.';
  });

  function qrWeiter(code, br) {
    try { sessionStorage.setItem('cz_demo_z', code); } catch (x) {}
    location.replace(location.pathname + '?demo=1&z=' + encodeURIComponent(code) + '&branche=' + encodeURIComponent(br || 'friseur'));
  }
  function qrStart(nr) {
    var h = document.documentElement; h.classList.add('czz-qr');
    echt(API + '/demo-zugang?qr=' + nr + '&g=' + encodeURIComponent(GID)).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok && j.code) { qrWeiter(j.code, j.branche); return; }
      if (!j || !j.ok) { h.classList.remove('czz-qr'); sperren(); return; }
      if (j.art === 'link') { linkStart(nr, j.branche); return; }
      (function warte() { if (!document.body) { setTimeout(warte, 30); return; } qrForm(nr, j.branche); })();
    }).catch(function () { h.classList.remove('czz-qr'); sperren(); var d = $('czz'); if (d) d.textContent = 'Keine Verbindung. Bitte laden Sie die Seite neu.'; });
  }
  /* Link aus einer Gruppe: sofort in die Demo. Die Branche nur fragen, wenn der Link keine vorgibt. */
  function linkStart(nr, br) {
    if (br !== 'wahl') { linkLos(nr, br); return; }
    (function warte() {
      if (!document.body) { setTimeout(warte, 30); return; }
      var O = [['friseur', 'Friseur & Barbier'], ['kosmetik', 'Kosmetik, Nägel, Wimpern'], ['catering', 'Food Truck, Catering, Foto, DJ'], ['hochzeit', 'Hochzeit, Location, Events'], ['handwerk', 'Handwerk, Solar, Wärmepumpe'], ['beratung', 'Makler, Finanzen, Beratung']];
      var m = modal('czz-qrm', '<h2>Für welche Branche?</h2><p>Dann sehen Sie das passende Beispiel. Eine Anmeldung ist nicht nötig.</p><div class="czz-wahl">'
        + O.map(function (o) { return '<button type="button" data-czzbr="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div><p class="czz-msg" id="czz-am" role="status"></p>');
      m.setAttribute('data-pflicht', '1');
      m.addEventListener('click', function (ev) {
        var b = ev.target.closest && ev.target.closest('[data-czzbr]'); if (!b) return;
        [].forEach.call(m.querySelectorAll('[data-czzbr]'), function (x) { x.disabled = true; });
        $('czz-am').textContent = 'Das Beispiel öffnet sich …';
        linkLos(nr, b.getAttribute('data-czzbr'));
      });
    })();
  }
  function linkLos(nr, br) {
    echt(API + '/demo-zugang', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ qr: nr, g: GID, aktion: 'link-start', branche: br }) })
      .then(function (r) { return r.json(); }).catch(function () { return null; }).then(function (j) {
        if (j && j.ok && j.code) { qrWeiter(j.code, j.branche); return; }
        var m = $('czz-qrm'); if (m) m.hidden = true;
        document.documentElement.classList.remove('czz-qr'); sperren();
        var x = $('czz'); if (x) x.textContent = j && j.error === 'voll' ? 'Dieser Link ist gerade nicht mehr frei.' : (j && j.hinweis) || 'Das hat nicht geklappt. Bitte laden Sie die Seite neu.';
      });
  }
  function qrForm(nr, br) {
    var O = [['friseur', 'Friseur & Barbier'], ['kosmetik', 'Kosmetik, Nägel, Wimpern'], ['catering', 'Food Truck, Catering, Foto, DJ'], ['hochzeit', 'Hochzeit, Location, Events'], ['handwerk', 'Handwerk, Solar, Wärmepumpe'], ['beratung', 'Makler, Finanzen, Beratung']];
    var m = modal('czz-qrm', '<h2>clickzauber 7 Tage kostenlos ausprobieren</h2>'
      + '<p>Sie bekommen Ihre eigene Demo. Probieren Sie alles selbst aus: Formular bauen, Anfrage schicken, Termin annehmen. Bitte tragen Sie zuerst kurz ein, wer Sie sind.</p>'
      + '<label>Ihre Branche *<select id="czz-br">' + O.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === br ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>'
      + '<label>Name Ihres Betriebs *<input id="czz-be" maxlength="80" autocomplete="organization"></label>'
      + '<label>Vorname *<input id="czz-vn" maxlength="60" autocomplete="given-name"></label>'
      + '<label>Nachname *<input id="czz-nn" maxlength="60" autocomplete="family-name"></label>'
      + '<label>Telefonnummer *<input id="czz-tel" type="tel" maxlength="40" autocomplete="tel" inputmode="tel"></label>'
      + '<label style="flex-direction:row;align-items:flex-start;gap:10px;font-weight:500"><input type="checkbox" id="czz-vt" style="min-height:0;width:22px;height:22px;flex:0 0 22px;margin:1px 0 0"><span>Ich behandle diese Demo vertraulich und gebe den Link, die Inhalte und die Ideen nicht an Dritte weiter. *</span></label>'
      + '<label style="flex-direction:row;align-items:flex-start;gap:10px;font-weight:500"><input type="checkbox" id="czz-ok" style="min-height:0;width:22px;height:22px;flex:0 0 22px;margin:1px 0 0"><span>Ich bin einverstanden, dass Manuel Tripi meinen Namen, meine Telefonnummer und meine Klicks in der Demo sieht. 30 Tage nach Ende der Demo wird alles gelöscht. *</span></label>'
      + '<p>So kann ich Ihre Fragen gezielt beantworten. Was Sie in Felder eintippen, sehe ich nicht. Sie können jederzeit widerrufen, eine Nachricht an mich genügt. Dann lösche ich alles sofort. Mehr in der <a href="datenschutz.html#demo-feedback" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>'
      + '<p class="czz-msg" id="czz-am" role="status"></p>'
      + '<div class="czz-kn"><button type="button" class="go" id="czz-los">Demo starten</button></div>');
    m.setAttribute('data-pflicht', '1');
    $('czz-los').onclick = function () {
      var b = this, v = function (i) { return ($(i).value || '').trim(); }, am = $('czz-am');
      var d = { qr: nr, g: GID, aktion: 'qr-start', branche: $('czz-br').value, betrieb: v('czz-be'), vorname: v('czz-vn'), nachname: v('czz-nn'), telefon: v('czz-tel'), vertraulich: $('czz-vt').checked, einverstanden: $('czz-ok').checked };
      var fehlt = d.betrieb.length < 2 ? ['czz-be', 'Bitte den Namen Ihres Betriebs eintragen.'] : d.vorname.length < 2 ? ['czz-vn', 'Bitte Vor- und Nachnamen eintragen.'] : d.nachname.length < 2 ? ['czz-nn', 'Bitte Vor- und Nachnamen eintragen.']
        : d.telefon.replace(/\D/g, '').length < 7 ? ['czz-tel', 'Bitte eine gültige Telefonnummer eintragen.'] : !d.vertraulich ? ['czz-vt', 'Bitte bestätigen Sie die Vertraulichkeit.'] : !d.einverstanden ? ['czz-ok', 'Bitte bestätigen Sie, dass Sie einverstanden sind.'] : null;
      if (fehlt) { am.className = 'czz-msg bad'; am.textContent = fehlt[1]; $(fehlt[0]).focus(); return; }
      b.disabled = true; am.className = 'czz-msg'; am.textContent = 'Ihre Demo wird eingerichtet …';
      echt(API + '/demo-zugang', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(d) }).then(function (r) { return r.json(); }).catch(function () { return null; }).then(function (j) {
        if (j && j.ok && j.code) { qrWeiter(j.code, j.branche); return; }
        b.disabled = false;
        if (j && j.error === 'voll') { m.hidden = true; document.documentElement.classList.remove('czz-qr'); sperren(); return; }
        am.className = 'czz-msg bad'; am.textContent = (j && j.hinweis) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.';
      });
    };
  }

  /* ── Klicks festhalten ── */
  var SITZ = Math.random().toString(36).slice(2, 10), BUF = [];
  function seite() { return /editor/.test(location.pathname) ? 'Konfigurator' : 'Cockpit'; }
  function ansicht() { var v = document.querySelector('.view.on'); return seite() + (v && v.getAttribute('data-v') ? ' · ' + v.getAttribute('data-v') : ''); }
  function txt(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 90); }
  var KL = 0;
  function merk(a, w) { if (!w || window._czGesperrt) return; if (a === 'k') KL++; BUF.push({ t: Date.now(), a: a, w: txt(w), s: ansicht() }); if (BUF.length >= 60) senden(); }
  window.czDemoMerk = function (w) { merk('x', w); };
  function post(d, beacon) {
    d.z = z; var b = JSON.stringify(d);
    if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(API + '/demo-zugang', new Blob([b], { type: 'text/plain' }))) return Promise.resolve({ ok: true }); } catch (x) {} }
    return echt(API + '/demo-zugang', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: b }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
  }
  function senden(beacon) { if (!BUF.length || !STAND || !STAND.ok) return; post({ aktion: 'klicks', sitzung: SITZ, e: BUF.splice(0, 120) }, beacon); }
  function name(el) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
      if (el.type === 'checkbox' || el.type === 'radio') { var lb = el.closest('label'); return (el.checked ? 'Angehakt: ' : 'Abgehakt: ') + txt(lb ? lb.textContent : el.name || el.id); }
      var l = el.closest('label'); return 'Feld angetippt: ' + txt(el.getAttribute('aria-label') || el.placeholder || (l && l.textContent) || el.name || el.id || el.type);
    }
    return el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.id || '';
  }
  function start(j) {
    merk('s', seite() + ' geöffnet');
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest && ev.target.closest('button,a,[role="button"],[data-view],summary,label,input,select,textarea,.kv-d,.kv-e,.wrow,[data-bid],[data-kvtag]');
      if (!el || el.closest('#czz-fb,#czz-willk,#czz-fr,#czz-ende,#czz-kt,.czz-h')) return;
      if (el.tagName === 'LABEL' && el.querySelector('input,select,textarea')) return;
      merk('k', name(el));
    }, true);
    (function warte(n) {
      if (typeof window.show === 'function' && !window.show._czz) { var alt = window.show; window.show = function (v) { var r = alt.apply(this, arguments); merk('v', 'Bereich: ' + v); return r; }; window.show._czz = 1; return; }
      if (n < 40) setTimeout(function () { warte(n + 1); }, 250);
    })(0);
    setInterval(senden, 8000);
    window.addEventListener('pagehide', function () { merk('s', seite() + ' verlassen'); senden(true); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) senden(true); else poll(); });
    frist(j); willkommen(j); hinweise(j.hinweise); ende(j);
    setInterval(poll, 45000);
  }
  function poll() {
    echt(API + '/demo-zugang?poll=1&z=' + encodeURIComponent(z)).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { senden(true); sperren(); return; }
      STAND = j; window.CZ_ZUGANG = j; hinweise(j.hinweise);
      var f = document.querySelector('[data-czz-tage]'); if (f) f.textContent = tageText(j);
    }).catch(function () {});
  }

  /* ── Frist und „Nichts für mich?“ ── */
  function tageText(j) { return j.tage <= 1 ? 'noch heute' : 'noch ' + j.tage + ' Tage'; }
  function frist(j) {
    var h = '<span>Persönlicher Zugang für <b>' + esc(j.betrieb) + '</b>, <span data-czz-tage>' + tageText(j) + '</span></span><button type="button" data-czz="frage">Frage an Manuel</button><button type="button" data-czz="nein">Nichts für mich?</button>';
    var n = 0;
    (function rein() {
      var t = document.querySelector('#czd .czd-t');
      if (t) { var s = document.createElement('span'); s.className = 'czz-frist'; s.innerHTML = ' · ' + h; t.appendChild(s); return; }
      if (seite() === 'Konfigurator' || n++ > 40) { var p = document.createElement('div'); p.className = 'czz-pille czz-frist'; p.innerHTML = h; document.body.appendChild(p); return; }
      setTimeout(rein, 250);
    })();
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-czz="nein"],[data-czz="frage"]'); if (!b) return;
    ev.preventDefault(); if (b.getAttribute('data-czz') === 'frage') frage(); else feedback();
  });
  function frage() {
    merk('x', '„Frage an Manuel“ geöffnet');
    var wo = ansicht();
    var m = modal('czz-fr', '<h2>Frage an Manuel</h2><p>Ihre Frage kommt sofort bei mir auf dem Handy an. Ich antworte hier in der Demo oder rufe Sie an.</p>'
      + '<label>Ihre Frage<textarea id="czz-frt" maxlength="1000"></textarea></label><p class="czz-msg" id="czz-frm" role="status"></p>'
      + '<div class="czz-kn"><button type="button" class="go" data-czz="fsenden">Senden</button><button type="button" data-czz="zu">Abbrechen</button></div>');
    setTimeout(function () { var t = $('czz-frt'); if (t) t.focus(); }, 60);
    m.querySelector('[data-czz="fsenden"]').onclick = function () {
      var b = this, t = ($('czz-frt').value || '').trim(), fm = $('czz-frm');
      if (t.length < 3) { fm.className = 'czz-msg bad'; fm.textContent = 'Bitte schreiben Sie Ihre Frage.'; return; }
      b.disabled = true; fm.className = 'czz-msg'; fm.textContent = 'Wird gesendet …';
      post({ aktion: 'frage', text: t, seite: wo }).then(function (j) {
        b.disabled = false;
        if (!j || !j.ok) { fm.className = 'czz-msg bad'; fm.textContent = (j && j.hinweis) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.'; return; }
        modal('czz-fr', '<h2>Frage ist angekommen.</h2><p>Ich melde mich so schnell wie möglich. Die Antwort erscheint oben in der Demo.</p><div class="czz-kn"><button type="button" class="go" data-czz="zu">Weiter ausprobieren</button></div>');
      });
    };
  }

  /* Letzter Tag: einmal fragen, ob er clickzauber nutzen möchte */
  function ende(j) {
    if (!(j.tage <= 1) || !j.angemeldet) return;
    var k = 'cz_demo_ende_' + z; try { if (localStorage.getItem(k)) return; } catch (x) {}
    setTimeout(function () {
      try { localStorage.setItem(k, '1'); } catch (x) {}
      merk('x', 'Frage zum Ende der Demo angezeigt');
      var m = modal('czz-ende', '<h2>Ihre Demo endet heute</h2><p>Möchten Sie clickzauber für Ihren Betrieb nutzen? Als Pilotkunde ist es bis zum offiziellen Start kostenlos, danach gilt für Sie lebenslang ein Rabatt.</p>'
        + '<p class="czz-msg" id="czz-em" role="status"></p>'
        + '<div class="czz-kn"><button type="button" class="go" data-czz="ja">Ja, ich möchte es nutzen</button><button type="button" data-czz="fbende">Nichts für mich</button></div>'
        + '<div class="czz-kn"><button type="button" data-czz="zu">Später</button></div>');
      m.querySelector('[data-czz="fbende"]').onclick = function () { feedback(); };
      m.querySelector('[data-czz="ja"]').onclick = function () {
        var b = this, em = $('czz-em'); b.disabled = true; em.className = 'czz-msg'; em.textContent = 'Einen Moment …';
        post({ aktion: 'interesse' }).then(function (r) {
          b.disabled = false;
          if (!r || !r.ok) { em.className = 'czz-msg bad'; em.textContent = 'Das hat nicht geklappt. Bitte noch einmal versuchen.'; return; }
          modal('czz-ende', '<h2>Schön, dass Sie dabei sind.</h2><p>Ich melde mich in Kürze bei Ihnen und richte alles mit Ihnen ein.</p><div class="czz-kn"><button type="button" class="go" data-czz="zu">Schließen</button></div>');
        });
      };
    }, 4000);
  }
  /* Demo aus einem Link: keine Pflichtangaben. Nach gut anderthalb Minuten oder 15 Klicks ein freundliches Angebot,
     eine Nummer zu hinterlassen. Höchstens dreimal je Demo, nie über einem anderen Fenster. */
  function kontaktSpaeter() {
    var n = 0; try { n = +localStorage.getItem('cz_demo_kt_' + z) || 0; } catch (x) {}
    if (n >= 3) return;
    var ab = Date.now(), t = setInterval(function () {
      if (STAND && STAND.angemeldet) { clearInterval(t); return; }
      if (document.hidden || document.querySelector('.czz-m:not([hidden])')) return;
      if (Date.now() - ab < 100e3 && KL < 15) return;
      clearInterval(t); kontaktKarte(n);
    }, 3000);
  }
  function kontaktKarte(n) {
    try { localStorage.setItem('cz_demo_kt_' + z, String(n + 1)); } catch (x) {}
    merk('x', 'Kontakt-Angebot angezeigt');
    modal('czz-kt', '<h2>Gefällt Ihnen das?</h2>'
      + '<p>Hinterlassen Sie Ihre Nummer. Ich melde mich und richte clickzauber mit Ihnen für Ihren Betrieb ein. Ihre Demo läuft 7 Tage weiter.</p>'
      + '<label>Name Ihres Betriebs *<input id="czz-be" maxlength="80" autocomplete="organization"></label>'
      + '<label>Vorname *<input id="czz-vn" maxlength="60" autocomplete="given-name"></label>'
      + '<label>Nachname *<input id="czz-nn" maxlength="60" autocomplete="family-name"></label>'
      + '<label>Telefonnummer *<input id="czz-tel" type="tel" maxlength="40" autocomplete="tel" inputmode="tel"></label>'
      + '<label style="flex-direction:row;align-items:flex-start;gap:10px;font-weight:500"><input type="checkbox" id="czz-ok" style="min-height:0;width:22px;height:22px;flex:0 0 22px;margin:1px 0 0"><span>Ich bin einverstanden, dass Manuel Tripi meine Angaben und meine Klicks in der Demo sieht und mich anruft. 30 Tage nach Ende der Demo wird alles gelöscht. *</span></label>'
      + '<p>Was Sie in Felder eintippen, sehe ich nicht. Mehr in der <a href="datenschutz.html#demo-feedback" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>'
      + '<p class="czz-msg" id="czz-am" role="status"></p>'
      + '<div class="czz-kn"><button type="button" class="go" id="czz-los">Nummer schicken</button><button type="button" data-czz="zu">Erst weiter ansehen</button></div>'
      + '<p style="margin:14px 0 0;font-size:14.5px"><a href="clickzauber-anmelden.html" target="_blank" rel="noopener" id="czz-selbst">Lieber gleich selbst ein Konto anlegen</a></p>');
    $('czz-selbst').onclick = function () { merk('x', 'Konto anlegen angetippt'); senden(true); };
    $('czz-los').onclick = function () {
      var b = this, v = function (i) { return ($(i).value || '').trim(); }, am = $('czz-am');
      var d = { aktion: 'anmelden', betrieb: v('czz-be'), vorname: v('czz-vn'), nachname: v('czz-nn'), telefon: v('czz-tel'), einverstanden: $('czz-ok').checked };
      var fehlt = d.betrieb.length < 2 ? ['czz-be', 'Bitte den Namen Ihres Betriebs eintragen.'] : d.vorname.length < 2 ? ['czz-vn', 'Bitte Vor- und Nachnamen eintragen.'] : d.nachname.length < 2 ? ['czz-nn', 'Bitte Vor- und Nachnamen eintragen.']
        : d.telefon.replace(/\D/g, '').length < 7 ? ['czz-tel', 'Bitte eine gültige Telefonnummer eintragen.'] : !d.einverstanden ? ['czz-ok', 'Bitte bestätigen Sie, dass Sie einverstanden sind.'] : null;
      if (fehlt) { am.className = 'czz-msg bad'; am.textContent = fehlt[1]; $(fehlt[0]).focus(); return; }
      b.disabled = true; am.className = 'czz-msg'; am.textContent = 'Einen Moment …';
      post(d).then(function (r) {
        b.disabled = false;
        if (!r || !r.ok) { am.className = 'czz-msg bad'; am.textContent = (r && r.hinweis) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.'; return; }
        if (STAND) STAND.angemeldet = true;
        modal('czz-kt', '<h2>Danke, ' + esc(d.vorname) + '!</h2><p>Ich melde mich in Kürze bei Ihnen. Bis dahin können Sie die Demo weiter ausprobieren.</p><div class="czz-kn"><button type="button" class="go" data-czz="zu">Weiter ansehen</button></div>');
      });
    };
  }
  function modal(id, html) {
    var m = $(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'czz-m'; document.body.appendChild(m); m.addEventListener('click', function (ev) { if (m.hasAttribute('data-pflicht')) return; if (ev.target === m || ev.target.closest('[data-czz="zu"]')) m.hidden = true; }); }
    m.innerHTML = '<div class="czz-box" role="dialog" aria-modal="true">' + html + '</div>'; m.hidden = false; return m;
  }
  function willkommen(j) {
    if (j.angemeldet) return;
    if (j.quelle === 'link') { kontaktSpaeter(); return; }
    var bis = new Date(j.laeuft_ab).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    /* Pflicht: ohne Vorname, Nachname und Telefon geht es nicht weiter. Das Fenster lässt sich nicht schließen. */
    var m = modal('czz-willk', '<h2>Willkommen bei clickzauber</h2>'
      + '<p>Ihr persönlicher Zugang für <b>' + esc(j.betrieb) + '</b> zur Beta. Er gilt bis ' + esc(bis) + '. Bitte tragen Sie zuerst kurz ein, wer Sie sind.</p>'
      + '<label>Vorname *<input id="czz-vn" maxlength="60" autocomplete="given-name" required></label>'
      + '<label>Nachname *<input id="czz-nn" maxlength="60" autocomplete="family-name" required></label>'
      + '<label>Telefonnummer *<input id="czz-tel" type="tel" maxlength="40" autocomplete="tel" inputmode="tel" required></label>'
      + '<label style="flex-direction:row;align-items:flex-start;gap:10px;font-weight:500"><input type="checkbox" id="czz-vt" style="min-height:0;width:22px;height:22px;flex:0 0 22px;margin:1px 0 0"><span>Ich behandle diese Demo vertraulich und gebe den Link, die Inhalte und die Ideen nicht an Dritte weiter. *</span></label>'
      + '<label style="flex-direction:row;align-items:flex-start;gap:10px;font-weight:500"><input type="checkbox" id="czz-ok" style="min-height:0;width:22px;height:22px;flex:0 0 22px;margin:1px 0 0"><span>Ich bin einverstanden, dass Manuel Tripi meinen Namen, meine Telefonnummer und meine Klicks in der Demo sieht. 30 Tage nach Ende der Demo wird alles gelöscht. *</span></label>'
      + '<p>So kann ich Ihre Fragen gezielt beantworten. Was Sie in Felder eintippen, sehe ich nicht. Sie können jederzeit widerrufen, eine Nachricht an mich genügt. Dann lösche ich alles sofort. Mehr in der <a href="datenschutz.html#demo-feedback" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>'
      + '<p class="czz-msg" id="czz-am" role="status"></p>'
      + '<div class="czz-kn"><button type="button" class="go" id="czz-los">Demo starten</button></div>');
    m.setAttribute('data-pflicht', '1');
    setTimeout(function () { var f = $('czz-vn'); if (f) f.focus(); }, 80);
    $('czz-los').onclick = function () {
      var b = this, v = function (i) { return ($(i).value || '').trim(); }, am = $('czz-am');
      var d = { aktion: 'anmelden', vorname: v('czz-vn'), nachname: v('czz-nn'), telefon: v('czz-tel'), vertraulich: $('czz-vt').checked, einverstanden: $('czz-ok').checked };
      var fehlt = d.vorname.length < 2 ? 'czz-vn' : d.nachname.length < 2 ? 'czz-nn' : d.telefon.replace(/\D/g, '').length < 7 ? 'czz-tel' : !d.vertraulich ? 'czz-vt' : !d.einverstanden ? 'czz-ok' : '';
      if (fehlt) { am.className = 'czz-msg bad'; am.textContent = fehlt === 'czz-tel' ? 'Bitte eine gültige Telefonnummer eintragen.' : fehlt === 'czz-vt' ? 'Bitte bestätigen Sie die Vertraulichkeit.' : fehlt === 'czz-ok' ? 'Bitte bestätigen Sie, dass Sie einverstanden sind.' : 'Bitte Vor- und Nachnamen eintragen.'; $(fehlt).focus(); return; }
      b.disabled = true; am.className = 'czz-msg'; am.textContent = 'Einen Moment …';
      post(d).then(function (r) {
        b.disabled = false;
        if (!r || !r.ok) { am.className = 'czz-msg bad'; am.textContent = (r && r.hinweis) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.'; return; }
        STAND.angemeldet = true; m.removeAttribute('data-pflicht'); m.hidden = true;
      });
    };
  }
  function feedback() {
    merk('x', '„Nichts für mich?“ geöffnet');
    var m = modal('czz-fb', '<h2>Ehrlich gesagt: Was passt nicht?</h2><p>Jede Antwort hilft mir, auch eine kurze. Alle Fragen sind freiwillig.</p>'
      + '<label>Was hat Ihnen nicht gefallen?<textarea id="czz-f1" maxlength="2000"></textarea></label>'
      + '<label>Warum würden Sie clickzauber nicht nutzen?<textarea id="czz-f2" maxlength="2000"></textarea></label>'
      + '<label>Was müsste anders sein, damit Sie es nutzen?<textarea id="czz-f3" maxlength="2000"></textarea></label>'
      + '<label>Was war gut?<textarea id="czz-f4" maxlength="2000"></textarea></label>'
      + '<p class="czz-msg" id="czz-fm" role="status"></p>'
      + '<div class="czz-kn"><button type="button" class="go" data-czz="senden">Abschicken</button><button type="button" data-czz="zu">Weiter ausprobieren</button></div>');
    m.querySelector('[data-czz="senden"]').onclick = function () {
      var b = this, v = function (i) { return ($(i).value || '').trim(); }, fm = $('czz-fm');
      var d = { aktion: 'feedback', schlecht: v('czz-f1'), warum: v('czz-f2'), anders: v('czz-f3'), gut: v('czz-f4') };
      if (!d.schlecht && !d.warum && !d.anders && !d.gut) { fm.className = 'czz-msg bad'; fm.textContent = 'Bitte beantworten Sie mindestens eine Frage.'; return; }
      b.disabled = true; fm.className = 'czz-msg'; fm.textContent = 'Wird gesendet …';
      post(d).then(function (j) {
        b.disabled = false;
        if (!j || !j.ok) { fm.className = 'czz-msg bad'; fm.textContent = (j && j.hinweis) || 'Das hat nicht geklappt. Bitte noch einmal versuchen.'; return; }
        modal('czz-fb', '<h2>Danke für Ihre Offenheit.</h2><p>Ihre Antworten sind bei mir angekommen. Sie können die Demo trotzdem weiter ausprobieren.</p><div class="czz-kn"><button type="button" class="go" data-czz="zu">Schließen</button></div>');
      });
    };
  }

  /* ── Hinweise des Betreibers ── */
  var GEZEIGT = {};
  function hinweise(l) {
    (l || []).forEach(function (h) {
      if (GEZEIGT[h.id]) return; GEZEIGT[h.id] = 1;
      var d = document.createElement('div'); d.className = 'czz-h'; d.setAttribute('role', 'status');
      d.innerHTML = '<b>Hinweis von Manuel</b><p>' + esc(h.text) + '</p><button type="button">Verstanden</button>';
      document.body.appendChild(d);
      try { if (navigator.vibrate) navigator.vibrate(80); } catch (x) {}
      merk('x', 'Hinweis angezeigt: ' + h.text);
      d.querySelector('button').onclick = function () { d.remove(); post({ aktion: 'gelesen', id: h.id }); };
    });
  }
})();
