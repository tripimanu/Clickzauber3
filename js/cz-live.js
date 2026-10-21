/* clickzauber — Live-Schalter oben rechts im Cockpit.
   Ganz rechts der große grüne Schalter, links daneben Sprache und Zahnrad (js/cz-globus.js).
   Punkte und Missionen stehen unten rechts (js/cz-missionen.js).
   Gespeichert heißt noch nicht live: Ein neues Formular liegt als Entwurf auf dem Server (lib/save.js)
   und wird nicht ausgeliefert. Der Schalter schaltet es live. Der Server prüft, was noch fehlt:
   bestätigte E-Mail, Angaben, Datenschutz-Link, Tarif oder Pilotplatz. Bezahlt wird erst jetzt.
   Seit 09.10.2026: Solange die Zahlung aus ist, kostet Live schalten nichts (user.kostenlos aus lib/profile.js), kein Tarif. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var st = document.createElement('style');
  st.textContent = '.czl-sw{position:fixed;top:13px;right:14px;z-index:70;display:flex;align-items:center;gap:10px;height:48px;padding:0 20px 0 8px;border:0;border-radius:999px;background:#1d7f54;color:#fff;font:inherit;font-family:var(--fd);font-size:16px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;cursor:pointer;box-shadow:0 10px 26px -8px rgba(15,70,45,.6)}'
    + '.czl-sw[hidden]{display:none}.czl-sw:hover{background:#196f49}.czl-sw:focus-visible{outline:3px solid #8ce3b6;outline-offset:2px}'
    + '.czl-knopf{position:relative;flex:0 0 auto;width:46px;height:30px;border-radius:999px;background:rgba(0,0,0,.28);transition:background .25s}'
    + '.czl-knopf i{position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .25s cubic-bezier(.2,.8,.2,1)}'
    + '.czl-sw.an .czl-knopf{background:#8ce3b6}.czl-sw.an .czl-knopf i{left:20px}'
    + '.czl-sw.laeuft{opacity:.8;cursor:progress}'
    + '.czl-p{position:fixed;top:74px;right:14px;z-index:72;width:min(400px,calc(100vw - 28px));max-height:calc(100vh - 96px);overflow:auto;display:flex;flex-direction:column;gap:10px;background:var(--panel);color:var(--ink);border:1px solid var(--line-2);border-radius:18px;padding:18px;box-shadow:0 18px 50px rgba(20,16,10,.28)}.czl-p[hidden]{display:none}'
    + '.czl-p.ok{border-color:var(--accent)}'
    + '.czl-p h2{margin:0;padding-right:38px;font-size:18px;line-height:1.3}.czl-p p{margin:0;font-size:15px;line-height:1.5;color:var(--ink-2);text-wrap:pretty}'
    + '.czl-zu{position:absolute;top:8px;right:8px;width:40px;height:40px;border:0;border-radius:10px;background:none;color:var(--ink-3);font-size:24px;line-height:1;cursor:pointer}'
    + '.czl-k{display:flex;flex-wrap:wrap;gap:8px;align-items:center}'
    + '.czl-go{min-height:50px;padding:0 20px;border:0;border-radius:14px;background:#1d7f54;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer}.czl-go:disabled{opacity:.6}'
    + '.czl-hell{min-height:48px;padding:0 16px;border:1.5px solid var(--line-2);border-radius:14px;background:none;color:var(--ink);font:inherit;font-size:15px;font-weight:600;cursor:pointer}'
    + '.czl-m{min-height:1.3em;font-size:14.5px;font-weight:600;color:var(--ink-2)}.czl-m:empty{display:none}.czl-m.bad{color:var(--bad)}'
    + '.czl-ds{display:flex;flex-wrap:wrap;gap:8px}.czl-ds input{flex:1 1 220px;min-width:0;min-height:52px;border-radius:12px;border:1.5px solid var(--line-2);background:var(--bg);color:var(--ink);font:inherit;font-size:16px;padding:0 14px}'
    + '@media(max-width:760px){.czl-sw{top:10px;right:12px;height:42px;gap:8px;padding:0 14px 0 6px;font-size:15px}.czl-knopf{width:40px;height:26px}.czl-knopf i{top:3px;left:3px;width:20px;height:20px}.czl-sw.an .czl-knopf i{left:17px}'
    + '.czl-p{top:62px;right:12px;width:calc(100vw - 24px)}'
    + 'body.czl-reihe .kopfleiste{padding-right:calc(var(--czl-platz,0px) + 8px)}body.czl-reihe .kopfleiste #kopf-titel,body.czl-reihe .kopfleiste .thm,body.czl-reihe .kopfleiste .sk[data-view="settings"]{display:none}}';
  document.head.appendChild(st);

  function demo() { return window.token === 'demo' || /[?&]demo=1/.test(location.search); }
  /* In der App (js/cz-native.js) wird nicht bezahlt und kein Preis gezeigt. Ohne Tarif: „Wir melden uns“, der Server schickt die Mail (lib/_app-freischalten.js). */
  function inApp() { return document.documentElement.classList.contains('cz-app') || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function appFertig() {
    feld('<h2>Fast geschafft.</h2><p>Ihr Formular ist gespeichert. Zum Freischalten melden wir uns bei Ihnen, meist noch am selben Tag.</p><p>Bis dahin können Sie alles einrichten und ausprobieren.</p>'
      + '<div class="czl-k"><button type="button" class="czl-go" data-czl="zu">Verstanden</button></div>');
  }
  function bezahlt() { var u = window.user || {}; return !!window._entw || !!u.pilot || !!u.kostenlos || u.plan_status === 'aktiv' || u.plan_status === 'gekündigt'; }
  function noetig() {
    if (demo()) return false;
    var ws = window.SRV_WIDGETS;
    if (!ws || !ws.length) return true;
    return ws.some(function (w) { return w.status && w.status !== 'live'; }) || !bezahlt();
  }
  function preisText() {
    if (inApp()) return '';
    var u = window.user || {};
    if (window._entw) return '';
    if (u.kostenlos) return 'Live schalten ist kostenlos.';
    if (u.pilot) return 'Als Pilotbetrieb zahlen Sie nichts.';
    if (u.plan_status === 'aktiv' || u.plan_status === 'gekündigt') return 'Ihr Tarif ist schon aktiv.';
    var p = u.stufe === 'service' ? '79 €' : (u.stufe === 'projekt' ? '199 €' : '');
    return 'Bezahlt wird erst ab dann' + (p ? ': ' + p + ' im Monat, monatlich kündbar.' : ', monatlich kündbar.');
  }

  /* ── Schalter ── */
  var SW = null;
  function schalter() {
    if (window._admin) {
      if (SW) SW.hidden = true;
      document.body.classList.remove('czl-reihe');
      if (window.czGlobusReihe) window.czGlobusReihe(0);
      return;
    }
    if (!SW) { SW = document.createElement('button'); SW.type = 'button'; SW.id = 'czl-sw'; SW.className = 'czl-sw'; SW.setAttribute('data-no-tr', ''); document.body.appendChild(SW); }
    var an = !noetig();
    SW.classList.toggle('an', an);
    SW.setAttribute('aria-pressed', an ? 'true' : 'false');
    SW.innerHTML = '<span class="czl-knopf" aria-hidden="true"><i></i></span><span>' + (an ? 'Live' : 'Live schalten') + '</span>';
    if (an) { SW.setAttribute('data-view', 'embed'); SW.removeAttribute('data-czl'); SW.title = 'Ihr Formular ist live. Hier finden Sie Link, QR-Code und Einbau-Code.'; }
    else { SW.removeAttribute('data-view'); SW.setAttribute('data-czl', 'go'); SW.title = 'Formular live schalten'; }
    SW.hidden = false;
    platz();
  }
  /* Sprache und Zahnrad rücken links neben den Schalter (js/cz-globus.js). */
  function platz() {
    if (!SW || SW.hidden) return;
    var k = innerWidth <= 760, rand = k ? 12 : 14, abst = k ? 8 : 10, knopf = k ? 42 : 48;
    var reihe = rand + SW.offsetWidth + abst;
    document.body.classList.add('czl-reihe');
    document.documentElement.style.setProperty('--czl-platz', (reihe + 2 * knopf + 2 * abst) + 'px');
    if (window.czGlobusReihe) window.czGlobusReihe(reihe);
  }
  addEventListener('resize', platz);

  /* ── Hinweisfeld unter dem Schalter ── */
  function feld(html, ok) {
    var b = $('czl-p');
    if (!b) { b = document.createElement('div'); b.id = 'czl-p'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Live schalten'); document.body.appendChild(b); }
    b.className = 'czl-p' + (ok ? ' ok' : '');
    b.innerHTML = '<button type="button" class="czl-zu" data-czl="zu" aria-label="Schließen">×</button>' + html + '<p class="czl-m" id="czl-m" role="status"></p>';
    b.hidden = false;
  }
  function feldZu() { var b = $('czl-p'); if (b) b.hidden = true; }
  function meldung(t, bad) {
    if (!$('czl-p') || $('czl-p').hidden) feld('<h2>Live schalten</h2>');
    var m = $('czl-m'); if (m) { m.textContent = t; m.className = 'czl-m' + (bad ? ' bad' : ''); }
  }
  function fertig() {
    feld('<h2>Ihr Formular ist live.</h2><p>Ab jetzt können Ihre Kunden anfragen. Teilen Sie den Link, zeigen Sie den QR-Code oder bauen Sie das Formular auf Ihrer Website ein.</p>'
      + '<div class="czl-k"><button type="button" class="czl-go" data-view="embed">Link, QR-Code und Einbau-Code</button><button type="button" class="czl-hell" data-czl="zu">Schließen</button></div>', true);
    schalter();
    try { if (window.buildWidgetSelect) buildWidgetSelect(); } catch (x) {}
    try { if (window.czMissionen) window.czMissionen(); } catch (x) {}
  }
  function ziel(z) { try { localStorage.setItem('cz_ziel', z); } catch (x) {} location.href = 'clickzauber-anmelden.html?ziel=' + z; }

  var LAEUFT = false;
  /* Wartet auf die E-Mail-Bestätigung. Bestätigt der Nutzer in einem anderen Tab (clickzauber-login.html
     setzt cz_bestaetigt) oder kommt er zu diesem Tab zurück, geht es von selbst weiter. */
  var WARTET = false, MANUELL = false, ZULETZT = 0;
  function wartet(an) { WARTET = an; try { if (an) localStorage.setItem('cz_live_wartet', '1'); else localStorage.removeItem('cz_live_wartet'); } catch (x) {} }
  function nachsehen() {
    if (!WARTET || LAEUFT || document.visibilityState !== 'visible' || Date.now() - ZULETZT < 3000) return;
    ZULETZT = Date.now(); go(false);
  }
  addEventListener('storage', function (ev) { if (ev.key === 'cz_bestaetigt') nachsehen(); });
  document.addEventListener('visibilitychange', nachsehen);
  addEventListener('focus', nachsehen);
  /* Startklar (seit 13.10.2026): Live erst, wenn Benachrichtigung, Datenschutzerklärung, AV-Vertrag und Löschfrist
     bestätigt sind (js/cz-bestaetigen.js). Jeder Punkt ist eine Mission mit Vertrauenspunkten (js/cz-missionen.js). */
  var PFLICHT = [
    ['mail', 'Benachrichtigung bestätigen', 'Adresse für neue Anfragen prüfen und bestätigen.'],
    ['datenschutz', 'Datenschutzerklärung bestätigen', 'Lesen, unten Haken setzen, bestätigen.'],
    ['av', 'Auftragsverarbeitungsvertrag abschließen', 'Pflicht nach Artikel 28 DSGVO. Lesen und unten abschließen.'],
    ['loeschfrist', 'Löschfrist bestätigen', 'Festlegen, wann alte Anfragen automatisch gelöscht werden.']
  ];
  var st2 = document.createElement('style');
  st2.textContent = '.czl-pf{display:flex;flex-direction:column;gap:8px;margin:12px 0 4px}.czl-pf button{display:flex;flex-direction:column;gap:2px;text-align:left;min-height:48px;padding:11px 13px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:12px;background:transparent;color:inherit;font:inherit;cursor:pointer}.czl-pf button:hover{border-color:#1d7f54}.czl-pf b{font-size:14.5px}.czl-pf span{font-size:13px;opacity:.78}';
  document.head.appendChild(st2);
  function pflichtOffen() {
    if (demo() || window._admin || typeof window.czBest !== 'function' || !window.EIN || !window.EIN.einstellungen) return [];
    return PFLICHT.filter(function (p) { return !window.czBest(p[0]); });
  }
  function pflichtZeigen(off) {
    feld('<h2>Fast startklar</h2><p>Bevor Ihr Formular live geht, ' + (off.length === 1 ? 'fehlt noch ein Punkt' : 'fehlen noch ' + off.length + ' Punkte') + '. Jeder bringt Vertrauenspunkte. Danach noch einmal auf „Live schalten“ tippen.</p>'
      + '<div class="czl-pf">' + off.map(function (p) { return '<button type="button" data-czl-best="' + p[0] + '"><b>' + e(p[1]) + '</b><span>' + e(p[2]) + '</span></button>'; }).join('') + '</div>'
      + '<div class="czl-k"><button type="button" class="czl-hell" data-czl="zu">Später</button></div>');
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#czl-p [data-czl-best]'); if (!b) return;
    feldZu();
    if (window.czBestaetigen) window.czBestaetigen(b.getAttribute('data-czl-best'));
  });
  function go(nachZahlung, versuch) {
    if (LAEUFT) return;
    var off = nachZahlung ? [] : pflichtOffen();
    if (off.length) { pflichtZeigen(off); return; }
    if (demo()) { feld('<h2>Das ist ein Beispiel.</h2><p>Hier ist das Formular schon live. In Ihrem eigenen Cockpit schalten Sie es mit diesem Schalter live, sobald Sie fertig sind.</p>'); return; }
    LAEUFT = true; if (SW) SW.classList.add('laeuft');
    meldung(versuch ? 'Die Zahlung wird bestätigt …' : 'Einen Moment …');
    fetch(API + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window.token, aktion: 'live', app: inApp() }) })
      .then(function (r) { return r.status === 404 ? { ok: false, error: 'api-fehlt' } : r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: 'offline' }; })
      .then(function (j) {
        LAEUFT = false; if (SW) SW.classList.remove('laeuft');
        var manuell = MANUELL; MANUELL = false;
        if (WARTET && (j.ok || /^(kein-formular|profil-fehlt|tarif-fehlt|datenschutz-fehlt|pflicht-offen)$/.test(j.error || ''))) wartet(false);
        if (j.ok) { (window.SRV_WIDGETS || []).forEach(function (w) { w.status = 'live'; }); fertig(); return; }
        if (j.error === 'kein-formular') {
          feld('<h2>Noch kein Formular gespeichert.</h2><p>Bauen Sie zuerst Ihr Formular und tippen Sie dort auf „Speichern“. Danach schalten Sie es hier live.</p><div class="czl-k"><button type="button" class="czl-go" data-czl="bauen">Formular bauen</button></div>');
          return;
        }
        if (j.error === 'profil-fehlt') { ziel('profil'); return; }
        if (j.error === 'tarif-fehlt') {
          /* Gerade bezahlt: Stripe meldet die Zahlung manchmal erst nach ein paar Sekunden. */
          if (nachZahlung && (versuch || 0) < 6) { meldung('Die Zahlung wird bestätigt …'); setTimeout(function () { go(true, (versuch || 0) + 1); }, 3000); return; }
          if (nachZahlung) { meldung('Die Zahlung ist noch nicht bestätigt. Tippen Sie in einer Minute noch einmal auf „Live schalten“.', true); return; }
          if (inApp()) { appFertig(); return; }
          ziel('plan'); return;
        }
        if (j.error === 'datenschutz-fehlt') { dsFragen(); return; }
        /* Seit 15.10.2026 prüft auch der Server, ob alles bestätigt ist. Dann dieselbe Liste wie oben. */
        if (j.error === 'pflicht-offen' && Array.isArray(j.offen)) {
          var offS = PFLICHT.filter(function (p) { return j.offen.indexOf(p[0]) >= 0; });
          if (offS.length) { pflichtZeigen(offS); return; }
        }
        if (j.error === 'nicht-bestaetigt') {
          var warSchon = WARTET; wartet(true);
          feld('<h2>Bitte bestätigen Sie Ihre E-Mail-Adresse.</h2><p>' + e(j.hinweis || 'Den Link haben wir Ihnen geschickt. Dorthin gehen später auch Ihre Anfragen.') + '</p><p>Danach geht es hier von selbst weiter.</p>'
            + '<div class="czl-k"><button type="button" class="czl-go" data-czl="go">Ich habe bestätigt, weiter</button><button type="button" class="czl-hell" data-czl="mail">Bestätigungs-E-Mail noch einmal senden</button></div>');
          if (warSchon && manuell) meldung('Die Bestätigung ist noch nicht angekommen. Tippen Sie in der E-Mail auf „E-Mail-Adresse bestätigen“.', true);
          return;
        }
        meldung(j.hinweis || (j.error === 'offline' || j.error === 'api-fehlt' ? 'Der Server ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.' : 'Das hat nicht geklappt. Bitte noch einmal versuchen.'), true);
      });
  }
  function dsFragen() {
    feld('<h2>Noch ein Punkt: Ihre Datenschutzerklärung</h2><p>Der Link steht im Formular unter dem Absenden-Knopf und ist Pflicht.</p>'
      + '<div class="czl-ds"><input type="url" id="czl-url" inputmode="url" placeholder="ihre-seite.de/datenschutz" autocomplete="url" aria-label="Link zur Datenschutzerklärung"><button type="button" class="czl-go" data-czl="ds">Speichern &amp; live schalten</button></div>'
      + '<div class="czl-k"><button type="button" class="czl-hell" data-czl="ohne">Ich habe keine Website</button></div>');
    var i = $('czl-url'); if (i) i.focus();
  }
  function dsSpeichern(v) {
    if (v !== 'clickzauber') {
      v = String(v || '').trim();
      if (v && !/^[a-z]+:\/\//i.test(v)) v = 'https://' + v;
      v = v.replace(/^http:\/\//i, 'https://');
      if (!/^https:\/\/[^\/\s]+\.[^\/\s]{2,}/i.test(v)) { meldung('Das sieht nicht wie eine Internetadresse aus. Beispiel: ihre-seite.de/datenschutz', true); return; }
    }
    meldung('Wird gespeichert …');
    fetch(API + '/einstellungen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window.token, datenschutz_url: v }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: 'Keine Verbindung.' }; })
      .then(function (j) {
        if (!j.ok) { meldung(j.error || 'Speichern hat nicht geklappt.', true); return; }
        try { if (window.einLaden) einLaden(); } catch (x) {}
        go(false);
      });
  }

  document.addEventListener('click', function (ev) {
    var p = $('czl-p');
    if (p && !p.hidden && ev.target.closest('#czl-p [data-view]')) { feldZu(); return; }
    var b = ev.target.closest('[data-czl]'); if (!b) return;
    var w = b.getAttribute('data-czl');
    if (w === 'go') { MANUELL = true; go(false); }
    else if (w === 'zu') feldZu();
    else if (w === 'ds') dsSpeichern(($('czl-url') || {}).value || '');
    else if (w === 'ohne') dsSpeichern('clickzauber');
    else if (w === 'bauen') location.href = 'clickzauber-editor.html?start=1';
    else if (w === 'mail') {
      b.disabled = true; b.textContent = 'Wird gesendet …';
      fetch(API + '/auth/bestaetigung-neu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: (window.user || {}).email }) })
        .catch(function () {}).then(function () { b.textContent = 'Gesendet. Bitte im Postfach nachsehen.'; });
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'czl-url') dsSpeichern(ev.target.value);
    if (ev.key === 'Escape') feldZu();
  });

  /* Start: nach dem Laden des Kontos. ?gespeichert=1 kommt aus dem Konfigurator,
     ?live=1 nach der Zahlung (&bezahlt=1) oder vom früheren Live-Knopf im Konfigurator. */
  var EINMAL = false;
  window.czLiveStart = function () {
    var app = $('app');
    if (!demo() && !window.user) return;
    if (app && getComputedStyle(app).display === 'none') return;
    schalter();
    if (EINMAL) return; EINMAL = true;
    var q = new URLSearchParams(location.search), live = q.get('live') === '1', bez = q.get('bezahlt') === '1', gesp = q.get('gespeichert') === '1';
    if (!live && !gesp) return;
    try { ['live', 'bezahlt', 'gespeichert'].forEach(function (k) { q.delete(k); }); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (x) {}
    if (window._admin || demo()) return;
    if (live && noetig()) { setTimeout(function () { go(bez, 0); }, 300); return; }
    if (live) { fertig(); return; }
    if (noetig()) {
      feld('<h2>Gespeichert.</h2><p>Ihr Formular ist noch nicht live. Wenn Sie bereit sind, tippen Sie oben rechts auf „Live schalten“. ' + e(preisText()) + '</p>'
        + '<div class="czl-k"><button type="button" class="czl-go" data-czl="go">Jetzt live schalten</button><button type="button" class="czl-hell" data-czl="zu">Später</button></div>');
    }
  };
  /* Das Skript lädt nachträglich. Ist das Konto noch nicht geladen, kurz danach noch einmal versuchen. */
  var VERSUCHE = 0;
  (function warten() { window.czLiveStart(); if (!SW && !window._admin && VERSUCHE++ < 40) setTimeout(warten, 500); })();
})();
