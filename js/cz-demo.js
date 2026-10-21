/* clickzauber — Demo für Interessenten: clickzauber.de/demo?branche=catering
   (.htaccess leitet auf clickzauber-cockpit-live.html?demo=1 weiter, die Beispieldaten stehen dort).
   Lädt nur im Beispiel-Cockpit, nicht im Rahmen auf der Startseite.
   · oben ein Streifen mit Kategorie und Knopf zur Anmeldung
   · unten rechts „Ihr Feedback“; das Fenster öffnet nach 45 Sekunden Benutzung einmal von selbst
   · Antworten gehen an /api/demo-feedback (lib/demo-feedback.js): Supabase-Tabelle demo_feedback, Mail an den Betreiber */
(function () {
  'use strict';
  if (window._czDemo) return; window._czDemo = true;
  var $ = function (i) { return document.getElementById(i); };
  var API_ = (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api';
  var KAT = { 'salon-am-see': 'Friseur & Beauty', 'seerose-catering': 'Catering & Food Truck', 'gut-seerose': 'Hochzeit & Location', 'gut-seerose-kurz': 'Hochzeit & Location', 'sonnenwerk-nord': 'Handwerk & Solar', 'immobilien-weber': 'Makler & Finanzen', '*': 'alle Beispiele' };
  var MERK = 'cz_demo_feedback';
  function merk(v) { try { if (v) localStorage.setItem(MERK, v); return localStorage.getItem(MERK) || ''; } catch (x) { return v || ''; } }
  function kat() { return window.ALLE ? KAT['*'] : (KAT[window.widget] || KAT[window.CZ_DEMO_W] || 'alle Beispiele'); }
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

  var css = document.createElement('style');
  css.textContent = ''
    + '.czd{position:fixed;top:0;left:0;right:0;z-index:130;display:flex;align-items:center;gap:14px;min-height:56px;padding:6px 10px 6px 18px;padding-top:calc(6px + env(safe-area-inset-top,0px));background:#6f5d33;color:#f7f2e6;font-family:var(--fd);font-size:14.5px;line-height:1.35;box-shadow:0 6px 20px rgba(0,0,0,.18)}'
    + '.czd-t{flex:1 1 auto;min-width:0;margin:0;text-wrap:pretty}.czd-t b{font-weight:700}'
    + '.czd-zus{display:block;font-size:13px;color:#efe5cc}'
    + '.czd-k{flex:0 0 auto;display:flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:#f7f2e6;color:#3d321a;font-weight:700;font-size:15px;text-decoration:none;white-space:nowrap}'
    + '.czd-k:hover{background:#fff;color:#2a2210}.czd-k:focus-visible{outline:3px solid #fff;outline-offset:2px}'
    + '.czd-kurz{display:none}'
    + 'body.czd-oben{padding-top:var(--czd-h,56px)}'
    + 'body.czd-oben .side{top:var(--czd-h,56px);height:calc(100vh - var(--czd-h,56px))}'
    + 'body.czd-oben .czl-sw{top:calc(13px + var(--czd-h,56px))}body.czd-oben .czl-p{top:calc(74px + var(--czd-h,56px))}'
    + 'body.cz-demo .main{padding-bottom:110px}'
    + '.czd-fb{position:fixed;right:18px;bottom:18px;z-index:71;display:flex;align-items:center;gap:8px;min-height:48px;padding:0 18px 0 14px;border:1.5px solid var(--line-2);border-radius:999px;background:var(--panel);color:var(--ink);font-family:var(--fd);font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 10px 28px -10px rgba(0,0,0,.45)}'
    + '.czd-fb svg{width:20px;height:20px;flex:0 0 auto;color:var(--accent)}.czd-fb:hover{border-color:var(--accent)}'
    + 'html.czd-sperre,html.czd-sperre body{overflow:hidden}'
    + '.czd-m{position:fixed;inset:0;z-index:140;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,16,10,.55)}.czd-m[hidden]{display:none}'
    + '.czd-box{position:relative;width:min(560px,100%);max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);overflow:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line-2);border-radius:22px;padding:24px 22px 20px;box-shadow:0 30px 80px rgba(0,0,0,.4);font-family:var(--fd)}'
    + '.czd-box:focus{outline:none}'
    + '.czd-box h2{margin:0 0 6px;padding-right:44px;font-size:21px;line-height:1.25;letter-spacing:-.02em}'
    + '.czd-sub{margin:0 0 18px;font-size:15px;line-height:1.5;color:var(--ink-2);text-wrap:pretty}'
    + '.czd-zu{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;border-radius:12px;background:none;color:var(--ink-2);font-size:26px;line-height:1;cursor:pointer}'
    + '.czd-f{display:flex;flex-direction:column;gap:8px;margin:0 0 18px}'
    + '.czd-f>span{font-size:15px;font-weight:600;line-height:1.4;text-wrap:pretty}'
    + '.czd-f textarea,.czd-f input,.czd-kontakt input{width:100%;min-width:0;box-sizing:border-box;border:1.5px solid var(--line-2);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit;font-size:16px;font-weight:400;padding:12px 14px}'
    + '.czd-f textarea{min-height:88px;resize:vertical;line-height:1.45}.czd-kontakt input{min-height:50px}'
    + '.czd-f textarea:focus,.czd-kontakt input:focus{outline:none;border-color:var(--accent)}'
    + '.czd-ja{display:grid;grid-template-columns:1fr 1fr;gap:8px}'
    + '.czd-ja button{min-height:48px;border:1.5px solid var(--line-2);border-radius:12px;background:none;color:var(--ink);font:inherit;font-size:15.5px;font-weight:600;cursor:pointer}'
    + '.czd-ja button.an{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}'
    + '.czd-hinw{margin:0;font-size:13.5px;line-height:1.5;color:var(--ink-2)}'
    + '.czd-kontakt{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}.czd-kontakt[hidden]{display:none}'
    + '.czd-kontakt label{display:flex;flex-direction:column;gap:5px;font-size:13.5px;font-weight:600;color:var(--ink-2)}'
    + '.czd-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}'
    + '.czd-ds{margin:0 0 14px;font-size:13px;line-height:1.5;color:var(--ink-2);text-wrap:pretty}.czd-ds a{color:var(--accent)}'
    + '.czd-unten{display:flex;flex-wrap:wrap;gap:10px;align-items:center}'
    + '.czd-go{flex:1 1 200px;min-height:52px;border:0;border-radius:14px;background:var(--accent);color:var(--on-accent,#fff);font:inherit;font-size:16px;font-weight:700;cursor:pointer}.czd-go:disabled{opacity:.6}'
    + '.czd-spaet{display:flex;align-items:center;justify-content:center;min-height:52px;padding:0 18px;border:1.5px solid var(--line-2);border-radius:14px;background:none;color:var(--ink);font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer}'
    + '.czd-msg{min-height:1.4em;margin:10px 0 0;font-size:14.5px;font-weight:600;color:var(--ink-2)}.czd-msg:empty{display:none}.czd-msg.bad{color:var(--bad,#c0392b)}'
    + '@media(max-width:760px){.czd{gap:10px;padding-left:14px;font-size:14px}.czd-lang{display:none}.czd-kurz{display:inline}.czd-k{padding:0 14px;font-size:14px}'
    + 'body.czd-oben .kopfleiste{top:var(--czd-h,56px)}body.czd-oben .czl-sw{top:calc(10px + var(--czd-h,56px))}body.czd-oben .czl-p{top:calc(62px + var(--czd-h,56px))}'
    + 'body.cz-demo .main{padding-bottom:210px !important}'
    + '.czd-fb{right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));min-height:46px;padding:0 15px 0 12px;font-size:14.5px}'
    + '.czd-m{align-items:flex-end;padding:0}.czd-box{width:100%;max-height:92vh;max-height:92dvh;border-radius:22px 22px 0 0;padding:22px 16px calc(18px + env(safe-area-inset-bottom,0px))}.czd-kontakt{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  /* ── Streifen oben ── */
  var st = document.createElement('div');
  st.className = 'czd'; st.id = 'czd';
  st.innerHTML = '<p class="czd-t"><span class="czd-lang">Sie testen die interaktive clickzauber-Demo (Kategorie: </span><span class="czd-kurz">Demo · </span><b id="czd-kat"></b><span class="czd-lang">)</span>'
    + '<span class="czd-lang czd-zus">Alle Daten sind erfunden. Es wird nichts gespeichert oder verschickt.</span></p>'
    + '<a class="czd-k" href="clickzauber-anmelden.html"><span class="czd-lang">Jetzt kostenlos starten</span><span class="czd-kurz">Kostenlos starten</span></a>';
  document.body.insertBefore(st, document.body.firstChild);
  document.body.classList.add('czd-oben');
  /* Höhe des Streifens: Seite, Seitenleiste, Live-Schalter, Sprache und Zahnrad rücken darunter. */
  var H = 0;
  function hoehe(melden) {
    var h = st.offsetHeight; if (!h || h === H) return;
    H = h; document.documentElement.style.setProperty('--czd-h', h + 'px');
    if (melden !== false) { try { window.dispatchEvent(new Event('resize')); } catch (x) {} }
  }
  var LETZT = '';
  function label() { var k = kat(); if (k === LETZT) return; LETZT = k; $('czd-kat').textContent = k; hoehe(); }
  label(); hoehe();
  setTimeout(hoehe, 700);
  setInterval(label, 1500);
  window.addEventListener('cz-art', label);
  window.addEventListener('resize', function () { hoehe(false); });
  /* Der alte Hinweis unten (für Vorschaufenster gedacht) sagt dasselbe wie der Streifen oben. */
  var altB = $('demo-banner'); if (altB) { altB.remove(); var mm = document.querySelector('.main'); if (mm) mm.style.paddingBottom = ''; }

  /* ?branche=friseur | catering | hochzeit … öffnet gleich das passende Beispiel-Formular statt „Alle Formulare“. */
  var BR = { friseur: 'salon-am-see', beauty: 'salon-am-see', salon: 'salon-am-see', kosmetik: 'salon-am-see', nagel: 'salon-am-see', wimpern: 'salon-am-see', catering: 'seerose-catering', foodtruck: 'seerose-catering', 'food-truck': 'seerose-catering', hochzeit: 'gut-seerose', location: 'gut-seerose', hochzeitslocation: 'gut-seerose',
    handwerk: 'sonnenwerk-nord', solar: 'sonnenwerk-nord', beratung: 'immobilien-weber', makler: 'immobilien-weber', finanzen: 'immobilien-weber' };
  var WAHL = ''; try { WAHL = BR[String(new URLSearchParams(location.search).get('branche') || '').toLowerCase()] || ''; } catch (x) {}
  if (WAHL) {
    var versuch = 0, iv = setInterval(function () {
      var s = $('wsel');
      if (s && Array.prototype.some.call(s.options, function (o) { return o.value === WAHL; })) {
        clearInterval(iv);
        if (s.value !== WAHL) { s.value = WAHL; s.dispatchEvent(new Event('change')); }
        setTimeout(label, 300); return;
      }
      if (++versuch > 40) clearInterval(iv);
    }, 250);
  }

  /* ── Feedback ── */
  var fb = document.createElement('button');
  fb.type = 'button'; fb.className = 'czd-fb'; fb.id = 'czd-fb';
  fb.innerHTML = SVG + '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Ihr Feedback</span>';
  document.body.appendChild(fb);
  fb.addEventListener('click', function () { oeffnen(false); });

  var M = null, JA = null, AB = 0, LAEUFT = false;
  function bauen() {
    if (M) return;
    M = document.createElement('div'); M.className = 'czd-m'; M.id = 'czd-m'; M.hidden = true;
    M.innerHTML = '<div class="czd-box" role="dialog" aria-modal="true" aria-labelledby="czd-h" tabindex="-1">'
      + '<button type="button" class="czd-zu" data-czd="zu" aria-label="Schließen">×</button>'
      + '<div id="czd-form"><h2 id="czd-h">Ihr Feedback zu clickzauber</h2><p class="czd-sub">Drei kurze Fragen. Alle Angaben sind freiwillig.</p>'
      + '<label class="czd-f"><span>Welche Funktion fehlt Ihnen aktuell noch im Cockpit, um Ihren Arbeitsalltag perfekt zu erleichtern?</span><textarea id="czd-wunsch" maxlength="2000" rows="3"></textarea></label>'
      + '<label class="czd-f"><span>Was hat bei Ihren bisherigen Tools / Programmen (z. B. E-Mail, Excel, andere Kalender) in der Vergangenheit nicht gut funktioniert?</span><textarea id="czd-schmerz" maxlength="2000" rows="3"></textarea></label>'
      + '<div class="czd-f"><span id="czd-ja-t">Sollen wir clickzauber kostenlos auf Ihre Website anpassen?</span>'
      + '<div class="czd-ja" role="group" aria-labelledby="czd-ja-t"><button type="button" data-czd="ja" aria-pressed="false">Ja, gern</button><button type="button" data-czd="nein" aria-pressed="false">Nein, danke</button></div>'
      + '<p class="czd-hinw">Kostenlos für unsere Pilotbetriebe, solange Plätze frei sind. Sonst kostet die Einrichtung einmalig 129 €.</p>'
      + '<div class="czd-kontakt" id="czd-kontakt" hidden>'
      + '<label>Name<input id="czd-name" maxlength="80" autocomplete="name"></label>'
      + '<label>E-Mail-Adresse<input id="czd-mail" type="email" maxlength="120" autocomplete="email" inputmode="email"></label>'
      + '<label>Telefon / WhatsApp<input id="czd-tel" type="tel" maxlength="40" autocomplete="tel" inputmode="tel"></label>'
      + '<label>Website-URL<input id="czd-web" maxlength="200" autocomplete="url" inputmode="url" placeholder="ihre-seite.de"></label>'
      + '</div></div>'
      + '<input class="czd-hp" id="czd-hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + '<p class="czd-ds">Wir speichern Ihre Antworten, um clickzauber zu verbessern. Kontaktdaten nutzen wir nur, um uns wegen der Einrichtung bei Ihnen zu melden. Mehr dazu in der <a href="datenschutz.html#demo-feedback" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>'
      + '<div class="czd-unten"><button type="button" class="czd-go" data-czd="senden">Feedback senden</button><button type="button" class="czd-spaet" data-czd="zu">Später</button></div>'
      + '<p class="czd-msg" id="czd-msg" role="status"></p></div>'
      + '<div id="czd-danke" hidden><h2>Danke für Ihr Feedback!</h2><p class="czd-sub" id="czd-danke-t"></p>'
      + '<div class="czd-unten"><button type="button" class="czd-go" data-czd="zu">Weiter ausprobieren</button><a class="czd-spaet" href="clickzauber-anmelden.html">Jetzt kostenlos starten</a></div></div>'
      + '</div>';
    document.body.appendChild(M);
    M.addEventListener('click', function (ev) {
      if (ev.target === M) { zu(); return; }
      var b = ev.target.closest('[data-czd]'); if (!b) return;
      var w = b.getAttribute('data-czd');
      if (w === 'zu') zu();
      else if (w === 'senden') senden(b);
      else if (w === 'ja' || w === 'nein') {
        JA = w === 'ja';
        Array.prototype.forEach.call(M.querySelectorAll('.czd-ja button'), function (x) { var an = x.getAttribute('data-czd') === w; x.classList.toggle('an', an); x.setAttribute('aria-pressed', an ? 'true' : 'false'); });
        $('czd-kontakt').hidden = !JA;
        if (JA) setTimeout(function () { $('czd-name').focus(); }, 30);
      }
    });
  }
  function v(i) { var x = $(i); return x ? String(x.value || '').trim() : ''; }
  function msg(t, bad) { var m = $('czd-msg'); if (m) { m.textContent = t; m.className = 'czd-msg' + (bad ? ' bad' : ''); } }
  function oeffnen(auto) {
    bauen();
    if (!M.hidden) return;
    if (auto) merk('gezeigt');
    $('czd-form').hidden = false; $('czd-danke').hidden = true; msg('');
    AB = Date.now();
    M.hidden = false; document.documentElement.classList.add('czd-sperre');
    /* Am Handy nicht gleich die Tastatur öffnen, sonst verdeckt sie die Fragen. */
    setTimeout(function () {
      var fein = window.matchMedia && matchMedia('(pointer:fine)').matches;
      if (!auto && fein) $('czd-wunsch').focus(); else M.querySelector('.czd-box').focus();
    }, 60);
  }
  function zu() {
    if (!M || M.hidden) return;
    M.hidden = true; document.documentElement.classList.remove('czd-sperre');
    try { fb.focus(); } catch (x) {}
  }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && M && !M.hidden) zu(); });

  function quelle() {
    try {
      var q = new URLSearchParams(location.search), u = q.get('utm_source') || q.get('quelle') || q.get('ref');
      if (u) return u.slice(0, 120);
      var r = document.referrer ? new URL(document.referrer).hostname : '';
      return r && r !== location.hostname ? r : 'direkt';
    } catch (x) { return ''; }
  }
  function senden(b) {
    if (LAEUFT) return;
    var d = {
      branche: kat(), formular: String(window.widget || ''), wunsch: v('czd-wunsch'), schmerz: v('czd-schmerz'), einrichtung: JA === true,
      quelle: quelle(), sprache: (window.czSprache && window.czSprache.get && window.czSprache.get()) || 'de', hp: v('czd-hp'), dauer: Date.now() - AB
    };
    if (d.einrichtung) { d.name = v('czd-name'); d.email = v('czd-mail'); d.telefon = v('czd-tel'); d.website = v('czd-web'); }
    if (!d.wunsch && !d.schmerz && !d.einrichtung) { msg('Bitte beantworten Sie mindestens eine Frage.', true); return; }
    if (d.einrichtung && !d.email && !d.telefon) { msg('Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an, damit wir Sie erreichen.', true); $('czd-mail').focus(); return; }
    if (d.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(d.email)) { msg('Die E-Mail-Adresse sieht nicht vollständig aus.', true); $('czd-mail').focus(); return; }
    LAEUFT = true; b.disabled = true; msg('Wird gesendet …');
    fetch(API_ + '/demo-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .catch(function () { return { ok: false, error: 'offline' }; })
      .then(function (j) {
        LAEUFT = false; b.disabled = false;
        if (j && j.ok) {
          merk('gesendet');
          $('czd-form').hidden = true; $('czd-danke').hidden = false;
          $('czd-danke-t').textContent = d.einrichtung ? 'Wir melden uns in den nächsten Tagen bei Ihnen.' : 'Ihre Antworten sind bei uns angekommen.';
          ['czd-wunsch', 'czd-schmerz'].forEach(function (i) { $(i).value = ''; });
          return;
        }
        try { console.error('Demo-Feedback', j); } catch (x) {}
        msg(j && j.hinweis && j.error !== 'speichern' ? j.hinweis : (j && j.error === 'offline' ? 'Keine Verbindung. Bitte gleich noch einmal versuchen.' : 'Das hat leider nicht geklappt. Bitte versuchen Sie es später noch einmal.'), true);
      });
  }

  /* Nach 45 Sekunden Benutzung einmal von selbst — nie über einem anderen offenen Fenster und nie zweimal. */
  var aktiv = 0, zuletzt = 0;
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (n) { window.addEventListener(n, function () { zuletzt = Date.now(); }, { passive: true, capture: true }); });
  function andereOffen() {
    var a = $('au-bl'); if (a && !a.hidden) return true;
    var p = $('czl-p'); if (p && !p.hidden) return true;
    if (document.body.classList.contains('msn-auf')) return true;
    return !!document.querySelector('[aria-modal="true"]:not(.czd-box)') && Array.prototype.some.call(document.querySelectorAll('[aria-modal="true"]:not(.czd-box)'), function (x) { return x.offsetParent !== null; });
  }
  var uhr = setInterval(function () {
    if (merk()) { clearInterval(uhr); return; }
    if (document.hidden) return;
    if (Date.now() - zuletzt < 12000) aktiv++;
    if (aktiv >= 45 && !andereOffen()) { clearInterval(uhr); oeffnen(true); }
  }, 1000);
})();
