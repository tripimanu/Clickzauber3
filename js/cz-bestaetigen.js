/* clickzauber · Lesen und bestätigen (seit 03.10.2026)
   Wichtige Erklärungen und Einrichtungs-Schritte gelten erst als erledigt, wenn der Betrieb sie ganz unten
   mit Haken bestätigt: Auftragsverarbeitungsvertrag, Datenschutzerklärung, Löschfrist, Benachrichtigung.
   Erst dann gibt es Mission und Punkte (js/cz-missionen.js, lib/_vertrauen.js, sql/60).
   Öffnen: window.czBestaetigen('av'|'datenschutz'|'loeschfrist'|'mail'), [data-bestaetigen], #bestaetigen-av. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function E() { return (window.EIN && window.EIN.einstellungen) || null; }
  function istDemo() { return window.token === 'demo'; }
  function kann() { return !window.EIN || window.EIN.darf_aendern !== false; }
  function datum(s) { return s ? new Date(s).toLocaleDateString('de-DE') : ''; }
  /* bestaetigt === null: Server ohne sql/60. Dann zählt wie bisher der gespeicherte Wert allein. */
  function best(k) { var e = E(); if (!e) return false; var b = e.bestaetigt; if (b == null) return true; return !!b[k]; }
  function bestAm(k) { var e = E(), b = e && e.bestaetigt; return b && b[k] && b[k].am; }
  window.czBestaetigt = function (k) {
    var e = E(); if (!e) return undefined;
    if (k === 'av') return !!(e.av_vertrag_am && window.EIN.av_aktuell);
    if (k === 'mail') return !!e.mail_haupt && best('mail');
    if (k === 'datenschutz') return !!e.datenschutz_url && best('datenschutz');
    if (k === 'loeschfrist') return !!e.loeschfrist_monate && best('loeschfrist');
    return false;
  };

  var css = ''
    + '.bst{position:fixed;inset:0;z-index:119;display:flex;align-items:center;justify-content:center;padding:18px;font-family:var(--fd);color:var(--ink)}.bst[hidden]{display:none}'
    + '.bst .rk{position:absolute;inset:0;background:rgba(20,16,10,.45)}'
    + '.bst-pn{position:relative;width:100%;max-width:720px;max-height:calc(100vh - 36px);display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line-2);border-radius:20px;box-shadow:0 30px 70px rgba(0,0,0,.3);overflow:hidden}'
    + '.bst-kopf{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}.bst-kopf .tx{flex:1;min-width:0}'
    + '.bst-kopf span{font-family:var(--fm);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}.bst-kopf h2{margin:3px 0 0;font-size:19px;letter-spacing:-.02em;line-height:1.25}'
    + '.bst-x{flex:0 0 auto;width:40px;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink-2);cursor:pointer;display:grid;place-items:center}'
    + '.bst-in{overflow:auto;overscroll-behavior:contain;padding:18px 20px 22px;-webkit-overflow-scrolling:touch}'
    + '.bst-text{font-size:14px;line-height:1.65;color:var(--ink-2)}.bst-text h1{font-size:18px;color:var(--ink);margin:0 0 6px;line-height:1.3}.bst-text h2{font-size:15.5px;color:var(--ink);margin:22px 0 6px}.bst-text h3{font-size:14.5px;color:var(--ink);margin:16px 0 4px}'
    + '.bst-text p,.bst-text li{margin:0 0 8px;text-wrap:pretty}.bst-text ul,.bst-text ol{padding-left:20px;margin:0 0 10px}.bst-text table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}.bst-text td,.bst-text th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}.bst-text a,.bst-hin a{color:var(--accent)}'
    + '.bst-hin{background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.55;color:var(--ink-2);margin:0 0 14px;overflow-wrap:anywhere}.bst-hin b{color:var(--ink)}'
    + '.bst-baustein{white-space:pre-wrap;background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.6;color:var(--ink-2)}'
    + '.bst-rahmen{display:block;width:100%;height:58vh;min-height:320px;border:1px solid var(--line);border-radius:12px;background:#fff}'
    + '.bst-feld{display:flex;flex-direction:column;gap:6px;margin:0 0 12px;font-size:13px;color:var(--ink-2)}.bst-feld input{font:inherit;font-size:15px;color:var(--ink);background:var(--panel-2);border:1px solid var(--line-2);border-radius:10px;padding:0 12px;min-height:46px;min-width:0}'
    + '.bst-wahl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:4px 0 0}.bst-wahl label{display:flex;align-items:center;gap:9px;border:1px solid var(--line-2);border-radius:11px;padding:10px 12px;min-height:48px;cursor:pointer;font-size:14px;background:var(--panel-2)}.bst-wahl input{accent-color:var(--accent);width:18px;height:18px;flex:0 0 auto}.bst-wahl small{display:block;font-size:11.5px;color:var(--ink-3)}'
    + '.bst-ende{margin:22px 0 0;border-top:2px solid var(--line-2);padding-top:16px;display:flex;flex-direction:column;gap:12px}'
    + '.bst-haken{display:flex;gap:11px;align-items:flex-start;font-size:14.5px;line-height:1.5;cursor:pointer;color:var(--ink)}.bst-haken input{flex:0 0 auto;width:22px;height:22px;margin:1px 0 0;accent-color:var(--accent)}'
    + '.bst-knopf{background:var(--accent);color:var(--on-accent);border:none;border-radius:12px;min-height:50px;padding:0 18px;font:inherit;font-size:15.5px;font-weight:600;cursor:pointer}.bst-knopf:disabled{opacity:.45;cursor:not-allowed}.bst-knopf.hell{background:var(--panel-2);color:var(--ink);border:1px solid var(--line-2)}'
    + '.bst-reihe{display:flex;gap:8px;flex-wrap:wrap}.bst-reihe .bst-knopf{flex:1 1 200px}'
    + '.bst-ok{display:flex;gap:10px;align-items:center;background:color-mix(in srgb,var(--accent) 12%,var(--panel));border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.5;overflow-wrap:anywhere}'
    + '.bst-ok i{flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:700}'
    + '.bst-msg{font-size:13.5px}.bst-msg:empty{display:none}.bst-msg.bad{color:var(--bad)}'
    + '.bst-link{background:none;border:none;padding:6px 0;font:inherit;font-size:13.5px;color:var(--accent);cursor:pointer;text-decoration:underline;align-self:flex-start;text-align:left}'
    + '@media(max-width:760px){.bst{padding:0;align-items:flex-end}.bst-pn{max-width:none;max-height:calc(100% - 24px);border-radius:20px 20px 0 0}.bst-in{padding-bottom:calc(22px + env(safe-area-inset-bottom,0px))}.bst-rahmen{height:52vh}}';
  var st = document.createElement('style'); st.id = 'cz-bestaetigen-css'; st.textContent = css; document.head.appendChild(st);

  var ART = {
    av: ['Pflicht nach Artikel 28 DSGVO', 'Vertrag zur Auftragsverarbeitung'],
    datenschutz: ['Pflicht', 'Ihre Datenschutzerklärung'],
    loeschfrist: ['Datenschutz', 'Wie lange Anfragen gespeichert bleiben'],
    mail: ['Einrichtung', 'Wohin neue Anfragen gehen']
  };
  var JETZT = null, DS_NEU = false, AV_TEXT = null, ZU_T = 0;

  function blatt() {
    var d = $('bst');
    if (!d) {
      d = document.createElement('div'); d.id = 'bst'; d.className = 'bst'; d.hidden = true;
      d.innerHTML = '<div class="rk" data-bst-zu></div><div class="bst-pn" role="dialog" aria-modal="true" aria-labelledby="bst-titel"><div class="bst-kopf"><div class="tx"><span id="bst-l"></span><h2 id="bst-titel"></h2></div>'
        + '<button class="bst-x" data-bst-zu aria-label="Schließen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="bst-in" id="bst-in"></div></div>';
      document.body.appendChild(d);
    }
    return d;
  }
  function okZeile(t) { return '<div class="bst-ok"><i>✓</i><span>' + t + '</span></div>'; }
  function ende(fertigText, hakenText, knopf, aendern) {
    var h = '<div class="bst-ende">';
    if (fertigText) { h += okZeile(fertigText); if (aendern && kann()) h += '<button class="bst-knopf hell" id="bst-los" data-ohne-haken="1">' + aendern + '</button>'; }
    else if (!kann()) h += '<div class="bst-hin">Bestätigen kann nur der Inhaber des Kontos.</div>';
    else h += '<label class="bst-haken"><input type="checkbox" id="bst-haken"><span>' + hakenText + '</span></label><button class="bst-knopf" id="bst-los" disabled>' + knopf + '</button>';
    return h + '<div class="bst-msg" id="bst-msg" role="status"></div></div>';
  }
  function name() {
    var e = E() || {}, u = window.user || {};
    return e.av_vertrag_von || [u.vorname, u.nachname].filter(Boolean).join(' ') || e.ansprechpartner || '';
  }
  function baustein() { var b = $('ds-baustein'); return b ? b.textContent.trim() : ''; }

  function avHTML() {
    var e = E(), fertig = window.czBestaetigt('av'), h = '<div class="bst-text" id="bst-avtext">' + (AV_TEXT || '<p>Vertragstext wird geladen …</p>') + '</div>';
    if (fertig) return h + ende('Abgeschlossen am ' + datum(e.av_vertrag_am) + (e.av_vertrag_von ? ' von ' + esc(e.av_vertrag_von) : '') + '. Der Nachweis ist gespeichert.');
    var vor = (e.av_vertrag_am ? '<div class="bst-hin"><b>Neue Fassung.</b> Der Vertrag hat sich geändert. Bitte einmal lesen und erneut abschließen.</div>' : '')
      + (kann() ? '<label class="bst-feld">Ihr vollständiger Name<input id="bst-name" type="text" autocomplete="name" value="' + esc(name()) + '"></label>' : '');
    return h + ende(null, 'Ich habe den Vertrag gelesen und schließe ihn für meinen Betrieb ab.', 'Vertrag abschließen').replace('<div class="bst-ende">', '<div class="bst-ende">' + vor);
  }
  function dsHTML() {
    var e = E(), url = e.datenschutz_url || '', eigen = url.indexOf('datenschutz-betrieb.html') < 0;
    if (!url || DS_NEU) {
      return '<div class="bst-text"><p>Ihre Gäste müssen vor dem Absenden lesen können, was mit ihren Angaben passiert. Der Link steht im Formular unter dem Absenden-Knopf.</p></div>'
        + '<label class="bst-feld">Adresse Ihrer Datenschutzerklärung<input id="bst-url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="ihre-seite.de/datenschutz" value="' + esc(url && eigen ? url : '') + '"></label>'
        + '<div class="bst-reihe"><button class="bst-knopf" id="bst-url-los">Adresse speichern</button><button class="bst-knopf hell" id="bst-ohne">Ich habe keine Website</button></div>'
        + '<div class="bst-text" style="margin-top:12px;font-size:13px"><p>Ohne eigene Website stellt clickzauber eine fertige Datenschutzerklärung mit Ihren Angaben bereit. Danach lesen und bestätigen Sie sie hier.</p></div><div class="bst-msg" id="bst-msg" role="status"></div>'
        + (url ? '<button class="bst-link" id="bst-zurueck">Zurück</button>' : '');
    }
    var h;
    if (eigen) {
      h = '<div class="bst-hin">Ihr Formular verlinkt auf <b>' + esc(url) + '</b>. <a href="' + esc(url) + '" target="_blank" rel="noopener">Öffnen ↗</a></div>'
        + '<div class="bst-text"><p>Damit Ihre Gäste wissen, dass clickzauber die Anfrage für Sie verarbeitet, muss dieser Absatz in Ihrer Datenschutzerklärung stehen:</p></div>'
        + '<div class="bst-baustein">' + esc(baustein()) + '</div><div class="bst-reihe" style="margin-top:8px"><button class="bst-knopf hell" id="bst-kopie">Absatz kopieren</button></div>';
    } else {
      h = '<div class="bst-hin">clickzauber stellt diese Datenschutzerklärung mit Ihren Angaben bereit. Bitte einmal ganz lesen und prüfen, ob Name, Anschrift und Kontakt stimmen. <a href="' + esc(url) + '" target="_blank" rel="noopener">In neuem Fenster ↗</a></div>'
        + '<iframe class="bst-rahmen" src="' + esc(url) + '" title="Ihre Datenschutzerklärung"></iframe>';
    }
    var am = bestAm('datenschutz');
    h += ende(window.czBestaetigt('datenschutz') ? 'Bestätigt' + (am ? ' am ' + datum(am) : '') + '.' : null,
      eigen ? 'Ich habe meine Datenschutzerklärung geprüft. Der Absatz zu clickzauber steht darin.' : 'Ich habe die Datenschutzerklärung gelesen. Die Angaben zu meinem Betrieb stimmen.', 'Bestätigen');
    h += '<button class="bst-link" id="bst-anders">' + (eigen ? 'Andere Adresse eintragen' : 'Doch eine eigene Website eintragen') + '</button>';
    if (!eigen) h += '<button class="bst-link" data-view="settings">Angaben falsch? Unter Einstellungen ändern</button>';
    return h;
  }
  function lfHTML() {
    var e = E(), alt = +e.loeschfrist_monate || 0, n = alt || 24, fertig = window.czBestaetigt('loeschfrist');
    return '<div class="bst-text"><p>Anfragen enthalten persönliche Daten. Das Datenschutzrecht verlangt, dass sie nicht unbegrenzt gespeichert bleiben. Nach der Frist löscht clickzauber ältere Anfragen jede Nacht automatisch.</p>'
      + '<p>Kürzer ist datenschutzfreundlicher, länger hilft bei Stammgästen. Gerade gespeichert: ' + ((window.EIN && window.EIN.anfragen_gespeichert) || 0) + ' Anfragen.</p></div>'
      + (alt ? '' : '<div class="bst-hin">Gerade eingestellt: <b>nie löschen</b>. Für die Mission braucht es eine Frist.</div>')
      + '<div class="bst-wahl" role="radiogroup" aria-label="Frist">' + [6, 12, 24, 36].map(function (m) { return '<label><input type="radio" name="bst-frist" value="' + m + '"' + (m === n ? ' checked' : '') + '><span>' + m + ' Monate' + (m === 24 ? '<small>empfohlen</small>' : '') + '</span></label>'; }).join('') + '</div>'
      + ende(fertig ? 'Bestätigt: Anfragen werden nach ' + alt + ' Monaten gelöscht.' : null, 'Ich habe die Frist geprüft. Ältere Anfragen werden danach automatisch gelöscht.', 'Bestätigen', 'Neue Frist speichern');
  }
  function mailHTML() {
    var e = E(), fertig = window.czBestaetigt('mail');
    return '<div class="bst-text"><p>An diese Adresse schickt clickzauber jede neue Anfrage. Voreingestellt ist Ihre Anmelde-Adresse.</p></div>'
      + '<label class="bst-feld">E-Mail für neue Anfragen<input id="bst-mail" type="email" inputmode="email" autocapitalize="off" spellcheck="false" value="' + esc(e.mail_haupt || '') + '"></label>'
      + ende(fertig ? 'Bestätigt. Neue Anfragen gehen an ' + esc(e.mail_haupt) + '.' : null, 'Ich habe die Adresse geprüft. Neue Anfragen sollen dorthin gehen.', 'Bestätigen', 'Neue Adresse speichern');
  }

  function zeichnen() {
    var d = blatt(), a = ART[JETZT]; if (!a) return;
    $('bst-l').textContent = a[0]; $('bst-titel').textContent = a[1];
    $('bst-in').innerHTML = JETZT === 'av' ? avHTML() : JETZT === 'datenschutz' ? dsHTML() : JETZT === 'loeschfrist' ? lfHTML() : mailHTML();
    knopfStand();
    return d;
  }
  function knopfStand() {
    var k = $('bst-los'), h = $('bst-haken'); if (!k || k.getAttribute('data-ohne-haken')) return;
    var ok = !!(h && h.checked);
    if (ok && JETZT === 'av') { var n = $('bst-name'); ok = !!(n && n.value.trim().length >= 3); }
    k.disabled = !ok;
  }
  function avLaden() {
    if (AV_TEXT) return;
    fetch('av-vertrag.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html'), w = doc.querySelector('main .wrap') || doc.querySelector('main');
      if (!w) throw 0;
      w.querySelectorAll('script,.doc-eyebrow,.note-box,.nur-seite').forEach(function (x) { x.remove(); });
      AV_TEXT = w.innerHTML;
    }).catch(function () {
      AV_TEXT = '<p>Der Vertragstext lässt sich gerade nicht laden. <a href="av-vertrag.html" target="_blank" rel="noopener">In neuem Fenster öffnen ↗</a></p>';
    }).then(function () { var x = $('bst-avtext'); if (x && JETZT === 'av') x.innerHTML = AV_TEXT; });
  }

  function oeffnen(art) {
    if (!ART[art]) return;
    clearTimeout(ZU_T); JETZT = art; DS_NEU = false;
    if (art === 'av') avLaden();
    var d = blatt(); d.hidden = false;
    var md = $('msn-dlg'); if (md) md.hidden = true;
    if (E()) zeichnen();
    else {
      /* Stand noch nicht geladen: Blatt trotzdem sofort zeigen. Kommt er nicht, sagt das Blatt es. */
      $('bst-l').textContent = ART[art][0]; $('bst-titel').textContent = ART[art][1];
      $('bst-in').innerHTML = '<div class="bst-text"><p>Ihr Stand wird geladen …</p></div>';
      var n = 0;
      (function warte() {
        if (JETZT !== art) return;
        if (E()) { zeichnen(); return; }
        if (++n < 40) { setTimeout(warte, 300); return; }
        $('bst-in').innerHTML = '<div class="bst-hin">Ihr Stand lässt sich gerade nicht laden. Bitte laden Sie die Seite neu.</div><div class="bst-reihe"><button class="bst-knopf" id="bst-neu">Neu laden</button></div>';
      })();
    }
    $('bst-in').scrollTop = 0;
    setTimeout(function () { var x = d.querySelector('.bst-x'); if (x) try { x.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function zu() { var d = $('bst'); if (d) d.hidden = true; JETZT = null; }
  window.czBestaetigen = oeffnen;

  function meldung(t, gut) { var m = $('bst-msg'); if (m) { m.className = 'bst-msg' + (gut === false ? ' bad' : ''); m.textContent = t; } }
  function demoAntwort(p) {
    var e = E(), j = { ok: true }, jetzt = new Date().toISOString(), b = Object.assign({}, e.bestaetigt || {});
    if (p.av_vertrag) { j.av_vertrag_am = jetzt; j.av_vertrag_von = p.av_name; j.av_vertrag_fassung = window.EIN.av_fassung; }
    if (p.bestaetigen) { b[p.bestaetigen] = { am: jetzt }; j.bestaetigt = b; }
    if (p.mail_haupt) j.mail_haupt = p.mail_haupt;
    if (p.loeschfrist_monate) j.loeschfrist_monate = p.loeschfrist_monate;
    if (p.datenschutz_url) j.datenschutz_url = p.datenschutz_url === 'clickzauber' ? 'https://clickzauber.de/datenschutz-betrieb.html?b=demo' : p.datenschutz_url;
    return j;
  }
  function senden(p, knopf) {
    meldung('Wird gespeichert …'); if (knopf) knopf.disabled = true;
    var w = istDemo() ? Promise.resolve(demoAntwort(p)) : fetch(window.API + '/einstellungen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: window.token }, p)) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
    return w.then(function (j) { if (!j || !j.ok) throw j || {}; return j; }).catch(function (j) {
      if (knopf) knopf.disabled = false;
      meldung((j && j.error) || 'Server nicht erreichbar. Bitte noch einmal versuchen.', false);
      throw j;
    });
  }
  function uebernehmen(j) {
    var e = E();
    if (j.av_vertrag_am) { e.av_vertrag_am = j.av_vertrag_am; e.av_vertrag_von = j.av_vertrag_von; e.av_vertrag_fassung = j.av_vertrag_fassung; window.EIN.av_aktuell = true; }
    if (j.bestaetigt) e.bestaetigt = j.bestaetigt;
    if (j.mail_haupt) e.mail_haupt = j.mail_haupt;
    if (j.loeschfrist_monate) e.loeschfrist_monate = j.loeschfrist_monate;
    if (j.datenschutz_url) e.datenschutz_url = j.datenschutz_url;
    try { if (window.einZeichnen) window.einZeichnen(); } catch (x) {}
    if (window.czMissionen) setTimeout(window.czMissionen, 50);
    if (window.czVertrauenNeu) setTimeout(window.czVertrauenNeu, 1500);
  }
  function fertig(j, text) {
    uebernehmen(j); zeichnen(); meldung(text, true);
    ZU_T = setTimeout(zu, 1400);
  }
  function los(knopf) {
    if (JETZT === 'av') {
      var n = ($('bst-name') || {}).value || '';
      if (n.trim().length < 3) { meldung('Bitte Ihren vollen Namen angeben. Er steht im Vertrag.', false); return; }
      senden({ av_vertrag: true, av_name: n.trim(), gelesen: true }, knopf).then(function (j) { fertig(j, 'Vertrag abgeschlossen.'); }, function () {});
    } else if (JETZT === 'datenschutz') {
      senden({ bestaetigen: 'datenschutz', gelesen: true }, knopf).then(function (j) { fertig(j, 'Bestätigt.'); }, function () {});
    } else if (JETZT === 'loeschfrist') {
      var r = document.querySelector('input[name="bst-frist"]:checked');
      if (!r) { meldung('Bitte eine Frist wählen.', false); return; }
      senden({ bestaetigen: 'loeschfrist', loeschfrist_monate: +r.value, gelesen: true }, knopf).then(function (j) { fertig(j, 'Gespeichert.'); }, function () {});
    } else if (JETZT === 'mail') {
      var m = (($('bst-mail') || {}).value || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(m)) { meldung('Die Adresse sieht nicht wie eine E-Mail aus.', false); return; }
      senden({ bestaetigen: 'mail', mail_haupt: m, gelesen: true }, knopf).then(function (j) { fertig(j, 'Gespeichert.'); }, function () {});
    }
  }
  function urlSpeichern(v, knopf) {
    if (v !== 'clickzauber') {
      v = String(v || '').trim();
      if (!v) { meldung('Bitte die Adresse eingeben.', false); return; }
      if (!/^[a-z]+:\/\//i.test(v)) v = 'https://' + v;
      v = v.replace(/^http:\/\//i, 'https://');
      if (!/^https:\/\/[^\/\s]+\.[^\/\s]{2,}/i.test(v)) { meldung('Das sieht nicht wie eine Internetadresse aus. Beispiel: ihre-seite.de/datenschutz', false); return; }
    }
    senden({ datenschutz_url: v }, knopf).then(function (j) {
      if (!j.datenschutz_url && v !== 'clickzauber') j.datenschutz_url = v;
      if (j.bestaetigt === undefined && E().bestaetigt && (E().datenschutz_url || '') !== (j.datenschutz_url || '')) { var b = Object.assign({}, E().bestaetigt); delete b.datenschutz; j.bestaetigt = b; }
      DS_NEU = false; uebernehmen(j); zeichnen();
      if (!j.datenschutz_url && v === 'clickzauber' && !istDemo()) {
        fetch(window.API + '/einstellungen?token=' + encodeURIComponent(window.token)).then(function (r) { return r.json(); }).then(function (x) {
          var u = x && x.einstellungen && x.einstellungen.datenschutz_url; if (u) { E().datenschutz_url = u; if (x.einstellungen.bestaetigt !== undefined) E().bestaetigt = x.einstellungen.bestaetigt; uebernehmen({}); if (JETZT === 'datenschutz') zeichnen(); }
        }).catch(function () {});
      }
    }, function () {});
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if (!t.closest) return;
    if ((x = t.closest('[data-bestaetigen]'))) { ev.preventDefault(); oeffnen(x.getAttribute('data-bestaetigen')); return; }
    if (!t.closest('#bst')) return;
    if (t.closest('[data-bst-zu]')) { zu(); return; }
    if (t.closest('#bst-neu')) { location.reload(); return; }
    if (t.closest('[data-view]')) { zu(); return; }
    if ((x = t.closest('#bst-los'))) { los(x); return; }
    if ((x = t.closest('#bst-url-los'))) { urlSpeichern(($('bst-url') || {}).value, x); return; }
    if ((x = t.closest('#bst-ohne'))) { urlSpeichern('clickzauber', x); return; }
    if (t.closest('#bst-anders')) { DS_NEU = true; zeichnen(); return; }
    if (t.closest('#bst-zurueck')) { DS_NEU = false; zeichnen(); return; }
    if (t.closest('#bst-kopie')) {
      var s = baustein();
      try { navigator.clipboard.writeText(s).then(function () { meldung('Absatz kopiert.', true); }, function () { meldung('Kopieren hat nicht geklappt. Bitte den Text markieren.', false); }); } catch (e) { meldung('Kopieren hat nicht geklappt. Bitte den Text markieren.', false); }
    }
  });
  document.addEventListener('change', function (ev) { if (ev.target && (ev.target.id === 'bst-haken')) knopfStand(); });
  document.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'bst-name') knopfStand(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && JETZT) zu(); });

  /* Einstellungen: kleine „Bestätigen“-Knöpfe und das Pflicht-Schild beim Datenschutz-Link */
  function stand() {
    var e = E(); if (!e) return;
    document.querySelectorAll('[data-best-offen]').forEach(function (b) { b.hidden = !!window.czBestaetigt(b.getAttribute('data-best-offen')); });
    var i = $('s-ds-url'), p = i && i.closest('.setrow') && i.closest('.setrow').querySelector('.pflicht');
    if (p && e.datenschutz_url && !window.czBestaetigt('datenschutz')) { p.classList.remove('ok'); p.textContent = 'noch bestätigen'; }
  }
  var altEin = window.einZeichnen;
  if (altEin) window.einZeichnen = function () { var r = altEin.apply(this, arguments); try { stand(); } catch (x) {} return r; };
  setTimeout(function () { if (E() && window.einZeichnen) { try { window.einZeichnen(); } catch (x) {} } else stand(); if (window.czMissionen) window.czMissionen(); }, 0);

  /* Aus dem Vertragstext (av-vertrag.html) oder einer Mail: clickzauber-cockpit-live.html#bestaetigen-av */
  function ausAdresse() {
    var m = (location.hash || '').match(/^#bestaetigen-(av|datenschutz|loeschfrist|mail)$/);
    if (!m) return;
    if (!window.token || !E()) { ausAdresse.n = (ausAdresse.n || 0) + 1; if (ausAdresse.n < 30) setTimeout(ausAdresse, 500); return; }
    try { if (window.show) window.show('recht'); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search + '#recht'); } catch (e) {}
    oeffnen(m[1]);
  }
  addEventListener('hashchange', ausAdresse);
  setTimeout(ausAdresse, 900);
})();
