/* clickzauber — Funktionen je Betrieb (seit 07.10.2026, sql/65, lib/einstellungen.js, lib/konto-admin.js).
   Alle Betriebe haben dieselbe Software. Was ein Betrieb davon sieht, steht pro Konto in einstellungen.funktionen.
   Ein Sonderwunsch wird nie ein eigenes Cockpit, sondern eine neue Funktion in KAT (meist Standard „aus“), die nur
   bei diesem Betrieb an ist. So bleibt ein Stand für alle, und jedes Update erreicht jeden.
   Schalten: der Betrieb selbst (Einstellungen → Funktionen) oder der Betreiber (Plattform → Kunden → Funktionen).
   Das Cockpit übernimmt Änderungen ohne Neuladen: alle 20 Sekunden und sofort beim Zurückholen.
   „Jetzt bei ihm neu laden“ (Plattform) lädt sein Cockpit einmal neu, sobald niemand tippt, etwa nach dem Hochladen.
   Auf der Plattform-Seite liefert die Datei den Katalog und das Fenster zum Schalten (czFxPlattform). */
(function () {
  'use strict';
  /* k Schlüssel · t Titel · s ein einfacher Satz · arten nur für diese Cockpit-Arten (fehlt: alle) · an Standard
     weg verschwindet, wenn aus · views Seiten, die dann nicht offen bleiben · nurBetreiber Betrieb sieht den Schalter erst, wenn er an ist */
  var KAT = [
    { k: 'damen_herren', t: 'Damen, Herren und Kinder getrennt', arten: ['termin'], an: false,
      s: 'Bei jeder Leistung steht, für wen sie ist. Das Formular fragt zuerst „Für wen ist der Termin?“ und zeigt danach nur die passenden Leistungen. Am besten eindeutig benennen, zum Beispiel Damenschnitt und Herrenschnitt.' },
    { k: 'preis_gast', t: 'Preise für Ihre Kunden zeigen', an: true,
      s: 'Vor dem Absenden sieht Ihr Kunde, was er gewählt hat, mit Einzelpreisen und Gesamtbetrag. Dasselbe steht in seiner Bestätigung. Ausgeschaltet sieht er nur seine Auswahl. Sie selbst sehen die Preise immer.' },
    { k: 'schnelltermin', t: 'Schnell-Termin am Telefon', arten: ['termin'], an: true, weg: '#sal-neu',
      s: 'Der Knopf „+ Schnell-Termin“ in der Übersicht. Damit tragen Sie einen Termin am Telefon in wenigen Sekunden ein.' },
    { k: 'stammkunden', t: 'Stammkunden', arten: ['termin'], an: true, weg: '[data-view="stammkunden"]', views: ['stammkunden'],
      s: 'Kunden, die in den letzten drei Monaten mindestens viermal gebucht haben.' },
    { k: 'historie', t: 'Historienbuch', an: true, weg: '[data-view="historie"],[data-hb-auf]', views: ['historie'],
      s: 'Alle Kunden der letzten 30 Tage mit allen Angaben, zum Herunterladen als Tabelle.' },
    { k: 'vorlagen', t: 'Antwort-Vorlagen', arten: ['auftrag', 'projekt', 'pipeline'], an: true, weg: '[data-view="vorlagen"]', views: ['vorlagen'],
      s: 'Textbausteine für Zusage, Absage und Rückfrage.' },
    { k: 'netzwerk', t: 'Netzwerk', an: true, weg: '.nav-g[data-g="n"],#g-n,[data-view="netzprofil"],[data-view="vernetzen"],[data-view="nachrichten"],[data-view="partner"],[data-view="rangliste"]', views: ['netzprofil', 'vernetzen', 'nachrichten', 'partner', 'rangliste'],
      s: 'Ihr Profil für andere Betriebe, Nachrichten, Partner im Formular und die Rangliste.' },
    { k: 'entdecken', t: 'Andere Vorlagen', an: true, weg: '.nav-g[data-g="e"],#g-e,[data-view="entdecken"]', views: ['entdecken'],
      s: 'Formulare anderer Branchen zum Ausprobieren.' },
    { k: 'missionen', t: 'Missionen und Punkte', an: true, weg: '#msn,#msn-toast,#msn-feier',
      s: 'Die Box unten rechts mit Aufgaben, Punkten und Abzeichen.' },
    { k: 'funktionen_menue', t: 'Menü „Funktionen“ (Glühbirne)', an: true, weg: '#fxm-tab,.fxm-nav,#fxm-bar',
      s: 'Die Lasche mit der Glühbirne am linken Rand und „Funktionen“ in der Seitenleiste. Dort steht, was Ihr Cockpit alles kann.' }
  ];
  var BY = {}; KAT.forEach(function (f) { BY[f.k] = f; });
  /* Branche des Formulars → Cockpit-Art, wie lib/profile.js */
  var ZG = { termin: ['friseur', 'nagel', 'wimpern', 'kosmetik', 'barbier', 'massage', 'tattoo'], auftrag: ['foodtruck', 'fotovideo', 'foto', 'catering', 'musik', 'floristik', 'deko', 'konditorei'], pipeline: ['solar', 'waermepumpe', 'dach', 'fenster', 'elektro', 'makler', 'finanzierung', 'versicherung', 'agentur', 'steuer'] };
  function artVon(zg) { zg = String(zg || '').toLowerCase(); for (var a in ZG) if (ZG[a].indexOf(zg) >= 0) return a; return 'projekt'; }
  function passt(f, arten) { return !f.arten || !arten || !arten.length || f.arten.some(function (a) { return arten.indexOf(a) >= 0; }); }
  function an(F, k) { var f = BY[k]; return F && Object.prototype.hasOwnProperty.call(F, k) ? !!F[k] : !!(f && f.an); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  window.CZ_FX = { KAT: KAT, an: an, artVon: artVon, passt: passt };

  var st = document.createElement('style'); st.id = 'cz-funktionen-css';
  st.textContent = KAT.filter(function (f) { return f.weg; }).map(function (f) {
      return f.weg.split(',').map(function (s) { return 'html.fx-aus-' + f.k + ' ' + s.trim(); }).join(',') + '{display:none!important}';
    }).join('')
    + 'html:not(.fx-an-damen_herren) .zt-fuer{display:none!important}'
    + 'html.fx-aus-missionen body.msn-auf .main{padding-right:0!important}'
    + '#fx-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translate(-50%,12px);z-index:9998;width:max-content;max-width:min(92vw,460px);padding:12px 18px;border-radius:14px;background:var(--ink,#241f19);color:var(--panel,#fffdf8);font:600 14px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;text-align:center;text-wrap:pretty}'
    + '#fx-toast.da{opacity:1;transform:translate(-50%,0)}@media(min-width:761px){#fx-toast{bottom:28px}}'
    + '.fx-pl{display:flex;flex-direction:column;gap:8px;max-height:min(58vh,520px);overflow:auto}'
    + '.fx-pz{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line-2);cursor:pointer}'
    + '.fx-pz span{flex:1;min-width:0}.fx-pz b{display:block;font-size:14.5px}.fx-pz small{display:block;font-size:12.5px;line-height:1.45;color:var(--ink-2);margin-top:2px}'
    + '.fx-pz em{font-style:normal;font-family:var(--fm);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--warn);margin-left:8px}'
    + '.mdl .fx-pz input{width:22px;height:22px;min-height:0;margin:2px 0 0;padding:0;flex:0 0 22px;accent-color:var(--accent)}';
  document.head.appendChild(st);

  if (typeof window.kontoAktion === 'function') plattform();
  else if (document.getElementById('app')) cockpit();

  /* ── Cockpit ─────────────────────────────────────────────── */
  function cockpit() {
    if (/[?&]admin=/.test(location.search) || window._admin) return;
    var DEMO = /[?&]demo=1/.test(location.search), SPEI = DEMO ? 'cz_demo_fx' : 'cz_fx';
    var F = {}, DARF = true, ERST = true, NL = null, LAEUFT = false, GEZ = '';
    try { F = JSON.parse((DEMO ? sessionStorage : localStorage).getItem(SPEI) || '{}') || {}; } catch (e) { F = {}; }
    function merken() { try { (DEMO ? sessionStorage : localStorage).setItem(SPEI, JSON.stringify(F)); } catch (e) {} }
    function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
    function tok() { return window.token || ''; }
    function aktiv(k) { return an(F, k); }
    function art() { var b = document.body.classList; return b.contains('art-termin') ? 'termin' : b.contains('art-auftrag') ? 'auftrag' : b.contains('art-pipeline') ? 'pipeline' : 'projekt'; }

    function anwenden() {
      var h = document.documentElement;
      KAT.forEach(function (f) { var a = aktiv(f.k); h.classList.toggle('fx-an-' + f.k, a); h.classList.toggle('fx-aus-' + f.k, !a); });
      var v = document.querySelector('.view.on'), dv = v && v.getAttribute('data-v');
      if (dv && typeof window.show === 'function' && KAT.some(function (f) { return !aktiv(f.k) && (f.views || []).indexOf(dv) >= 0; })) window.show('overview');
      try { window.dispatchEvent(new CustomEvent('cz-funktionen')); } catch (e) {}
    }
    function karte(immer) {
      var v = document.querySelector('[data-v="settings"]'); if (!v) return;
      var A = [art()], L = KAT.filter(function (f) { return passt(f, A) && (!f.nurBetreiber || aktiv(f.k)); });
      var sig = JSON.stringify([A, DARF, L.map(function (f) { return aktiv(f.k); })]);
      var c = document.getElementById('fx-card');
      if (c && !immer && sig === GEZ) return;
      GEZ = sig;
      if (!c) {
        c = document.createElement('div'); c.className = 'card'; c.id = 'fx-card'; c.style.marginBottom = '14px';
        var ref = v.querySelector('.set-schnell');
        if (ref && ref.nextSibling) v.insertBefore(c, ref.nextSibling); else v.appendChild(c);
      }
      var m = document.getElementById('fx-msg'), alt = m ? [m.textContent, m.className] : null;
      c.innerHTML = '<h2 style="margin-bottom:2px">Funktionen</h2><p class="cs">Schalten Sie aus, was Sie nicht brauchen. Es verschwindet sofort, auf allen Geräten Ihres Teams. Fehlt Ihnen etwas, schreiben Sie uns. Dann bauen wir es ein und schalten es hier für Sie frei.</p>'
        + L.map(function (f) {
          var a = aktiv(f.k);
          return '<div class="setrow"><div class="l"><h3>' + esc(f.t) + '</h3><p>' + esc(f.s) + '</p></div><div class="r"><button type="button" class="sw' + (a ? ' on' : '') + '" role="switch" aria-checked="' + a + '" aria-label="' + esc(f.t) + '" data-fx="' + f.k + '"' + (DARF ? '' : ' disabled') + '><i></i></button></div></div>';
        }).join('')
        + '<p class="smsg" id="fx-msg" role="status">' + (DARF ? '' : 'Nur der Inhaber kann Funktionen schalten.') + '</p>';
      if (alt && alt[0] && DARF) { m = document.getElementById('fx-msg'); m.textContent = alt[0]; m.className = alt[1]; }
    }
    function meld(t, gut) { var m = document.getElementById('fx-msg'); if (m) { m.textContent = t; m.className = 'smsg ' + (gut ? 'gut' : 'bad'); } }
    function toast(t) {
      var x = document.getElementById('fx-toast');
      if (!x) { x = document.createElement('div'); x.id = 'fx-toast'; x.setAttribute('role', 'status'); document.body.appendChild(x); }
      x.textContent = t; x.classList.add('da'); clearTimeout(x._t); x._t = setTimeout(function () { x.classList.remove('da'); }, 5000);
    }
    function beschaeftigt() {
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      return ['sa', 'sz', 'er', 'sal-neu-bl', 'au-bl', 'kk', 'czw'].some(function (id) { var x = document.getElementById(id); return x && !x.hidden; });
    }
    /* „Jetzt bei ihm neu laden“: sofort, wenn niemand tippt. Sonst derselbe Hinweis wie bei einer neuen Version. */
    function neuLaden() {
      if (!beschaeftigt()) { gemerkt(); location.reload(); return; }
      if (document.getElementById('cz-neu-da')) return;
      var b = document.createElement('button'); b.id = 'cz-neu-da'; b.type = 'button'; b.textContent = 'Neue Version bereit · Tippen zum Laden';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top));z-index:99999;min-height:48px;padding:0 20px;border:0;border-radius:99px;background:#241f19;color:#fffdf8;font:600 15px/1 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer';
      b.onclick = function () { gemerkt(); location.reload(); };
      document.body.appendChild(b);
    }
    /* Nach dem Neuladen eine kurze Rückmeldung, damit man sieht, dass es geklappt hat */
    function gemerkt() { try { sessionStorage.setItem('cz_neu_geladen', '1'); } catch (e) {} }
    try { if (sessionStorage.getItem('cz_neu_geladen')) { sessionStorage.removeItem('cz_neu_geladen'); setTimeout(function () { toast('Aktualisiert: Ihr Cockpit ist auf dem neuesten Stand.'); }, 1500); } } catch (e) {}
    function holen() {
      if (DEMO || LAEUFT || document.hidden || !tok()) return;
      LAEUFT = true;
      fetch(api() + '/einstellungen?nur=funktionen&token=' + encodeURIComponent(tok()), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          LAEUFT = false; if (!j || !j.ok) return;
          var nf = j.funktionen || {}, alt = F;
          DARF = j.darf_aendern !== false;
          if (JSON.stringify(nf) !== JSON.stringify(F)) {
            F = nf; merken(); anwenden();
            var w = KAT.filter(function (f) { return an(alt, f.k) !== aktiv(f.k) && passt(f, [art()]); }).map(function (f) { return f.t + (aktiv(f.k) ? ' an' : ' aus'); });
            if (!ERST && w.length) toast('Ihr Cockpit wurde angepasst: ' + w.join(', ') + '.');
          }
          karte();
          var n = j.neu_laden_am || '';
          if (NL === null) NL = n; else if (n !== NL) { NL = n; neuLaden(); }
          ERST = false;
        })
        .catch(function () { LAEUFT = false; });
    }

    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-fx]'); if (!b || b.disabled) return;
      var k = b.getAttribute('data-fx'), neu = !aktiv(k), alt = JSON.parse(JSON.stringify(F)), d = {};
      d[k] = neu; F[k] = neu; merken(); anwenden(); karte(true);
      if (DEMO) { meld('Gespeichert. Im Beispiel gilt das, bis der Tab geschlossen wird.', true); return; }
      meld('Wird gespeichert …', true);
      fetch(api() + '/einstellungen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok(), funktionen: d }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || 'Speichern hat nicht geklappt.');
          F = j.funktionen || F; merken(); anwenden(); karte(true); meld('Gespeichert. Gilt sofort auf allen Geräten.', true);
        })
        .catch(function (e) { F = alt; merken(); anwenden(); karte(true); meld((e && e.message) || 'Speichern hat nicht geklappt.', false); });
    });

    anwenden();
    (function warte(n) {
      karte();
      if (tok()) { holen(); return; }
      if (n < 120 && !DEMO) setTimeout(function () { warte(n + 1); }, 1000);
    })(0);
    setInterval(holen, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) holen(); });
    window.addEventListener('focus', holen);
    /* Die Art des Cockpits steht erst fest, wenn das Formular geladen ist (js/cz-art.js). */
    if (window.MutationObserver) new MutationObserver(function () { karte(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.czFunktionen = { an: aktiv, holen: holen };
  }

  /* ── Plattform-Seite: Fenster je Konto ───────────────────── */
  function plattform() {
    var E = '', F = {}, B = [], OV = null;
    var AN = { termin: 'Termine (Friseur & Beauty)', auftrag: 'Aufträge (Food Truck & Catering)', pipeline: 'Tafel (Handwerk & Makler)', projekt: 'Anfragen (Location)' };
    function $(i) { return document.getElementById(i); }
    function ov() {
      if (OV) return OV;
      OV = document.createElement('div'); OV.className = 'ov'; OV.id = 'fx-ov'; OV.hidden = true;
      OV.innerHTML = '<div class="mdl" role="dialog" aria-modal="true" aria-labelledby="fx-t"><h3 id="fx-t">Funktionen</h3><p id="fx-s"></p><div class="fx-pl" id="fx-pl"></div><p id="fx-m" role="status"></p>'
        + '<div class="akt" style="justify-content:space-between;margin-top:0"><button type="button" data-fxp-neu>Jetzt bei ihm neu laden</button><button type="button" class="p" data-fxp-zu>Fertig</button></div></div>';
      document.body.appendChild(OV);
      OV.addEventListener('click', function (ev) {
        if (ev.target === OV || ev.target.closest('[data-fxp-zu]')) { OV.hidden = true; return; }
        var b = ev.target.closest('[data-fxp-neu]'); if (b) neuLaden(b);
      });
      OV.addEventListener('change', function (ev) { var c = ev.target.closest('[data-fxp]'); if (c) schalten(c); });
      return OV;
    }
    function meld(t, bad) { var m = $('fx-m'); m.textContent = t || ''; m.style.color = bad ? '#f3a292' : ''; }
    function zeichnen() {
      var arten = B.map(artVon).filter(function (a, i, l) { return l.indexOf(a) === i; }), L = KAT.filter(function (f) { return passt(f, arten); });
      $('fx-s').textContent = (arten.length ? 'Cockpit: ' + arten.map(function (a) { return AN[a]; }).join(', ') + '. ' : 'Noch kein Formular gespeichert, deshalb stehen alle Funktionen da. ')
        + 'Haken heißt: beim Betrieb zu sehen. Er sieht die Änderung nach spätestens 20 Sekunden, ohne neu zu laden.';
      $('fx-pl').innerHTML = L.map(function (f) {
        var a = an(F, f.k), eigen = a !== !!f.an;
        return '<label class="fx-pz"><input type="checkbox" data-fxp="' + f.k + '"' + (a ? ' checked' : '') + '><span><b>' + esc(f.t) + (eigen ? '<em>angepasst</em>' : '') + '</b><small>' + esc(f.s) + '</small></span></label>';
      }).join('');
    }
    function schalten(c) {
      var k = c.getAttribute('data-fxp'), d = {}; d[k] = c.checked; c.disabled = true; meld('Wird gespeichert …');
      window.kontoAktion('funktionen', { email: E, funktionen: d })
        .then(function (j) { F = j.funktionen || F; zeichnen(); meld('Gespeichert. Erscheint bei ihm nach spätestens 20 Sekunden.'); })
        .catch(function (er) { c.checked = !c.checked; c.disabled = false; meld((er && er.message) || 'Hat nicht geklappt.', true); });
    }
    function neuLaden(b) {
      b.disabled = true; meld('Einen Moment …');
      window.kontoAktion('neu_laden', { email: E })
        .then(function () { b.disabled = false; meld('Sein Cockpit lädt sich in spätestens 20 Sekunden neu, sobald niemand tippt.'); })
        .catch(function (er) { b.disabled = false; meld((er && er.message) || 'Hat nicht geklappt.', true); });
    }
    window.czFxPlattform = function (email, name) {
      E = email; ov().hidden = false;
      $('fx-t').textContent = 'Funktionen · ' + (name || email);
      $('fx-s').textContent = ''; $('fx-pl').innerHTML = '<p>Wird geladen …</p>'; meld('');
      window.kontoAktion('funktionen_lesen', { email: E })
        .then(function (j) { F = j.funktionen || {}; B = j.branchen || []; zeichnen(); })
        .catch(function (er) { $('fx-pl').innerHTML = ''; meld((er && er.message) || 'Lädt gerade nicht.', true); });
    };
  }
})();
