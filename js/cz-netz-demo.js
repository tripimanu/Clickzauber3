/* cz-netz-demo.js — Beispieldaten für den Bereich „Vernetzen“ im Cockpit.
   Greift nur im Beispiel-Modus (token = 'demo'). Rechnet dieselben Antworten
   wie /api/netz, aber im Speicher: Klicks wirken, nichts wird gespeichert. */
(function () {
  'use strict';
  var BR = { hochzeit: 'Hochzeitslocation', foodtruck: 'Food Truck', catering: 'Catering', foto: 'Foto & Video',
    floristik: 'Floristik', deko: 'Dekoration & Verleih', musik: 'Musik & DJ', konditorei: 'Konditorei & Torten',
    planung: 'Hochzeitsplanung', friseur: 'Friseur & Styling', tagung: 'Tagungshaus', sonstige: 'Sonstiges' };
  function vor(t, h) { return new Date(Date.now() - (t * 864e5) - ((h || 0) * 36e5)).toISOString(); }
  var ICH = 'd-seerose';
  var PK_DEMO = [{ id: 'pk1', titel: 'Hochzeit komplett', text: 'Location, Abendessen vom Food Truck und Tischblumen', partner: ['d-glut', 'd-blueten'], aktiv: true }];
  var P = {
    'd-seerose': { name: 'Gut Seerose', branche: 'hochzeit', ort: 'Meersburg', plz: '88709', umkreis_km: null, person_name: 'Manuel Tripi', person_rolle: 'Inhaber',
      titel_platz: 'Titelbild: die Scheune am See', person_platz: 'Foto: Manuel Tripi',
      text: 'Hochzeitslocation am Bodensee mit Scheune, Seeterrasse und Platz für bis zu 180 Gäste. Wir vermitteln gern Partner aus der Region.',
      eckdaten: [{ wert: 'bis 180', label: 'Gäste' }, { wert: '2', label: 'Trauorte am See' }, { wert: 'ab 22 Uhr', label: 'Party in der Scheune' }],
      bilder: [{ id: 'b1', platz: 'Bild: Trauung am Steg', am: vor(3), text: 'Die ersten Trauungen am neuen Steg. Danke an Blütenwerk für den Blumenbogen!' }, { id: 'b2', platz: 'Bild: Scheune bei Nacht' }, { id: 'b3', platz: 'Bild: Tafel auf der Terrasse' }] },
    'd-glut': { name: 'Glutwerk', branche: 'foodtruck', ort: 'Ravensburg', plz: '88212', umkreis_km: 80, person_name: 'Tobias Keller', person_rolle: 'Inhaber',
      titel_platz: 'Titelbild: der Food Truck', person_platz: 'Foto der Person',
      text: 'Burger und Grill vom offenen Feuer. Wir stehen auf Hochzeiten, Firmenfeiern und Stadtfesten, am liebsten dort, wo abends noch getanzt wird.',
      eckdaten: [{ wert: 'bis 250', label: 'Portionen' }, { wert: '16 A', label: 'Strom' }, { wert: '6 × 3 m', label: 'Stellfläche' }],
      bilder: [{ id: 'g1', platz: 'Bild: Truck bei einer Hochzeit', am: vor(1), text: 'Samstag auf Gut Seerose: 140 Burger, und um Mitternacht noch eine Runde für die Tanzfläche.' }, { id: 'g2', platz: 'Bild: Essen' }, { id: 'g3', platz: 'Bild: Team am Grill' }] },
    'd-pasta': { name: 'Pasta Rossa', branche: 'foodtruck', ort: 'Friedrichshafen', plz: '88045', umkreis_km: 60, person_name: 'Giulia Ferri', person_rolle: 'Inhaberin',
      titel_platz: 'Titelbild: Ape-Truck', person_platz: 'Foto der Person',
      text: 'Frische Pasta aus dem Ape-Truck, auch vegetarisch und vegan. Ideal als Mitternachtssnack.',
      eckdaten: [{ wert: 'bis 120', label: 'Portionen' }, { wert: '230 V', label: 'Strom reicht' }],
      bilder: [{ id: 'p1', platz: 'Bild: Ape-Truck mit Lichterkette', am: vor(4), text: 'Unser Mitternachtssnack war der Renner. Wer sucht noch Pasta für den Herbst?' }] },
    'd-crepes': { name: 'Seeglück Crepes', branche: 'foodtruck', ort: 'Lindau', plz: '88131', umkreis_km: 50, person_name: 'Lena Brunner', person_rolle: 'Inhaberin',
      titel_platz: 'Titelbild: Crepes-Stand', person_platz: 'Foto der Person',
      text: 'Süße und herzhafte Crepes, dazu Kaffee aus der Siebträgermaschine. Perfekt zum Dessert.',
      bilder: [{ id: 'c1', platz: 'Bild: Crepes mit Beeren', am: vor(1, 4), text: 'Neu im Sortiment: Crepes mit Beeren vom Bodensee.' }] },
    'd-blueten': { name: 'Blütenwerk', branche: 'floristik', ort: 'Meersburg', plz: '88709', umkreis_km: 40, person_name: 'Sophie Maier', person_rolle: 'Floristmeisterin',
      titel_platz: 'Titelbild: die Werkstatt', person_platz: 'Foto der Person',
      text: 'Brautstrauß, Tischschmuck, Blumenbögen. Saisonal und möglichst aus der Region.',
      bilder: [{ id: 'f1', platz: 'Bild: Brautstrauß in Weiß und Salbei', am: vor(0, 6), text: 'Frisch aus der Werkstatt für die Hochzeit am Samstag.' }, { id: 'f2', platz: 'Bild: Blumenbogen am Steg' }] },
    'd-licht': { name: 'Lichtmoment', branche: 'foto', ort: 'Konstanz', plz: '78462', umkreis_km: 150, person_name: 'Jonas Wirth', person_rolle: 'Fotograf',
      titel_platz: 'Titelbild: Paar im Abendlicht', person_platz: 'Foto der Person',
      text: 'Hochzeitsreportagen vom Standesamt bis zur Party. Natürlich, ohne gestellte Posen.',
      bilder: [{ id: 'l1', platz: 'Bild: Paar am Ufer', am: vor(2), text: 'Abendlicht am Bodensee. Mehr braucht es manchmal nicht.' }, { id: 'l2', platz: 'Bild: Tanz in der Scheune' }] },
    'd-tafel': { name: 'Tafelrunde Catering', branche: 'catering', ort: 'Friedrichshafen', plz: '88046', umkreis_km: 70, person_name: 'Markus Hofer', person_rolle: 'Küchenchef',
      text: 'Buffet und Menü für 30 bis 300 Gäste. Regionale Küche, auf Wunsch mit Servicepersonal.',
      eckdaten: [{ wert: '30 bis 300', label: 'Gäste' }, { wert: 'mit', label: 'Servicepersonal' }], bilder: [{ id: 't1', platz: 'Bild: Buffet' }] },
    'd-klang': { name: 'Klangraum DJs', branche: 'musik', ort: 'Lindau', plz: '88131', umkreis_km: 120, person_name: 'Deniz Kaya', person_rolle: 'DJ',
      text: 'Hochzeits-DJ mit eigener Licht- und Tontechnik. Vorgespräch immer persönlich.', bilder: [] },
    'd-zucker': { name: 'Zuckerwerk Torten', branche: 'konditorei', ort: 'Überlingen', plz: '88662', umkreis_km: 60, person_name: 'Anna Roth', person_rolle: 'Konditorin',
      text: 'Hochzeitstorten, Candybar und Cupcakes. Probierstück vorab.',
      bilder: [{ id: 'z1', platz: 'Bild: Hochzeitstorte, drei Etagen', am: vor(3, 2), text: 'Drei Etagen, Zitrone und Holunder. Diese Woche am See ausgeliefert.' }] }
  };
  var BASIS = { 'd-glut|': 45, 'd-glut|g1': 21, 'd-glut|g2': 16, 'd-glut|g3': 9, 'd-seerose|b1': 11, 'd-blueten|f1': 14, 'd-licht|l1': 31, 'd-pasta|p1': 8, 'd-crepes|c1': 5, 'd-zucker|z1': 12 };
  var V = [
    { id: 'v1', von: ICH, an: 'd-glut', status: 'ok' }, { id: 'v2', von: 'd-blueten', an: ICH, status: 'ok' },
    { id: 'v3', von: ICH, an: 'd-licht', status: 'ok' }, { id: 'v4', von: 'd-tafel', an: ICH, status: 'offen', am: vor(0, 3) },
    { id: 'v5', von: ICH, an: 'd-klang', status: 'offen', am: vor(2) }, { id: 'v6', von: 'd-glut', an: 'd-licht', status: 'ok' },
    { id: 'v7', von: 'd-glut', an: 'd-blueten', status: 'ok' }
  ];
  var M = [
    { id: 'm1', von: ICH, an: 'd-glut', text: 'Hallo Tobias, wir haben oft Paare, die abends etwas Lockeres zum Essen wollen. Hätten Sie Interesse, bei uns zu stehen?', am: vor(6), gel: 1 },
    { id: 'm2', von: 'd-glut', an: ICH, text: 'Sehr gern. Strom brauche ich 16 A, Stellfläche etwa 6 × 3 m.', am: vor(6, -2), gel: 1 },
    { id: 'm3', von: ICH, an: 'd-glut', text: 'Haben wir beides. Erste Anfrage wäre Samstag, 12.06.2027, 90 Gäste.', am: vor(5), gel: 1 },
    { id: 'm4', von: 'd-glut', an: ICH, text: 'Passt, ich halte mir den 12.06. frei.', am: vor(5, -1), gel: 1 },
    { id: 'm5', von: 'd-blueten', an: ICH, text: 'Danke für die Empfehlung an Familie Ritter! Die beiden haben gestern bei mir bestellt.', am: vor(0, 5), gel: 0 },
    { id: 'm6', von: 'd-tafel', an: ICH, text: 'Guten Tag, wir kochen oft am See und würden uns freuen, auf Ihrer Partnerliste zu stehen.', am: vor(0, 3), gel: 0 }
  ];
  var L = [
    { von: 'd-glut', ziel: ICH, bild: '' }, { von: 'd-blueten', ziel: ICH, bild: '' }, { von: 'd-licht', ziel: ICH, bild: '' }, { von: 'd-licht', ziel: ICH, bild: 'b1' },
    { von: ICH, ziel: 'd-glut', bild: '' }, { von: 'd-licht', ziel: 'd-glut', bild: '' }, { von: 'd-pasta', ziel: 'd-glut', bild: '' }, { von: ICH, ziel: 'd-glut', bild: 'g1' },
    { von: 'd-licht', ziel: 'd-glut', bild: 'g1' }, { von: 'd-pasta', ziel: 'd-glut', bild: 'g2' }, { von: 'd-glut', ziel: 'd-pasta', bild: '' },
    { von: ICH, ziel: 'd-blueten', bild: '' }, { von: 'd-glut', ziel: 'd-licht', bild: '' }
  ];
  var PA = [
    { t: ICH, p: 'd-glut', ok: true, r: 0 }, { t: ICH, p: 'd-blueten', ok: true, r: 1 }, { t: ICH, p: 'd-licht', ok: false, r: 2 },
    { t: 'd-glut', p: 'd-licht', ok: true, r: 0 }, { t: 'd-klang', p: ICH, ok: false, r: 0 }
  ];
  var WEITER = {};

  function karte(id) {
    var p = P[id] || {};
    var b = p.personbild || p.titelbild || null;
    return { id: id, name: p.name, branche: p.branche, branche_text: BR[p.branche] || BR.sonstige, ort: p.ort || '', plz: p.plz || '',
      text: String(p.text || '').slice(0, 160), bild: b, titelbild: p.titelbild || null };
  }
  function status(a, b) {
    var v = V.filter(function (x) { return (x.von === a && x.an === b) || (x.an === a && x.von === b); })[0];
    if (!v) return 'keins';
    if (v.status === 'ok') return 'ok';
    if (v.status === 'offen') return v.von === a ? 'offen_raus' : 'offen_rein';
    return 'keins';
  }
  function kontakteVon(id) { return V.filter(function (v) { return v.status === 'ok' && (v.von === id || v.an === id); }).map(function (v) { return v.von === id ? v.an : v.von; }); }
  function likes(ziel, bild) { return (BASIS[ziel + '|' + bild] || 0) + L.filter(function (l) { return l.ziel === ziel && l.bild === bild; }).length; }
  function ichLike(ziel, bild) { return L.some(function (l) { return l.ziel === ziel && l.bild === bild && l.von === ICH; }); }
  function mit(o, x) { for (var k in x) o[k] = x[k]; return o; }
  /* Beispiele für Besuche, Antwortzeit, Top-Empfehler und freie Termine (sql/41) */
  function inTagen(n) { var d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); }
  function naechsterSa(w) { var d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7) + 7 * w); return d.toISOString().slice(0, 10); }
  P[ICH].freie_tage = [naechsterSa(3), naechsterSa(9)];
  P['d-glut'].freie_tage = [naechsterSa(2), naechsterSa(3), naechsterSa(6)];
  P['d-licht'].freie_tage = [naechsterSa(4)];
  var AZ = { 'd-seerose': { antwort: 'stunde' }, 'd-glut': { antwort: '3std', top: { platz: 1 }, vertrauen: 6, krone: '88' }, 'd-blueten': { antwort: 'tag', vertrauen: 4 },
    'd-licht': { vertrauen: 7 }, 'd-pasta': { vertrauen: 2 }, 'd-tafel': { vertrauen: 3 }, 'd-zucker': { vertrauen: 1 }, 'd-klang': { vertrauen: 0 }, 'd-crepes': { vertrauen: 2 } };

  function get(was, q) {
    if (was === 'start') {
      var ich = P[ICH];
      return { ok: true, ich: ICH, rolle: 'inhaber', darf: true, branchen: BR, hat_profil: true,
        profil: mit(mit({ tenant_id: ICH, sichtbar: true }, ich), { likes: likes(ICH, '') }),
        kontakte: kontakteVon(ICH).map(karte),
        rein: V.filter(function (v) { return v.status === 'offen' && v.an === ICH; }).map(function (v) { return mit({ verbindung: v.id, am: v.am }, karte(v.von)); }),
        raus: V.filter(function (v) { return v.status === 'offen' && v.von === ICH; }).map(function (v) { return mit({ verbindung: v.id, am: v.am }, karte(v.an)); }),
        partner: PA.filter(function (x) { return x.t === ICH; }).sort(function (a, b) { return a.r - b.r; }).map(function (x) { return mit({ zugestimmt: x.ok }, karte(x.p)); }),
        partner_bitten: PA.filter(function (x) { return x.p === ICH; }).map(function (x) { return mit({ zugestimmt: x.ok }, karte(x.t)); }),
        pakete: PK_DEMO, empfehlungen: { bekommen: 7, geschickt: 4, angenommen: 3 },
        besuche: { woche: 5, vorwoche: 2, branchen: { foodtruck: 2, floristik: 2, foto: 1 } },
        antwort: { stufe: 'stunde', minuten: 38, anzahl: 23 },
        top: { monat: new Date().toISOString().slice(0, 7), region: '88', liste: [mit({ anzahl: 6, platz: 1 }, karte('d-glut')), mit({ anzahl: 4, platz: 2 }, karte(ICH)), mit({ anzahl: 2, platz: 3 }, karte('d-blueten'))], ich: { anzahl: 4, platz: 2 } },
        partner_frei: kontakteVon(ICH).filter(function (id) { return (P[id].freie_tage || []).length; }).map(function (id) { return mit({ tage: P[id].freie_tage.slice() }, karte(id)); }),
        ungelesen: M.filter(function (m) { return m.an === ICH && !m.gel; }).length };
    }
    if (was === 'puls') {
      var la = M.slice().sort(function (a, b) { return a.am < b.am ? 1 : -1; })[0];
      return { ok: true, ungelesen: M.filter(function (m) { return m.an === ICH && !m.gel; }).length, rein: V.filter(function (v) { return v.status === 'offen' && v.an === ICH; }).length, letzte: la ? la.am : null };
    }
    if (was === 'suche') {
      var r = String(q.region || '').replace(/\D/g, '').slice(0, 2), s = String(q.q || '').toLowerCase();
      return { ok: true, branchen: BR, treffer: Object.keys(P).filter(function (id) {
        var p = P[id];
        return id !== ICH && !p.weg && (!q.branche || p.branche === q.branche) && (!r || String(p.plz).indexOf(r) === 0)
          && (!s || (p.name + ' ' + p.ort + ' ' + p.text).toLowerCase().indexOf(s) > -1);
      }).map(function (id) { return mit(karte(id), { likes: likes(id, ''), ich_like: ichLike(id, ''), status: status(ICH, id) }); }) };
    }
    if (was === 'profil') {
      var id = q.id, p = P[id];
      if (!p || p.weg) return { ok: false, error: 'Profil nicht verfügbar.' };
      var pids = PA.filter(function (x) { return x.t === id && x.ok; }).map(function (x) { return x.p; });
      return { ok: true, eigen: id === ICH,
        profil: mit(karte(id), { text: p.text || '', person_name: p.person_name || '', person_rolle: p.person_rolle || '', umkreis_km: p.umkreis_km, eckdaten: p.eckdaten || [], personbild: p.personbild || null, titel_platz: p.titelbild ? '' : (p.titel_platz || ''), person_platz: p.personbild ? '' : (p.person_platz || ''),
          likes: likes(id, ''), ich_like: ichLike(id, ''),
          bilder: (p.bilder || []).map(function (b) { return { id: b.id, url: b.url || null, platz: b.platz || '', text: b.text || '', am: b.am || null, likes: likes(id, b.id), ich_like: ichLike(id, b.id) }; }),
          status: id === ICH ? 'selbst' : status(ICH, id), abzeichen: AZ[id] || {}, freie_tage: (id === ICH || status(ICH, id) === 'ok') ? (p.freie_tage || []) : [] }),
        kontakte: kontakteVon(id).map(function (k) { return mit({ partner: pids.indexOf(k) > -1 }, karte(k)); }).sort(function (a, b) { return (b.partner ? 1 : 0) - (a.partner ? 1 : 0); }) };
    }
    if (was === 'feed') {
      var kk = kontakteVon(ICH), r2 = String(P[ICH].plz || '').slice(0, 2), out = [];
      Object.keys(P).forEach(function (id) {
        var p = P[id];
        if (p.weg || !(id === ICH || kk.indexOf(id) > -1 || String(p.plz).indexOf(r2) === 0)) return;
        (p.bilder || []).forEach(function (b) {
          if (!b.am) return;
          out.push({ bild: b.id, url: b.url || null, platz: b.url ? '' : (b.platz || ''), text: b.text || '', am: b.am, eigen: id === ICH, kontakt: kk.indexOf(id) > -1,
            likes: likes(id, b.id), ich_like: ichLike(id, b.id), betrieb: mit(karte(id), { status: id === ICH ? 'selbst' : status(ICH, id) }) });
        });
      });
      out.sort(function (a, b) { return a.am < b.am ? 1 : -1; });
      return { ok: true, beitraege: out.slice(0, 30) };
    }
    if (was === 'gespraeche') {
      var g = {};
      M.slice().sort(function (a, b) { return a.am < b.am ? 1 : -1; }).forEach(function (m) {
        var w = m.von === ICH ? m.an : m.von;
        if (!g[w]) g[w] = { mit: w, letzte: m.text.slice(0, 90), am: m.am, von_mir: m.von === ICH, ungelesen: 0 };
        if (m.an === ICH && !m.gel) g[w].ungelesen++;
      });
      return { ok: true, gespraeche: Object.keys(g).map(function (k) { var c = karte(k); return mit(g[k], { name: c.name, bild: c.bild, branche_text: c.branche_text }); }) };
    }
    if (was === 'verlauf') {
      M.forEach(function (m) { if (m.von === q.mit && m.an === ICH) m.gel = 1; });
      return { ok: true, mit: karte(q.mit), kontakt: status(ICH, q.mit) === 'ok',
        nachrichten: M.filter(function (m) { return (m.von === ICH && m.an === q.mit) || (m.von === q.mit && m.an === ICH); })
          .sort(function (a, b) { return a.am < b.am ? -1 : 1; }).map(function (m) { return { id: m.id, ich: m.von === ICH, text: m.text, am: m.am }; }) };
    }
    if (was === 'lead') {
      return { ok: true, termin: '2027-06-12', weiter_ok: true, weitergeleitet: WEITER[q.id] || [], kontakte: kontakteVon(ICH).map(function (id, i) { return mit(karte(id), { frei: ['frei', 'belegt', 'frei', 'unbekannt'][i % 4] }); }) };
    }
    return { ok: false };
  }

  function post(a, d) {
    var jetzt = new Date().toISOString();
    if (a === 'profil') { var x = d.profil || {}; ['name', 'branche', 'ort', 'plz', 'umkreis_km', 'text', 'person_name', 'person_rolle', 'sichtbar', 'eckdaten'].forEach(function (k) { if (k in x) P[ICH][k] = x[k]; }); return { ok: true }; }
    if (a === 'bild') {
      var id = 'x' + Date.now().toString(36);
      if (d.art === 'titel') P[ICH].titelbild = d.daten; else if (d.art === 'person') P[ICH].personbild = d.daten;
      else { if ((P[ICH].bilder || []).length >= 24) return { ok: false, error: 'Höchstens 24 Bilder.' }; P[ICH].bilder.push({ id: id, url: d.daten, text: d.text || '', am: jetzt }); }
      return { ok: true, id: id, url: d.daten };
    }
    if (a === 'bild_weg') {
      if (d.art === 'titel') P[ICH].titelbild = null; else if (d.art === 'person') P[ICH].personbild = null;
      else P[ICH].bilder = P[ICH].bilder.filter(function (b) { return b.id !== d.id; });
      return { ok: true };
    }
    if (a === 'vernetzen') {
      var g = V.filter(function (v) { return v.von === d.an && v.an === ICH && v.status === 'offen'; })[0];
      if (g) { g.status = 'ok'; return { ok: true, status: 'ok' }; }
      V.push({ id: 'v' + Date.now(), von: ICH, an: d.an, status: 'offen', am: jetzt });
      if (d.nachricht) M.push({ id: 'm' + Date.now(), von: ICH, an: d.an, text: d.nachricht, am: jetzt, gel: 0 });
      return { ok: true, status: 'offen_raus' };
    }
    if (a === 'frei') { if (d.tage) P[ICH].freie_tage = d.tage.slice(); if (typeof d.frei_zeigen === 'boolean') P[ICH].frei_zeigen = d.frei_zeigen; return { ok: true, tage: P[ICH].freie_tage, benachrichtigt: false }; }
    if (a === 'antwort') { V.forEach(function (v) { if (v.id === d.id) v.status = d.ja ? 'ok' : 'abgelehnt'; }); return { ok: true }; }
    if (a === 'trennen' || a === 'blockieren') {
      var o = d.mit || d.an;
      V = V.filter(function (v) { return !((v.von === ICH && v.an === o) || (v.an === ICH && v.von === o)); });
      PA = PA.filter(function (x) { return !((x.t === ICH && x.p === o) || (x.p === ICH && x.t === o)); });
      if (a === 'blockieren') P[o].weg = true;
      return { ok: true };
    }
    if (a === 'nachricht') {
      if (status(ICH, d.an) !== 'ok') return { ok: false, error: 'Schreiben geht erst, wenn Sie vernetzt sind.' };
      M.push({ id: 'm' + Date.now(), von: ICH, an: d.an, text: d.text, am: jetzt, gel: 0 });
      return { ok: true, am: jetzt };
    }
    if (a === 'like') {
      var da = L.filter(function (l) { return l.von === ICH && l.ziel === d.ziel && l.bild === (d.bild || ''); })[0];
      if (da) L = L.filter(function (l) { return l !== da; }); else L.push({ von: ICH, ziel: d.ziel, bild: d.bild || '' });
      return { ok: true, an: !da, anzahl: likes(d.ziel, d.bild || '') };
    }
    if (a === 'partner') {
      var alt = PA.filter(function (x) { return x.t === ICH; });
      PA = PA.filter(function (x) { return x.t !== ICH; });
      (d.liste || []).slice(0, 6).forEach(function (p, i) {
        var v = alt.filter(function (x) { return x.p === p; })[0];
        PA.push({ t: ICH, p: p, ok: v ? v.ok : false, r: i });
      });
      return { ok: true };
    }
    if (a === 'partner_zustimmen') {
      if (d.ja) PA.forEach(function (x) { if (x.t === d.von && x.p === ICH) x.ok = true; });
      else PA = PA.filter(function (x) { return !(x.t === d.von && x.p === ICH); });
      return { ok: true };
    }
    if (a === 'pakete') { PK_DEMO = (d.liste || []).map(function (x, i) { return { id: x.id || 'pk' + Date.now() + i, titel: x.titel, text: x.text || '', partner: x.partner || [], aktiv: true }; }); return { ok: true }; }
    if (a === 'weiterleiten') {
      var zu = [].concat(d.an || []);
      zu.forEach(function (an) { WEITER[d.lead] = (WEITER[d.lead] || []).concat([{ an: an, name: (P[an] || {}).name, am: jetzt }]); });
      return { ok: true, gesendet: zu.length, fehler: [], gast: !!d.gast_info };
    }
    return { ok: true };
  }

  window.CZ_NETZ_DEMO = { get: get, post: post };
})();
