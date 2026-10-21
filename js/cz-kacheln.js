/* clickzauber Cockpit: Kacheln selbst anordnen (seit 17.10.2026 im Cockpit, zusammen mit js/cz-cockpit.js).
   Kachel lange drücken: alle wackeln, Ziehen verschiebt, Minus entfernt (mit „Rückgängig“), „+ Kachel“ fügt hinzu, „Fertig“ beendet.
   Einstellungen → „Kacheln auf der Übersicht“ wie das Kontrollzentrum am iPhone (Minus, Griff zum Verschieben, Plus).
   Je Cockpit-Art eigene Kacheln. Die Werte kommen aus den bisherigen Kacheln und Zählern (die rechnen unsichtbar weiter).
   Gemerkt je Art in localStorage cz2_kacheln; im echten Cockpit später fürs Konto (Handy und Computer gleich).
   Skizze: NICHT-HOCHLADEN/skizzen-und-vorschlaege/Cockpit-Kacheln-anpassen.html */
(function () {
  'use strict';
  if (window.CZ2K) return; window.CZ2K = 1;
  function $(id) { return document.getElementById(id); }
  function art() { return window.CZ2 ? CZ2.art() : 'anfrage'; }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function zahl(id) { var e = $(id); return { v: e && !e.hidden && txt(e) ? txt(e) : '0' }; }
  function tm(re) { var k = [].filter.call(document.querySelectorAll('#tm-home .kpis .kpi'), function (x) { return re.test(txt(x.querySelector('.l'))); })[0]; return k ? { v: txt(k.querySelector('.v')), d: txt(k.querySelector('.d')) } : null; }
  function kid(id, d) { var e = $(id); return e ? { v: txt(e) || '–', d: d } : null; }
  function zu(v) { return function () { if (window.show) window.show(v); }; }
  function rt(r, sub) { return function () { if (window.CZ2) CZ2.reiter(r, sub); }; }
  function mit(o, d) { if (o) o.d = d; return o; }
  /* Termin-Cockpits: „Anfragen“ öffnet wie in Version 1.0 den Reiter „Anfragen“ auf der Übersicht (js/cz-salon.js), nicht die allgemeine Tabelle.
     Steht der Tagesplan offen, zuerst auf „Liste“, weil der Reiter dort steht. */
  function anfragenAuf() {
    var b = document.body;
    if (!b.classList.contains('salon') || !document.querySelector('#tm-home [data-salr-k]')) { rt('an')(); return; }
    var l = document.querySelector('#ta-wahl [data-ta="1"]'); if (b.classList.contains('ta-2') && l) l.click();
    setTimeout(function () {
      var k = document.querySelector('#tm-home [data-salr-k]'); if (k) k.click();
      setTimeout(function () { hinRollen($('sal-box') || $('tm-home')); }, 60);
    }, 120);
  }
  /* Zu den Anfragen rollen: am Computer rollt der Inhaltsbereich, am Handy die Seite (cz-salon.js rollt nur die Seite, und das zu früh) */
  function hinRollen(el) {
    if (!el || !el.getBoundingClientRect) return;
    var box = null;
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var o = getComputedStyle(p).overflowY;
      if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 4) { box = p; break; }
    }
    var sc = box || window, von = box ? box.scrollTop : window.pageYOffset;
    var ziel = Math.max(0, von + el.getBoundingClientRect().top - (box ? box.getBoundingClientRect().top : 0) - 16);
    sc.scrollTo({ top: ziel, behavior: 'smooth' });
    /* Rollt nichts (alter Browser ohne sanftes Rollen), dann springen. Hat der Nutzer selbst gerollt, bleibt es so. */
    setTimeout(function () { var jetzt = box ? box.scrollTop : window.pageYOffset; if (Math.abs(jetzt - von) < 4 && Math.abs(ziel - von) > 40) sc.scrollTo(0, ziel); }, 700);
  }
  var I = { inbox: '<path d="M3.5 13.5l2.5-8h12l2.5 8v6h-17z"/><path d="M3.5 13.5h5l1 2.5h5l1-2.5h5"/>', cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    calx: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4"/>', calc: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', check: '<path d="M20 6 9 17l-5-5"/>', euro: '<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h9M4 13.5h9"/>',
    herz: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', chat: '<path d="M4 4h16v13H7l-3 3z"/>', uhr: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    net: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 8.2l3.3 7.4M16.5 8.2l-3.3 7.4M8.5 6h7"/>', puls: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    doc: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/>', plus: '<path d="M12 5v14M5 12h14"/>', grip: '<path d="M5 8h14M5 12h14M5 16h14"/>' };
  function ic(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (I[n] || '') + '</svg>'; }
  var T = ['termin'], A = ['auftrag'], N = ['anfrage'], AN = ['auftrag', 'anfrage'];
  /* a = Cockpit-Arten (fehlt = alle), get = Wert aus dem bisherigen Cockpit, go = Ziel beim Antippen */
  var K = {
    t_anfr: { a: T, i: 'inbox', l: 'Anfragen', get: function () { var w = tm(/^Anfragen/), n = $('nav-count'); if (w && n && txt(n)) w.v = txt(n); return w; }, go: anfragenAuf, hot: 1 },
    t_heute: { a: T, i: 'cal', l: 'Termine heute', get: function () { return tm(/Termine heute/); }, go: zu('kalender') },
    t_woche: { a: T, i: 'calc', l: 'Diese Woche', get: function () { return tm(/Diese Woche/); }, go: zu('kalender') },
    t_absagen: { a: T, i: 'calx', l: 'Absagen', get: function () { return tm(/Absagen/); }, go: zu('kalender') },
    t_stamm: { a: T, i: 'herz', l: 'Stammkunden', get: function () { return mit(zahl('nav-stamm'), 'viermal in drei Monaten'); }, go: rt('stamm') },
    a_zu: { a: A, i: 'check', l: function () { return txt($('au-k1t')) || 'Zugesagt'; }, get: function () { return $('au-k1') ? { v: txt($('au-k1')) || '–', d: txt($('au-k1n')) } : null; }, go: rt('an', 'fest') },
    a_offen: { a: A, i: 'doc', l: 'Offen', get: function () { return $('au-k2') ? { v: txt($('au-k2')) || '–', d: txt($('au-k2n')) } : null; }, go: rt('an', 'offen') },
    a_sa: { a: A, i: 'cal', l: 'Freie Samstage', get: function () { var t = txt($('au-k3')), m = t.match(/(\d+)\s*von\s*(\d+)/); return t ? { v: m ? m[1] + ' von ' + m[2] : t, d: 'der nächsten Samstage' } : null; }, go: zu('belegung') },
    anfr: { a: AN, i: 'puls', l: 'Anfragen', get: function () { return kid('k-anfragen', 'im Zeitraum'); }, go: function () { rt('an', art() === 'auftrag' ? 'offen' : '')(); } },
    zeiten: { a: N, i: 'uhr', l: 'Uhrzeit-Termine', get: function () { return mit(zahl('nav-zeiten'), 'warten auf Bestätigung'); }, go: zu('zeiten') },
    starts: { i: 'user', l: 'Formular-Starts', get: function () { return kid('k-starts', 'Besucher'); }, go: zu('stats') },
    quote: { i: 'check', l: 'Abschlussquote', get: function () { return kid('k-quote', 'Start → Anfrage'); }, go: zu('stats') },
    wert: { i: 'euro', l: 'Ø Anfragewert', get: function () { return kid('k-wert', 'geschätzt'); }, go: function () { zu(art() === 'termin' ? 'stats' : 'umsatz')(); } },
    nachr: { i: 'chat', l: 'Nachrichten', get: function () { return mit(zahl('nav-nachr'), 'aus dem Netzwerk'); }, go: zu('nachrichten'), hot: 1 },
    netz: { i: 'net', l: 'Vernetzen', get: function () { return mit(zahl('nav-netz'), 'Anfragen von Betrieben'); }, go: zu('vernetzen') }
  };
  var STD = { termin: ['t_anfr', 't_heute', 't_woche', 't_absagen'], auftrag: ['a_zu', 'a_offen', 'anfr', 'wert'], anfrage: ['anfr', 'starts', 'quote', 'wert'] };
  var S = {}; try { S = JSON.parse(localStorage.getItem('cz2_kacheln') || '{}') || {}; } catch (e) {}
  function alle() { var a = art(); return Object.keys(K).filter(function (id) { return !K[id].a || K[id].a.indexOf(a) >= 0; }); }
  function liste() { var al = alle(), s = S[art()]; return (Array.isArray(s) ? s : STD[art()]).filter(function (id) { return al.indexOf(id) >= 0; }); }
  function weitere() { var l = liste(); return alle().filter(function (id) { return l.indexOf(id) < 0; }); }
  function merken(l) { S[art()] = l.slice(); try { localStorage.setItem('cz2_kacheln', JSON.stringify(S)); } catch (e) {} malen(); }
  function lab(id) { var l = K[id].l; return typeof l === 'function' ? l() : l; }
  function wert(id) { var w = null; try { w = K[id].get(); } catch (e) {} return w || { v: '–', d: '' }; }
  function heiss(id, w) { return K[id].hot && parseInt(w.v, 10) > 0; }
  function kachel(id) { var w = wert(id); return '<div class="c2k' + (heiss(id, w) ? ' c2k-hot' : '') + '" data-k="' + id + '"><div class="c2k-i"><button type="button" class="c2k-m" data-c2k="rm:' + id + '" aria-label="' + esc(lab(id)) + ' entfernen"><i></i></button><div class="c2k-l">' + ic(K[id].i) + '<span>' + esc(lab(id)) + '</span></div><div class="c2k-v">' + esc(w.v) + '</div><div class="c2k-d">' + esc(w.d || '') + '</div></div></div>'; }
  function zeile(id, on) { var w = wert(id); return '<div class="c2k-z"' + (on ? ' data-k="' + id + '"' : '') + '><button type="button" class="' + (on ? 'c2k-mi' : 'c2k-pl') + '" data-c2k="' + (on ? 'rm' : 'neu') + ':' + id + '" aria-label="' + esc(lab(id)) + (on ? ' entfernen' : ' hinzufügen') + '"><i></i>' + (on ? '' : '<i></i>') + '</button><span class="c2k-si">' + ic(K[id].i) + '</span><span class="c2k-st"><b>' + esc(lab(id)) + '</b><small>' + esc(w.v) + (w.d ? ' · ' + esc(w.d) : '') + '</small></span>' + (on ? '<span class="c2k-hd" aria-label="Verschieben">' + ic('grip') + '</span>' : '') + '</div>'; }

  var EDIT = false, NEU = null, UNDO = null, TT = 0, ART = '', P = null, SUP = false, SUPT = 0;
  function edit(an) { EDIT = an; var c = $('c2-kacheln'); if (c) c.classList.toggle('c2k-edit', an); }
  function malen() {
    if (P && P.drag) return;
    var c = $('c2-kacheln');
    if (c) {
      var g = c.querySelector('.c2k-grid');
      g.innerHTML = liste().map(kachel).join('') + '<button type="button" class="c2k-plus" data-c2k="add">' + ic('plus') + '<span>Kachel</span></button>';
      if (NEU) { var n = g.querySelector('[data-k="' + NEU + '"]'); if (n) n.classList.add('c2k-pop'); NEU = null; }
    }
    einst();
  }
  function einst() {
    var s = document.querySelector('[data-v="settings"]'), ref = $('c2-dar'); if (!s || !ref) return;
    var box = $('c2k-einst'); if (!box) { box = document.createElement('div'); box.id = 'c2k-einst'; box.className = 'c2-dar'; }
    if (box.previousSibling !== ref) ref.parentNode.insertBefore(box, ref.nextSibling);
    var l = liste(), w = weitere();
    box.innerHTML = '<div class="c2-h"><b>Kacheln auf der Übersicht</b><span>Was oben auf Ihrer Übersicht steht und in welcher Reihenfolge. Geht auch direkt dort: eine Kachel lange drücken.</span></div>'
      + '<div class="c2k-cols"><div><div class="c2k-gl">Angezeigt · ' + l.length + '</div><div class="c2k-sl" data-on="1">' + (l.map(function (id) { return zeile(id, 1); }).join('') || '<div class="c2k-leer">Keine Kacheln auf der Übersicht.</div>') + '</div></div>'
      + '<div><div class="c2k-gl">Weitere Kacheln · ' + w.length + '</div><div class="c2k-sl">' + (w.map(function (id) { return zeile(id, 0); }).join('') || '<div class="c2k-leer">Alle Kacheln stehen schon auf der Übersicht.</div>') + '</div></div></div>'
      + '<button type="button" class="c2k-std" data-c2k="std">Auf Standard zurücksetzen</button>';
  }
  function blatt(an) {
    var b = document.querySelector('.c2k-bg'); if (b) b.remove(); if (!an) return;
    var w = weitere();
    b = document.createElement('div'); b.className = 'c2k-bg'; b.setAttribute('data-c2k', 'zu');
    b.innerHTML = '<div class="c2k-blatt" role="dialog" aria-modal="true" aria-label="Kachel hinzufügen" data-c2k="nix"><div class="c2k-grab"></div><div class="c2k-bk"><div><b>Kachel hinzufügen</b><span>' + (w.length ? 'Antippen fügt sie zur Übersicht hinzu.' : 'Alle Kacheln stehen schon auf der Übersicht.') + '</span></div><button type="button" class="c2k-x" data-c2k="zu" aria-label="Schließen">×</button></div>'
      + '<div class="c2k-grid c2k-auswahl">' + w.map(function (id) { var x = wert(id); return '<button type="button" class="c2k c2k-neu" data-c2k="neu:' + id + '"><span class="c2k-i"><span class="c2k-p"><i></i><i></i></span><span class="c2k-l">' + ic(K[id].i) + '<span>' + esc(lab(id)) + '</span></span><span class="c2k-v">' + esc(x.v) + '</span><span class="c2k-d">' + esc(x.d || '') + '</span></span></button>'; }).join('') + '</div></div>';
    document.body.appendChild(b);
  }
  function toastWeg() { clearTimeout(TT); var t = document.querySelector('.c2k-toast'); if (t) t.remove(); }
  function toast(m, undo) { toastWeg(); var t = document.createElement('div'); t.className = 'c2k-toast'; t.setAttribute('role', 'status'); t.innerHTML = '<span>' + esc(m) + '</span>' + (undo ? '<button type="button" data-c2k="undo">Rückgängig</button>' : ''); document.body.appendChild(t); TT = setTimeout(toastWeg, undo ? 5000 : 2600); }
  function tun(s) {
    var p = s.split(':'), c = p[0], id = p[1];
    if (c === 'edit') edit(true);
    else if (c === 'fertig') edit(false);
    else if (c === 'add') blatt(true);
    else if (c === 'zu') blatt(false);
    else if (c === 'neu' && K[id]) { NEU = id; blatt(false); merken(liste().concat([id])); toast('„' + lab(id) + '“ hinzugefügt'); }
    else if (c === 'rm' && K[id]) {
      var vor = liste(), el = document.querySelector('#c2-kacheln [data-k="' + id + '"]'), a = art();
      UNDO = { a: a, l: vor };
      var fin = function () { merken(vor.filter(function (x) { return x !== id; })); toast('„' + lab(id) + '“ entfernt', true); };
      if (el && el.offsetParent) { el.classList.add('c2k-weg'); setTimeout(fin, 170); } else fin();
    }
    else if (c === 'undo') { if (UNDO && UNDO.a === art()) merken(UNDO.l); UNDO = null; toastWeg(); }
    else if (c === 'std') { merken(STD[art()]); toast('Kacheln auf Standard gesetzt'); }
  }

  /* Lange drücken, ziehen, ablegen */
  function sup() { SUP = true; clearTimeout(SUPT); SUPT = setTimeout(function () { SUP = false; }, 400); }
  document.addEventListener('pointerdown', function (e) {
    if (e.button > 0 || (P && P.drag) || !e.target.closest) return;
    if (P) { clearTimeout(P.t); P.el.classList.remove('c2k-press'); P = null; }
    var hd = e.target.closest('.c2k-sl[data-on] .c2k-hd');
    if (hd) { P = { id: e.pointerId, el: hd.closest('[data-k]'), list: true, x0: e.clientX, y0: e.clientY, armed: true }; return; }
    var kt = e.target.closest('#c2-kacheln .c2k[data-k]');
    if (!kt || e.target.closest('.c2k-m')) return;
    var p = { id: e.pointerId, el: kt, x0: e.clientX, y0: e.clientY, armed: EDIT }; P = p;
    if (!p.armed) { kt.classList.add('c2k-press'); p.t = setTimeout(function () { if (P !== p) return; kt.classList.remove('c2k-press'); edit(true); p.armed = true; sup(); try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) {} }, 480); }
  });
  document.addEventListener('pointermove', function (e) {
    if (!P || e.pointerId !== P.id) return;
    var d = Math.hypot(e.clientX - P.x0, e.clientY - P.y0);
    if (!P.armed) { if (d > 8) { clearTimeout(P.t); P.el.classList.remove('c2k-press'); P = null; } return; }
    if (!P.drag) { if (d < 5) return; start(e); }
    zieh(e);
  });
  function ende(e) { if (!P || e.pointerId !== P.id) return; clearTimeout(P.t); P.el.classList.remove('c2k-press'); if (P.drag) { ab(); sup(); } P = null; }
  document.addEventListener('pointerup', ende); document.addEventListener('pointercancel', ende);
  document.addEventListener('touchmove', function (e) { if (P && P.armed) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('#c2-kacheln .c2k')) e.preventDefault(); });
  function start(e) {
    var el = P.el, r = el.getBoundingClientRect(), c = el.cloneNode(true);
    P.drag = true; P.dx = e.clientX - r.left; P.dy = e.clientY - r.top;
    c.classList.add('c2k-klon'); c.classList.remove('c2k-press', 'c2k-pop'); c.removeAttribute('data-k');
    c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    document.body.appendChild(c); P.c = c; el.classList.add('c2k-geist'); setz(e);
  }
  function setz(e) { P.c.style.transform = 'translate(' + (e.clientX - P.dx) + 'px,' + (e.clientY - P.dy) + 'px)'; }
  function flip(cont, el, fn) {
    var els = [].filter.call(cont.children, function (x) { return x !== el; }), a = els.map(function (x) { return x.getBoundingClientRect(); });
    fn();
    els.forEach(function (x) { x.style.transition = 'none'; x.style.transform = ''; });
    els.forEach(function (x, i) { var b = x.getBoundingClientRect(), dx = a[i].left - b.left, dy = a[i].top - b.top; if (dx || dy) x.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; });
    void cont.offsetWidth;
    els.forEach(function (x) { x.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; x.style.transform = ''; });
  }
  function zieh(e) {
    setz(e);
    if (e.clientY > innerHeight - 70) scrollBy(0, 14); else if (e.clientY < 60) scrollBy(0, -14);
    var el = P.el, cont = el.parentNode, cr = cont.getBoundingClientRect(), px = e.clientX - cr.left, py = e.clientY - cr.top;
    var it = [].filter.call(cont.children, function (x) { return x.hasAttribute('data-k'); }), b = -1, bd = 1e9;
    it.forEach(function (x, i) { var cx = x.offsetLeft + x.offsetWidth / 2, cy = x.offsetTop + x.offsetHeight / 2, dd = P.list ? Math.abs(py - cy) : Math.hypot(px - cx, py - cy); if (dd < bd) { bd = dd; b = i; } });
    var cur = it.indexOf(el);
    if (b >= 0 && b !== cur) { var rest = it.filter(function (x) { return x !== el; }); flip(cont, el, function () { cont.insertBefore(el, rest[b] || cont.querySelector(':scope>.c2k-plus')); }); }
  }
  function ab() {
    var el = P.el, c = P.c, r = el.getBoundingClientRect();
    var ids = [].filter.call(el.parentNode.children, function (x) { return x.hasAttribute('data-k'); }).map(function (x) { return x.getAttribute('data-k'); });
    c.classList.add('c2k-ab'); c.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)'; c.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
    setTimeout(function () { c.remove(); el.classList.remove('c2k-geist'); merken(ids); }, 210);
  }
  document.addEventListener('click', function (e) {
    if (SUP) { SUP = false; e.preventDefault(); e.stopPropagation(); return; }
    var t = e.target; if (!t.closest) return;
    var a = t.closest('[data-c2k]');
    if (a) { e.preventDefault(); e.stopPropagation(); tun(a.getAttribute('data-c2k')); return; }
    var kt = t.closest('#c2-kacheln .c2k[data-k]');
    if (EDIT) { if (!kt && !t.closest('#c2-kacheln .c2k-kopf')) edit(false); return; }
    if (kt && K[kt.getAttribute('data-k')]) K[kt.getAttribute('data-k')].go();
  }, true);
  addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (document.querySelector('.c2k-bg')) blatt(false); else if (EDIT) edit(false); });

  /* Platz im Cockpit: Termine vor „Ansicht 1 | Ansicht 2“, Aufträge statt der zwei Zahlen oben, sonst statt der bisherigen Kacheln */
  function platz(a) {
    var ov = document.querySelector('[data-v="overview"]'); if (!ov) return null;
    /* Immer direkt vor der Reihe Liste | Tagesplan | Zeitraum | Abzeichen (js/cz-cockpit.js), sonst springen beide hin und her */
    var r3 = $('c3-reihe'); if (r3 && r3.parentNode) return [r3.parentNode, r3];
    if (a === 'termin') { var w = $('ta-wahl'), h = $('tm-home'), r = w && h && w.parentNode === h.parentNode ? w : h; return r ? [r.parentNode, r] : null; }
    if (a === 'auftrag') { var m = document.querySelector('#au-box .au-mon'); return m ? [m.parentNode, m] : null; }
    var k = ov.querySelector(':scope>.kpis'); return k ? [ov, k] : null;
  }
  function tick() {
    if (P && P.drag) return;
    var a = art(), c = $('c2-kacheln');
    if (!c) {
      c = document.createElement('div'); c.id = 'c2-kacheln';
      c.innerHTML = '<div class="c2k-kopf"><span class="c2k-hin">Ziehen zum Verschieben, Minus zum Entfernen</span><button type="button" class="c2k-anp" data-c2k="edit">Anpassen</button><button type="button" class="c2k-kb" data-c2k="add">+ Kachel</button><button type="button" class="c2k-fertig" data-c2k="fertig">Fertig</button></div><div class="c2k-grid"></div>';
      ART = '';
    }
    var z = platz(a);
    if (z && (c.parentNode !== z[0] || c.nextSibling !== z[1])) z[0].insertBefore(c, z[1]);
    if (a !== ART) { ART = a; edit(false); malen(); return; }
    [].forEach.call(c.querySelectorAll('.c2k[data-k]'), function (k) {
      var id = k.getAttribute('data-k'); if (!K[id]) return;
      var w = wert(id), v = k.querySelector('.c2k-v'), d = k.querySelector('.c2k-d'), l = k.querySelector('.c2k-l span');
      if (v.textContent !== w.v) v.textContent = w.v; if (d.textContent !== (w.d || '')) d.textContent = w.d || ''; if (l.textContent !== lab(id)) l.textContent = lab(id);
      k.classList.toggle('c2k-hot', !!heiss(id, w));
    });
    if (!$('c2k-einst')) einst();
  }

  var CSS = [
    'html.c2k [data-v="overview"] .kpis{display:none!important}html.c2k .au-mon-z{display:none!important}',
    '#c2-kacheln{margin:0 0 18px}',
    '.c2k-kopf{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-height:30px;margin:-6px 0 8px}',
    '.c2k-anp{background:none;border:0;padding:4px 2px;font:inherit;font-size:13.5px;font-weight:600;color:var(--ink-3);cursor:pointer}.c2k-anp:hover{color:var(--accent)}',
    '.c2k-hin,.c2k-kb,.c2k-fertig{display:none}.c2k-edit .c2k-anp{display:none}.c2k-edit .c2k-hin{display:block;margin-right:auto;font-size:13.5px;color:var(--ink-2)}.c2k-edit .c2k-kb,.c2k-edit .c2k-fertig{display:inline-flex}',
    '.c2k-kb,.c2k-fertig{align-items:center;min-height:40px;padding:0 15px;border-radius:12px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}.c2k-kb{border:1px solid var(--line-2);background:var(--card);color:var(--ink)}.c2k-fertig{border:0;background:var(--accent);color:var(--on-accent)}',
    '.c2k-grid{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:1fr;gap:14px}',
    '@media(max-width:1100px){.c2k-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.c2k-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}',
    '.c2k{position:relative;min-width:0;cursor:pointer;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.c2k-edit .c2k{touch-action:none;cursor:grab}',
    'button.c2k{font:inherit;color:inherit;text-align:left;background:none;border:0;padding:0;display:block;width:100%}',
    '.c2k-i{position:relative;display:flex;flex-direction:column;gap:4px;height:100%;min-height:112px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:13px 15px 14px;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .16s}',
    '.c2k:hover .c2k-i{border-color:var(--line-2)}.c2k-press .c2k-i{transform:scale(.95)}',
    '.c2k-l{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--ink-2);min-width:0}.c2k-l>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.c2k svg,.c2k-si svg,.c2k-hd svg,.c2k-plus svg{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.c2k-l svg{color:var(--accent)}',
    '.c2k-v{display:block;margin-top:auto;font-size:30px;font-weight:700;line-height:1.1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.c2k-d{display:block;font-size:12.5px;line-height:1.3;color:var(--ink-3);min-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.c2k-hot .c2k-i{border-color:color-mix(in srgb,var(--bad) 45%,transparent)}.c2k-hot .c2k-v{color:var(--bad)}',
    '.c2k-m,.c2k-p{position:absolute;left:-9px;top:-9px;width:26px;height:26px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;z-index:3;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}',
    '.c2k-m{display:none;background:var(--ink);color:var(--bg)}.c2k-p{background:var(--accent);color:var(--on-accent)}.c2k-m:before{content:"";position:absolute;inset:-10px}',
    '.c2k-m i,.c2k-p i,.c2k-mi i,.c2k-pl i{position:absolute;width:11px;height:2.5px;border-radius:2px;background:currentColor}.c2k-p i+i,.c2k-pl i+i{transform:rotate(90deg)}',
    '.c2k-edit .c2k-m{display:grid}',
    '.c2k-edit .c2k .c2k-i{animation:c2kw .3s ease-in-out infinite}.c2k-edit .c2k:nth-child(2n) .c2k-i{animation-duration:.26s;animation-direction:reverse}.c2k-edit .c2k:nth-child(3n) .c2k-i{animation-delay:-.12s}',
    '@keyframes c2kw{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1.1deg)}}',
    '@media (prefers-reduced-motion:reduce){.c2k-edit .c2k .c2k-i{animation:none;outline:2px dashed var(--line-2);outline-offset:3px}}',
    '.c2k-plus{display:none;min-height:112px;border:2px dashed var(--line-2);border-radius:16px;background:none;place-items:center;align-content:center;gap:4px;font:inherit;font-size:14px;font-weight:600;color:var(--ink-2);cursor:pointer}.c2k-plus svg{width:22px;height:22px}.c2k-edit .c2k-plus{display:grid}',
    '.c2k.c2k-geist .c2k-i{visibility:hidden}.c2k.c2k-geist:after{content:"";position:absolute;inset:0;border:2px dashed var(--line-2);border-radius:16px}',
    '.c2k-weg{transition:transform .17s,opacity .17s!important;transform:scale(.5)!important;opacity:0}',
    '.c2k-pop{animation:c2kp .45s cubic-bezier(.2,.8,.2,1)}@keyframes c2kp{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:none}}',
    '.c2k-klon{position:fixed!important;left:0;top:0;margin:0;z-index:9999;pointer-events:none}',
    '.c2k-klon.c2k .c2k-i{animation:none;transform:scale(1.06);box-shadow:0 18px 40px rgba(0,0,0,.24);transition:transform .2s,box-shadow .2s}.c2k-klon.c2k-ab .c2k-i{transform:none;box-shadow:none}.c2k-klon .c2k-m{display:none}',
    '.c2k-klon.c2k-z{border:1px solid var(--line-2);border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.22)}',
    '@media(max-width:760px){.c2k-i{min-height:104px;padding:11px 12px 12px}.c2k-v{font-size:25px}.c2k-plus{min-height:104px}}',
    /* Einstellungen */
    '.c2k-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}@media(max-width:760px){.c2k-cols{grid-template-columns:1fr}}',
    '.c2k-gl{font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-2);margin:0 4px 8px}',
    '.c2k-sl{position:relative;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)}',
    '.c2k-z{position:relative;display:flex;align-items:center;gap:12px;padding:9px 10px 9px 12px;min-height:58px;border-top:1px solid var(--line);background:var(--card)}.c2k-z:first-child{border-top:0}',
    '.c2k-mi,.c2k-pl{position:relative;width:26px;height:26px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;flex:none;cursor:pointer}.c2k-mi{background:var(--bad);color:#fff}.c2k-pl{background:var(--accent);color:var(--on-accent)}.c2k-mi:before,.c2k-pl:before{content:"";position:absolute;inset:-9px}',
    'html[data-theme=dunkel] .c2k-mi{color:#2a120a}',
    '.c2k-si{width:32px;height:32px;border-radius:9px;background:var(--panel-2);display:grid;place-items:center;color:var(--ink-2);flex:none}.c2k-si svg{width:17px;height:17px}',
    '.c2k-st{flex:1;min-width:0}.c2k-st b{display:block;font-size:14.5px;font-weight:600}.c2k-st small{display:block;font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.c2k-hd{width:44px;height:44px;margin:-8px -6px -8px 0;display:grid;place-items:center;color:var(--ink-3);cursor:grab;touch-action:none;flex:none}.c2k-hd svg{width:18px;height:18px}',
    '.c2k-z.c2k-geist>*{visibility:hidden}.c2k-z.c2k-geist{background:var(--panel-2)}',
    '.c2k-leer{padding:16px;font-size:13.5px;color:var(--ink-2)}',
    '.c2k-std{margin-top:14px;background:none;border:0;padding:8px 2px;font:inherit;font-size:14px;font-weight:600;color:var(--bad);cursor:pointer}',
    /* Blatt „Kachel hinzufügen“ und Hinweis unten */
    '.c2k-bg{position:fixed;inset:0;z-index:9000;background:rgba(12,12,12,.42);display:flex;align-items:center;justify-content:center;padding:20px;animation:c2kf .18s}',
    '.c2k-blatt{width:min(760px,100%);max-height:86vh;overflow:auto;background:var(--bg);color:var(--ink);border-radius:20px;padding:20px 22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)}',
    '.c2k-grab{display:none}.c2k-bk{display:flex;align-items:flex-start;gap:12px;margin:0 0 16px}.c2k-bk b{display:block;font-size:20px}.c2k-bk span{display:block;font-size:14px;color:var(--ink-2);margin-top:3px}',
    '.c2k-x{margin-left:auto;width:38px;height:38px;border-radius:50%;border:0;background:var(--panel-2);color:var(--ink-2);font-size:22px;line-height:1;cursor:pointer;flex:none}',
    '.c2k-grid.c2k-auswahl{grid-template-columns:repeat(3,minmax(0,1fr))}.c2k-neu .c2k-i{min-height:104px}.c2k-neu:hover .c2k-i{border-color:var(--accent)}',
    '@media(max-width:760px){.c2k-bg{align-items:flex-end;padding:0}.c2k-blatt{width:100%;max-height:84vh;border-radius:22px 22px 0 0;padding:10px 16px calc(24px + env(safe-area-inset-bottom));animation:c2ku .26s cubic-bezier(.2,.8,.2,1)}.c2k-grab{display:block;width:40px;height:5px;border-radius:3px;background:var(--line-2);margin:0 auto 12px}.c2k-grid.c2k-auswahl{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@keyframes c2kf{from{opacity:0}}@keyframes c2ku{from{transform:translateY(40%)}}',
    '.c2k-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9500;display:flex;align-items:center;gap:14px;max-width:calc(100% - 32px);width:max-content;background:var(--ink);color:var(--bg);padding:11px 16px;border-radius:14px;font-size:14px;font-weight:600;line-height:1.35;box-shadow:0 8px 24px rgba(0,0,0,.25)}',
    '.c2k-toast button{background:none;border:0;padding:0;font:inherit;font-weight:700;color:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer;white-space:nowrap}',
    '@media(max-width:760px){.c2k-toast{bottom:calc(86px + env(safe-area-inset-bottom))}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'c2k-css'; st.textContent = CSS; document.head.appendChild(st);
  document.documentElement.classList.add('c2k');
  tick(); setInterval(tick, 1000);
})();
