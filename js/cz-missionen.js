/* clickzauber · Missionen, Trophäen und Vertrauensabzeichen
   Nur der Betrieb selbst sieht sie. Ob eine Mission erfüllt ist, lesen wir aus den echten Daten
   (Einstellungen, Kennzahlen, Vernetzen) — damit stimmt der Stand auf jedem Gerät. Einmal verdiente
   Trophäen bleiben. Das Gerät merkt sich nur, welche Feier schon gezeigt wurde.
   Seit 08.10.2026: Missionen je Cockpit-Art (a), nach der Einrichtung „Cockpit kennenlernen“ über das Menü „Funktionen“,
   Vernetzen ganz am Schluss und erst frei, wenn die Einrichtung fertig und die erste echte Anfrage da ist. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  var css = ''
    + '.msn{position:fixed;bottom:18px;right:18px;z-index:70;font-family:var(--fd);color:var(--ink)}'
    + '.msn[hidden]{display:none}'
    + '.msn-chip[aria-expanded="true"]{border-color:var(--accent)}'
    + '.msn-chip{display:flex;align-items:center;gap:8px;width:236px;height:48px;background:var(--panel);border:1px solid var(--line-2);border-radius:999px;box-shadow:0 10px 28px rgba(36,31,25,.14);font:inherit;color:inherit;padding:6px 14px 6px 8px;cursor:pointer}.msn-chip i{margin-left:auto !important}'
    + '.msn-chip b{font-size:15px;letter-spacing:-.01em}.msn-chip span{font-size:12.5px;color:var(--ink-2)}'
    + '.msn-chip i{font-style:normal;font-size:11.5px;background:var(--accent);color:var(--on-accent);border-radius:999px;padding:2px 8px;margin-left:2px}'
    /* Beim Herunterscrollen: an den rechten Rand, klein, nur noch die Punkte und die sanft pulsierende Zahl offener Aufgaben */
    + '.msn{transition:right .35s cubic-bezier(.3,.7,.2,1)}'
    + '.msn-chip{position:relative;transition:width .35s cubic-bezier(.3,.7,.2,1),height .25s,padding .25s,border-radius .35s}'
    + '.msn-chip>svg{flex:0 0 auto;transition:width .25s,height .25s,opacity .2s,margin .25s}.msn-chip>span{max-width:90px;overflow:hidden;white-space:nowrap;transition:max-width .3s,opacity .2s,margin .3s}'
    + '.msn-chip i em{font-style:normal}.msn-chip i small{font-size:inherit}'
    + '.msn-in{transition:opacity .2s,transform .25s,visibility .25s}'
    + '.msn.klein{right:0}'
    + '.msn.klein .msn-chip{width:calc(var(--kw,80px) + env(safe-area-inset-right,0px));height:38px;padding:4px calc(14px + env(safe-area-inset-right,0px)) 4px 14px;border-radius:999px 0 0 999px;border-color:var(--line-2);border-right-color:transparent}'
    + '.msn.klein .msn-chip>svg{width:0;height:26px;opacity:0;margin-right:-8px}.msn.klein .msn-chip>span{max-width:0;opacity:0;margin-left:-8px}'
    + '.msn.klein .msn-chip i{position:absolute;top:-7px;left:-5px;margin:0 !important;min-width:20px;height:20px;padding:0 6px;display:grid;place-items:center;font-size:11.5px;font-weight:700;animation:msnPuls 4s ease-out infinite}'
    + '.msn.klein .msn-chip i small{display:none}'
    + '.msn.klein .msn-in{opacity:0;transform:translateY(10px) scale(.97);visibility:hidden;pointer-events:none}'
    + '@keyframes msnPuls{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 45%,transparent);transform:scale(1)}12%{transform:scale(1.07)}30%{box-shadow:0 0 0 6px transparent;transform:scale(1)}100%{box-shadow:0 0 0 0 transparent}}'
    + '@media(prefers-reduced-motion:reduce){.msn,.msn-chip,.msn-chip>svg,.msn-chip>span,.msn-in{transition:none}.msn.klein .msn-chip i{animation:none}}'
    + '.msn-in{position:absolute;bottom:calc(100% + 10px);right:0;width:300px;overflow:auto;overscroll-behavior:contain;background:var(--panel);border:1px solid var(--line-2);border-radius:16px;box-shadow:0 14px 40px rgba(36,31,25,.16);padding:14px 14px 12px}'
    + '.msn-kopf{display:flex;align-items:center;gap:11px}'
    + '.msn-kopf .tx{flex:1;min-width:0}.msn-kopf b{display:block;font-size:16px;letter-spacing:-.02em}'
    + '.msn-l{font-family:var(--fm);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}'
    + '.msn-x{background:var(--panel-2);border:1px solid var(--line);border-radius:9px;width:32px;height:32px;display:grid;place-items:center;color:var(--ink-2);cursor:pointer;flex:0 0 auto}'
    + '.msn-x:hover{color:var(--ink)}'
    + '.msn-bal{height:6px;border-radius:99px;background:var(--panel-2);margin:12px 0 0;overflow:hidden}.msn-bal i{display:block;height:100%;background:var(--accent);border-radius:99px;transition:width .8s cubic-bezier(.3,.7,.2,1)}'
    + '.msn-n{margin:7px 0 0;font-size:12.5px;color:var(--ink-2)}'
    + '.msn-liste{display:flex;flex-direction:column;gap:6px;margin:12px 0 0}'
    + '.msn-m{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:var(--panel-2);border:1px solid var(--line);border-radius:11px;padding:9px 10px;font:inherit;color:inherit;cursor:pointer;min-height:48px}'
    + '.msn-m:hover{border-color:var(--accent)}'
    + '.msn-m .o{width:18px;height:18px;border-radius:50%;border:2px solid var(--line-2);flex:0 0 auto}'
    + '.msn-m .tx{flex:1;min-width:0}.msn-m .tx b{display:block;font-size:13.5px;font-weight:600}.msn-m .tx span{display:block;font-size:12px;color:var(--ink-2);line-height:1.4;margin-top:1px}'
    + '.msn-m em{font-style:normal;font-family:var(--fm);font-size:11.5px;color:var(--accent);flex:0 0 auto}'
    + '.msn-alle{display:block;width:100%;margin:10px 0 0;background:none;border:none;font:inherit;font-size:13px;font-weight:600;color:var(--accent);cursor:pointer;padding:8px;min-height:40px;border-radius:9px}'
    + '.msn-alle:hover{background:var(--panel-2)}'
    + '.msn-fertig{margin:12px 0 0;font-size:13px;color:var(--ink-2);line-height:1.5}'
    /* gesperrte Navigation */
    + '.side .nav-g.msn-gesperrt{opacity:.55}.side .nav-g.msn-gesperrt .msn-schloss{margin-left:auto;display:inline-flex}.msn-schloss{display:none}.msn-schloss svg{width:14px;height:14px}'
    + '.unten .msn-gesperrt{opacity:.5}'
    /* Übersicht aller Trophäen */
    + '.msn-dlg{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:18px}.msn-dlg[hidden]{display:none}'
    + '.msn-dlg .rk{position:absolute;inset:0;background:rgba(20,16,10,.42)}'
    + '.msn-dlg .pn{position:relative;width:100%;max-width:640px;max-height:calc(100vh - 36px);overflow:auto;background:var(--panel);border:1px solid var(--line-2);border-radius:20px;padding:24px;box-shadow:0 30px 70px rgba(0,0,0,.3)}'
    + '.msn-dlg h2{margin:4px 0 0;font-size:21px;letter-spacing:-.025em}.msn-dlg .pn>p{margin:8px 0 0;font-size:14px;line-height:1.6;color:var(--ink-2);text-wrap:pretty}'
    + '.msn-dlg .zu-x{position:absolute;top:16px;right:16px}'
    + '.msn-hin{margin:16px 0 0;background:var(--panel-2);border:1px solid var(--line-2);border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.55}'
    + '.msn-leiter{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:6px;margin:20px 0 4px}.msn-st svg{width:100%;height:auto;max-width:54px}.msn-st b{font-size:11px;line-height:1.25}'
    + '.msn-lauf{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:16px 0 0}.msn-lauf div{background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:1px}'
    + '.msn-lauf b{font-size:20px;letter-spacing:-.02em}.msn-lauf span{font-size:12.5px;font-weight:600}.msn-lauf i{font-style:normal;font-size:11.5px;color:var(--ink-3)}'
    + '.msn-klein{margin:8px 0 0 !important;font-size:12px !important;color:var(--ink-3) !important}'
    + '.msn-tabs{display:flex;gap:4px;margin:16px 0 0;background:var(--panel-2);border:1px solid var(--line);border-radius:11px;padding:4px}.msn-tabs button{flex:1;background:none;border:none;font:inherit;font-size:13.5px;font-weight:500;color:var(--ink-2);padding:9px 8px;border-radius:8px;cursor:pointer;min-height:42px}.msn-tabs button.on{background:var(--panel);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}'
    + '.msn-vk{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center;margin:16px 0 0;background:var(--panel-2);border:1px solid var(--line);border-radius:14px;padding:16px}.msn-vk b.gr{display:block;font-size:34px;letter-spacing:-.03em;line-height:1}.msn-vk p{margin:6px 0 0 !important;font-size:13px !important}'
    + '.msn-vt{display:flex;flex-direction:column;margin:14px 0 0;border:1px solid var(--line);border-radius:14px;overflow:hidden}.msn-vz{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 12px;border-top:1px solid var(--line)}.msn-vz:first-child{border-top:none}.msn-vz.ich{background:color-mix(in srgb,var(--accent) 10%,var(--panel))}.msn-vz.aus svg{filter:grayscale(1);opacity:.4}.msn-vz b{font-size:13.5px}.msn-vz span{display:block;font-size:12px;color:var(--ink-2)}.msn-vz em{font-style:normal;font-family:var(--fm);font-size:12px;font-weight:600;white-space:nowrap}'
    + '.msn-karte{margin:14px 0 0;border:1px solid var(--line);border-radius:14px;padding:14px 16px}.msn-karte h3{margin:0;font-size:15px}.msn-karte p{margin:6px 0 0 !important;font-size:13px !important}'
    + '.msn-code{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.msn-code input{flex:1 1 200px;min-width:0;font-family:var(--fm);font-size:12px;border:1px solid var(--line);border-radius:9px;padding:0 10px;min-height:42px;background:var(--panel-2);color:var(--ink)}'
    + '.msn-knopf{background:var(--accent);color:var(--on-accent);border:none;border-radius:9px;padding:0 14px;min-height:42px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}.msn-knopf.hell{background:var(--panel-2);color:var(--ink);border:1px solid var(--line)}'
    + '.msn-siegel{display:inline-flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:999px;background:#fffdf8;border:1px solid rgba(36,31,25,.14);box-shadow:0 6px 18px rgba(36,31,25,.1);margin-top:10px;color:#241f19}.msn-siegel b{display:block;font-size:13.5px}.msn-siegel i{display:block;font-style:normal;font-size:11.5px;color:#7a7263}'
    + '.msn-krone{display:flex;align-items:center;gap:7px;margin:9px 0 0;background:#fbf1d6;border:1px solid #ecd48a;color:#5a430a;border-radius:10px;padding:7px 10px;font-size:12.5px;font-weight:600}'
    + '.msn-fk .msn-urk{margin-top:10px;width:100%;background:var(--panel-2);color:var(--ink);border:1px solid var(--line);border-radius:11px;padding:11px;font-family:var(--fd);font-size:14px;font-weight:600;cursor:pointer;min-height:44px}.msn-neu2{margin:12px 0 0;font-size:13.5px;line-height:1.5;color:var(--ink);background:var(--panel-2);border-radius:10px;padding:9px 12px;text-align:left}'
    + '.msn-rang{display:flex;align-items:center;gap:7px;width:100%;margin:9px 0 0;background:none;border:1px solid var(--line);border-radius:10px;padding:7px 10px;font:inherit;font-size:12.5px;color:var(--ink);cursor:pointer;min-height:38px;text-align:left}'
    + '.msn-rang:hover{border-color:var(--accent)}.msn-rang svg{color:var(--accent);flex:0 0 auto}.msn-rang span{flex:1;min-width:0}.msn-rang em{font-style:normal;color:var(--accent);font-weight:600}'
    + '.msn-toast{position:fixed;left:50%;bottom:26px;z-index:125;transform:translate(-50%,20px);opacity:0;pointer-events:none;display:flex;align-items:center;gap:10px;background:var(--ink);color:var(--bg);border-radius:14px;padding:9px 16px 9px 10px;box-shadow:0 14px 34px rgba(0,0,0,.25);transition:opacity .3s,transform .3s;font-family:var(--fd)}'
    + '.msn-toast.an{opacity:1;transform:translate(-50%,0)}.msn-toast b{display:block;font-size:14px}.msn-toast i{display:block;font-style:normal;font-size:12px;opacity:.75}'
    + '@media(max-width:760px){.msn-toast{bottom:calc(92px + env(safe-area-inset-bottom,0px))}.msn-lauf{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    + '.msn-st{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center}.msn-st b{font-size:12px}.msn-st span{font-family:var(--fm);font-size:10.5px;color:var(--ink-3)}'
    + '.msn-st.aus svg{filter:grayscale(1);opacity:.35}'
    + '.msn-stufe{margin:22px 0 0}.msn-stufe h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px}.msn-stufe h3 small{font-weight:400;font-size:12.5px;color:var(--ink-3)}'
    + '.msn-stufe .msn-liste{margin-top:9px}'
    + '.msn-m.ok{background:none;cursor:default}.msn-m.ok:hover{border-color:var(--line)}.msn-m.ok .o{background:var(--accent);border-color:var(--accent);display:grid;place-items:center;color:var(--on-accent);font-size:11px;font-weight:700}'
    + '.msn-m.zu{cursor:default;opacity:.55}.msn-m.zu:hover{border-color:var(--line)}'
    /* Feier */
    + '.msn-feier{position:fixed;inset:0;z-index:130;display:flex;align-items:center;justify-content:center;padding:20px}.msn-feier[hidden]{display:none}'
    + '.msn-feier .rk{position:absolute;inset:0;background:rgba(20,16,10,.5);animation:msnRk .3s ease both}'
    + '.msn-fk{position:relative;width:100%;max-width:380px;background:var(--panel);border:1px solid var(--line-2);border-radius:22px;padding:30px 26px 22px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.35);animation:msnKarte .45s cubic-bezier(.2,.9,.3,1.2) both}'
    + '.msn-bild{position:relative;width:150px;height:150px;margin:-2px auto 6px;display:grid;place-items:center}'
    + '.msn-glanz{position:absolute;inset:-18px;border-radius:50%;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--accent) 26%,transparent) 0 9deg,transparent 9deg 24deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%);animation:msnDreh 9s linear infinite}'
    + '.msn-bild svg.gross{position:relative;width:118px;height:118px;animation:msnPop .8s cubic-bezier(.2,.9,.3,1.3) .12s both;filter:drop-shadow(0 10px 18px rgba(36,31,25,.25))}'
    + '.msn-funke{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px;border-radius:2px;background:var(--accent);opacity:0;animation:msnFunke .9s ease-out .35s both}'
    + '.msn-fk h2{margin:8px 0 0;font-size:22px;letter-spacing:-.025em;text-wrap:pretty}.msn-fk p{margin:8px 0 0;font-size:14px;line-height:1.6;color:var(--ink-2);text-wrap:pretty}'
    + '.msn-plus{display:inline-block;margin:14px 0 0;font-family:var(--fm);font-size:13px;background:var(--panel-2);border:1px solid var(--line-2);border-radius:999px;padding:6px 13px;animation:msnHoch .5s ease .7s both}'
    + '.msn-neu{display:flex;align-items:center;justify-content:center;gap:9px;margin:12px 0 0;font-size:14px;font-weight:600;animation:msnHoch .5s ease .9s both}.msn-neu svg{width:30px;height:30px}'
    + '.msn-fk .weiter{margin-top:20px;width:100%;background:var(--accent);color:var(--on-accent);border:none;border-radius:11px;padding:13px;font-family:var(--fd);font-size:15px;font-weight:600;cursor:pointer;min-height:48px}'
    + '@keyframes msnRk{from{opacity:0}}@keyframes msnKarte{from{opacity:0;transform:translateY(18px) scale(.94)}}'
    + '@keyframes msnPop{0%{transform:scale(.2) rotate(-20deg);opacity:0}60%{transform:scale(1.14) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0)}}'
    + '@keyframes msnDreh{to{transform:rotate(360deg)}}@keyframes msnHoch{from{opacity:0;transform:translateY(8px)}}'
    + '@keyframes msnFunke{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(200deg)}}'
    + '@media(prefers-reduced-motion:reduce){.msn-feier *{animation:none !important}}'
    + '@media(max-width:760px){.msn{top:auto;bottom:calc(84px + env(safe-area-inset-bottom,0px));right:12px}.msn-in{top:auto;bottom:calc(100% + 10px);width:calc(100vw - 24px)}.msn-leiter{grid-template-columns:repeat(3,minmax(0,1fr))}.msn-st svg{max-width:60px}}'
    + '@media(max-width:760px){body.cz-demo .msn{bottom:calc(152px + env(safe-area-inset-bottom,0px))}}'
    + '@media(min-width:761px){body.cz-demo .msn{bottom:81px}}'
    /* Breites Fenster: aufgeklappte Box bekommt eigenen Platz, damit nichts darunter verschwindet */
    + '@media(min-width:1440px){body.msn-auf .main{padding-right:340px !important}}';
  var st0 = document.createElement('style'); st0.id = 'cz-missionen-css'; st0.textContent = css; document.head.appendChild(st0);

  /* ── Daten ─────────────────────────────────────────────── */
  function E() { return (window.EIN && window.EIN.einstellungen) || null; }
  /* Erklärungen und Einrichtung zählen erst nach dem Haken ganz unten (js/cz-bestaetigen.js). */
  function bst(k) { return window.czBestaetigt ? window.czBestaetigt(k) : undefined; }
  function K() { return (window.CZ_LETZTE && window.CZ_LETZTE.kpis) || null; }
  function N() { var s = window.CZ_NETZ_S; return s && !s.fehler ? s : null; }
  function istAdmin() { return !!window._admin; }
  function tourGesehen(k) {
    var u = window.user;
    if (u && Array.isArray(u.touren) && u.touren.indexOf(k) > -1) return true;
    try { return !!(localStorage.getItem('cz_tour_' + k) || (k === 'cockpit' && localStorage.getItem('cz_tour_gesehen'))); } catch (e) { return false; }
  }
  function tourOffen() { var t = $('tour'); return !!(t && !t.hidden); }

  function artM() { var b = document.body.classList; return b.contains('art-termin') ? 'termin' : b.contains('art-auftrag') ? 'auftrag' : b.contains('art-pipeline') ? 'pipeline' : 'location'; }
  function fuerMich(m) { return !m.a || m.a.indexOf(artM()) >= 0; }
  function fxStufe(s) { return function () { var f = window.czFxMenue; if (!f || !f.stufe) return undefined; var x = f.stufe(s); return x.alle > 0 && x.ok >= x.alle; }; }
  /* Texte je Cockpit-Art (ta): z. B. „Ersten Termin bestätigt“ statt „Erste Buchung“ */
  function artTexte() { var a = artM(); ALLE.forEach(function (m) { if (!m.ta) return; if (!m.ta0) m.ta0 = [m.t, m.s]; var x = m.ta[a] || m.ta0; m.t = x[0]; m.s = x[1]; }); }
  var STUFEN = [
    { id: 'start', t: 'Einrichtung', s: 'Schaltet Vernetzen frei', m: [
      { id: 'formular', t: 'Formular gebaut', s: 'Fragen, Preise und Aussehen festlegen.', p: 20, v: 'widget', ok: function () { if (istDemo()) return true; var ws = window.SRV_WIDGETS; if (ws) return ws.length > 0; try { if (JSON.parse(localStorage.getItem('cz_widgets') || '[]').length) return true; } catch (e) {} return undefined; } },
      { id: 'livegeschaltet', t: 'Formular live geschaltet', s: 'Oben rechts auf den grünen Schalter tippen.', p: 10, v: 'live', ok: function () { if (istDemo()) return true; var ws = window.SRV_WIDGETS; if (!ws) return undefined; return ws.length > 0 && ws.every(function (w) { return !w.status || w.status === 'live'; }); } },
      { id: 'mail', t: 'Benachrichtigung bestätigt', s: 'Adresse für neue Anfragen prüfen, Haken setzen, bestätigen.', p: 15, v: 'settings', b: 'mail', ok: function () { return bst('mail'); } },
      { id: 'datenschutz', t: 'Datenschutzerklärung bestätigt', s: 'Pflicht. Lesen, unten Haken setzen, bestätigen.', p: 20, v: 'recht', b: 'datenschutz', ok: function () { return bst('datenschutz'); } },
      { id: 'av', t: 'Auftragsverarbeitungsvertrag abgeschlossen', s: 'Pflicht nach DSGVO. Lesen und unten abschließen.', p: 20, v: 'recht', b: 'av', ok: function () { return bst('av'); } }
    ] },
    /* Erst alles kennenlernen. Welche Funktionen dazugehören, steht je Branche im Menü „Funktionen“ (js/cz-funktionen-menue.js). */
    { id: 'kennen', t: 'Cockpit kennenlernen', s: 'Alle Funktionen für Ihre Branche', m: [
      { id: 'k_mail', t: 'Automatische E-Mails angesehen', s: 'Was clickzauber per E-Mail von selbst erledigt. Im Menü „Funktionen“ ansehen und „Verstanden“ tippen.', p: 15, v: 'fxm', ok: function () { var f = window.czFxMenue; return f && f.kennt ? f.kennt('mails') : undefined; } },
      { id: 'k_grund', t: 'Grundlagen kennengelernt', s: 'Im Menü „Funktionen“ alle Grundlagen mit „Zeigen“ ansehen und jeweils „Verstanden“ tippen.', p: 20, v: 'fxm', ok: fxStufe(1) },
      { id: 'k_alltag', t: 'Alltag kennengelernt', s: 'Alles unter „Im Alltag“ ansehen und „Verstanden“ tippen.', p: 20, v: 'fxm', ok: fxStufe(2) },
      { id: 'k_profi', t: 'Profi-Funktionen kennengelernt', s: 'Alles unter „Für Fortgeschrittene“ ansehen und „Verstanden“ tippen.', p: 20, v: 'fxm', ok: fxStufe(3) }
    ] },
    { id: 'live', t: 'Live gehen', s: 'Das Formular arbeitet für Sie', m: [
      { id: 'eingebaut', t: 'Auf der Website eingebaut', s: 'Erledigt, sobald der erste Besucher es öffnet.', p: 25, v: 'embed', ok: function () { var k = K(); return k ? (k.starts || 0) > 0 : undefined; } },
      { id: 'anfrage1', t: 'Erste Anfrage erhalten', s: 'Ein Gast hat das Formular abgeschickt.', p: 20, v: 'leads', max: ['anfragen', 1] },
      { id: 'vorlage', a: ['auftrag', 'location', 'pipeline'], t: 'Ersten Textbaustein angelegt', s: 'Antworten mit einem Klick.', p: 15, v: 'vorlagen', max: ['vorlagen', 1] },
      { id: 'loeschfrist', t: 'Löschfrist bestätigt', s: 'Festlegen, wann alte Anfragen gelöscht werden.', p: 15, v: 'settings', b: 'loeschfrist', ok: function () { return bst('loeschfrist'); } },
      { id: 'kalender', t: 'Kalender verbunden', s: 'Termine erscheinen von selbst in Ihrem Kalender.', p: 20, v: 'kalender', ok: function () { if (window.CZ_ABO_OK) return true; return window.KAL ? !!window.KAL.verbunden : undefined; } }
    ] },
    { id: 'profi', t: 'Vertrauen aufbauen', s: 'Für die Diamanten', m: [
      { id: 'anfrage10', t: '10 Anfragen erhalten', s: 'Zählt alle Formulare zusammen.', p: 20, v: 'leads', max: ['anfragen', 10] },
      { id: 'gebucht', ta: { termin: ['Ersten Termin bestätigt', 'Eine Terminanfrage angenommen.'], auftrag: ['Ersten Auftrag fest eingetragen', 'Ein Auftrag steht fest im Kalender.'] }, t: 'Erste Buchung', s: 'Eine Anfrage auf „Gebucht“ gesetzt.', p: 25, v: 'leads', max: ['gebucht', 1] },
      { id: 'schnell', t: 'Schnell geantwortet', s: 'Meist am selben Tag auf Anfragen reagieren.', p: 30, v: 'vernetzen', ok: function () { var n = N(); return n ? !!(n.antwort && (n.antwort.stufe || n.antwort.abzeichen)) : undefined; } },
      { id: 'anfrage50', t: '50 Anfragen erhalten', s: 'Ihr Formular läuft richtig gut.', p: 30, v: 'leads', max: ['anfragen', 50] }
    ] },
    { id: 'netz', t: 'Vernetzen', s: 'Mit Betrieben aus Ihrer Nähe', netz: true, m: [
      { id: 'profil', t: 'Profil angelegt', s: 'Damit andere Betriebe Sie finden.', p: 20, v: 'netzprofil', ok: function () { var n = N(); return n ? !!n.hat_profil : undefined; } },
      { id: 'kontakt', t: 'Mit einem Betrieb vernetzt', s: 'Eine Anfrage schicken, er stimmt zu.', p: 20, v: 'vernetzen', max: ['kontakte', 1] },
      { id: 'partner', t: 'Ersten Partner im Formular', s: 'Ihr Gast sieht ihn unter dem Formular.', p: 25, v: 'partner', max: ['partner', 1] },
      { id: 'frei', t: 'Freien Termin gemeldet', s: 'Ihre Kontakte erfahren, wann Sie Platz haben.', p: 10, v: 'vernetzen', ok: function () { var n = N(); return n ? !!((n.profil && n.profil.freie_tage) || []).length : undefined; } },
      { id: 'kontakte5', t: 'Fünf Kontakte', s: 'Ein kleines Netzwerk aus Partnern.', p: 25, v: 'vernetzen', max: ['kontakte', 5] },
      { id: 'partner3', t: 'Drei Partner im Formular', s: 'Ihr Gast findet alles an einem Ort.', p: 30, v: 'partner', max: ['partner', 3] }
    ] },
    /* Selten und zum Sammeln. Prüft nur der Server (lib/_vertrauen.js). */
    { id: 'sonder', t: 'Sondertrophäen', s: 'Selten und zum Sammeln', sonder: true, m: [
      { id: 'anfrage100', t: '100. Anfrage', s: 'Hundert Gäste haben Ihr Formular ausgefüllt.', p: 50, v: 'leads', max: ['anfragen', 100] },
      { id: 'hochzeit1', a: ['location'], t: 'Erste Hochzeit gebucht', s: 'Für Betriebe rund um Hochzeiten: die erste gebuchte Feier.', p: 30, v: 'leads' },
      { id: 'nachteule', t: 'Nachteule', s: 'Eine Anfrage nach 22 Uhr beantwortet.', p: 15, v: 'leads' },
      { id: 'jahr1', t: 'Ein Jahr dabei', s: 'Seit einem Jahr mit clickzauber.', p: 50, v: null },
      { id: 'monatssieger', t: 'Monatssieger', s: 'Einen Monat lang Platz 1 im eigenen PLZ-Gebiet.', p: 100, v: 'rangliste' },
      { id: 'werber', t: 'Freund geworben', s: 'Ein geworbener Betrieb ist geblieben.', p: 0, pt: '+200 je Betrieb', v: null }
    ] }
  ];
  var ALLE = []; STUFEN.forEach(function (g) { g.m.forEach(function (m) { m.g = g; ALLE.push(m); }); });
  var GESAMT = ALLE.reduce(function (a, m) { return a + m.p; }, 0);

  /* Vertrauensabzeichen: neun Stufen von Bronze bis Löwenkristall (js/cz-abzeichen.js).
     Punkte = Missionen + 2 je Anfrage + 10 je Abschluss. Der Server rechnet nach (was=vertrauen). */
  var AZ = window.czAbzeichen, RANG = AZ.STUFEN, PRO_A = 2, PRO_B = 10;
  function rangIndex(p) { return AZ.stufeVon(p); }
  function abzeichen(i, gr, cls) { return AZ.svg(i, gr, { cls: cls }); }
  function zahlText(n) { return Number(n || 0).toLocaleString('de-DE'); }
  /* Rabatt je Stufe. Gleiche Werte wie lib/_vertrauen.js (RABATT). */
  var RABATT = [0, 0, 5, 10, 10, 10, 15, 15, 20];
  /* Alle Funktionen gelten für alle Betriebe gleich. Die Stufe bringt nur Rabatt. */
  var FREI = [];
  function neuBei(i) { var v = []; if (RABATT[i] && RABATT[i] !== RABATT[i - 1]) v.push('−' + RABATT[i] + ' % auf den Monatspreis'); FREI.forEach(function (f) { if (f[0] === i) v.push(f[1]); }); return v; }
  function neuHTML(i) { var v = neuBei(i); return v.length ? '<div class="msn-neu2"><b>Neu freigeschaltet:</b> ' + esc(v.join(', ')) + '</div>' : ''; }
  var KRONE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z" fill="#e0b23a" stroke="#8a6410" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  /* Beispiel-Modus: Werte, die sonst der Server liefert */
  var DEMO_INFO = { missionen: ['nachteule', 'hochzeit1', 'werber'], bonus_anzahl: 0, geworben: 1, werbe_rabatt_monate: 1, kronen: 0, krone: null, werbe_code: 'SEEROSE', siegel: 'gut-seerose', zahlung_aktiv: false };
  function istDemo() { return window.token === 'demo'; }
  function info() { if (VT) return VT; if (istDemo()) { DEMO_INFO.bonus_anzahl = (ST && ST.demoBonus) || 0; return DEMO_INFO; } return {}; }
  function pokal(gr) {
    return '<svg class="gross" viewBox="0 0 48 48" width="' + gr + '" height="' + gr + '" aria-hidden="true"><defs><linearGradient id="msnpk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d670"/><stop offset="1" stop-color="#b3831c"/></linearGradient></defs>'
      + '<path d="M15 8h18v8c0 6-4 11-9 11s-9-5-9-11Z" fill="url(#msnpk)"/><path d="M15 11H9.5c0 5 2.5 8 6.5 8.5M33 11h5.5c0 5-2.5 8-6.5 8.5" fill="none" stroke="#c99a2a" stroke-width="2.2" stroke-linecap="round"/>'
      + '<path d="M21.5 27h5l1 7h-7Z" fill="#c99a2a"/><rect x="15" y="34" width="18" height="6" rx="2" fill="url(#msnpk)"/><path d="M19 12v5" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  var SCHLOSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  /* ── Speicher (je Konto und Gerät) ─────────────────────── */
  var ST = null, KEY = '';
  function laden() {
    var u = window.user; if (!u) return false;
    var k = 'cz_msn_' + (window.token === 'demo' ? 'demo' : (u.id || u.email || 'x'));
    if (KEY === k && ST) return true;
    KEY = k;
    try { ST = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { ST = null; }
    var sd = serverDone(), svN = Object.keys(sd).length;
    if (!ST) {
      /* Neues Gerät, App statt Browser oder geleerter Speicher: Was der Server schon kennt, kommt nie wieder.
         Ältere Konten ohne Stand auf dem Server bekommen alles bereits Erfüllte still gutgeschrieben. */
      var alt = !!(u.created_at && Date.now() - new Date(u.created_at).getTime() > 2 * 864e5);
      ST = { done: {}, max: {}, zu: window.innerWidth < 1440, still: /[?&]rahmen=1/.test(location.search) || (!svN && ((tourGesehen('cockpit') && !tourOffen()) || alt)) };
    }
    ST.done = ST.done || {}; ST.max = ST.max || {};
    Object.keys(sd).forEach(function (id) { if (!ST.done[id]) ST.done[id] = 1; });
    return true;
  }
  function sichern() { try { localStorage.setItem(KEY, JSON.stringify({ done: ST.done, max: ST.max, zu: ST.zu, frei: ST.frei, warZu: ST.warZu, still: ST.still, rang: ST.rang, vtA: ST.vtA, vtB: ST.vtB, vtBonus: ST.vtBonus, platzR: ST.platzR, demoBonus: ST.demoBonus })); } catch (e) {} serverMerken(); }
  /* Erledigte Missionen merkt sich auch der Server (users.touren als „m:ID“, lib/profile.js, seit 08.10.2026).
     So kommt keine Feier ein zweites Mal: nicht am anderen Gerät, nicht in der App, nicht nach dem Leeren des Browsers. */
  function serverDone() { var u = window.user, r = {}; ((u && u.touren) || []).forEach(function (x) { if (/^m:/.test(x)) r[x.slice(2)] = 1; }); return r; }
  var SV_T = 0;
  function serverMerken() {
    if (istDemo() || istAdmin() || !ST || !window.token || !window.API || !window.user || !Array.isArray(window.user.touren)) return;
    clearTimeout(SV_T);
    SV_T = setTimeout(function () {
      var sd = serverDone(), fehlt = Object.keys(ST.done).filter(function (id) { return !sd[id] && /^[a-z0-9_]{2,24}$/.test(id); });
      if (!fehlt.length) return;
      fetch(window.API + '/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window.token, msn_gesehen: fehlt }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok && j.user && Array.isArray(j.user.touren)) window.user.touren = j.user.touren; })
        .catch(function () {});
    }, 1500);
  }

  /* ── Stand vom Server: Punkte, Anfragen, Abschlüsse, Plätze ── */
  var VT = null, VT_T = 0, VT_LAEUFT = false;
  function vtLaden(sofort) {
    if (!window.czNetzGet || window.token === 'demo' || istAdmin() || VT_LAEUFT) return;
    if (!sofort && Date.now() - VT_T < 90000) return;
    VT_LAEUFT = true; VT_T = Date.now();
    window.czNetzGet('vertrauen').then(function (j) {
      VT_LAEUFT = false;
      if (!j || !j.ok) return;
      if (j.regeln) { PRO_A = j.regeln.anfrage || PRO_A; PRO_B = j.regeln.abschluss || PRO_B; }
      VT = j; window.CZ_VERTRAUEN = j;
      if (ST && !ST.still && ST.vtA != null) {
        var da = j.anfragen - ST.vtA, db = j.abschluesse - (ST.vtB || 0), plus = Math.max(0, da) * PRO_A + Math.max(0, db) * PRO_B;
        if (plus > 0) toast('+' + plus + ' Vertrauenspunkte', [da > 0 ? (da === 1 ? '1 neue Anfrage' : da + ' neue Anfragen') : '', db > 0 ? (db === 1 ? '1 Abschluss' : db + ' Abschlüsse') : ''].filter(Boolean).join(' · '));
      }
      if (ST && !ST.still && ST.vtBonus != null && (j.bonus_anzahl || 0) > ST.vtBonus) WARTE.push({ gluck: j.bonus_anzahl - ST.vtBonus });
      var pr = j.rangliste && j.rangliste.drin && j.rangliste.plaetze && j.rangliste.plaetze.region ? j.rangliste.plaetze.region.platz : null;
      if (ST && !ST.still && pr && ST.platzR && pr < ST.platzR) setTimeout(function () { toast('Aufgestiegen: Platz ' + pr, j.rangliste.region ? 'im PLZ-Gebiet ' + j.rangliste.region : 'in Ihrer Region'); }, 4600);
      if (ST) { ST.vtA = j.anfragen; ST.vtB = j.abschluesse; ST.vtBonus = j.bonus_anzahl || 0; if (pr) ST.platzR = pr; }
      pruefen();
    }, function () { VT_LAEUFT = false; });
  }
  var TT = 0;
  function toast(t, s) {
    var x = $('msn-toast');
    if (!x) { x = document.createElement('div'); x.id = 'msn-toast'; x.className = 'msn-toast'; x.setAttribute('role', 'status'); document.body.appendChild(x); }
    x.innerHTML = abzeichen(rangIndex(punkte()), 28) + '<span><b>' + esc(t) + '</b>' + (s ? '<i>' + esc(s) + '</i>' : '') + '</span>';
    x.classList.add('an'); clearTimeout(TT); TT = setTimeout(function () { x.classList.remove('an'); }, 4200);
  }

  function hoch(k, v) { if (v != null && !(ST.max[k] >= v)) ST.max[k] = v; }
  function zaehlen() {
    var k = K(), l = window.CZ_LEADS_ALL, n = N();
    if (k) hoch('anfragen', k.anfragen || 0);
    if (Array.isArray(l)) { hoch('anfragen', l.length); hoch('gebucht', l.filter(function (x) { return x.status === 'gebucht'; }).length); }
    if (Array.isArray(window.CZ_VORLAGEN)) hoch('vorlagen', window.CZ_VORLAGEN.length);
    if (n) { hoch('kontakte', (n.kontakte || []).length); hoch('partner', (n.partner || []).filter(function (p) { return p.zugestimmt; }).length); }
  }
  function erfuellt(m) {
    if (ST.done[m.id]) return true;
    if ((info().missionen || []).indexOf(m.id) > -1) return true;
    if (m.max) return (ST.max[m.max[0]] || 0) >= m.max[1];
    try { return m.ok() === true; } catch (e) { return false; }
  }
  function missionsPunkte() { return ALLE.reduce(function (a, m) { return a + (ST.done[m.id] ? m.p : 0); }, 0); }
  /* Ohne Server (Beispiel-Modus, keine Verbindung) schätzen wir aus den geladenen Anfragen. */
  function laufend() { return VT ? { a: VT.anfragen, b: VT.abschluesse } : { a: ST.max.anfragen || 0, b: ST.max.gebucht || 0 }; }
  function punkte() {
    if (!ST) return 0;
    if (VT) return Math.max(VT.punkte, 0);
    var l = laufend(), I = info(); return missionsPunkte() + l.a * PRO_A + l.b * PRO_B + (I.bonus_anzahl || 0) * 18 + (I.geworben || 0) * 200;
  }
  window.czVertrauenKrone = function () { var k = info().krone; return k ? k.region || '' : null; };
  window.czVertrauenStufe = function () { return ST ? rangIndex(punkte()) : -1; };
  window.czVertrauenPunkte = function () { return ST ? punkte() : 0; };
  function netzFrei() {
    if (istAdmin() || window.token === 'demo' || ST.frei) return true;
    var n = N();
    if (n && n.hat_profil) return true;
    if (tourGesehen('netz')) return true;
    return STUFEN[0].m.every(function (m) { return !!ST.done[m.id]; }) && !!ST.done.anfrage1;
  }
  function stufeOffen(g) { return !g.netz || netzFrei(); }

  /* ── Prüfen: neue Trophäen, neuer Rang, Freischaltung ─── */
  var WARTE = [], BEREIT = false, STILL_AB = 0, STILL_T = 0;
  function pruefen() {
    if (istAdmin() || !laden()) { zeichnen(); return; }
    zaehlen(); vtLaden(false);
    var neu = [];
    ALLE.forEach(function (m) {
      if (ST.done[m.id] || !fuerMich(m) || !stufeOffen(m.g) && m.g.netz) return;
      if (erfuellt(m)) { ST.done[m.id] = Date.now(); neu.push(m); }
    });
    var frei = netzFrei();
    if (!frei) ST.warZu = true;
    var jetztFrei = frei && !ST.frei; if (frei) ST.frei = true;
    if (ST.still) {
      /* Still gutschreiben, bis die Grunddaten da sind — sonst gälten spät geladene Missionen als neu. */
      if (!STILL_AB) STILL_AB = (E() && K()) ? Date.now() : 0;
      if (!STILL_AB || Date.now() - STILL_AB < 6000) { neu = []; jetztFrei = false; if (!STILL_T) STILL_T = setTimeout(function () { STILL_T = 0; pruefen(); }, 6500); }
      else ST.still = false;
      WARTE.length = 0;
    }
    neu.forEach(function (m) { WARTE.push({ m: m, rang: -1 }); });
    if (neu.length && !VT) setTimeout(function () { vtLaden(true); }, 2500);
    /* Neues Abzeichen: an die letzte Trophäe hängen oder eigene Feier (z. B. durch Anfragen) */
    var r = rangIndex(punkte());
    if (ST.rang == null || ST.still) ST.rang = r;
    else if (r > ST.rang) {
      ST.rang = r;
      var letzte = null; WARTE.forEach(function (x) { if (x.m) letzte = x; });
      if (letzte) letzte.rang = r; else WARTE.push({ rang: r });
    }
    if (jetztFrei && ST.warZu) WARTE.push({ frei: true });
    sichern(); zeichnen(); sperre(); feiern();
  }

  /* ── Box oben rechts ─────────────────────────────────── */
  function box() {
    var b = $('msn');
    if (!b) { b = document.createElement('div'); b.id = 'msn'; b.className = 'msn'; b.hidden = true; document.body.appendChild(b); }
    return b;
  }
  function offene(max) {
    var r = [];
    STUFEN.forEach(function (g) { if (!stufeOffen(g) || g.sonder) return; g.m.forEach(function (m) { if (!ST.done[m.id] && m.v && fuerMich(m)) r.push(m); }); });
    return max ? r.slice(0, max) : r;
  }
  function zeichnen() {
    artTexte();
    var b = box(), app = $('app');
    if (istAdmin() || !ST || !app || app.style.display === 'none') { b.hidden = true; document.body.classList.remove('msn-auf'); platzMelden(); return; }
    b.hidden = false;
    try { if (!istDemo()) localStorage.setItem('cz_vt_stufe', String(rangIndex(punkte()))); } catch (e) {}
    document.body.classList.toggle('msn-auf', !ST.zu);
    var p = punkte(), ri = rangIndex(p), nx = RANG[ri + 1], of = offene(0), zahl = ALLE.filter(function (m) { return ST.done[m.id]; }).length;
    b.classList.toggle('zu', !!ST.zu);
    var chip = '<button class="msn-chip" id="msn-auf" aria-expanded="' + !ST.zu + '" title="' + (ST.zu ? 'Missionen öffnen' : 'Missionen schließen') + '">' + abzeichen(ri, 30) + '<b>' + zahlText(p) + '</b><span>Punkte</span>' + (of.length ? '<i><em>' + of.length + '</em><small> offen</small></i>' : '') + '</button>';
    if (ST.zu) { b.innerHTML = chip; platzMelden(); return; }
    var von = ri < 0 ? 0 : RANG[ri].ab, bis = nx ? nx.ab : GESAMT;
    var h = '<div class="msn-in"><div class="msn-kopf">' + abzeichen(ri, 42) + '<div class="tx"><span class="msn-l">Vertrauen</span><b>' + (ri < 0 ? 'Noch kein Abzeichen' : RANG[ri].n) + '</b></div>'
      + '<button class="msn-x" id="msn-ein" aria-label="Einklappen" title="Einklappen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg></button></div>'
      + '<div class="msn-bal"><i style="width:' + (nx ? Math.round((p - von) / Math.max(1, bis - von) * 100) : 100) + '%"></i></div>'
      + '<p class="msn-n">' + zahlText(p) + ' Punkte' + (nx ? ' · noch ' + zahlText(nx.ab - p) + ' bis ' + nx.n : ' · höchstes Vertrauen') + '</p>'
      + rangZeile() + kroneZeile();
    if (of.length) {
      h += '<div class="msn-liste">' + of.slice(0, 3).map(zeile).join('') + '</div>';
    } else if (!netzFrei()) {
      h += '<p class="msn-fertig">Alles erledigt, was gerade geht.</p>';
    } else {
      h += '<p class="msn-fertig">Alle Missionen erfüllt. Neue kommen dazu, sobald es neue Funktionen gibt.</p>';
    }
    h += '<button class="msn-alle" id="msn-alle">Alle Trophäen · ' + zahl + ' von ' + ALLE.length + '</button></div>';
    b.innerHTML = chip + h;
    platzMelden();
  }
  /* Die Box steht unten rechts und klappt nach oben auf. Oben rechts sitzen Live-Schalter,
     Sprache und Zahnrad (js/cz-live.js, js/cz-globus.js). */
  function platzMelden() {
    var b = $('msn'), p = b && b.querySelector('.msn-in'), c = b && b.querySelector('.msn-chip');
    /* Beispiel-Modus am Rechner: Die Leiste unten (#demo-banner) würde die Box verdecken — die Box rückt darüber.
       Am Handy regelt das die Regel für body.cz-demo im CSS. */
    if (b) {
      var db = $('demo-banner'), dh = document.body.classList.contains('cz-demo') && db && db.offsetParent !== null ? db.offsetHeight : 0;
      b.style.bottom = innerWidth > 760 && dh ? (dh + 18) + 'px' : '';
    }
    if (b && c) { var bz = c.querySelector('b'); if (bz) b.style.setProperty('--kw', Math.ceil(bz.getBoundingClientRect().width + 32) + 'px'); }
    if (p && c) { var r = c.getBoundingClientRect(); p.style.maxHeight = Math.max(160, r.top - 10 - 12) + 'px'; }
    if (window.czGlobusPlatz) window.czGlobusPlatz(0);
  }
  addEventListener('resize', function () { platzMelden(); });
  /* Ganz oben wie immer. Ab 80 px nach unten klein am rechten Rand, unter 24 px wieder groß.
     Ein Tipp auf die kleine Box öffnet sie; erst nach weiteren 80 px Scrollen wird sie wieder klein. */
  var KLEIN = false, AUF_Y = -1;
  /* Am Handy scrollt nicht das Fenster, sondern #app (Cockpit-CSS für schmale Bildschirme). Deshalb beides lesen. */
  function scrollY0() { var a = $('app'); return Math.max(window.pageYOffset || document.documentElement.scrollTop || 0, a ? a.scrollTop : 0); }
  function kleinSetzen(an) { var b = $('msn'); if (!b || KLEIN === an) return; KLEIN = an; b.classList.toggle('klein', an); }
  function scrollPruefen() {
    var y = scrollY0();
    if (AUF_Y >= 0) { if (Math.abs(y - AUF_Y) < 80) return; AUF_Y = -1; }
    if (y > 80) kleinSetzen(true); else if (y < 24) kleinSetzen(false);
  }
  addEventListener('scroll', scrollPruefen, { passive: true });
  /* Scroll-Ereignisse von #app steigen nicht zum Fenster auf: hier abfangen */
  document.addEventListener('scroll', function (ev) { if (ev.target && ev.target.id === 'app') scrollPruefen(); }, { passive: true, capture: true });
  setTimeout(scrollPruefen, 600);
  function kroneZeile() {
    var k = info().krone; if (!k) return '';
    return '<div class="msn-krone">' + KRONE + '<span>Monatssieger' + (k.region ? ' im PLZ-Gebiet ' + esc(k.region) : '') + (k.bis ? ' · Krone bis ' + esc(new Date(k.bis).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })) : '') + '</span></div>';
  }
  function rangZeile() {
    var t = '';
    if (VT && VT.rangliste && VT.rangliste.drin) {
      var pl = VT.rangliste.plaetze || {}, rg = pl.region || {};
      if (rg.platz) t = 'Platz ' + rg.platz + (VT.rangliste.region ? ' im PLZ-Gebiet ' + esc(VT.rangliste.region) : ' in Ihrem Land');
    } else if (window.czRangKurz) t = window.czRangKurz(punkte());
    if (!t || !netzFrei()) return '';
    return '<button class="msn-rang" data-msn-go-view="rangliste"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg><span>' + t + '</span><em>Rangliste</em></button>';
  }
  function zeile(m, modus) {
    if (modus === 'ok') return '<div class="msn-m ok"><span class="o">✓</span><span class="tx"><b>' + esc(m.t) + '</b><span>' + esc(m.s) + '</span></span><em>' + (m.pt || '+' + m.p) + '</em></div>';
    if (modus === 'zu') return '<div class="msn-m zu"><span class="o"></span><span class="tx"><b>' + esc(m.t) + '</b><span>' + esc(m.s) + '</span></span><em>' + (m.pt || '+' + m.p) + '</em></div>';
    return '<button class="msn-m" data-msn-go="' + m.id + '"><span class="o"></span><span class="tx"><b>' + esc(m.t) + '</b><span>' + esc(m.s) + '</span></span><em>' + (m.pt || '+' + m.p) + '</em></button>';
  }

  /* ── Alle Trophäen ───────────────────────────────────── */
  var DTAB = 'missionen';
  function alleZeigen(hinweis, tab) {
    if (tab) DTAB = tab;
    var d = $('msn-dlg');
    if (!d) { d = document.createElement('div'); d.id = 'msn-dlg'; d.className = 'msn-dlg'; document.body.appendChild(d); }
    var p = punkte(), ri = rangIndex(p);
    var h = '<div class="rk" data-msn-schliessen></div><div class="pn" role="dialog" aria-label="Trophäen und Vertrauen">'
      + '<button class="msn-x zu-x" data-msn-schliessen aria-label="Schließen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>'
      + '<span class="msn-l">Ihre Trophäen</span><h2>' + zahlText(p) + ' Vertrauenspunkte</h2>'
      + '<p>Punkte gibt es für jede Mission, für jede Anfrage und für jeden Abschluss. Mit den Punkten steigt Ihr Vertrauensabzeichen, von Bronze bis zum Löwenkristall.</p>';
    if (hinweis) h += '<div class="msn-hin">' + hinweis + '</div>';
    h += '<div class="msn-tabs" role="tablist">' + [['missionen', 'Missionen'], ['vorteile', 'Vorteile'], ['zeigen', 'Zeigen & Werben']].map(function (x) { return '<button role="tab" aria-selected="' + (DTAB === x[0]) + '" data-msn-tab="' + x[0] + '"' + (DTAB === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>';
    if (DTAB === 'vorteile') h += vorteileHTML(ri);
    else if (DTAB === 'zeigen') h += zeigenHTML(ri);
    else {
    var l = laufend();
    h += '<div class="msn-lauf"><div><b>+' + PRO_A + '</b><span>je Anfrage</span><i>' + zahlText(l.a) + ' bisher · ' + zahlText(l.a * PRO_A) + ' Punkte</i></div>'
      + '<div><b>+' + PRO_B + '</b><span>je Abschluss</span><i>' + zahlText(l.b) + ' bisher · ' + zahlText(l.b * PRO_B) + ' Punkte</i></div>'
      + (function () { var I = info(), ex = (I.bonus_anzahl || 0) * 18 + (I.geworben || 0) * 200; return '<div><b>+' + zahlText(ex) + '</b><span>Glück und Werben</span><i>' + (I.bonus_anzahl || 0) + ' Glücksanfragen · ' + (I.geworben || 0) + ' geworben</i></div>'; })()
      + '<div><b>' + zahlText(VT ? VT.punkte - l.a * PRO_A - l.b * PRO_B - (VT.bonus_anzahl || 0) * 18 - (VT.geworben || 0) * 200 : missionsPunkte()) + '</b><span>aus Missionen</span><i>' + ALLE.filter(function (m) { return ST.done[m.id]; }).length + ' von ' + ALLE.length + ' erfüllt</i></div></div>'
      + '<p class="msn-klein">Jede Gast-Adresse zählt einmal, eigene Adressen zählen nicht, höchstens 10 Anfragen pro Tag. Als Abschluss zählt „Gebucht“ oder ein angenommenes Angebot.</p>';
    h += '<div class="msn-leiter">' + RANG.map(function (r, i) {
      return '<div class="msn-st' + (i > ri ? ' aus' : '') + '">' + abzeichen(i, 46) + '<b>' + esc(r.n) + '</b><span>' + zahlText(r.ab) + '</span></div>';
    }).join('') + '</div>';
    if (netzFrei()) h += '<button class="msn-alle" data-msn-go-view="rangliste">Zur Rangliste</button>';
    STUFEN.forEach(function (g) {
      var offen = stufeOffen(g), gm = g.m.filter(fuerMich), fertig = gm.filter(function (m) { return ST.done[m.id]; }).length;
      h += '<div class="msn-stufe"><h3>' + (offen ? '' : '<span class="msn-schloss" style="display:inline-flex">' + SCHLOSS + '</span>') + esc(g.t) + ' <small>' + fertig + ' von ' + gm.length + (offen ? '' : ' · gesperrt, bis die Einrichtung fertig ist') + '</small></h3>'
        + '<div class="msn-liste">' + gm.map(function (m) { return zeile(m, ST.done[m.id] ? 'ok' : (!offen || !m.v ? 'zu' : '')); }).join('') + '</div></div>';
    });
    }
    d.innerHTML = h + '</div>';
    d.hidden = false;
  }
  function vorteileHTML(ri) {
    var I = info(), pct = ri > -1 ? RABATT[ri] || 0 : 0, pilot = !I.zahlung_aktiv;
    var h = '<div class="msn-vk">' + abzeichen(ri, 64) + '<div><b class="gr">' + (pct ? '−' + pct + ' %' : '0 %') + '</b><p>' + (pct ? 'auf Ihren Monatspreis mit dem Abzeichen ' + esc(RANG[ri].n) + '.' : 'Rabatt gibt es ab Gold: −5 % auf den Monatspreis.') + (pilot ? ' Gilt, sobald die Pilotphase endet. Bis dahin nutzen Sie clickzauber kostenlos.' : ' Wird mit der nächsten Rechnung verrechnet.') + '</p></div></div>';
    h += '<div class="msn-vt">' + RANG.map(function (r, i) {
      var v = []; if (RABATT[i]) v.push('−' + RABATT[i] + ' %'); FREI.forEach(function (f) { if (f[0] <= i) v.push(f[1]); });
      return '<div class="msn-vz' + (i === ri ? ' ich' : '') + (i > ri ? ' aus' : '') + '">' + abzeichen(i, 34) + '<div><b>' + esc(r.n) + '</b><span>' + (v.length ? esc(v.join(' · ')) : 'Abzeichen im Profil und in der Rangliste') + '</span></div><em>' + (i <= ri ? '✓' : 'ab ' + zahlText(r.ab)) + '</em></div>';
    }).join('') + '</div>';
    h += '<div class="msn-karte"><h3>Alle Funktionen für alle</h3><p>Jeder Betrieb nutzt alle Funktionen von clickzauber gleich, mit oder ohne Abzeichen. Das Abzeichen bringt nur den Rabatt.</p></div>';
    h += '<div class="msn-karte"><h3>Glücksanfragen</h3><p>Ab und zu zählt eine Anfrage zehnfach: +20 statt +2 Punkte. Das kommt zufällig, ungefähr jede 25. Anfrage. Bisher: <b>' + (I.bonus_anzahl || 0) + '</b>.</p></div>';
    h += '<div class="msn-karte"><h3>Monatssieger</h3><p>Wer im Monat im eigenen PLZ-Gebiet am meisten Punkte dazugewinnt, trägt einen Monat lang die Krone im Profil und steht im Monatsbericht.' + (I.krone ? ' <b>Sie tragen die Krone gerade.</b>' : '') + '</p></div>';
    return h;
  }
  function zeigenHTML(ri) {
    var I = info(), h = '';
    var code = I.siegel ? '<script src="https://clickzauber.de/js/cz-siegel.js" data-cz="' + I.siegel + '" async></' + 'script>' : '';
    h += '<div class="msn-karte"><h3>Siegel für Ihre Website</h3><p>Zeigt Ihr aktuelles Vertrauensabzeichen und wächst mit. Einmal einfügen, zum Beispiel neben Ihrem Formular.</p>'
      + (ri > -1 ? '<div class="msn-siegel">' + abzeichen(ri, 40) + '<span><b>Vertrauensabzeichen ' + esc(RANG[ri].n) + '</b><i>clickzauber · Punkte aus echten Anfragen</i></span></div>' : '')
      + (code ? '<div class="msn-code"><input id="msn-siegel-code" readonly value="' + esc(code) + '" aria-label="Code für das Siegel"><button class="msn-knopf" data-msn-kopie="msn-siegel-code">Kopieren</button></div>' : '<p>Sobald Ihr Formular live ist, steht hier Ihr Code.</p>') + '</div>';
    h += '<div class="msn-karte"><h3>Urkunde</h3><p>Ihr Abzeichen als Urkunde zum Ausdrucken, zum Beispiel für den Laden oder das Büro.</p>' + (ri > -1 ? '<button class="msn-knopf hell" style="margin-top:10px" data-msn-urkunde="' + ri + '">Urkunde als PDF</button>' : '<p>Gibt es ab dem ersten Abzeichen.</p>') + '</div>';
    var link = I.werbe_code ? 'https://clickzauber.de/clickzauber-anmelden.html?werber=' + I.werbe_code : '';
    h += '<div class="msn-karte"><h3>Freunde werben</h3><p>Für jeden Betrieb, der über Ihren Link kommt und nach 30 Tagen noch ein Formular live hat: +200 Vertrauenspunkte und ein Monat 50 % auf Ihren Monatspreis.</p>'
      + (link ? '<div class="msn-code"><input id="msn-werbe-link" readonly value="' + esc(link) + '" aria-label="Ihr Werbe-Link"><button class="msn-knopf" data-msn-kopie="msn-werbe-link">Kopieren</button>' + (navigator.share ? '<button class="msn-knopf hell" data-msn-teilen="' + esc(link) + '">Teilen</button>' : '') + '</div>' : '<p>Ihr Link erscheint hier, sobald die Verbindung zum Server steht.</p>')
      + '<p>Bisher geworben: <b>' + (I.geworben || 0) + '</b>' + (I.werbe_rabatt_monate ? ' · offene Monate mit 50 %: <b>' + I.werbe_rabatt_monate + '</b>' + (!I.zahlung_aktiv ? ' (gelten ab Ende der Pilotphase)' : '') : '') + '</p></div>';
    return h;
  }
  function urkunde(i) {
    var n = N(), name = (n && n.profil && n.profil.name) || (window.user && (window.user.betrieb || window.user.firma)) || 'Ihr Betrieb';
    if (window.CZ_APP || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) { toast('In der App nicht möglich', 'Die Urkunde speichern Sie als PDF, wenn Sie das Cockpit auf clickzauber.de im Browser öffnen.'); return; }
    var w = window.open('', '_blank');
    if (!w) { toast('Bitte Pop-ups erlauben', 'Dann öffnet sich die Urkunde zum Speichern als PDF.'); return; }
    w.document.write('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Urkunde · ' + esc(RANG[i].n) + '</title><link href="https://fonts.bunny.net/css2?family=Figtree:wght@400;600;700&family=Lora:ital@1&display=swap" rel="stylesheet"><style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center;background:#f5f2ea;font-family:Figtree,system-ui,sans-serif;color:#241f19;-webkit-print-color-adjust:exact;print-color-adjust:exact}.u{width:277mm;height:190mm;box-sizing:border-box;border:3mm double #b08a1e;background:#fffdf8;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:14mm;gap:4mm}.l{letter-spacing:.3em;text-transform:uppercase;font-size:11pt;color:#8a6d16}h1{font-family:Lora,serif;font-style:italic;font-weight:400;font-size:38pt;margin:0}h2{font-size:26pt;margin:0}p{font-size:13pt;color:#5f574b;margin:0}.f{margin-top:6mm;font-size:10pt;color:#8c8373}</style></head><body><div class="u"><span class="l">Urkunde</span>' + AZ.svg(i, 250, { anim: false }) + '<h1>Vertrauensabzeichen ' + esc(RANG[i].n) + '</h1><h2>' + esc(name) + '</h2><p>erreicht mit ' + zahlText(punkte()) + ' Vertrauenspunkten · ' + new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p><span class="f">clickzauber.de</span></div><script>setTimeout(function(){print()},800)</' + 'script></body></html>');
    w.document.close();
  }
  function alleZu() { var d = $('msn-dlg'); if (d) d.hidden = true; }

  /* ── Feier ───────────────────────────────────────────── */
  var FEIER_AN = false;
  function feiern() {
    if (!BEREIT || FEIER_AN || !WARTE.length || tourOffen() || document.hidden) return;
    var x = WARTE.shift(), f = $('msn-feier');
    if (!f) { f = document.createElement('div'); f.id = 'msn-feier'; f.className = 'msn-feier'; document.body.appendChild(f); }
    var funken = '';
    for (var i = 0; i < 12; i++) { var w = i / 12 * Math.PI * 2, r = 70 + (i % 3) * 16; funken += '<i class="msn-funke" style="--x:' + Math.round(Math.cos(w) * r) + 'px;--y:' + Math.round(Math.sin(w) * r) + 'px;animation-delay:' + (.3 + (i % 4) * .04) + 's' + (i % 2 ? ';background:#f2cf62' : '') + '"></i>'; }
    var h;
    if (x.frei) {
      h = '<div class="msn-bild"><div class="msn-glanz"></div>' + funken + '<svg class="gross" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="var(--accent)"/><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="16" cy="18" r="4"/><circle cx="32" cy="18" r="4"/><circle cx="24" cy="32" r="4"/><path d="M19 21l3 7M29 21l-3 7M20 18h8"/></g></svg></div>'
        + '<span class="msn-l">Freigeschaltet</span><h2>Vernetzen ist jetzt offen</h2><p>Lernen Sie Betriebe aus Ihrer Nähe kennen, zeigen Sie Partner unter Ihrem Formular und sammeln Sie weitere Trophäen.</p>'
        + '<button class="weiter" data-msn-weiter="vernetzen">Vernetzen ansehen</button>';
    } else if (x.gluck) {
      h = '<div class="msn-bild"><div class="msn-glanz"></div>' + funken + '<svg class="gross" viewBox="0 0 48 48" width="118" height="118" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#f5c542" stroke="#b07a10" stroke-width="2"/><circle cx="24" cy="24" r="16.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/><text x="24" y="30" text-anchor="middle" font-family="Figtree,system-ui,sans-serif" font-weight="700" font-size="16" fill="#4a3406">×10</text></svg></div>'
        + '<span class="msn-l">Glücksanfrage</span><h2>+20 statt +2 Punkte</h2><p>' + (x.gluck > 1 ? x.gluck + ' Ihrer neuen Anfragen haben' : 'Eine Ihrer neuen Anfragen hat') + ' zehnfach gezählt. Glücksanfragen kommen zufällig, ungefähr jede 25. Anfrage.</p>'
        + '<div class="msn-plus">+' + (18 * x.gluck) + ' Bonuspunkte</div><button class="weiter" data-msn-weiter="">Weiter</button>';
    } else if (!x.m) {
      h = '<div class="msn-bild"><div class="msn-glanz"></div>' + funken + abzeichen(x.rang, 128, 'gross') + '</div>'
        + '<span class="msn-l">Neues Vertrauensabzeichen</span><h2>' + esc(RANG[x.rang].n) + '</h2><p>Ihre Anfragen und Abschlüsse haben Sie auf ' + zahlText(punkte()) + ' Vertrauenspunkte gebracht.</p>'
        + (RANG[x.rang + 1] ? '<div class="msn-plus">Nächste Stufe: ' + esc(RANG[x.rang + 1].n) + ' ab ' + zahlText(RANG[x.rang + 1].ab) + '</div>' : '<div class="msn-plus">Höchstes Vertrauen</div>')
        + neuHTML(x.rang) + '<button class="weiter" data-msn-weiter="">Weiter</button><button class="msn-urk" data-msn-urkunde="' + x.rang + '">Urkunde als PDF</button>';
    } else {
      var m = x.m;
      h = '<div class="msn-bild"><div class="msn-glanz"></div>' + funken + (x.rang > -1 ? abzeichen(x.rang, 128, 'gross') : pokal(118)) + '</div>'
        + '<span class="msn-l">Trophäe erhalten</span><h2>' + esc(m.t) + '</h2><p>' + esc(m.s) + '</p>'
        + '<div class="msn-plus">' + (m.pt || '+' + m.p) + ' Vertrauenspunkte</div>'
        + (x.rang > -1 ? '<div class="msn-neu">Neues Vertrauensabzeichen: ' + esc(RANG[x.rang].n) + '</div>' + neuHTML(x.rang) : '')
        + '<button class="weiter" data-msn-weiter="">Weiter</button>' + (x.rang > -1 ? '<button class="msn-urk" data-msn-urkunde="' + x.rang + '">Urkunde als PDF</button>' : '');
    }
    f.innerHTML = '<div class="rk"></div><div class="msn-fk" role="dialog" aria-live="polite">' + h + '</div>';
    f.hidden = false; FEIER_AN = true;
    var knopf = f.querySelector('.weiter'); if (knopf) setTimeout(function () { try { knopf.focus({ preventScroll: true }); } catch (e) {} }, 400);
  }

  /* ── Sperre für Vernetzen ────────────────────────────── */
  var NETZ = { vernetzen: 1, netzprofil: 1, nachrichten: 1, partner: 1, rangliste: 1 };
  function sperre() {
    var zu = !!ST && !netzFrei();
    document.querySelectorAll('.side .nav-g[data-g="n"]').forEach(function (g) {
      g.classList.toggle('msn-gesperrt', zu);
      if (!g.querySelector('.msn-schloss')) { var s = document.createElement('span'); s.className = 'msn-schloss'; s.innerHTML = SCHLOSS; g.appendChild(s); }
      g.title = zu ? 'Schaltet sich frei, sobald die Einrichtung fertig ist' : '';
    });
    var sub = $('g-n'); if (sub && zu) sub.classList.remove('open');
    document.querySelectorAll('.unten [data-view]').forEach(function (b) { if (NETZ[b.getAttribute('data-view')]) b.classList.toggle('msn-gesperrt', zu); });
    var jetzt = document.querySelector('.view.on');
    if (zu && jetzt && NETZ[jetzt.getAttribute('data-v')]) ALT_SHOW.call(window, 'overview');
  }
  function sperrHinweis() {
    var fehlt = STUFEN[0].m.concat(ALLE.filter(function (m) { return m.id === 'anfrage1'; })).filter(function (m) { return !ST.done[m.id]; }).map(function (m) { return '„' + esc(m.t) + '“'; });
    alleZeigen('<b>Vernetzen kommt zum Schluss.</b> Es schaltet sich frei, sobald die Einrichtung fertig ist und die erste echte Anfrage da ist. ' + (fehlt.length ? 'Es fehlt noch: ' + fehlt.join(', ') + '.' : ''));
  }

  var ALT_SHOW = window.show;
  window.show = function (v) {
    if (NETZ[v] && ST && !netzFrei() && !tourOffen()) { sperrHinweis(); return; }
    var r = ALT_SHOW.apply(this, arguments);
    setTimeout(pruefen, 1200);
    return r;
  };

  /* ── Klicks ──────────────────────────────────────────── */
  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if (!t.closest) return;
    if (t.closest('#msn-auf')) { if (KLEIN) { kleinSetzen(false); AUF_Y = scrollY0(); ST.zu = false; } else ST.zu = !ST.zu; sichern(); zeichnen(); return; }
    if (t.closest('#msn-ein')) { ST.zu = true; sichern(); zeichnen(); return; }
    if ((x = t.closest('[data-msn-tab]'))) { alleZeigen(null, x.getAttribute('data-msn-tab')); return; }
    if ((x = t.closest('[data-msn-urkunde]'))) { urkunde(+x.getAttribute('data-msn-urkunde')); return; }
    if ((x = t.closest('[data-msn-kopie]'))) { var inp = $(x.getAttribute('data-msn-kopie')); if (inp) { inp.select(); try { navigator.clipboard.writeText(inp.value); } catch (e) { try { document.execCommand('copy'); } catch (e2) {} } toast('Kopiert', ''); } return; }
    if ((x = t.closest('[data-msn-teilen]'))) { try { navigator.share({ title: 'clickzauber', text: 'Anfragen, die gleich alles Wichtige enthalten. Probieren Sie clickzauber über meinen Link:', url: x.getAttribute('data-msn-teilen') }); } catch (e) {} return; }
    if (t.closest('#msn-alle')) { alleZeigen(null, 'missionen'); return; }
    if (t.closest('[data-msn-schliessen]')) { alleZu(); return; }
    if ((x = t.closest('[data-msn-go-view]'))) { alleZu(); window.show(x.getAttribute('data-msn-go-view')); if (innerWidth < 1440) { ST.zu = true; sichern(); zeichnen(); } return; }
    if ((x = t.closest('[data-msn-go]'))) {
      var m = ALLE.filter(function (y) { return y.id === x.getAttribute('data-msn-go'); })[0];
      alleZu(); if (m && m.b && window.czBestaetigen) window.czBestaetigen(m.b); else if (m && m.v === 'live') { var sw = $('czl-sw'); if (sw) sw.click(); } else if (m && m.v === 'fxm') { if (window.czFxMenue) window.czFxMenue.auf(); } else if (m && m.v) window.show(m.v);
      if (innerWidth < 1440) { ST.zu = true; sichern(); zeichnen(); }
      return;
    }
    if ((x = t.closest('[data-msn-weiter]'))) {
      var f = $('msn-feier'); if (f) f.hidden = true; FEIER_AN = false;
      var v = x.getAttribute('data-msn-weiter'); if (v) window.show(v);
      zeichnen(); setTimeout(feiern, 350);
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    var d = $('msn-dlg'); if (d && !d.hidden) alleZu();
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) feiern(); });
  /* „Verstanden“ im Menü „Funktionen“ erfüllt die Missionen unter „Cockpit kennenlernen“ */
  window.addEventListener('cz-fxm', function () { pruefen(); });

  /* ── Einhängen: Startklar wird Teil der Missionen ────── */
  window.czStartklar = function () { var b = $('startklar'); if (b) b.hidden = true; pruefen(); };
  var altRender = window.render;
  if (altRender) window.render = function () { var r = altRender.apply(this, arguments); setTimeout(pruefen, 0); return r; };
  var altEin = window.einZeichnen;
  if (altEin) window.einZeichnen = function () { var r = altEin.apply(this, arguments); setTimeout(pruefen, 0); return r; };
  var altTour = window.czTourVielleicht;
  window.czTourVielleicht = function () { var r = altTour && altTour.apply(this, arguments); setTimeout(function () { BEREIT = true; pruefen(); }, 1500); return r; };
  window.czMissionen = pruefen;
  window.czVertrauenNeu = function () { VT_T = 0; vtLaden(true); };
  window.czTrophaeen = function (tab) { if (!laden() || istAdmin()) return false; alleZeigen(null, tab || 'missionen'); return true; };
  /* Beispiel-Cockpit: einmal je Sitzung eine Glücksanfrage und eine Aufstiegs-Nachricht zum Ansehen */
  setTimeout(function demoZeigen() {
    if (!istDemo()) return;
    if (!ST || !BEREIT || FEIER_AN || tourOffen() || WARTE.length) { setTimeout(demoZeigen, 4000); return; }
    try { if (sessionStorage.getItem('cz_demo_glueck')) return; sessionStorage.setItem('cz_demo_glueck', '1'); } catch (e) {}
    ST.demoBonus = (ST.demoBonus || 0) + 1; sichern();
    WARTE.push({ gluck: 1 }); feiern(); zeichnen();
    setTimeout(function () { toast('Aufgestiegen', (window.czRangKurz ? window.czRangKurz(punkte()) : 'Neuer Platz in der Rangliste') + '. Die Nachricht kommt auch aufs Handy.'); }, 9000);
  }, 14000);
  setTimeout(function () { BEREIT = true; pruefen(); }, 2500);
  /* ?trophaeen=1 öffnet die Übersicht direkt, ?trophaeen=feier zeigt die Feier als Probe */
  var tq = (location.search.match(/[?&]trophaeen=([a-z0-9]+)/) || [])[1];
  if (tq) setTimeout(function () {
    if (!laden()) return;
    if (tq === 'feier') { WARTE.unshift({ m: ALLE[1], rang: 2 }); BEREIT = true; FEIER_AN = false; feiern(); }
    else alleZeigen();
  }, 3000);
  setInterval(function () { if (tourOffen() || FEIER_AN) return; pruefen(); }, 8000);
  pruefen();
})();
