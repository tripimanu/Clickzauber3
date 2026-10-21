/* clickzauber · Kundenkarte (seit 04.10.2026)
   Ein Tipp auf den Namen zeigt alle Termine dieser Person: wann sie da war, was gemacht wurde, bei wem,
   ob sie nicht erschienen ist, dazu die Notiz zum Kunden. Wiedererkannt über Telefonnummer oder E-Mail
   (wie die Notiz). Reicht so weit zurück, wie die Löschfrist Termine aufbewahrt.
   Öffnen: window.czKundenkarte({ name, telefon, email }), [data-kk-zt="Termin-ID"] oder [data-kk-name] mit data-kk-tel / data-kk-mail.
   Stellen: Uhrzeit-Termine (Name), Termin-Blatt („Alle Besuche ansehen“), Stammkunden (ganze Zeile).
   Server: GET /api/termine?aktion=kunde (lib/termine.js). Im Beispiel-Cockpit kommen die Termine aus den Beispieldaten. */
(function () {
  'use strict';
  if (window.czKundenkarte) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoD(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function istDemo() { return window.token === 'demo'; }
  /* Gleiche Regel wie notizSchluessel in lib/_termine.js */
  function schl(mail, tel) {
    var k = [], m = String(mail || '').trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+$/.test(m)) k.push('m:' + m);
    var n = String(tel || '').replace(/[^\d+]/g, '');
    if (n.charAt(0) === '+') n = n.slice(1); else if (n.slice(0, 2) === '00') n = n.slice(2); else if (n.charAt(0) === '0') n = '49' + n.slice(1);
    if (n.length >= 8) k.push('t:' + n);
    return k;
  }
  var WT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  function tag(t) { return t.datum || String(t.start || '').slice(0, 10); }
  function wann(t) { return t.start ? new Date(t.start).getTime() : new Date(tag(t) + 'T' + (t.zeit || '12:00') + ':00').getTime(); }
  function datum(iso) { var d = new Date(iso + 'T12:00:00'); return WT[d.getDay()] + ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function vor(iso) {
    var h = new Date(); h.setHours(12, 0, 0, 0);
    var n = Math.round((h - new Date(iso + 'T12:00:00')) / 864e5);
    if (n <= 0) return 'heute';
    if (n === 1) return 'gestern';
    if (n < 14) return 'vor ' + n + ' Tagen';
    if (n < 60) return 'vor ' + Math.round(n / 7) + ' Wochen';
    if (n < 730) return 'vor ' + Math.round(n / 30.4) + ' Monaten';
    return 'vor ' + Math.round(n / 365) + ' Jahren';
  }
  function stand(t, jetzt) {
    if (t.status === 'fest') return wann(t) < jetzt ? (t.nicht_da ? ['nicht erschienen', 'bad'] : ['war da', 'gut']) : ['bestätigt', 'gut'];
    if (t.status === 'wunsch') return ['angefragt', 'offen'];
    if (t.status === 'vorschlag') return ['Vorschlag offen', 'offen'];
    if (t.status === 'abgelehnt') return ['abgelehnt', 'aus'];
    return ['abgesagt', 'aus'];
  }
  function haeufig(liste) {
    var z = {}, best = '', n = 0;
    liste.forEach(function (x) { if (!x) return; z[x] = (z[x] || 0) + 1; if (z[x] > n) { n = z[x]; best = x; } });
    return best;
  }

  var css = ''
    + '.kk{position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;padding:18px;font-family:var(--fd);color:var(--ink)}.kk[hidden]{display:none}'
    + '.kk .rk{position:absolute;inset:0;background:rgba(20,16,10,.45)}'
    + '.kk-pn{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 36px);display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line-2);border-radius:20px;box-shadow:0 30px 70px rgba(0,0,0,.3);overflow:hidden}'
    + '.kk-kopf{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 12px}.kk-kopf .tx{flex:1;min-width:0}'
    + '.kk-kopf span{font-family:var(--fm);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}.kk-kopf h2{margin:3px 0 0;font-size:22px;letter-spacing:-.02em;line-height:1.2;overflow-wrap:anywhere}'
    + '.kk-x{flex:0 0 auto;width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink-2);cursor:pointer;display:grid;place-items:center}'
    + '.kk-in{overflow:auto;overscroll-behavior:contain;padding:0 20px 22px;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:14px}'
    + '.kk-kn{display:flex;gap:8px;flex-wrap:wrap}.kk-kn a{flex:1 1 120px;display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:12px;border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink);text-decoration:none;font-weight:600;font-size:14.5px}.kk-kn a:hover{border-color:var(--accent);color:var(--ink)}'
    + '.kk-sum{font-size:15px;line-height:1.55;color:var(--ink-2);margin:0}.kk-sum b{color:var(--ink)}'
    + '.kk-hin{border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.5;background:var(--panel-2);border:1px solid var(--line);color:var(--ink-2)}.kk-hin b{color:var(--ink)}'
    + '.kk-hin.warn{background:color-mix(in srgb,var(--warn) 12%,transparent);border-color:color-mix(in srgb,var(--warn) 30%,var(--line))}'
    + '.kk-h{font-family:var(--fm);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 -6px}'
    + '.kk-l{display:flex;flex-direction:column}'
    + '.kk-r{display:grid;grid-template-columns:118px minmax(0,1fr) auto;gap:12px;align-items:start;padding:11px 0;border-top:1px solid var(--line)}.kk-r:first-child{border-top:0}'
    + '.kk-d b{display:block;font-size:13.5px;font-weight:600}.kk-d span{display:block;font-family:var(--fm);font-size:12px;color:var(--ink-3);margin-top:2px}'
    + '.kk-w b{display:block;font-size:14px;font-weight:600;overflow-wrap:anywhere}.kk-w span{display:block;font-size:13px;color:var(--ink-2);margin-top:2px}.kk-w i{display:block;font-style:normal;font-size:12.5px;color:var(--ink-3);margin-top:4px;overflow-wrap:anywhere}'
    + '.kk-st{font-family:var(--fm);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:3px 9px;white-space:nowrap;background:var(--panel-2);color:var(--ink-3)}'
    + '.kk-st.gut{background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--accent)}.kk-st.bad{background:color-mix(in srgb,var(--bad) 13%,transparent);color:var(--bad)}.kk-st.offen{background:color-mix(in srgb,var(--warn) 15%,transparent);color:var(--warn)}'
    + '.kk-mehr{align-self:flex-start;background:none;border:0;padding:8px 0;font:inherit;font-size:14px;font-weight:600;color:var(--accent);cursor:pointer;min-height:44px}'
    + '.kk-fuss{font-size:12.5px;line-height:1.5;color:var(--ink-3);margin:2px 0 0}'
    + '.kk-knopf{align-self:flex-start;min-height:46px;padding:0 18px;border-radius:12px;border:0;background:var(--accent);color:var(--on-accent);font:inherit;font-weight:600;cursor:pointer}'
    + '.sa-kk{display:inline-flex;align-items:center;min-height:40px;margin:-2px 0 10px;padding:0;background:none;border:0;font:inherit;font-size:14px;font-weight:600;color:var(--accent);cursor:pointer}.sa-kk[hidden]{display:none}.sa-kk::after{content:" →"}'
    + '.zt-kk{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-decoration-color:var(--ink-3);text-underline-offset:3px}.zt-kk:hover{color:var(--accent)}'
    + '.tm-sk[data-kk-name]{cursor:pointer!important}.tm-sk[data-kk-name]:hover{background:var(--panel-2)}'
    + '@media(max-width:760px){.kk{padding:0;align-items:flex-end}.kk-pn{max-width:none;max-height:calc(100% - 24px);border-radius:20px 20px 0 0}.kk-in{padding-bottom:calc(22px + env(safe-area-inset-bottom,0px))}.kk-r{grid-template-columns:minmax(0,1fr) auto}.kk-d{grid-column:1/-1;display:flex;gap:8px;align-items:baseline}.kk-d span{margin:0}}';
  var st = document.createElement('style'); st.id = 'cz-kundenkarte-css'; st.textContent = css; document.head.appendChild(st);

  var JETZT = null, ALLE = false;
  function blatt() {
    var d = $('kk');
    if (!d) {
      d = document.createElement('div'); d.id = 'kk'; d.className = 'kk'; d.hidden = true;
      d.innerHTML = '<div class="rk" data-kk-zu></div><div class="kk-pn" role="dialog" aria-modal="true" aria-labelledby="kk-name"><div class="kk-kopf"><div class="tx"><span>Kundenkarte</span><h2 id="kk-name"></h2></div>'
        + '<button class="kk-x" data-kk-zu aria-label="Schließen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="kk-in" id="kk-in"></div></div>';
      document.body.appendChild(d);
    }
    return d;
  }
  function holen(q) {
    return fetch((window.API || 'https://clickzauber-api.vercel.app/api') + '/termine?token=' + encodeURIComponent(window.token || '') + '&' + q)
      .then(function (r) { return r.json(); });
  }
  function laden(p) {
    return holen('aktion=kunde&email=' + encodeURIComponent(p.email || '') + '&telefon=' + encodeURIComponent(p.telefon || '')).catch(function () { return null; }).then(function (j) {
      if (j && j.ok && Array.isArray(j.termine) && (j.moeglich !== undefined || istDemo())) {
        return { termine: j.termine, notiz: j.moeglich !== undefined ? { notiz: j.notiz || '', plus: j.plus || 0, nicht_da: j.nicht_da || 0 } : null, kurz: false };
      }
      /* Server noch ohne Kundenkarte: die letzten drei Monate aus der Terminliste */
      var h = new Date();
      return holen('aktion=liste&von=' + isoD(new Date(h.getTime() - 91 * 864e5)) + '&bis=' + isoD(new Date(h.getTime() + 90 * 864e5))).then(function (k) {
        if (!k || !k.ok) throw k || {};
        return { termine: k.termine || [], notiz: null, kurz: true };
      });
    });
  }

  function zeile(t, jetzt) {
    var s = stand(t, jetzt), was = [t.personal_name ? 'bei ' + t.personal_name : '', t.dauer ? t.dauer + ' Min.' : ''].filter(Boolean).join(' · ');
    return '<div class="kk-r"><div class="kk-d"><b>' + esc(datum(tag(t))) + '</b><span>' + esc(t.zeit || '') + (t.zeit ? ' Uhr' : '') + '</span></div>'
      + '<div class="kk-w"><b>' + esc(t.leistung || 'Termin') + '</b>' + (was ? '<span>' + esc(was) + '</span>' : '') + (t.nachricht ? '<i>„' + esc(t.nachricht) + '“</i>' : '') + '</div>'
      + '<span class="kk-st ' + s[1] + '">' + s[0] + '</span></div>';
  }
  function zeichnen(p, r) {
    var keys = schl(p.email, p.telefon), jetzt = Date.now();
    var liste = (r.termine || []).filter(function (t) {
      if (t.eigen && t.leistung === 'Gesperrt') return false;
      return schl(t.email, t.telefon).some(function (k) { return keys.indexOf(k) >= 0; });
    }).sort(function (a, b) { return wann(b) - wann(a); });
    var kommend = liste.filter(function (t) { return wann(t) >= jetzt && (t.status === 'fest' || t.status === 'wunsch' || t.status === 'vorschlag'); }).reverse();
    var frueher = liste.filter(function (t) { return kommend.indexOf(t) < 0; });
    var besuche = frueher.filter(function (t) { return t.status === 'fest' && !t.nicht_da; });
    var nz = r.notiz || ((liste.filter(function (t) { return t.kunden_notiz; })[0] || {}).kunden_notiz) || null;
    var nichtDa = Math.max(frueher.filter(function (t) { return t.status === 'fest' && t.nicht_da; }).length, (nz && +nz.nicht_da) || 0);
    var tel = p.telefon || (liste[0] && liste[0].telefon) || '', mail = p.email || (liste.filter(function (t) { return t.email; })[0] || {}).email || '';
    var wa = tel && window.czWaNr ? window.czWaNr(tel) : '', telNr = String(tel).replace(/[^\d+]/g, '');
    var h = '';
    if (telNr || mail) {
      h += '<div class="kk-kn">' + (telNr ? '<a href="tel:' + esc(telNr) + '">Anrufen</a>' : '') + (wa ? '<a href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '')
        + (mail ? '<a href="mailto:' + esc(mail) + '">E-Mail</a>' : '') + '</div>';
    }
    if (besuche.length) {
      var seit = tag(besuche[besuche.length - 1]), meistL = haeufig(besuche.map(function (t) { return t.leistung; })), meistP = haeufig(besuche.map(function (t) { return t.personal_name; }));
      h += '<p class="kk-sum"><b>' + besuche.length + (besuche.length === 1 ? ' Besuch' : ' Besuche') + '</b> seit ' + esc(datum(seit)) + ', zuletzt ' + esc(vor(tag(besuche[0]))) + '.'
        + (besuche.length > 1 && (meistL || meistP) ? ' Meist ' + esc([meistL, meistP ? 'bei ' + meistP : ''].filter(Boolean).join(' ')) + '.' : '') + '</p>';
    } else {
      h += '<p class="kk-sum">Noch kein Besuch' + (r.kurz ? ' in den letzten drei Monaten' : '') + '.</p>';
    }
    if (nichtDa) h += '<div class="kk-hin warn"><b>' + nichtDa + '× nicht erschienen</b></div>';
    if (nz && (nz.notiz || nz.plus)) h += '<div class="kk-hin"><b>Notiz:</b> ' + esc([nz.notiz, nz.plus ? '+' + nz.plus + ' Min. bei jeder Buchung' : ''].filter(Boolean).join(' · ')) + '</div>';
    if (kommend.length) h += '<div class="kk-h">Kommend</div><div class="kk-l">' + kommend.map(function (t) { return zeile(t, jetzt); }).join('') + '</div>';
    if (frueher.length) {
      var zeig = ALLE ? frueher : frueher.slice(0, 12);
      h += '<div class="kk-h">Frühere Termine</div><div class="kk-l">' + zeig.map(function (t) { return zeile(t, jetzt); }).join('') + '</div>';
      if (zeig.length < frueher.length) h += '<button class="kk-mehr" data-kk-alle>Alle ' + frueher.length + ' anzeigen</button>';
    }
    if (!liste.length) h += '<div class="kk-hin">Noch keine Termine gespeichert.</div>';
    var e = window.EIN && window.EIN.einstellungen, lf = e ? +e.loeschfrist_monate || 0 : 0;
    if (r.kurz) h += '<p class="kk-fuss">Zeigt die letzten drei Monate.</p>';
    else if (lf) h += '<p class="kk-fuss">Termine werden nach ' + lf + ' Monaten automatisch gelöscht (Einstellung Löschfrist). Ältere Besuche stehen deshalb nicht mehr hier.</p>';
    $('kk-in').innerHTML = h;
  }
  function fehler() {
    $('kk-in').innerHTML = '<div class="kk-hin">Die Besuche lassen sich gerade nicht laden.</div><button class="kk-knopf" data-kk-neu>Noch einmal versuchen</button>';
  }
  function oeffnen(p) {
    if (!p || (!p.telefon && !p.email)) return;
    JETZT = p; ALLE = false;
    var d = blatt(); d.hidden = false;
    $('kk-name').textContent = p.name || 'Kunde';
    $('kk-in').innerHTML = '<p class="kk-sum">Wird geladen …</p>'; $('kk-in').scrollTop = 0;
    setTimeout(function () { var x = d.querySelector('.kk-x'); if (x) try { x.focus({ preventScroll: true }); } catch (err) {} }, 60);
    var fuer = p;
    laden(p).then(function (r) { if (JETZT !== fuer) return; fuer._r = r; zeichnen(p, r); }, function () { if (JETZT === fuer) fehler(); });
  }
  function zu() { var d = $('kk'); if (d) d.hidden = true; JETZT = null; }
  window.czKundenkarte = oeffnen;

  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if (!t || !t.closest) return;
    if (t.closest('#kk')) {
      if (t.closest('[data-kk-zu]')) { zu(); return; }
      if (t.closest('[data-kk-neu]') && JETZT) { oeffnen(JETZT); return; }
      if (t.closest('[data-kk-alle]') && JETZT && JETZT._r) { ALLE = true; zeichnen(JETZT, JETZT._r); return; }
      return;
    }
    if ((x = t.closest('[data-kk-zt]'))) {
      ev.preventDefault(); ev.stopPropagation();
      var z = window.czZtTermin && window.czZtTermin(x.getAttribute('data-kk-zt'));
      if (z) oeffnen({ name: z.name, telefon: z.telefon, email: z.email });
      return;
    }
    if (t.closest('a[href^="tel:"],a[href^="mailto:"]')) return;
    if ((x = t.closest('[data-kk-name]'))) {
      ev.preventDefault();
      oeffnen({ name: x.getAttribute('data-kk-name'), telefon: x.getAttribute('data-kk-tel'), email: x.getAttribute('data-kk-mail') });
    }
  }, true);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && JETZT) { zu(); ev.stopPropagation(); return; }
    var x = ev.target && ev.target.closest && ev.target.closest('.tm-sk[data-kk-name]');
    if (x && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); x.click(); }
  }, true);
  /* Liste und Blatt einmal neu zeichnen, damit die Namen antippbar werden */
  setTimeout(function () { try { if (window.czZtNeu) window.czZtNeu(); } catch (e) {} }, 0);
})();
