/* clickzauber · App für iPhone und Android (seit 04.10.2026)
   Läuft nur in der App (Capacitor, Bauplan in NICHT-HOCHLADEN/app/). Im Browser tut dieses Skript nichts.
   - setzt <html class="cz-app">, damit Seiten wissen, dass sie in der App laufen
   - Mitteilungen: übernimmt im Cockpit den Schalter „Push-Nachrichten“ (statt Browser-Push) und fragt beim ersten Öffnen einmal
   - Tippen auf eine Mitteilung öffnet die passende Stelle im Cockpit
   - Kein Bezahlen in der App (Regeln von Apple und Google): Tarif-Zeilen, Tarif-Seite und Preise sind ausgeblendet
   - Speichern (Export, Kalender-Datei, QR-Code) und Formular-Link über das Teilen-Fenster, Antippen spürbar (Haptik)
   - Neue Version im Store: Hinweis, unter der Mindestversion Sperre (Plattform-Seite → App-Versionen)
   Server: lib/push.js meldet das Gerät an (fcm:… oder apns:…), lib/_app-push.js verschickt. */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !(C.isNativePlatform ? C.isNativePlatform() : C.isNative)) return;
  var PLATT = (C.getPlatform && C.getPlatform()) || 'android';
  var API = window.API || 'https://clickzauber-api.vercel.app/api';
  var ERLAUBEN = 'Erlauben lässt es sich in den Einstellungen Ihres Handys bei clickzauber unter Mitteilungen.';
  document.documentElement.classList.add('cz-app', 'cz-app-' + PLATT);
  window.CZ_APP = { plattform: PLATT };

  function plugin(n) {
    if (C.isPluginAvailable && !C.isPluginAvailable(n)) return null;
    try {
      if (C.Plugins && C.Plugins[n]) return C.Plugins[n];
      if (C.registerPlugin) return C.registerPlugin(n);
    } catch (e) {}
    if (!C.nativePromise || !window.Proxy) return null;
    return new Proxy({}, { get: function (_, m) {
      if (m === 'addListener') return function (ev, cb) { try { C.nativeCallback(n, 'addListener', { eventName: ev }, cb); } catch (e) {} return Promise.resolve({ remove: function () {} }); };
      return function (o) { return C.nativePromise(n, m, o || {}); };
    } });
  }
  var PN = plugin('PushNotifications'), FS = plugin('Filesystem'), SH = plugin('Share'), HP = plugin('Haptics');
  function leer() {}
  function $(id) { return document.getElementById(id); }
  function lies(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function merk(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

  /* Bezahlen und Preise: in der App nicht sichtbar. :has() steht allein, damit ältere Geräte den Rest nicht verwerfen. */
  var css = 'html.cz-app #row-tarif,html.cz-app #row-kuendigen,html.cz-app #embed-zum-tarif,html.cz-app #v-plan>*:not(.cz-app-plan){display:none!important}'
    + 'html.cz-app .setrow:has([data-abo="portal"]){display:none!important}'
    + '.cz-app-plan{text-align:center}.cz-app-plan .lede{margin:10px 0 22px}'
    + '.cz-app-banner{position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top,0px));z-index:300;display:flex;flex-direction:column;gap:3px;text-align:left;background:#fff;color:#211d16;border:1px solid #e6ddca;border-radius:14px;padding:12px 14px;box-shadow:0 14px 40px rgba(0,0,0,.18);font:inherit;font-size:14px;line-height:1.4;cursor:pointer;transition:opacity .3s,transform .3s}'
    + '.cz-app-banner b{font-size:15px}.cz-app-banner.weg{opacity:0;transform:translateY(-12px)}';
  var st = document.createElement('style'); st.id = 'cz-native-css'; st.textContent = css; document.head.appendChild(st);

  /* Anmeldeseite: Tarifseite durch einen Hinweis ersetzen, Bezahl-Wörter neutral */
  function anmeldenSeite() {
    var vp = $('v-plan');
    if (vp && !vp.querySelector('.cz-app-plan')) {
      var d = document.createElement('div'); d.className = 'cz-app-plan';
      d.innerHTML = '<h1>Fast geschafft</h1><p class="lede">Ihr Konto ist angelegt. Zum Freischalten melden wir uns bei Ihnen, meist noch am selben Tag. Bis dahin können Sie alles einrichten und ausprobieren.</p>'
        + '<a class="btn" href="clickzauber-cockpit-live.html" style="display:block;text-decoration:none;text-align:center">Zum Cockpit</a>';
      vp.appendChild(d);
      /* Erst wenn die Seite wirklich zu sehen ist: Server schickt die Mail mit dem Weg zum Tarif und meldet das Konto (lib/_app-freischalten.js) */
      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(function (x) {
          if (!x.some(function (y) { return y.isIntersecting; })) return;
          io.disconnect();
          var tk = token(), tag = 'cz_frei_' + new Date().toISOString().slice(0, 10);
          if (!tk || lies(tag)) return;
          merk(tag, '1');
          fetch(API + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk, aktion: 'app_freischalten' }) }).catch(leer);
        });
        io.observe(d);
      }
    }
    var lp = document.querySelector('#v-profil .lede'); if (lp && /Stripe/.test(lp.textContent)) lp.textContent = 'Wer Sie sind und wie wir Sie erreichen.';
    var ed = $('btn-editor-done'); if (ed && /Tarif/.test(ed.textContent)) ed.textContent = 'Weiter →';
  }
  function cockpitTexte() {
    var pd = $('set-plan-desc'); if (!pd || pd._czApp) return; pd._czApp = 1;
    var fix = function () { if (/Tarif wählen/.test(pd.textContent)) pd.textContent = 'Noch nicht aktiv'; };
    fix(); try { new MutationObserver(fix).observe(pd, { childList: true, characterData: true, subtree: true }); } catch (e) {}
  }

  /* ── Mitteilungen ── */
  var EP = 'cz_app_push', GEFRAGT = 'cz_app_push_gefragt', WARTET = false;
  function token() { return window.token || lies('cz_user_token'); }
  function hinweis(t) { var h = $('push-hint'); if (h) h.textContent = t; }
  function stand(an) {
    var sw = $('s-push'); if (sw) { sw.style.display = ''; sw.classList.toggle('on', !!an); }
    var r = $('row-push'); if (r) r.style.display = '';
    var p = $('row-push-probe'); if (p) p.style.display = an ? '' : 'none';
  }
  function post(b) {
    return fetch(API + '/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, b)) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }
  function an() {
    if (!PN) { hinweis('Diese App-Version kann noch keine Mitteilungen. Bitte die App aktualisieren.'); return; }
    WARTET = true; merk(GEFRAGT, '1');
    hinweis('Ihr Handy fragt jetzt nach Erlaubnis …');
    PN.requestPermissions().then(function (p) {
      if (!p || p.receive !== 'granted') { WARTET = false; stand(false); hinweis('Mitteilungen sind nicht erlaubt. ' + ERLAUBEN); return; }
      if (PLATT === 'android' && PN.createChannel) {
        try { PN.createChannel({ id: 'anfragen', name: 'Neue Anfragen', description: 'Neue Anfragen und Antworten Ihrer Kunden', importance: 5, visibility: 1, vibration: true }).catch(function () {}); } catch (e) {}
      }
      return PN.register();
    }).catch(function () { WARTET = false; stand(false); hinweis('Das hat nicht geklappt. Bitte gleich noch einmal versuchen.'); });
  }
  function aus() {
    var ep = lies(EP); merk(EP, ''); stand(false);
    hinweis('Ausgeschaltet. Anfragen kommen weiter per E-Mail und stehen im Cockpit.');
    if (ep) post({ aktion: 'weg', abo: { endpoint: ep } }).catch(function () {});
  }
  function oeffnen(d) {
    var u = d && (d.url || (d.data && d.data.url)); if (!u) return;
    u = String(u).replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '');
    if (!/^[\w.\-\/]+\.html([?#]\S*)?$/.test(u)) return;
    var teile = u.split('#'), pfad = '/' + teile[0].split('?')[0];
    if (location.pathname === pfad && teile[1]) {
      if (location.hash === '#' + teile[1]) location.hash = '';
      setTimeout(function () { location.hash = teile[1]; }, 30);
      return;
    }
    location.href = '/' + u;
  }
  function banner(n) {
    if (!n || !document.body) return;
    var x = document.createElement('button'); x.type = 'button'; x.className = 'cz-app-banner';
    var b = document.createElement('b'); b.textContent = n.title || 'clickzauber'; x.appendChild(b);
    if (n.body) { var s = document.createElement('span'); s.textContent = n.body; x.appendChild(s); }
    x.onclick = function () { x.remove(); oeffnen(n.data); };
    document.body.appendChild(x);
    setTimeout(function () { x.classList.add('weg'); setTimeout(function () { x.remove(); }, 400); }, 7000);
  }
  if (PN) {
    PN.addListener('registration', function (t) {
      if (!token() || !t || !t.value) { WARTET = false; return; }
      var ep = (PLATT === 'ios' ? 'apns:' : 'fcm:') + t.value, alt = lies(EP), neu = WARTET;
      post({ abo: { endpoint: ep, keys: { p256dh: 'app', auth: 'app' } }, geraet: (PLATT === 'ios' ? 'iPhone' : 'Android') + ' (App)' }).then(function (j) {
        WARTET = false;
        if (!j || !j.ok) { if (neu) { stand(false); hinweis((j && j.error) || 'Anmelden hat nicht geklappt.'); } return; }
        if (alt && alt !== ep) post({ aktion: 'weg', abo: { endpoint: alt } }).catch(function () {});
        merk(EP, ep); stand(true);
        if (neu) hinweis('Eingeschaltet. Neue Anfragen melden sich ab jetzt sofort auf diesem Handy.');
      }).catch(function () { WARTET = false; if (neu) { stand(false); hinweis('Server nicht erreichbar. Bitte gleich noch einmal versuchen.'); } });
    });
    PN.addListener('registrationError', function () { if (WARTET) { stand(false); hinweis('Anmelden hat nicht geklappt. Bitte gleich noch einmal versuchen.'); } WARTET = false; });
    PN.addListener('pushNotificationActionPerformed', function (a) { oeffnen(a && a.notification && a.notification.data); });
    /* iPhone zeigt Mitteilungen auch bei offener App selbst an (capacitor.config.json). Android nicht: dann ein eigener Hinweis oben. */
    PN.addListener('pushNotificationReceived', function (x) {
      if (HP) try { HP.notification({ type: 'SUCCESS' }).catch(leer); } catch (e) {}
      if (PLATT !== 'ios') banner(x);
    });
  }
  /* Schalter im Cockpit: vor dem Browser-Push abfangen */
  window.addEventListener('click', function (e) {
    var sw = e.target && e.target.closest && e.target.closest('#s-push'); if (!sw) return;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (sw.classList.contains('on')) aus(); else an();
  }, true);
  function cockpit() {
    if (!$('s-push') || !token()) return;
    cockpitTexte();
    if (!PN) { stand(false); hinweis('Diese App-Version kann noch keine Mitteilungen. Bitte die App aktualisieren.'); return; }
    var da = !!lies(EP);
    stand(da);
    hinweis(da ? 'Eingeschaltet für dieses Handy. Neue Anfragen melden sich sofort.' : 'Neue Anfragen melden sich sofort auf diesem Handy, auch wenn die App zu ist.');
    PN.checkPermissions().then(function (p) {
      var r = p && p.receive;
      if (r === 'granted') { if (da) PN.register(); else if (!lies(GEFRAGT)) setTimeout(an, 1200); }
      else if (r === 'denied') { if (da) aus(); stand(false); hinweis('Mitteilungen sind nicht erlaubt. ' + ERLAUBEN); }
      else if (!lies(GEFRAGT)) setTimeout(an, 1500);
    }).catch(function () {});
  }
  /* ── Speichern und Teilen ──
     Export (Excel), Kalender-Datei, QR-Code: Im Browser lädt <a download> die Datei herunter, in der App passiert dabei nichts.
     Deshalb hier: Datei kurz ablegen und das Teilen-Fenster öffnen („In Dateien sichern“, „Bild sichern“, Mail, AirDrop, WhatsApp). */
  function speichern(href, name) {
    name = String(name || '').replace(/[^\w.\- äöüÄÖÜß]+/g, '-').slice(0, 80) || 'clickzauber';
    if (!FS || !SH) { banner({ title: 'Speichern geht in dieser App-Version noch nicht', body: 'Bitte die App aktualisieren.' }); return; }
    fetch(href).then(function (r) { return r.blob(); }).then(function (bl) {
      return new Promise(function (ok, nein) {
        var fr = new FileReader();
        fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); };
        fr.onerror = nein; fr.readAsDataURL(bl);
      });
    }).then(function (daten) {
      return FS.writeFile({ path: name, data: daten, directory: 'CACHE' });
    }).then(function (w) {
      return SH.share({ title: name, files: [w.uri], dialogTitle: name });
    }).catch(function (e) {
      var t = String((e && (e.message || e.errorMessage)) || e || '');
      if (!/cancel|abgebrochen/i.test(t)) banner({ title: 'Speichern hat nicht geklappt', body: 'Bitte noch einmal versuchen.' });
    });
  }
  var KLICK = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && /^(blob|data):/i.test(this.href)) { speichern(this.href, this.getAttribute('download')); return; }
    return KLICK.apply(this, arguments);
  };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (a && /^(blob|data):/i.test(a.href)) { e.preventDefault(); speichern(a.href, a.getAttribute('download')); }
  }, true);

  /* Formular-Link: über das Teilen-Fenster (WhatsApp, Instagram, Mail). „Kopieren“ steht dort auch. */
  function teilenKnopf() { var k = document.querySelector('[data-cp="embed-link"]'); if (k && SH) k.textContent = 'Link teilen'; }
  window.addEventListener('click', function (e) {
    var k = e.target && e.target.closest && e.target.closest('[data-cp="embed-link"]');
    if (!k || !SH) return;
    var el = $('embed-link'), url = el ? el.textContent.trim() : '';
    if (!url || url === '…') return;
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    SH.share({ title: 'Anfrage-Formular', url: url, dialogTitle: 'Formular-Link teilen' }).catch(leer);
  }, true);

  /* Antippen spüren: Schalter und wichtige Knöpfe (Annehmen, Fest eintragen, Bestätigen) */
  document.addEventListener('click', function (e) {
    if (!HP || !e.target || !e.target.closest) return;
    var x = e.target.closest('.sw,[role="switch"],button.big,.bst-knopf,[data-bch]');
    if (x && !x.disabled) try { HP.impact({ style: 'LIGHT' }).catch(leer); } catch (err) {}
  }, true);

  /* ── Neue App-Version im Store (seit 05.10.2026) ──
     Änderungen an Cockpit & Co. kommen ohne Store an, weil die App clickzauber.de lädt. Nur wenn sich die App selbst ändert
     (neue Handy-Funktion, Symbol), gibt es eine neue Version im App Store oder bei Google Play. Dann:
     - neuere Version im Store: Hinweis „Neue Version“ (nach „Später“ erst am nächsten Tag wieder)
     - älter als die Mindestversion (Plattform-Seite, sql/61): Sperre „Bitte aktualisieren“
     Android aktualisiert direkt in der App, das iPhone öffnet den App Store. Plugins: @capawesome/capacitor-app-update, @capacitor/app */
  var AU = plugin('AppUpdate'), APP = plugin('App'), UPD_ZULETZT = 0;
  var updCss = document.createElement('style');
  updCss.textContent = '#cz-app-upd{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99990;display:flex;justify-content:center;font-family:var(--fd,-apple-system,system-ui,sans-serif)}'
    + '#cz-app-upd .k{width:100%;max-width:460px;background:#1a1813;color:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 18px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:4px}'
    + '#cz-app-upd b{font-size:15.5px}#cz-app-upd span{font-size:14px;line-height:1.45;color:rgba(255,255,255,.82)}'
    + '#cz-app-upd .r{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}#cz-app-upd button{flex:1 1 auto;min-height:46px;border:0;border-radius:12px;background:#2f7d59;color:#fff;font:inherit;font-weight:600;font-size:15px;padding:0 14px}'
    + '#cz-app-upd button.hell{background:rgba(255,255,255,.14)}#cz-app-upd.sperre{inset:0;align-items:center;padding:24px;background:rgba(20,16,10,.74)}#cz-app-upd.sperre .k{padding:22px 20px}';
  document.head.appendChild(updCss);
  function verNr(v) { return String(v || '').split('.').map(function (x) { return parseInt(x, 10) || 0; }); }
  function verKleiner(a, b) { a = verNr(a); b = verNr(b); for (var i = 0; i < Math.max(a.length, b.length); i++) { var x = a[i] || 0, y = b[i] || 0; if (x !== y) return x < y; } return false; }
  function aktualisieren(st) {
    if (!AU) return;
    var id = st && st.ios_app_id;
    if (PLATT === 'android') {
      AU.getAppUpdateInfo().then(function (i) { return i && i.immediateUpdateAllowed ? AU.performImmediateUpdate() : AU.openAppStore(); })
        .catch(function () { AU.openAppStore().catch(leer); });
      return;
    }
    AU.openAppStore(id ? { appId: id } : {}).catch(function () { location.href = id ? 'itms-apps://apps.apple.com/app/id' + id : 'itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&term=clickzauber'; });
  }
  function updateZeigen(sperre, neu, st) {
    var alt = $('cz-app-upd'); if (alt) alt.remove();
    var d = document.createElement('div'); d.id = 'cz-app-upd'; if (sperre) d.className = 'sperre';
    d.innerHTML = '<div class="k" role="' + (sperre ? 'alertdialog' : 'status') + '"><b>' + (sperre ? 'Bitte aktualisieren Sie clickzauber' : 'Neue Version von clickzauber') + '</b><span>'
      + (sperre ? 'Diese Version wird nicht mehr unterstützt. Das Update dauert nur einen Moment.' : (neu ? 'Version ' + neu + ' ist da.' : 'Eine neue Version ist da.')) + '</span>'
      + '<div class="r"><button type="button" data-upd="los">' + (PLATT === 'ios' ? 'Im App Store aktualisieren' : 'Jetzt aktualisieren') + '</button>'
      + (sperre ? '' : '<button type="button" class="hell" data-upd="spaeter">Später</button>') + '</div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-upd]'); if (!b) return;
      if (b.getAttribute('data-upd') === 'los') { aktualisieren(st); return; }
      try { localStorage.setItem('cz_app_upd_' + (neu || 'neu'), new Date().toISOString().slice(0, 10)); } catch (x) {}
      d.remove();
    });
  }
  function updatePruefen() {
    if (!AU || Date.now() - UPD_ZULETZT < 30 * 60 * 1000) return;
    UPD_ZULETZT = Date.now();
    Promise.all([
      AU.getAppUpdateInfo().catch(function () { return null; }),
      APP ? APP.getInfo().catch(function () { return null; }) : null,
      fetch(API + '/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (x) {
      var i = x[0] || {}, st = x[2] || {}, jetzt = i.currentVersionName || (x[1] && x[1].version) || '', neu = i.availableVersionName || '';
      var min = PLATT === 'ios' ? st.app_min_ios : st.app_min_android, o = $('cz-app-upd');
      /* Sperre nur, wenn im Store wirklich eine neuere Version liegt. Sonst käme niemand mehr weiter (Mindestversion zu früh eingetragen, Apple prüft noch). */
      var gibtNeu = i.updateAvailability === 2 || !!(neu && jetzt && verKleiner(jetzt, neu));
      if (jetzt && min && verKleiner(jetzt, min) && gibtNeu) { updateZeigen(true, neu, st); return; }
      if (o) o.remove();
      if (!jetzt || !gibtNeu) return;
      var heute = new Date().toISOString().slice(0, 10), weg = '';
      try { weg = localStorage.getItem('cz_app_upd_' + (neu || 'neu')) || ''; } catch (e) {}
      if (weg !== heute) updateZeigen(false, neu, st);
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) updatePruefen(); });

  function los() { anmeldenSeite(); cockpit(); teilenKnopf(); setTimeout(updatePruefen, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
