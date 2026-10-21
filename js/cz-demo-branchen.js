/* clickzauber — Beispieldaten je Branche für die 7-Tage-Demos (seit 07.10.2026).
   Persönliche Demo, QR-Code, Link oder Termin-Link: Die Branche kommt vom Server (lib/demo-zugang.js). Das Beispiel-Cockpit zeigt dann
   wie ein echtes Konto nur ein Formular, mit dem Namen des Betriebs, dem Tarif der Branche (Service oder Projekt) als Pilotbetrieb und
   eigenen Leistungen, Vorlagen, Team, Terminen und Einstellungen. Ohne Zugang (Gerät des Betreibers, Rahmen) stehen alle fünf Beispiele zur Wahl.
   Neu: Handwerk & Solar (Sonnenwerk Nord) und Makler & Finanzen (Immobilien Weber) mit der Tafel (js/cz-pipeline.js).
   Dazu Beispiele für Wiedervorlage, online angenommene Angebote, gewählte Ausweichtage und Verschiebe-Wünsche.
   Aufruf aus dem Beispiel-Skript in clickzauber-cockpit-live.html: ergaenzen() beim Laden, anwenden() mit dem Demo-Zugang.
   Seit 10.10.2026: leer (&leer=1 zusammen mit probe=Betrieb) zeigt das Cockpit ohne Beispiele, nur mit dem Inhaber (Barber by Becks). */
