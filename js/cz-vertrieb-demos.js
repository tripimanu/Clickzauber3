/* clickzauber — Vertrieb: persönliche Demo-Zugänge (lib/demo-zugang.js, sql/55).
   Anlegen, per WhatsApp schicken, jeden Klick nachlesen, Hinweise schicken, verlängern, sperren, löschen,
   Pilotplatz zusätzlich vergeben. Nutzt API und key aus clickzauber-vertrieb.html.
   Seit 05.10.2026 im Reiter „Demos“ (js/cz-vertrieb-kennzahlen.js): Suche und Filter, Versand wird festgehalten,
   Links für Facebook-Gruppen (clickzauber.de/g/2001, demo_qr.art 'link', sql/62). Die Auswertung steht im Reiter „Kennzahlen“. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var BR = { friseur: 'Friseur & Barbier', kosmetik: 'Kosmetik, Nägel & Wimpern', catering: 'Food Truck & Catering', hochzeit: 'Hochzeit & Location', handwerk: 'Handwerk & Solar', beratung: 'Makler & Finanzen' };
  var L = [], OFFEN = null, UHR = 0, QRL = [], FILTER = null, FTXT = '', FST = 'alle', MEHR = false;
  var FILT = [['alle', 'Alle'], ['persoenlich', 'Persönlich'], ['link', 'Aus Links'], ['qr', 'Aus QR-Codes'], ['zu', 'Noch nicht geöffnet'], ['pilot', 'Pilot']];
  function k() { return (typeof key !== 'undefined' && key) || ''; }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function link(z) { return 'https://clickzauber.de/demo?z=' + z.code + '&branche=' + (z.branche || 'friseur'); }
  function zeit(t) { if (!t) return '–'; var d = new Date(t); return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
  function rest(z) { return Math.ceil((new Date(z.laeuft_ab).getTime() - Date.now()) / 864e5); }
  function status(z) {
    if (z.gesperrt_am) return ['Gesperrt', 'bad'];
    if (rest(z) <= 0) return ['Abgelaufen', 'aus'];
    if (z.pilot_am) return ['Pilot', 'gut'];
    if (z.feedback) return ['Nichts für ihn', 'warn'];
    if (!z.erstmals_am) return ['Noch nicht geöffnet', 'aus'];
    return ['Geöffnet', 'gut'];
  }
  function waNr(t) { var n = String(t || '').replace(/\D/g, ''); if (n.indexOf('00') === 0) n = n.slice(2); else if (n.charAt(0) === '0') n = '49' + n.slice(1); return n; }
  function waText(z) { return 'Hallo, hier ist Manuel von clickzauber. Wie besprochen Ihr persönlicher Zugang zur Beta. Er gilt ' + (rest(z) > 0 ? rest(z) : 7) + ' Tage: ' + link(z); }

  var css = document.createElement('style');
  css.textContent = ''
    + '#demoCard{margin:0 0 16px}#demoCard h2{display:flex;align-items:baseline;gap:8px}'
    + '.dz-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:0 0 12px}'
    + '.dz-form label,.dz-box label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--ink-2)}'
    + '.dz-form input,.dz-form select,.dz-box input,.dz-box textarea{background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:11px;padding:10px 12px;font:inherit;font-size:14.5px;color:var(--ink);min-height:44px}'
    + '.dz-box textarea{min-height:80px;resize:vertical}'
    + '.dz-b{min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid var(--line-2);background:none;color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}'
    + '.dz-b.go{background:var(--accent);border-color:transparent;color:#10130f}.dz-b.bad{color:var(--bad,#e2735f);border-color:color-mix(in srgb,var(--bad,#e2735f) 45%,transparent)}'
    + '.dz-kn{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
    + '.dz-msg{font-size:13px;color:var(--ink-2);min-height:1.3em;margin:6px 0 0}.dz-msg.bad{color:var(--bad,#e2735f)}'
    + '.dz-neu{margin:10px 0 4px;padding:12px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line-2);display:flex;flex-direction:column;gap:10px}.dz-neu code{word-break:break-all;font-size:13px}'
    + '.dz-liste{display:flex;flex-direction:column;gap:8px;margin-top:14px}'
    + '.dz-z{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;text-align:left;width:100%;padding:12px 14px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line);color:var(--ink);font:inherit;cursor:pointer}'
    + '.dz-z:hover{border-color:var(--line-2)}.dz-z b{font-size:14.5px}.dz-z small{grid-column:1/-1;font-size:12.5px;color:var(--ink-2)}'
    + '.dz-st{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--line-2);white-space:nowrap}'
    + '.dz-st.gut{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}.dz-st.bad{color:var(--bad,#e2735f)}.dz-st.warn{color:#e8b54d}.dz-st.aus{color:var(--ink-2)}'
    + '.dz-m{position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,10,7,.66)}.dz-m[hidden]{display:none}'
    + '@media(min-width:640px){.dz-m{align-items:center}}'
    + '.dz-box{width:100%;max-width:640px;max-height:92vh;max-height:92dvh;overflow:auto;box-sizing:border-box;background:var(--panel);border:1px solid var(--line-2);border-radius:20px 20px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom))}'
    + '@media(min-width:640px){.dz-box{border-radius:20px}}'
    + '.dz-box h2{margin:0 0 4px;font-size:19px}.dz-box h3{margin:18px 0 8px;font-size:14px}.dz-box .cs{margin:0 0 12px;font-size:13px;color:var(--ink-2)}'
    + '.dz-probe{display:flex;flex-wrap:wrap;gap:6px}.dz-probe span{font-size:12.5px;padding:5px 10px;border-radius:99px;border:1px solid var(--line-2);color:var(--ink-2)}.dz-probe span.ja{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}'
    + '.dz-zeit{display:flex;flex-direction:column;border-left:2px solid var(--line-2);margin-left:4px}'
    + '.dz-e{display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;padding:4px 0 4px 12px;font-size:13.5px}.dz-e time{font-family:var(--fm,monospace);font-size:12px;color:var(--ink-2);padding-top:1px}.dz-e i{font-style:normal;color:var(--ink-2);font-size:12px}'
    + '.dz-e.x span{font-weight:700;color:var(--accent)}.dz-e.s span{color:var(--ink-2)}'
    + '.dz-sz{margin:12px 0 4px;font-size:12.5px;font-weight:700;color:var(--ink-2)}'
    + '.dz-fb{padding:12px;border-radius:12px;background:var(--panel-2);font-size:14px;line-height:1.5;white-space:pre-wrap}'
    + '.dz-nr{font-family:var(--fm,monospace);font-size:.92em;color:var(--accent);letter-spacing:.02em}'
    + '.qr-z{display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px 14px;align-items:start;padding:12px 14px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line)}'
    + '.qr-bild{width:76px;height:76px;background:#fff;border-radius:8px;padding:5px;box-sizing:border-box}.qr-bild svg{width:100%;height:100%;display:block}'
    + '.qr-z h3{margin:0 0 2px;font-size:15px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.qr-z p{margin:0 0 10px;font-size:12.5px;color:var(--ink-2)}'
    + '.qr-z .dz-kn{grid-column:1/-1}.qr-z .dz-b{min-height:40px;padding:0 12px;font-size:13px}'
    + '@media(min-width:700px){.qr-z .dz-kn{grid-column:2}}'
    + '.dz-such{margin:16px 0 0;display:flex;flex-direction:column;gap:10px}.dz-such input{width:100%;box-sizing:border-box;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;color:var(--ink);min-height:44px}.dz-such .fil{margin:0}'
    + '.qr-z.lk-z{grid-template-columns:minmax(0,1fr)}.qr-z.lk-z .dz-kn{grid-column:1/-1}.dz-mehr{align-self:flex-start}';
  document.head.appendChild(css);

  function karte() {
    if ($('demoCard')) return;
    var ziel = window.czVtSeite ? window.czVtSeite('demos') : null, g = document.querySelector('.wrap .grid'); if (!ziel && !g) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'demoCard';
    c.innerHTML = '<h2>Demo-Zugänge <span class="zn-anz" id="dzAnz"></span></h2>'
      + '<p class="cs">Persönlicher Link für einen Interessenten. Gilt 7 oder 14 Tage, lässt sich verlängern und jederzeit sperren. 30 Tage nach Ablauf wird er mit allen Klicks gelöscht. Ein Pilotplatz kommt zu den automatischen hinzu, wenn Sie ihn vergeben.</p>'
      + '<div class="dz-form"><label>Betrieb<input id="dzBetrieb" maxlength="80" placeholder="Salon Bella"></label>'
      + '<label>Branche<select id="dzBranche"><option value="friseur">Friseur &amp; Barbier</option><option value="kosmetik">Kosmetik, Nägel &amp; Wimpern</option><option value="catering">Food Truck &amp; Catering</option><option value="hochzeit">Hochzeit &amp; Location</option><option value="handwerk">Handwerk &amp; Solar</option><option value="beratung">Makler &amp; Finanzen</option></select></label>'
      + '<label>Laufzeit<select id="dzTage"><option value="7">7 Tage</option><option value="14">14 Tage</option></select></label>'
      + '<label>Handynummer (für WhatsApp)<input id="dzTel" type="tel" maxlength="40" inputmode="tel"></label>'
      + '<label>Notiz<input id="dzNotiz" maxlength="500" placeholder="z. B. Gespräch im Laden"></label></div>'
      + '<div class="dz-kn"><button type="button" class="dz-b go" id="dzAnlegen">Zugang anlegen</button></div>'
      + '<p class="dz-msg" id="dzMsg" role="status"></p><div id="dzNeu"></div>'
      + '<div class="dz-such"><input type="search" id="dzSuche" autocomplete="off" placeholder="Suchen: Betrieb, Name, Telefon, Nummer" aria-label="Demos suchen"><div class="fil" id="dzFil">'
      + FILT.map(function (f, i) { return '<button type="button" data-dzf="' + f[0] + '"' + (i ? '' : ' class="on"') + '>' + f[1] + '</button>'; }).join('') + '</div></div>'
      + '<div class="dz-liste" id="dzListe"></div>';
    if (ziel) ziel.appendChild(c); else g.parentNode.insertBefore(c, g);
    $('dzAnlegen').onclick = anlegen;
    $('dzListe').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-dzmehr]')) { MEHR = true; liste(); return; }
      var b = ev.target.closest('[data-dz]'); if (b) oeffnen(b.getAttribute('data-dz'));
    });
    $('dzSuche').addEventListener('input', function () { FTXT = this.value.trim().toLowerCase(); liste(); });
    $('dzFil').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-dzf]'); if (!b) return;
      FST = b.getAttribute('data-dzf');
      [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
      liste();
    });
  }
  function meld(t, bad) { var m = $('dzMsg'); m.textContent = t || ''; m.className = 'dz-msg' + (bad ? ' bad' : ''); }
  function post(d) {
    d.key = k();
    return fetch(api() + '/demo-zugang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Antwort unlesbar (' + r.status + ')' }; }); })
      .catch(function () { return { ok: false, error: 'Keine Verbindung.' }; });
  }
  function laden() {
    if (!k()) return Promise.resolve();
    return fetch(api() + '/demo-zugang?aktion=liste&key=' + encodeURIComponent(k())).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { meld(j && j.error ? 'Liste lädt nicht: ' + j.error + (/demo_zugaenge/.test(j.error) ? ' (sql/55 in Supabase ausführen)' : '') : 'Liste lädt nicht.', true); return; }
      L = j.zugaenge || []; liste();
    }).catch(function () { meld('Keine Verbindung zum Server.', true); });
  }
  function liste() {
    var LL = L.filter(passt), ZL = MEHR || FTXT || FST !== 'alle' || FILTER ? LL : LL.slice(0, 12);
    $('dzAnz').textContent = L.length ? L.length : '';
    $('dzListe').innerHTML = (FILTER ? '<div class="dz-kn" style="justify-content:space-between"><b>Nur Demos aus ' + (istLinkNr(FILTER) ? 'Link ' : 'QR-Code ') + FILTER + ' (' + LL.length + ')</b><button type="button" class="dz-b" data-qrf="">Alle zeigen</button></div>' : '')
      + (ZL.length ? ZL.map(function (z) {
      var s = status(z), r = rest(z);
      return '<button type="button" class="dz-z" data-dz="' + esc(z.code) + '"><b>' + (z.qr_nr ? '<span class="dz-nr">' + esc(qrNr(z)) + '</span> ' : '') + esc(titelVon(z)) + (z.gast_am ? ' · ' + esc(z.gast_vorname + ' ' + z.gast_nachname) : '') + '</b><span class="dz-st ' + s[1] + '">' + s[0] + '</span>'
        + '<small>' + esc(BR[z.branche] || z.branche || '') + ' · ' + (z.gesperrt_am ? 'gesperrt ' + zeit(z.gesperrt_am) : r > 0 ? 'noch ' + r + (r === 1 ? ' Tag' : ' Tage') : 'abgelaufen')
        + (z.erstmals_am ? ' · ' + (z.aufrufe || 0) + '× geöffnet, ' + (z.klicks || 0) + ' Klicks · zuletzt ' + zeit(z.zuletzt_am) : '')
        + verschicktText(z)
        + ((z.geraete || []).length > 1 ? ' · <b style="color:#e8b54d">⚠ ' + z.geraete.length + ' Geräte</b>' : '')
        + ((z.fragen || []).length ? ' · ' + z.fragen.length + (z.fragen.length === 1 ? ' Frage' : ' Fragen') : '') + '</small></button>';
    }).join('') + (ZL.length < LL.length ? '<button type="button" class="dz-b dz-mehr" data-dzmehr>Alle ' + LL.length + ' zeigen</button>' : '') : '<p class="leer">' + (L.length ? 'Nichts gefunden.' : 'Noch keine Demo-Zugänge.') + '</p>');
  }
  function istLinkNr(nr) { return !!nr && QRL.some(function (q) { return q.nr === nr && q.art === 'link'; }); }
  function quelleVon(z) { return z.quelle === 'link' || istLinkNr(z.qr_nr) ? 'link' : z.qr_nr ? 'qr' : 'persoenlich'; }
  function titelVon(z) {
    if (quelleVon(z) !== 'link' || z.gast_am) return z.betrieb;
    var q = QRL.filter(function (x) { return x.nr === z.qr_nr; })[0];
    return 'Ohne Namen' + (q && q.notiz ? ' · ' + q.notiz : '');
  }
  function verschicktText(z) {
    var v = z.verschickt || []; if (!v.length) return '';
    var x = v[v.length - 1];
    return ' · ' + (x.weg === 'whatsapp' ? 'per WhatsApp verschickt' : 'Link kopiert') + ' ' + zeit(x.am);
  }
  function passt(z) {
    if (FILTER && z.qr_nr !== FILTER) return false;
    if (FST === 'persoenlich' || FST === 'link' || FST === 'qr') { if (quelleVon(z) !== FST) return false; }
    else if (FST === 'zu' && z.erstmals_am) return false;
    else if (FST === 'pilot' && !z.pilot_am) return false;
    if (!FTXT) return true;
    var t = [z.betrieb, z.gast_vorname, z.gast_nachname, z.telefon, z.gast_telefon, z.notiz, z.qr_nr ? qrNr(z) : ''].join(' ').toLowerCase();
    if (t.indexOf(FTXT) >= 0) return true;
    var zf = FTXT.replace(/\D/g, '');
    return zf.length >= 3 && t.replace(/\D/g, '').indexOf(zf) >= 0;
  }
  function qrNr(z) { return z.qr_nr + '-' + String(z.qr_lfd || 0).padStart(3, '0'); }
  function anlegen() {
    var b = $('dzAnlegen'), betrieb = $('dzBetrieb').value.trim();
    if (betrieb.length < 2) { meld('Bitte den Namen des Betriebs eintragen.', true); $('dzBetrieb').focus(); return; }
    b.disabled = true; meld('Wird angelegt …');
    post({ aktion: 'neu', betrieb: betrieb, branche: $('dzBranche').value, tage: +$('dzTage').value || 7, telefon: $('dzTel').value.trim(), notiz: $('dzNotiz').value.trim() }).then(function (j) {
      b.disabled = false;
      if (!j.ok) { meld(j.error || 'Hat nicht geklappt.', true); return; }
      meld(''); ['dzBetrieb', 'dzTel', 'dzNotiz'].forEach(function (i) { $(i).value = ''; }); $('dzTage').value = '7';
      $('dzNeu').innerHTML = '<div class="dz-neu"><span>Zugang für <b>' + esc(j.zugang.betrieb) + '</b> steht:</span><code>' + esc(link(j.zugang)) + '</code>' + teilenKn(j.zugang) + '</div>';
      laden();
    });
  }
  function teilenKn(z) {
    var n = waNr(z.telefon);
    return '<div class="dz-kn">' + (n ? '<a class="dz-b go" target="_blank" rel="noopener" data-dzweg="whatsapp" data-dzz="' + esc(z.code) + '" href="https://wa.me/' + n + '?text=' + encodeURIComponent(waText(z)) + '">Per WhatsApp schicken</a>' : '<a class="dz-b go" target="_blank" rel="noopener" data-dzweg="whatsapp" data-dzz="' + esc(z.code) + '" href="https://wa.me/?text=' + encodeURIComponent(waText(z)) + '">Per WhatsApp schicken</a>')
      + '<button type="button" class="dz-b" data-dzweg="kopiert" data-dzz="' + esc(z.code) + '" data-kopie="' + esc(link(z)) + '">Link kopieren</button></div>';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-kopie]'); if (!b) return;
    var t = b.getAttribute('data-kopie');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Kopiert'; }, function () { window.prompt('Link kopieren:', t); });
  });

  /* Versand festhalten (sql/62): WhatsApp geöffnet oder Link kopiert */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-dzweg]'); if (!b || !b.getAttribute('data-dzz')) return;
    post({ aktion: 'verschickt', z: b.getAttribute('data-dzz'), weg: b.getAttribute('data-dzweg') }).then(function (j) { if (j && j.ok) laden(); });
  });

  /* ── Einzelner Zugang ── */
  var PROBE = [
    ['Formular gebaut', function (e) { return e.some(function (x) { return /Formular gespeichert/.test(x.was); }); }],
    ['Formular geteilt', function (e) { return e.some(function (x) { return /Teilen geöffnet/.test(x.was); }); }],
    ['Anfrage abgeschickt', function (e) { return e.some(function (x) { return /Anfrage im eigenen Formular/.test(x.was); }); }],
    ['Push angetippt', function (e) { return e.some(function (x) { return /Push-Nachricht angetippt/.test(x.was); }); }],
    ['Termin angenommen', function (e) { return e.some(function (x) { return x.art === 'klick' && /^(Annehmen|Termin annehmen|Bestätigen)/i.test(x.was || ''); }); }],
    ['Frage gestellt', function (e) { return e.some(function (x) { return /^Frage an Manuel:/.test(x.was || ''); }); }],
    ['Will es nutzen', function (e) { return e.some(function (x) { return /Will clickzauber nutzen/.test(x.was || ''); }); }],
    ['WhatsApp geöffnet', function (e) { return e.some(function (x) { return /WhatsApp geöffnet/.test(x.was); }); }],
    ['Kalender', function (e) { return e.some(function (x) { return /kalender/i.test(x.seite || '') || /Bereich: kalender/.test(x.was); }); }],
    ['Anfragen', function (e) { return e.some(function (x) { return /leads/i.test(x.seite || '') || /Bereich: leads/.test(x.was); }); }],
    ['Zeiten & Team', function (e) { return e.some(function (x) { return /zeiten|team/i.test(x.seite || ''); }); }],
    ['Einstellungen', function (e) { return e.some(function (x) { return /settings|einstellung/i.test(x.seite || ''); }); }]
  ];
  function oeffnen(code) {
    var z = L.filter(function (x) { return x.code === code; })[0]; if (!z) return;
    OFFEN = code;
    var m = $('dzM');
    if (!m) {
      m = document.createElement('div'); m.id = 'dzM'; m.className = 'dz-m'; document.body.appendChild(m);
      m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.closest('[data-dzzu]')) zu(); });
      m.addEventListener('click', aktion);
    }
    var s = status(z);
    m.innerHTML = '<div class="dz-box" role="dialog" aria-modal="true"><div class="dz-kn" style="justify-content:space-between"><h2>' + (z.qr_nr ? '<span class="dz-nr">' + esc(qrNr(z)) + '</span> ' : '') + esc(z.betrieb) + '</h2><button type="button" class="dz-b" data-dzzu="1">Schließen</button></div>'
      + '<p class="cs"><span class="dz-st ' + s[1] + '">' + s[0] + '</span> · ' + esc(BR[z.branche] || '') + ' · angelegt ' + zeit(z.erstellt_am) + ' · gültig bis ' + zeit(z.laeuft_ab) + ' · wird am ' + new Date(new Date(z.laeuft_ab).getTime() + 30 * 864e5).toLocaleDateString('de-DE') + ' gelöscht'
      + (z.telefon ? ' · ' + esc(z.telefon) : '') + (z.notiz ? '<br>' + esc(z.notiz) : '') + '</p>'
      + (z.gast_am ? '<p class="cs"><b style="color:var(--ink)">Eingetragen: ' + esc(z.gast_vorname + ' ' + z.gast_nachname) + '</b> · <a href="tel:' + esc(z.gast_telefon) + '" style="color:var(--accent)">' + esc(z.gast_telefon) + '</a> · ' + zeit(z.gast_am) + (z.vertraulich_am ? ' · Vertraulichkeit bestätigt' : '') + '</p>' : '<p class="cs">Hat sich noch nicht eingetragen.</p>')
      + geraeteHTML(z)
      + ((z.fragen || []).length ? '<h3>Fragen an Sie</h3><p class="cs">' + z.fragen.slice().reverse().map(function (f) { return zeit(f.ts) + (f.seite ? ' · ' + esc(f.seite) : '') + '<br><b style="color:var(--ink)">' + esc(f.text) + '</b>'; }).join('<br><br>') + '</p>' : '')
      + teilenKn(z)
      + '<h3>Ausprobiert</h3><div class="dz-probe" id="dzProbe"><span>Lädt …</span></div>'
      + '<h3>Zeit je Bereich</h3><div id="dzZeit"><p class="cs">Lädt …</p></div>'
      + (z.feedback ? '<h3>Feedback „Nichts für mich“</h3><div class="dz-fb">' + esc(['Nicht gefallen: ' + (z.feedback.schlecht || '–'), 'Warum nicht: ' + (z.feedback.warum || '–'), 'Müsste anders sein: ' + (z.feedback.anders || '–'), 'Gut war: ' + (z.feedback.gut || '–')].join('\n\n')) + '</div>' : '')
      + '<h3>Hinweis an ihn schicken</h3><p class="cs">Erscheint in seiner Demo oben, sobald sie offen ist (spätestens nach 45 Sekunden).</p>'
      + '<label><textarea id="dzHinweis" maxlength="600" placeholder="z. B. Tippen Sie mal unten auf „Formulare“ und bauen Sie Ihr eigenes."></textarea></label>'
      + '<div class="dz-kn"><button type="button" class="dz-b go" data-a="hinweis">Hinweis senden</button></div>'
      + ((z.hinweise || []).length ? '<p class="cs" style="margin-top:8px">' + z.hinweise.map(function (h) { return zeit(h.ts) + ': ' + esc(h.text) + (h.gelesen ? ' ✓ gelesen' : ' · noch nicht gelesen'); }).join('<br>') + '</p>' : '')
      + '<h3>Steuern</h3><div class="dz-kn">'
      + '<button type="button" class="dz-b" data-a="verlaengern">+ 7 Tage</button>'
      + (z.gesperrt_am ? '<button type="button" class="dz-b" data-a="entsperren">Entsperren</button>' : '<button type="button" class="dz-b bad" data-a="sperren">Sofort sperren</button>')
      + '<button type="button" class="dz-b bad" data-a="loeschen">Komplett löschen</button></div>'
      + '<h3>Pilotplatz geben</h3><p class="cs">' + (z.pilot_am ? 'Vergeben am ' + zeit(z.pilot_am) + ' an ' + esc(z.pilot_email) + '.' : 'Erst, wenn er ein Konto angelegt hat. Zählt nicht zu den automatischen Plätzen.') + '</p>'
      + (z.pilot_am ? '' : '<div class="dz-kn"><input id="dzPilotMail" type="email" placeholder="E-Mail seines Kontos" style="flex:1 1 220px"><button type="button" class="dz-b go" data-a="pilot">Pilotplatz geben</button></div>')
      + '<p class="dz-msg" id="dzMMsg" role="status"></p>'
      + '<h3>Jeder Klick <span class="zn-anz" id="dzLive"></span></h3><div id="dzVerlauf"><p class="cs">Lädt …</p></div></div>';
    m.hidden = false;
    verlauf();
    clearInterval(UHR); UHR = setInterval(verlauf, 20000);
  }
  function zu() { var m = $('dzM'); if (m) m.hidden = true; OFFEN = null; clearInterval(UHR); }
  function mmeld(t, bad) { var x = $('dzMMsg'); if (x) { x.textContent = t || ''; x.className = 'dz-msg' + (bad ? ' bad' : ''); } }
  function aktion(ev) {
    var b = ev.target.closest && ev.target.closest('[data-a]'); if (!b || !OFFEN) return;
    var a = b.getAttribute('data-a'), d = { aktion: a, z: OFFEN };
    if (a === 'hinweis') { d.text = ($('dzHinweis').value || '').trim(); if (!d.text) { mmeld('Bitte einen Hinweis eintragen.', true); return; } }
    if (a === 'pilot') d.email = ($('dzPilotMail').value || '').trim();
    if (a === 'loeschen' && !confirm('Zugang und alle Klicks endgültig löschen? Der Link funktioniert danach nicht mehr.')) return;
    if (a === 'sperren' && !confirm('Zugang sofort sperren? Ist die Demo gerade offen, schließt sie sich innerhalb einer Minute.')) return;
    b.disabled = true; mmeld('Einen Moment …');
    post(d).then(function (j) {
      b.disabled = false;
      if (!j.ok) { mmeld(j.error || 'Hat nicht geklappt.', true); return; }
      if (a === 'loeschen') { zu(); laden(); return; }
      var code = OFFEN;
      laden().then(function () { if (code) oeffnen(code); mmeld(a === 'hinweis' ? 'Hinweis ist unterwegs.' : 'Gespeichert.'); });
    });
  }
  function verlauf() {
    var code = OFFEN; if (!code) return;
    fetch(api() + '/demo-zugang?aktion=verlauf&z=' + encodeURIComponent(code) + '&key=' + encodeURIComponent(k())).then(function (r) { return r.json(); }).then(function (j) {
      if (OFFEN !== code || !j || !j.ok) return;
      var e = j.ereignisse || [];
      $('dzProbe').innerHTML = PROBE.map(function (p) { return '<span class="' + (p[1](e) ? 'ja' : '') + '">' + (p[1](e) ? '✓ ' : '') + p[0] + '</span>'; }).join('');
      $('dzZeit').innerHTML = zeitHTML(e);
      var letzt = e.length ? new Date(e[e.length - 1].ts).getTime() : 0;
      $('dzLive').textContent = e.length + (letzt && Date.now() - letzt < 120000 ? ' · gerade aktiv' : '');
      if (!e.length) { $('dzVerlauf').innerHTML = '<p class="cs">Noch keine Klicks.</p>'; return; }
      var h = '', sz = null;
      e.slice().reverse().forEach(function (x) {
        var tag = new Date(x.ts).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
        var kopf = tag + (x.sitzung ? ' · Besuch ' + x.sitzung.slice(0, 4) : '');
        if (kopf !== sz) { if (sz !== null) h += '</div>'; h += '<p class="dz-sz">' + esc(kopf) + '</p><div class="dz-zeit">'; sz = kopf; }
        var cl = x.art === 'schritt' ? 'x' : x.art === 'seite' ? 's' : '';
        h += '<div class="dz-e ' + cl + '"><time>' + new Date(x.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</time><div><span>' + esc(x.was || '') + '</span>' + (x.seite ? ' <i>' + esc(x.seite) + '</i>' : '') + '</div></div>';
      });
      $('dzVerlauf').innerHTML = h + '</div>';
    }).catch(function () {});
  }

  /* ── Gesamtauswertung über alle Demos ── */
  function auswertungKarte() {
    if ($('dzAusw') || window.czVtSeite) return;   // steht jetzt im Reiter „Kennzahlen“
    var dc = $('demoCard'); if (!dc) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'dzAusw'; c.style.margin = '0 0 16px';
    c.innerHTML = '<div class="dz-kn" style="justify-content:space-between"><h2>Auswertung aller Demos</h2><button type="button" class="dz-b" id="dzAuswLaden">Auswerten</button></div>'
      + '<p class="cs">Was ausprobiert wird und wo die Leute aufhören. Letzte 180 Tage.</p><div id="dzAuswInhalt"></div>';
    dc.parentNode.insertBefore(c, dc.nextSibling);
    $('dzAuswLaden').onclick = auswerten;
  }
  function balken(t, n, von, rechts) {
    var p = von ? Math.round(n / von * 100) : 0;
    return '<div style="display:grid;grid-template-columns:150px minmax(0,1fr) 110px;gap:10px;align-items:center;font-size:13px;margin:0 0 6px"><span>' + esc(t) + '</span><span style="height:8px;border-radius:99px;background:var(--line-2);overflow:hidden"><i style="display:block;height:100%;width:' + Math.max(2, p) + '%;background:var(--accent)"></i></span><span style="text-align:right;color:var(--ink-2)">' + (rechts || n + ' von ' + von + ' (' + p + ' %)') + '</span></div>';
  }
  function auswerten() {
    var b = $('dzAuswLaden'), box = $('dzAuswInhalt'); b.disabled = true; box.innerHTML = '<p class="cs">Wird ausgewertet …</p>';
    fetch(api() + '/demo-zugang?aktion=auswertung&key=' + encodeURIComponent(k())).then(function (r) { return r.json(); }).then(function (j) {
      b.disabled = false;
      if (!j || !j.ok) { box.innerHTML = '<p class="dz-msg bad">' + esc((j && j.error) || 'Auswertung lädt nicht.') + '</p>'; return; }
      var n = j.mit_klicks || 0;
      if (!n) { box.innerHTML = '<p class="cs">Noch keine Klicks aus Demos.</p>'; return; }
      box.innerHTML = '<p class="cs">' + j.zugaenge + ' Zugänge · ' + j.geoeffnet + ' geöffnet · ' + j.piloten + ' Piloten · ' + j.feedback + '× „Nichts für mich“</p>'
        + '<h3 style="font-size:14px;margin:14px 0 8px">Wie weit sie kommen</h3>' + j.schritte.map(function (s) { return balken(s.n, s.z, n); }).join('')
        + '<h3 style="font-size:14px;margin:14px 0 8px">Genutzte Bereiche</h3>' + j.bereiche.map(function (x) { return balken(NAMEN[x.b] || x.b, x.zugaenge, n, x.zugaenge + ' · Ø ' + dauer(x.sek / Math.max(1, x.zugaenge))); }).join('')
        + '<h3 style="font-size:14px;margin:14px 0 8px">Hier hören sie auf</h3><p class="cs">' + j.ende.map(function (x) { return x.n + '× ' + esc(x.was); }).join('<br>') + '</p>';
    }).catch(function () { b.disabled = false; box.innerHTML = '<p class="dz-msg bad">Keine Verbindung.</p>'; });
  }

  /* Geräte: ab dem zweiten wurde der Link vielleicht weitergegeben */
  function geraeteHTML(z) {
    var G = z.geraete || []; if (!G.length) return '';
    return '<h3>Geräte' + (G.length > 1 ? ' <span class="dz-st warn">⚠ ' + G.length + ' Geräte, vielleicht weitergegeben</span>' : '') + '</h3><p class="cs">'
      + G.map(function (g, i) { return (i + 1) + '. ' + esc(g.typ + (g.sys ? ', ' + g.sys : '') + ', ' + g.br) + (g.ort ? ' · ' + esc(g.ort) : '') + ' · zuerst ' + zeit(g.erst) + ', zuletzt ' + zeit(g.zuletzt) + ' (' + (g.n || 1) + '×)'; }).join('<br>') + '</p>';
  }
  var NAMEN = { leads: 'Anfragen', kalender: 'Kalender', zeiten: 'Zeiten & Team', settings: 'Einstellungen', dashboard: 'Übersicht', widget: 'Formulare', konfigurator: 'Konfigurator', recht: 'Rechtliches', team: 'Team', umsatz: 'Umsatz' };
  function bereich(x) { var m = String(x.seite || '').match(/·\s*([\w-]+)/); return m ? m[1] : (/Konfigurator/.test(x.seite || '') ? 'konfigurator' : ''); }
  function dauer(s) { s = Math.round(s); return s < 60 ? s + ' Sek.' : Math.floor(s / 60) + ' Min. ' + (s % 60 ? s % 60 + ' Sek.' : ''); }
  /* Zeit je Bereich: Abstand bis zum nächsten Klick, höchstens 2 Minuten (sonst war er weg). Dazu: wo er aufgehört hat. */
  function zeitHTML(e) {
    if (!e.length) return '<p class="cs">Noch keine Daten.</p>';
    var B = {}, ges = 0;
    for (var i = 0; i < e.length; i++) {
      var b = bereich(e[i]); if (!b) continue;
      var nx = e[i + 1], dt = nx && nx.sitzung === e[i].sitzung ? Math.min(120, (new Date(nx.ts) - new Date(e[i].ts)) / 1000) : 15;
      B[b] = (B[b] || 0) + Math.max(0, dt); ges += Math.max(0, dt);
    }
    var L2 = Object.keys(B).sort(function (a, b) { return B[b] - B[a]; }), max = L2.length ? B[L2[0]] : 1;
    var letzt = e.filter(function (x) { return x.art !== 'seite'; }).pop() || e[e.length - 1];
    return '<div style="display:flex;flex-direction:column;gap:6px">' + L2.map(function (b) {
      return '<div style="display:grid;grid-template-columns:120px minmax(0,1fr) 90px;gap:10px;align-items:center;font-size:13px"><span>' + esc(NAMEN[b] || b) + '</span><span style="height:8px;border-radius:99px;background:var(--line-2);overflow:hidden"><i style="display:block;height:100%;width:' + Math.max(4, Math.round(B[b] / max * 100)) + '%;background:var(--accent)"></i></span><span style="text-align:right;color:var(--ink-2)">' + dauer(B[b]) + '</span></div>';
    }).join('') + '</div><p class="cs" style="margin-top:10px">Insgesamt etwa ' + dauer(ges) + '. Aufgehört bei: <b style="color:var(--ink)">' + esc(letzt.was || '–') + '</b>' + (bereich(letzt) ? ' (' + esc(NAMEN[bereich(letzt)] || bereich(letzt)) + ')' : '') + ', ' + zeit(letzt.ts) + '</p>';
  }

  /* ── QR-Codes: feste Vorlage, jeder Scan wird eine eigene Demo (sql/56) ── */
  function qrUrl(nr) { return 'https://clickzauber.de/q/' + nr; }
  function qrMatrix(text) { if (!window.qrcode) return null; var q = qrcode(0, 'M'); q.addData(text); q.make(); return q; }
  function qrSvg(text) {
    var q = qrMatrix(text); if (!q) return '';
    var n = q.getModuleCount(), d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" aria-hidden="true"><path d="' + d + '" fill="#111"></path></svg>';
  }
  function qrPng(nr) {
    var q = qrMatrix(qrUrl(nr)); if (!q) { alert('QR-Baustein lädt nicht. Bitte Seite neu laden.'); return; }
    var n = q.getModuleCount(), rand = 4, px = Math.floor(2000 / (n + rand * 2)), s = px * (n + rand * 2);
    var cv = document.createElement('canvas'); cv.width = cv.height = s;
    var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); x.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + rand) * px, (r + rand) * px, px, px);
    var a = document.createElement('a'); a.download = 'clickzauber-qr-' + nr + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }
  var BRO = '<option value="friseur">Friseur &amp; Barbier</option><option value="kosmetik">Kosmetik, Nägel &amp; Wimpern</option><option value="catering">Food Truck &amp; Catering</option><option value="hochzeit">Hochzeit &amp; Location</option><option value="handwerk">Handwerk &amp; Solar</option><option value="beratung">Makler &amp; Finanzen</option>';
  function qrKarte() {
    if ($('qrCard')) return;
    var dc = $('demoCard'); if (!dc) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'qrCard'; c.style.margin = '0 0 16px';
    c.innerHTML = '<h2>QR-Codes <span class="zn-anz" id="qrAnz"></span></h2>'
      + '<p class="cs">Für Visitenkarte oder Flyer. Der Code selbst ändert sich nie. Jeder, der ihn scannt, wählt seine Branche und bekommt eine eigene Demo für 7 Tage. 1005-041 ist die 41. Demo aus QR-Code 1005. Scannt dasselbe Handy noch einmal, geht seine Demo weiter.</p>'
      + '<div class="dz-form"><label>Wofür (nur für Sie)<input id="qrNotiz" maxlength="120" placeholder="z. B. Visitenkarte"></label>'
      + '<label>Branche vorschlagen<select id="qrBranche">' + BRO + '</select></label>'
      + '<label>Höchstzahl an Demos<input id="qrMax" type="number" min="1" inputmode="numeric" placeholder="leer = unbegrenzt"></label></div>'
      + '<div class="dz-kn"><button type="button" class="dz-b go" id="qrAnlegen">QR-Code anlegen</button></div>'
      + '<p class="dz-msg" id="qrMsg" role="status"></p><div class="dz-liste" id="qrListe"></div>';
    var ref = $('lkCard') || dc; ref.parentNode.insertBefore(c, ref.nextSibling);
    $('qrAnlegen').onclick = function () {
      var b = this; b.disabled = true; qrMeld('Wird angelegt …');
      post({ aktion: 'qr-neu', notiz: $('qrNotiz').value.trim(), branche: $('qrBranche').value, max: $('qrMax').value.trim() }).then(function (j) {
        b.disabled = false;
        if (!j.ok) { qrMeld((j.error || 'Hat nicht geklappt.') + (/demo_qr/.test(j.error || '') ? ' (sql/56 in Supabase ausführen)' : ''), true); return; }
        $('qrNotiz').value = ''; $('qrMax').value = ''; qrMeld('QR-Code ' + j.qr.nr + ' steht.'); qrLaden();
      });
    };
    $('qrListe').addEventListener('click', qrAktion);
  }
  /* ── Links für Facebook-Gruppen (sql/62): clickzauber.de/g/2001 ──
     Wie ein QR-Code eine feste Vorlage. Wer ihn antippt, ist sofort in einer eigenen Demo, ohne Angaben.
     Die Demo bietet nach gut anderthalb Minuten an, eine Nummer zu hinterlassen (Push an den Betreiber). */
  function linkUrl(nr) { return 'https://clickzauber.de/g/' + nr; }
  function beitrag(q) {
    return 'Wie kommen bei Ihnen Anfragen rein: per WhatsApp, Mail, Telefon, alles durcheinander? Ich habe dafür clickzauber gebaut: ein Anfrage-Formular, das alles sortiert aufs Handy bringt, mit Kalender und Antworten auf einen Tipp.\n\nWer mag, kann sich ein Beispiel ohne Anmeldung ansehen: ' + linkUrl(q.nr) + '\n\nÜber Rückmeldungen freue ich mich.';
  }
  function lkMeld(t, bad) { var m = $('lkMsg'); if (m) { m.textContent = t || ''; m.className = 'dz-msg' + (bad ? ' bad' : ''); } }
  function linkKarte() {
    if ($('lkCard')) return;
    var dc = $('demoCard'); if (!dc) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'lkCard'; c.style.margin = '0 0 16px';
    c.innerHTML = '<h2>Links für Facebook-Gruppen <span class="zn-anz" id="lkAnz"></span></h2>'
      + '<p class="cs">Ein eigener Link je Gruppe oder Beitrag. Wer ihn antippt, ist sofort in einer eigenen Demo, ohne Anmeldung. Nach gut anderthalb Minuten bietet die Demo an, eine Nummer zu hinterlassen. Dann bekommen Sie eine Push-Nachricht. Unter „Kennzahlen“ sehen Sie, welche Gruppe etwas bringt. Bitte die Regeln der Gruppe beachten: Viele erlauben Werbung nur an bestimmten Tagen.</p>'
      + '<div class="dz-form"><label>Gruppe oder Beitrag<input id="lkNotiz" maxlength="120" placeholder="z. B. FB Food Trucks Deutschland"></label>'
      + '<label>Branche<select id="lkBranche"><option value="wahl">Besucher wählt selbst</option>' + BRO + '</select></label></div>'
      + '<div class="dz-kn"><button type="button" class="dz-b go" id="lkAnlegen">Link anlegen</button></div>'
      + '<p class="dz-msg" id="lkMsg" role="status"></p><div class="dz-liste" id="lkListe"></div>';
    dc.parentNode.insertBefore(c, dc.nextSibling);
    $('lkAnlegen').onclick = function () {
      var b = this, notiz = $('lkNotiz').value.trim();
      if (notiz.length < 2) { lkMeld('Bitte eintragen, wofür der Link ist, zum Beispiel den Namen der Gruppe.', true); $('lkNotiz').focus(); return; }
      b.disabled = true; lkMeld('Wird angelegt …');
      post({ aktion: 'qr-neu', art: 'link', notiz: notiz, branche: $('lkBranche').value, max: '' }).then(function (j) {
        b.disabled = false;
        if (!j.ok) { lkMeld((j.error || 'Hat nicht geklappt.') + (/art|aufrufe|column/i.test(j.error || '') ? ' (sql/62 in Supabase ausführen)' : ''), true); return; }
        if (j.qr && j.qr.art !== 'link') { lkMeld('Angelegt, aber als QR-Code. Bitte zuerst die neue lib/demo-zugang.js zu GitHub hochladen.', true); qrLaden(); return; }
        $('lkNotiz').value = ''; lkMeld('Link ' + j.qr.nr + ' steht: ' + linkUrl(j.qr.nr).replace('https://', '')); qrLaden();
      });
    };
  }
  function lkListe() {
    var box = $('lkListe'); if (!box) return;
    var LK = QRL.filter(function (q) { return q.art === 'link'; });
    $('lkAnz').textContent = LK.length || '';
    box.innerHTML = LK.length ? LK.map(function (q) {
      var D = L.filter(function (z) { return z.qr_nr === q.nr; }), lauf = D.filter(function (z) { return !z.gesperrt_am && rest(z) > 0; }).length, kt = D.filter(function (z) { return z.gast_am; }).length, au = q.aufrufe || 0;
      return '<div class="qr-z lk-z"><div><h3><span class="dz-nr">' + q.nr + '</span>' + esc(q.notiz || 'Ohne Notiz') + '</h3>'
        + '<p>' + au + (au === 1 ? ' Aufruf' : ' Aufrufe') + ' · ' + q.scans + (q.scans === 1 ? ' Demo' : ' Demos') + (lauf ? ', ' + lauf + ' laufen' : '') + ' · ' + kt + (kt === 1 ? ' Kontakt' : ' Kontakte')
        + ' · ' + esc(q.branche === 'wahl' ? 'Besucher wählt die Branche' : BR[q.branche] || q.branche) + '<br>' + esc(linkUrl(q.nr).replace('https://', '')) + '</p></div>'
        + '<div class="dz-kn"><button type="button" class="dz-b go" data-kopie="' + esc(linkUrl(q.nr)) + '">Link kopieren</button>'
        + '<button type="button" class="dz-b" data-kopie="' + esc(beitrag(q)) + '">Beitrag kopieren</button>'
        + (q.scans ? '<button type="button" class="dz-b" data-qrf="' + q.nr + '">Demos ansehen</button>' : '') + '</div></div>';
    }).join('') : '<p class="leer">Noch keine Links.</p>';
  }
  function qrMeld(t, bad) { var m = $('qrMsg'); if (m) { m.textContent = t || ''; m.className = 'dz-msg' + (bad ? ' bad' : ''); } }
  function qrLaden() {
    if (!k()) return Promise.resolve();
    return fetch(api() + '/demo-zugang?aktion=qr-liste&key=' + encodeURIComponent(k())).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { qrMeld('QR-Codes laden nicht' + (j && j.error ? ': ' + j.error + (/demo_qr/.test(j.error) ? ' (sql/56 in Supabase ausführen)' : '') : '.'), true); return; }
      QRL = j.qr || []; qrListe(); lkListe(); if (L.length) liste();
    }).catch(function () {});
  }
  function qrListe() {
    var QQ = QRL.filter(function (q) { return q.art !== 'link'; });
    $('qrAnz').textContent = QQ.length || '';
    $('qrListe').innerHTML = QQ.length ? QQ.map(function (q) {
      var aktiv = L.filter(function (z) { return z.qr_nr === q.nr && !z.gesperrt_am && rest(z) > 0; }).length;
      return '<div class="qr-z"><div class="qr-bild">' + qrSvg(qrUrl(q.nr)) + '</div><div><h3><span class="dz-nr">' + q.nr + '</span>' + esc(q.notiz || 'Ohne Notiz') + '</h3>'
        + '<p>' + q.scans + (q.max_scans ? ' von ' + q.max_scans : '') + (q.scans === 1 ? ' Demo' : ' Demos') + (aktiv ? ', ' + aktiv + ' davon laufen' : '') + ' · Vorschlag: ' + esc(BR[q.branche] || q.branche) + '<br>' + esc(qrUrl(q.nr).replace('https://', '')) + '</p></div>'
        + '<div class="dz-kn"><button type="button" class="dz-b" data-qr="png" data-nr="' + q.nr + '">Bild (PNG)</button>'
        + '<a class="dz-b" target="_blank" rel="noopener" href="clickzauber-qr-druck.html?nr=' + q.nr + '&art=karte">Visitenkarte</a>'
        + '<a class="dz-b" target="_blank" rel="noopener" href="clickzauber-qr-druck.html?nr=' + q.nr + '&art=flyer">Flyer A6</a>'
        + '<button type="button" class="dz-b" data-kopie="' + esc(qrUrl(q.nr)) + '">Link kopieren</button>'
        + (q.scans ? '<button type="button" class="dz-b" data-qrf="' + q.nr + '">Demos ansehen</button>' : '')
        + '<button type="button" class="dz-b" data-qr="max" data-nr="' + q.nr + '">Höchstzahl</button></div></div>';
    }).join('') : '<p class="leer">Noch keine QR-Codes.</p>';
  }
  function qrAktion(ev) {
    var b = ev.target.closest('[data-qr]'); if (!b) return;
    var nr = parseInt(b.getAttribute('data-nr'), 10), q = QRL.filter(function (x) { return x.nr === nr; })[0]; if (!q) return;
    if (b.getAttribute('data-qr') === 'png') { qrPng(nr); return; }
    var v = window.prompt('Höchstzahl an Demos für QR-Code ' + nr + ' (leer = unbegrenzt). Bisher ' + q.scans + ' Demos.', q.max_scans || '');
    if (v === null) return;
    post({ aktion: 'qr-aendern', nr: nr, notiz: q.notiz || '', branche: q.branche, max: String(v).trim() }).then(function (j) { if (!j.ok) { qrMeld(j.error || 'Hat nicht geklappt.', true); return; } qrMeld('Gespeichert.'); qrLaden(); });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-qrf]'); if (!b) return;
    var v = b.getAttribute('data-qrf'); FILTER = v ? parseInt(v, 10) : null; liste();
    var c = $('demoCard'); if (c && v) window.scrollTo({ top: c.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
  });

  /* Für den Reiter „Kennzahlen“: einen Zugang direkt öffnen */
  window.czDemoOeffnen = function (code) {
    (L.some(function (z) { return z.code === code; }) ? Promise.resolve() : laden()).then(function () { oeffnen(code); });
  };

  (function start(n) {
    var app = $('app');
    if (app && app.style.display === 'block' && k()) {
      karte(); linkKarte(); qrKarte(); auswertungKarte();
      laden().then(function () { qrLaden(); var m = (location.hash || '').match(/^#demo-([a-z0-9]+)/); if (m) oeffnen(m[1]); });
      setInterval(function () { if (!OFFEN) laden().then(qrLaden); }, 60000);
      return;
    }
    if (n < 600) setTimeout(function () { start(n + 1); }, 500);
  })(0);
})();
