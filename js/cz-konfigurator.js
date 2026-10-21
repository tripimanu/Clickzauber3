/* clickzauber — neuer Konfigurator (seit 20.10.2026, aus der Skizze NICHT-HOCHLADEN/skizzen-und-vorschlaege/Konfigurator-neu-v2.html).
   Legt sich über clickzauber-editor.html wie das Cockpit über clickzauber-cockpit-live.html: dieselben Daten (cfg) und Funktionen
   (qKarte, addStep, addSeite, delSeite, seiteSchieben, setSeitenTitel, renderSummary, save, zumDesign …), nur anders angeordnet.
   Computer: Weg des Gastes | offene Seite, unten der Architekt | Vorschau. Handy: Reiter Seiten · Regeln · Architekt · Vorschau · Aussehen.
   Regeln (Wenn – Dann – Sonst) zeigen und ändern, was das Formular (public/w.js) schon auswertet:
     step.wenn {key, ist[, nicht]} = Seite oder Frage nur bei bestimmten Antworten („nicht“ = ist nicht, ist wird daraus gerechnet),
     option.preis / proGast = Aufpreis, option.beschreibung = Hinweis unter der Antwort, termin.salon.wimpern = Wimpern-Regeln.
   Schloss: step.gesperrt (alle Fragen einer Seite), cfg.gesperrt.ende / .betrieb. Das Formular beachtet das nicht, es gilt nur hier.
   Architekt: drei Felder (Was, Wo, Details), daraus rechnet das Programm den Vorschlag. „In eigenen Worten“ lässt die KI nur die Felder
   füllen (/api/architekt, lib/architekt.js). An und aus auf der Plattform (Überblick, sql/73), dazu ANTHROPIC_API_KEY bei Vercel. Die KI ändert nie selbst etwas.
   Vorschau: das echte Formular (verkaufsslides/w.js, Ersatz: Vercel) im Vorschau-Modus; CZ_VORSCHAU_STAND meldet die Antworten.
   Alte Ansicht: ?alt=1. */
