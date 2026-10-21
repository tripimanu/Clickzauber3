/* clickzauber — Beispiel-Ablauf im Konfigurator (nur mit ?demo=1).
   Formular bauen → Speichern → „Teilen“ → Formular wie ein Kunde ausfüllen → Push-Nachricht →
   Tipp darauf → Beispiel-Cockpit mit genau dieser Anfrage → Annehmen/Absagen → WhatsApp an die eigene Nummer.
   Es geht nichts an den Server. Die Anfrage liegt im Browserspeicher (cz_demo_neu), das Beispiel-Cockpit liest sie dort. */
(function () {
  'use strict';
  if (!/[?&]demo=1/.test(location.search)) return;
  var MERK = 'cz_demo_neu', FORM = 'cz_demo_formular';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function c() { return (typeof cfg !== 'undefined' && cfg) || null; }

  function branche() {
    var u = ''; try { u = String(new URLSearchParams(location.search).get('branche') || ''); } catch (x) {}
    if (/^(friseur|kosmetik|catering|hochzeit|handwerk|beratung)$/.test(u)) return u;
    var f = c() || {}, s = [typeof TPL_ID !== 'undefined' ? TPL_ID : '', f.branche || '', f.anlass || '', f.name || ''].join(' ').toLowerCase();
    if (/kosmetik|nagel|wimpern|lash|pigment|ballancer/.test(s)) return 'kosmetik';
    if ((f.steps || []).some(function (x) { return x.typ === 'termin'; }) || /friseur|nagel|wimpern|beauty|kosmetik|barber|salon|massage/.test(s)) return 'friseur';
    if (/solar|photovolt|waerme|wärme|heizung|dach|fenster|elektr|handwerk|sanit/.test(s)) return 'handwerk';
    if (/makler|immobil|finanz|kredit|versicher|steuer/.test(s)) return 'beratung';
    if (/hochzeit|location|besichtigung|tagung|trauer|feier|event/.test(s) && !/catering|food/.test(s)) return 'hochzeit';
    return 'catering';
  }
  function zc() { var c = window.czZugangCode ? czZugangCode() : ''; return c ? '&z=' + c : ''; }
  function merk(w) { try { if (window.czDemoMerk) czDemoMerk(w); } catch (x) {} }
  function cockpit(zusatz) { return 'clickzauber-cockpit-live.html?demo=1&branche=' + branche() + zc() + (zusatz || ''); }

  var css = document.createElement('style');
  css.textContent = ''
    + '.czt{position:fixed;inset:0;z-index:9000;overflow:auto;background:var(--bg,#f4f1ea);-webkit-overflow-scrolling:touch}.czt[hidden]{display:none}'
    + '.czt-kopf{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--panel,#fff);border-bottom:1px solid var(--line,#e2ddd2)}'
    + '.czt-kopf button{min-height:44px;padding:0 14px;border:1.5px solid var(--line,#ddd);border-radius:12px;background:none;font:inherit;font-weight:600;cursor:pointer;color:inherit}'
    + '.czt-kopf b{flex:1;font-size:16px}'
    + '.czt-hinweis{max-width:560px;margin:18px auto 0;padding:0 16px;font-size:15px;line-height:1.5;color:var(--ink-2,#555);text-wrap:pretty}'
    + '.czt-halt{max-width:560px;margin:14px auto 40px;padding:0 12px}'
    + '.czt-fertig{display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;padding:24px 8px}'
    + '.czt-fertig .h{font-size:24px;font-weight:700}'
    + '.czt-fertig a{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 22px;border-radius:14px;background:var(--sk-accent,#1c1a14);color:#fff;font-weight:700;text-decoration:none}'
    + '.czp{position:fixed;left:50%;top:10px;z-index:9600;width:min(420px,calc(100% - 20px));transform:translate(-50%,-140%);transition:transform .45s cubic-bezier(.2,.9,.3,1.2);display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:18px;background:rgba(250,248,244,.97);color:#1d1a14;box-shadow:0 18px 50px rgba(0,0,0,.35);border:0;font:inherit;text-align:left;cursor:pointer;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}'
    + '.czp.da{transform:translate(-50%,0)}'
    + '.czp i{flex:0 0 38px;height:38px;border-radius:10px;background:#1c1a14;color:#f4f1ea;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;font-size:15px}'
    + '.czp>span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:1.35}'
    + '.czp small{display:flex;justify-content:space-between;font-size:12px;color:#6b665c}'
    + '.czp b{font-size:15px}'
    + '.czp em{font-style:normal;color:#3d392f;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}';
  document.head.appendChild(css);

  /* „Teilen“ erst nach dem Speichern, links neben „Speichern“ */
  function teilenKnopf(an) {
    var b = $('embedBtn'); if (!b) return;
    b.hidden = !an; b.style.display = an ? '' : 'none';
    if (an) { b.textContent = 'Teilen'; b.classList.remove('ghost'); }
  }
  teilenKnopf(false);

  /* Zurück führt ins Beispiel-Cockpit, nicht ins echte */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.bar .back');
    if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    location.href = cockpit();
  }, true);

  window.save = function () {
    var f = c(); if (!f) return;
    var m = typeof nameFehlt === 'function' ? nameFehlt(f.betrieb) : '';
    if (m) { if (window.czDesignZu) czDesignZu(); toast(m, true); if (typeof zumBetriebsnamen === 'function') setTimeout(zumBetriebsnamen, 150); return; }
    try { sessionStorage.setItem(FORM, JSON.stringify(f)); } catch (x) {}
    window._czWeiter = true; window._czNachDesign = false;
    merk('Formular gespeichert (' + branche() + ')');
    setTimeout(function () { if (window.czDesignZu) czDesignZu(); teilenKnopf(true); toast('Gespeichert. Tippen Sie jetzt oben auf „Teilen“.'); }, 500);
  };

  window.showEmbed = function () {
    var f = c(); if (!f) return;
    merk('Teilen geöffnet');
    var s = $('czt');
    if (!s) {
      s = document.createElement('div'); s.id = 'czt'; s.className = 'czt';
      document.body.appendChild(s);
      s.addEventListener('click', function (ev) { if (ev.target.closest('[data-czt=\"zu\"]')) history.back(); });
    }
    var kopie = JSON.parse(JSON.stringify(f));
    kopie.lead = kopie.lead || {};
    var fe = (kopie.lead.felder || ['name', 'email']).filter(function (x) { return x !== 'telefon'; });
    if (fe.indexOf('name') < 0) fe.unshift('name');
    fe.splice(1, 0, 'telefon');
    kopie.lead.felder = fe; kopie.lead.consent = false;
    s.innerHTML = '<div class="czt-kopf"><button type="button" data-czt="zu">← Zurück</button><b>Ihr Formular, wie Kunden es sehen</b></div>'
      + '<p class="czt-hinweis">Füllen Sie es aus wie ein Kunde. Tragen Sie dabei <b>Ihre eigene Handynummer</b> ein. Dann kommt die WhatsApp-Nachricht später bei Ihnen an.</p>'
      + '<div class="czt-halt"></div>';
    s.hidden = false;
    try { history.pushState({ czt: 1 }, '', location.pathname + location.search + '#teilen'); } catch (x) {}
    window.czVorschau.starten(s.querySelector('.czt-halt'), kopie, (kopie.theme && kopie.theme.logo) || kopie.logo || null, {
      senden: senden,
      fertig: '<div class="czt-fertig"><div class="h">Anfrage verschickt.</div><p>Gleich kommt oben die Nachricht über die neue Anfrage. Tippen Sie darauf.</p><a href="#" data-czt-cockpit="1">Zum Cockpit</a></div>'
    });
    s.scrollTop = 0;
  };
  window.addEventListener('popstate', function () { var s = $('czt'); if (s && !s.hidden) s.hidden = true; });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('[data-czt-cockpit]'); if (!a) return;
    ev.preventDefault(); zumCockpit();
  });

  var LETZT = null;
  function naechsterTag() { var d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() < 2); return d; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function senden(d) {
    var l = d.lead || {}, tel = String(l.telefon || '').replace(/[^\d+]/g, '');
    if (!l.name || l.name.length < 2) return 'Bitte einen Namen eintragen.';
    if (tel.replace(/\D/g, '').length < 7) return 'Bitte Ihre eigene Handynummer eintragen. Dorthin geht später die WhatsApp-Nachricht.';
    var br = branche(), id = 'dx' + Date.now().toString(36);
    var a = { id: id, branche: br, name: l.name, telefon: l.telefon, email: l.email || '', zeilen: d.zeilen, ts: Date.now(),
      betrieb: (c() && c().betrieb) || '' };
    if (br === 'kosmetik') { a.datum = iso(naechsterTag()); a.zeit = '10:00'; a.leistung = '1:1 Technik Neuset'; a.dauer = 120; a.preis = 100; }
    else if (br === 'friseur') { a.datum = iso(naechsterTag()); a.zeit = '10:15'; a.leistung = 'Herrenschnitt'; }
    else a.datum = d.datum || '';
    try { localStorage.setItem(MERK, JSON.stringify(a)); } catch (x) {}
    LETZT = a;
    merk('Anfrage im eigenen Formular abgeschickt');
    push(a);
  }

  function zumCockpit() { merk('Push-Nachricht angetippt'); if (LETZT) location.href = cockpit('#anfrage-' + LETZT.id); else location.href = cockpit(); }
  function text(a) {
    if (a.branche === 'friseur' || a.branche === 'kosmetik') return 'Terminwunsch ' + a.leistung + ', ' + new Date(a.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ' um ' + a.zeit + ' Uhr';
    return (a.zeilen || []).slice(0, 2).map(function (z) { return z[1]; }).join(' · ') || 'Neue Anfrage über Ihr Formular';
  }
  function push(a) {
    var url = cockpit('#anfrage-' + a.id), titel = 'Neue Anfrage von ' + a.name, body = text(a);
    /* Echte Mitteilung, wenn der Browser es erlaubt (am iPhone nur aus der installierten App) */
    try {
      if (window.Notification && navigator.serviceWorker) {
        var zeig = function () {
          navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.showNotification(titel, { body: body, tag: 'cz-demo', data: { url: new URL(url, location.href).href }, icon: 'assets/cz-icon-192.png' }); }).catch(function () {});
        };
        if (Notification.permission === 'granted') setTimeout(zeig, 2500);
        else if (Notification.permission === 'default') Notification.requestPermission().then(function (p) { if (p === 'granted') setTimeout(zeig, 1500); }).catch(function () {});
      }
    } catch (x) {}
    /* Immer auch im Bild, damit es auf jedem Gerät klappt */
    setTimeout(function () {
      var p = $('czp');
      if (!p) { p = document.createElement('button'); p.id = 'czp'; p.type = 'button'; p.className = 'czp'; document.body.appendChild(p); p.addEventListener('click', zumCockpit); }
      p.innerHTML = '<i>cz</i><span><small><span>clickzauber</span><span>jetzt</span></small><b>' + esc(titel) + '</b><em>' + esc(body) + '</em></span>';
      requestAnimationFrame(function () { p.classList.add('da'); });
      try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (x) {}
    }, 2500);
  }
})();
