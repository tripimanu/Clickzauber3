/* clickzauber — WhatsApp aus dem Cockpit öffnen und danach nachfragen.
   · Handy und Tablet: direkt die WhatsApp-App (whatsapp://send). Bisher ging dafür ein Browserfenster
     auf (wa.me). Nach dem Zurückkommen blieb es leer stehen, oben links nur „Fertig“.
   · Computer: WhatsApp Web in einem neuen Tab wie bisher.
   · Gehört die Nachricht zu einem Termin, fragt das Cockpit beim Zurückkommen groß nach, ob sie raus ist.
     Der Merker liegt im Browserspeicher (cz_wa_rueck), damit die Frage auch nach einem Neuladen kommt.
   · Beispiel-Cockpit: ohne Telefonnummer. WhatsApp zeigt nur den fertigen Text, man wählt selbst, an wen. */
(function () {
  'use strict';
  if (window.czWaAuf) return;
  var MERK = 'cz_wa_rueck', GUELTIG = 3 * 3600e3, WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var NAME = { google: 'Google Kalender', microsoft: 'Outlook', icloud: 'Apple Kalender' };
  var $ = function (i) { return document.getElementById(i); };
  var B = null, AKT = null, UHR = 0, WARTE = 0;

  function mobil() { var u = navigator.userAgent || ''; return /Android|iPhone|iPad|iPod/i.test(u) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function tok() { return (typeof token !== 'undefined' && token) || window.token || ''; }
  function demo() { return tok() === 'demo' || /[?&]demo=1/.test(location.search); }
  function api() { return (typeof API !== 'undefined' && API) || 'https://clickzauber-api.vercel.app/api'; }
  function teile(url) {
    var m = String(url || '').match(/^https:\/\/wa\.me\/(\d*)\/?(?:\?text=([^&#]*))?/);
    if (!m) return null;
    var t = m[2] || ''; try { t = decodeURIComponent(t); } catch (x) {}
    return { n: m[1] || '', text: t };
  }
  function ziel(url) {
    var p = teile(url); if (!p) return url;
    /* Beispiel: erfundene Nummern nie anschreiben. Nur die eigene, die man im Formular unter „Teilen“ eingetragen hat. */
    var eig = demo() && window.czDemoEigeneNummer ? czDemoEigeneNummer() : '';
    var n = demo() && !(eig && p.n.slice(-8) === eig) ? '' : p.n, t = p.text ? encodeURIComponent(p.text) : '';
    if (mobil()) return 'whatsapp://send?' + [n ? 'phone=' + n : '', t ? 'text=' + t : ''].filter(Boolean).join('&');
    return 'https://wa.me/' + n + (t ? '?text=' + t : '');
  }
  function lesen() {
    try { var m = JSON.parse(localStorage.getItem(MERK) || 'null'); if (m && m.id && Date.now() - m.ts < GUELTIG && !!m.demo === demo()) return m; } catch (x) {}
    return null;
  }
  function merken(m) { try { if (m) localStorage.setItem(MERK, JSON.stringify(m)); else localStorage.removeItem(MERK); } catch (x) {} }
  function termin(id) { return (window.czSaTermin && czSaTermin(id)) || (window.czZtTermin && czZtTermin(id)) || null; }

  function auf(url, info) {
    var z = ziel(url);
    try { if (demo() && window.czDemoMerk) czDemoMerk('WhatsApp geöffnet' + (z.indexOf('phone=') > 0 || /wa\.me\/\d/.test(z) ? ' (an eigene Nummer)' : '')); } catch (x) {}
    if (info && info.id != null) {
      merken({ id: String(info.id), name: info.name || '', datum: info.datum || '', zeit: info.zeit || '', art: info.art || '', url: url, ts: Date.now(), demo: demo() });
      clearTimeout(UHR); UHR = setTimeout(pruefen, 1500);
    }
    if (z.indexOf('whatsapp:') === 0) location.href = z;
    else window.open(z, '_blank', 'noopener');
  }
  window.czWaAuf = auf;
  window.czWaMobil = mobil;
  /* Anfragen ohne Uhrzeit (Food Truck, Location, Handwerk): Nachfrage „Geschickt?“ ohne Server.
     „Noch nicht“ merkt sich das Gerät 7 Tage (cz_wa_offen); die Karte zeigt dann „WhatsApp noch nicht verschickt“. */
  var OFFEN = 'cz_wa_offen';
  function offenAlle() { try { var o = JSON.parse(localStorage.getItem(OFFEN) || '{}'); var n = {}; Object.keys(o).forEach(function (k) { if (Date.now() - o[k].ts < 7 * 864e5) n[k] = o[k]; }); return n; } catch (x) { return {}; } }
  function offenSetzen(id, w) { var o = offenAlle(); if (w) o[id] = w; else delete o[id]; try { localStorage.setItem(OFFEN, JSON.stringify(o)); } catch (x) {} try { window.dispatchEvent(new CustomEvent('cz-wa-offen', { detail: { id: id } })); } catch (x) {} }
  window.czWaOffen = function (id) { return offenAlle()[String(id)] || null; };
  window.czWaMerken = function (url, info) {
    if (!info || info.id == null) return;
    merken({ id: String(info.id), name: info.name || '', datum: info.datum || '', zeit: info.zeit || '', art: info.art || '', url: url, ts: Date.now(), demo: demo() });
  };
  /* Hat das Speichern nicht geklappt, darf nicht gefragt werden, ob der Termin bestätigt ist. */
  window.czWaVergessen = function (id) {
    var m = lesen(); if (m && (id == null || m.id === String(id))) merken(null);
    if (B && !B.hidden && AKT && (id == null || AKT.id === String(id))) zu();
  };

  /* Jeder WhatsApp-Link im Cockpit. Hängt an window statt document, damit er nach allen anderen Klick-Helfern läuft. */
  window.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a[href^="https://wa.me/"]'); if (!a) return;
    var id = a.getAttribute('data-bid'), t = id ? termin(id) : null;
    var info = id ? { id: id, name: t && t.name, datum: t && t.datum, zeit: t && t.zeit, art: a.getAttribute('data-wa-art') || (t && t.status) || '' } : null;
    if (!mobil() && !info && !demo()) return;
    ev.preventDefault();
    auf(a.href, info);
  });

  function wann(m) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.datum || '')) return '';
    var d = new Date(m.datum + 'T12:00:00');
    return WT[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + (m.zeit ? ' um ' + m.zeit + ' Uhr' : '');
  }
  function texte(art) {
    if (art === 'lead-angebot') return { f: 'Haben Sie das Angebot per WhatsApp geschickt?', ok: 'Erledigt', t: 'Antwortet der Kunde nicht, erinnert clickzauber Sie nach 3 Tagen.' };
    if (art === 'lead-ausweich') return { f: 'Haben Sie den Vorschlag per WhatsApp geschickt?', ok: 'Erledigt', t: 'Sobald der Kunde einen Tag wählt, kommt eine Nachricht aufs Handy.' };
    if (art === 'lead-absage') return { f: 'Haben Sie die Absage per WhatsApp geschickt?', ok: 'Erledigt', t: '' };
    if (art === 'lead-best') return { f: 'Haben Sie die Bestätigung per WhatsApp geschickt?', ok: 'Erledigt', t: '' };
    if (/^lead-/.test(art || '')) return { f: 'Haben Sie die Nachricht per WhatsApp geschickt?', ok: 'Erledigt', t: '' };
    if (art === 'fest') return { f: 'Haben Sie den Termin per WhatsApp bestätigt?', ok: 'Bestätigt', t: 'Der Termin steht im Kalender.' };
    if (art === 'abgelehnt' || art === 'abgesagt' || art === 'zurueck') return { f: 'Haben Sie die Absage per WhatsApp geschickt?', ok: 'Erledigt', t: 'Die Zeit ist wieder frei.' };
    if (art === 'vorschlag') return { f: 'Haben Sie den Vorschlag per WhatsApp geschickt?', ok: 'Erledigt', t: 'Sagt der Kunde zu, steht der Termin fest im Kalender.' };
    return { f: 'Haben Sie die Nachricht per WhatsApp geschickt?', ok: 'Erledigt', t: '' };
  }

  var css = document.createElement('style');
  css.textContent = ''
    + '.czw{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,16,10,.6)}.czw[hidden]{display:none}'
    + '.czw-box{width:min(460px,100%);max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);overflow:auto;box-sizing:border-box;background:var(--panel,#fff);color:var(--ink,#1d1a14);border:1px solid var(--line-2,#ddd);border-radius:22px;padding:26px 22px 20px;box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:var(--fd,inherit);text-align:center}'
    + '.czw-box:focus{outline:none}.czw-box [hidden]{display:none!important}'
    + '.czw-wer{margin:0 0 8px;font-size:14.5px;font-weight:600;color:var(--ink-2,#555);text-wrap:pretty}.czw-wer:empty{display:none}'
    + '.czw-box h2{margin:0 0 20px;font-size:23px;line-height:1.25;letter-spacing:-.02em;text-wrap:balance}'
    + '.czw-t{margin:-8px 0 20px;font-size:15.5px;line-height:1.5;color:var(--ink-2,#555);text-wrap:pretty}.czw-t:empty{display:none}'
    + '.czw-ja{display:flex;align-items:center;justify-content:center;width:100%;min-height:68px;border:0;border-radius:16px;background:var(--accent,#2f6b4f);color:var(--on-accent,#fff);font:inherit;font-size:22px;font-weight:700;cursor:pointer}'
    + '.czw-ja:disabled{opacity:.6}.czw-ja:focus-visible,.czw-zwei button:focus-visible{outline:3px solid var(--accent,#2f6b4f);outline-offset:3px}'
    + '.czw-zwei{display:flex;gap:10px;margin-top:10px}'
    + '.czw-zwei button{flex:1 1 0;min-width:0;min-height:52px;padding:0 10px;border:1.5px solid var(--line-2,#ddd);border-radius:14px;background:none;color:var(--ink,#1d1a14);font:inherit;font-size:15.5px;font-weight:600;cursor:pointer}'
    + '.czw-m{margin:12px 0 0;font-size:14.5px;font-weight:600;color:var(--ink-2,#555)}.czw-m:empty{display:none}.czw-m.bad{color:var(--bad,#c0392b)}'
    + '.czw-ok{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:color-mix(in srgb,var(--accent,#2f6b4f) 16%,transparent);color:var(--accent,#2f6b4f);font-size:32px;font-weight:700}'
    + 'html.czw-sperre,html.czw-sperre body{overflow:hidden}'
    + '@media(max-width:760px){.czw{align-items:flex-end;padding:0}.czw-box{width:100%;max-height:92vh;max-height:92dvh;border-radius:22px 22px 0 0;padding:24px 18px calc(18px + env(safe-area-inset-bottom,0px))}}';
  document.head.appendChild(css);

  function bauen() {
    if (B) return;
    B = document.createElement('div'); B.className = 'czw'; B.id = 'czw'; B.hidden = true;
    B.innerHTML = '<div class="czw-box" role="dialog" aria-modal="true" aria-labelledby="czw-h" tabindex="-1">'
      + '<div id="czw-frage"><p class="czw-wer" id="czw-wer"></p><h2 id="czw-h"></h2>'
      + '<button type="button" class="czw-ja" data-czw="ja">Ja</button>'
      + '<div class="czw-zwei"><button type="button" data-czw="nein">Noch nicht</button><button type="button" data-czw="nochmal">WhatsApp öffnen</button></div>'
      + '<p class="czw-m" id="czw-m" role="status"></p></div>'
      + '<div id="czw-fertig" hidden><div class="czw-ok" aria-hidden="true">✓</div><h2 id="czw-fh"></h2><p class="czw-t" id="czw-ft"></p>'
      + '<button type="button" class="czw-ja" data-czw="zu">Fertig</button>'
      + '<div class="czw-zwei" id="czw-kal"><button type="button" data-czw="kalender">Im Kalender ansehen</button></div></div>'
      + '</div>';
    document.body.appendChild(B);
    B.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-czw]'); if (!b) return;
      var w = b.getAttribute('data-czw');
      if (w === 'ja') ja(b);
      else if (w === 'nein') nein();
      else if (w === 'nochmal') { if (AKT && AKT.url) auf(AKT.url, AKT); }
      else if (w === 'kalender') kalender();
      else zu();
    });
  }
  function meld(t, bad) { var x = $('czw-m'); if (x) { x.textContent = t || ''; x.className = 'czw-m' + (bad ? ' bad' : ''); } }
  function fokus(sel) { setTimeout(function () { var x = B && B.querySelector(sel); if (x) x.focus(); }, 40); }
  function zeigen(m) {
    bauen(); AKT = m;
    $('czw-wer').textContent = [m.name, wann(m)].filter(Boolean).join(' · ');
    $('czw-h').textContent = texte(m.art).f;
    $('czw-frage').hidden = false; $('czw-fertig').hidden = true; meld('');
    B.querySelector('[data-czw="ja"]').disabled = false;
    B.hidden = false; document.documentElement.classList.add('czw-sperre');
    fokus('.czw-box');
  }
  function zu() { if (!B) return; B.hidden = true; AKT = null; document.documentElement.classList.remove('czw-sperre'); }
  function nein() {
    var m = AKT; merken(null); zu();
    if (m && /^lead-/.test(m.art || '')) { offenSetzen(m.id, { url: m.url, art: m.art, name: m.name, datum: m.datum, ts: Date.now() }); return; }
    if (m) document.querySelectorAll('[data-gs]').forEach(function (s) { if (s.getAttribute('data-gs') === m.id) s.textContent = 'Steht in der Terminliste als „Kunde noch nicht informiert“.'; });
  }
  function post(d) {
    d.token = tok();
    return fetch(api() + '/termine', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); });
  }
  function ja(b) {
    var m = AKT; if (!m) { zu(); return; }
    if (/^lead-/.test(m.art || '')) { merken(null); offenSetzen(m.id, null); fertig(m); return; }
    b.disabled = true; meld('Wird gespeichert …');
    (window.czBescheid ? czBescheid(m.id) : post({ aktion: 'bescheid', id: m.id })).then(function (j) {
      b.disabled = false;
      if (!j || !j.ok) { meld('Das hat nicht geklappt' + (j && j.error ? ' (' + String(j.error).slice(0, 100) + ')' : '') + '. Bitte noch einmal tippen.', true); return; }
      merken(null); fertig(m);
    }).catch(function () { b.disabled = false; meld('Keine Verbindung. Bitte noch einmal tippen.', true); });
  }
  function abo() { var f = $('abo2-fertig'); return !!(f && !f.hidden); }
  function fertig(m) {
    var tx = texte(m.art), fest = m.art === 'fest';
    $('czw-fh').textContent = tx.ok; $('czw-ft').textContent = tx.t;
    $('czw-kal').hidden = !fest || !/^\d{4}-\d{2}-\d{2}$/.test(m.datum || '');
    $('czw-frage').hidden = true; $('czw-fertig').hidden = false;
    fokus('#czw-fertig .czw-ja');
    if (!fest) return;
    if (demo()) { $('czw-ft').textContent = 'Der Termin steht im Kalender. Im echten Konto steht er nach wenigen Sekunden auch in Ihrem Apple-, Google- oder Outlook-Kalender, wenn Sie ihn verbunden haben.'; return; }
    fetch(api() + '/kalender-direkt?token=' + encodeURIComponent(tok())).then(function (r) { return r.json(); }).then(function (j) {
      if (!B || B.hidden || $('czw-fertig').hidden) return;
      var n = (j && NAME[j.art]) || 'eigenen Kalender';
      $('czw-ft').textContent = j && j.ok && j.verbunden
        ? (j.fehler ? 'Der Termin steht im clickzauber-Kalender. Die Übertragung in Ihren ' + n + ' hat zuletzt nicht geklappt. Bitte die Kalender-Verbindung prüfen.' : 'Der Termin steht im Kalender und in wenigen Sekunden auch in Ihrem ' + n + '.')
        : abo() ? 'Der Termin steht im Kalender. Ihr Kalender-Abo holt ihn beim nächsten Abgleich ab.'
        : 'Der Termin steht im Kalender. Tipp: Verbinden Sie Ihren Apple-, Google- oder Outlook-Kalender, dann steht jeder Termin auch dort.';
    }).catch(function () {});
  }
  function kalender() {
    var m = AKT; zu();
    /* Seit 21.10.2026: Nach der Rückkehr aus WhatsApp kam das „Zurück“ fürs geschlossene Termin-Blatt oft verspätet an und
       schaltete wieder auf „Heute“. Deshalb 2 Sekunden kein Zurück (czNavSperre) und erst nach dem Schließen umschalten. */
    /* 21.10.2026 nachgebessert: Das Blatt nimmt beim Schließen seinen Verlaufs-Eintrag zurück (history.back, bis zu 250 ms später).
       Kam das nach dem Umschalten an, sprang das Cockpit zurück auf „Heute“. Jetzt: länger sperren, später umschalten und
       nach 1,5 Sekunden prüfen, ob der Kalender wirklich offen ist, sonst noch einmal. */
    window.czNavSperre = Date.now() + 4000;
    var sa = $('sa'), x = $('sa-zu'); if (sa && !sa.hidden && x) x.click();
    var dt = $('dt'), dx = dt && dt.querySelector('[data-dt-zu]'); if (dt && !dt.hidden && dx) dx.click();
    function hin() {
      if (window.show) show('kalender');
      if (m && window.czKalenderTag && /^\d{4}-\d{2}-\d{2}$/.test(m.datum || '')) setTimeout(function () {
        try { czKalenderTag(m.datum); } catch (e) {}
        setTimeout(function () { var k = $('kv-tag'); if (k) window.scrollTo({ top: Math.max(0, k.getBoundingClientRect().top + window.pageYOffset - 80), behavior: 'smooth' }); }, 150);
      }, 80);
      else window.scrollTo(0, 0);
    }
    setTimeout(hin, 600);
    setTimeout(function () { var v = document.querySelector('.view.on'); if (!v || v.getAttribute('data-v') !== 'kalender') hin(); }, 1800);
  }

  function pruefen() {
    var m = lesen(); if (!m) return;
    if (!tok()) { if (WARTE++ < 30) setTimeout(pruefen, 500); return; }
    if (B && !B.hidden && AKT && AKT.id === m.id) return;
    zeigen(m);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(pruefen, 250); });
  window.addEventListener('pageshow', function () { setTimeout(pruefen, 400); });
  window.addEventListener('focus', function () { setTimeout(pruefen, 300); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && B && !B.hidden) { if ($('czw-fertig').hidden) nein(); else zu(); } });
  setTimeout(pruefen, 2000);
})();
