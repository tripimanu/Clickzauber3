/* Testzugang aus dem Einladungs-Link (seit 09.10.2026, sql/67, lib/einladung.js).
   - Startseite: Karte „Ihre ersten Schritte“ (E-Mail bestätigen, Home-Bildschirm, Formular einschalten,
     selbst eine Anfrage schicken, weiterschicken), darunter „Rückmeldung an Manuel“ (POST /api/einladung 'rueckmeldung').
     Was sich nicht vom Server ablesen lässt (Home-Bildschirm, Probe, Teilen), merkt sich das Gerät.
   - Einstellungen → Konto: Zeile „Testzugang“ mit Countdown.
   - ?test=start (nach dem Einlösen): einmal „Ihr Testzugang startet jetzt“.
   - Abgelaufen: Hinweis oben. Das Formular auf der Website ist dann aus (lib/config.js), das Cockpit bleibt offen.
   - ?test=beispiel: Karte mit Beispieldaten, ohne Server.
   - Checkliste auf der Plattform (js/cz-kundenakte.js, sql/68): Was nur das Gerät weiß (Home-Bildschirm, Probe, Teilen,
     Formular angesehen), meldet es einmal an den Server (POST /api/einladung 'schritt'). */
(function(){
  'use strict';
  var BSP=/[?&]test=beispiel/.test(location.search);
  function tk(){ try{ return localStorage.getItem('cz_user_token')||''; }catch(x){ return ''; } }
  if((!tk()&&!BSP)||window._admin) return;
  var API=(typeof window.API==='string'&&window.API)||'https://clickzauber-api.vercel.app/api';
  var HOST=API.replace(/\/api\/?$/,'');
  var $=function(i){ return document.getElementById(i); };
  function e(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var alsApp=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
  var U=null, BIS=0, SIG='', UHR=null, MYW=null, FREI=false;
  var HAKEN='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>';

  function datum(d){ return d.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})+', '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr'; }
  function rest(){
    var ms=BIS-Date.now(); if(ms<=0) return null;
    var t=Math.floor(ms/864e5), s=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4);
    return {t:t,s:s,m:m,text:(t?t+(t===1?' Tag, ':' Tage, '):'')+s+' Std., '+m+' Min.'};
  }
  function tage(x){ return x.t>=1?'noch '+x.t+(x.t===1?' Tag':' Tage'):'endet heute'; }
  function F(){ try{ return JSON.parse(localStorage.getItem('czt_'+(U.email||''))||'{}')||{}; }catch(x){ return {}; } }
  function setF(k){ var f=F(); f[k]=Date.now(); try{ localStorage.setItem('czt_'+(U.email||''),JSON.stringify(f)); }catch(x){} zeichnen(); if(k==='home'||k==='teilen'||k==='probe') melden(k); if(k==='probe') melden('formular'); }
  /* Für die Checkliste auf der Plattform: einmal je Schritt und Gerät, gemerkt erst, wenn der Server es hat. */
  function melden(k){
    if(BSP||!U||F()['m_'+k]) return;
    fetch(API+'/einladung',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aktion:'schritt',token:tk(),schritt:k})})
      .then(function(r){ if(!r.ok||!U) return; var f=F(); f['m_'+k]=Date.now(); try{ localStorage.setItem('czt_'+(U.email||''),JSON.stringify(f)); }catch(x){} }).catch(function(){});
  }
  /* Formular angesehen: jedes Öffnen des eigenen Formulars aus dem Cockpit (Link oder neues Fenster) */
  var czOpen=window.open;
  if(typeof czOpen==='function') window.open=function(u){ try{ if(/share\.html\?w=/.test(String(u||''))) melden('formular'); }catch(x){} return czOpen.apply(window,arguments); };
  document.addEventListener('click',function(ev){ if(ev.target.closest&&ev.target.closest('a[href*="share.html?w="]')) melden('formular'); },true);
  function an(ws){ return !!(ws&&ws.length)&&ws.every(function(w){ return !w.status||w.status==='live'; }); }
  function live(){ if(BSP) return !!F().bsp_live; return an(MYW)||an(window.SRV_WIDGETS); }
  function link(){
    if(BSP) return 'verkaufsslides/inhaltsverzeichnis.html?v=kate';
    var ws=(MYW&&MYW.length)?MYW:(window.SRV_WIDGETS||[]); if(!ws.length) return '';
    var w=window.widget; if(!ws.some(function(x){ return x.slug===w; })) w=ws[0].slug;
    return w?HOST+'/share.html?w='+encodeURIComponent(w):'';
  }
  function hatAnfrage(){ try{ return Object.keys(window.LEADS||{}).length>0; }catch(x){ return false; } }
  /* Terminbuchung (Friseur, Kosmetik) oder Anfrage-Formular (Food Truck, Catering …): Art des Cockpits aus js/cz-art.js, sonst Terminbuchung */
  function terminArt(){ var b=document.body.classList; return b.contains('art-termin')||!(b.contains('art-auftrag')||b.contains('art-pipeline')||b.contains('art-projekt')); }
  function bestaetigt(){ return BSP?!!F().bsp_mail:!!(U.bestaetigt||U.verified); }

  var css=document.createElement('style');
  css.textContent='.czt-uhr{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}.czt-uhr.aus{color:var(--bad,#bc5138)}'
    +'.czt-hinweis{margin:0 0 16px;padding:14px 16px;border-radius:14px;background:#fbeee9;border:1px solid #efcdc2;color:#7a2e1c;font-size:15px;line-height:1.5}.czt-hinweis b{display:block;font-size:16px;margin-bottom:2px}'
    +'.czt-back{position:fixed;inset:0;background:rgba(20,17,12,.45);z-index:9000;display:grid;place-items:center;padding:18px}'
    +'.czt-box{background:var(--panel,#fffdf8);color:var(--ink,#241f19);border-radius:20px;max-width:420px;width:100%;padding:26px 22px 20px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25)}'
    +'.czt-box .z{font-size:56px;font-weight:700;line-height:1;color:var(--accent,#2f7d59)}.czt-box h2{margin:8px 0 6px;font-size:21px}.czt-box p{margin:0 0 16px;color:var(--ink-2,#5f584a);font-size:15px;line-height:1.5;text-wrap:pretty}'
    +'.czt-box button{min-height:48px;width:100%;border:0;border-radius:999px;background:var(--accent,#2f7d59);color:#fff;font:inherit;font-weight:600;font-size:16px;cursor:pointer}'
    +'.czt-k{margin-bottom:16px}.czt-kopf{display:flex;justify-content:space-between;align-items:baseline;gap:4px 14px;flex-wrap:wrap}.czt-kopf h2{margin:0;font-size:19px}.czt-zahl{font-size:14px;color:var(--ink-2)}'
    +'.czt-l{list-style:none;margin:8px 0 0;padding:0}.czt-s{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;padding:14px 0;border-top:1px solid var(--line)}.czt-s:first-child{border-top:0}'
    +'.czt-n{width:28px;height:28px;border-radius:50%;border:2px solid var(--line-2,var(--line));display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--ink-2);margin-top:1px}'
    +'.czt-s.ok .czt-n{background:var(--accent,#2f7d59);border-color:var(--accent,#2f7d59);color:#fff}'
    +'.czt-s h3{margin:2px 0 3px;font-size:16px;line-height:1.35}.czt-s.ok h3{color:var(--ink-2)}'
    +'.czt-s p,.czt-fb p{margin:0;font-size:14.5px;line-height:1.5;color:var(--ink-2);text-wrap:pretty}'
    +'.czt-kn{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}'
    +'.czt-kn button,.czt-kn a,.czt-fertig button{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line-2,var(--line));background:transparent;color:var(--ink);font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer}'
    +'.czt-kn .h{background:var(--accent,#2f7d59);border-color:var(--accent,#2f7d59);color:#fff}.czt-kn button:disabled{opacity:.5;cursor:default}'
    +'.czt-fertig{margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;font-size:15px;color:var(--ink-2)}'
    +'.czt-fb{margin-top:6px;padding-top:16px;border-top:1px solid var(--line)}.czt-k.zu .czt-fb{margin-top:0;padding-top:0;border-top:0}.czt-fb h3{margin:0 0 3px;font-size:16px}'
    +'.czt-fb textarea{display:block;width:100%;box-sizing:border-box;margin-top:10px;min-height:92px;padding:12px 14px;border:1.5px solid var(--line-2,var(--line));border-radius:12px;background:var(--panel,#fff);color:var(--ink);font:inherit;font-size:15px;line-height:1.5;resize:vertical}'
    +'.czt-fb textarea:focus{outline:none;border-color:var(--accent,#2f7d59)}'
    +'.czt-msg{margin:8px 0 0;font-size:14px;color:var(--ink-2)}.czt-msg:empty{display:none}.czt-msg.ok{color:var(--accent,#2f7d59)}.czt-msg.bad{color:var(--bad,#bc5138)}'
    +'.czl-sw.czt-puls{animation:cztPuls 1s ease-in-out 4}@keyframes cztPuls{50%{box-shadow:0 0 0 12px rgba(29,127,84,.3),0 10px 26px -8px rgba(15,70,45,.6)}}';
  document.head.appendChild(css);

  function schritte(){
    var f=F(), ok1=bestaetigt(), ok3=live(), lk=link();
    return [
      {ok:ok1, h:'E-Mail-Adresse bestätigen',
        p:ok1?'Bestätigt. Dorthin gehen Ihre Anfragen.':'Wir haben Ihnen eine Mail an '+e(U.email)+' geschickt. Tippen Sie dort auf den Link. Keine Mail da? Bitte auch im Spam-Ordner nachsehen.',
        k:ok1?'':'<button type="button" data-czt="mail">Mail noch einmal senden</button>'},
      {ok:alsApp||!!f.home, h:'Auf den Home-Bildschirm legen',
        p:alsApp?'Erledigt. Ihr Cockpit ist mit einem Tipp da.':'Dann ist Ihr Cockpit mit einem Tipp da, und neue Anfragen melden sich als Mitteilung. Öffnen Sie danach das neue Symbol und melden Sie sich dort einmal mit E-Mail und Passwort an.',
        k:(alsApp||f.home)?'':'<button type="button" class="h" data-czt="home">So geht’s</button><button type="button" data-czt="home-ok">Schon erledigt</button>'},
      {ok:ok3, h:'Formular einschalten',
        p:ok3?'Eingeschaltet. Ab jetzt sind Anfragen echt.':(ok1?'Oben rechts sitzt der grüne Schalter. Ein Tipp darauf, und Ihr Formular nimmt echte Anfragen an.':'Oben rechts sitzt der grüne Schalter. Er geht, sobald Ihre E-Mail-Adresse bestätigt ist.'),
        k:ok3?'':'<button type="button" class="h" data-czt="live"'+(ok1?'':' disabled')+'>Schalter zeigen</button>'},
      {ok:!!f.probe||hatAnfrage(), h:'Selbst eine Anfrage schicken',
        p:'Füllen Sie Ihr Formular einmal selbst aus, so wie Ihre Kunden es tun, und schicken Sie es ab. Die Anfrage erscheint gleich hier im Cockpit.',
        k:ok3&&lk?'<a class="h" href="'+e(lk)+'" target="_blank" rel="noopener" data-czt="probe">Formular öffnen</a>':'<button type="button" disabled>Erst einschalten</button>'},
      {ok:!!f.teilen, h:'Zum Testen weiterschicken',
        p:terminArt()?'Bitten Sie zwei, drei Bekannte, einmal einen Termin anzufragen. Diese Anfragen sind echt: Ihre Bekannten bekommen eine Bestätigung, der Termin steht in Ihrem Kalender. Absagen können Sie wie immer.'
          :'Bitten Sie zwei, drei Bekannte, einmal eine Anfrage zu schicken. Diese Anfragen sind echt: Ihre Bekannten bekommen eine Bestätigung, die Anfrage steht hier im Cockpit. Absagen können Sie wie immer.',
        k:ok3&&lk?'<button type="button" class="h" data-czt="teilen">Per WhatsApp teilen</button><button type="button" data-czt="kopie">Link kopieren</button>':'<button type="button" disabled>Erst einschalten</button>'}
    ];
  }

  function zeichnen(){
    if(!U) return;
    var x=rest(), karte=$('czt-karte');
    if(!x){ if(karte) karte.remove(); return; }
    var S=schritte(), n=S.filter(function(s){ return s.ok; }).length, zu=n===S.length&&!!F().zu;
    var sig=JSON.stringify([S.map(function(s){ return s.ok?1:0; }),zu,x.t,link()]);
    if(karte&&sig===SIG) return;
    SIG=sig;
    if(!karte){
      karte=document.createElement('div'); karte.className='card czt-k'; karte.id='czt-karte';
      karte.innerHTML='<div id="czt-oben"></div><div class="czt-fb"><h3>Rückmeldung an Manuel</h3><p>Was gefällt Ihnen, was fehlt, was war unklar? Auch was Ihre Bekannten sagen, hilft.</p>'
        +'<textarea id="czt-text" maxlength="3000" rows="3" aria-label="Ihre Rückmeldung"></textarea>'
        +'<div class="czt-kn"><button type="button" class="h" data-czt="senden">Senden</button></div><p class="czt-msg" id="czt-msg" role="status"></p></div>';
      var anker=$('errbox');
      if(anker&&anker.parentNode) anker.parentNode.insertBefore(karte,anker.nextSibling);
      else { var m=document.querySelector('main.main'); if(!m) return; m.insertBefore(karte,m.firstChild); }
    }
    karte.classList.toggle('zu',zu);
    $('czt-oben').innerHTML=zu?'':'<div class="czt-kopf"><h2>Ihre ersten Schritte</h2><span class="czt-zahl">'+n+' von '+S.length+' erledigt · Test '+tage(x)+'</span></div>'
      +(n===S.length?'<p class="czt-fertig">Alles erledigt. Jetzt fehlen nur noch Ihre Rückmeldungen.<button type="button" data-czt="zu">Schritte ausblenden</button></p>':'')
      +'<ol class="czt-l">'+S.map(function(s,i){
        return '<li class="czt-s'+(s.ok?' ok':'')+'"><span class="czt-n">'+(s.ok?HAKEN:(i+1))+'</span><div><h3>'+s.h+'</h3><p>'+s.p+'</p>'+(s.k?'<div class="czt-kn">'+s.k+'</div>':'')+'</div></li>';
      }).join('')+'</ol>';
  }

  function zeile(){
    var r=$('czt-zeile');
    if(!r){
      var anker=$('set-plan'); anker=anker&&anker.closest('.setrow'); if(!anker) return;
      r=document.createElement('div'); r.className='setrow'; r.id='czt-zeile';
      r.innerHTML='<div class="l"><h3>Testzugang</h3><p id="czt-bis"></p></div><div class="r"><span class="czt-uhr" id="czt-uhr"></span></div>';
      anker.parentNode.insertBefore(r,anker);
    }
    var x=rest(), u=$('czt-uhr'), b=$('czt-bis');
    u.textContent=x?'noch '+x.text:'abgelaufen'; u.classList.toggle('aus',!x);
    b.textContent=x?'Läuft bis '+datum(new Date(BIS))+'.':'Ihr Formular ist auf Ihrer Website ausgeblendet. Bitte melden Sie sich bei Manuel.';
    if(!x){ hinweis(); clearInterval(UHR); }
  }
  function hinweis(){
    if($('czt-hinweis')) return;
    var m=document.querySelector('main.main'); if(!m) return;
    var d=document.createElement('div'); d.className='czt-hinweis'; d.id='czt-hinweis';
    d.innerHTML='<b>Ihr Testzugang ist abgelaufen</b>Ihr Cockpit bleibt offen, Ihr Formular ist auf Ihrer Website aber ausgeblendet. Bitte melden Sie sich bei Manuel: <a href="mailto:projekt@clickzauber.de">projekt@clickzauber.de</a>';
    m.insertBefore(d,m.firstChild);
  }
  function startFenster(){
    var u=new URL(location.href); u.searchParams.delete('test'); history.replaceState(null,'',u);
    var x=rest(); if(!x) return;
    var b=document.createElement('div'); b.className='czt-back';
    b.innerHTML='<div class="czt-box" role="dialog" aria-modal="true" aria-labelledby="czt-h"><div class="z">'+(x.t+(x.s||x.m?1:0))+'</div><h2 id="czt-h">Ihr Testzugang startet jetzt</h2>'
      +'<p>Sie testen clickzauber 14 Tage kostenlos, bis '+datum(new Date(BIS))+'. Auf der Startseite stehen fünf kurze Schritte bis zur ersten echten Anfrage. Wie viel Zeit noch bleibt, sehen Sie unter Einstellungen.</p><button type="button">Los geht’s</button></div>';
    b.querySelector('button').onclick=function(){ b.remove(); };
    document.body.appendChild(b);
  }

  /* Nach „In echtes Konto überführen“ (Plattform): einmal je Konto (m:konto_frei), nicht je Gerät. */
  function frei(u){
    var t=Array.isArray(u.touren)?u.touren:null, lk='czt_frei_'+(u.email||'');
    if(FREI||(t&&t.indexOf('m:konto_frei')>=0)) return;
    FREI=true;
    try{ if(!t&&localStorage.getItem(lk)) return; localStorage.setItem(lk,'1'); }catch(x){}
    fetch(API+'/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:tk(),msn_gesehen:['konto_frei']})}).catch(function(){});
    var b=document.createElement('div'); b.className='czt-back';
    b.innerHTML='<div class="czt-box" role="dialog" aria-modal="true" aria-labelledby="czt-fh"><div class="z"><svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M7.5 12.5l3 3 6-6.5"></path></svg></div><h2 id="czt-fh">Ihr Konto ist freigeschaltet</h2>'
      +'<p>Ihr Testzugang ist jetzt ein richtiges Konto. Alles bleibt, wie es ist: Ihr Formular, Ihre Anfragen und Ihre Einstellungen.</p><button type="button">Schön</button></div>';
    b.querySelector('button').onclick=function(){ b.remove(); };
    document.body.appendChild(b);
  }
  function laden(erst){
    if(BSP){
      U={email:'beispiel',test_bis:new Date(Date.now()+13.6*864e5).toISOString()};
      BIS=new Date(U.test_bis).getTime(); zeichnen(); zeile(); return;
    }
    fetch(API+'/profile?token='+encodeURIComponent(tk())).then(function(r){ return r.ok?r.json():null; }).then(function(j){
      var u=j&&j.user; if(!u) return;
      if(Array.isArray(j.widgets)) MYW=j.widgets;
      if(!u.test_bis){
        U=null; clearInterval(UHR);
        ['czt-karte','czt-zeile','czt-hinweis'].forEach(function(i){ var x=$(i); if(x) x.remove(); });
        if(u.eingeloest_am) frei(u);
        return;
      }
      U=u; BIS=new Date(u.test_bis).getTime();
      if(window.user) window.user.bestaetigt=u.bestaetigt;
      zeichnen(); zeile();
      if(alsApp) melden('home');
      if(erst){
        clearInterval(UHR); UHR=setInterval(zeile,30000);
        if(/[?&]test=start/.test(location.search)) startFenster();
        if(!rest()) hinweis();
      }
    }).catch(function(){});
  }

  document.addEventListener('click',function(ev){
    if(U&&!BSP&&ev.target.closest&&ev.target.closest('#czl-sw')){ setTimeout(function(){ laden(false); },2500); setTimeout(function(){ laden(false); },7000); }
    var b=ev.target.closest&&ev.target.closest('[data-czt]'); if(!b||!U) return;
    var a=b.getAttribute('data-czt'), msg=$('czt-msg');
    if(a==='mail'){
      b.disabled=true; b.textContent='Wird gesendet …';
      if(BSP){ setF('bsp_mail'); return; }
      fetch(API+'/auth/bestaetigung-neu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:U.email})})
        .then(function(){ b.textContent='Gesendet'; },function(){ b.disabled=false; b.textContent='Mail noch einmal senden'; });
    } else if(a==='home'){
      if(window.czApp&&window.czApp.anleitungZeigen) window.czApp.anleitungZeigen();
      else alert('iPhone: unten auf Teilen tippen, dann „Zum Home-Bildschirm“.');
    } else if(a==='home-ok') setF('home');
    else if(a==='live'){
      if(BSP){ setF('bsp_live'); return; }
      window.scrollTo(0,0);
      var sw=$('czl-sw'); if(sw){ sw.classList.remove('czt-puls'); void sw.offsetWidth; sw.classList.add('czt-puls'); }
    } else if(a==='probe') setTimeout(function(){ setF('probe'); },300);
    else if(a==='teilen'){
      var lk=link(), text=terminArt()?'Ich teste gerade meine neue Online-Terminanfrage. Magst du einmal einen Termin anfragen und mir sagen, wie es war?':'Ich teste gerade mein neues Online-Anfrageformular. Magst du einmal eine Anfrage schicken und mir sagen, wie es war?';
      if(navigator.share) navigator.share({text:text,url:lk}).catch(function(){});
      else window.open('https://wa.me/?text='+encodeURIComponent(text+' '+lk),'_blank');
      setF('teilen');
    } else if(a==='kopie'){
      var l2=link();
      (navigator.clipboard?navigator.clipboard.writeText(l2):Promise.reject()).then(function(){ b.textContent='Kopiert'; setTimeout(function(){ setF('teilen'); },900); },function(){ prompt('Link kopieren:',l2); setF('teilen'); });
    } else if(a==='zu') setF('zu');
    else if(a==='senden'){
      var t=$('czt-text'), v=(t.value||'').trim();
      if(v.length<3){ msg.className='czt-msg bad'; msg.textContent='Bitte schreiben Sie ein paar Worte.'; t.focus(); return; }
      if(BSP){ msg.className='czt-msg ok'; msg.textContent='Beispiel: Hier ginge Ihre Rückmeldung an Manuel.'; return; }
      b.disabled=true; msg.className='czt-msg'; msg.textContent='Wird gesendet …';
      fetch(API+'/einladung',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aktion:'rueckmeldung',token:tk(),text:v})})
        .then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
        .then(function(j){ b.disabled=false; if(j.ok){ t.value=''; msg.className='czt-msg ok'; msg.textContent='Danke! Manuel hat Ihre Rückmeldung.'; } else { msg.className='czt-msg bad'; msg.textContent=j.error||'Das hat nicht geklappt. Bitte noch einmal versuchen.'; } })
        .catch(function(){ b.disabled=false; msg.className='czt-msg bad'; msg.textContent='Keine Verbindung. Bitte noch einmal versuchen.'; });
    }
  });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible'&&!BSP&&(U||!FREI)) laden(false); });
  addEventListener('storage',function(ev){ if(ev.key==='cz_bestaetigt'&&!BSP) laden(false); });
  setInterval(zeichnen,4000);
  laden(true);
})();
