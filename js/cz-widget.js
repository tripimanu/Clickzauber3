/* clickzauber Widget-Kern — wird von index.html und Kunden-Websites geladen.
   Einbinden:  <div class="cw" data-cz-widget></div>  +  <script src="js/cz-widget.js"><\/script>
   Optional:   window.CZ_WIDGET = { brand:'Gut Seerose', ort:'Bodensee', skin:'glass-milk', accent:'#1f6d4a', ziel:'…' }
   Eigenes Design: window.CZ_WIDGET.eigen = { flaeche:'#12203a', knopf:'#c9a862', bild:'https://…/haus.jpg', schrift:'Montserrat' }
   Alle vier Angaben sind einzeln optional. Was fehlt, bleibt beim gewählten Stil. */
(function(){
  var CSS = "/* ===== MILCHGLAS-WIDGET (live) ===== */\n:root{\n  --cw-mood:radial-gradient(120% 90% at 25% 0%,rgba(170,200,150,.55),transparent 55%),radial-gradient(100% 80% at 90% 20%,rgba(90,130,100,.6),transparent 60%),linear-gradient(180deg,#4a6349,#1e2b1f);\n  --cw-accent:#1f6d4a;--cw-ink:#1e2b1f;--cw-ink2:#5b6b5c;--cw-line:#dbe3dc;\n  --cw-fq:\"Marcellus\",serif;--cw-fa:\"DM Sans\",system-ui,sans-serif;\n}\n.cw{-webkit-text-size-adjust:100%;text-size-adjust:100%}.cw{--cw-ue:44px;position:relative;border-radius:24px;max-width:600px;margin:0 auto;box-sizing:border-box;background-image:var(--cw-mood);background-size:cover;background-position:center;padding:18px 22px;display:flex;flex-direction:column;justify-content:center;min-height:470px;box-shadow:0 34px 70px -34px rgba(40,30,15,.6);transition:background-image .45s}\n.cw-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;color:#fff;margin-bottom:auto;padding:4px 4px 26px}\n.cw-brand{font-family:var(--cw-fq);font-size:20px;line-height:1.1;text-shadow:0 2px 12px rgba(0,0,0,.45)}\n.cw-brand small{display:block;font-family:var(--fm);font-size:9px;letter-spacing:.2em;text-transform:uppercase;opacity:.9;margin-top:3px}\n.cw-step{font-family:var(--fm);font-size:10px;letter-spacing:.16em;color:rgba(255,255,255,.88);text-shadow:0 2px 10px rgba(0,0,0,.5);white-space:nowrap;padding-top:4px}\n.cw-panel{background:rgba(255,255,255,.9);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.92);border-radius:22px;padding:20px 18px;box-shadow:0 18px 40px -20px rgba(0,0,0,.35)}\n.cw-bar{height:4px;border-radius:999px;background:var(--cw-line);overflow:hidden;margin-bottom:15px}\n.cw-bar i{display:block;height:100%;width:25%;background:var(--cw-accent);border-radius:999px;transition:width .45s cubic-bezier(.2,.7,.2,1)}\n.cw-q{font-family:var(--cw-fq);font-size:21px;font-weight:600;color:var(--cw-ink);line-height:1.22;letter-spacing:-.01em;margin:0 0 14px;text-wrap:pretty}\n.cw-opts{display:flex;flex-direction:column;gap:8px}\n.cw-opt{font-family:var(--cw-fa);font-size:15px;text-align:left;width:100%;background:#fff;border:1.5px solid var(--cw-line);border-radius:14px;padding:13px 16px;color:var(--cw-ink);cursor:pointer;transition:border-color .18s,transform .22s cubic-bezier(.2,.8,.2,1),background .18s,box-shadow .22s,margin .22s cubic-bezier(.2,.8,.2,1),padding .22s cubic-bezier(.2,.8,.2,1);min-height:48px;position:relative}\n.cw-opt:hover{border-color:var(--cw-accent);background:color-mix(in srgb,var(--cw-accent) 6%,#fff)}\n.cw-opt:active{transform:scale(.99)}\n.cw-sum{font-family:var(--cw-fa);display:flex;flex-direction:column;gap:7px;margin-bottom:14px}\n.cw-sum div{display:flex;justify-content:space-between;gap:14px;font-size:13.5px;color:var(--cw-ink2);border-bottom:1px dashed var(--cw-line);padding-bottom:6px}\n.cw-sum b{color:var(--cw-ink);font-weight:600;text-align:right}\n.cw-price{font-family:var(--cw-fa);background:color-mix(in srgb,var(--cw-accent) 9%,#fff);border-radius:14px;padding:13px 15px;margin-bottom:13px}\n.cw-price span{display:block;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--cw-ink2);font-family:var(--fm)}\n.cw-price b{font-size:24px;color:var(--cw-accent);letter-spacing:-.02em}\n.cw-go{font-family:var(--cw-fa);width:100%;background:var(--cw-accent);color:#fff;border:none;border-radius:999px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;min-height:48px}\n.cw-go:hover{filter:brightness(1.07)}\n.cw-again{font-family:var(--cw-fa);display:block;width:100%;background:none;border:none;color:var(--cw-ink2);font-size:13px;padding:10px 0 0;cursor:pointer;text-decoration:underline}\n\n.cw-lbl{font-family:var(--cw-fa);display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--cw-ink2);margin-bottom:7px}\n.cw-date{font-family:var(--cw-fa);width:100%;font-size:17px;border:1.5px solid var(--cw-line);border-radius:14px;padding:14px 15px;background:#fff;color:var(--cw-ink);min-height:52px}\n.cw-date:focus{outline:none;border-color:var(--cw-accent)}\n.cw-quick{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}\n.cw-quick button{font-family:var(--cw-fa);font-size:12.5px;background:#fff;border:1.5px solid var(--cw-line);border-radius:999px;padding:8px 13px;color:var(--cw-ink2);cursor:pointer;min-height:40px}\n.cw-quick button:hover{border-color:var(--cw-accent);color:var(--cw-accent)}\n.cw-hint{font-family:var(--cw-fa);font-size:13px;line-height:1.45;color:var(--cw-ink2);margin-top:11px;background:color-mix(in srgb,var(--cw-accent) 7%,#fff);border-radius:12px;padding:10px 13px}\n.cw-hint b{color:var(--cw-ink)}\n.cw-row{display:flex;gap:9px;margin-top:13px}\n.cw-row .cw-go{margin:0}\n.cw-skip{font-family:var(--cw-fa);background:#fff;border:1.5px solid var(--cw-line);border-radius:999px;padding:14px 18px;color:var(--cw-ink2);cursor:pointer;font-size:14px;white-space:nowrap;min-height:48px}\n.cw-skip:hover{border-color:var(--cw-accent);color:var(--cw-accent)}\n.cw-opt small{display:block;font-size:12.5px;color:var(--cw-ink2);margin-top:3px;line-height:1.4}\n.cw-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}\n.cw-back{font-family:var(--cw-fa);background:none;border:none;color:var(--cw-ink2);font-size:13px;cursor:pointer;padding:6px 2px;min-height:36px}\n.cw-back:hover{color:var(--cw-accent)}\n.cw-of{font-family:var(--fm);font-size:11px;letter-spacing:.1em;color:var(--cw-ink2)}\n\n.cw-cal{margin-top:4px}\n.cw-cal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}\n.cw-cal-head b{font-family:var(--cw-fa);font-size:15px;color:var(--cw-ink);font-weight:600}\n.cw-cal-nav{background:#fff;border:1.5px solid var(--cw-line);border-radius:10px;width:44px;height:44px;font-size:16px;color:var(--cw-ink2);cursor:pointer;line-height:1;flex:0 0 auto}\n.cw-cal-nav:hover{border-color:var(--cw-accent);color:var(--cw-accent)}\n.cw-cal-nav:disabled{opacity:.35;cursor:default}\n.cw-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}\n.cw-wd{font-family:var(--fm);font-size:9.5px;text-align:center;color:var(--cw-ink2);padding-bottom:2px}\n.cw-day{font-family:var(--cw-fa);border-radius:9px;border:1.5px solid transparent;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:9px 0;min-height:40px}\n.cw-day.free{background:#edf7f1;border-color:#c2e0d0;color:#1b6144}\n.cw-day.free:hover{border-color:var(--cw-accent)}\n.cw-day.busy{background:#fceeee;border-color:#efc9c9;color:#a94442;cursor:not-allowed}\n.cw-day.off{visibility:hidden}\n.cw-day.past{background:#f4f2ee;border-color:transparent;color:#b6b1a6;cursor:not-allowed}\n.cw-day.sel{background:var(--cw-accent);border-color:var(--cw-accent);color:#fff;font-weight:600}\n.cw-leg{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-family:var(--cw-fa);font-size:12.5px;color:var(--cw-ink2)}\n.cw-leg span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}\n.cw-leg i{width:11px;height:11px;border-radius:4px;display:inline-block}\n.cw-leg .fr{background:#edf7f1;border:1.5px solid #c2e0d0}\n.cw-leg .bu{background:#fceeee;border:1.5px solid #efc9c9}\n\n.cw-picker{background:#fff;border:1.5px solid var(--cw-line);border-radius:14px;overflow:hidden}\n.cw-toggle{font-family:var(--cw-fa);width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:none;border:none;padding:14px 15px;font-size:16px;color:var(--cw-ink);cursor:pointer;min-height:52px;text-align:left}\n.cw-toggle span.ph{color:var(--cw-ink2)}\n.cw-toggle i{font-style:normal;font-size:12px;color:var(--cw-ink2);transition:transform .2s}\n.cw-picker.open .cw-toggle i{transform:rotate(180deg)}\n.cw-picker.open .cw-toggle{border-bottom:1px solid var(--cw-line)}\n.cw-body{padding:13px 13px 14px}\n.cw-year{font-family:var(--cw-fa);font-size:13px;border:1.5px solid var(--cw-line);border-radius:9px;padding:7px 9px;background:#fff;color:var(--cw-ink);min-height:36px}\n.cw-year:focus{outline:none;border-color:var(--cw-accent)}\n.cw-cal-head b{flex:1;text-align:center}\n\n.cw-sec{font-family:var(--fm);font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--cw-accent);margin-bottom:7px}\n.cw-multi{display:flex;flex-direction:column;gap:7px}\n.cw-chk{font-family:var(--cw-fa);display:flex;align-items:flex-start;gap:11px;background:#fff;border:1.5px solid var(--cw-line);border-radius:13px;padding:12px 14px;cursor:pointer;text-align:left;width:100%;min-height:48px;color:var(--cw-ink);font-size:14.5px}\n.cw-chk:hover{border-color:var(--cw-accent)}\n.cw-chk.on{border-color:var(--cw-accent);background:color-mix(in srgb,var(--cw-accent) 7%,#fff)}\n.cw-box{flex:0 0 auto;width:19px;height:19px;border-radius:6px;border:1.5px solid var(--cw-line);background:#fff;margin-top:1px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff}\n.cw-chk.on .cw-box{background:var(--cw-accent);border-color:var(--cw-accent)}\n.cw-chk .tx{flex:1 1 0;min-width:0;overflow-wrap:anywhere}\n.cw-chk .tx b{display:block;font-weight:600}\n.cw-chk .tx small{display:block;font-size:12.5px;color:var(--cw-ink2);margin-top:2px;line-height:1.42}\n.cw-chk .pr{font-family:var(--fm);font-size:11.5px;color:var(--cw-ink2);white-space:nowrap;padding-top:2px;flex:0 0 auto}\n@media(max-width:520px){.cw-chk{flex-wrap:wrap}.cw-chk .pr{flex:1 1 100%;padding:5px 0 0 30px;white-space:normal}}\n.cw-chk.on .pr{color:var(--cw-accent)}\n.cw-opt .pr{float:right;font-family:var(--fm);font-size:11.5px;color:var(--cw-ink2);margin-left:10px}\n.cw-ta{font-family:var(--cw-fa);width:100%;border:1.5px solid var(--cw-line);border-radius:13px;padding:13px 14px;font-size:14.5px;color:var(--cw-ink);background:#fff;min-height:110px;resize:vertical;line-height:1.5}\n.cw-ta:focus{outline:none;border-color:var(--cw-accent)}\n.cw-sum .grp{border:none;padding:12px 0 3px;font-family:var(--fm);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--cw-ink2);display:block}\n.cw-sum .tot{border-bottom:none;padding-top:9px;font-size:15px;color:var(--cw-ink)}\n.cw-warn{background:#fdf3ec;border:1px solid #e8c9b4;color:#7a4a2a}.cw-warn b{color:#8a3d1c}\n.cw-gate{background:color-mix(in srgb,var(--cw-accent) 8%,#fff);border-radius:14px;padding:13px 15px;margin-bottom:12px}\n.cw-gate-row{display:flex;justify-content:space-between;gap:12px;font-size:13.5px;color:var(--cw-ink2);padding:5px 0;border-bottom:1px dashed var(--cw-line)}\n.cw-gate-row:last-child{border-bottom:none}\n.cw-gate-row b{color:var(--cw-ink);font-weight:600}\n.cw-gate-row.tot{font-size:15px;color:var(--cw-ink);padding-top:9px}\n.cw-gate-row.tot b{color:var(--cw-accent)}\n.cw-wide{flex:1;text-align:center}\n.cw-note{font-family:var(--cw-fa);font-size:12.5px;color:var(--cw-ink2);line-height:1.5;margin-top:9px}\n.cw-panel{max-height:none}\n\n\n.cw-opt:active{transform:scale(.985)}\n.cw-opt.on,.cw-chk.on{width:auto;margin-left:calc(var(--cw-ue) * -1);margin-right:calc(var(--cw-ue) * -1);padding-left:calc(16px + var(--cw-ue));padding-right:calc(16px + var(--cw-ue));border-color:var(--cw-accent);box-shadow:0 12px 30px -14px rgba(20,15,8,.5);z-index:2}\n@keyframes cwRein{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none}}\n@keyframes cwReinL{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}\n@keyframes cwRaus{from{opacity:1;transform:none}to{opacity:0;transform:translateX(-22px)}}\n@keyframes cwRausR{from{opacity:1;transform:none}to{opacity:0;transform:translateX(22px)}}\n@keyframes cwAuf{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n.cw-panel.rein{animation:cwRein .3s cubic-bezier(.2,.8,.2,1) both}\n.cw-panel.rein.rueck{animation-name:cwReinL}\n.cw-panel.raus{animation:cwRaus .18s cubic-bezier(.4,0,1,1) both}\n.cw-panel.raus-r{animation:cwRausR .18s cubic-bezier(.4,0,1,1) both}\n.cw-panel.rein .cw-opt,.cw-panel.rein .cw-chk,.cw-panel.rein .cw-date,.cw-panel.rein .cw-picker,.cw-panel.rein .cw-quick{animation:cwAuf .26s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--n,0) * 40ms + 90ms)}\n@media(max-width:640px){.cw{--cw-ue:38px;padding:16px}}\n@media(prefers-reduced-motion:reduce){.cw-panel.rein,.cw-panel.raus,.cw-panel.raus-r,.cw-panel.rein .cw-opt,.cw-panel.rein .cw-chk,.cw-panel.rein .cw-date,.cw-panel.rein .cw-picker,.cw-panel.rein .cw-quick{animation:none}.cw-opt{transition:border-color .18s,background .18s}}\n\n/* Herkunftszeile unter dem Widget — liegt wie der Kopf auf dem Foto, darum weiß mit Schatten */\n.cw-foot{text-align:center;padding:12px 4px 0;font-family:var(--fm);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase}\n.cw-foot a{color:rgba(255,255,255,.9);text-decoration:none;text-shadow:0 2px 10px rgba(0,0,0,.55);transition:color .18s}\n.cw-foot a:hover{color:#fff}\n.cw-foot b{font-weight:600}";
  if(!document.getElementById('cz-widget-css')){
    var st=document.createElement('style'); st.id='cz-widget-css';
    /* Sternchen an Pflichtfragen — siehe muss() weiter unten. */
    st.textContent=CSS+'.cw-q .req{color:#c0573c;font-weight:700}.cw-legende{font-size:11.5px;line-height:1.45;color:var(--cw-ink2);margin:-4px 0 12px}.cw-legende b{color:#c0573c}';
    document.head.appendChild(st);
  }
  var CFG = window.CZ_WIDGET || {};
  window.CZ_BRAND = CFG.brand || 'Gut Seerose';
  window.CZ_ORT   = CFG.ort   || 'Bodensee';
  window.CZ_ZIEL  = CFG.ziel  || 'clickzauber-anmelden.html';
  var MOODS=[
    {id:'glass-milk',        n:'Garten',   a:'#1f6d4a', g:"radial-gradient(120% 90% at 25% 0%,rgba(170,200,150,.55),transparent 55%),radial-gradient(100% 80% at 90% 20%,rgba(90,130,100,.6),transparent 60%),linear-gradient(180deg,#4a6349,#1e2b1f)"},
    {id:'glass-milk-blush',  n:'Rosé',     a:'#a8566a', g:"radial-gradient(120% 90% at 25% 0%,rgba(240,200,205,.55),transparent 55%),radial-gradient(100% 80% at 88% 15%,rgba(200,140,150,.55),transparent 60%),linear-gradient(180deg,#8a6068,#2f2024)"},
    {id:'glass-milk-sand',   n:'Sand',     a:'#a8442f', g:"radial-gradient(120% 90% at 20% 0%,rgba(240,220,190,.6),transparent 55%),radial-gradient(100% 80% at 88% 20%,rgba(200,170,130,.55),transparent 60%),linear-gradient(180deg,#a08a6c,#4a3c2c)"},
    {id:'glass-milk-blue',   n:'Blau',     a:'#2f6d8a', g:"radial-gradient(120% 90% at 20% 0%,rgba(150,180,210,.5),transparent 55%),radial-gradient(100% 80% at 85% 15%,rgba(70,95,140,.6),transparent 60%),linear-gradient(180deg,#3d4d6b,#1a2233)"},
    {id:'glass-milk-sunset', n:'Abendrot', a:'#b3452e', g:"radial-gradient(120% 90% at 15% 0%,rgba(255,196,140,.55),transparent 55%),radial-gradient(110% 80% at 90% 10%,rgba(214,120,90,.6),transparent 60%),linear-gradient(180deg,#8a5a44,#3a2820)"},
    {id:'glass-milk-lake',   n:'See',      a:'#1f7a7d', g:"radial-gradient(120% 90% at 20% 0%,rgba(180,205,205,.5),transparent 55%),radial-gradient(100% 80% at 85% 25%,rgba(90,135,140,.55),transparent 60%),linear-gradient(180deg,#4c6d70,#1c2b2c)"},
    {id:'glass-milk-lavender',n:'Lavendel',a:'#6b5b8a', g:"radial-gradient(120% 90% at 25% 0%,rgba(215,205,235,.55),transparent 55%),radial-gradient(100% 80% at 88% 15%,rgba(150,135,180,.55),transparent 60%),linear-gradient(180deg,#7b6f97,#2b2436)"},
    {id:'glass-milk-noir',   n:'Nacht',    a:'#8a6a2f', g:"radial-gradient(120% 80% at 30% 0%,rgba(200,170,120,.4),transparent 55%),linear-gradient(180deg,#2a2418,#12100a)"}
  ];
  var ACCENTS=['#1f6d4a','#a8566a','#b3452e','#2f6d8a','#8a6a2f','#6b5b8a','#1c1a14'];
  var FPAIRS=[
    {n:'Elegant',    q:'"Marcellus",serif',           a:'"DM Sans",system-ui,sans-serif',      fq:'Marcellus',          fa:'DM Sans'},
    {n:'Romantisch', q:'"Cormorant Garamond",serif',  a:'"Josefin Sans",system-ui,sans-serif', fq:'Cormorant Garamond', fa:'Josefin Sans'},
    {n:'Klar',       q:'"Space Grotesk",sans-serif',  a:'"Space Grotesk",system-ui,sans-serif',fq:'Space Grotesk',      fa:'Space Grotesk'}
  ];
  var design={mood:0,accent:ACCENTS[0],pair:0};

  /* ===== Eigenes Design =====
     Der Kunde bringt Hausfarben, ein Bild und eine Schrift mit. Ein Bild und
     dunkle Farben bekommen einen Schleier darüber, damit die Fragen lesbar
     bleiben — das ist derselbe Griff wie bei den Glas-Stilen. */
  var EIGEN = CFG.eigen || null;
  function schriftLaden(name){
    if(!name) return;
    var id='cz-font-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if(document.getElementById(id)) return;
    var l=document.createElement('link');
    l.id=id; l.rel='stylesheet';
    /* Bunny Fonts (EU) statt Google Fonts: Google bekäme sonst die IP-Adresse jedes Besuchers (Datenschutz Ziff. 8). */
    var fam=encodeURIComponent(name).replace(/%20/g,'+');
    l.href='https://fonts.bunny.net/css2?family='+fam+':wght@400;500;600;700&display=swap';
    l.onerror=function(){ this.onerror=null; this.href='https://fonts.bunny.net/css2?family='+fam+'&display=swap'; };
    document.head.appendChild(l);
  }
  function istDunkel(hex){
    var m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||'');
    if(!m) return false;
    return (0.2126*parseInt(m[1],16) + 0.7152*parseInt(m[2],16) + 0.0722*parseInt(m[3],16)) < 140;
  }
  function eigenAnwenden(){
    if(!EIGEN) return false;
    var r=document.documentElement.style;
    if(EIGEN.bild){
      r.setProperty('--cw-mood','linear-gradient(rgba(12,10,6,.42),rgba(12,10,6,.58)),url("'+String(EIGEN.bild).replace(/"/g,'')+'")');
    } else if(EIGEN.flaeche){
      var f=EIGEN.flaeche, schleier=istDunkel(f)?'rgba(255,255,255,.14)':'rgba(0,0,0,.05)';
      r.setProperty('--cw-mood','radial-gradient(120% 90% at 25% 0%,'+schleier+',transparent 58%),linear-gradient(180deg,'+f+','+f+')');
    }
    if(EIGEN.knopf) r.setProperty('--cw-accent',EIGEN.knopf);
    if(EIGEN.schrift){
      schriftLaden(EIGEN.schrift);
      r.setProperty('--cw-fq','"'+EIGEN.schrift+'",serif');
      r.setProperty('--cw-fa','"'+EIGEN.schrift+'",system-ui,sans-serif');
    }
    return true;
  }
  function applyDesign(){
    var m=MOODS[design.mood], p=FPAIRS[design.pair], r=document.documentElement.style;
    r.setProperty('--cw-mood',m.g);
    r.setProperty('--cw-accent',design.accent);
    r.setProperty('--cw-fq',p.q);
    r.setProperty('--cw-fa',p.a);
    /* Das eigene Design überschreibt zuletzt — es ist die Entscheidung des Kunden. */
    eigenAnwenden();
    var link=document.getElementById('startWithDesign');
    if(link){
      link.href='clickzauber-anmelden.html?design='+m.id+'&accent='+encodeURIComponent(design.accent)+'&fq='+encodeURIComponent(p.fq)+'&fa='+encodeURIComponent(p.fa);
      try{ localStorage.setItem('cz_design_pick', JSON.stringify({skin:m.id,accent:design.accent,font:p.fq,fontAnswer:p.fa})); }catch(e){}
    }
  }
  var STEPS=[
    {k:'termin',t:'date',sec:'Termin',q:'Wann möchten Sie feiern?',lbl:'Ihr Wunschtermin',hint:'Grün markierte Tage sind noch frei. Kein festes Datum? Blättern Sie einfach durch die Monate.'},
    {k:'ausweich',t:'date',sec:'Termin',q:'Gibt es einen Ausweichtermin?',lbl:'Ausweichtermin',opt:true,hint:'Ein zweiter Wunschtermin erhöht die Chance auf einen freien Samstag deutlich.'},
    {k:'gaeste',t:'choice',sec:'Der Rahmen',q:'Wie viele Gäste werden erwartet?',
     o:[['Bis 50 Gäste',{n:40,base:2800}],['50 – 100 Gäste',{n:75,base:3800}],['100 – 150 Gäste',{n:130,base:4600}],['150 – 220 Gäste',{n:190,base:5400}]]},
    {k:'budget',t:'choice',sec:'Der Rahmen',q:'An welchen Budgetrahmen denken Sie ungefähr?',
     o:[['Bis 15.000 €',{}],['15.000 – 25.000 €',{}],['25.000 – 40.000 €',{}],['Über 40.000 €',{}],['Weiß ich noch nicht',{}]]},
    {k:'stil',t:'choice',sec:'Der Rahmen',q:'Welcher Stil trifft es am ehesten?',
     o:[['Klassisch-elegant',{s:'Weiße Tischwäsche, Kerzenleuchter, ruhige Farben.'}],['Rustikal-natürlich',{s:'Holztische, Eukalyptus, warmes Licht im Gewölbe.'}],['Modern-minimalistisch',{s:'Klare Formen, wenig Deko, viel Raumwirkung.'}],['Verspielt-romantisch',{s:'Viel Blumen, Pastelltöne, Lichterketten im Garten.'}]]},
    {k:'trauung',t:'choice',sec:'Die Trauung',q:'Wie und wo findet die Trauung statt?',
     o:[['Standesamtlich bei uns im Gewölbe',{p:0,s:'Trauzimmer im historischen Gewölbe, bis 60 Sitzplätze.'}],
        ['Freie Trauung im Garten',{p:480,s:'Seeblick, Stuhlreihen, Bogen und Beschallung inklusive.'}],
        ['Freie Trauung im Gewölbe',{p:680,s:'Wetterunabhängig, mit Kerzenleuchtern und Technik.'}],
        ['Kirchlich extern, Feier bei uns',{p:0,s:'Wir stimmen die Zeiten mit Ihrer Kirche ab.'}],
        ['Nur die Feier, keine Trauung',{p:0,s:''}]]},
    {k:'exklusiv',t:'choice',sec:'Die Trauung',q:'Möchten Sie das Haus exklusiv?',
     o:[['Exklusivbuchung — nur unsere Feier an diesem Tag',{p:1250,s:'Gesamtes Gut, Garten und Terrasse gehören Ihnen.'}],['Geteilte Nutzung genügt uns',{p:0,s:'Andere Bereiche können parallel belegt sein.'}]]},
    {k:'menue',t:'choice',sec:'Essen & Trinken',q:'Welcher Menüstil passt zu Ihrer Feier?',
     o:[['3-Gänge-Menü, serviert',{pg:89,s:'Zanderfilet vom Bodensee oder Kürbisschaumsuppe · Rinderfilet mit Rotweinjus, Kartoffelgratin und Marktgemüse · Schokoladentarte mit Sauerkirsche. Serviert am Platz.'}],
        ['4-Gänge-Menü, serviert',{pg:112,s:'Zusätzlich ein Zwischengang: hausgeräucherte Forelle mit Meerrettich-Crème. Weinbegleitung auf Wunsch.'}],
        ['Warmes Buffet',{pg:72,s:'Zwei Braten (Rind und Geflügel), vegetarische Ofengemüse-Lasagne, vier Salate, Kartoffel- und Nudelbeilage, Käse und Desserttafel.'}],
        ['Fingerfood / Walking Dinner',{pg:58,s:'Zwölf Positionen im Umlauf: Flammkuchen-Ecken, Rinderpraline, Ziegenkäse-Feige, Garnelenspieß, Mini-Desserts.'}],
        ['Grillbuffet im Garten',{pg:52,s:'Vom Holzkohlegrill: Steak, Bratwurst, Halloumi, Maiskolben, dazu Brotkorb, Dips und Sommersalate. Nur bei Feiern im Freien.'}]]},
    {k:'getraenke',t:'choice',sec:'Essen & Trinken',q:'Welches Getränkepaket wünschen Sie?',
     o:[['Basis-Paket',{pg:22,s:'Hauswein weiß und rot, Bier vom Fass, Softdrinks, Wasser, Kaffee — den ganzen Abend.'}],
        ['Premium-Paket',{pg:36,s:'Zusätzlich Champagner-Empfang, Winzerweine der Region, Longdrinks und offene Bar bis 1 Uhr.'}],
        ['Eigene Getränke mitbringen',{pg:0,s:'Korkgeld 9 € pro Gast wird separat vereinbart.'}]]},
    {k:'deko',t:'choice',sec:'Blumen & Deko',q:'Blumen und Deko — selbst oder von uns?',
     o:[['Wir organisieren selbst',{p:0,s:'Eigene Floristin, Aufbau am Vortag ab 16 Uhr möglich.'}],
        ['Klassische Tischdeko',{p:690,s:'Niedrige Gestecke in Weiß und Grün, Kerzenleuchter, Servietten und Tischkarten.'}],
        ['Romantisch-verspielt',{p:1240,s:'Üppige Sträuße in Pastell, Trauungsbogen, Lichterketten und Windlichter im Garten.'}],
        ['Vollausstattung',{p:1890,s:'Kompletter Blumenschmuck inklusive Brautstrauß, Anstecker, Empfangs- und Kuchentisch, Auf- und Abbau durch unser Team.'}]]},
    {k:'musik',t:'multi',sec:'Musik & Unterhaltung',q:'Wie soll der Abend klingen?',hint:'Mehrfachauswahl möglich — viele Paare buchen DJ und Band zusammen.',
     o:[['Eigene Playlist über unsere Anlage',0,'Tonanlage, Mikrofon und Einweisung inklusive.'],
        ['DJ (5 Stunden)',950,'Erfahrener Hochzeits-DJ, Licht und Absprache im Vorfeld.'],
        ['Live-Band (2 Sets à 45 Min.)',2400,'Vierköpfige Band, Soul und Pop, danach übernimmt der DJ.'],
        ['Sektempfang mit Streichduo',480,'Klassische Begleitung während des Empfangs im Garten.'],
        ['Animateur für den Abend',390,'Führt durch Spiele und Programmpunkte, hält den Ablauf zusammen.'],
        ['Feuerwerk / Wunderkerzen',360,'Abschluss auf der Seeterrasse, Genehmigung übernehmen wir.']]},
    {k:'foto',t:'multi',sec:'Erinnerung',q:'Was soll festgehalten werden?',
     o:[['Fotograf (ganztägig)',1450,'Von den Vorbereitungen bis zum Anschnitt, digitale Galerie.'],
        ['Videograf',1650,'Highlight-Film von etwa fünf Minuten plus Rohmaterial.'],
        ['Fotobox',590,'Mit Requisiten, Sofortdruck und digitalem Album.'],
        ['Livestream für Fernbleibende',320,'Trauung und Reden für Gäste, die nicht anreisen können.']]},
    {k:'extras',t:'multi',sec:'Erinnerung',q:'Noch etwas dazu?',
     o:[['Hochzeitstorte',190,'Dreistöckig, Geschmack nach Absprache, Anschnitt auf der Terrasse.'],
        ['Mitternachtssnack',0,'Currywurst und Pommes oder Flammkuchen — 12 € pro Gast.',12],
        ['Kinderbetreuung',390,'Betreuerin und Spielzimmer von 16 bis 22 Uhr.'],
        ['Shuttle-Service',480,'Zwei Fahrten zu Hotels in Überlingen und Meersburg.'],
        ['Übernachtungszimmer vor Ort',260,'Brautsuite im Haupthaus inklusive Frühstück.'],
        ['Brautauto / Oldtimer',290,'Mercedes Baujahr 1968 mit Fahrer, zwei Stunden.'],
        ['Wedding Planner vor Ort',450,'Begleitet den Tag, koordiniert alle Dienstleister.']]},
    {k:'wetter',t:'choice',sec:'Absicherung',q:'Soll ein Regen-Backup fest eingeplant werden?',
     o:[['Ja, bitte fest einplanen',{p:250,s:'Gewölbe und Zelt bleiben für Ihren Termin reserviert.'}],['Nein, wir entscheiden spontan',{p:0,s:'Verfügbarkeit dann abhängig von der Auslastung.'}]]},
    {k:'text',t:'text',sec:'Ihr Fest',q:'Erzählen Sie uns von Ihrem Fest',lbl:'In ein bis zwei Sätzen',opt:true,
     ph:'Zum Beispiel: Wir feiern klein mit unseren Familien, viel Musik, alles draußen am See.',
     hint:'Das hilft uns, Ihnen ein passendes Angebot zu schreiben statt einer Standardantwort.'}
  ];
  if(CFG.only && CFG.only.length){ STEPS=STEPS.filter(function(s){ return CFG.only.indexOf(s.k)>=0; }); }
  window.CZ_STEPS=STEPS;
  var SEASON={1:.85,2:.85,3:.9,4:1,5:1.15,6:1.25,7:1.3,8:1.3,9:1.2,10:1,11:.85,12:.9};
  var WDAY={6:1.15,5:1.05,0:.95};
  var WNAME=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var MNAME=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  function iso(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function parseISO(s){ var p=String(s||'').split('-'); return p.length===3?new Date(+p[0],+p[1]-1,+p[2]):null; }
  function deDate(s){ var d=parseISO(s); return d?(WNAME[d.getDay()].slice(0,2)+', '+('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear()):''; }
  function eur(n){ return n.toLocaleString('de-DE')+' €'; }
  function nextSaturday(monthsAhead){ var d=new Date(); d.setMonth(d.getMonth()+(monthsAhead||10)); d.setDate(1); while(d.getDay()!==6) d.setDate(d.getDate()+1); return d; }
  function hash(y,m,d){ var x=(y*10000+m*100+d)*2654435761%4294967296; return (x%1000)/1000; }
  function isBusy(d){
    var wd=d.getDay(), sm=SEASON[d.getMonth()+1]||1, h=hash(d.getFullYear(),d.getMonth()+1,d.getDate());
    if(wd===6) return h < (sm>=1.2?.62:.4);
    if(wd===5) return h<.3;
    if(wd===0) return h<.2;
    return h<.1;
  }
  function firstFreeSaturday(monthsAhead){ var d=nextSaturday(monthsAhead), g=0; while(isBusy(d)&&g++<8) d.setDate(d.getDate()+7); return isBusy(d)?null:d; }
  function dayHint(s){
    var d=parseISO(s); if(!d) return '';
    var wd=WNAME[d.getDay()], mo=MNAME[d.getMonth()], sm=SEASON[d.getMonth()+1], wm=WDAY[d.getDay()]||0.9;
    var txt='<b>'+wd+', '+mo+' '+d.getFullYear()+'.</b> ';
    if(sm>=1.2&&wm>=1.15) txt+='Unsere gefragteste Kombination — bitte früh anfragen.';
    else if(sm>=1.2) txt+='Hauptsaison. Beliebte Termine sind schnell vergeben.';
    else if(wm>=1.15) txt+='Samstag — der beliebteste Tag der Woche.';
    else if(sm<=.9&&wm<.95) txt+='Nebensaison unter der Woche — der günstigste Zeitraum.';
    else txt+='Gute Chancen auf einen freien Termin.';
    return txt;
  }
  function pad(x){ return (x<10?'0':'')+x; }
  function budgetGrenze(st){
    var l=(st&&st.a&&st.a.budget_l)||''; if(!l) return null;
    if(/Wei\u00df ich noch nicht/i.test(l)) return null;
    var r=l.match(/([\d.]+)\s*[\u2013-]\s*([\d.]+)/);
    if(r) return {min:num(r[1]),max:num(r[2]),label:l};
    if(/^\u00dcber/i.test(l)){ var u=l.match(/([\d.]+)/); return {min:num(u[1]),max:1e9,label:l}; }
    var b=l.match(/([\d.]+)/);
    return b?{min:0,max:num(b[1]),label:l}:null;
  }
  function num(s){ return parseFloat(String(s).replace(/\./g,'')); }
  function budgetHinweis(summe,st){
    var g=budgetGrenze(st); if(!g||!summe) return '';
    if(summe > g.max*1.12){
      var diff=Math.round((summe-g.max)/100)*100;
      return '<b>Der Richtwert liegt \u00fcber Ihrem Budget.</b> Sie haben '+esc(g.label)+' angegeben, die aktuelle Auswahl kommt auf '+eur(summe)+
        ' \u2014 etwa '+eur(diff)+' dar\u00fcber. Am meisten spart ein Termin unter der Woche oder in der Nebensaison, ein Buffet statt Men\u00fc und das Basis-Getr\u00e4nkepaket. Wir zeigen Ihnen das im Angebot konkret.';
    }
    if(g.min && summe < g.min*0.7 && !(st&&st.kurz)){
      return '<b>Da ist noch Luft.</b> Ihr Budget liegt \u00fcber dem Richtwert von '+eur(summe)+
        '. Wenn Sie m\u00f6gen, schlagen wir im Angebot Erweiterungen vor \u2014 etwa Sektempfang, Live-Band oder Vollausstattung bei der Deko.';
    }
    return '';
  }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function calendar(key,cal,sel,open){
    var head='<div class="cw-picker'+(open?' open':'')+'">'+
      '<button class="cw-toggle" data-toggle="1">'+(sel?('<span>'+deDate(sel)+'</span>'):'<span class="ph">Datum wählen</span>')+'<i>▾</i></button>';
    if(!open) return head+'</div>';
    var first=new Date(cal.y,cal.m,1), start=(first.getDay()+6)%7, days=new Date(cal.y,cal.m+1,0).getDate();
    var today=new Date(); today.setHours(0,0,0,0);
    var cells='';
    for(var i=0;i<start;i++) cells+='<span class="cw-day off"></span>';
    for(var n=1;n<=days;n++){
      var d=new Date(cal.y,cal.m,n), s=iso(d), cls, dis='';
      if(d<today){ cls='past'; dis=' disabled'; }
      else if(isBusy(d)){ cls='busy'; dis=' disabled'; }
      else cls='free';
      if(s===sel) cls+=' sel';
      cells+='<button class="cw-day '+cls+'" data-day="'+s+'" data-k="'+key+'"'+dis+'>'+n+'</button>';
    }
    var prevOff=(cal.y===today.getFullYear()&&cal.m<=today.getMonth())?' disabled':'';
    var y0=today.getFullYear(), years='';
    for(var yy=y0; yy<=y0+4; yy++) years+='<option value="'+yy+'"'+(yy===cal.y?' selected':'')+'>'+yy+'</option>';
    return head+'<div class="cw-body"><div class="cw-cal"><div class="cw-cal-head">'+
      '<button class="cw-cal-nav" data-cal="-1"'+prevOff+' aria-label="Voriger Monat">‹</button>'+
      '<b>'+MNAME[cal.m]+'</b>'+
      '<select class="cw-year" data-year="1" aria-label="Jahr">'+years+'</select>'+
      '<button class="cw-cal-nav" data-cal="1" aria-label="Nächster Monat">›</button></div>'+
      '<div class="cw-grid">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(w){return '<span class="cw-wd">'+w+'</span>';}).join('')+cells+'</div>'+
      '<div class="cw-leg"><span><i class="fr"></i>frei</span><span><i class="bu"></i>schon vergeben</span></div></div></div></div>';
  }

  // Steht unter jeder Ansicht des Widgets.
  var CW_FUSS = ''; /* Kein „Powered by clickzauber“ (seit 08.10.2026). */
  function widget(el){
    var st={i:0,a:{},m:{}};
    var s0=firstFreeSaturday(10), base=s0||nextSaturday(10);
    if(s0) st.a.termin=iso(s0);
    st.cal={y:base.getFullYear(),m:base.getMonth()};
    st.open=!s0;

    function guests(){ return (st.a.gaeste&&st.a.gaeste.n)||75; }
    function bill(){
      var g=st.a.gaeste||{n:75,base:3800}, n=g.n, rows=[], sum=0;
      var d=parseISO(st.a.termin)||new Date();
      var sm=SEASON[d.getMonth()+1]||1, wm=WDAY[d.getDay()]||0.9;
      var miete=Math.round(g.base*sm*wm);
      rows.push(['Location '+(wm>=1.15?'(Samstag)':'')+(sm>=1.2?' Hauptsaison':''),miete]); sum+=miete;
      if(st.a.trauung&&st.a.trauung.p){ rows.push([st.a.trauung_l,st.a.trauung.p]); sum+=st.a.trauung.p; }
      if(st.a.exklusiv&&st.a.exklusiv.p){ rows.push(['Exklusivbuchung',st.a.exklusiv.p]); sum+=st.a.exklusiv.p; }
      if(st.a.menue){ var mv=st.a.menue.pg*n; rows.push([st.a.menue_l+' · '+n+' × '+eur(st.a.menue.pg),mv]); sum+=mv; }
      if(st.a.getraenke&&st.a.getraenke.pg){ var dv=st.a.getraenke.pg*n; rows.push([st.a.getraenke_l+' · '+n+' × '+eur(st.a.getraenke.pg),dv]); sum+=dv; }
      if(st.a.deko&&st.a.deko.p){ rows.push([st.a.deko_l,st.a.deko.p]); sum+=st.a.deko.p; }
      ['musik','foto','extras'].forEach(function(k){
        var sel=st.m[k]||{}, step=null;
        STEPS.forEach(function(x){ if(x.k===k) step=x; });
        if(!step) return;
        step.o.forEach(function(o,j){
          if(!sel[j]) return;
          var v = o[3] ? o[3]*n : o[1];
          if(!v) return;
          rows.push([o[0]+(o[3]?(' · '+n+' × '+eur(o[3])):''),v]); sum+=v;
        });
      });
      if(st.a.wetter&&st.a.wetter.p){ rows.push(['Regen-Backup reserviert',st.a.wetter.p]); sum+=st.a.wetter.p; }
      return {rows:rows,sum:Math.round(sum/50)*50};
    }

    var GATE=(CFG.only&&CFG.only.length)?STEPS.length:4;
    function gesamt(){ return (st.tief? STEPS.length : GATE) + 1; }
    function gateOffen(){ return !st.tief && !st.kurz && st.i===GATE; }
    function gateHTML(){
      var b=bill(), g=guests();
      return '<div class="cw-nav"><button class="cw-back" data-back="1">← Zurück</button><span class="cw-of">Zwischenstand</span></div>'+
        '<h3>Das genügt für eine erste Einschätzung.</h3>'+
        '<div class="cw-gate">'+
          '<div class="cw-gate-row"><span>Termin</span><b>'+deDate(st.a.termin)+'</b></div>'+
          '<div class="cw-gate-row"><span>Gäste</span><b>'+esc(st.a.gaeste_l||'—')+'</b></div>'+
          (b.sum?'<div class="cw-gate-row tot"><span>Richtwert Räume</span><b>ab '+eur(b.sum)+'</b></div>':'')+
        '</div>'+
        '<p class="cw-note">Wenn Sie Menü, Getränke, Deko und Musik noch angeben, wird der Richtwert genau — und wir können Ihnen ein konkretes Angebot schicken statt einer Preisspanne.</p>'+
        '<div class="cw-row"><button class="cw-go" data-gate="tief">Genauer werden · 11 Fragen</button></div>'+
        '<div class="cw-row"><button class="cw-skip cw-wide" data-gate="kurz">Reicht mir — Anfrage senden</button></div>';
    }
    /* Seitenwechsel: die alte Seite gleitet weg, die neue kommt herein, die
       Antworten erscheinen kurz nacheinander. */
    var letzteSeite=-1, ZURUECK=false;
    function ruhig(){ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches); }
    function blaettern(fn,dir,vor){
      var p=el.querySelector('.cw-panel');
      ZURUECK = dir===-1;
      if(!p || ruhig()){ fn(); return; }
      p.classList.remove('rein','rueck');
      setTimeout(function(){ p.classList.add(ZURUECK?'raus-r':'raus'); }, vor||0);
      setTimeout(fn, 180+(vor||0));
    }
    function belebe(){
      var p=el.querySelector('.cw-panel'); if(!p) return;
      var kinder=p.querySelectorAll('.cw-opt,.cw-chk,.cw-date,.cw-picker,.cw-quick');
      Array.prototype.forEach.call(kinder,function(x,i){ x.style.setProperty('--n',i); });
      if(st.i!==letzteSeite){ p.classList.add('rein'); if(ZURUECK) p.classList.add('rueck'); letzteSeite=st.i; }
      ZURUECK=false;
    }
    /* Pflicht oder freiwillig — eine Stelle für die Regel: Freitext und
       Mehrfachauswahl kann der Gast immer überspringen, alles andere nicht. */
    function muss(s){ return !(s.opt || s.t==='text' || s.t==='multi'); }
    function render(){
      var n=st.tief?STEPS.length:GATE, s=STEPS[st.i];
      if(gateOffen()){
        var topG='<div class="cw-top"><div class="cw-brand">'+esc(window.CZ_BRAND)+'<small>'+esc(window.CZ_ORT)+'</small></div><div class="cw-step">'+pad(GATE)+' / '+pad(GATE+1)+'</div></div>';
        el.innerHTML=topG+'<div class="cw-panel"><div class="cw-bar"><i style="width:80%"></i></div>'+gateHTML()+'</div>'+CW_FUSS;
        return;
      }
      var head='<div class="cw-top"><div class="cw-brand">'+esc(window.CZ_BRAND)+'<small>'+esc(window.CZ_ORT)+'</small></div><div class="cw-step">'+
        (st.i<n?(pad(st.i+1)+' / '+pad(n+1)):'Ergebnis')+'</div></div>';
      var pct=Math.min(100,Math.round((st.i/n)*100));
      var nav='<div class="cw-nav">'+(st.i>0?'<button class="cw-back" data-back="1">← Zurück</button>':'<span></span>')+
        '<span class="cw-of">'+(st.i<n?('Frage '+(st.i+1)+' von '+n):'Fertig')+'</span></div>';
      var inner;
      if(st.i<n){
        inner='<div class="cw-bar"><i style="width:'+Math.max(pct,6)+'%"></i></div>'+nav+
          (s.sec?'<div class="cw-sec">'+esc(s.sec)+'</div>':'')+'<div class="cw-q">'+esc(s.q)+(muss(s)?' <span class="req">*</span>':'')+'</div>'+(st.i===0?'<div class="cw-legende"><b>*</b> Pflichtfrage. Fragen ohne Sternchen können Sie überspringen.</div>':'');
        if(s.t==='date'){
          var val=st.a[s.k]||'';
          inner+='<label class="cw-lbl">'+esc(s.lbl)+'</label>'+calendar(s.k,st.cal,val,st.open)+
            '<div class="cw-hint" data-hint="1">'+(val?dayHint(val):esc(s.hint))+'</div>'+
            '<div class="cw-row"><button class="cw-go" data-next="1">Weiter</button>'+
            (s.opt?'<button class="cw-skip" data-skip="1">Brauche ich nicht</button>':'')+'</div>';
        } else if(s.t==='text'){
          inner+='<label class="cw-lbl">'+esc(s.lbl)+'</label>'+
            '<textarea class="cw-ta" data-text="1" placeholder="'+esc(s.ph)+'">'+esc(st.a.text||'')+'</textarea>'+
            '<div class="cw-hint">'+esc(s.hint)+'</div>'+
            '<div class="cw-row"><button class="cw-go" data-next="1">Zur Übersicht</button>'+
            '<button class="cw-skip" data-skip="1">Überspringen</button></div>';
        } else if(s.t==='multi'){
          var sel=st.m[s.k]||(st.m[s.k]={}), g=guests();
          inner+='<div class="cw-multi">'+s.o.map(function(o,j){
            var pr = o[3] ? (eur(o[3])+' / Gast') : (o[1]?eur(o[1]):'inklusive');
            return '<button class="cw-chk'+(sel[j]?' on':'')+'" data-mi="'+j+'"><span class="cw-box">'+(sel[j]?'✓':'')+'</span>'+
              '<span class="tx"><b>'+esc(o[0])+'</b>'+(o[2]?'<small>'+esc(o[2])+'</small>':'')+'</span>'+
              '<span class="pr">'+pr+'</span></button>';
          }).join('')+'</div>'+
          (s.hint?'<div class="cw-hint">'+esc(s.hint)+'</div>':'')+
          '<div class="cw-row"><button class="cw-go" data-next="1">Weiter</button><button class="cw-skip" data-skip="1">Nichts davon</button></div>';
        } else {
          inner+='<div class="cw-opts">'+s.o.map(function(o,j){
            var pr=o[1].pg?(eur(o[1].pg)+' / Gast'):(o[1].p?('+ '+eur(o[1].p)):'');
            return '<button class="cw-opt" data-j="'+j+'">'+(pr?'<span class="pr">'+pr+'</span>':'')+esc(o[0])+
              (o[1].s?'<small>'+esc(o[1].s)+'</small>':'')+'</button>';
          }).join('')+'</div>';
        }
      } else {
        var b=bill(), g2=guests(); st.total=b.sum; st.bill=bill;
        var rows=[['Wunschtermin',deDate(st.a.termin)],['Ausweichtermin',st.a.ausweich?deDate(st.a.ausweich):''],
                  ['Gäste',st.a.gaeste_l],['Stil',st.a.stil_l],['Trauung',st.a.trauung_l],
                  ['Menü',st.a.menue_l],['Getränke',st.a.getraenke_l],['Blumen & Deko',st.a.deko_l]]
                  .filter(function(r){ return !!r[1]; });
        var chosen=[];
        ['musik','foto','extras'].forEach(function(k){
          var sel=st.m[k]||{}, step=null; STEPS.forEach(function(x){ if(x.k===k) step=x; });
          if(!step) return;
          step.o.forEach(function(o,j){ if(sel[j]) chosen.push(o[0]); });
        });
        inner='<div class="cw-bar"><i style="width:100%"></i></div>'+nav+
          '<div class="cw-q">Ihre unverbindliche Einschätzung</div>'+
          '<div class="cw-sum"><span class="grp">Ihre Feier</span>'+
          rows.map(function(r){ return '<div><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>'; }).join('')+
          (chosen.length?'<div><span>Zusatzleistungen</span><b>'+esc(chosen.join(', '))+'</b></div>':'')+
          '<span class="grp">Kostenaufstellung</span>'+
          b.rows.map(function(r){ return '<div><span>'+esc(r[0])+'</span><b>'+eur(r[1])+'</b></div>'; }).join('')+
          '<div class="tot"><span><b>Gesamt (Richtwert)</b></span><b>'+eur(b.sum)+'</b></div></div>'+
          '<div class="cw-price"><span>'+(st.kurz?'Erste Einschätzung':'Richtwert')+' für '+g2+' Gäste</span><b>'+(st.kurz?'ab ':'ca. ')+eur(b.sum)+'</b><small style="display:block;font-family:var(--fm);font-size:11px;color:var(--cw-ink2);margin-top:3px">'+(st.kurz?'nur Räume — Menü, Getränke und Extras kommen dazu':'entspricht '+eur(Math.round(b.sum/g2))+' pro Gast')+'</small></div>'+
          (budgetHinweis(b.sum,st)?'<div class="cw-hint cw-warn">'+budgetHinweis(b.sum,st)+'</div>':'')+
          '<div class="cw-hint">'+dayHint(st.a.termin)+'</div>'+
          '<p class="cw-note">Unverbindlich und ohne Anzahlung. Wir melden uns innerhalb von 24 Stunden mit einem konkreten Angebot und halten den Termin bis dahin für Sie vor.</p>'+
          '<div class="cw-row"><button class="cw-go">Angebot anfordern</button></div>'+
          '<button class="cw-again" data-again="1">Nochmal ausprobieren</button>';
      }
      el.innerHTML=head+'<div class="cw-panel">'+inner+'</div>'+CW_FUSS;
      belebe();
    }

    el.addEventListener('change',function(e){
      var y=e.target.closest('[data-year]'); if(!y) return;
      st.cal={y:+y.value,m:st.cal.m}; render();
    });
    el.addEventListener('input',function(e){
      var t=e.target.closest('[data-text]'); if(!t) return; st.a.text=t.value;
    });
    el.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b) return;
      if(b.hasAttribute('data-again')){ var s2=firstFreeSaturday(10), b2=s2||nextSaturday(10);
        st.i=0; st.a=s2?{termin:iso(s2)}:{}; st.m={}; st.cal={y:b2.getFullYear(),m:b2.getMonth()}; st.open=!s2; render(); return; }
      if(b.hasAttribute('data-back')){ if(st.i>0) blaettern(function(){ st.i--; st.open=false; render(); },-1); return; }
      if(b.hasAttribute('data-toggle')){ st.open=!st.open; render(); return; }
      if(b.hasAttribute('data-cal')){ var mv=+b.getAttribute('data-cal'), c=new Date(st.cal.y,st.cal.m+mv,1); st.cal={y:c.getFullYear(),m:c.getMonth()}; render(); return; }
      if(b.hasAttribute('data-day')){ st.a[b.getAttribute('data-k')]=b.getAttribute('data-day'); st.open=false; render(); return; }
      if(b.hasAttribute('data-mi')){ var k=STEPS[st.i].k, j=+b.getAttribute('data-mi'); st.m[k]=st.m[k]||{}; st.m[k][j]=!st.m[k][j]; render(); return; }
      if(b.hasAttribute('data-skip')){ var sk=STEPS[st.i]; if(sk.t==='multi') st.m[sk.k]={}; else st.a[sk.k]=''; blaettern(function(){ st.i++; st.open=false; render(); }); return; }
      if(b.hasAttribute('data-gate')){
        if(b.getAttribute('data-gate')==='kurz'){ st.kurz=true; st.i=STEPS.length; }
        else { st.tief=true; }
        st.open=(STEPS[st.i]||{}).t==='date' && !st.a[(STEPS[st.i]||{}).k];
        render(); return;
      }
      if(b.hasAttribute('data-next')){
        var cur=STEPS[st.i];
        if(cur.t==='date' && !cur.opt && !st.a[cur.k]){ var hh=el.querySelector('[data-hint]'); if(hh) hh.innerHTML='<b>Bitte wählen Sie einen Tag im Kalender.</b> Ungefähr genügt — grün ist frei.'; st.open=true; render(); return; }
        blaettern(function(){ st.i++; st.open=(STEPS[st.i]||{}).t==='date' && !st.a[(STEPS[st.i]||{}).k]; render(); });
        return;
      }
      if(b.classList.contains('cw-go')){ if(typeof CFG.onSubmit==='function'){ CFG.onSubmit(st); return; } window.location.href=window.CZ_ZIEL; return; }
      var j2=b.getAttribute('data-j'); if(j2===null) return;
      var s3=STEPS[st.i]; st.a[s3.k]=s3.o[+j2][1]; st.a[s3.k+'_l']=s3.o[+j2][0];
      /* Erst tritt die gewaehlte Antwort heraus, dann blaettert die Seite. */
      if(b.parentNode) Array.prototype.forEach.call(b.parentNode.children,function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      blaettern(function(){ st.i++; st.open=(STEPS[st.i]||{}).t==='date' && !st.a[(STEPS[st.i]||{}).k]; render(); },1,200);
    });
    render();
  }

  function controls(){
    var mb=document.getElementById('moods'), ab=document.getElementById('acs'), fb=document.getElementById('fps');
    if(!mb) return;
    mb.innerHTML=MOODS.map(function(m,i){ return '<button class="mood'+(i===design.mood?' on':'')+'" data-i="'+i+'" aria-label="Stimmung '+m.n+'"><i style="background-image:'+m.g+'"></i><em>'+m.n+'</em></button>'; }).join('');
    ab.innerHTML=ACCENTS.map(function(c){ return '<button class="ac'+(c===design.accent?' on':'')+'" data-c="'+c+'" style="background:'+c+'" aria-label="Farbe '+c+'"></button>'; }).join('');
    fb.innerHTML=FPAIRS.map(function(p,i){ return '<button class="fp'+(i===design.pair?' on':'')+'" data-p="'+i+'">'+p.n+'</button>'; }).join('');
    mb.onclick=function(e){ var b=e.target.closest('.mood'); if(!b)return; design.mood=+b.getAttribute('data-i'); design.accent=MOODS[design.mood].a; controls(); applyDesign(); };
    ab.onclick=function(e){ var b=e.target.closest('.ac'); if(!b)return; design.accent=b.getAttribute('data-c'); controls(); applyDesign(); };
    fb.onclick=function(e){ var b=e.target.closest('.fp'); if(!b)return; design.pair=+b.getAttribute('data-p'); controls(); applyDesign(); };
  }

  if(CFG.skin){ var mm=MOODS.filter(function(m){return m.id===CFG.skin;})[0]; if(mm) design.mood=MOODS.indexOf(mm); }
  if(CFG.accent) design.accent=CFG.accent;
  eigenAnwenden();
  var hero=document.getElementById('cwHero'); if(hero) widget(hero);
  var play=document.getElementById('cwPlay'); if(play) widget(play);
  controls(); applyDesign();
  window.czWidget = widget;
  document.querySelectorAll('[data-cz-widget]').forEach(function(el){ widget(el); });
})();
