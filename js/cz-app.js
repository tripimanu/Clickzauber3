/* cz-app.js — App-Installation und dauerhaftes Anmelden.
   Wird direkt in die Seiten eingebettet. */
(function () {
  'use strict';

  /* ---------- Service Worker ---------- */
  /* Nur auf clickzauber.de: In Vorschau- und Testumgebungen fing der Worker sonst Anfragen ab. */
  if('serviceWorker' in navigator && !/(^|\.)clickzauber\.de$/.test(location.hostname)){ try{ var eigen=new URL('sw.js',location.href).pathname.replace(/^\/_t\/[^\/]+/,''); navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ var w=r.active||r.installing||r.waiting; if(w&&new URL(w.scriptURL).pathname.replace(/^\/_t\/[^\/]+/,'')===eigen) r.unregister(); }); }).catch(function(){}); }catch(e){} }
  if ('serviceWorker' in navigator && /(^|\.)clickzauber\.de$/.test(location.hostname)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---------- Umgebung erkennen ---------- */
  var ua = navigator.userAgent || '';
  var istIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var istAndroid = /Android/.test(ua);
  var istMobil = istIOS || istAndroid || window.matchMedia('(max-width:820px)').matches;
  var alsApp = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  window.czApp = { istIOS: istIOS, istAndroid: istAndroid, istMobil: istMobil, alsApp: alsApp };

  var angebot = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    angebot = e;
    window.czApp.angebot = e;
  });
  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem('cz_app_installiert', '1'); } catch (e) {}
    schliessen();
  });

  var CSS = '.cza-back{position:fixed;inset:0;z-index:9000;background:rgba(28,24,16,.5);backdrop-filter:blur(4px);opacity:0;transition:opacity .3s}'
    + '.cza-back.on{opacity:1}'
    + '.cza{position:fixed;left:0;right:0;bottom:0;z-index:9001;background:#fff;border-radius:24px 24px 0 0;padding:24px 22px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -20px 50px -20px rgba(30,25,15,.45);transform:translateY(102%);transition:transform .42s cubic-bezier(.2,.8,.2,1);max-height:92vh;overflow-y:auto;font-family:"Space Grotesk",system-ui,-apple-system,sans-serif;color:#211d16}'
    + '.cza.on{transform:none}'
    + '@media(min-width:640px){.cza{left:50%;right:auto;bottom:24px;transform:translate(-50%,120%);width:420px;border-radius:24px}.cza.on{transform:translate(-50%,0)}}'
    + '.cza-grip{width:38px;height:4px;border-radius:99px;background:#e6ddca;margin:-8px auto 18px}'
    + '.cza-ic{width:52px;height:52px;border-radius:14px;background:#1f6d4a;color:#fff;display:grid;place-items:center;font-size:26px;font-weight:700;margin-bottom:15px}.cza-ic svg{width:62%;height:62%;display:block}'
    + '.cza h3{margin:0 0 8px;font-size:20px;letter-spacing:-.02em;line-height:1.2}'
    + '.cza .lead{margin:0 0 18px;font-size:14.5px;line-height:1.6;color:#5f584a;text-wrap:pretty}'
    + '.cza ol{margin:0 0 20px;padding:0;list-style:none;display:flex;flex-direction:column;gap:13px}'
    + '.cza li{display:flex;gap:12px;align-items:flex-start;font-size:14.5px;line-height:1.5;color:#211d16}'
    + '.cza li i{flex:0 0 auto;width:24px;height:24px;border-radius:8px;background:#e9f3ed;color:#1f6d4a;font-style:normal;font-size:12px;font-weight:700;display:grid;place-items:center;margin-top:1px}'
    + '.cza li b{font-weight:600}'
    + '.cza .gl{display:inline-flex;align-items:center;gap:5px;background:#f2ede1;border-radius:7px;padding:2px 8px;font-size:13px;white-space:nowrap}'
    + '.cza .gl svg{width:13px;height:13px;stroke:#1f6d4a;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + '.cza .row{display:flex;flex-direction:column;gap:9px}'
    + '.cza button{font:inherit;font-size:15px;font-weight:600;border-radius:999px;padding:14px;min-height:50px;cursor:pointer;border:none;width:100%}'
    + '.cza .prim{background:#1f6d4a;color:#fff}'
    + '.cza .ghost{background:#fff;border:1.5px solid #e6ddca;color:#5f584a}'
    + '.cza .why{margin:16px 0 0;font-size:12.5px;line-height:1.55;color:#8a8270}';

  var back = null, blatt = null;

  function schliessen() {
    if (!blatt) return;
    blatt.classList.remove('on');
    back.classList.remove('on');
    setTimeout(function () {
      if (blatt && blatt.parentNode) blatt.parentNode.removeChild(blatt);
      if (back && back.parentNode) back.parentNode.removeChild(back);
      blatt = null; back = null;
    }, 420);
  }

  function schritteIOS() {
    return '<li><i>1</i><span>Unten in der Leiste auf <span class="gl"><svg viewBox="0 0 24 24"><path d="M12 16V3M8 7l4-4 4 4"></path><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path></svg>Teilen</span> tippen.</span></li>'
      + '<li><i>2</i><span>In der Liste nach unten wischen bis <b>„Zum Home-Bildschirm"</b>.</span></li>'
      + '<li><i>3</i><span>Oben rechts auf <b>Hinzufügen</b> tippen. Fertig.</span></li>';
  }
  function schritteAndroid() {
    return '<li><i>1</i><span>Oben rechts auf <span class="gl">⋮ Menü</span> tippen.</span></li>'
      + '<li><i>2</i><span><b>„App installieren"</b> oder <b>„Zum Startbildschirm hinzufügen"</b> wählen.</span></li>'
      + '<li><i>3</i><span>Mit <b>Installieren</b> bestätigen. Fertig.</span></li>';
  }

  function anleitungZeigen(opt) {
    opt = opt || {};
    if (blatt || alsApp) { if (opt.beiSchliessen) opt.beiSchliessen(); return; }

    if (!document.getElementById('cz-app-css')) {
      var st = document.createElement('style');
      st.id = 'cz-app-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    back = document.createElement('div');
    back.className = 'cza-back';
    blatt = document.createElement('div');
    blatt.className = 'cza';
    blatt.setAttribute('role', 'dialog');
    blatt.setAttribute('aria-label', 'clickzauber als App speichern');

    var schritte = angebot ? '' : (istIOS ? schritteIOS() : schritteAndroid());

    blatt.innerHTML = '<div class="cza-grip"></div>'
      + '<div class="cza-ic"><svg class="cz-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="4.4" fill="currentColor"></circle><path d="M16 5.6a10.4 10.4 0 0 1 10.4 10.4" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path><path d="M16 26.4A10.4 10.4 0 0 1 5.6 16" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path></svg></div>'
      + '<h3>' + (opt.titel || 'clickzauber als App speichern') + '</h3>'
      + '<p class="lead">' + (opt.text || 'Legen Sie clickzauber neben Ihre Apps. Dann öffnen Sie Anfragen und Konfigurator mit einem Tipp — ohne Browser, ohne Adresse eintippen.') + '</p>'
      + (schritte ? '<ol>' + schritte + '</ol>' : '')
      + '<div class="row">'
      + (angebot ? '<button class="prim" data-cz-inst>App installieren</button>' : '')
      + '<button class="' + (angebot ? 'ghost' : 'prim') + '" data-cz-zu>' + (angebot ? 'Später' : 'Verstanden') + '</button>'
      + '</div>'
      + '<p class="why">Sie bleiben in der App angemeldet — Ihren Code geben Sie nur dieses eine Mal ein.</p>';

    document.body.appendChild(back);
    document.body.appendChild(blatt);
    requestAnimationFrame(function () { back.classList.add('on'); blatt.classList.add('on'); });

    function fertig() {
      try { localStorage.setItem('cz_app_hinweis', String(Date.now())); } catch (e) {}
      schliessen();
      if (opt.beiSchliessen) opt.beiSchliessen();
    }
    back.onclick = fertig;
    blatt.querySelector('[data-cz-zu]').onclick = fertig;
    var inst = blatt.querySelector('[data-cz-inst]');
    if (inst) {
      inst.onclick = function () {
        angebot.prompt();
        var w = angebot.userChoice;
        angebot = null;
        if (w && w.then) w.then(fertig, fertig); else fertig();
      };
    }
  }

  function anleitungVorschlagen(opt) {
    if (alsApp || !istMobil) return false;
    var zuletzt = 0;
    try { zuletzt = +(localStorage.getItem('cz_app_hinweis') || 0); } catch (e) {}
    if (Date.now() - zuletzt < 14 * 864e5) return false;
    anleitungZeigen(opt);
    return true;
  }

  window.czApp.anleitungZeigen = anleitungZeigen;
  window.czApp.anleitungVorschlagen = anleitungVorschlagen;

  /* ---------- Angemeldet bleiben ---------- */
  window.czApp.token = function () {
    try { return localStorage.getItem('cz_user_token') || ''; } catch (e) { return ''; }
  };
  window.czApp.merken = function (token, email) {
    try {
      if (token) localStorage.setItem('cz_user_token', token);
      if (email) localStorage.setItem('cz_user_email', email);
    } catch (e) {}
  };
  window.czApp.email = function () {
    try { return localStorage.getItem('cz_user_email') || ''; } catch (e) { return ''; }
  };
  window.czApp.abmelden = function () {
    try { localStorage.removeItem('cz_user_token'); } catch (e) {}
  };
})();
