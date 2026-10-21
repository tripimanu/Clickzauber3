/* clickzauber Vertrieb — Reiter „Potenzielle Kunden“ (Lindau, Bregenz, Friedrichshafen, Tettnang, Wangen, Eriskirch,
   Nonnenhorn, Wasserburg bis Ravensburg). Recherchiert am 29.09.2026 aus öffentlichen Verzeichnissen und Webseiten
   der Betriebe. Telefon nur, wo es öffentlich stand. Der Stand je Betrieb liegt auf diesem Gerät. */
(function () {
  'use strict';
  var BR = { location: 'Location & Hochzeit', friseur: 'Friseur', kosmetik: 'Nagel, Wimpern, Kosmetik', catering: 'Catering', foodtruck: 'Food Truck', foto: 'Foto & Video', tagung: 'Tagung & Firmen' };
  // [Name, Branche, Ort, Telefon, Website, Hinweis]
  var L = [
    ['ONU Lindau (Inselhalle)', 'location', 'Lindau', '+49 8382 8899650', 'https://www.onu-lindau.de/hochzeit-bodensee', 'hallo@onu-lindau.de'],
    ['Gasthaus Brauerei Max & Moritz', 'location', 'Kressbronn', '', '', 'Eventlocation am See'],
    ['Schloss Hotel Wasserburg', 'location', 'Wasserburg', '', '', ''],
    ['Brenner Stube', 'location', 'Eriskirch', '', '', ''],
    ['Bahnhof Fischbach', 'location', 'Friedrichshafen', '', '', ''],
    ['Hotel Maier', 'location', 'Friedrichshafen', '', '', 'Fischbach'],
    ['Hof Hoher', 'location', 'Friedrichshafen', '', '', 'Ettenkirch'],
    ['Zeppelin Hangar FN', 'location', 'Friedrichshafen', '', '', 'Restaurant und Eventfläche'],
    ['Graf-Zeppelin-Haus', 'tagung', 'Friedrichshafen', '', '', 'Kongress und Feiern'],
    ['AKZENT Hotel Löwen', 'location', 'Langenargen', '', '', ''],
    ['Heinzler am See', 'location', 'Immenstaad', '', '', ''],
    ['Restaurant Meersalz', 'location', 'Kressbronn', '', '', ''],
    ['Neues Schloss Tettnang', 'location', 'Tettnang', '', '', 'Rittersaal'],
    ['Das Glashaus', 'location', 'Tettnang', '', '', ''],
    ['Hopfenhalle Tettnang', 'location', 'Tettnang', '', '', 'Umbau zur Eventlocation 2023'],
    ['Gut Hügle Erlebnishof', 'location', 'Ravensburg', '', '', ''],
    ['Haus am See Ravensburg', 'location', 'Ravensburg', '', '', ''],
    ['Museum Ravensburger', 'location', 'Ravensburg', '', '', 'Trauungen im Museum'],
    ['Die Post Oberteuringen', 'location', 'Oberteuringen', '', '', 'bis 400 Gäste'],
    ['Schloss Achberg', 'location', 'Achberg', '', '', ''],
    ['Schloss Waldburg', 'location', 'Waldburg', '', '', 'Ritteressen, Hochzeiten'],
    ['Schloss Amtzell', 'location', 'Amtzell', '', 'https://www.schlossamtzell.de/', ''],
    ['Alte Kanzlei Wangen', 'location', 'Wangen', '', 'https://www.alte-kanzlei-wangen.de/', 'bis 70 Gäste'],
    ['Alte Schlossfabrik', 'location', 'Wangen', '', '', ''],
    ['Jocham Wohncocktail', 'location', 'Wangen', '', '', 'Scheunen-Atmosphäre'],
    ['Hofgut beim Brennerwirt', 'location', 'Wangen', '+49 7528 2079621', '', 'Engetsweiler 2, Neuravensburg'],
    ['Kesselhaus Bregenz', 'location', 'Bregenz', '', '', ''],
    ['Grand Hotel Bregenz', 'location', 'Bregenz', '', '', ''],
    ['Pier 69', 'location', 'Bregenz', '', '', 'am Hafen'],
    ['Villa Raczynski', 'location', 'Bregenz', '', '', ''],
    ['Hotel Gasthof Lamm', 'location', 'Bregenz', '', '', ''],
    ['Hair & Style im Lindaupark', 'friseur', 'Lindau', '', '', ''],
    ['Hasan Inan – Hair & Color Artist', 'friseur', 'Lindau', '+49 8382 9892291', '', 'Friedrichshafener Str. 9'],
    ['Die Haarfabrik', 'friseur', 'Friedrichshafen', '', '', 'Ailinger Str. 14'],
    ['Goldene Schere Friseursalon', 'friseur', 'Friedrichshafen', '', 'https://www.goldene-scherefn.de/', 'seit 2022, wachsendes Team'],
    ['Bellevue Ondulée 65', 'friseur', 'Friedrichshafen', '', 'https://www.bo65.de/', 'auch Brautservice'],
    ['Studio Elegance', 'kosmetik', 'Friedrichshafen', '+49 7541 3573137', 'https://studio-elegance-bodensee.de/', 'Friseur, Wimpern, Brauen · info@studio-elegance-bodensee.de'],
    ['Prestige Hair & Beauty', 'friseur', 'Friedrichshafen', '', '', ''],
    ['Der Friseur', 'friseur', 'Friedrichshafen', '', '', ''],
    ['LS Hairstyle Salvatore Lombardo', 'friseur', 'Friedrichshafen', '', '', 'Werderstr. 8'],
    ['Föhr Event Catering & Service', 'catering', 'Ravensburg', '', '', 'Wilhelm-Brielmayer-Str. 1 · beliefert Zeppelin Hangar, MS Lindau, Schloss Tettnang'],
    ['1881 Catering', 'catering', 'Lindau', '', '', 'Lindau, Ravensburg, Friedrichshafen'],
    ['Frisch auf den Tisch (Bio-Catering)', 'catering', 'Ravensburg', '', 'https://www.frischaufdentisch.bio/', 'Catering und eigene Location'],
    ['KuchenKlatsch Catering', 'catering', 'Wangen', '', '', ''],
    ['Catering Bodensee', 'catering', 'Bodensee', '', 'https://www.catering-bodensee.de/', ''],
    ['v2o Bio-Restaurant', 'catering', 'Friedrichshafen', '', '', 'vegan, vegetarisch']
  ];
  var ORTE = ['Lindau', 'Bregenz', 'Friedrichshafen', 'Tettnang', 'Wangen', 'Eriskirch', 'Nonnenhorn', 'Wasserburg', 'Kressbronn', 'Langenargen', 'Ravensburg'];
  var GS = { location: 'hochzeitslocation', friseur: 'friseur', kosmetik: 'nagelstudio', catering: 'catering', foodtruck: 'foodtruck', foto: 'fotograf', tagung: 'tagungshotel' };
  var ST = { offen: 'Offen', angesprochen: 'Angesprochen', termin: 'Termin vereinbart', nein: 'Kein Interesse' };
  var K = 'cz_potenzial', KE = 'cz_potenzial_eigen';
  function lese(k, d) { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } }
  function schreibe(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function idVon(x) { return (x[0] + '|' + x[2]).toLowerCase(); }
  var F = { br: 'alle', ort: '', q: '', st: '' };

  var css = document.createElement('style');
  css.textContent = '.pk-tabs{display:flex;gap:6px;padding:10px clamp(14px,3vw,26px) 0;max-width:1500px;margin:0 auto}'
    + '.pk-tabs button{font:inherit;font-size:14px;background:none;border:1px solid var(--line-2);color:var(--ink-2);border-radius:10px;padding:0 16px;min-height:42px;cursor:pointer}'
    + '.pk-tabs button.on{background:var(--panel-2);color:var(--ink);border-color:var(--accent)}'
    + '.pk{max-width:1500px;margin:0 auto;padding:clamp(16px,2.6vw,26px)}'
    + '.pk-fil{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
    + '.pk-fil button{font:inherit;font-size:13px;background:var(--panel);border:1px solid var(--line-2);color:var(--ink-2);border-radius:999px;padding:0 13px;min-height:38px;cursor:pointer}'
    + '.pk-fil button.on{border-color:var(--accent);color:var(--ink)}'
    + '.pk-reihe{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}'
    + '.pk-reihe input,.pk-reihe select,.pk-neu input,.pk-neu select{font:inherit;font-size:14px;background:var(--panel-2);border:1.5px solid var(--line-2);border-radius:10px;padding:9px 12px;color:var(--ink);min-height:42px}'
    + '.pk-reihe input{flex:1;min-width:200px}'
    + '.pk-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}'
    + '.pk-k{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 15px;display:flex;flex-direction:column;gap:7px}'
    + '.pk-k.nein{opacity:.55}.pk-k.termin{border-color:var(--accent)}'
    + '.pk-k h3{margin:0;font-size:15.5px;letter-spacing:-.01em}.pk-k .m{font-size:12.5px;color:var(--ink-2)}.pk-k .h{font-size:12.5px;color:var(--ink-2)}'
    + '.pk-k .a{display:flex;gap:7px;flex-wrap:wrap;margin-top:3px}'
    + '.pk-k .a a,.pk-k .a button,.pk-k select{font:inherit;font-size:12.5px;background:var(--panel-2);border:1px solid var(--line-2);color:var(--ink);border-radius:9px;padding:0 11px;min-height:36px;display:inline-flex;align-items:center;text-decoration:none;cursor:pointer}'
    + '.pk-k .a .gut{border-color:var(--accent);color:var(--accent)}'
    + '.pk-mehr{margin-top:26px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}'
    + '.pk-mehr h2,.pk-neu h2{font-size:16px;margin:0 0 6px}.pk-mehr p,.pk-neu p{font-size:13.5px;color:var(--ink-2);margin:0 0 10px}'
    + '.pk-links{display:flex;gap:6px;flex-wrap:wrap}.pk-links a{font-size:12.5px;border:1px solid var(--line-2);border-radius:8px;padding:6px 9px;text-decoration:none}'
    + '.pk-neu{margin-top:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}.pk-neu form{display:flex;gap:8px;flex-wrap:wrap}'
    + '.pk-neu button{font:inherit;font-size:14px;background:var(--accent);color:#1a1813;border:0;border-radius:10px;padding:0 16px;min-height:42px;font-weight:600;cursor:pointer}'
    + '.pk-zahl{font-size:13px;color:var(--ink-2);margin:0 0 10px}';
  document.head.appendChild(css);

  var app = document.getElementById('app'), bar = app && app.querySelector('.bar'), wrap = app && app.querySelector('.wrap');
  if (!bar || !wrap) return;
  var tabs = document.createElement('div'); tabs.className = 'pk-tabs';
  tabs.innerHTML = '<button class="on" data-pk="0">Kunden & Zahlen</button><button data-pk="1">Potenzielle Kunden</button>';
  bar.insertAdjacentElement('afterend', tabs);
  var sec = document.createElement('div'); sec.className = 'pk'; sec.hidden = true;
  sec.innerHTML = '<h1>Potenzielle Kunden</h1>'
    + '<p class="sub">Betriebe zwischen Lindau, Bregenz, Friedrichshafen, Tettnang, Wangen und Ravensburg. Recherchiert am 29.09.2026 aus öffentlichen Verzeichnissen. Die Liste ist ein Anfang, nicht vollständig: unten finden Sie je Ort und Branche den Link ins Branchenbuch und können eigene Betriebe ergänzen. Telefonnummern stehen nur dort, wo sie öffentlich auf der Seite des Betriebs oder im Verzeichnis standen. Sonst hilft „In Karte suchen“.</p>'
    + '<div class="pk-fil" id="pk-br"></div>'
    + '<div class="pk-reihe"><input type="search" id="pk-q" placeholder="Name, Ort oder Hinweis suchen" autocomplete="off"><select id="pk-ort"><option value="">Alle Orte</option></select><select id="pk-st"><option value="">Jeder Stand</option></select></div>'
    + '<p class="pk-zahl" id="pk-zahl"></p><div class="pk-liste" id="pk-liste"></div>'
    + '<div class="pk-neu"><h2>Betrieb ergänzen</h2><p>Unterwegs gesehen? Eintragen, dann steht er hier mit in der Liste.</p><form id="pk-form"><input name="n" placeholder="Name des Betriebs" required><select name="b"></select><input name="o" placeholder="Ort" required><input name="t" placeholder="Telefon (freiwillig)"><button type="submit">Hinzufügen</button></form></div>'
    + '<div class="pk-mehr"><h2>Weitere Betriebe finden</h2><p>Branchenbuch je Ort. Bregenz öffnet Herold (Österreich).</p><div id="pk-gs"></div></div>';
  wrap.insertAdjacentElement('afterend', sec);

  tabs.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-pk]'); if (!b) return;
    var p = b.getAttribute('data-pk') === '1';
    tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    wrap.hidden = p; sec.hidden = !p;
    if (p) zeichnen();
  });

  function alle() { return L.concat(lese(KE, '[]')); }
  function stand() { return lese(K, '{}'); }
  document.getElementById('pk-br').innerHTML = '<button data-br="alle" class="on">Alle</button>' + Object.keys(BR).map(function (k) { return '<button data-br="' + k + '">' + e(BR[k]) + '</button>'; }).join('');
  document.getElementById('pk-st').innerHTML += Object.keys(ST).map(function (k) { return '<option value="' + k + '">' + ST[k] + '</option>'; }).join('');
  document.querySelector('#pk-form [name=b]').innerHTML = Object.keys(BR).map(function (k) { return '<option value="' + k + '">' + e(BR[k]) + '</option>'; }).join('');
  document.getElementById('pk-gs').innerHTML = Object.keys(BR).map(function (b) {
    return '<p style="margin:10px 0 5px"><b>' + e(BR[b]) + '</b></p><div class="pk-links">' + ORTE.map(function (o) {
      var u = o === 'Bregenz' ? 'https://www.herold.at/gelbe-seiten/bregenz/' + GS[b] + '/' : 'https://www.gelbeseiten.de/branchen/' + GS[b] + '/' + encodeURIComponent(o.toLowerCase());
      return '<a href="' + u + '" target="_blank" rel="noopener">' + e(o) + '</a>';
    }).join('') + '</div>';
  }).join('');

  function zeichnen() {
    var s = stand(), q = F.q.toLowerCase();
    var orte = {}; alle().forEach(function (x) { orte[x[2]] = 1; });
    var os = document.getElementById('pk-ort');
    if (os.options.length <= 1) os.innerHTML += Object.keys(orte).sort().map(function (o) { return '<option>' + e(o) + '</option>'; }).join('');
    var liste = alle().filter(function (x) {
      var st = (s[idVon(x)] || {}).st || 'offen';
      return (F.br === 'alle' || x[1] === F.br) && (!F.ort || x[2] === F.ort) && (!F.st || st === F.st)
        && (!q || (x[0] + ' ' + x[2] + ' ' + x[5]).toLowerCase().indexOf(q) >= 0);
    });
    document.getElementById('pk-zahl').textContent = liste.length + ' von ' + alle().length + ' Betrieben';
    document.getElementById('pk-liste').innerHTML = liste.map(function (x) {
      var id = idVon(x), z = s[id] || {}, st = z.st || 'offen';
      var karte = 'https://www.google.com/maps/search/' + encodeURIComponent(x[0] + ' ' + x[2]);
      return '<div class="pk-k ' + st + '"><h3>' + e(x[0]) + '</h3><div class="m">' + e(BR[x[1]] || x[1]) + ' · ' + e(x[2]) + '</div>'
        + (x[5] ? '<div class="h">' + e(x[5]) + '</div>' : '')
        + '<div class="a">'
        + (x[3] ? '<a class="gut" href="tel:' + e(x[3].replace(/\s/g, '')) + '">Anrufen ' + e(x[3]) + '</a>' : '')
        + (x[4] ? '<a href="' + e(x[4]) + '" target="_blank" rel="noopener">Website</a>' : '')
        + '<a href="' + karte + '" target="_blank" rel="noopener">In Karte suchen</a>'
        + '<select data-pkst="' + e(id) + '" aria-label="Stand">' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select>'
        + (z.buch ? '<button disabled>Im Kontaktbuch</button>' : '<button data-pkbuch="' + e(id) + '">Ins Kontaktbuch</button>')
        + '</div></div>';
    }).join('') || '<p class="pk-zahl">Nichts gefunden.</p>';
  }
  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-br]');
    if (b) { F.br = b.getAttribute('data-br'); sec.querySelectorAll('[data-br]').forEach(function (x) { x.classList.toggle('on', x === b); }); zeichnen(); return; }
    var k = ev.target.closest('[data-pkbuch]'); if (!k) return;
    var id = k.getAttribute('data-pkbuch'), x = alle().filter(function (y) { return idVon(y) === id; })[0]; if (!x) return;
    var kontakt = { id: 'pk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), firma: x[0], name: '', email: '', telefon: x[3] || '', ort: x[2],
      stufe: 'notiz', notiz: 'Potenzieller Kunde · ' + (BR[x[1]] || x[1]) + (x[5] ? ' · ' + x[5] : ''), angelegt: Date.now(), ts: Date.now() };
    if (typeof buchLesen === 'function') { var l = buchLesen(); l.push(kontakt); buchSchreiben(l); if (typeof buchSenden === 'function') buchSenden(kontakt, true); if (typeof buchZeichnen === 'function') buchZeichnen(); }
    var s = stand(); s[id] = Object.assign({}, s[id], { buch: 1, st: (s[id] && s[id].st) || 'angesprochen' }); schreibe(K, s); zeichnen();
  });
  sec.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'pk-ort') { F.ort = t.value; zeichnen(); return; }
    if (t.id === 'pk-st') { F.st = t.value; zeichnen(); return; }
    var id = t.getAttribute && t.getAttribute('data-pkst'); if (!id) return;
    var s = stand(); s[id] = Object.assign({}, s[id], { st: t.value }); schreibe(K, s); zeichnen();
  });
  document.getElementById('pk-q').addEventListener('input', function () { F.q = this.value; zeichnen(); });
  document.getElementById('pk-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target, n = f.n.value.trim(), o = f.o.value.trim(); if (!n || !o) return;
    var eigen = lese(KE, '[]'); eigen.push([n, f.b.value, o, f.t.value.trim(), '', 'selbst eingetragen']); schreibe(KE, eigen);
    f.reset(); document.getElementById('pk-ort').innerHTML = '<option value="">Alle Orte</option>'; zeichnen();
  });
})();