(function(){
'use strict';
if(/[?&]alt=1/.test(location.search)||typeof window.renderSteps!=='function'||typeof window.qKarte!=='function'||!window.czSeiten)return;
var D=document,H=D.documentElement;H.classList.add('kz');
function $(i){return D.getElementById(i);}
function qa(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s));}
function e(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(v){v=String(v==null?'':v).replace(/\s|€/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');return v===''||isNaN(+v)?null:+v;}
function eur(n){return(+n||0).toLocaleString('de-DE',{maximumFractionDigits:2})+' €';}
function dz(m){m=+m||0;var h=Math.floor(m/60),r=m%60;return h?h+' Std.'+(r?' '+r+' Min.':''):r+' Min.';}
function sv(p,f){return'<svg viewBox="0 0 24 24" width="18" height="18" fill="'+(f?'currentColor':'none')+'" stroke="'+(f?'none':'currentColor')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}
var IC={zu:sv('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),auf:sv('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>'),
fork:sv('<circle cx="6" cy="5.5" r="2.3"/><circle cx="6" cy="18.5" r="2.3"/><circle cx="18" cy="8" r="2.3"/><path d="M6 7.8v8.4M18 10.3c0 4.2-5 5-11 6.6"/>'),
spark:sv('<path d="M12 2.5l2 6.1 6.1 2-6.1 2-2 6.1-2-6.1-6.1-2 6.1-2z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',1),
list:sv('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),tel:sv('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
pinsel:sv('<path d="M14.5 4.5l5 5-8 8-5-5z"/><path d="M6.5 12.5c-2 0-3.5 1.5-3.5 3.5 0 1.5-.5 2.5-1.5 3 3 1 6.5 0 7.5-2"/>'),zur:sv('<path d="M15 18l-6-6 6-6"/>'),vor:sv('<path d="M9 18l6-6-6-6"/>'),
undo:sv('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),mic:sv('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),plus:sv('<path d="M12 5v14M5 12h14"/>'),x:sv('<path d="M6 6l12 12M18 6L6 18"/>'),
hoch:sv('<path d="M12 19V5M5 12l7-7 7 7"/>'),runter:sv('<path d="M12 5v14M19 12l-7 7-7-7"/>'),weg:sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),ok:sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>')};
var U={view:'seite:0',tab:'seiten',offen:false,edit:null,dock:!/[?&]hand=1/.test(location.search)},G=leerG(),VOR=null,HIST=[],STAND={a:{}},LETZT=null,LASTV=null,BAU=false,DIRTY={main:false,ki:false,vor:true};
var MQ=window.matchMedia('(min-width:1100px)'),KZV=Date.now(),ENDE=null,BETR=null,LOGO=null;
/* „In eigenen Worten“ (KI füllt die drei Felder, /api/architekt, lib/architekt.js) erscheint nur, wenn der Schalter auf der Plattform an ist
   und ANTHROPIC_API_KEY bei Vercel steht (/api/status liefert architekt). ?ki=1 zeigt das Feld immer, zum Ansehen. */
var KI_VOR=!!(window.claude&&window.claude.complete);
if(KI_VOR&&!window.CZ_KI_LOKAL){(function(){var s=document.createElement('script');s.src='NICHT-HOCHLADEN/ki-vorschau.js?v=1021';document.head.appendChild(s);})();}
var KI_FREI=/[?&]ki=(1|beispiel)/.test(location.search)||!!window.CZ_KI_TEST||KI_VOR;
function kiStand(){var api=(typeof API==='string'&&API)||'https://clickzauber-api.vercel.app/api';fetch(api+'/status?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){var an=!!(j&&j.architekt)||/[?&]ki=(1|beispiel)/.test(location.search)||!!window.CZ_KI_TEST||KI_VOR;if(an!==KI_FREI){KI_FREI=an;if(BAU&&LETZT&&!tippt('kz-dock'))rKi();}}).catch(function(){});}
function breit(){return MQ.matches;}
function leerG(){return{was:null,seite:null,frage:null,f:{},frei:'',auf:null,fertig:null};}
function toastK(t,err){if(typeof window.toast==='function')window.toast(t,err);}

/* ---------- Daten ---------- */
function S(){return czSeiten.zuSeiten(cfg.steps||[]);}
function typ(s){return(s&&s.typ)||'auswahl';}
function labels(s){if(s&&s.typ==='termin'){var r=kats().map(function(k){return'kat:'+k;});leist().forEach(function(l){if(l.name&&r.indexOf(l.name)<0)r.push(l.name);});return r;}return((s&&s.optionen)||[]).map(function(o){return o.label;}).filter(function(l){return String(l||'').trim();});}
function hatOpt(s){var t=typ(s);return(t==='auswahl'||t==='mehrfach')&&labels(s).length>0;}
function qn(s){var t=String((s&&(s.kurz||s.frage))||'').trim().replace(/\?$/,'');return t||'Frage ohne Text';}
function step(k){if(k==null)return null;return(cfg.steps||[]).filter(function(s){return s.key===k;})[0]||null;}
function pVon(k){var r=-1;S().forEach(function(p,i){if(p.fragen.some(function(s){return s.key===k;}))r=i;});return r;}
function pTitel(p,i){return(p&&String(p.titel||'').trim())||(p&&p.fragen.some(function(s){return s.typ==='termin';})?'Termin':'Seite '+(i+1));}
function pLab(p,i){var t=pTitel(p,i);return t==='Seite '+(i+1)?t:'Seite '+(i+1)+' · '+t;}
function zuP(pi){var p=S()[pi];return!!p&&p.fragen.length>0&&p.fragen.every(function(s){return!!s.gesperrt;});}
function zuX(k){return!!(cfg.gesperrt&&cfg.gesperrt[k]);}
function termin(){return(cfg.steps||[]).filter(function(s){return s.typ==='termin';})[0]||null;}
function leist(){return(cfg.termin&&Array.isArray(cfg.termin.leistungen))?cfg.termin.leistungen:[];}
function kats(){var k=[];leist().forEach(function(l){var x=l.kat||'Leistungen';if(k.indexOf(x)<0)k.push(x);});return k;}
function auZg(){try{return typeof AU_ZG!=='undefined'&&AU_ZG.indexOf(cfg.zielgruppe)>=0;}catch(x){return false;}}

/* ---------- Regeln: abgeleitet aus step.wenn ---------- */
function sig(w){return w&&w.key&&(w.ist||[]).length?w.key+'|'+w.ist.slice().sort().join('¦')+'|'+(w.nicht||[]).slice().sort().join('¦'):'';}
function regeln(){var R=[];S().forEach(function(p,pi){var g=p.fragen.map(function(s){return sig(s.wenn);});
 if(g[0]&&g.every(function(x){return x===g[0];}))R.push({id:'p'+pi,ziel:{seite:pi},wenn:p.fragen[0].wenn});
 else p.fragen.forEach(function(s){if(sig(s.wenn))R.push({id:'q'+s.key,ziel:{key:s.key},wenn:s.wenn});});});return R;}
function regelVon(id){return regeln().filter(function(r){return r.id===id;})[0]||null;}
function nicht(w){return!!(w&&Array.isArray(w.nicht)&&w.nicht.length);}
function wennLabels(w){return nicht(w)?w.nicht:((w&&w.ist)||[]);}
function zielSteps(z){if(!z)return[];if(z.seite!=null){var p=S()[z.seite];return p?p.fragen:[];}var s=step(z.key);return s?[s]:[];}
function regelFuer(z){var s0=zielSteps(z)[0];return s0?regeln().filter(function(r){return zielSteps(r.ziel).indexOf(s0)>=0;})[0]||null:null;}
function zielName(z){if(z.seite!=null){var p=S()[z.seite],t=pTitel(p,z.seite);return t==='Seite '+(z.seite+1)?t:'Seite '+(z.seite+1)+' „'+t+'“';}var s=step(z.key);return s?'Frage „'+qn(s)+'“':'(fehlt)';}
function zielKurz(z){if(z.seite!=null)return'Seite '+(z.seite+1);var s=step(z.key);return s?'„'+qn(s)+'“':'(fehlt)';}
function zielZu(z){if(z.seite!=null)return zuP(z.seite);var s=step(z.key);return!!(s&&s.gesperrt);}
function zielAus(v){var m=String(v||'').match(/^(p|q):(.+)$/);if(!m)return null;return m[1]==='p'?{seite:+m[2]}:{key:m[2]};}
function naechste(z){var pi=z.seite!=null?z.seite:pVon(z.key),n=S().length;return pi+1<n?'Seite '+(pi+2):'der letzten Seite';}
function bedAn(w,a){try{if(!w||!w.key)return true;var ist=w.ist||[];if(!ist.length)return true;var v=a[w.key+'_l'];if(v==null)v=a[w.key];if(v&&typeof v==='object')v=v.label;return ist.indexOf(v)>=0;}catch(x){return false;}}
function condSatz(w){var q=step(w.key);if(!q)return'eine gelöschte Frage beantwortet ist';return'bei „'+qn(q)+'“ '+(nicht(w)?'nicht ':'')+wennLabels(w).map(ql).join(' oder ')+' gewählt ist';}
function kurzCond(w){var q=step(w.key);return(q?qn(q):'?')+(nicht(w)?' ist nicht ':' ist ')+wennLabels(w).map(kl).join(' / ');}
function regelSatz(r){return'Wenn '+condSatz(r.wenn)+', zeigt das Formular '+zielName(r.ziel)+'. Sonst wird sie übersprungen, weiter geht es mit '+naechste(r.ziel)+'.';}
function kurzRegel(r){return'Wenn '+kurzCond(r.wenn)+' → zeige '+zielKurz(r.ziel);}
function condPills(w){var q=step(w.key);if(!q)return'<span class="kz-pill">gelöschte Frage</span>';return'<span class="kz-pill q">'+e(qn(q))+'</span><span class="kz-opt">'+(nicht(w)?'ist nicht':'ist')+'</span>'+wennLabels(w).map(function(t){return'<span class="kz-pill a">'+e(kl(t))+'</span>';}).join('<span class="kz-opt">oder</span>');}
function quellen(pi){var r=[];S().forEach(function(p,i){if(i<pi)p.fragen.forEach(function(s){if((typ(s)==='auswahl'||s.typ==='termin')&&labels(s).length)r.push(s);});});return r;}
function quellenQ(key){var i=(cfg.steps||[]).indexOf(step(key));return(cfg.steps||[]).slice(0,Math.max(0,i)).filter(function(s){return typ(s)==='auswahl'&&labels(s).length;});}
function wennSetzen(z,w){zielSteps(z).forEach(function(s){if(w)s.wenn=JSON.parse(JSON.stringify(w));else delete s.wenn;});if(typeof WENN_AUF!=='undefined')WENN_AUF={};}
function nichtPflegen(){(cfg.steps||[]).forEach(function(s){var w=s.wenn;if(!nicht(w))return;var q=step(w.key);if(!q)return;w.ist=labels(q).filter(function(l){return w.nicht.indexOf(l)<0;});});}
function effekt(o){var t=[];if(+o.proGast)t.push('+ '+eur(o.proGast)+' pro Gast');else if(+o.preis)t.push('+ '+eur(o.preis));if(o.beschreibung)t.push('Hinweis: „'+String(o.beschreibung).slice(0,60)+'“');return t.join(' · ');}
function wimRelevant(){var s=cfg.termin&&cfg.termin.salon;try{return!!(s&&s.an&&typeof tmIstWim==='function'&&leist().some(tmIstWim));}catch(x){return false;}}
function wimAn(){try{return typeof tmWimAn==='function'&&!!tmWimAn();}catch(x){return false;}}
function wimW(){var s=cfg.termin.salon;s.wimpern=s.wimpern||{prozent:50,wochen:4,fotos:'whatsapp'};return s.wimpern;}

/* ---------- Verlauf (ersetzt merken/zurueck des Editors: ganzer Stand statt nur der Fragen) ---------- */
function kzMerk(){try{HIST.push(JSON.stringify(cfg));}catch(x){return;}if(HIST.length>40)HIST.shift();var b=$('undoBtn');if(b)b.hidden=false;}
function kzZurueck(){if(!HIST.length){toastK('Nichts zum Rückgängigmachen.',true);return;}var alt;try{alt=JSON.parse(HIST.pop());}catch(x){return;}
 cfg=alt;LETZT=cfg;VOR=null;if(typeof WENN_AUF!=='undefined')WENN_AUF={};
 try{var wn=$('wname');if(wn)wn.value=cfg.name||'';var bn=$('betriebName');if(bn)bn.value=cfg.betrieb||'';renderSummary();renderLogo();}catch(x){}
 renderSteps();var b=$('undoBtn');if(b)b.hidden=!HIST.length;puls();toastK('Rückgängig gemacht.');}

/* ---------- Hülle ---------- */
function bauen(){if(BAU)return;var app=$('app'),bar=app&&app.querySelector('.bar');if(!bar)return;BAU=true;
 var ends=qa('#wPreview .endsec');ENDE=ends[0]||null;BETR=ends[1]||null;LOGO=D.querySelector('#app .logo-oben');
 var ab=D.createElement('div');ab.id='kz-ablage';app.appendChild(ab);
 var k=D.createElement('div');k.className='kz';k.id='kz';
 k.innerHTML='<aside id="kz-list" aria-label="Seiten des Formulars"></aside><main id="kz-col"><div id="kz-main"></div><div id="kz-dock"></div></main><section id="kz-vor" aria-label="Vorschau"><div class="kz-vk"><b>So sehen es Ihre Kunden</b><span>live, ohne KI</span></div><div class="kz-tel" id="kz-tel"><iframe id="kz-frame" title="Vorschau des Formulars"></iframe></div><div class="kz-vfuss"><button type="button" class="kz-btn2 sm" data-kz="vor-neu">Von vorn</button><button type="button" class="kz-btn2 sm" data-kz="ansehen">Groß ansehen</button></div><div id="kz-aktiv"></div></section>';
 bar.parentNode.insertBefore(k,bar.nextSibling);
 var t=D.createElement('nav');t.id='kz-tabs';t.className='kz-tabs';t.setAttribute('aria-label','Bereiche des Konfigurators');app.appendChild(t);
 var br=D.createElement('div');br.className='kz-br';br.innerHTML='<b id="kz-name"></b>';var back=bar.querySelector('.back');if(back&&back.nextSibling)bar.insertBefore(br,back.nextSibling);else bar.appendChild(br);var ver=$('ver');if(ver)br.appendChild(ver);
 var ub=$('undoBtn');if(ub){ub.innerHTML=IC.undo+'<span class="kz-ut">Rückgängig</span>';ub.title='Letzte Änderung rückgängig machen';}
 k.addEventListener('click',klick);t.addEventListener('click',klick);k.addEventListener('input',eingabe);k.addEventListener('change',aenderung);
 k.addEventListener('focusout',function(){setTimeout(function(){if(DIRTY.main&&!tippt('kz-main')){DIRTY.main=false;rMain();}if(DIRTY.ki&&!tippt('kz-dock')){DIRTY.ki=false;rKi();}},80);});
 D.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&U.dock&&breit()){U.dock=false;rKi();}});
 (MQ.addEventListener?MQ.addEventListener.bind(MQ,'change'):MQ.addListener.bind(MQ))(function(){if(LETZT)alles();});
 new MutationObserver(function(){if(app.style.display!=='none'&&LETZT===cfg){DIRTY.vor=true;alles();}}).observe(app,{attributes:true,attributeFilter:['style']});}
function tippt(id){var a=D.activeElement,c=$(id);return!!(a&&c&&c.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));}
function start(){bauen();if(!BAU||typeof cfg!=='object'||!cfg)return;if(LETZT!==cfg){kiStand();LETZT=cfg;U={view:'seite:0',tab:'seiten',offen:false,edit:null,dock:false};nachZiehen();G=leerG();VOR=null;HIST=[];STAND={a:{}};LASTV=null;var ub=$('undoBtn');if(ub)ub.hidden=true;}DIRTY.vor=true;alles();}
/* Nach unten ziehen zum Aktualisieren (js/cz-ziehen.js): dieselbe Stelle wieder öffnen (Editor: czZiehenVorher, czNachZiehen). */
window.czKzAnsicht=function(){return{view:U.view,tab:U.tab,offen:!!U.offen};};
function nachZiehen(){var z=window.czNachZiehen,k=z&&z.kz;if(!k||z.kzDa)return;z.kzDa=1;if(typeof k.view==='string'&&/^(seite:\d+|ende|betrieb|grenzen|regeln|aussehen)$/.test(k.view))U.view=k.view;if(['seiten','regeln','ki','vorschau','aussehen'].indexOf(k.tab)>=0)U.tab=k.tab;U.offen=!!k.offen;U.dock=U.tab==='ki';}
function alles(){if(!BAU||!LETZT)return;rLayout();rList();rMain();rKi();rAktiv();if(DIRTY.vor)vorschauBald(0);}
function nachRender(){if(!BAU||typeof cfg!=='object'||!cfg)return;nichtPflegen();var r=$('rail');if(r)r.innerHTML='';var v=$('vogel');if(v)v.innerHTML='';
 if(LETZT!==cfg)return;rLayout();rList();if(tippt('kz-main'))DIRTY.main=true;else rMain();if(tippt('kz-dock'))DIRTY.ki=true;else rKi();rAktiv();vorschauBald(300);}
function rLayout(){D.body.setAttribute('data-kz-tab',U.tab);D.body.classList.toggle('kz-offen',!!U.offen);rTabs();var n=$('kz-name');if(n)n.textContent=cfg.betrieb||cfg.name||'Ihr Formular';}
function rTabs(){var t=$('kz-tabs');if(!t)return;t.innerHTML=[['seiten',IC.list,'Seiten'],['regeln',IC.fork,'Regeln'],['ki','<span class="kz-spk">'+IC.spark+'</span>','Architekt'],['vorschau',IC.tel,'Vorschau'],['aussehen',IC.pinsel,'Aussehen']].map(function(x){return'<button type="button" class="'+(x[0]==='ki'?'kz-tk':'')+(U.tab===x[0]?' an':'')+'" data-tab="'+x[0]+'" aria-pressed="'+(U.tab===x[0])+'">'+x[1]+'<span>'+x[2]+'</span></button>';}).join('');}
function geh(v){U.view=v;if(v==='regeln')U.tab='regeln';else if(v==='aussehen')U.tab='aussehen';else{U.tab='seiten';U.offen=true;}if(v!=='regeln')U.edit=null;alles();oben();}
function tab(t){U.tab=t;if(t==='regeln'){U.view='regeln';U.edit=null;}else if(t==='aussehen')U.view='aussehen';else if(t==='seiten'){U.offen=false;if(U.view==='regeln'||U.view==='aussehen')U.view='seite:0';}else if(t==='ki')U.dock=true;alles();window.scrollTo(0,0);}
function oben(){if(breit()){var m=$('kz-main');if(m)m.scrollTop=0;}else window.scrollTo(0,0);}
function puls(){var t=$('kz-tel');if(!t)return;t.classList.add('puls');clearTimeout(puls.u);puls.u=setTimeout(function(){t.classList.remove('puls');},650);}
function blink(id){if(!id)return;setTimeout(function(){var el=id.indexOf('q:')===0?D.querySelector('#kz-qs [data-key="'+id.slice(2).replace(/["\\]/g,'')+'"]'):$(id);if(!el)return;el.classList.remove('kz-blink');void el.offsetWidth;el.classList.add('kz-blink');if(breit()){var c=$('kz-main');if(c.contains(el))c.scrollTop+=el.getBoundingClientRect().top-c.getBoundingClientRect().top-24;}else window.scrollTo(0,el.getBoundingClientRect().top+window.pageYOffset-120);},90);}

/* ---------- Weg des Gastes ---------- */
function fl(go,nr,t,sub,zu){return'<button type="button" class="kz-fl'+(U.view===go?' an':'')+(zu?' zu':'')+'" data-go="'+go+'"><span class="kz-nr">'+nr+'</span><span class="kz-flt"><b>'+e(t)+'</b><small>'+e(sub)+'</small></span><span class="kz-fll">'+(zu===true?IC.zu:zu===false?IC.auf:IC.vor)+'</span></button>';}
function pInfo(p){if(p.fragen.some(function(s){return s.typ==='termin';})){var k=kats().length,nl=leist().length;return nl+(nl===1?' Leistung':' Leistungen')+' in '+k+(k===1?' Kachel':' Kacheln')+' · Tag, Uhrzeit, Mitarbeiter';}var n=p.fragen.length,f0=p.fragen[0]&&String(p.fragen[0].frage||'').trim();return n+(n===1?' Frage':' Fragen')+(f0?' · '+f0.slice(0,60):'');}
function rList(){var L=$('kz-list');if(!L)return;var P=S(),bs=P.map(function(p,i){return zuP(i);}).concat([zuX('ende'),zuX('betrieb')]),f=bs.filter(Boolean).length;
 var h='<div class="kz-lk"><div><b>Ablauf Ihres Formulars</b><small>Antippen zum Bearbeiten</small></div><span class="kz-pz">'+f+' von '+bs.length+' fertig</span></div><div class="kz-prog"><i style="width:'+Math.round(f/bs.length*100)+'%"></i></div><div class="kz-flow">';
 P.forEach(function(p,i){var w=p.fragen[0]&&p.fragen[0].wenn,bed=!!sig(w)&&p.fragen.every(function(s){return sig(s.wenn)===sig(w);});
  if(bed)h+='<div class="kz-fork">'+IC.fork+'<span><b>Nur wenn</b> '+e(kurzCond(w))+'. Sonst weiter mit '+e(naechste({seite:i}))+'.</span></div>';
  h+='<button type="button" class="kz-fl'+(U.view==='seite:'+i?' an':'')+(zuP(i)?' zu':'')+(bed?' zweig':'')+'" data-go="seite:'+i+'"><span class="kz-nr">'+(i+1)+'</span><span class="kz-flt"><b>'+e(pTitel(p,i))+'</b><small>'+e(pInfo(p))+'</small></span><span class="kz-fll" title="'+(zuP(i)?'Fertig, gesperrt':'Offen')+'">'+(zuP(i)?IC.zu:IC.auf)+'</span></button><div class="kz-line"></div>';});
 h+='<button type="button" class="kz-flneu" data-kz="seite-neu">'+IC.plus+'Neue Seite</button><div class="kz-line"></div>'+fl('ende',IC.ok,'Letzte Seite · '+((cfg.summary&&cfg.summary.titel)||'Zusammenfassung'),'Zusammenfassung, Preis, Absenden',zuX('ende'))+'<div class="kz-line"></div>'+fl('betrieb','B','Ihr Betrieb',cfg.betrieb||'Name fehlt noch',zuX('betrieb'))+'</div>';
 var n=regeln().length+(wimRelevant()?2:0);
 h+='<div class="kz-sek"><span class="kz-u">Für das ganze Formular</span>'+fl('regeln',IC.fork,'Regeln: Wenn – Dann – Sonst',n?n+(n===1?' Regel':' Regeln'):'Noch keine Regel',null)+(auZg()?fl('grenzen','€','Grenzen & Richtpreis','Mindestwerte, Anfahrt, Preis pro Person',null):'')+fl('aussehen',IC.pinsel,'Aussehen','Logo, Stimmung, Farbe, Schrift',null)+'</div>';
 h+='<p class="kz-alt"><button type="button" class="kz-lnk" data-kz="vorlage">Andere Vorlage wählen</button><a href="'+e(location.pathname+'?alt=1')+'" data-kz="alt">Alte Ansicht öffnen</a></p>';L.innerHTML=h;}

/* ---------- Bearbeiten ---------- */
function lockBtn(k,i,zu){return'<button type="button" class="kz-lock'+(zu?' zu':'')+'" data-kz="lock" data-k="'+k+'" data-i="'+i+'" aria-pressed="'+zu+'">'+(zu?IC.zu+'Fertig':IC.auf+'Offen')+'</button>';}
function zuHinweis(k,i){return'<div class="kz-zuh">'+IC.zu+'<p><b>Fertig und gesperrt.</b> Hier ändert der Architekt nichts, und niemand verstellt etwas aus Versehen.</p><button type="button" class="kz-btn2 sm" data-kz="lock" data-k="'+k+'" data-i="'+i+'">Schloss öffnen</button></div>';}
function ablegen(){var ab=$('kz-ablage'),m=$('kz-main');if(!ab||!m)return;[ENDE,BETR,LOGO].forEach(function(n){if(n&&m.contains(n))ab.appendChild(n);});var a=$('au-einst');if(a&&m.contains(a))ab.appendChild(a);}
function rMain(){var m=$('kz-main');if(!m)return;var gleich=LASTV===U.view,y=gleich?(breit()?m.scrollTop:window.pageYOffset):0;ablegen();var v=U.view;
 if(v.indexOf('seite:')===0)rSeite(+v.slice(6));else if(v==='ende'||v==='betrieb'||v==='grenzen')rSlot(v);else if(v==='regeln')m.innerHTML=regelnHTML();
 else if(v==='aussehen'){m.innerHTML=aussehenHTML();var ls=$('kz-logoslot');if(ls&&LOGO)ls.appendChild(LOGO);}else{U.view='seite:0';rSeite(0);}
 LASTV=U.view;if(gleich){if(breit())m.scrollTop=y;else window.scrollTo(0,y);}}
function rSeite(pi){var P=S(),m=$('kz-main');if(!P.length){m.innerHTML='';return;}if(!(pi>=0))pi=0;if(pi>=P.length)pi=P.length-1;U.view='seite:'+pi;var p=P[pi],zu=zuP(pi),d=zu?' disabled':'';
 var h='<div class="kz-ed"><button type="button" class="kz-zur" data-kz="liste">'+IC.zur+'Alle Seiten</button><div class="kz-ek"><span class="kz-enr">Seite '+(pi+1)+' von '+P.length+'</span><span class="kz-sp"></span>'
 +'<button type="button" class="kz-ic" data-kz="hoch" data-pi="'+pi+'" title="Nach vorn" aria-label="Seite nach vorn"'+(pi===0||zu?' disabled':'')+'>'+IC.hoch+'</button><button type="button" class="kz-ic" data-kz="runter" data-pi="'+pi+'" title="Nach hinten" aria-label="Seite nach hinten"'+(pi===P.length-1||zu?' disabled':'')+'>'+IC.runter+'</button><button type="button" class="kz-ic" data-kz="seite-weg" data-pi="'+pi+'" title="Seite löschen" aria-label="Seite löschen"'+(zu||P.length<2?' disabled':'')+'>'+IC.weg+'</button>'+lockBtn('seite',pi,zu)+'</div>'
 +(zu?zuHinweis('seite',pi):'')+'<label class="kz-fld kz-gross"><span>Überschrift der Seite</span><input data-kzf="titel" data-pi="'+pi+'" value="'+e(p.titel||'')+'" placeholder="'+e(BSP().seite)+'"'+d+'></label>'+wannHTML(p,pi,zu)+'<div class="kz-qs" id="kz-qs"></div>'
 +'<button type="button" class="kz-add" data-kz="frage-neu" data-pi="'+pi+'"'+d+'>'+IC.plus+'Frage auf dieser Seite</button><button type="button" class="kz-btnki" data-ki="seite:'+pi+'">'+IC.spark+'Diese Seite mit dem Architekten ändern</button></div>';
 m.innerHTML=h;var box=$('kz-qs');
 p.fragen.forEach(function(s){var q;try{q=qKarte(s,cfg.steps.indexOf(s));}catch(x){q=D.createElement('div');q.className='q';q.textContent='Diese Frage lässt sich hier nicht anzeigen.';}q.setAttribute('data-key',s.key);q.insertAdjacentHTML('beforeend',qRegelnHTML(s));box.appendChild(q);});
 if(zu)qa('input,select,textarea,button',box).forEach(function(el){if(!el.hasAttribute('data-kz')||el.getAttribute('data-kz')!=='regel-zeig')el.disabled=true;});}
function wannHTML(p,pi,zu){var R=regeln().filter(function(r){return r.ziel.seite===pi;}),h='<section class="kz-wann"><div class="kz-wk">'+IC.fork+'<b>Wann erscheint diese Seite?</b></div>';
 if(R.length)return h+'<p>'+e(regelSatz(R[0]))+'</p><button type="button" class="kz-lnk" data-kz="regel-zeig" data-r="'+R[0].id+'">Regel ansehen und ändern</button></section>';
 var teil=p.fragen.some(function(s){return sig(s.wenn);});h+='<p>'+(teil?'Immer. Einzelne Fragen dieser Seite erscheinen nur manchmal, das steht an der Frage.':'Immer. '+(pi>0?'Sie kommt nach Seite '+pi+'.':'Das ist die erste Seite.'))+'</p>';
 if(pi>0&&quellen(pi).length)h+='';return h+''+(pi>0&&!zu?'<button type="button" class="kz-btn2 sm kz-wannb" data-ki="zeig:'+pi+'">'+IC.fork+'Nur bei bestimmter Antwort zeigen</button>':'')+'</section>';}
function qRegelnHTML(s){var h='',bed=regeln().filter(function(r){return r.ziel.key===s.key;});
 if(bed.length)h+='<p class="kz-qbed">'+IC.fork+'<span>'+e(regelSatz(bed[0]))+'</span></p>';
 if(s.typ==='termin'){var tl=leist().length?'<div class="kz-qr"><div class="kz-qrk">'+IC.fork+'<b>Wenn – Dann</b></div><button type="button" class="kz-lnk" data-ki="regel:'+e(s.key)+'">+ Regel ab der gewählten Behandlung</button></div>':'';if(!wimRelevant())return h+tl;return h+'<div class="kz-qr"><div class="kz-qrk">'+IC.fork+'<b>Wenn – Dann bei den Leistungen</b></div><button type="button" class="kz-rchip" data-kz="regel-zeig" data-r="wim1"><b>Wimpern</b><span>Wenn Auffüllen gewählt ist → Fragen zu den Wimpern'+(wimAn()?'':' (aus)')+'</span></button><button type="button" class="kz-rchip" data-kz="regel-zeig" data-r="wim2"><b>Wimpern</b><span>Wenn wenig da oder lange her → Zeit fürs neue Set</span></button></div>';}
 if(!hatOpt(s))return h;var R=regeln().filter(function(r){return r.wenn.key===s.key;}),ef=(s.optionen||[]).filter(function(o){return+o.preis||+o.proGast||o.beschreibung;});
 h+='<div class="kz-qr"><div class="kz-qrk">'+IC.fork+'<b>Wenn – Dann an dieser Frage</b></div>';
 R.forEach(function(r){h+='<button type="button" class="kz-rchip" data-kz="regel-zeig" data-r="'+r.id+'"><b>Regel</b><span>'+e(kurzRegel(r))+'</span></button>';});
 ef.forEach(function(o){h+='<span class="kz-rchip still"><b>'+e(o.label||'Antwort')+'</b><span>'+e(effekt(o))+'</span></span>';});
 if(!R.length&&!ef.length)h+='<p class="kz-klein">Noch keine Regel. Zum Beispiel: Wenn „Ja“, dann eine weitere Seite zeigen.</p>';
 if(typ(s)==='auswahl')h+='<button type="button" class="kz-lnk" data-ki="regel:'+e(s.key)+'">+ Wenn-Dann-Regel für diese Frage</button>';return h+'</div>';}
function rSlot(v){var m=$('kz-main'),k=v==='grenzen'?null:v,zu=k?zuX(k):false,T={ende:['Letzte Seite','Zusammenfassung, geschätzter Preis und der Knopf zum Absenden.'],betrieb:['Ihr Betrieb','Name, Titel und Logo. Der Name steht in jeder Bestätigung an Ihre Gäste.'],grenzen:['Grenzen & Richtpreis','']}[v];
 m.innerHTML='<div class="kz-ed"><button type="button" class="kz-zur" data-kz="liste">'+IC.zur+'Alle Seiten</button><div class="kz-ek"><span class="kz-enr">'+T[0]+'</span><span class="kz-sp"></span>'+(k?lockBtn(k,0,zu):'')+'</div>'+(zu?zuHinweis(k,0):'')+(T[1]?'<p class="kz-lead">'+T[1]+'</p>':'')+'<div class="kz-slot" id="kz-slot"></div></div>';
 var slot=$('kz-slot');if(v==='ende'&&ENDE)slot.appendChild(ENDE);if(v==='betrieb'){if(LOGO)slot.appendChild(LOGO);if(BETR)slot.appendChild(BETR);}if(v==='grenzen'){var a=$('au-einst');if(a)slot.appendChild(a);else slot.innerHTML='<p class="kz-klein">Für diese Branche gibt es keine Grenzen.</p>';}
 qa('input,select,textarea,button',slot).forEach(function(el){el.disabled=zu;});}
function aussehenHTML(){var t=cfg.theme||{};return'<div class="kz-ed"><button type="button" class="kz-zur" data-kz="liste">'+IC.zur+'Alle Seiten</button><div class="kz-ek"><span class="kz-enr">Für das ganze Formular</span></div><h2 class="kz-h">Aussehen</h2><p class="kz-lead">Logo, Stimmung, Farbe und Schrift. Fragen und Antworten bleiben dabei, wie sie sind.</p>'
 +'<div class="kz-karte"><h4>Logo</h4><div id="kz-logoslot"></div><button type="button" class="kz-btn2 sm" data-kz="logo-farbe" style="align-self:flex-start"'+(t.logo?'':' disabled')+'>Farbe aus dem Logo übernehmen</button><p class="kz-klein">Liest die kräftigste Farbe aus Ihrem Logo und nimmt sie für die Knöpfe im Formular.</p></div>'
 +'<div class="kz-karte"><h4>Stimmung, Farbe und Schrift</h4><div class="kz-ausz"><i style="background:'+e(t.accent||'#2f7d59')+'"></i><span>'+(t.font?'Schrift '+e(t.font):'Standard-Schrift')+'</span></div><button type="button" class="kz-btn" data-kz="design" style="align-self:flex-start">Aussehen wählen</button><p class="kz-klein">Öffnet die Auswahl mit großer Vorschau: Weiß oder eine Stimmung, eine Farbe, eine Schrift. Dort speichern Sie auch.</p></div></div>';}

/* ---------- Regeln ansehen und ändern ---------- */
function rr(k,l,inner){return'<div class="kz-rr"><span class="kz-tg '+k+'">'+l+'</span><div class="kz-rri">'+inner+'</div></div>';}
function regelnHTML(){var R=regeln(),h='<div class="kz-ed"><button type="button" class="kz-zur" data-kz="liste">'+IC.zur+'Alle Seiten</button><div class="kz-ek"><span class="kz-enr">Für das ganze Formular</span></div><h2 class="kz-h">Regeln: Wenn – Dann – Sonst</h2><p class="kz-lead">Jede Regel prüft eine Antwort im Formular. <b>Wenn</b> sie passt, passiert, was unter <b>Dann</b> steht, sonst das unter <b>Sonst</b>. In der Vorschau sehen Sie live, welche Regel gerade greift.</p>';
 R.forEach(function(r,i){h+=U.edit===r.id?regelEdit(r,i):regelKarte(r,i);});
 if(wimRelevant())h+=wimKarten();
 var pq=(cfg.steps||[]).filter(function(s){return hatOpt(s)&&(s.optionen||[]).some(function(o){return+o.preis||+o.proGast||o.beschreibung;});});
 if(pq.length)h+='<details class="kz-auf"><summary>Aufpreise und Hinweise je Antwort ('+pq.length+(pq.length===1?' Frage':' Fragen')+')</summary><div>'+pq.map(function(s){var pi=pVon(s.key);return'<div class="kz-aufq"><b>'+e(qn(s))+'</b>'+(s.optionen||[]).filter(function(o){return+o.preis||+o.proGast||o.beschreibung;}).map(function(o){return'<div class="kz-rri"><span class="kz-tgi w">Wenn</span><span class="kz-pill a">'+e(o.label||'leer')+'</span><span class="kz-tgi d">Dann</span><span class="kz-pill d">'+e(effekt(o))+'</span></div>';}).join('')+'<button type="button" class="kz-lnk" data-go="seite:'+pi+'">Auf Seite '+(pi+1)+' ändern</button></div>';}).join('')+'<p class="kz-klein">Sonst: kein Aufpreis, kein Hinweis.</p></div></details>';
 if(!R.length&&!wimRelevant()&&!pq.length)h+='<p class="kz-leer">Noch keine Regel. Mit dem Architekten legen Sie fest, wann eine Seite oder Frage erscheint oder was eine Antwort kostet.</p>';
 return h+'<div class="kz-rz"><button type="button" class="kz-btnki" data-ki="regel">'+IC.spark+'Neue Regel mit dem Architekten</button></div></div>';}
function regelKarte(r,i){var an=bedAn(r.wenn,STAND.a),zu=zielZu(r.ziel);
 return'<article class="kz-rk'+(zu?' zu':'')+'" id="rk-'+e(r.id)+'"><header><b>Regel '+(i+1)+'</b><span class="kz-rst'+(an?' an':'')+'">'+(an?'greift gerade':'greift gerade nicht')+'</span></header>'
 +rr('w','Wenn',condPills(r.wenn))+rr('d','Dann','<span class="kz-pill d">zeigen: '+e(zielName(r.ziel))+'</span>')+rr('s','Sonst','<span class="kz-pill">überspringen, weiter mit '+e(naechste(r.ziel))+'</span>')
 +'<p class="kz-rsatz">'+e(regelSatz(r))+'</p>'+(zu?'<p class="kz-klein">Gesperrt, weil '+e(zielName(r.ziel))+' fertig ist. Zum Ändern dort das Schloss öffnen.</p>':'<div class="kz-rf"><button type="button" class="kz-btn2 sm" data-kz="regel-edit" data-r="'+e(r.id)+'">Ändern</button><button type="button" class="kz-lnk rot" data-kz="regel-weg" data-r="'+e(r.id)+'">Löschen</button></div>')+'</article>';}
function zielOpts(r){var o=[];S().forEach(function(p,i){if(i>0)o.push(['p:'+i,pLab(p,i),zuP(i)&&r.ziel.seite!==i]);if(p.fragen.length>1)p.fragen.forEach(function(s){if(s.typ!=='termin')o.push(['q:'+s.key,'— Frage · '+qn(s),!!s.gesperrt&&r.ziel.key!==s.key]);});});return o;}
function regelEdit(r,i){var z=r.ziel,cur=z.seite!=null?'p:'+z.seite:'q:'+z.key,qs=z.seite!=null?quellen(z.seite):quellenQ(z.key),q=step(r.wenn.key),neg=nicht(r.wenn),gew=wennLabels(r.wenn),id=e(r.id);
 var h='<article class="kz-rk edit" id="rk-'+id+'"><header><b>Regel '+(i+1)+' ändern</b></header>';
 h+='<div class="kz-rb"><span class="kz-tg d">Dann zeigen</span><label class="kz-fld"><span>Welche Seite oder Frage?</span><select data-kzr="ziel" data-r="'+id+'">'+zielOpts(r).map(function(x){return'<option value="'+e(x[0])+'"'+(x[0]===cur?' selected':'')+(x[2]?' disabled':'')+'>'+e(x[1])+(x[2]?' (gesperrt)':'')+'</option>';}).join('')+'</select></label></div>';
 h+='<div class="kz-rb"><span class="kz-tg w">Wenn</span><label class="kz-fld"><span>Frage davor</span><select data-kzr="q" data-r="'+id+'">'+qs.map(function(x){return'<option value="'+e(x.key)+'"'+(x.key===r.wenn.key?' selected':'')+'>'+e('Seite '+(pVon(x.key)+1)+' · '+qn(x))+'</option>';}).join('')+'</select></label>'
 +'<div class="kz-seg">'+[['ist','ist'],['nicht','ist nicht']].map(function(o){return'<button type="button" class="'+((o[0]==='nicht')===neg?'an':'')+'" data-kz="r-op" data-r="'+id+'" data-v="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'
 +'<div class="kz-chips">'+labels(q).map(function(l){return'<button type="button" class="kz-chip'+(gew.indexOf(l)>=0?' an':'')+'" data-kz="r-v" data-r="'+id+'" data-v="'+e(l)+'">'+e(l)+'</button>';}).join('')+'</div></div>';
 h+='<div class="kz-rb"><span class="kz-tg s">Sonst</span><p class="kz-klein">Wird übersprungen, weiter geht es mit '+e(naechste(z))+'.</p></div>';
 return h+'<p class="kz-rsatz">'+e(regelSatz(r))+'</p><div class="kz-rf"><button type="button" class="kz-btn" data-kz="regel-fertig">Fertig</button><button type="button" class="kz-lnk rot" data-kz="regel-weg" data-r="'+id+'">Löschen</button></div></article>';}
function wimKarten(){var W=wimW(),an=wimAn(),pz=+W.prozent||50,wo=+W.wochen||4,fo=W.fotos||'whatsapp',t=termin(),zu=t?zuP(pVon(t.key)):false,d=zu?' disabled':'';
 var a='<article class="kz-rk'+(an?'':' aus')+'" id="rk-wim1"><header><b>Wimpern: Fragen beim Auffüllen</b><span class="kz-rst'+(an?' an':'')+'">'+(an?'an':'aus')+'</span><span class="kz-sp"></span><label class="kz-sw"><input type="checkbox" data-kzw="an"'+(an?' checked':'')+d+'><span class="kz-swt"></span><span>Ein</span></label></header>'
 +rr('w','Wenn','<span class="kz-pill q">Behandlung</span><span class="kz-opt">ist</span><span class="kz-pill a">eine Auffüllen-Leistung (Wimpern)</span>')+rr('d','Dann','<span class="kz-pill d">fragen: letztes Auffüllen, wie viele Wimpern noch da sind, kurze Beschreibung</span>')+rr('s','Sonst','<span class="kz-pill">diese Fragen entfallen</span>')+'</article>';
 var b='<article class="kz-rk'+(an?'':' aus')+'" id="rk-wim2"><header><b>Wimpern: neues Set statt Auffüllen</b></header>'
 +rr('w','Wenn','<span class="kz-pill q">Noch da</span><span class="kz-opt">weniger als</span><select data-kzw="prozent" aria-label="Prozent"'+d+'>'+[30,40,50,60,70].map(function(v){return'<option value="'+v+'"'+(v===pz?' selected':'')+'>'+v+' %</option>';}).join('')+'</select><span class="kz-opt">oder</span><span class="kz-pill q">Letztes Auffüllen</span><span class="kz-opt">länger als</span><select data-kzw="wochen" aria-label="Wochen"'+d+'>'+[2,3,4,5,6,8].map(function(v){return'<option value="'+v+'"'+(v===wo?' selected':'')+'>'+v+' Wochen</option>';}).join('')+'</select>')
 +rr('d','Dann','<span class="kz-pill d">Zeit fürs neue Set einplanen</span><span class="kz-pill d">Preis bleibt der fürs Auffüllen, Preis des Sets als Hinweis</span>')+rr('s','Sonst','<span class="kz-pill">Auffüllen wie gebucht</span>')
 +'<label class="kz-fld"><span>Fotos der Wimpern</span><select data-kzw="fotos"'+d+'>'+[['whatsapp','nach dem Absenden per WhatsApp'],['widget','im Formular hochladen'],['aus','keine Fotos']].map(function(x){return'<option value="'+x[0]+'"'+(x[0]===fo?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label>'
 +'<p class="kz-rsatz">Wenn weniger als '+pz+' % da sind oder das letzte Auffüllen länger als '+wo+' Wochen her ist, plant das Formular die Zeit fürs neue Set ein. Sonst bleibt es beim Auffüllen.</p></article>';return a+b;}
function regelOp(id,v){var r=regelVon(id);if(!r)return;var q=step(r.wenn.key);if(!q)return;var gew=wennLabels(r.wenn).slice(),w;
 if(v==='nicht'){var rest=labels(q).filter(function(l){return gew.indexOf(l)<0;});if(!rest.length){toastK('Dann würde sie nie gezeigt. Bitte weniger Antworten wählen.',true);return;}w={key:q.key,ist:rest,nicht:gew};}else w={key:q.key,ist:gew};
 kzMerk();wennSetzen(r.ziel,w);renderSteps();}
function regelWert(id,l){var r=regelVon(id);if(!r)return;var q=step(r.wenn.key);if(!q)return;var neg=nicht(r.wenn),gew=wennLabels(r.wenn).slice(),i=gew.indexOf(l),w;if(i>=0)gew.splice(i,1);else gew.push(l);
 if(!gew.length){toastK('Mindestens eine Antwort wählen.',true);return;}
 if(neg){var rest=labels(q).filter(function(x){return gew.indexOf(x)<0;});if(!rest.length){toastK('Dann würde sie nie gezeigt.',true);return;}w={key:q.key,ist:rest,nicht:gew};}else w={key:q.key,ist:gew};
 kzMerk();wennSetzen(r.ziel,w);renderSteps();}
function regelFeld(t){var r=regelVon(t.getAttribute('data-r')),k=t.getAttribute('data-kzr'),v=t.value;if(!r)return;var w=JSON.parse(JSON.stringify(r.wenn));
 if(k==='ziel'){var z=zielAus(v);if(!z)return;var src=step(w.key),ok=!!src&&(z.seite!=null?pVon(src.key)<z.seite:(cfg.steps.indexOf(src)<cfg.steps.indexOf(step(z.key))));
  if(!ok){var qs=z.seite!=null?quellen(z.seite):quellenQ(z.key);if(!qs.length){toastK('Davor gibt es keine Frage mit Antworten.',true);rMain();return;}var nq=qs[qs.length-1];w={key:nq.key,ist:[labels(nq)[0]]};}
  kzMerk();wennSetzen(r.ziel,null);wennSetzen(z,w);var neu=regelFuer(z);U.edit=neu?neu.id:null;renderSteps();return;}
 if(k==='q'){var q2=step(v);if(!q2)return;kzMerk();wennSetzen(r.ziel,{key:q2.key,ist:[labels(q2)[0]]});renderSteps();}}
function nurManchmal(pi){var qs=quellen(pi);if(!qs.length){toastK('Davor gibt es keine Frage mit Antworten.',true);return;}var q=qs[qs.length-1];kzMerk();wennSetzen({seite:pi},{key:q.key,ist:[labels(q)[0]]});renderSteps();var r=regelFuer({seite:pi});U.edit=r?r.id:null;geh('regeln');if(r)blink('rk-'+r.id);}
function wimSetzen(k,v){if(!cfg.termin||!cfg.termin.salon)return;kzMerk();var W=wimW();if(k==='an')W.an=!!v;else if(k==='fotos')W.fotos=String(v);else W[k]=+v;renderSteps();}
function lock(k,i){kzMerk();if(k==='seite'){var p=S()[i];if(!p)return;var zu=!zuP(i);p.fragen.forEach(function(s){if(zu)s.gesperrt=true;else delete s.gesperrt;});toastK(zu?'Gesperrt. Der Architekt ändert hier nichts mehr.':'Offen. Hier darf wieder gebaut werden.');renderSteps();return;}
 cfg.gesperrt=cfg.gesperrt||{};if(cfg.gesperrt[k])delete cfg.gesperrt[k];else cfg.gesperrt[k]=true;var an=!!cfg.gesperrt[k];if(!Object.keys(cfg.gesperrt).length)delete cfg.gesperrt;toastK(an?'Gesperrt. Der Architekt ändert hier nichts mehr.':'Offen. Hier darf wieder gebaut werden.');alles();}

/* ---------- Vorschau: das echte Formular ---------- */
function vorSichtbar(){var a=$('app');if(!BAU||!a||a.style.display==='none')return false;return breit()||U.tab==='vorschau';}
function vorschauBald(ms){DIRTY.vor=true;clearTimeout(vorschauBald.t);vorschauBald.t=setTimeout(function(){if(DIRTY.vor&&vorSichtbar())vorschauJetzt();},ms==null?450:ms);}
function vorschauJetzt(){var f=$('kz-frame');if(!f||typeof cfg!=='object'||!cfg)return;var c;try{c=JSON.stringify(cfg);}catch(x){return;}DIRTY.vor=false;STAND={a:{}};
 var base=location.href.split('#')[0],w2='https://clickzauber-api.vercel.app/w.js?p='+KZV;
 f.srcdoc='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+e(base)+'"><style>html,body{margin:0;background:#fff}body{padding:4px 0 20px}</style></head><body><div data-cz-mount="__vorschau" data-no-tr></div>'
 +'<script>window.CZ_VORSCHAU_CONFIG='+c.replace(/</g,'\\u003c')+';window.CZ_VORSCHAU_SENDEN=function(){};window.CZ_VORSCHAU_STAND=function(a,i){try{parent.czKzStand(a,i);}catch(e){}};function czW2(){var s=document.createElement("script");s.src="'+w2+'";s.setAttribute("data-cz","__vorschau");s.setAttribute("data-cz-lang","de");document.body.appendChild(s);}<\/script>'
 +'<script src="verkaufsslides/w.js?p='+KZV+'" data-cz="__vorschau" data-cz-lang="de" onerror="czW2()"><\/script></body></html>';rAktiv();}
window.czKzStand=function(a,i){try{STAND={a:JSON.parse(JSON.stringify(a||{})),i:i};}catch(x){STAND={a:{}};}clearTimeout(window.czKzStand.t);window.czKzStand.t=setTimeout(statusAkt,120);};
function statusAkt(){rAktiv();regeln().forEach(function(r){var el=$('rk-'+r.id);if(!el)return;var s=el.querySelector('.kz-rst'),an=bedAn(r.wenn,STAND.a);if(s){s.classList.toggle('an',an);s.textContent=an?'greift gerade':'greift gerade nicht';}});}
function rAktiv(){var b=$('kz-aktiv');if(!b)return;var R=regeln(),h='<div class="kz-akk">'+IC.fork+'<b>Regeln in dieser Vorschau</b></div>';
 R.forEach(function(r,i){var an=bedAn(r.wenn,STAND.a);h+='<button type="button" class="kz-ak'+(an?' an':'')+'" data-kz="regel-zeig" data-r="'+e(r.id)+'"><i></i><span><b>Regel '+(i+1)+'</b> '+e(kurzRegel(r))+'</span><em>'+(an?'greift':'greift nicht')+'</em></button>';});
 if(wimRelevant())h+='<button type="button" class="kz-ak" data-kz="regel-zeig" data-r="wim1"><i></i><span><b>Wimpern</b> Auffüllen oder neues Set</span><em>'+(wimAn()?'im Formular':'aus')+'</em></button>';
 if(!R.length&&!wimRelevant())h+='<p class="kz-klein">Noch keine Regel. Klicken Sie sich trotzdem durch: So sehen es Ihre Kunden.</p>';else h+='<p class="kz-klein">Klicken Sie sich durch das Formular. Die Regeln reagieren sofort, ganz ohne KI.</p>';b.innerHTML=h;}

/* ---------- Architekt ---------- */
var WAS={regel:{t:'Wenn-Dann-Regel',h:'Bei einer Antwort: Hinweis, Aufpreis oder eine Seite zeigen',wo:'frage',typen:['auswahl'],lesen:true},frage:{t:'Neue Frage',h:'zum Beispiel „Tragen Sie Kontaktlinsen?“',wo:'seite'},antwort:{t:'Antwort hinzufügen',h:'eine Auswahl mehr bei einer Frage',wo:'frage',typen:['auswahl','mehrfach']},leistung:{t:'Leistung hinzufügen',h:'mit Dauer und Preis',wo:'kachel',termin:true},aendern:{t:'Preis oder Dauer ändern',h:'bei einer Leistung',wo:'leist',termin:true},text:{t:'Text ändern',h:'Überschrift einer Seite oder eine Frage',wo:'text'},loeschen:{t:'Etwas löschen',h:'eine Frage oder eine Antwort',wo:'frage',typen:['auswahl','mehrfach','text','datum']}};
WAS.regel.typen.push('termin');
function wasListe(){return Object.keys(WAS).filter(function(k){return!WAS[k].termin||!!(termin()&&cfg.termin);});}
function std(w){return w==='frage'?{art:'auswahl',pflicht:'ja'}:w==='leistung'?{dauer:'30',ab:'nein'}:w==='regel'?{antworten:[]}:{};}
function passtQ(s,k){k=k||G.was;var W=WAS[k];if(!W||W.termin||W.wo==='seite')return false;if(W.wo==='text')return s.typ!=='termin';return W.typen.indexOf(typ(s))>=0&&(k!=='regel'||labels(s).length>0);}
function istTerminSeite(p){return p.fragen.some(function(s){return s.typ==='termin';});}
function seitePasst(p,k){k=k||G.was;var W=WAS[k];if(!W)return false;if(W.wo==='text')return true;if(W.wo==='seite')return!istTerminSeite(p);return p.fragen.some(function(s){return passtQ(s,k);});}
/* Warum etwas gerade nicht geht (leer = geht). So steckt niemand in einem leeren Schritt 2 fest. */
function warumNicht(k){var W=WAS[k],P=S(),t;if(!W)return'';
 if(W.termin){t=termin();if(!t||!cfg.termin)return'Ihr Formular hat keine Leistungen.';if(zuP(pVon(t.key)))return'Die Seite mit den Leistungen ist gesperrt. Zuerst dort das Schloss öffnen.';if(k==='aendern'&&!leist().length)return'Es gibt noch keine Leistung.';return'';}
 if(W.wo==='seite'||W.wo==='text')return'';
 if(P.some(function(p,i){return(W.lesen||!zuP(i))&&seitePasst(p,k);}))return'';
 return k==='regel'?'Dafür braucht es eine Frage mit Antworten zum Antippen, zum Beispiel Ja oder Nein. Legen Sie zuerst eine an.':k==='antwort'?'Es gibt noch keine offene Frage mit Antworten zum Antippen.':'Es gibt keine offene Frage, die sich löschen lässt.';}
function pruefG(){var P=S();if(G.was&&wasListe().indexOf(G.was)<0)G.was=null;if(typeof G.seite==='number'&&!P[G.seite])G.seite=null;if(G.frage&&G.frage!=='titel'&&G.frage!=='+neu'&&!step(G.frage)&&kats().indexOf(G.frage)<0)G.frage=null;
 if(G.was&&(WAS[G.was].wo==='kachel'||WAS[G.was].wo==='leist')){var t=termin();G.seite=t?pVon(t.key):null;}}
function autoFrage(){if(!G.was)return;var W=WAS[G.was],P=S(),ps=[];
 if(G.seite==null&&W.wo==='frage'){P.forEach(function(p,i){if((W.lesen||!zuP(i))&&seitePasst(p))ps.push(i);});if(ps.length===1)G.seite=ps[0];}
 if(typeof G.seite!=='number'||G.frage)return;var p=P[G.seite];if(!p||W.wo!=='frage')return;var qs=p.fragen.filter(function(s){return passtQ(s);});if(qs.length===1)G.frage=qs[0].key;}
function woFertig(){if(!G.was)return false;var W=WAS[G.was];if(warumNicht(G.was))return false;if(W.wo==='leist')return!!termin();if(W.wo==='kachel')return!!termin()&&!!G.frage;if(G.seite==='ende')return G.was==='text';if(G.seite==='neu')return W.wo==='seite';if(typeof G.seite!=='number')return false;if(W.wo==='seite')return true;return!!G.frage;}
function woText(){var W=WAS[G.was],P=S(),q=step(G.frage),p,t;if(!W)return'';if(W.wo==='leist')return'Bei den Leistungen';if(W.wo==='kachel')return'Kachel „'+(G.frage==='+neu'?(G.f.kat||'neu'):G.frage)+'“';
 if(G.seite==='ende')return'Letzte Seite';if(G.seite==='neu')return'Auf einer neuen Seite';p=P[G.seite];t=p?pLab(p,G.seite):'';if(G.frage==='titel')return t+' · Überschrift';return t+(q?' · „'+qn(q)+'“':'');}
function wasHTML(){return'<div class="kz-was">'+wasListe().map(function(k){var wn=warumNicht(k);return'<button type="button" class="kz-wt'+(G.was===k?' an':'')+(wn?' nein':'')+'" data-g-was="'+k+'"><b>'+WAS[k].t+'</b><small>'+e(wn?wn.split('. ')[0].replace(/\.$/,'')+'.':WAS[k].h)+'</small></button>';}).join('')+'</div>';}
function woHTML(){if(!G.was)return'';var W=WAS[G.was],P=S(),h='',wn=warumNicht(G.was),t=termin();
 if(wn)return'<p class="kz-warn">'+e(wn)+'</p>'+(G.was==='regel'||G.was==='antwort'?'<button type="button" class="kz-btn2 sm" data-g-was="frage">'+IC.plus+'Neue Frage anlegen</button>':'')+(W.termin&&t&&zuP(pVon(t.key))?'<button type="button" class="kz-btn2 sm" data-kz="lock" data-k="seite" data-i="'+pVon(t.key)+'">Schloss öffnen</button>':'');
 if(W.wo==='leist')return'<p class="kz-klein">Bei den Leistungen auf Seite '+((G.seite||0)+1)+'. Welche Leistung, wählen Sie gleich.</p>';
 if(W.wo==='kachel')return'<div class="kz-chips"><span class="kz-subl">In welche Kachel?</span>'+kats().map(function(k){return'<button type="button" class="kz-chip'+(G.frage===k?' an':'')+'" data-g-frage="'+e(k)+'">'+e(k)+'</button>';}).join('')+'<button type="button" class="kz-chip'+(G.frage==='+neu'?' an':'')+'" data-g-frage="+neu">+ Neue Kachel</button></div>';
 h+='<div class="kz-chips"><span class="kz-subl">Auf welcher Seite?</span>';P.forEach(function(p,i){if(!seitePasst(p))return;var gs=zuP(i)&&!W.lesen;h+='<button type="button" class="kz-chip'+(G.seite===i?' an':'')+(gs?' gs':'')+'" data-g-seite="'+i+'"'+(gs?' aria-disabled="true"':'')+'>'+(zuP(i)?IC.zu:'')+e(pLab(p,i))+'</button>';});
 if(W.wo==='seite')h+='<button type="button" class="kz-chip'+(G.seite==='neu'?' an':'')+'" data-g-seite="neu">+ Auf einer neuen Seite</button>';
 if(G.was==='text')h+='<button type="button" class="kz-chip'+(G.seite==='ende'?' an':'')+(zuX('ende')?' gs':'')+'" data-g-seite="ende"'+(zuX('ende')?' aria-disabled="true"':'')+'>'+(zuX('ende')?IC.zu:'')+'Letzte Seite</button>';h+='</div>';
 var p=typeof G.seite==='number'?P[G.seite]:null;
 if(p&&(W.wo==='frage'||W.wo==='text')){var qs=p.fragen.filter(function(s){return passtQ(s);});h+='<div class="kz-chips kz-sub"><span class="kz-subl">'+(W.wo==='text'?'Welcher Text?':'Welche Frage?')+'</span>'+(W.wo==='text'?'<button type="button" class="kz-chip'+(G.frage==='titel'?' an':'')+'" data-g-frage="titel">Überschrift der Seite</button>':'')+qs.map(function(s){return'<button type="button" class="kz-chip'+(G.frage===s.key?' an':'')+'" data-g-frage="'+e(s.key)+'">'+e(qn(s))+'</button>';}).join('')+'</div>';}
 if(W.lesen&&p&&zuP(G.seite))h+='<p class="kz-klein">Seite '+(G.seite+1)+' ist gesperrt. Ihre Antworten dürfen eine Regel auslösen, die Seite selbst bleibt, wie sie ist.</p>';return h+'<div class="kz-warn" id="kz-kiwarn"></div>';}
function zieleNach(src){var sp=pVon(src.key),i0=cfg.steps.indexOf(src),r=[];S().forEach(function(p,i){if(i>sp)r.push(['p:'+i,pLab(p,i)+(zuP(i)?' (gesperrt)':''),zuP(i)]);if(p.fragen.length>1||i===sp)p.fragen.forEach(function(s){if(cfg.steps.indexOf(s)>i0&&s.typ!=='termin')r.push(['q:'+s.key,'— Frage · '+qn(s)+(s.gesperrt?' (gesperrt)':''),!!s.gesperrt]);});});return r;}
function detHTML(){if(!woFertig())return'<p class="kz-klein">Erst Schritt 1 und 2 wählen.</p>';var f=G.f,q=step(G.frage),pg=typeof G.seite==='number'?S()[G.seite]:null;
 function inp(k,l,ph,o){o=o||{};return'<label class="kz-fld"><span>'+l+(o.pf?'<i class="kz-pf">Pflicht</i>':'')+'</span><span class="kz-mic"><input data-g="'+k+'" value="'+e(f[k]==null?'':f[k])+'" placeholder="'+e(ph||'')+'"'+(o.num?' inputmode="decimal"':'')+'>'+(o.num?'':'<button type="button" class="kz-micb" data-mic="'+k+'" aria-label="Diktieren">'+IC.mic+'</button>')+'</span></label>';}
 function sel(k,l,os,o){o=o||{};var cur=String(f[k]==null?'':f[k]);return'<label class="kz-fld"><span>'+l+(o.pf?'<i class="kz-pf">Pflicht</i>':'')+'</span><select data-g="'+k+'">'+(o.leer===false?'':'<option value="">Bitte wählen</option>')+os.map(function(x){return'<option value="'+e(x[0])+'"'+(cur===String(x[0])?' selected':'')+(x[2]?' disabled':'')+'>'+e(x[1])+'</option>';}).join('')+'</select></label>';}
 function seg(k,l,os){return'<div class="kz-fld"><span>'+l+'</span><div class="kz-seg">'+os.map(function(x){return'<button type="button" class="'+(f[k]===x[0]?'an':'')+'" data-g-seg="'+k+'" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div></div>';}
 var dO=[];for(var m=5;m<=480;m+=5)dO.push([m,dz(m)]);
 switch(G.was){
 case'frage':var art=f.art||'auswahl';return(G.seite==='neu'?inp('seitentitel','Überschrift der neuen Seite, freiwillig','z. B. Ihre Augen'):'')+inp('titel','Wie lautet die Frage?','z. B. Tragen Sie Kontaktlinsen?',{pf:1})+seg('art','Wie antwortet der Gast?',[['auswahl','Eine Antwort'],['mehrfach','Mehrere'],['text','Freitext'],['datum','Datum']])+(art==='auswahl'||art==='mehrfach'?'<label class="kz-fld"><span>Antworten, eine pro Zeile<i class="kz-pf">Pflicht</i></span><textarea data-g="antworten" rows="3" placeholder="Ja&#10;Nein">'+e(f.antworten||'')+'</textarea></label>':'')+(art==='mehrfach'?'<p class="kz-klein">Mehrere Antworten sind immer freiwillig.</p>':seg('pflicht','Muss der Gast antworten?',[['ja','Ja, Pflicht'],['nein','Nein, freiwillig']]));
 case'antwort':return inp('text','Neue Antwort','z. B. Nur ein paar',{pf:1})+inp('preis','Aufpreis in €, freiwillig','0',{num:1})+inp('info','Hinweis unter der Antwort, freiwillig','z. B. Bitte 15 Minuten früher da sein');
 case'regel':var ds=f.dann||'',zl=q?zieleNach(q):[];return'<div class="kz-fld"><span><b class="kz-tgi w">Wenn</b>der Gast antwortet …<i class="kz-pf">Pflicht</i></span><div class="kz-chips">'+labels(q).map(function(l){return'<button type="button" class="kz-chip'+((f.antworten||[]).indexOf(l)>=0?' an':'')+'" data-g-ant="'+e(l)+'">'+e(l)+'</button>';}).join('')+'</div></div>'
  +seg('dann','<b class="kz-tgi d">Dann</b>',[['hinweis','Hinweis zeigen'],['preis','Aufpreis'],['zeigen','Seite oder Frage zeigen'],['ueberspringen','Seite oder Frage überspringen']])
  +(ds==='zeigen'||ds==='ueberspringen'?(zl.length?sel('dannWert','Welche Seite oder Frage?',zl,{pf:1}):'<p class="kz-warn">Nach dieser Frage kommt nichts mehr. Legen Sie zuerst eine neue Seite an.</p>'):ds==='preis'?inp('dannWert','Aufpreis in €','z. B. 10',{pf:1,num:1}):ds==='hinweis'?inp('dannWert','Text für den Gast','z. B. Bitte Brille mitbringen',{pf:1}):'')
  +(ds?'<p class="kz-sonst"><b class="kz-tgi s">Sonst</b>'+{zeigen:'wird sie übersprungen.',ueberspringen:'wird sie gezeigt.',preis:'kein Aufpreis.',hinweis:'kein Hinweis.'}[ds]+'</p>':'');
 case'leistung':return(G.frage==='+neu'?inp('kat','Name der neuen Kachel','z. B. Augenbrauen',{pf:1}):'')+inp('name','Name der Leistung','z. B. Brauen färben',{pf:1})+sel('dauer','Dauer',dO,{pf:1,leer:false})+inp('preis','Preis in €','z. B. 25',{pf:1,num:1})+seg('ab','Preis als „ab“ zeigen?',[['nein','Nein'],['ja','Ja']])+inp('info','Hinweis für den Gast, freiwillig','z. B. Bitte ungeschminkt kommen');
 case'aendern':return sel('lid','Welche Leistung?',leist().map(function(l,i){return[i,(l.kat?l.kat+' · ':'')+(l.name||'Ohne Namen')+' ('+dz(l.dauer)+(l.preis!=null&&l.preis!==''?', '+eur(l.preis):'')+')'];}),{pf:1})+sel('dauer','Neue Dauer',[['','gleich lassen']].concat(dO),{leer:false})+inp('preis','Neuer Preis in €','gleich lassen',{num:1});
 case'text':var alt=G.seite==='ende'?((cfg.summary&&cfg.summary.titel)||''):(G.frage==='titel'?(pg&&pg.titel)||'':(q?q.frage:''));return'<p class="kz-klein">Bisher: „'+e(alt)+'“</p>'+inp('neu','Neuer Text','',{pf:1});
 case'loeschen':return sel('ziel','Was soll weg?',[['ganz','Die ganze Frage „'+qn(q)+'“']].concat((q&&q.optionen||[]).map(function(o,i){return[String(i),'Nur die Antwort „'+(o.label||'leer')+'“'];})),{pf:1})+'<label class="kz-chk"><input type="checkbox" data-g-cb="sicher"'+(f.sicher?' checked':'')+'> Ja, das soll weg.</label>';}
 return'';}
function plan(){var F=[],Z=[],fn=null,f=G.f,W=G.was&&WAS[G.was],gs=G.seite,gf=G.frage;
 if(!W)return{F:['Schritt 1: Was soll passieren?'],Z:Z};if(!woFertig())return{F:['Schritt 2: Wo?'],Z:Z};
 if(typeof gs==='number'&&zuP(gs)&&!W.lesen)return{F:['Seite '+(gs+1)+' ist gesperrt'],Z:Z};if(gs==='ende'&&zuX('ende'))return{F:['die letzte Seite ist gesperrt'],Z:Z};
 switch(G.was){
 case'frage':var ant=String(f.antworten||'').split('\n').map(function(x){return x.trim();}).filter(Boolean),art=f.art||'auswahl',mo=art==='auswahl'||art==='mehrfach',neuS=gs==='neu',pix=neuS?S().length:gs,p=neuS?null:S()[gs],tt=String(f.titel||'').trim();
  if(!tt)F.push('die Frage');if(mo&&ant.length<2)F.push('mindestens 2 Antworten');if(art==='datum'&&typeof dateCount==='function'&&dateCount()>=2)F.push('weniger Datums-Fragen (höchstens zwei)');
  if(!F.length){Z.push((neuS?'Neue Seite '+(pix+1)+(String(f.seitentitel||'').trim()?' „'+String(f.seitentitel).trim()+'“':'')+' mit der Frage':'Neue Frage auf '+pLab(p,gs)+':')+' „'+tt+'“');Z.push('Antwort: '+{auswahl:'eine Antwort',mehrfach:'mehrere Antworten',text:'Freitext',datum:'Datum'}[art]+(mo?' ('+ant.join(', ')+')':''));Z.push(art==='mehrfach'||f.pflicht==='nein'?'Freiwillig':'Pflichtfrage');
   fn=function(){var pp=neuS?null:S()[gs],key=typeof neuerKey==='function'?neuerKey():'frage'+Date.now(),neu={key:key,frage:tt,typ:art,gruppe:neuS?String(f.seitentitel||'').trim().slice(0,80):(pp&&pp.titel)||'',seite:pix};if(mo)neu.optionen=ant.map(function(l){return{label:l,score:0};});
    if(art==='mehrfach'||(art==='auswahl'&&f.pflicht==='nein'))neu.optional=true;if(art==='text'&&f.pflicht!=='nein')neu.pflicht=true;var letzte=pp?pp.fragen[pp.fragen.length-1]:null,pos=letzte?cfg.steps.indexOf(letzte)+1:cfg.steps.length;cfg.steps.splice(pos,0,neu);return{v:'seite:'+pix,el:'q:'+key};};}break;
 case'antwort':var q2=step(gf),tx2=String(f.text||'').trim();if(!tx2)F.push('die Antwort');else if(labels(q2).indexOf(tx2)>=0)F.push('eine neue Antwort, diese gibt es schon');
  if(!F.length){var pa=num(f.preis),pg2=!!q2.proGast||(q2.optionen||[]).some(function(o){return+o.proGast>0;}),inf=String(f.info||'').trim();Z.push('Neue Antwort „'+tx2+'“ bei „'+qn(q2)+'“'+(pa?' mit Aufpreis '+eur(pa)+(pg2?' pro Gast':''):''));if(inf)Z.push('Hinweis darunter: „'+inf+'“');
   fn=function(){var o={label:tx2,score:0};if(pa){if(pg2)o.proGast=pa;else o.preis=pa;}if(inf)o.beschreibung=inf;q2.optionen=q2.optionen||[];q2.optionen.push(o);return{v:'seite:'+pVon(q2.key),el:'q:'+q2.key};};}break;
 case'regel':var q=step(gf),av=(f.antworten||[]).filter(function(l){return labels(q).indexOf(l)>=0;}),da=f.dann||'',dw=f.dannWert;
  if(!av.length)F.push('Wenn: welche Antwort');if(!da)F.push('Dann: was passiert');
  if(da==='zeigen'||da==='ueberspringen'){if(!dw)F.push('Dann: welche Seite oder Frage');else if(zielZu(zielAus(dw)))F.push('ein Ziel, das nicht gesperrt ist');if(da==='ueberspringen'&&av.length&&av.length>=labels(q).length)F.push('Wenn: nicht alle Antworten wählen');}
  if(da==='preis'&&!(num(dw)>0))F.push('Dann: wie viel Aufpreis');if(da==='hinweis'&&!String(dw||'').trim())F.push('Dann: der Hinweis');
  if(!F.length){if(da==='zeigen'||da==='ueberspringen'){var z=zielAus(dw),w=da==='zeigen'?{key:q.key,ist:av.slice()}:{key:q.key,ist:labels(q).filter(function(l){return av.indexOf(l)<0;}),nicht:av.slice()},schon=zielSteps(z).some(function(s){return!!sig(s.wenn);});
    Z.push((da==='zeigen'?'Zeigen: ':'Überspringen: ')+zielName(z)+', wenn bei „'+qn(q)+'“ '+av.map(ql).join(' oder ')+' gewählt ist');Z.push('Sonst: '+(da==='zeigen'?'wird sie übersprungen, weiter mit '+naechste(z):'wird sie gezeigt'));if(schon)Z.push('Achtung: Dort gilt schon eine Regel. Sie wird ersetzt.');
    fn=function(){wennSetzen(z,w);var rg=regelFuer(z);return{v:'regeln',el:rg?'rk-'+rg.id:null};};}
   else if(da==='preis'){var n=num(dw),pgq=!!q.proGast||(q.optionen||[]).some(function(o){return+o.proGast>0;});av.forEach(function(l){Z.push('„'+l+'“: Aufpreis '+eur(n)+(pgq?' pro Gast':''));});Z.push('Sonst: kein Aufpreis');
    fn=function(){(q.optionen||[]).forEach(function(o){if(av.indexOf(o.label)>=0){if(pgq){o.proGast=n;delete o.preis;}else o.preis=n;}});return{v:'seite:'+pVon(q.key),el:'q:'+q.key};};}
   else if(q.typ==='termin'){var hw0=String(dw).trim(),LL=leist().filter(function(l){return av.indexOf(l.name)>=0||av.indexOf('kat:'+(l.kat||'Leistungen'))>=0;});LL.forEach(function(l){Z.push('„'+l.name+'“: Hinweis „'+hw0+'“');});Z.push('Sonst: kein Hinweis');
    fn=function(){LL.forEach(function(l){l.info=hw0;});var t=termin();return{v:'seite:'+pVon(t.key),el:'q:'+t.key};};}
   else{var hw=String(dw).trim();av.forEach(function(l){Z.push('„'+l+'“: Hinweis darunter „'+hw+'“');});Z.push('Sonst: kein Hinweis');
    fn=function(){(q.optionen||[]).forEach(function(o){if(av.indexOf(o.label)>=0)o.beschreibung=hw;});return{v:'seite:'+pVon(q.key),el:'q:'+q.key};};}}break;
 case'leistung':var kat=gf==='+neu'?String(f.kat||'').trim().slice(0,60):gf,dd=num(f.dauer),pp2=num(f.preis),nm=String(f.name||'').trim().slice(0,80),inf2=String(f.info||'').trim();
  if(gf==='+neu'&&!kat)F.push('Name der Kachel');if(!nm)F.push('Name der Leistung');if(!dd)F.push('Dauer');if(pp2==null)F.push('Preis');if(leist().length>=30)F.push('Platz (höchstens 30 Leistungen)');
  if(!F.length){Z.push('Neue Leistung in „'+kat+'“: '+nm+', '+dz(dd)+', '+(f.ab==='ja'?'ab ':'')+eur(pp2));if(inf2)Z.push('Hinweis: „'+inf2+'“');
   fn=function(){var l={name:nm,kat:kat,dauer:dd,preis:pp2};if(f.ab==='ja')l.ab=true;if(inf2)l.info=inf2;if(!Array.isArray(cfg.termin.leistungen))cfg.termin.leistungen=[];var L=cfg.termin.leistungen,pos=L.length;for(var i=L.length-1;i>=0;i--){if((L[i].kat||'')===kat){pos=i+1;break;}}L.splice(pos,0,l);var t=termin();return{v:'seite:'+pVon(t.key),el:'q:'+t.key,li:pos};};}break;
 case'aendern':var l2=leist()[f.lid===''||f.lid==null?-1:+f.lid],d2=f.dauer?num(f.dauer):null,p2=String(f.preis||'').trim()?num(f.preis):null;if(!l2)F.push('welche Leistung');if(d2==null&&p2==null)F.push('neue Dauer oder neuer Preis');
  if(!F.length){if(d2!=null)Z.push('„'+l2.name+'“: Dauer '+dz(l2.dauer)+' → '+dz(d2));if(p2!=null)Z.push('„'+l2.name+'“: Preis '+eur(l2.preis)+' → '+eur(p2));fn=function(){if(d2!=null)l2.dauer=d2;if(p2!=null)l2.preis=p2;var t=termin();return{v:'seite:'+pVon(t.key),el:'q:'+t.key,li:+f.lid};};}break;
 case'text':var nt=String(f.neu||'').trim();if(!nt)F.push('der neue Text');
  if(!F.length){var pg=typeof gs==='number'?S()[gs]:null,q3=step(gf),alt=gs==='ende'?((cfg.summary&&cfg.summary.titel)||''):(gf==='titel'?(pg&&pg.titel)||'':(q3?q3.frage:''));Z.push('„'+alt+'“ wird zu „'+nt+'“');
   fn=function(){if(gs==='ende'){cfg.summary.titel=nt;try{renderSummary();}catch(x){}return{v:'ende'};}if(gf==='titel'){setSeitenTitel(gs,nt);return{v:'seite:'+gs};}q3.frage=nt;return{v:'seite:'+gs,el:'q:'+q3.key};};}break;
 case'loeschen':var q4=step(gf);if(f.ziel==null||f.ziel==='')F.push('was genau');if(!f.sicher)F.push('die Bestätigung');if(f.ziel==='ganz'&&(cfg.steps||[]).length<2)F.push('eine andere Frage, eine muss bleiben');
  if(!F.length){var ganz=f.ziel==='ganz',oi=+f.ziel,ol=ganz?'':(((q4.optionen||[])[oi])||{}).label,betr=(cfg.steps||[]).filter(function(s){return s.wenn&&s.wenn.key===q4.key&&(ganz||wennLabels(s.wenn).indexOf(ol)>=0);});
   Z.push(ganz?'Frage „'+qn(q4)+'“ ganz entfernen':'Antwort „'+ol+'“ aus „'+qn(q4)+'“ entfernen');if(betr.length)Z.push('Achtung: '+betr.length+(betr.length===1?' Frage hängt':' Fragen hängen')+' an '+(ganz?'dieser Frage. Die Regel fällt weg, sie erscheinen dann immer.':'dieser Antwort. Die Regel wird angepasst.'));
   fn=function(){if(ganz){cfg.steps=cfg.steps.filter(function(s){return s!==q4;});cfg.steps.forEach(function(s){if(s.wenn&&s.wenn.key===q4.key)delete s.wenn;});return{v:'seite:'+Math.max(0,Math.min(gs,S().length-1))};}
    q4.optionen.splice(oi,1);cfg.steps.forEach(function(s){var w=s.wenn;if(!w||w.key!==q4.key)return;['ist','nicht'].forEach(function(k){if(Array.isArray(w[k]))w[k]=w[k].filter(function(x){return x!==ol;});});if(!(w.ist||[]).length&&!(w.nicht||[]).length)delete s.wenn;});return{v:'seite:'+gs,el:'q:'+q4.key};};}break;}
 return{F:F,Z:Z,fn:fn};}
function auftrag(p){var L=[],W=G.was&&WAS[G.was],P=S(),pg=typeof G.seite==='number'?P[G.seite]:null,q=step(G.frage),zu=[];
 L.push('[ROLLE] Du baust das Formular von '+(cfg.betrieb||'diesem Betrieb')+' im clickzauber-Konfigurator. Erfinde nichts. Nimm genau diese Werte.');L.push('[WAS] '+(W?W.t:'fehlt'));
 L.push('[WO] '+(G.seite==='ende'?'Letzte Seite':G.seite==='neu'?'Neue Seite am Ende':pg?'Seite '+(G.seite+1)+' „'+pTitel(pg,G.seite)+'“'+(q?' → Frage „'+(q.frage||qn(q))+'“':G.frage==='titel'?' → Überschrift':G.frage?' → Kachel „'+(G.frage==='+neu'?(G.f.kat||'neu'):G.frage)+'“':''):'fehlt'));
 L.push('[DETAILS]');(p.Z.length?p.Z:['noch unvollständig, es fehlt: '+p.F.join(', ')]).forEach(function(z){L.push('- '+z);});
 P.forEach(function(x,i){if(zuP(i))zu.push('Seite '+(i+1)+' „'+pTitel(x,i)+'“');});if(zuX('ende'))zu.push('Letzte Seite');if(zuX('betrieb'))zu.push('Ihr Betrieb');
 L.push('[GESPERRT, nicht ändern] '+(zu.join(', ')||'nichts'));L.push('[ANTWORT] Nur die Änderungen als Liste. Nichts speichern, der Betrieb bestätigt selbst.');return L.join('\n');}
/* ---------- Architekt als Assistent (seit 21.10.2026) ----------
   Wie das Formular selbst: eine Frage je Bildschirm, große Kacheln, kaum Text. Dieselben Daten wie vorher (G.was, G.seite, G.frage, G.f),
   plan() prüft und übernimmt. G.sc = Bildschirm, G.fix = Ziel steht schon fest („Wann erscheint diese Seite?“), G.foto = erkannte Preisliste. */
var PI={zur:'<path d="m15 18-6-6 6-6"/>',frage:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 9v6M9 12h6"/>',ant:'<path d="M4 6h11M4 12h11M4 18h7"/><path d="M18 15v6M15 18h6"/>',leist:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',uhr:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',stift:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',weg:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',foto:'<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',auge:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',euro:'<path d="M17 6.5A6 6 0 1 0 17 17.5"/><path d="M4 10h9M4 14h9"/>',skip:'<path d="M5 18V6"/><path d="M9 12h10"/><path d="m15 8 4 4-4 4"/>',eins:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',mehr:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',kal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'};
var WK=[['regel','Wenn – Dann',IC.fork],['frage','Neue Frage',sv(PI.frage)],['antwort','Antwort dazu',sv(PI.ant)],['leistung','Leistung dazu',sv(PI.leist)],['aendern','Preis oder Dauer',sv(PI.uhr)],['text','Text ändern',sv(PI.stift)],['loeschen','Löschen',sv(PI.weg)]];
function wt(w){var r=WK.filter(function(x){return x[0]===w;})[0];return r?r[1]:w==='foto'?'Preisliste':'';}
function kl(x){x=String(x);return x.indexOf('kat:')===0?x.slice(4)+' (alle)':x;}
function ql(x){x=String(x);return x.indexOf('kat:')===0?'eine Leistung aus „'+x.slice(4)+'“':'„'+x+'“';}
/* Beispiele je Branche: Kosmetik, Friseur und Barbier, Food Truck und Catering, alles andere (Locations). */
function BSP(){var t=!!(termin()&&cfg.termin),txt=[cfg.branche,cfg.zielgruppe,window.TPL_ID,cfg.name].concat(kats()).join(' '),zg=cfg.zielgruppe||'';
 if(t&&/kosmetik|nagel|wimper|beauty|brauen|haut/i.test(txt))return{seite:'z. B. Ihre Haut',frage:'z. B. Haben Sie Allergien?',antw:'Ja\nNein',hinw:'z. B. Bitte ohne Make-up kommen',leist:'z. B. Augenbrauen zupfen',kat:'z. B. Augenbrauen',antwort:'z. B. Weiß ich nicht',frei:'Wenn jemand Wimpern auffüllen wählt, soll eine Seite „Ihre Wimpern“ kommen.'};
 if(t)return{seite:'z. B. Ihre Haare',frage:'z. B. Wie lang sind Ihre Haare?',antw:'Kurz\nMittel\nLang',hinw:'z. B. Bitte mit gewaschenem Haar kommen',leist:'z. B. Bart trimmen',kat:'z. B. Bart',antwort:'z. B. Schulterlang',frei:'Wenn jemand Bart wählt, soll der Hinweis kommen: Bitte zwei Wochen wachsen lassen.'};
 if(zg==='foodtruck'||zg==='catering')return{seite:'z. B. Ihr Essen',frage:'z. B. Gibt es Vegetarier?',antw:'Ja\nNein',hinw:'z. B. Wir bringen eine vegetarische Auswahl mit',antwort:'z. B. Vegan',frei:'Wenn jemand „Ja“ bei Vegetariern sagt, soll eine Frage nach der Anzahl kommen.'};
 return{seite:'z. B. Ihr Anlass',frage:'z. B. Wie viele Gäste erwarten Sie?',antw:'Bis 50\n50–100\nÜber 100',hinw:'z. B. Wir melden uns mit einem Angebot',antwort:'z. B. Über 200',frei:'Wenn jemand über 100 Gäste wählt, soll der Hinweis kommen: Wir melden uns mit einem Angebot.'};}
/* Wechselnde Beispiele im Feld „In eigenen Worten“ (seit 21.10.2026): alle 10 Sekunden ein anderes, solange das Feld leer ist. Je Branche 30. */
var FREI_L={
kosmetik:['Wenn jemand Allergien hat, frag nach welchen','Bei Wimpern Neuset 20 Minuten mehr einplanen','Neue Leistung: Augenbrauen färben, 15 Minuten, 12 Euro','Wenn Erstbesuch, zeig die Seite mit den Hautfragen','Frag, ob die Kundin schwanger ist','Bei Ja zu Schwangerschaft einen Hinweis zeigen: bitte vorher Arzt fragen','Nageldesign kostet 5 Euro mehr pro Nagel mit Steinchen','Wenn jemand Kontaktlinsen trägt, Hinweis: bitte Brille mitbringen','Neue Frage: Welche Hautart haben Sie? Trocken, fettig, Mischhaut','Wenn Hautart empfindlich, 10 Euro für Spezialpflege dazu','Hinweis unter Wimpern: bitte ohne Mascara kommen','Frag, wann das letzte Auffüllen war','Neue Kachel: Massage mit Hot Stone 60 Minuten, 65 Euro','Wenn jemand Gel-Entfernung wählt, 15 Minuten mehr','Frag nach Wunschfarbe beim Lackieren','Überspring die Hautfragen, wenn es nur um Nägel geht','Bei Microneedling Hinweis: drei Tage vorher kein Peeling','Neue Antwort bei Anlass: Hochzeit','Wenn Hochzeit, frag nach dem Datum','Brautmake-up mit Probetermin kostet 40 Euro mehr','Frag, ob Fotos von Vorher gewünscht sind','Wimpernlifting dauert 50 Minuten statt 45','Ändere den Preis für Pediküre auf 35 Euro','Wenn Diabetes, Hinweis zur medizinischen Fußpflege','Neue Frage: Haben Sie Medikamente genommen?','Wenn ja, frag welche','Bei Waxing Hinweis: Haare mindestens 5 mm lang','Schreib auf der letzten Seite: Wir freuen uns auf Sie','Frag, wie die Kundin von uns erfahren hat','Wenn Gutschein, frag nach der Nummer'],
friseur:['Wenn Bart dazu, 5 Euro mehr','Neue Leistung: Kinderhaarschnitt, 20 Minuten, 15 Euro','Frag, ob die Haare gefärbt sind','Bei langen Haaren 15 Minuten mehr einplanen','Wenn Damen, zeig die Seite zur Haarlänge','Hinweis bei Färben: bitte 48 Stunden vorher Allergietest','Neue Frage: Waschen gewünscht? Ja oder Nein','Wenn Waschen ja, 5 Euro mehr','Überspring die Farbseite bei Herrenschnitt','Fade kostet 5 Euro mehr als klassisch','Frag nach dem Wunsch-Stil mit Foto per WhatsApp','Neue Kachel: Nassrasur 30 Minuten, 25 Euro','Wenn Bart, frag: trimmen oder komplett ab?','Augenbrauen zupfen für 5 Euro als Extra','Hinweis: bitte pünktlich kommen, sonst verkürzt sich der Termin','Ändere die Dauer für Herrenschnitt auf 25 Minuten','Neue Antwort bei Haarlänge: schulterlang','Wenn Hochsteckfrisur, frag nach dem Anlass','Bei Hochzeit Probetermin anbieten','Strähnen dauern 90 Minuten','Frag, ob Locken oder glatt','Wenn Locken, Hinweis: bitte mit trockenem Haar kommen','Neue Frage: Erster Besuch bei uns?','Wenn erster Besuch, 10 Minuten Beratung dazu','Schüler bekommen 3 Euro weniger','Hinweis bei Kindern: bitte mit Elternteil','Haarsystem: frag nach der Größe','Bart färben 15 Minuten, 15 Euro','Schreib auf der letzten Seite: Bis bald im Salon','Wenn Dauerwelle, 2 Stunden einplanen'],
essen:['Wenn Vegetarier dabei sind, frag wie viele','Bei mehr als 100 Gästen zeig die Seite zum Aufbau','Neue Frage: Brauchen Sie Geschirr?','Wenn Geschirr ja, 2 Euro pro Gast mehr','Getränke-Paket kostet 8 Euro pro Gast','Frag nach Allergien in der Gruppe','Überspring die Getränkeseite, wenn nur Essen gewünscht','Hinweis bei Indoor: Wir brauchen einen Stromanschluss','Neue Antwort bei Anlass: Firmenfeier','Wenn Firmenfeier, frag nach Rechnungsadresse','Anfahrt über 50 km kostet 1 Euro pro km','Frag nach Uhrzeit von Beginn und Ende','Wenn länger als 4 Stunden, 150 Euro Aufpreis','Neue Frage: Dessert dazu?','Dessert kostet 4 Euro pro Gast','Frag, ob Personal zum Servieren gebraucht wird','Wenn Servicepersonal, frag wie viele Stunden','Hinweis: Mindestbestellung 50 Gäste','Frag, ob drinnen oder draußen','Wenn draußen, frag ob es ein Zelt gibt','Neue Antwort bei Menü: Halal','Kinder bis 10 Jahre zahlen die Hälfte','Frag nach dem Budget pro Person','Überspring Deko, wenn es ein Food Truck ist','Neue Frage: Wie haben Sie von uns erfahren?','Wenn Hochzeit, zeig die Seite zum Sektempfang','Mitternachtssnack für 6 Euro pro Gast','Hinweis: Wir räumen nach dem Fest selbst auf','Frag nach der Adresse der Feier','Schreib auf der letzten Seite: Wir melden uns innerhalb von 24 Stunden'],
location:['Wenn jemand Hochzeit wählt, zeig die Seite zur Trauung','Bei mehr als 100 Gästen 500 Euro mehr','Neue Frage: Brauchen Sie Übernachtungen?','Wenn Übernachtung, frag wie viele Zimmer','Freie Trauung im Garten kostet 800 Euro','Frag nach dem Wunschdatum und einem Ausweichdatum','Überspring die Menüseite, wenn eigenes Catering','Hinweis: Musik bis 1 Uhr, danach nur leise','Neue Antwort bei Anlass: Geburtstag','Wenn Geburtstag, frag welcher','Samstag kostet 20 Prozent mehr','Frag, ob ein DJ gebraucht wird','Wenn DJ ja, 600 Euro dazu','Neue Frage: Sektempfang draußen?','Frag nach der Zahl der Kinder','Kinder bis 12 Jahre zahlen die Hälfte','Hinweis bei Winter: Kamin inklusive','Wenn Firmenfeier, zeig die Seite zur Technik','Beamer und Leinwand für 150 Euro','Frag nach Deko-Wünschen','Wenn eigene Deko, Hinweis: Aufbau ab 10 Uhr','Neue Antwort bei Gästen: über 200','Frag, ob es ein Budget gibt','Brunch am nächsten Tag für 25 Euro pro Gast','Überspring Trauung, wenn keine Hochzeit','Frag nach Parkplätzen für Busse','Hinweis: Besichtigung nach Termin möglich','Neue Frage: Wie haben Sie von uns erfahren?','Schreib auf der letzten Seite: Wir schicken Ihnen ein Angebot','Wenn Tagung, frag nach der Zahl der Räume']};
function freiListe(){var t=!!(termin()&&cfg.termin),txt=[cfg.branche,cfg.zielgruppe,window.TPL_ID,cfg.name].concat(kats()).join(' '),zg=cfg.zielgruppe||'';
 if(t&&/kosmetik|nagel|wimper|beauty|brauen|haut/i.test(txt))return FREI_L.kosmetik;if(t)return FREI_L.friseur;if(zg==='foodtruck'||zg==='catering')return FREI_L.essen;return FREI_L.location;}
var FREI_I=Math.floor(Math.random()*30);
function freiBsp(){var L=freiListe();return L[FREI_I%L.length];}
setInterval(function(){var ta=D.querySelector('textarea[data-g-frei]');if(!ta||ta.value)return;FREI_I++;ta.classList.add('kz-phw');setTimeout(function(){ta.placeholder='In eigenen Worten, z. B.: '+freiBsp();ta.classList.remove('kz-phw');},300);},10000);
function SCR(){var w=G.was,f=G.f||{},r=['was'];if(!w)return r;if(w==='foto')return['was','foto'];
 switch(w){case'regel':r.push('wenn');if(!G.fix)r.push('dann','wert');break;
 case'frage':r.push('titel','art');if(f.art==='auswahl'||f.art==='mehrfach')r.push('antw');if(!G.fixSeite)r.push('wo');break;
 case'antwort':r.push('frageW','antwT');break;case'leistung':r.push('kachel','leist');break;case'aendern':r.push('leistW','pd');break;
 case'text':r.push('textW','textN');break;case'loeschen':r.push('weg');break;}r.push('ok');return r;}
function scOk(n){var f=G.f||{},q=step(G.frage),tx=function(k){return!!String(f[k]==null?'':f[k]).trim();};switch(n){
 case'was':return!!G.was;case'wenn':return!!q&&(f.antworten||[]).length>0;case'dann':return!!f.dann;
 case'wert':return f.dann==='zeigen'||f.dann==='ueberspringen'?!!f.dannWert:f.dann==='preis'?num(f.dannWert)>0:tx('dannWert');
 case'titel':return tx('titel');case'art':return!!f.art;case'antw':return String(f.antworten||'').split('\n').filter(function(x){return x.trim();}).length>=2;
 case'wo':return G.seite!=null;case'frageW':return!!q;case'antwT':return tx('text');
 case'kachel':return!!G.frage&&(G.frage!=='+neu'||tx('kat'));case'leist':return tx('name')&&num(f.dauer)>0&&num(f.preis)!=null;
 case'leistW':return f.lid!=null&&f.lid!=='';case'pd':return tx('dauer')||tx('preis');
 case'textW':return G.seite==='ende'||(typeof G.seite==='number'&&!!G.frage);case'textN':return tx('neu');
 case'weg':return!!q&&f.ziel!=null&&f.ziel!=='';}return true;}
function scStart(){var L=SCR();for(var i=1;i<L.length;i++){if(L[i]==='ok'||L[i]==='foto'||!scOk(L[i]))return L[i];}return L[L.length-1];}
function scAkt(){var L=SCR();if(!G.sc||L.indexOf(G.sc)<0)G.sc=G.was?scStart():'was';return G.sc;}
function scVor(){var L=SCR(),i=L.indexOf(scAkt());G.sc=L[Math.min(L.length-1,i+1)];rKi();kiOben();}
function scZur(){var L=SCR(),i=L.indexOf(scAkt());if(i>0)G.sc=L[i-1];rKi();kiOben();}
function asGo(){var n=scAkt();if(n==='ok'){uebernehmen();return;}if(n==='foto'){fotoUebernehmen();return;}if(scOk(n))scVor();}
function asWas(x){var w=x.getAttribute('data-as-was'),wn=x.getAttribute('data-warum');if(wn){toastK(wn,true);return;}var fr=G.frei,vs=G.seite;G=leerG();G.frei=fr;G.was=w;G.f=std(w);
 if(w==='frage'&&typeof vs==='number'&&S()[vs]&&!zuP(vs)&&!istTerminSeite(S()[vs])){G.seite=vs;G.fixSeite=true;}pruefG();G.sc=scStart();rKi();kiOben();}
function inpA(k,ph,o){o=o||{};var v=G.f[k]==null?'':G.f[k];return'<span class="kz-mic kz-as-big">'+(o.ta?'<textarea data-g="'+k+'" rows="4" placeholder="'+e(ph||'')+'">'+e(v)+'</textarea>':'<input data-g="'+k+'" value="'+e(v)+'" placeholder="'+e(ph||'')+'" autocomplete="off">')+'<button type="button" class="kz-micb" data-mic="'+k+'" aria-label="Diktieren">'+IC.mic+'</button></span>';}
function zahlA(k,ph,ein){return'<label class="kz-as-in"><input data-g="'+k+'" inputmode="decimal" value="'+e(G.f[k]==null?'':G.f[k])+'" placeholder="'+e(ph==null?'0':ph)+'"><span>'+ein+'</span></label>';}
function kachelA(a){return'<div class="kz-tiles">'+a.map(function(x){return'<button type="button" class="kz-tile'+(x[3]?' an':'')+(x[4]?' nein':'')+'" '+x[0]+(x[4]?' data-warum="'+e(x[4])+'"':'')+'>'+x[2]+'<b>'+e(x[1])+'</b></button>';}).join('')+'</div>';}
function zeileA(attr,t,klein,an,aus){return'<button type="button" class="kz-row'+(an?' an':'')+'" '+attr+(aus?' disabled':'')+'><b>'+e(t)+'</b>'+(klein?'<small>'+e(klein)+'</small>':'')+'</button>';}
function quellenAlle(){var r=[],lim=G.fix&&typeof G.zielPi==='number'?G.zielPi:1e9;S().forEach(function(p,i){if(i>=lim)return;p.fragen.forEach(function(s){if((typ(s)==='auswahl'||s.typ==='termin')&&labels(s).length)r.push(s);});});return r;}
function chipA(s,v,t){var on=G.frage===s.key&&(G.f.antworten||[]).indexOf(v)>=0;return'<button type="button" class="kz-chip'+(on?' an':'')+'" data-as-ant="'+e(v)+'" data-q="'+e(s.key)+'" aria-pressed="'+on+'">'+e(t)+'</button>';}
function scWas(){var h='';
 if(KI_FREI)h+='<div class="kz-as-frei"><span class="kz-mic kz-as-big"><textarea data-g-frei="1" rows="2" aria-label="In eigenen Worten" placeholder="In eigenen Worten, z. B.: '+e(freiBsp())+'">'+e(G.frei)+'</textarea><button type="button" class="kz-micb" data-mic="frei" aria-label="Diktieren">'+IC.mic+'</button></span><button type="button" class="kz-btn" id="kz-kifrei" data-kz="ki-frei">'+IC.spark+'Los</button></div>';
 if(KI_FREI&&termin()&&cfg.termin)h+='<button type="button" class="kz-tile kz-tfoto" data-kz="foto"'+(G.laedt?' disabled':'')+'>'+sv(PI.foto)+'<b>'+(G.laedt?'Die KI liest die Preisliste …':'Preisliste fotografieren')+'</b></button>';
 return h+kachelA(WK.filter(function(w){return wasListe().indexOf(w[0])>=0;}).map(function(w){return['data-as-was="'+w[0]+'"',w[1],w[2],G.was===w[0],warumNicht(w[0])];}));}
function scWenn(){var Q=quellenAlle(),f=G.f,h='';
 if(G.fix){var zz=zielAus(f.dannWert);if(zz)h+='<p class="kz-klein">Dann erscheint '+e(zielName(zz))+'. Sonst nicht.</p>';}
 if(!Q.length)return h+'<p class="kz-warn">Dafür braucht es vorher eine Frage mit Antworten zum Antippen.</p><button type="button" class="kz-btn2" data-as-was="frage">'+IC.plus+'Neue Frage anlegen</button>';
 Q.forEach(function(s){h+='<div class="kz-as-q"><span class="kz-subl">'+e(s.typ==='termin'?'Gewählte Behandlung':qn(s))+'</span><div class="kz-chips">';
  if(s.typ==='termin'){kats().forEach(function(k){h+=chipA(s,'kat:'+k,k);});h+='</div>';var ein=G.frage===s.key&&(f.antworten||[]).some(function(x){return x.indexOf('kat:')!==0;});
   h+='<details class="kz-as-l"'+(ein?' open':'')+'><summary>Einzelne Leistung</summary><div class="kz-chips">'+leist().filter(function(l){return l.name;}).map(function(l){return chipA(s,l.name,l.name);}).join('')+'</div></details>';}
  else h+=labels(s).map(function(l){return chipA(s,l,l);}).join('')+'</div>';
  h+='</div>';});return h;}
function scDann(){var q=step(G.frage),tm=q&&q.typ==='termin',zl=q?zieleNach(q).filter(function(z){return!z[2];}):[],kein=zl.length?'':'Danach kommt keine Seite mehr. Legen Sie zuerst eine neue Seite an.';
 var a=[['data-as-dann="zeigen"','Seite zeigen',sv(PI.auge),f0('zeigen'),kein],['data-as-dann="hinweis"','Hinweis zeigen',sv(PI.info),f0('hinweis'),'']];
 if(!tm)a.push(['data-as-dann="preis"','Aufpreis',sv(PI.euro),f0('preis'),'']);a.push(['data-as-dann="ueberspringen"','Seite überspringen',sv(PI.skip),f0('ueberspringen'),kein]);return kachelA(a);
 function f0(d){return G.f.dann===d;}}
function scWert(){var f=G.f,q=step(G.frage),d=f.dann;
 if(d==='zeigen'||d==='ueberspringen')return'<div class="kz-rows">'+(q?zieleNach(q):[]).map(function(z){return zeileA('data-as-wert="'+e(z[0])+'"',z[1],z[2]?'gesperrt':'',f.dannWert===z[0],z[2]);}).join('')+'</div>';
 if(d==='preis')return zahlA('dannWert','0','€')+'<div class="kz-chips">'+[5,10,20,30,50].map(function(n){return'<button type="button" class="kz-chip'+(num(f.dannWert)===n?' an':'')+'" data-as-set="dannWert" data-v="'+n+'">+ '+n+' €</button>';}).join('')+'</div>';
 return inpA('dannWert',BSP().hinw);}
function seitenA(fn){var h='';S().forEach(function(p,i){if(zuP(i)||!fn(p,i))return;h+=zeileA('data-as-seite="'+i+'"',pLab(p,i),p.fragen.length+(p.fragen.length===1?' Frage':' Fragen'),G.seite===i,false);});return h;}
function fragenA(k,attr){var h='';S().forEach(function(p,i){if(zuP(i))return;p.fragen.forEach(function(s){if(!passtQ(s,k))return;h+=zeileA(attr+'="'+e(s.key)+'"',qn(s),pLab(p,i),G.frage===s.key,false);});});return h||'<p class="kz-warn">Dafür gibt es noch keine passende Frage.</p>';}
function scBody(n){var f=G.f,h;switch(n){
 case'was':return scWas();case'wenn':return scWenn();case'dann':return scDann();case'wert':return scWert();
 case'titel':return inpA('titel',BSP().frage);
 case'art':return kachelA([['data-as-art="auswahl"','Eine antippen',sv(PI.eins),f.art==='auswahl'],['data-as-art="mehrfach"','Mehrere antippen',sv(PI.mehr),f.art==='mehrfach'],['data-as-art="text"','Selbst schreiben',sv(PI.stift),f.art==='text'],['data-as-art="datum"','Datum',sv(PI.kal),f.art==='datum']]);
 case'antw':return'<p class="kz-klein">Eine pro Zeile.</p>'+inpA('antworten',BSP().antw,{ta:1});
 case'wo':h='<div class="kz-rows">'+seitenA(function(p){return!istTerminSeite(p);})+zeileA('data-as-seite="neu"','+ Neue Seite','',G.seite==='neu',false)+'</div>';return h+(G.seite==='neu'?'<span class="kz-subl">Überschrift, freiwillig</span>'+inpA('seitentitel',BSP().seite):'');
 case'frageW':return'<div class="kz-rows">'+fragenA('antwort','data-as-q')+'</div>';
 case'antwT':return inpA('text',BSP().antwort)+'<span class="kz-subl">Aufpreis, freiwillig</span>'+zahlA('preis','0','€');
 case'kachel':return'<div class="kz-rows">'+kats().map(function(k){var nk=leist().filter(function(l){return(l.kat||'Leistungen')===k;}).length;return zeileA('data-as-kat="'+e(k)+'"',k,nk+(nk===1?' Leistung':' Leistungen'),G.frage===k,false);}).join('')+zeileA('data-as-kat="+neu"','+ Neue Kachel','',G.frage==='+neu',false)+'</div>'+(G.frage==='+neu'?inpA('kat',BSP().kat||'Name der Kachel'):'');
 case'leist':return inpA('name',BSP().leist||'Name der Leistung')+'<span class="kz-subl">Dauer</span><div class="kz-chips">'+[15,30,45,60,90,120].map(function(m){return'<button type="button" class="kz-chip'+(num(f.dauer)===m?' an':'')+'" data-as-set="dauer" data-v="'+m+'">'+dz(m)+'</button>';}).join('')+'</div><span class="kz-subl">Preis</span>'+zahlA('preis','0','€');
 case'leistW':h='';var lk=null;leist().forEach(function(l,i){var k=l.kat||'Leistungen';if(k!==lk){lk=k;h+='<span class="kz-subl">'+e(k)+'</span>';}h+=zeileA('data-as-lid="'+i+'"',l.name||'Ohne Namen',dz(l.dauer)+(l.preis!=null&&l.preis!==''?' · '+(l.ab?'ab ':'')+eur(l.preis):''),String(f.lid)===String(i),false);});return'<div class="kz-rows">'+h+'</div>';
 case'pd':var l0=leist()[+f.lid]||{};return'<p class="kz-klein">'+e(l0.name||'')+'</p><span class="kz-subl">Dauer</span>'+zahlA('dauer',l0.dauer||'30','Min.')+'<span class="kz-subl">Preis</span>'+zahlA('preis',l0.preis==null?'0':l0.preis,'€');
 case'textW':h='';S().forEach(function(p,i){if(zuP(i))return;h+=zeileA('data-as-titel="'+i+'"','Überschrift: '+(String(p.titel||'').trim()||'(leer)'),pLab(p,i),G.seite===i&&G.frage==='titel',false);p.fragen.forEach(function(s){if(passtQ(s,'text'))h+=zeileA('data-as-q="'+e(s.key)+'"',qn(s),pLab(p,i),G.frage===s.key,false);});});if(!zuX('ende'))h+=zeileA('data-as-titel="ende"','Überschrift der letzten Seite','',G.seite==='ende',false);return'<div class="kz-rows">'+h+'</div>';
 case'textN':return inpA('neu','');
 case'weg':h='';S().forEach(function(p,i){if(zuP(i))return;p.fragen.forEach(function(s){if(!passtQ(s,'loeschen'))return;h+='<div class="kz-as-q">'+zeileA('data-as-weg="'+e(s.key)+'|ganz"',qn(s),'Ganze Frage löschen',G.frage===s.key&&f.ziel==='ganz',false);if(labels(s).length>1)h+='<div class="kz-chips">'+(s.optionen||[]).map(function(o,j){return'<button type="button" class="kz-chip" data-as-weg="'+e(s.key)+'|'+j+'">× '+e(o.label||'leer')+'</button>';}).join('')+'</div>';h+='</div>';});});return h||'<p class="kz-warn">Es gibt keine offene Frage zum Löschen.</p>';
 case'ok':pruefG();var p=plan();return p.F.length?'<p class="kz-warn">Es fehlt noch: '+e(p.F.join(', '))+'</p>':'<div class="kz-vs"><ul>'+p.Z.map(function(z){return'<li>'+e(z)+'</li>';}).join('')+'</ul><p class="kz-klein">Rückgängig geht jederzeit.</p></div>';
 case'foto':h='<p class="kz-klein">Antippen nimmt eine Leistung heraus.</p><div class="kz-rows">';var fk=null;(G.foto||[]).forEach(function(o,i){if(o.kat!==fk){fk=o.kat;h+='<span class="kz-subl">'+e(o.kat)+'</span>';}h+='<button type="button" class="kz-row kz-fz'+(o.aus?' aus':' an')+'" data-as-foto="'+i+'" aria-pressed="'+!o.aus+'"><i>'+(o.aus?'':IC.ok)+'</i><b>'+e(o.name)+'</b><small>'+dz(o.dauer)+' · '+(o.preis==null?'ohne Preis':(o.ab?'ab ':'')+eur(o.preis))+(o.doppelt?' · gibt es schon':'')+'</small></button>';});return h+'</div>';}return'';}
function rKi(){var d=$('kz-dock');if(!d)return;var voll=U.dock||!breit();d.className=voll?'auf':'';D.body.classList.toggle('kz-chat',!!(U.dock&&breit()));
 if(!voll){d.innerHTML='<button type="button" class="kz-dbar" data-kz="dock-auf"><span class="kz-spk">'+IC.spark+'</span><span class="kz-dbt"><b>Architekt</b><small>Was möchten Sie ändern?</small></span><span class="kz-btn">Los</span></button>';return;}
 if(G.was!=='foto')pruefG();var zu=breit()?'<button type="button" class="kz-ic" data-kz="dock-zu" aria-label="Architekt schließen">'+IC.x+'</button>':'',h,fuss='';
 if(G.fertig){h='<div class="kz-okk"><h4>'+IC.ok+'Erledigt</h4><ul>'+G.fertig.Z.map(function(z){return'<li>'+e(z)+'</li>';}).join('')+'</ul><div class="kz-vsf"><button type="button" class="kz-btn2" data-kz="ki-ansehen">Ansehen</button><button type="button" class="kz-btn2" data-kz="ki-undo">'+IC.undo+'Rückgängig</button></div></div>';
  fuss='<button type="button" class="kz-btn gross" data-kz="ki-leer">Noch etwas ändern</button>';d.innerHTML='<div class="kz-ki"><div class="kz-kik"><span class="kz-spk">'+IC.spark+'</span><div><b>Architekt</b></div><span class="kz-sp"></span>'+zu+'</div><div class="kz-kib">'+h+'</div><div class="kz-kif">'+fuss+'</div></div>';chatDeko(d);return;}
 var n=scAkt(),L=SCR(),ix=L.indexOf(n),T={was:'Was möchten Sie tun?',wenn:'Wenn der Kunde das wählt …',dann:'… was passiert dann?',titel:'Wie lautet die Frage?',art:'Wie wird geantwortet?',antw:'Welche Antworten?',wo:'Auf welche Seite?',frageW:'Bei welcher Frage?',antwT:'Neue Antwort',kachel:'In welche Kachel?',leist:'Neue Leistung',leistW:'Welche Leistung?',pd:'Neue Dauer oder neuer Preis',textW:'Welcher Text?',textN:'Neuer Text',weg:'Was soll weg?',ok:'Passt das so?',foto:'Erkannte Leistungen'};
 var tt=n==='wert'?({zeigen:'Welche Seite zeigen?',ueberspringen:'Welche Seite überspringen?',preis:'Wie viel mehr?',hinweis:'Welcher Hinweis?'}[G.f.dann]||'Welche Seite?'):T[n];
 var weiter={wenn:1,wert:G.f.dann==='preis'||G.f.dann==='hinweis',titel:1,antw:1,antwT:1,leist:1,pd:1,textN:1,wo:G.seite==='neu',kachel:G.frage==='+neu'}[n];
 if(n==='ok')fuss='<button type="button" class="kz-btn gross" id="kz-asgo" data-kz="as-go">'+IC.ok+'Übernehmen</button>';else if(n==='foto')fuss='<button type="button" class="kz-btn gross" id="kz-asgo" data-kz="as-go">'+IC.ok+'Übernehmen</button>';else if(weiter)fuss='<button type="button" class="kz-btn gross" id="kz-asgo" data-kz="as-go">Weiter</button>';
 d.innerHTML='<div class="kz-ki"><div class="kz-kik">'+(ix>0?'<button type="button" class="kz-ic kz-asz" data-kz="as-zur" aria-label="Zurück">'+sv(PI.zur)+'</button>':'<span class="kz-spk">'+IC.spark+'</span>')+'<div><b>Architekt</b>'+(ix>0?'<small>'+e(wt(G.was))+(L.length>2?' · '+ix+' von '+(L.length-1):'')+'</small>':'')+'</div><span class="kz-sp"></span>'+zu+'</div><div class="kz-kib"><h3 class="kz-ash">'+e(tt)+'</h3>'+scBody(n)+'</div>'+(fuss?'<div class="kz-kif">'+fuss+'</div>':'')+'</div>';chatDeko(d);updKi();}
function rDet(){rKi();}
/* Seiten in der Liste ziehen (seit 21.10.2026). Gesperrte Seiten und der feste Schluss bleiben stehen. */
(function(){var von=null;function pi(el){var b=el&&el.closest&&el.closest('#kz-list [data-go^="seite:"]');return b?+b.getAttribute('data-go').split(':')[1]:null;}
 D.addEventListener('dragstart',function(ev){var i=pi(ev.target);if(i==null||zuP(i))return;von=i;ev.dataTransfer.effectAllowed='move';try{ev.dataTransfer.setData('text/plain',String(i));}catch(x){}ev.target.closest('.kz-fl').classList.add('kz-zieht');});
 D.addEventListener('dragover',function(ev){if(von==null)return;var i=pi(ev.target);if(i==null)return;ev.preventDefault();qa('#kz-list .kz-ziel').forEach(function(x){x.classList.remove('kz-ziel');});ev.target.closest('.kz-fl').classList.add('kz-ziel');});
 D.addEventListener('dragend',function(){von=null;qa('#kz-list .kz-zieht,#kz-list .kz-ziel').forEach(function(x){x.classList.remove('kz-zieht','kz-ziel');});});
 D.addEventListener('drop',function(ev){if(von==null)return;var z=pi(ev.target);ev.preventDefault();var a=von;von=null;if(z==null||z===a||zuP(z))return alles();var r=a<z?1:-1;for(var i=a;i!==z;i+=r)seiteSchieben(i,r);geh('seite:'+z);toastK('Seite verschoben. Rückgängig geht jederzeit.');});
 new MutationObserver(function(){qa('#kz-list [data-go^="seite:"]').forEach(function(b){var i=+b.getAttribute('data-go').split(':')[1];if(!zuP(i)){b.draggable=true;b.title='Ziehen zum Verschieben';}});}).observe(D.documentElement,{childList:true,subtree:true});})();
/* Architekt als Chat (seit 21.10.2026, nur Computer): Verlauf oben, Eingabe unten, rechts das Formular. Der aktuelle Schritt steht als letzte Nachricht. */
var CHAT=[];
function chatAn(){return!!(U.dock&&breit());}
function sag(m,err){G.laedtKI=false;if(chatAn()){CHAT.push({w:'ki',t:m,err:!!err});rKi();chatUnten();}else toastK(m,err);}
function chatUnten(){setTimeout(function(){var kb=D.querySelector('#kz-dock .kz-kib');if(kb)kb.scrollTop=kb.scrollHeight;},30);}
function chatDeko(d){if(!chatAn())return;var kb=d.querySelector('.kz-kib');if(!kb)return;
 var log='<div class="kz-cm ki"><p>Hallo! Schreiben Sie unten in eigenen Worten, was sich ändern soll. Zum Beispiel: „'+e(freiBsp())+'“. Oder wählen Sie hier:</p></div>';
 CHAT.forEach(function(m,i){log+='<div class="kz-cm '+m.w+(m.err?' err':'')+'"><p>'+e(m.t)+'</p>'+(m.undo&&i===CHAT.length-1?'<button type="button" class="kz-lnk" data-kz="chat-undo">'+IC.undo+'Rückgängig</button>':'')+'</div>';});
 var schritt='<div class="kz-cm ki kz-cstep">'+kb.innerHTML+'</div>';kb.innerHTML=log+(G.laedtKI?'<div class="kz-cm ki"><p class="kz-tipp"><i></i><i></i><i></i></p></div>':schritt);
 var zb=d.querySelector('.kz-kik [data-kz=dock-zu]');if(zb){zb.className='kz-btn2 sm kz-hand';zb.innerHTML=IC.list+'Von Hand bearbeiten';}var ki=d.querySelector('.kz-ki'),alt=d.querySelector('.kz-kif');if(alt)kb.querySelector('.kz-cstep')&&kb.querySelector('.kz-cstep').appendChild(alt);
 var c=D.createElement('div');c.className='kz-ceing';c.innerHTML=KI_FREI?'<textarea id="kz-chatin" data-g-frei="1" rows="2" placeholder="Was soll sich ändern?">'+e(G.frei||'')+'</textarea><button type="button" class="kz-btn" id="kz-kifrei" data-kz="chat-senden" aria-label="Senden">'+IC.hoch+'</button>':'<p class="kz-klein">Wählen Sie oben, was Sie tun möchten.</p>';ki.appendChild(c);chatUnten();}
function chatSenden(){var t=String(G.frei||'').trim();if(t.length<6){sag('Bitte beschreiben Sie kurz, was passieren soll.',true);return;}CHAT.push({w:'du',t:t});G.laedtKI=true;rKi();kiFrei();G.frei='';}
D.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&!ev.shiftKey&&ev.target&&ev.target.id==='kz-chatin'){ev.preventDefault();chatSenden();}});
function updKi(){var b=$('kz-asgo');if(!b||G.fertig)return;var n=scAkt();b.disabled=n==='ok'?!!plan().F.length:n==='foto'?!(G.foto||[]).some(function(o){return!o.aus;}):!scOk(n);}
function kiOben(){var kb=D.querySelector('#kz-dock .kz-kib');if(breit()){if(kb)kb.scrollTop=0;}else window.scrollTo(0,0);}
D.addEventListener('keydown',function(ev){var t=ev.target;if(ev.key==='Enter'&&t&&t.matches&&t.matches('#kz-dock input[data-g]')){var b=$('kz-asgo');ev.preventDefault();if(b&&!b.disabled)b.click();}});
/* Preisliste fotografieren (nur mit KI): Bild verkleinern, an /api/architekt, erkannte Leistungen prüfen und übernehmen. ?ki=beispiel zeigt ein Beispiel ohne Server. */
var FOTO_BSP=[{kat:'Haare',name:'Herrenhaarschnitt',dauer:30,preis:25},{kat:'Haare',name:'Maschinenschnitt',dauer:20,preis:18},{kat:'Haare',name:'Kinderhaarschnitt bis 12 Jahre',dauer:20,preis:15},{kat:'Bart',name:'Bart trimmen',dauer:15,preis:12},{kat:'Bart',name:'Nassrasur mit heißem Tuch',dauer:30,preis:22},{kat:'Kombi',name:'Haarschnitt und Bart',dauer:45,preis:35}];
function fotoWaehlen(){var i=D.createElement('input');i.type='file';i.accept='image/*';i.onchange=function(){var fl=i.files&&i.files[0];if(fl)fotoLesen(fl);};i.click();}
function fotoLesen(fl){var r=new FileReader();r.onload=function(){var img=new Image();img.onload=function(){var m=1600,s=Math.min(1,m/Math.max(img.width,img.height)),c=D.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);fotoSenden(c.toDataURL('image/jpeg',.82));};img.onerror=function(){toastK('Das Bild ließ sich nicht öffnen.',true);};img.src=r.result;};r.readAsDataURL(fl);}
function fotoSenden(b64){G.laedt=true;rKi();if(/[?&]ki=beispiel/.test(location.search)){setTimeout(function(){G.laedt=false;fotoErgebnis(FOTO_BSP);},900);return;}
 if(window.CZ_KI_LOKAL){CZ_KI_LOKAL({bild:b64}).then(function(j){G.laedt=false;if(j&&j.ok){fotoErgebnis(j.leistungen);return;}rKi();toastK((j&&j.hinweis)||'Keine Leistungen gefunden.',true);},function(){G.laedt=false;rKi();toastK('Die KI hat gerade nicht geantwortet.',true);});return;}
 var tok=(window.czApp&&czApp.token&&czApp.token())||'';if(!tok){G.laedt=false;rKi();toastK('Für die KI bitte anmelden.',true);return;}var api=(typeof API==='string'&&API)||'https://clickzauber-api.vercel.app/api';
 fetch(api+'/architekt?token='+encodeURIComponent(tok),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bild:b64})}).then(function(r){return r.json().catch(function(){return{ok:false};});})
 .then(function(j){G.laedt=false;if(j&&j.ok&&Array.isArray(j.leistungen)&&j.leistungen.length){fotoErgebnis(j.leistungen);return;}rKi();toastK((j&&j.hinweis)||'Auf dem Foto habe ich keine Leistungen gefunden.',true);})
 .catch(function(){G.laedt=false;rKi();toastK('Keine Verbindung zur KI.',true);});}
function fotoErgebnis(L){var fr=G.frei,da={};leist().forEach(function(l){da[(l.kat||'Leistungen')+'|'+String(l.name||'').toLowerCase()]=1;});G=leerG();G.frei=fr;G.was='foto';G.sc='foto';
 G.foto=L.slice(0,40).map(function(x){var o={kat:String(x.kat||'Leistungen').slice(0,60),name:String(x.name||'').trim().slice(0,80),dauer:Math.max(5,Math.min(480,Math.round((+x.dauer||30)/5)*5)),preis:x.preis==null||x.preis===''||isNaN(+x.preis)?null:Math.max(0,+x.preis),ab:!!x.ab};o.doppelt=!!da[o.kat+'|'+o.name.toLowerCase()];o.aus=o.doppelt;return o;}).filter(function(o){return o.name;});rKi();kiOben();}
function fotoUebernehmen(){var L=(G.foto||[]).filter(function(o){return!o.aus;});if(!L.length||!cfg.termin)return;if(leist().length+L.length>30){toastK('Höchstens 30 Leistungen. Bitte ein paar herausnehmen.',true);return;}
 kzMerk();if(!Array.isArray(cfg.termin.leistungen))cfg.termin.leistungen=[];var A=cfg.termin.leistungen;L.forEach(function(o){var l={name:o.name,kat:o.kat,dauer:o.dauer,preis:o.preis==null?0:o.preis},pos=A.length;if(o.ab)l.ab=true;for(var i=A.length-1;i>=0;i--){if((A[i].kat||'Leistungen')===o.kat){pos=i+1;break;}}A.splice(pos,0,l);});
 var t=termin(),fr=G.frei;G=leerG();G.frei=fr;G.fertig={Z:[L.length+(L.length===1?' Leistung':' Leistungen')+' übernommen'].concat(L.some(function(o){return o.preis==null;})?['Bei Leistungen ohne Preis steht 0 €. Bitte nachtragen.']:[]),z:{v:t?'seite:'+pVon(t.key):'seite:0',el:t?'q:'+t.key:null}};
 toastK('Übernommen. Rückgängig geht jederzeit.');renderSteps();alles();puls();kiOben();}
function uebernehmen(){var p=plan();if(p.F.length||!p.fn)return;kzMerk();var z;try{z=p.fn()||{};}catch(x){HIST.pop();toastK('Das ging nicht. Es wurde nichts geändert.',true);return;}
 /* Seit 21.10.2026: Nach dem Übernehmen geht es direkt zur neuen oder geänderten Stelle, der Architekt ist beim nächsten Öffnen wieder leer. So baut man Stück für Stück. */
 if(z.v){var w0=G.was;G=leerG();toastK(w0==='loeschen'?'Gelöscht. Rückgängig geht jederzeit.':'Übernommen. Hier ist es. Rückgängig geht jederzeit.');renderSteps();if(chatAn()){CHAT.push({w:'ki',t:(w0==='loeschen'?'Gelöscht.':'Erledigt. Rechts sehen Sie es schon.')+' Rückgängig geht jederzeit.',undo:1});U.view=z.v;alles();puls();chatUnten();return;}if(breit())U.dock=false;else U.tab='seiten';geh(z.v);puls();blink(z.el);if(z.li!=null)blinkL(z.li);return;}
 if(chatAn()){G=leerG();CHAT.push({w:'ki',t:'Erledigt: '+p.Z.join(' · '),undo:1});renderSteps();alles();puls();chatUnten();return;}G=leerG();G.fertig={Z:p.Z,z:z};toastK('Übernommen. Rückgängig geht jederzeit.');renderSteps();alles();puls();kiOben();}
/* Die neue oder geänderte Leistung selbst aufleuchten lassen und hinscrollen (nach blink, das die ganze Termin-Frage zeigt). */
function blinkL(i){setTimeout(function(){var r=D.querySelector('[oninput^="setTmL('+(+i)+',"]');r=r&&r.closest('.tma-r');if(!r)return;r.classList.remove('kz-blink');void r.offsetWidth;r.classList.add('kz-blink');if(breit()){var c=$('kz-main');if(c&&c.contains(r))c.scrollTop+=r.getBoundingClientRect().top-c.getBoundingClientRect().top-80;}else window.scrollTo(0,r.getBoundingClientRect().top+window.pageYOffset-140);},220);}
function kiVon(sp){var p=String(sp).split(':'),fr=G.frei;VOR=null;G=leerG();G.frei=fr;
 if(p[0]==='seite')G.seite=+p[1];
 else if(p[0]==='regel'){G.was='regel';G.f=std('regel');if(p.length>1){var s=step(p.slice(1).join(':'));if(s){G.seite=pVon(s.key);G.frage=s.key;}}}
 else if(p[0]==='zeig'){var zp=+p[1];G.was='regel';G.f={antworten:[],dann:'zeigen',dannWert:'p:'+zp};G.fix=true;G.zielPi=zp;}
 G.sc=null;if(breit()){U.dock=true;rKi();kiOben();}else tab('ki');}
function kontext(){return{seiten:S().map(function(p,i){return{nr:i+1,titel:pTitel(p,i),gesperrt:zuP(i),fragen:p.fragen.map(function(s){return{key:s.key,frage:String(s.frage||'').slice(0,160),typ:typ(s),antworten:labels(s).slice(0,30)};})};}),kacheln:kats(),leistungen:leist().slice(0,30).map(function(l,i){return{nr:i,name:String(l.name||'').slice(0,80),kat:l.kat||'',dauer:+l.dauer||0,preis:l.preis==null||l.preis===''?null:+l.preis||0};}),was:wasListe(),letzteSeiteGesperrt:zuX('ende')};}
function uebernehmeKI(a){if(!a||!WAS[a.was]||wasListe().indexOf(a.was)<0)return false;var n={was:a.was,seite:null,frage:null,f:std(a.was),frei:G.frei},P=S(),f=a.f&&typeof a.f==='object'?a.f:{};
 if(a.seite==='ende'&&a.was==='text')n.seite='ende';else{var s=parseInt(a.seite,10);if(s>=1&&s<=P.length)n.seite=s-1;}
 var fr=a.frage==null?'':String(a.frage);if(fr==='titel'||fr==='+neu'||step(fr)||kats().indexOf(fr)>=0)n.frage=fr;
 Object.keys(f).forEach(function(k){if(['seitentitel','titel','art','antworten','pflicht','text','preis','info','dann','dannWert','kat','name','dauer','ab','lid','neu','ziel'].indexOf(k)<0||f[k]==null)return;n.f[k]=Array.isArray(f[k])?f[k].map(String):String(f[k]).slice(0,400);});
 if(a.was==='frage'&&Array.isArray(f.antworten))n.f.antworten=f.antworten.map(String).join('\n');
 if((a.was==='leistung'||a.was==='aendern')&&num(n.f.dauer))n.f.dauer=String(Math.max(5,Math.min(480,Math.round(num(n.f.dauer)/5)*5)));
 if(a.was==='regel'){var q=step(n.frage);n.f.antworten=(Array.isArray(f.antworten)?f.antworten:[]).map(String).filter(function(l){return!!q&&labels(q).indexOf(l)>=0;});var mp=String(n.f.dannWert||'').match(/^p:(\d+)$/);if(mp)n.f.dannWert='p:'+(parseInt(mp[1],10)-1);}
 if(a.was==='loeschen')n.f.sicher='1';
 if(a.was==='leistung'&&n.frage==='+neu'&&!String(n.f.kat||'').trim()&&kats().length===1)n.frage=kats()[0];
 if(a.was==='leistung'&&!n.frage&&kats().length===1)n.frage=kats()[0];
 G=n;VOR=null;G.sc=null;
 /* Seit 21.10.2026: Ist alles ausgefüllt, gleich die Vorschau mit „Übernehmen“ zeigen statt jeder einzelnen Frage. */
 try{pruefG();if(SCR().indexOf('ok')>=0&&!plan().F.length)G.sc='ok';}catch(x){}
 return true;}
function kiFrei(){var t=String(G.frei||'').trim();if(t.length<6){sag('Bitte beschreiben Sie kurz, was passieren soll.',true);return;}var tok=(window.czApp&&czApp.token&&czApp.token())||'';
 var b=$('kz-kifrei');function fertig(){var b2=$('kz-kifrei');if(b2){b2.disabled=false;b2.innerHTML=IC.spark+'Los';}}
 if(window.CZ_KI_LOKAL){if(b){b.disabled=true;b.textContent='Die KI liest …';}CZ_KI_LOKAL({text:t,formular:kontext()}).then(function(j){if(j&&j.ok&&uebernehmeKI(j.auftrag)){rKi();sag(G.sc==='ok'?'Fertig. Bitte prüfen und „Übernehmen“ drücken.':'Fast fertig. Bitte noch ergänzen, was fehlt.');return;}sag((j&&j.hinweis)||'Das habe ich nicht verstanden.',true);},function(){sag('Die KI hat gerade nicht geantwortet.',true);}).then(fertig);return;}
 if(!tok){sag('Für die KI bitte anmelden. Die drei Felder gehen auch so.',true);return;}if(b){b.disabled=true;b.textContent='Die KI liest …';}var api=(typeof API==='string'&&API)||'https://clickzauber-api.vercel.app/api';
 fetch(api+'/architekt?token='+encodeURIComponent(tok),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t.slice(0,800),formular:kontext()})})
 .then(function(r){return r.json().catch(function(){return{ok:false};});})
 .then(function(j){if(j&&j.ok&&j.auftrag&&uebernehmeKI(j.auftrag)){rKi();sag(G.sc==='ok'?'Fertig. Bitte prüfen und „Übernehmen“ drücken.':'Fast fertig. Bitte noch ergänzen, was fehlt.');return;}sag((j&&j.hinweis)||'Der KI-Helfer ist noch nicht eingeschaltet. Die drei Felder gehen schon.',true);})
 .catch(function(){sag('Keine Verbindung zur KI. Die drei Felder gehen auch ohne.',true);})
 .then(function(){var b2=$('kz-kifrei');if(b2){b2.disabled=false;b2.innerHTML=IC.spark+'Los';}});}
function diktat(b){var k=b.getAttribute('data-mic'),inp=b.parentNode.querySelector('input,textarea'),SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!inp)return;
 if(!SR){toastK('Diktieren: am Handy das Mikrofon auf der Tastatur antippen.');inp.focus();return;}
 try{var r=new SR();r.lang='de-DE';r.interimResults=false;r.onresult=function(ev){var t=ev.results[0][0].transcript;inp.value=(inp.value?inp.value+' ':'')+t;if(k==='frei')G.frei=inp.value;else{G.f[k]=inp.value;updKi();}};r.onerror=function(){toastK('Diktieren hat nicht geklappt.',true);};r.start();toastK('Ich höre zu …');}catch(x){toastK('Diktieren geht hier nicht.',true);}}
function logoFarbe(){var src=cfg.theme&&cfg.theme.logo;if(!src){toastK('Bitte zuerst ein Logo hochladen.',true);return;}var img=new Image();if(/^https?:/i.test(src)&&src.indexOf(location.origin)!==0)img.crossOrigin='anonymous';
 img.onload=function(){try{var c=D.createElement('canvas');c.width=c.height=48;var x=c.getContext('2d');x.drawImage(img,0,0,48,48);var d=x.getImageData(0,0,48,48).data,cnt={};for(var i=0;i<d.length;i+=4){if(d[i+3]<128)continue;var r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<50||mx<50)continue;var k=(r>>4)+','+(g>>4)+','+(b>>4);cnt[k]=(cnt[k]||0)+1;}
  var ks=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});if(!ks.length){toastK('Im Logo ist keine kräftige Farbe. Bitte unter „Aussehen wählen“ eine Farbe nehmen.',true);return;}
  var hex='#'+ks[0].split(',').map(function(v){var h=((+v<<4)+8).toString(16);return h.length<2?'0'+h:h;}).join('');kzMerk();cfg.theme=cfg.theme||{};cfg.theme.accent=hex;if(cfg.theme.eigen)delete cfg.theme.eigen.knopf;try{entwurfSichern();}catch(y){}DIRTY.vor=true;alles();puls();toastK('Farbe aus dem Logo übernommen.');}catch(y){toastK('Das Logo ließ sich hier nicht lesen.',true);}};
 img.onerror=function(){toastK('Logo nicht gefunden.',true);};img.src=src;}

/* ---------- Bedienung ---------- */
function klick(ev){var t=ev.target,x;if(!t||!t.closest)return;
 if((x=t.closest('#kz-tabs [data-tab]'))){tab(x.getAttribute('data-tab'));return;}
 if((x=t.closest('[data-go]'))){geh(x.getAttribute('data-go'));return;}
 if((x=t.closest('[data-ki]'))){kiVon(x.getAttribute('data-ki'));return;}
 if((x=t.closest('[data-as-was]'))){asWas(x);return;}
 if((x=t.closest('[data-as-ant]'))){var aq=x.getAttribute('data-q'),avv=x.getAttribute('data-as-ant');if(G.frage!==aq){G.frage=aq;G.seite=pVon(aq);G.f.antworten=[];}var al=G.f.antworten=G.f.antworten||[],ai=al.indexOf(avv);if(ai>=0)al.splice(ai,1);else al.push(avv);rKi();return;}
 if((x=t.closest('[data-as-dann]'))){if(x.getAttribute('data-warum')){toastK(x.getAttribute('data-warum'),true);return;}G.f.dann=x.getAttribute('data-as-dann');G.f.dannWert='';scVor();return;}
 if((x=t.closest('[data-as-wert]'))){G.f.dannWert=x.getAttribute('data-as-wert');scVor();return;}
 if((x=t.closest('[data-as-set]'))){G.f[x.getAttribute('data-as-set')]=x.getAttribute('data-v');rKi();return;}
 if((x=t.closest('[data-as-art]'))){G.f.art=x.getAttribute('data-as-art');scVor();return;}
 if((x=t.closest('[data-as-seite]'))){var asv=x.getAttribute('data-as-seite');G.seite=asv==='neu'?'neu':+asv;if(asv==='neu'){rKi();return;}scVor();return;}
 if((x=t.closest('[data-as-q]'))){var qk=x.getAttribute('data-as-q'),s0=step(qk);G.frage=qk;G.seite=pVon(qk);if(G.was==='text')G.f.neu=s0?s0.frage||'':'';scVor();return;}
 if((x=t.closest('[data-as-titel]'))){var tp=x.getAttribute('data-as-titel');if(tp==='ende'){G.seite='ende';G.frage=null;G.f.neu=(cfg.summary&&cfg.summary.titel)||'';}else{G.seite=+tp;G.frage='titel';G.f.neu=(S()[+tp]||{}).titel||'';}scVor();return;}
 if((x=t.closest('[data-as-kat]'))){G.frage=x.getAttribute('data-as-kat');if(G.frage==='+neu'){rKi();return;}scVor();return;}
 if((x=t.closest('[data-as-lid]'))){G.f.lid=x.getAttribute('data-as-lid');scVor();return;}
 if((x=t.closest('[data-as-weg]'))){var wv=x.getAttribute('data-as-weg').split('|');G.frage=wv[0];G.seite=pVon(wv[0]);G.f.ziel=wv[1];G.f.sicher='1';scVor();return;}
 if((x=t.closest('[data-as-foto]'))){var fi=+x.getAttribute('data-as-foto');if(G.foto&&G.foto[fi])G.foto[fi].aus=!G.foto[fi].aus;rKi();return;}
 if((x=t.closest('[data-g-was]'))){var kw=x.getAttribute('data-g-was'),alt=G.frage,gl=G.was===kw,W=WAS[kw];if(!W)return;G.was=kw;G.auf=null;G.fertig=null;if(!gl){G.f=std(kw);G.frage=null;}
  if((G.seite==='ende'&&kw!=='text')||(G.seite==='neu'&&W.wo!=='seite'))G.seite=null;else if(typeof G.seite==='number'){var p0=S()[G.seite];if(!p0||!seitePasst(p0)||(zuP(G.seite)&&!W.lesen))G.seite=null;}if(!gl){var aq=step(alt);if(aq&&typeof G.seite==='number'&&W.wo==='frage'&&passtQ(aq))G.frage=alt;}autoFrage();rKi();kiOben();return;}
 if((x=t.closest('[data-g-seite]'))){var sv2=x.getAttribute('data-g-seite');if(x.getAttribute('aria-disabled')){var wn=$('kz-kiwarn');if(wn)wn.innerHTML='<span>'+(sv2==='ende'?'Die letzte Seite':'Seite '+(+sv2+1))+' ist gesperrt. Zum Ändern zuerst das Schloss öffnen.</span>'+(sv2==='ende'?'':'<button type="button" class="kz-btn2 sm" data-kz="lock" data-k="seite" data-i="'+(+sv2)+'">Schloss öffnen</button>');return;}
  G.seite=sv2==='ende'||sv2==='neu'?sv2:+sv2;G.frage=null;G.f=std(G.was);G.auf=null;autoFrage();rKi();return;}
 if((x=t.closest('[data-g-frage]'))){G.frage=x.getAttribute('data-g-frage');G.f=std(G.was);G.auf=null;rKi();return;}
 if((x=t.closest('[data-g-seg]'))){var sk=x.getAttribute('data-g-seg');G.f[sk]=x.getAttribute('data-v');if(sk==='dann')G.f.dannWert='';rDet();return;}
 if((x=t.closest('[data-g-ant]'))){var av=G.f.antworten=G.f.antworten||[],ov=x.getAttribute('data-g-ant'),ix=av.indexOf(ov);if(ix>=0)av.splice(ix,1);else av.push(ov);rDet();return;}
 if((x=t.closest('[data-mic]'))){diktat(x);return;}
 if((x=t.closest('[data-kz]'))&&!x.disabled){if(x.tagName==='A')ev.preventDefault();act(x.getAttribute('data-kz'),x);}}
function act(n,el){var g=function(k){return el.getAttribute('data-'+k);},pi=+g('pi'),r;
 switch(n){
 case'liste':U.offen=false;alles();window.scrollTo(0,0);break;
 case'seite-neu':addSeite();break;
 case'hoch':case'runter':var nz=n==='hoch'?pi-1:pi+1;seiteSchieben(pi,n==='hoch'?-1:1);geh('seite:'+nz);break;
 case'seite-weg':var P=S();if(P.length<2){toastK('Mindestens eine Seite muss bleiben.',true);return;}if(!confirm('Seite „'+pTitel(P[pi],pi)+'“ mit allen Fragen löschen?'))return;delSeite(pi);geh('seite:'+Math.max(0,pi-1));break;
 case'frage-neu':addStep(pi);setTimeout(function(){var qs=qa('#kz-qs > .q'),l=qs[qs.length-1];if(!l)return;l.classList.add('kz-blink');var i=l.querySelector('.q-frage');if(i)try{i.focus();}catch(x){}},90);break;
 case'lock':lock(g('k'),+g('i'));break;
 case'nur-manchmal':nurManchmal(pi);break;
 case'regel-zeig':U.edit=null;geh('regeln');blink('rk-'+g('r'));break;
 case'regel-edit':U.edit=g('r');rMain();blink('rk-'+g('r'));break;
 case'regel-fertig':U.edit=null;alles();break;
 case'regel-weg':r=regelVon(g('r'));if(!r||!confirm('Diese Regel löschen? '+zielName(r.ziel)+' erscheint dann immer.'))return;kzMerk();wennSetzen(r.ziel,null);U.edit=null;renderSteps();toastK('Regel gelöscht. Rückgängig geht oben.');break;
 case'r-op':regelOp(g('r'),g('v'));break;
 case'r-v':regelWert(g('r'),g('v'));break;
 case'design':if(typeof zumDesign==='function')zumDesign();break;
 case'logo-farbe':logoFarbe();break;
 case'dock-auf':U.dock=true;rKi();break;
 case'dock-zu':U.dock=false;rKi();break;
 case'ki-ok':uebernehmen();break;
 case'as-zur':scZur();break;
 case'as-go':asGo();break;
 case'foto':fotoWaehlen();break;
 case'vorlage':if(typeof window.newWidget==='function')window.newWidget();break;
 case'ki-leer':G=leerG();rKi();kiOben();break;
 case'st-auf':G.auf=+g('n')||null;rKi();break;
 case'ki-ansehen':var fz=G.fertig&&G.fertig.z;if(!fz)break;if(breit())U.dock=false;geh(fz.v||'seite:0');blink(fz.el);break;
 case'ki-undo':kzZurueck();G.fertig=null;rKi();break;
 case'ki-frei':kiFrei();break;
  case'chat-senden':chatSenden();break;
  case'chat-undo':kzZurueck();CHAT.push({w:'ki',t:'Zurückgenommen.'});rKi();break;
 case'vor-neu':vorschauJetzt();break;
 case'ansehen':if(typeof widgetAnsehen==='function')widgetAnsehen();break;
 case'alt':try{entwurfSichern();}catch(x){}location.href=el.getAttribute('href');break;}}
function bald(){clearTimeout(bald.t);bald.t=setTimeout(function(){rList();rLayout();vorschauBald(0);},500);}
function eingabe(ev){var t=ev.target;
 if(t.hasAttribute('data-g')){var k=t.getAttribute('data-g');G.f[k]=t.value;updKi();return;}
 if(t.hasAttribute('data-g-frei')){G.frei=t.value;var lb=D.querySelector('#kz-dock .kz-leer');if(lb)lb.hidden=!(G.was||G.frei);return;}
 if(t.hasAttribute('data-kzw')||t.hasAttribute('data-kzr')||t.hasAttribute('data-g-cb'))return;
 if(t.getAttribute('data-kzf')==='titel')setSeitenTitel(+t.getAttribute('data-pi'),t.value);
 bald();}
function aenderung(ev){var t=ev.target;
 if(t.hasAttribute('data-g-cb')){G.f[t.getAttribute('data-g-cb')]=t.checked;updKi();return;}
 if(t.hasAttribute('data-kzw')){wimSetzen(t.getAttribute('data-kzw'),t.type==='checkbox'?t.checked:t.value);return;}
 if(t.hasAttribute('data-kzr')){regelFeld(t);return;}
 if(t.hasAttribute('data-g')||t.hasAttribute('data-g-frei'))return;
 bald();}

/* ---------- Einhängen ---------- */
var _rs=window.renderSteps;window.renderSteps=function(){var r=_rs.apply(this,arguments);try{nachRender();}catch(x){if(window.console)console.error(x);}return r;};
var _oe=window.openEditor;if(typeof _oe==='function')window.openEditor=function(){var r=_oe.apply(this,arguments);try{start();}catch(x){if(window.console)console.error(x);}return r;};
var _sm=window.setModus;if(typeof _sm==='function')window.setModus=function(m,pi){var r=_sm.apply(this,arguments);if(BAU&&LETZT&&typeof pi==='number')geh('seite:'+pi);return r;};
window.merken=kzMerk;window.zurueck=kzZurueck;
var _zb=window.zumBetriebsnamen;window.zumBetriebsnamen=function(){if(!BAU||!LETZT)return _zb&&_zb();var a=$('app');if(a&&a.style.display==='none'&&typeof czDesignZu==='function')czDesignZu();geh('betrieb');setTimeout(function(){var f=$('betriebName');if(!f)return;try{f.focus();}catch(x){}f.style.borderColor='#a8442f';setTimeout(function(){f.style.borderColor='';},2600);},120);};
try{var a0=$('app');if(a0&&a0.style.display!=='none'&&typeof cfg==='object'&&cfg&&cfg.steps)start();}catch(x){}
})();
