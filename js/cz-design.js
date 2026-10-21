/* clickzauber — Aussehen wählen (Konfigurator, nach den Seiten).
   Das fertige Formular groß auf dunklem Grund, zum Durchklicken wie ein Kunde.
   Darunter dieselbe Auswahl wie auf der Startseite: Weiß oder sieben Stimmungen,
   sieben Farben, sechs Schriften. „Speichern“ legt alles ab und führt ins Cockpit.
   Braucht aus dem Konfigurator: cfg, save, nameFehlt, zumBetriebsnamen, toast,
   entwurfSichern, loadFont und window.czVorschau. */
(function () {
  'use strict';
  var STIMMUNG = [
    { id: 'blank', n: 'Weiß', a: '#1c1a14', g: 'linear-gradient(#fff,#fff)' },
    { id: 'glass-milk', n: 'Garten', a: '#2f7d59', g: 'radial-gradient(120% 90% at 25% 0%,rgba(170,200,150,.55),transparent 55%),radial-gradient(100% 80% at 90% 20%,rgba(90,130,100,.6),transparent 60%),linear-gradient(180deg,#4a6349,#1e2b1f)' },
    { id: 'glass-milk-blush', n: 'Rosé', a: '#a8566a', g: 'radial-gradient(120% 90% at 25% 0%,rgba(240,200,205,.55),transparent 55%),radial-gradient(100% 80% at 88% 15%,rgba(200,140,150,.55),transparent 60%),linear-gradient(180deg,#8a6068,#2f2024)' },
    { id: 'glass-milk-sand', n: 'Sand', a: '#a8543c', g: 'radial-gradient(120% 90% at 20% 0%,rgba(240,220,190,.6),transparent 55%),radial-gradient(100% 80% at 88% 20%,rgba(200,170,130,.55),transparent 60%),linear-gradient(180deg,#a08a6c,#4a3c2c)' },
    { id: 'glass-milk-blue', n: 'Blau', a: '#2f6d8a', g: 'radial-gradient(120% 90% at 20% 0%,rgba(150,180,210,.5),transparent 55%),radial-gradient(100% 80% at 85% 15%,rgba(70,95,140,.6),transparent 60%),linear-gradient(180deg,#3d4d6b,#1a2233)' },
    { id: 'glass-milk-sunset', n: 'Abendrot', a: '#b3452e', g: 'radial-gradient(120% 90% at 15% 0%,rgba(255,196,140,.55),transparent 55%),radial-gradient(110% 80% at 90% 10%,rgba(214,120,90,.6),transparent 60%),linear-gradient(180deg,#8a5a44,#3a2820)' },
    { id: 'glass-milk-lake', n: 'See', a: '#1f7a7d', g: 'radial-gradient(120% 90% at 20% 0%,rgba(180,205,205,.5),transparent 55%),radial-gradient(100% 80% at 85% 25%,rgba(90,135,140,.55),transparent 60%),linear-gradient(180deg,#4c6d70,#1c2b2c)' },
    { id: 'glass-milk-lavender', n: 'Lavendel', a: '#6b5b8a', g: 'radial-gradient(120% 90% at 25% 0%,rgba(215,205,235,.55),transparent 55%),radial-gradient(100% 80% at 88% 15%,rgba(150,135,180,.55),transparent 60%),linear-gradient(180deg,#7b6f97,#2b2436)' }
  ];
  var FARBEN = ['#2f7d59', '#a8566a', '#b3452e', '#2f6d8a', '#8a6a2f', '#6b5b8a', '#1f7a7d'];
  /* q = Schrift der Fragen, a = Schrift der Antworten. Alle ruhig und gut lesbar. */
  var SCHRIFT = [
    { n: 'Elegant', q: 'Marcellus', a: 'DM Sans' },
    { n: 'Romantisch', q: 'Cormorant Garamond', a: 'Josefin Sans' },
    { n: 'Klar', q: 'Space Grotesk', a: 'Space Grotesk' },
    { n: 'Klassisch', q: 'Source Serif 4', a: 'Source Sans 3' },
    { n: 'Sachlich', q: 'IBM Plex Sans', a: 'IBM Plex Sans' },
    { n: 'Modern', q: 'Manrope', a: 'Manrope' }
  ];
  var $ = function (i) { return document.getElementById(i); };
  var box = null, LAEUFT = false;

  function css() {
    var s = document.createElement('style');
    s.textContent = '#design{min-height:100vh;min-height:100dvh;background:var(--c-bg);color:var(--c-ink)}#design[hidden]{display:none}'
      + '.dz-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--c-card);border-bottom:1px solid var(--c-line)}'
      + '.dz-zur{display:flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border:1px solid var(--c-line);border-radius:999px;background:none;color:var(--c-ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer}'
      + '.dz-sp{flex:1 1 auto}'
      + '.dz-undo{display:flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border:1px solid var(--c-line);border-radius:999px;background:var(--c-card);color:var(--c-ink);font:inherit;font-size:14px;cursor:pointer}.dz-undo:disabled{opacity:.4;cursor:default}.dz-undo svg{width:18px;height:18px}'
      + '.dz-wkopf{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 -6px}.dz-wkopf b{font-size:15px;font-weight:600}'
      + '.dz-save{min-height:44px;padding:0 22px;border:0;border-radius:999px;background:var(--c-accent);color:#14120d;font:inherit;font-size:15px;font-weight:700;cursor:pointer}.dz-save:disabled{opacity:.75;cursor:default}'
      + '.dz-in{max-width:760px;margin:0 auto;padding:24px 16px 72px;display:flex;flex-direction:column;gap:20px}'
      + '.dz-kopf{display:flex;flex-direction:column;gap:8px;text-align:center}'
      + '.dz-eb{margin:0;font-family:var(--fm);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--c-accent)}'
      + '.dz-kopf h1{margin:0;font-size:clamp(23px,5.4vw,30px);line-height:1.2;letter-spacing:-.02em}'
      + '.dz-kopf p:last-child{margin:0 auto;max-width:540px;font-size:15px;line-height:1.55;color:var(--c-ink2);text-wrap:pretty}'
      + '.dz-halt{width:100%}'
      + '.dz-wahl{display:flex;flex-direction:column;gap:20px;background:var(--c-card);border:1px solid var(--c-line);border-radius:22px;padding:20px}'
      + '.dz-row{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;align-items:center}'
      + '.dz-h{font-family:var(--fm);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--c-ink2)}'
      + '.dz-moods{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px}'
      + '.dz-mood{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;padding:0;border:0;background:none;color:var(--c-ink2);font:inherit;font-size:11.5px;cursor:pointer}'
      + '.dz-mood i{display:block;width:100%;aspect-ratio:1;border-radius:12px;background-size:cover;background-position:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}'
      + '.dz-mood em{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal}'
      + '.dz-mood.on i{box-shadow:0 0 0 2px var(--c-card),0 0 0 4px var(--c-accent)}.dz-mood.on em{color:var(--c-ink);font-weight:600}'
      + '.dz-acs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}'
      + '.dz-ac{aspect-ratio:1;min-height:44px;padding:0;border:0;border-radius:12px;cursor:pointer}.dz-ac.on{box-shadow:0 0 0 2px var(--c-card),0 0 0 4px #fff}'
      + '.dz-fps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'
      + '.dz-fp{min-height:52px;padding:0 10px;border:1.5px solid transparent;border-radius:999px;background:#fff;color:#27241d;font-size:17px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.dz-fp.on{background:#e6f4ec;border-color:#2f7d59;color:#1f5c42;box-shadow:0 0 0 2px var(--c-accent)}'
      + '.dz-unten{display:flex;flex-direction:column;align-items:center;gap:10px}'
      + '.dz-unten .dz-save{width:100%;max-width:420px;min-height:54px;font-size:16px}'
      + '.dz-unten p{margin:0;font-size:13.5px;line-height:1.5;color:var(--c-ink2);text-align:center;text-wrap:pretty}'
      + '.dz-fehl{margin:0;padding:40px 10px;font-size:14px;line-height:1.6;color:var(--c-ink2);text-align:center}'
      + '@media(max-width:640px){.dz-row{grid-template-columns:minmax(0,1fr);gap:10px}.dz-moods{grid-template-columns:repeat(4,minmax(0,1fr))}.dz-fps{grid-template-columns:repeat(2,minmax(0,1fr))}.dz-wahl{padding:16px}.dz-ac{aspect-ratio:auto}}';
    document.head.appendChild(s);
  }

  function bauen() {
    if (box) return;
    css();
    box = document.createElement('div');
    box.id = 'design'; box.hidden = true;
    box.innerHTML = '<div class="dz-bar"><button type="button" class="dz-zur" data-dz="zurueck">← Seiten</button><span class="dz-sp"></span><button type="button" class="dz-undo" data-dz="undo" disabled aria-label="Rückgängig: vorheriges Aussehen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>Rückgängig</button><button type="button" class="dz-save" data-dz="speichern">Speichern</button></div>'
      + '<div class="dz-in">'
      + '<div class="dz-kopf"><p class="dz-eb">Letzter Schritt</p><h1>So sieht Ihr Formular aus</h1><p>Klicken Sie sich durch wie ein Kunde. Darunter wählen Sie das Aussehen: schlicht in Weiß oder mit Stimmung, Farbe und Schrift.</p></div>'
      + '<div class="dz-halt" id="dzHalt" data-no-tr></div>'
      + '<div class="dz-wahl"><div class="dz-wkopf"><b>Aussehen</b><button type="button" class="dz-undo" data-dz="undo" disabled aria-label="Rückgängig: vorheriges Aussehen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>Rückgängig</button></div>'
      + '<div class="dz-row"><span class="dz-h">Stimmung</span><div class="dz-moods" id="dzMoods"></div></div>'
      + '<div class="dz-row"><span class="dz-h">Farbe</span><div class="dz-acs" id="dzAcs"></div></div>'
      + '<div class="dz-row"><span class="dz-h">Schrift</span><div class="dz-fps" id="dzFps"></div></div>'
      + '</div>'
      + '<div class="dz-unten"><button type="button" class="dz-save" data-dz="speichern">Speichern</button><p>Danach geht es in Ihr Cockpit. Dort schalten Sie das Formular live.</p></div>'
      + '</div>';
    var app = $('app');
    if (app && app.parentNode) app.parentNode.insertBefore(box, app.nextSibling); else document.body.appendChild(box);
    box.addEventListener('click', klick);
  }

  /* Rückgängig (seit 13.10.2026): jede Wahl merkt das Aussehen davor, der Pfeil holt es Schritt für Schritt zurück. */
  var VERLAUF = [];
  function undoZeichnen() { if (box) box.querySelectorAll('[data-dz="undo"]').forEach(function (b) { b.disabled = !VERLAUF.length; }); }
  function th() { cfg.theme = cfg.theme || {}; return cfg.theme; }
  function klein(s) { return String(s || '').toLowerCase(); }

  function wahlZeichnen() {
    var t = th();
    $('dzMoods').innerHTML = STIMMUNG.map(function (m) {
      var on = t.skin === m.id;
      return '<button type="button" class="dz-mood' + (on ? ' on' : '') + '" data-mood="' + m.id + '" aria-pressed="' + on + '"><i style="background-image:' + m.g + '"></i><em>' + m.n + '</em></button>';
    }).join('');
    $('dzAcs').innerHTML = FARBEN.map(function (c) {
      var on = klein(t.accent) === c;
      return '<button type="button" class="dz-ac' + (on ? ' on' : '') + '" data-ac="' + c + '" style="background:' + c + '" aria-label="Farbe ' + c + '" aria-pressed="' + on + '"></button>';
    }).join('');
    $('dzFps').innerHTML = SCHRIFT.map(function (f, i) {
      var on = t.font === f.q && (t.fontAnswer || t.font) === f.a;
      return '<button type="button" class="dz-fp' + (on ? ' on' : '') + '" data-fp="' + i + '" style="font-family:\'' + f.q + '\',serif" aria-pressed="' + on + '">' + f.n + '</button>';
    }).join('');
  }

  function vorschauNeu() {
    var h = $('dzHalt'); if (!h) return;
    h.innerHTML = '';
    try { window.czVorschau.starten(h, cfg, (cfg.theme && cfg.theme.logo) || cfg.logo || null); }
    catch (e) { h.innerHTML = '<p class="dz-fehl">Die Vorschau lässt sich gerade nicht aufbauen. Ihre Auswahl wird trotzdem gespeichert.</p>'; }
  }
  /* Nur das Aussehen umstellen: Der Kunde bleibt auf der Seite, auf der er gerade klickt. */
  function lookAnwenden() {
    var el = document.querySelector('#dzHalt .vs');
    if (!el) { vorschauNeu(); return; }
    var t = th(), fq = t.font, fa = t.fontAnswer || t.font;
    el.className = el.className.split(/\s+/).filter(function (k) { return k && k.indexOf('sk-') !== 0; }).join(' ') + (t.skin ? ' sk-' + t.skin : '');
    if (t.accent) el.style.setProperty('--sk-accent', t.accent); else el.style.removeProperty('--sk-accent');
    el.style.fontFamily = fa ? '"' + fa + '",system-ui,sans-serif' : '';
    if (fq) el.style.setProperty('--vs-fq', '"' + fq + '",system-ui,sans-serif');
    if (typeof loadFont === 'function') { loadFont(fq); loadFont(fa); }
  }

  function klick(ev) {
    var b = ev.target.closest('[data-mood],[data-ac],[data-fp],[data-dz]'); if (!b) return;
    var t = th();
    if (b.hasAttribute('data-dz')) {
      var w = b.getAttribute('data-dz');
      if (w === 'undo') { if (!VERLAUF.length) return; cfg.theme = VERLAUF.pop(); wahlZeichnen(); lookAnwenden(); undoZeichnen(); try { entwurfSichern(); } catch (x) {} return; }
      if (w === 'zurueck') zurueck(true); else if (w === 'speichern') speichern();
      return;
    }
    var vorher = JSON.stringify(t);
    if (b.hasAttribute('data-mood')) {
      var m = STIMMUNG.filter(function (x) { return x.id === b.getAttribute('data-mood'); })[0]; if (!m) return;
      t.skin = m.id; t.accent = m.a; delete t.eigen;
    } else if (b.hasAttribute('data-ac')) {
      t.accent = b.getAttribute('data-ac');
      if (t.eigen) delete t.eigen.knopf;
    } else {
      var f = SCHRIFT[+b.getAttribute('data-fp')]; if (!f) return;
      t.font = f.q; t.fontAnswer = f.a;
      if (t.eigen) delete t.eigen.schrift;
    }
    if (JSON.stringify(th()) !== vorher) { VERLAUF.push(JSON.parse(vorher)); if (VERLAUF.length > 30) VERLAUF.shift(); }
    wahlZeichnen(); lookAnwenden(); undoZeichnen();
    try { entwurfSichern(); } catch (x) {}
  }

  window.zumDesign = function () {
    if (!cfg) return;
    var fehlt = typeof nameFehlt === 'function' ? nameFehlt(cfg.betrieb) : '';
    if (fehlt) { toast(fehlt, true); if (typeof zumBetriebsnamen === 'function') zumBetriebsnamen(); return; }
    var wn = $('wname');
    cfg.name = ((wn && wn.value) || '').trim() || cfg.name || 'Mein Anfrage-Formular';
    try { entwurfSichern(); } catch (x) {}
    bauen();
    ['hub', 'pick', 'app'].forEach(function (i) { var x = $(i); if (x) x.style.display = 'none'; });
    box.hidden = false;
    if (typeof loadFont === 'function') SCHRIFT.forEach(function (f) { loadFont(f.q); });
    VERLAUF = []; undoZeichnen();
    wahlZeichnen(); vorschauNeu(); lookAnwenden();
    window.scrollTo(0, 0);
    try { history.pushState({ czDesign: 1 }, ''); } catch (x) {}
  };

  function zurueck(perKnopf) {
    if (!box || box.hidden) return;
    box.hidden = true;
    var a = $('app'); if (a) a.style.display = 'block';
    window.scrollTo(0, 0);
    if (perKnopf) { try { if (history.state && history.state.czDesign) history.back(); } catch (x) {} }
  }
  /* Für Fehler, die auf die Seiten zurückführen (z. B. Betriebsname fehlt). */
  window.czDesignZu = function () { zurueck(true); };
  /* Zurück am Handy führt zuerst zu den Seiten, nicht aus dem Konfigurator heraus. */
  window.addEventListener('popstate', function () { if (box && !box.hidden) zurueck(false); });

  function knoepfe(text, aus) {
    box.querySelectorAll('[data-dz="speichern"]').forEach(function (b) { b.textContent = text; b.disabled = aus; });
  }
  /* Speichern übernimmt save() im Konfigurator; danach geht es ins Cockpit (window._czWeiter). */
  function speichern() {
    var sb = $('saveBtn');
    if (LAEUFT || typeof save !== 'function' || !sb) return;
    LAEUFT = true; knoepfe('Speichert …', true);
    window._czNachDesign = true; window._czWeiter = false;
    try { save(); } catch (x) { LAEUFT = false; window._czNachDesign = false; knoepfe('Speichern', false); return; }
    var t0 = Date.now();
    var iv = setInterval(function () {
      if (window._czWeiter) { clearInterval(iv); knoepfe('Gespeichert', true); return; }
      if (Date.now() - t0 < 300 || (sb.disabled && Date.now() - t0 < 15000)) return;
      clearInterval(iv); LAEUFT = false; window._czNachDesign = false; knoepfe('Speichern', false);
    }, 200);
  }
})();