(function () {
  'use strict';
  if (window.CZ_DEMO_B) return;
  function inTagen(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function vorTagen(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
  function vorStd(n) { return new Date(Date.now() - n * 36e5).toISOString(); }
  function werktag(n) { var d = new Date(); d.setDate(d.getDate() + n); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
  function samstag() { var d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
  function slugify(s) { return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ihr-betrieb'; }
  var HEUTE = inTagen(0);
  var SL = { friseur: 'salon-am-see', kosmetik: 'salon-am-see', catering: 'seerose-catering', hochzeit: 'gut-seerose', handwerk: 'sonnenwerk-nord', beratung: 'immobilien-weber' };
  var ART = { friseur: 'termin', kosmetik: 'termin', catering: 'auftrag', hochzeit: 'location', handwerk: 'pipeline', beratung: 'pipeline' };
  var STUFE = { friseur: 'service', kosmetik: 'service', catering: 'projekt', hochzeit: 'projekt', handwerk: 'projekt', beratung: 'service' };   // wie stufeVon in lib/_plans.js
  var BSP = { friseur: 'Salon am See', kosmetik: 'Beauty Studio Lena', catering: 'Seerose Catering', hochzeit: 'Gut Seerose', handwerk: 'Sonnenwerk Nord', beratung: 'Immobilien Weber' };
  var PERS = { friseur: ['Ilmir', 'Berisha'], kosmetik: ['Lena', 'Hartmann'], catering: ['Lukas', 'Brandt'], hochzeit: ['Sabine', 'Ott'], handwerk: ['Thomas', 'Brandl'], beratung: ['Petra', 'Weber'] };
  var RAUM = { friseur: 'Salon', kosmetik: 'Studio', catering: 'Food Truck', handwerk: 'Montage', beratung: 'Termine' };
  var RUHE = { friseur: [0, 1], kosmetik: [0], catering: [], handwerk: [0, 6], beratung: [0] };

  /* ── Handwerk & Solar: Sonnenwerk Nord ── */
  var SOLAR = [
    { id: 'h1', widget_id: 'sonnenwerk-nord', name: 'Thomas Brugger', email: 't.brugger@example.de', telefon: '0171 4455661', ort: 'Markdorf', value_est: 18400, status: 'neu', ts: vorStd(2),
      answers: { Projekt: 'Photovoltaik mit Speicher', Dachform: 'Satteldach', Jahresverbrauch: '5.000 bis 8.000 kWh', Speicher: 'Ja', 'Dachfläche': 'etwa 60 m²', Zeitraum: 'in den nächsten 3 Monaten' } },
    { id: 'h2', widget_id: 'sonnenwerk-nord', name: 'Familie Gerster', telefon: '0160 7788990', ort: 'Tettnang', value_est: 14900, status: 'neu', ts: vorTagen(1),
      answers: { Projekt: 'Wärmepumpe', Baujahr: '1994', 'Bisherige Heizung': 'Öl', 'Wohnfläche': '140 m²', Zeitraum: 'vor dem Winter' } },
    { id: 'h3', widget_id: 'sonnenwerk-nord', name: 'Sabine Hold', email: 'sabine.hold@example.de', telefon: '0151 2299881', ort: 'Friedrichshafen', value_est: 21600, status: 'angerufen', ts: vorTagen(4),
      wv_am: HEUTE, wv_notiz: 'Fotos vom Zählerschrank angefragt',
      answers: { Projekt: 'Photovoltaik mit Speicher', Dachform: 'Walmdach', Jahresverbrauch: 'über 8.000 kWh', Speicher: 'Ja', Wallbox: 'Ja' } },
    { id: 'h4', widget_id: 'sonnenwerk-nord', name: 'Autohaus Kessler', email: 'info@kessler.example.de', telefon: '07541 778899', ort: 'Meckenbeuren', value_est: 48500, status: 'angebot', ts: vorTagen(9),
      angebot_nr: '2026-S11', angebot_am: vorTagen(6), angenommen_am: vorStd(4), angenommen_von: 'Frank Kessler',
      answers: { Projekt: 'Photovoltaik für den Betrieb', Dachform: 'Flachdach', 'Dachfläche': 'etwa 420 m²', Jahresverbrauch: 'über 8.000 kWh', Speicher: 'Beratung gewünscht' } },
    { id: 'h5', widget_id: 'sonnenwerk-nord', name: 'Jonas und Mira Pfeiffer', email: 'pfeiffer@example.de', telefon: '0176 3344556', ort: 'Ravensburg', value_est: 16800, status: 'angebot', ts: vorTagen(12),
      angebot_nr: '2026-S09', angebot_am: vorTagen(10), wv_am: inTagen(-1), wv_notiz: 'Nachfassen: Angebot von letzter Woche',
      answers: { Projekt: 'Photovoltaik', Dachform: 'Satteldach', Jahresverbrauch: '3.000 bis 5.000 kWh', Speicher: 'Nein' } },
    { id: 'h6', widget_id: 'sonnenwerk-nord', name: 'Peter Albrecht', email: 'p.albrecht@example.de', telefon: '0157 6677881', ort: 'Weingarten', value_est: 19200, status: 'gebucht', ts: vorTagen(26), termin: inTagen(18),
      answers: { Projekt: 'Photovoltaik mit Speicher', Dachform: 'Pultdach', Speicher: 'Ja', _gast: { was: 'verschieben', am: vorStd(6), wunsch: inTagen(25), text: 'Das Gerüst kommt erst eine Woche später.' } } },
    { id: 'h7', widget_id: 'sonnenwerk-nord', name: 'Helga Strobel', email: 'h.strobel@example.de', telefon: '07541 223311', ort: 'Immenstaad', value_est: 12800, status: 'gebucht', ts: vorTagen(48), termin: inTagen(-6),
      answers: { Projekt: 'Photovoltaik', Dachform: 'Satteldach', Speicher: 'Nein' } },
    { id: 'h8', widget_id: 'sonnenwerk-nord', name: 'Markus Feld', email: 'm.feld@example.de', telefon: '0172 5544331', ort: 'Lindau', value_est: 9800, status: 'verloren', ts: vorTagen(20),
      answers: { Projekt: 'Photovoltaik', Dachform: 'Weiß ich nicht', Jahresverbrauch: 'bis 3.000 kWh' } }
  ];
  /* ── Makler & Finanzen: Immobilien Weber ── */
  var MAKLER = [
    { id: 'm1', widget_id: 'immobilien-weber', name: 'Laura Engel', email: 'laura.engel@example.de', telefon: '0157 1122334', value_est: 11900, status: 'neu', ts: vorStd(1),
      answers: { Anliegen: 'Besichtigung, Kauf', Objekt: '3-Zimmer-Wohnung, Konstanz-Petershausen (Nr. 2417)', Finanzierung: 'Bestätigung der Bank liegt vor', Wunschtermin: 'Samstagvormittag' } },
    { id: 'm2', widget_id: 'immobilien-weber', name: 'Familie Duran', telefon: '0176 6677889', value_est: 1650, status: 'neu', ts: vorTagen(1),
      answers: { Anliegen: 'Besichtigung, Miete', Objekt: '4-Zimmer-Wohnung, Radolfzell (Nr. 2392)', Personen: '4', Einzug: 'ab Dezember' } },
    { id: 'm3', widget_id: 'immobilien-weber', name: 'Dr. Klaus Reimann', email: 'k.reimann@example.de', telefon: '0171 9900112', value_est: 23500, status: 'angerufen', ts: vorTagen(3),
      wv_am: HEUTE, wv_notiz: 'Grundbuchauszug nachfragen',
      answers: { Anliegen: 'Ich möchte verkaufen', Objekt: 'Einfamilienhaus, Allensbach, Baujahr 1998', Zeitraum: 'in 6 bis 12 Monaten' } },
    { id: 'm4', widget_id: 'immobilien-weber', name: 'Sven Oberle', email: 's.oberle@example.de', telefon: '0151 5566112', value_est: 290, status: 'angebot', ts: vorTagen(8),
      angebot_nr: '2026-W07', angebot_am: vorTagen(6), angenommen_am: vorStd(20), angenommen_von: 'Sven Oberle',
      answers: { Anliegen: 'Wertermittlung', Objekt: 'Eigentumswohnung, Singen' } },
    { id: 'm5', widget_id: 'immobilien-weber', name: 'Anja und Ralf Moser', email: 'moser@example.de', telefon: '0160 3322114', value_est: 17600, status: 'gebucht', ts: vorTagen(30), termin: inTagen(-4),
      answers: { Anliegen: 'Besichtigung, Kauf', Objekt: 'Reihenhaus, Konstanz-Wollmatingen', Stand: 'Notartermin war am ' + new Date(inTagen(-4) + 'T12:00:00').toLocaleDateString('de-DE') } },
    { id: 'm6', widget_id: 'immobilien-weber', name: 'Kerstin Vogel', email: 'k.vogel@example.de', telefon: '0152 7788112', value_est: 8200, status: 'verloren', ts: vorTagen(15),
      answers: { Anliegen: 'Ich möchte vermieten', Objekt: '2-Zimmer-Wohnung, Konstanz' } }
  ];

  var SER = [1, 0, 2, 1, 0, 1, 2, 0, 1, 3, 1, 0, 0, 2, 1, 1, 0, 2, 1, 0, 1, 2, 1, 0, 1, 2, 0, 1, 2, 1];
  var VOR = [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0];
  var DASH = {
    'sonnenwerk-nord': function () {
      return { ok: true, days: 30, kpis: { anfragen: 14, starts: 168, quote: 8, avgWert: 19800 }, series: SER, prev: VOR,
        funnel: [['Formular geöffnet', 168, 100], ['Projekt gewählt', 131, 78], ['Dach und Verbrauch', 84, 50], ['Kontaktdaten eingetragen', 19, 11], ['Anfrage abgeschickt', 14, 8]],
        sources: [['Google', 46], ['Direkt auf der Website', 31], ['Empfehlung', 23]],
        top: [{ label: 'Photovoltaik mit Speicher', n: 7 }, { label: 'Wärmepumpe', n: 4 }, { label: 'Photovoltaik', n: 3 }, { label: 'Wallbox', n: 2 }], leads: SOLAR };
    },
    'immobilien-weber': function () {
      return { ok: true, days: 30, kpis: { anfragen: 22, starts: 240, quote: 9, avgWert: 12400 }, series: SER.map(function (x, i) { return x + (i % 3 ? 0 : 1); }), prev: VOR,
        funnel: [['Formular geöffnet', 240, 100], ['Anliegen gewählt', 198, 83], ['Objekt angegeben', 121, 50], ['Kontaktdaten eingetragen', 29, 12], ['Anfrage abgeschickt', 22, 9]],
        sources: [['Link im Exposé', 38], ['Google', 27], ['Direkt auf der Website', 21], ['Instagram', 14]],
        top: [{ label: 'Besichtigung, Kauf', n: 9 }, { label: 'Besichtigung, Miete', n: 6 }, { label: 'Wertermittlung', n: 4 }, { label: 'Ich möchte verkaufen', n: 3 }], leads: MAKLER };
    }
  };

  /* ── Uhrzeit-Termine je Branche (ersetzen im Ein-Formular-Konto die Besichtigungen von Gut Seerose) ── */
  function tm(id, tag, zeit, dauer, name, status, leistung, pn, tel, extra) {
    var p = zeit.split(':'), m = +p[0] * 60 + +p[1] + dauer;
    return Object.assign({ id: id, datum: tag, zeit: zeit, bis_zeit: ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2), dauer: dauer, name: name, status: status, leistung: leistung, personal_id: 'a', personal_name: pn, telefon: tel }, extra || {});
  }
  function woche(von, bis, sa) { var w = [[von, bis]], z = { 1: w, 2: w, 3: w, 4: w, 5: w }; if (sa) z[6] = [sa]; return z; }
  function zt(raster, leistungen, pn, zeiten, termine) {
    return { ok: true, offen: termine.filter(function (t) { return t.status === 'wunsch'; }).length, darf_aendern: true,
      setup: { raster: raster, vorlauf_std: 24, tage: 42, leistungen: leistungen }, personal: [{ id: 'a', name: pn, aktiv: true, zeiten: zeiten }], termine: termine };
  }
  var TERM = {
    catering: function (pn) {
      return zt(30, [{ name: 'Probeessen', dauer: 60, preis: null }, { name: 'Vorgespräch am Telefon', dauer: 30, preis: null }], pn, woche('09:00', '17:00'), [
        tm('ct1', werktag(2), '11:00', 60, 'Familie Yilmaz', 'fest', 'Probeessen', pn, '0176 5544332', { lead_id: 'c2', email: 'yilmaz@example.de' }),
        tm('ct2', werktag(3), '15:30', 30, 'Kita Sonnenschein', 'wunsch', 'Vorgespräch am Telefon', pn, '07531 667788', { lead_id: 'c6', nachricht: 'Bitte erst nach 15 Uhr.' })]);
    },
    handwerk: function (pn) {
      return zt(30, [{ name: 'Vor-Ort-Termin', dauer: 60, preis: null }, { name: 'Beratung am Telefon', dauer: 30, preis: null }], pn, woche('07:30', '17:00'), [
        tm('ht1', werktag(1), '16:00', 60, 'Thomas Brugger', 'wunsch', 'Vor-Ort-Termin', pn, '0171 4455661', { lead_id: 'h1', email: 't.brugger@example.de', nachricht: 'Bitte vorher kurz anrufen.' }),
        tm('ht2', werktag(2), '10:00', 60, 'Sabine Hold', 'fest', 'Vor-Ort-Termin', pn, '0151 2299881', { lead_id: 'h3', email: 'sabine.hold@example.de' }),
        tm('ht3', werktag(3), '08:30', 60, 'Familie Gerster', 'vorschlag', 'Vor-Ort-Termin', pn, '0160 7788990', { lead_id: 'h2' })]);
    },
    beratung: function (pn) {
      return zt(15, [{ name: 'Besichtigung', dauer: 30, preis: null }, { name: 'Erstberatung', dauer: 60, preis: null }, { name: 'Wertermittlung vor Ort', dauer: 90, preis: 290 }], pn, woche('09:00', '18:00', ['10:00', '14:00']), [
        tm('mt1', samstag(), '10:00', 30, 'Laura Engel', 'wunsch', 'Besichtigung', pn, '0157 1122334', { lead_id: 'm1', email: 'laura.engel@example.de', nachricht: 'Objekt Nr. 2417' }),
        tm('mt2', werktag(1), '17:30', 30, 'Familie Duran', 'fest', 'Besichtigung', pn, '0176 6677889', { lead_id: 'm2', nachricht: 'Objekt Nr. 2392' }),
        tm('mt3', werktag(3), '14:00', 90, 'Dr. Klaus Reimann', 'vorschlag', 'Wertermittlung vor Ort', pn, '0171 9900112', { lead_id: 'm3', email: 'k.reimann@example.de' })]);
    }
  };

  /* ── Leistungen, Vorlagen, Team je Branche (Location behält die Beispiele von Gut Seerose) ── */
  function ls(id, name, besch, preis, einheit) { return { id: id, name: name, beschreibung: besch, preis: preis, einheit: einheit || 'pauschal', aktiv: true, sortierung: +id.slice(1) }; }
  var LEIST = {
    kosmetik: [ls('l1', '1:1 Technik Neuset', 'Wimpernverlängerung, ca. 2 Std.', 100), ls('l2', 'Volumentechnik Neuset', 'Wimpernverlängerung, ca. 2,5 Std.', 145), ls('l3', 'Wimpernlifting mit Färben', 'ca. 75 Min.', 50),
      ls('l4', 'Neumodellage mit Verlängerung', 'Gelnägel, ca. 2 Std.', 65), ls('l5', 'Ballancer 6-Wochen-Kur', '12 Behandlungen à 40 Min., 2 davon gratis', 350), ls('l6', 'Haarpigmentierung', 'Individuell geplant, inkl. 4 Sitzungen, ab', 1800)],
    friseur: [ls('l1', 'Herrenschnitt', 'Waschen, Schneiden, Föhnen', 28), ls('l2', 'Damenschnitt', 'Waschen, Schneiden, Föhnen. Langes Haar mit Aufpreis', 52), ls('l3', 'Färben', 'Ansatz oder komplett, je nach Länge', 79),
      ls('l4', 'Blondierung / Silber', 'Nach Beratung, ab 149 €', 149), ls('l5', 'Kinderschnitt', 'bis 12 Jahre', 18)],
    catering: [ls('l1', 'Food Truck vor Ort', 'Anfahrt bis 20 km, Aufbau, 3 Stunden Ausgabe', 450), ls('l2', 'Fingerfood', 'Sechs Sorten, vegetarisch ohne Aufpreis', 14.5, 'pro_person'),
      ls('l3', 'Grill-Buffet', 'Zwei Sorten Fleisch, Gemüse, drei Salate', 24, 'pro_person'), ls('l4', 'Getränke', 'Softdrinks, Wasser, Kaffee', 8, 'pro_person'), ls('l5', 'Jede weitere Stunde', 'Ausgabe vor Ort', 90, 'pro_stunde')],
    handwerk: [ls('l1', 'Vor-Ort-Termin mit Aufmaß', 'Kostenlos im Umkreis von 40 km', 0), ls('l2', 'Photovoltaik 10 kWp', 'Module, Wechselrichter, Montage, Anmeldung', 14900), ls('l3', 'Batteriespeicher 10 kWh', 'Einbau und Einrichtung', 6400),
      ls('l4', 'Wallbox mit Montage', '11 kW, bis 10 m Leitung', 1290), ls('l5', 'Wärmepumpe mit Einbau', 'Luft-Wasser, ohne Förderung gerechnet', 18900), ls('l6', 'Monteurstunde', 'Für Arbeiten außerhalb des Angebots', 68, 'pro_stunde')],
    beratung: [ls('l1', 'Erstberatung', 'Kostenlos und unverbindlich', 0), ls('l2', 'Wertermittlung', 'Kurzgutachten, wird beim Verkauf angerechnet', 290), ls('l3', 'Exposé mit Fotos und Grundriss', 'Für Verkauf oder Vermietung', 390),
      ls('l4', 'Beratung Finanzierung', 'Mit Vergleich mehrerer Banken', 120, 'pro_stunde')]
  };
  function vl(id, art, titel, text) { return { id: id, art: art, titel: titel, sortierung: +id.slice(1), text: text }; }
  var G = '\n\nViele Grüße\n{{ansprechpartner}}';
  var VORL = {
    kosmetik: [vl('v1', 'zusage', 'Termin bestätigt', 'Hallo {{vorname}},\n\nIhr Termin am {{termin}} ist fest eingetragen. Bitte kommen Sie ungeschminkt, dann können wir gleich anfangen.\n\nFalls etwas dazwischenkommt, sagen Sie bitte kurz Bescheid.' + G),
      vl('v2', 'nachfrage', 'Rückfrage zur Behandlung', 'Hallo {{vorname}},\n\ndamit ich genug Zeit einplane: Ist es Ihr erstes Set bei mir, oder kommen Sie zum Auffüllen? Gibt es Allergien, die ich kennen sollte?' + G),
      vl('v3', 'absage', 'Leider ausgebucht', 'Hallo {{vorname}},\n\nam {{termin}} bin ich leider schon ausgebucht. Antworten Sie einfach kurz, dann schlage ich Ihnen freie Zeiten vor.' + G)],
    friseur: [vl('v1', 'zusage', 'Termin bestätigt', 'Hallo {{vorname}},\n\nIhr Termin am {{termin}} ist fest eingetragen. Wir freuen uns auf Sie!\n\nFalls etwas dazwischenkommt, sagen Sie bitte kurz Bescheid.' + G),
      vl('v2', 'nachfrage', 'Rückfrage zur Haarlänge', 'Hallo {{vorname}},\n\ndamit wir genug Zeit einplanen: Wie lang ist Ihr Haar ungefähr? Kinnlang, schulterlang oder länger?' + G),
      vl('v3', 'absage', 'Leider ausgebucht', 'Hallo {{vorname}},\n\nam {{termin}} sind wir leider schon voll. Antworten Sie einfach kurz, dann schlage ich Ihnen freie Zeiten vor.' + G)],
    catering: [vl('v1', 'zusage', 'Zusage mit Angebot', 'Guten Tag {{vorname}},\n\nvielen Dank für Ihre Anfrage. Der {{termin}} ist bei uns noch frei, wir kommen gern.\n\nNach Ihren Angaben liegen wir bei etwa {{summe}}. Das Angebot mit allen Posten liegt bei. Sie können es online mit einem Tipp annehmen.' + G),
      vl('v2', 'nachfrage', 'Rückfrage vor dem Angebot', 'Guten Tag {{vorname}},\n\nvielen Dank für Ihre Anfrage zum {{termin}}. Damit ich Ihnen ein genaues Angebot machen kann: Gibt es vor Ort Strom und einen ebenen Stellplatz?' + G),
      vl('v3', 'absage', 'Freundliche Absage', 'Guten Tag {{vorname}},\n\nvielen Dank, dass Sie an uns gedacht haben. Am {{termin}} sind wir leider schon gebucht. Wenn Sie zeitlich beweglich sind, schlage ich Ihnen gern Ausweichtage vor.' + G)],
    handwerk: [vl('v1', 'zusage', 'Angebot nach dem Vor-Ort-Termin', 'Guten Tag {{vorname}},\n\nvielen Dank für das Gespräch bei Ihnen vor Ort. Anbei unser Angebot über {{summe}}. Es gilt vier Wochen, Sie können es online annehmen.\n\nBei Fragen rufen Sie mich gern an.' + G),
      vl('v2', 'nachfrage', 'Fotos anfragen', 'Guten Tag {{vorname}},\n\ndamit ich Ihnen schnell eine erste Einschätzung geben kann, schicken Sie mir bitte zwei Fotos: den Zählerschrank und das Dach von der Straße aus.' + G),
      vl('v3', 'absage', 'Absage', 'Guten Tag {{vorname}},\n\nvielen Dank für Ihre Anfrage. Für dieses Vorhaben sind wir leider nicht der richtige Betrieb. Gern nenne ich Ihnen einen Kollegen aus der Region.' + G)],
    beratung: [vl('v1', 'zusage', 'Besichtigung bestätigen', 'Guten Tag {{vorname}},\n\ngern zeige ich Ihnen das Objekt am {{termin}}. Bitte bringen Sie, wenn möglich, eine Bestätigung Ihrer Bank zur Finanzierung mit.' + G),
      vl('v2', 'nachfrage', 'Unterlagen anfordern', 'Guten Tag {{vorname}},\n\nfür die Wertermittlung brauche ich noch: Grundbuchauszug, Grundriss, Baujahr und die letzten Modernisierungen.' + G),
      vl('v3', 'absage', 'Objekt vergeben', 'Guten Tag {{vorname}},\n\ndas Objekt ist leider schon vergeben. Soll ich Ihnen Bescheid geben, wenn etwas Ähnliches dazukommt?' + G)]
  };
  var TEAM = {
    kosmetik: [['Mia', 'mitarbeiter', 25], ['Empfang', 'empfang', 0]],
    friseur: [['Ilmir', 'mitarbeiter', 60], ['Patrick', 'mitarbeiter', 40], ['Empfang', 'empfang', 0]],
    catering: [['Lukas Brandt', 'mitarbeiter', 30], ['Aushilfe Wochenende', 'mitarbeiter', 0]],
    hochzeit: [['Sabine Ott', 'mitarbeiter', 64], ['Empfang', 'empfang', 30], ['Timo Kern', 'mitarbeiter', 0]],
    handwerk: [['Büro', 'empfang', 50], ['Jan Albers', 'mitarbeiter', 20]],
    beratung: [['Assistenz', 'empfang', 35]]
  };
  function team(br, dom, wer) {
    return { ok: true, rolle: 'inhaber', darf_verwalten: true, inhaber: { email: 'info@' + dom, name: wer }, rollen: { inhaber: 'Inhaber', mitarbeiter: 'Mitarbeiter', empfang: 'Empfang' },
      team: TEAM[br].filter(function (t) { return t[0] !== wer; }).map(function (t, i) {
        return { id: 't' + (i + 1), email: slugify(t[0]).split('-')[0] + '@' + dom, name: t[0], rolle: t[1], eingeladen_am: vorTagen(t[2] ? t[2] + 1 : 2), aktiv_am: t[2] ? vorTagen(t[2]) : null };
      }) };
  }
  /* Zahlen der Pipeline-Karte aus den Anfragen der Branche */
  function pipe(L) {
    var CH = { neu: .15, angerufen: .35, angebot: .55, gebucht: 1, verloren: 0 };
    function w(l) { return Number(l.value_est) || 0; }
    function seit(l) { return Math.max(0, Math.round((Date.now() - new Date(l.ts).getTime()) / 864e5)); }
    function summe(g) { return g.reduce(function (a, l) { return a + w(l); }, 0); }
    var offen = L.filter(function (l) { return ['gebucht', 'verloren'].indexOf(l.status) < 0; }), gw = Math.round(offen.reduce(function (a, l) { return a + w(l) * (CH[l.status] || 0); }, 0));
    var geb = L.filter(function (l) { return l.status === 'gebucht'; });
    return { ok: true, rolle: 'inhaber', tage: 90, offen_anzahl: offen.length, offen_summe: summe(offen), gewichtet: gw, prognose: Math.round(gw * .8), gebucht_summe: summe(geb),
      quote: L.length ? Math.round(geb.length / L.length * 100) : 0,
      stufen: ['neu', 'angerufen', 'angebot', 'gebucht', 'verloren'].map(function (s) { var g = L.filter(function (l) { return l.status === s; }); return { status: s, anzahl: g.length, summe: summe(g), chance: CH[s] }; }),
      liegen: offen.filter(function (l) { return seit(l) >= 3; }).sort(function (a, b) { return seit(b) - seit(a); }).slice(0, 3)
        .map(function (l) { return { id: l.id, name: l.name, email: l.email || '', status: l.status, wert: w(l), termin: l.termin || null, tage: seit(l) }; }) };
  }
  function buchungen(L, raum) {
    var b = {};
    L.forEach(function (l) { if (l.status === 'gebucht' && /^\d{4}-\d{2}-\d{2}$/.test(l.termin || '')) (b[l.termin] = b[l.termin] || []).push({ lead: l.id, name: l.name, raum: raum, wert: l.value_est || 0, seit: l.ts, storniert: null }); });
    return b;
  }

  /* ── Kosmetik, Nägel & Wimpern (seit 08.10.2026): das Angebot von Kate Cosmetics als Beispiel, Zeiten geschätzt.
     Läuft im Formular „salon-am-see“: Anfragen, Termine und Zahlen werden beim Start der Demo ausgetauscht. */
  var KOS_L = [
    {name:'1:1 Technik Neuset',kat:'Wimpernverlängerung',dauer:120,preis:100,info:'Bitte ungeschminkt kommen und am Behandlungstag auf ölhaltige Creme im Augenbereich verzichten.'},
    {name:'1:1 Technik: Auffüllen nach 2 Wochen',kat:'Wimpernverlängerung',wimpern:true,neuset:'1:1 Technik Neuset',dauer:45,preis:30},
    {name:'1:1 Technik: Auffüllen nach 3 Wochen',kat:'Wimpernverlängerung',wimpern:true,neuset:'1:1 Technik Neuset',dauer:60,preis:45},
    {name:'1:1 Technik: Auffüllen nach 4 Wochen',kat:'Wimpernverlängerung',wimpern:true,neuset:'1:1 Technik Neuset',dauer:75,preis:60},
    {name:'Volumentechnik Neuset',kat:'Wimpernverlängerung',dauer:150,preis:145,info:'Bitte ungeschminkt kommen und am Behandlungstag auf ölhaltige Creme im Augenbereich verzichten.'},
    {name:'Volumentechnik: Auffüllen nach 2 Wochen',kat:'Wimpernverlängerung',wimpern:true,neuset:'Volumentechnik Neuset',dauer:60,preis:40},
    {name:'Volumentechnik: Auffüllen nach 3 Wochen',kat:'Wimpernverlängerung',wimpern:true,neuset:'Volumentechnik Neuset',dauer:75,preis:55},
    {name:'Volumentechnik: Auffüllen nach 4 Wochen',kat:'Wimpernverlängerung',wimpern:true,neuset:'Volumentechnik Neuset',dauer:90,preis:70},
    {name:'Wimpernlifting ohne Färben',kat:'Wimpernlifting',dauer:60,preis:45,info:'Bitte ungeschminkt kommen. Mascara können Sie danach wie gewohnt verwenden.'},
    {name:'Wimpernlifting mit Färben',kat:'Wimpernlifting',dauer:75,preis:50},
    {name:'Haarpigmentierung: Beratungsgespräch',kat:'Haarpigmentierung',dauer:30,preis:1800,ab:true,info:'Jede Haarpigmentierung wird individuell geplant: ab 1.800 € inkl. 4 Sitzungen. Der Preis richtet sich nach Fläche und Aufwand. Die Sitzungen planen wir nach dem Gespräch gemeinsam.'},
    {name:'Neumodellage mit Verlängerung',kat:'Gelnägel',dauer:120,preis:65},
    {name:'Naturnagelverstärkung',kat:'Gelnägel',dauer:90,preis:55},
    {name:'Auffüllen der Modelle',kat:'Gelnägel',dauer:75,preis:40},
    {name:'Maniküre',kat:'Gelnägel',dauer:30,preis:20},
    {name:'Ballancer Einzelbehandlung',kat:'Ballancer',dauer:40,preis:35,info:'Druckwellen-Massage mit dem Ballancer Pro. Empfohlen sind zwei Anwendungen pro Woche.'},
    {name:'Ballancer Einzelbehandlung „Sport“',kat:'Ballancer',dauer:40,preis:30,info:'Lange, tiefe und langsame Massage für die Erholung nach dem Sport.'},
    {name:'Ballancer 6-Wochen-Kur (10 + 2 gratis)',kat:'Ballancer',dauer:40,preis:350,info:'12 Behandlungen à 40 Min.: 10 bezahlen, 2 gratis. Empfohlen sind zwei pro Woche. Hier buchen Sie die erste, die weiteren planen wir gemeinsam.'}];
  var KOS_SALON = { an: true, hinweis: '', reihe: 'leistung', waschen: { an: false, name: 'Waschen & Föhnen', preis: 30, dauer: 30 }, z: { kurz: [0, 0], schulter: [20, 15], lang: [40, 30], lockig: [20, 10], dick: [20, 10], duenn: [0, 0], fein: [0, 0], blond: [0, 0], hellbraun: [0, 0], dunkelbraun: [20, 15], schwarz: [40, 30], rot: [40, 30], grau: [10, 10], vor: [30, 20] } };
  function kosZeit(m) { return m < 60 ? m + ' Min.' : Math.floor(m / 60) + ' Std.' + (m % 60 ? ' ' + m % 60 + ' Min.' : ''); }
  function kosLead(id, name, tel, mail, tag, zeit, pn, posten, status, ts, nachricht) {
    var su = posten.reduce(function (s, x) { return s + x[2]; }, 0), d = posten.reduce(function (s, x) { return s + x[1]; }, 0), nm = posten.map(function (x) { return x[0]; }).join(' + ');
    var wann = (tag === HEUTE ? 'Heute' : tag === inTagen(1) ? 'Morgen' : new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })) + ' · ' + zeit + ' Uhr · ' + pn + ' · ' + nm;
    var aw = [{ k: 'termin_uhrzeit', typ: 'termin', f: 'Termin', a: wann, w: nm, p: null }]
      .concat(posten.map(function (x, j) { return { k: 'termin_uhrzeit_l0_' + j, typ: 'leistung', f: 'Leistung', a: x[0] + ' · ca. ' + kosZeit(x[1]) + (x[3] ? ' · ab-Preis' : ''), w: x[0], p: x[2] }; }))
      .concat([{ k: 'termin_uhrzeit_dauer0', typ: 'dauer', f: 'Dauer', a: 'ca. ' + kosZeit(d) + ' (geschätzt)', p: null }]);
    var ans = { termin_uhrzeit: wann, _auswahl: aw };
    if (nachricht) { ans.nachricht = nachricht; aw.push({ k: 'nachricht', typ: 'text', f: 'Nachricht', a: nachricht, p: null }); }
    return { id: id, widget_id: 'salon-am-see', name: name, telefon: tel, email: mail, termin: tag, value_est: su, status: status, ts: ts, answers: ans };
  }
  function kosLeads(pn) {
    return [
      kosLead('k1', 'Nina Kraus', '0151 4433221', 'nina.kraus@example.de', werktag(0), '13:00', pn, [['1:1 Technik: Auffüllen nach 2 Wochen', 45, 30]], 'neu', vorStd(2)),
      kosLead('k3', 'Laura Fischer', '0176 9988112', 'laura.f@example.de', werktag(1), '10:00', pn, [['Neumodellage mit Verlängerung', 120, 65], ['Maniküre', 30, 20]], 'neu', vorStd(5), 'Gern mandelförmig und eher kurz.'),
      kosLead('k5', 'Anja Schuster', '0160 3322119', 'anja.schuster@example.de', werktag(3), '11:00', pn, [['Haarpigmentierung: Beratungsgespräch', 30, 1800, true]], 'neu', vorTagen(1), 'Ich habe eine lichte Stelle am Oberkopf und möchte mich beraten lassen.'),
      kosLead('k2', 'Sophie Wagner', '0157 2211334', 'sophie.w@example.de', werktag(0), '09:30', pn, [['1:1 Technik Neuset', 120, 100]], 'gebucht', vorTagen(2)),
      kosLead('k4', 'Melanie Braun', '0171 5566778', 'melanie.braun@example.de', werktag(2), '15:00', pn, [['Ballancer 6-Wochen-Kur (10 + 2 gratis)', 40, 350]], 'gebucht', vorTagen(3))
    ];
  }
  function kosTermine(pn) {
    var T = zt(15, JSON.parse(JSON.stringify(KOS_L)), pn, woche('09:00', '18:00', ['09:00', '14:00']), [
      tm('kt2', werktag(0), '09:30', 120, 'Sophie Wagner', 'fest', '1:1 Technik Neuset', pn, '0157 2211334', { lead_id: 'k2', email: 'sophie.w@example.de' }),
      tm('kt1', werktag(0), '13:00', 45, 'Nina Kraus', 'wunsch', '1:1 Technik: Auffüllen nach 2 Wochen', pn, '0151 4433221', { lead_id: 'k1', email: 'nina.kraus@example.de' }),
      tm('kt3', werktag(1), '10:00', 150, 'Laura Fischer', 'wunsch', 'Neumodellage mit Verlängerung + Maniküre', pn, '0176 9988112', { lead_id: 'k3', email: 'laura.f@example.de', nachricht: 'Gern mandelförmig und eher kurz.' }),
      tm('kt4', werktag(2), '15:00', 40, 'Melanie Braun', 'fest', 'Ballancer 6-Wochen-Kur (10 + 2 gratis)', pn, '0171 5566778', { lead_id: 'k4', email: 'melanie.braun@example.de', hinweis: 'Kur: 1. von 12 Behandlungen' }),
      tm('kt5', werktag(3), '11:00', 30, 'Anja Schuster', 'wunsch', 'Haarpigmentierung: Beratungsgespräch', pn, '0160 3322119', { lead_id: 'k5', email: 'anja.schuster@example.de' })]);
    T.setup.salon = JSON.parse(JSON.stringify(KOS_SALON)); T.setup.absage_std = 24;
    return T;
  }
  function kosDash() {
    return { ok: true, days: 30, kpis: { anfragen: 31, starts: 186, quote: 17, avgWert: 92 }, series: SER, prev: VOR,
      funnel: [['Formular geöffnet', 186, 100], ['Behandlung gewählt', 141, 76], ['Uhrzeit gewählt', 79, 42], ['Kontaktdaten eingetragen', 37, 20], ['Termin angefragt', 31, 17]],
      sources: [['Instagram', 48], ['Google', 30], ['Direkt auf der Website', 22]],
      top: [{ label: 'Wimpern auffüllen', n: 12 }, { label: 'Gelnägel', n: 8 }, { label: 'Wimpernlifting', n: 5 }, { label: 'Ballancer', n: 4 }, { label: 'Haarpigmentierung', n: 2 }], leads: C.SALON_DEMO };
  }
  /* Anfragen und Termine der Friseur-Beispiele gegen Kosmetik tauschen. Was man im Konfigurator selbst abgeschickt hat (dx…), bleibt. */
  function kosmetik(pn) {
    var L = C.SALON_DEMO, eigen = L.filter(function (l) { return l._eigen; });
    L.splice(0, L.length); eigen.concat(kosLeads(pn)).forEach(function (l) { L.push(l); });
    var T = kosTermine(pn), alt = (C.TERMINE_SALON.termine || []).filter(function (t) { return /^dx/.test(t.lead_id || ''); });
    alt.forEach(function (t) { t.personal_id = 'a'; t.personal_name = pn; });
    T.termine = alt.concat(T.termine); T.offen = T.termine.filter(function (t) { return t.status === 'wunsch'; }).length;
    Object.keys(T).forEach(function (k) { C.TERMINE_SALON[k] = T[k]; });
    DASH['salon-am-see'] = kosDash;
  }

  /* ── Leer (seit 10.10.2026): so, wie das Cockpit beim Kunden startet. Keine Beispiel-Anfragen, Termine, Zahlen, Buchungen und kein Team,
     Mitarbeiter ist nur der Inhaber. Was man selbst abschickt (js/cz-demo-teilen.js), kommt trotzdem an.
     Steht der Betrieb mit fertigem Formular in kunden/akten.js, kommen Mitarbeiter, Arbeitstage, Leistungen und Inhaltsverzeichnis von dort. */
  function akteVon(betrieb) {
    var n = String(betrieb || '').trim().toLowerCase();
    return (window.CZ_AKTEN || []).filter(function (a) { return String(a.firma || '').trim().toLowerCase() === n; })[0] || null;
  }
  function nurEigene(L) { var e = L.filter(function (l) { return l._eigen; }); L.splice(0, L.length); e.forEach(function (l) { L.push(l); }); }
  function leer(br, vn, betrieb) {
    var A = C.ANTWORT, ak = akteVon(betrieb), f = (ak && ak.formular) || {}, L = liste(br);
    [C.SALON_DEMO, C.CATERING_DEMO, C.LEADS_DEMO, SOLAR, MAKLER].forEach(nurEigene);
    var namen = f.personal && f.personal.length ? f.personal : [vn], z = null;
    if (f.tage && f.tage.length) { z = {}; f.tage.forEach(function (d) { z[d] = [['09:00', '18:00']]; }); }
    [C.TERMINE_SALON, C.TERMINE_LOC].forEach(function (T) {
      var zz = z || (T.personal && T.personal[0] && T.personal[0].zeiten) || woche('09:00', '18:00');
      T.personal = namen.map(function (n, i) { return { id: String.fromCharCode(97 + i), name: n, aktiv: true, zeiten: JSON.parse(JSON.stringify(zz)) }; });
      T.termine = (T.termine || []).filter(function (t) { return /^dx/.test(t.lead_id || ''); });
      T.termine.forEach(function (t) { t.personal_id = 'a'; t.personal_name = namen[0]; });
      T.offen = T.termine.filter(function (t) { return t.status === 'wunsch'; }).length;
    });
    if (f.leistungen && f.leistungen.length) {
      var S = C.TERMINE_SALON.setup = C.TERMINE_SALON.setup || {};
      S.leistungen = JSON.parse(JSON.stringify(f.leistungen));
      var sal = { an: true, hinweis: '', waschen: { an: true, name: 'Waschen & Föhnen', preis: 30, dauer: 30 }, z: JSON.parse(JSON.stringify(KOS_SALON.z)) };
      Object.keys(f.salon || {}).forEach(function (k) { var x = f.salon[k]; sal[k] = (x && typeof x === 'object' && !Array.isArray(x)) ? Object.assign({}, sal[k] || {}, x) : x; });
      if (f.bild) sal.bild = f.bild; if (f.bildText) sal.bildText = f.bildText;
      S.salon = sal;
    }
    A['/leistungen'] = { ok: true, rolle: 'inhaber', leistungen: (f.leistungen || []).map(function (x, i) { return ls('l' + (i + 1), x.name, x.info || '', +x.preis || 0); }) };
    A['/team'].team = [];
    A['/pipeline'] = pipe(L);
    var R = (A['/buchung'] && A['/buchung'].raeume) || [RAUM[br] || 'Termine'];
    A['/buchung'] = { ok: true, raeume: R, buchungen: {} };
    A['/belegung'] = { ok: true, raeume: R, gesperrt: [], frei: [], wochentage: f.tage ? [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return f.tage.indexOf(d) < 0; }) : ((A['/belegung'] && A['/belegung'].wochentage) || []) };
    A['/kalender'] = { ok: true, verbunden: false, tage: [] };
    A['/einstellungen'].anfragen_gespeichert = 0;
    DASH[B.slug] = function () { var M = liste(br); return { ok: true, days: 30, kpis: { anfragen: M.length, starts: 0, quote: 0, avgWert: 0 }, series: [], prev: [], funnel: [], sources: [], top: [], leads: M }; };
  }

  var C = null, B = null, TOBJ = {};
  function liste(br) { return br === 'handwerk' ? SOLAR : br === 'beratung' ? MAKLER : (br === 'friseur' || br === 'kosmetik') ? C.SALON_DEMO : br === 'catering' ? C.CATERING_DEMO : C.LEADS_DEMO; }
  function finde(L, id) { return L.filter(function (l) { return l.id === id; })[0]; }

  window.CZ_DEMO_B = {
    listen: function () { return [SOLAR, MAKLER]; },
    betrieb: function () { return B ? B.betrieb : ''; },
    branche: function () { return B ? B.br : ''; },

    /* Beim Laden: neue Funktionen in die bestehenden Beispiele, Handwerk und Makler dazu */
    ergaenzen: function (c) {
      C = c; var A = c.ANTWORT, x;
      if ((x = finde(c.CATERING_DEMO, 'c2'))) { x.angenommen_am = vorStd(3); x.angenommen_von = 'Elif Yilmaz'; }
      if ((x = finde(c.CATERING_DEMO, 'c3'))) x.answers._gast = { was: 'verschieben', am: vorStd(2), wunsch: inTagen(19), text: 'Unser Vereinsfest ist eine Woche später.' };
      c.CATERING_DEMO.push(
        { id: 'c6', widget_id: 'seerose-catering', name: 'Kita Sonnenschein', email: 'kita.sonnenschein@example.de', telefon: '07531 667788', termin: inTagen(30), value_est: 1450, status: 'angebot', ts: vorTagen(5),
          angebot_nr: '2026-C06', angebot_am: vorTagen(4), ort: 'Litzelstetten', wv_am: HEUTE, wv_notiz: 'Nachfragen, ob das Angebot passt',
          answers: { anlass: 'Sommerfest', gaeste: '60', art: 'Food Truck vor Ort', getraenke: 'Softdrinks', 'Anfahrt (km)': 7 } },
        { id: 'c7', widget_id: 'seerose-catering', name: 'Jana Roth', email: 'jana.roth@example.de', telefon: '0157 2233114', termin: inTagen(18), value_est: 2100, status: 'neu', ts: vorTagen(4), ort: 'Singen',
          answers: { anlass: 'Geburtstag', gaeste: '50', art: 'Grill-Buffet', getraenke: 'Softdrinks und Bier', 'Anfahrt (km)': 31,
            _ausweich: { tage: [inTagen(17), inTagen(18), inTagen(24)], am: vorTagen(2), gewaehlt: inTagen(18), gewaehlt_am: vorStd(5) } } });
      if ((x = finde(c.LEADS_DEMO, 'd3'))) { x.wv_am = HEUTE; x.wv_notiz = 'Zurückrufen wegen Besichtigung'; }
      if ((x = finde(c.LEADS_DEMO, 'd11'))) { x.angenommen_am = vorStd(8); x.angenommen_von = 'Charlotte Ritter'; }
      if ((x = finde(c.LEADS_DEMO, 'd5'))) x.answers._gast = { was: 'verschieben', am: vorStd(20), wunsch: inTagen(170), text: 'Das Standesamt hat uns eine Woche später gegeben.' };
      A['/profile'].widgets.push({ slug: 'sonnenwerk-nord', name: 'Sonnenwerk Nord', status: 'live', art: 'pipeline' }, { slug: 'immobilien-weber', name: 'Immobilien Weber', status: 'live', art: 'pipeline' });
      TOBJ['sonnenwerk-nord'] = TERM.handwerk('Thomas'); TOBJ['immobilien-weber'] = TERM.beratung('Petra');
      var altD = A['/dashboard'], altT = A['/termine'];
      A['/dashboard'] = function (url) {
        var w = decodeURIComponent((String(url).match(/[?&]widget=([^&]+)/) || [])[1] || '');
        if (B && (!w || w === '*')) w = B.slug;
        if (DASH[w]) return DASH[w]();
        var r = altD('?widget=' + encodeURIComponent(w || 'gut-seerose'));
        if (w === '*' && r && r.leads) r = Object.assign({}, r, { leads: r.leads.concat(SOLAR, MAKLER) });
        return r;
      };
      A['/termine'] = function (url) { return !window.ALLE && TOBJ[window.widget] ? TOBJ[window.widget] : altT(url); };
    },

    /* Demo-Zugang mit Branche: ein Formular, Name des Betriebs, Tarif der Branche, Pilotbetrieb */
    anwenden: function (j) {
      if (!C || !j) return;
      var br = SL[j.branche] ? j.branche : 'friseur', slug = SL[br], A = C.ANTWORT;
      var betrieb = String(j.betrieb || '').trim(); if (betrieb.length < 2 || /^Besucher /.test(betrieb)) betrieb = BSP[br];
      var vn = String(j.vorname || '').trim(), nn = String(j.nachname || '').trim();
      if (!vn) { vn = PERS[br][0]; nn = PERS[br][1]; }
      if (br === 'kosmetik') kosmetik(vn);
      var wer = (vn + ' ' + nn).trim(), dom = slugify(betrieb) + '.de', L = liste(br);
      B = { br: br, slug: slug, betrieb: betrieb, leer: !!j.leer };
      var u = A['/profile'].user;
      Object.assign(u, { firma: betrieb, email: 'info@' + dom, vorname: vn, nachname: nn, widget: slug, plan: STUFE[br], stufe: STUFE[br], plan_status: 'aktiv', pilot: true, pilot_seit: vorTagen(0) });
      A['/profile'].widgets = [{ slug: slug, name: betrieb, status: 'live', art: ART[br] }];
      A['/config'] = { ok: true, widget: slug };
      A['/widgets'] = { ok: true, widgets: [{ slug: slug, name: betrieb }] };
      A['/vergleich'] = { ok: true, rolle: 'inhaber', darf_bearbeiten: true, widgets: [{ slug: slug, name: betrieb }], vergleiche: [] };
      var E = A['/einstellungen'];
      Object.assign(E.einstellungen, { mail_haupt: 'info@' + dom, mail_kopie: '', antwort_an: 'info@' + dom, datenschutz_url: 'https://' + dom + '/datenschutz', ansprechpartner: wer, av_name: wer, av_vertrag_von: wer,
        bewertung_url: 'https://g.page/r/' + slugify(betrieb) });
      if (j.telefon) E.einstellungen.telefon = j.telefon;
      E.anfragen_gespeichert = L.length;
      if (LEIST[br]) A['/leistungen'] = { ok: true, rolle: 'inhaber', leistungen: LEIST[br] };
      if (VORL[br]) A['/vorlagen'] = { ok: true, rolle: 'inhaber', vorlagen: VORL[br] };
      A['/team'] = team(br, dom, wer);
      A['/pipeline'] = pipe(L);
      if (br !== 'hochzeit') {
        var bu = buchungen(L, RAUM[br]);
        A['/buchung'] = { ok: true, raeume: [RAUM[br]], buchungen: bu };
        A['/belegung'] = { ok: true, raeume: [RAUM[br]], gesperrt: Object.keys(bu), frei: [], wochentage: RUHE[br] };
      }
      if (TERM[br]) { var T = TERM[br](vn); Object.keys(T).forEach(function (k) { C.TERMINE_LOC[k] = T[k]; }); TOBJ[slug] = C.TERMINE_LOC; }
      if (j.leer) leer(br, vn, betrieb);
    },

    /* Anfrage, die man im Konfigurator selbst abgeschickt hat (js/cz-demo-teilen.js): landet immer im Formular der Demo */
    vorbereiten: function (a) {
      if (!B || !a) return;
      if (B.br === 'friseur' && !a.zeit) { var l0 = B.leer && ((C.TERMINE_SALON.setup || {}).leistungen || [])[0]; a.datum = inTagen(1); a.zeit = '10:15'; a.leistung = (l0 && l0.name) || 'Herrenschnitt'; }
      if (B.br === 'kosmetik' && !a.zeit) { a.datum = inTagen(1); a.zeit = '10:00'; a.leistung = '1:1 Technik Neuset'; a.dauer = 120; a.preis = 100; }
      a.branche = B.br;
    },
    neu: function (a, l) {
      var L = a.branche === 'handwerk' ? SOLAR : a.branche === 'beratung' ? MAKLER : null; if (!L) return false;
      l.widget_id = SL[a.branche]; L.unshift(l); return true;
    },
    /* Texte für Kunden (Vorschlag, Verschieben …) mit dem Namen des Betriebs statt der Beispielnamen */
    namen: function (s) {
      if (!B) return s;
      var n = JSON.stringify(B.betrieb).slice(1, -1);
      return String(s).split('Salon am See').join(n).split('Seerose Catering').join(n).split('Gut Seerose').join(n);
    }
  };
})();
