/* clickzauber — Branchen, Vorlagen und Cockpit-Typ an einer Stelle.
   Wird vom Konfigurator (Vorlagen-Auswahl) und vom Cockpit (welche Ansicht) geladen.
   Der Server ordnet gespeicherte Formulare mit derselben Liste zu: lib/profile.js → PIPELINE_ZG / TERMIN_ZG / AUFTRAG_ZG.

   Drei Cockpit-Typen:
     TERMIN   → Uhrzeit-Termine mit Mitarbeitern (Beauty & Wellness)       → Cockpit-Art „termin“
     PROJEKT  → Anfrage mit Datum, Gästen, Budget (Event & Location)        → „location“ (Häuser) oder „auftrag“ (Food Truck, Foto)
     PIPELINE → Vorqualifizierte Anfrage, Bearbeitung in Stufen (Handwerk, Finanzen & B2B) → „pipeline“ */
(function () {
  'use strict';

  var KATEGORIEN = [
    { id: 'beauty', titel: 'Beauty & Wellness', fokus: 'Termine buchen lassen, Mitarbeiter zuweisen, Auslastung im Blick', typ: 'TERMIN', vorlagen: [
      { id: 'friseur_dh', name: 'Friseur Damen & Herren', sub: 'Tag, Damen oder Herren, Leistungen als runde Kacheln, Haare, Uhrzeit' },
      { id: 'friseur', name: 'Barbier & Herrenfriseur', sub: 'Herrenschnitt: Leistung, Mitarbeiter, Wunschtermin' },
      /* Seit 08.10.2026 eine Kachel für Kosmetik, Nägel und Wimpern, dahinter drei Vorlagen */
      { id: 'kosmetik', name: 'Kosmetik, Nägel & Wimpern', sub: 'Kosmetikstudio, Nagelstudio oder Wimpern', gruppe: [
        { id: 'kosmetik', name: 'Kosmetikstudio', sub: 'Alles in einem: Wimpern, Lifting, Pigmentierung, Gelnägel, Ballancer' },
        { id: 'nagel', name: 'Nagelstudio', sub: 'Behandlung, Mitarbeiter, Wunschtermin' },
        { id: 'wimpern', name: 'Wimpern & Brauen', sub: 'Neuanlage oder Auffüllen, Mitarbeiter, Wunschtermin' }] },
      { id: 'massage', name: 'Massage & Physio\u00adtherapie', sub: 'Beschwerde, Dauer, Wunschtermin' },
      { id: 'tattoo', name: 'Tattoo- & Piercing\u00adstudio', sub: 'Motiv, Körperstelle, Größe, Beratungstermin' }
    ] },
    { id: 'event', titel: 'Event & Location', fokus: 'Machbarkeit, Logistik und Budget vorab klären', typ: 'PROJEKT', vorlagen: [
      { id: 'hochzeit', name: 'Hochzeits-Location', sub: 'Wunschdatum, Gäste, Besichtigung' },
      { id: 'firmenfeier', name: 'Firmenfeier & Tagung', sub: 'Personen, Technik und Catering, Datum' },
      { id: 'foodtruck', name: 'Food Truck & Catering', sub: 'Speisen, Portionen, Strom und Stellplatz' },
      { id: 'fotovideo', name: 'Event-Foto & Videografie', sub: 'Stunden, Location, Lieferformat' },
      { id: 'musik', name: 'DJ & Live-Musik', sub: 'Anlass, Stunden, Technik, Adresse' },
      { id: 'floristik', name: 'Floristik & Event-Deko', sub: 'Anlass, Blumenwunsch, Lieferung' },
      { id: 'konditorei', name: 'Konditorei & Torten', sub: 'Torte, Personen, Abholung oder Lieferung' }
    ] },
    { id: 'handwerk', titel: 'Handwerk & Sanierung', fokus: 'Gut vorqualifiziert: keine Anfahrt für Anfragen, die nicht passen', typ: 'PIPELINE', vorlagen: [
      { id: 'solar', name: 'Solar & Photovoltaik', sub: 'Dachform, Verbrauch, Speicher' },
      { id: 'waermepumpe', name: 'Wärme\u00adpumpe & Heizung', sub: 'Baujahr, bisherige Heizung, Wohnfläche' },
      { id: 'dach', name: 'Dachdecker & Sanierung', sub: 'Art der Arbeit, Gerüst, Zeitraum' },
      { id: 'fenster', name: 'Fensterbau & Türen', sub: 'Anzahl, Material, Neubau oder Altbau' },
      { id: 'elektro', name: 'Elektriker & Smart Home', sub: 'Projekt, Beschreibung, Dringlichkeit' }
    ] },
    { id: 'beratung', titel: 'Finanzen, Immobilien & B2B', fokus: 'Alles Wichtige vor dem ersten Beratungsgespräch', typ: 'PIPELINE', vorlagen: [
      { id: 'makler', name: 'Immobilien\u00admakler', sub: 'Objekt, Kauf oder Miete, Wunschtermin' },
      { id: 'finanzierung', name: 'Bau\u00adfinanzierung & Kredite', sub: 'Kaufpreis, Eigenkapital, Objekt gefunden?' },
      { id: 'versicherung', name: 'Versicherungs\u00admakler', sub: 'Beruf, Alter, wichtigstes Ziel' },
      { id: 'agentur', name: 'Webdesign & Marketing', sub: 'Website heute, Zielgruppe, Budget' },
      { id: 'steuer', name: 'Steuer\u00adberatung & Buch\u00adhaltung', sub: 'Rechtsform, Mitarbeiter, Umsatz' }
    ] }
  ];
  /* Zusätzliche Anlass-Vorlagen für Häuser. Bleiben wählbar, aber eingeklappt unter den vier Kategorien. */
  var WEITERE = ['tagung', 'trauerfeier', 'verein', 'taufe', 'jubilaeum', 'weihnachtsfeier', 'abschlussfeier', 'besichtigung'];

  /* Zielgruppe (zielgruppe im Formular) → Cockpit-Typ. Alte Formulare haben paare / firmen / alle → PROJEKT. */
  var ZG_TYP = {};
  KATEGORIEN.forEach(function (k) { k.vorlagen.forEach(function (v) { ZG_TYP[v.id] = k.typ; (v.gruppe || []).forEach(function (g) { ZG_TYP[g.id] = k.typ; }); }); });
  ['kosmetik', 'barbier'].forEach(function (z) { ZG_TYP[z] = 'TERMIN'; });
  ['paare', 'firmen', 'familien', 'alle', 'catering', 'musik', 'floristik', 'deko', 'konditorei'].forEach(function (z) { ZG_TYP[z] = 'PROJEKT'; });
  var AUFTRAG = ['foodtruck', 'fotovideo', 'catering', 'musik', 'floristik', 'deko', 'konditorei'];

  function cockpitTyp(zg) { return ZG_TYP[zg] || 'PROJEKT'; }
  /* Cockpit-Art, mit der js/cz-art.js arbeitet */
  function artVonZg(zg) {
    var t = cockpitTyp(zg);
    if (t === 'TERMIN') return 'termin';
    if (t === 'PIPELINE') return 'pipeline';
    return AUFTRAG.indexOf(zg) >= 0 ? 'auftrag' : 'location';
  }
  window.CZ_BRANCHEN = { kategorien: KATEGORIEN, weitere: WEITERE, cockpitTyp: cockpitTyp, artVonZg: artVonZg, zgTyp: ZG_TYP };

  /* ── Ab hier nur im Konfigurator ───────────────────────── */
  var V = window.CZ_VORLAGEN;
  if (!V) return;

  function A(key, frage, kurz, opts, x) {
    var o = { key: key, frage: frage, kurz: kurz, typ: 'auswahl', optionen: opts.map(function (p) { var r = { label: p[0], score: p[1] || 0 }; if (p[2]) r.empfohlen = true; return r; }) };
    return Object.assign(o, x || {});
  }
  function T(key, frage, kurz, platz, x) { return Object.assign({ key: key, frage: frage, kurz: kurz, typ: 'text', platzhalter: platz || '' }, x || {}); }
  function D(key, frage, kurz, x) { return Object.assign({ key: key, frage: frage, kurz: kurz, typ: 'datum' }, x || {}); }
  var ORT = T('ort', 'Wo soll gearbeitet werden?', 'Ort', 'Postleitzahl und Ort', { pflicht: true });
  var NACHRICHT = T('nachricht', 'Möchten Sie noch etwas ergänzen?', 'Nachricht', 'Was wir vorab wissen sollten', { optional: true });

  function pipe(name, ic, zg, seiten) {
    return {
      label: name, ic: ic, name: name + ' · Anfrage', zielgruppe: zg,
      theme: { accent: '#2f7d59', font: 'DM Sans', fontAnswer: 'DM Sans' },
      lead: { felder: ['name', 'email', 'telefon'], consent: true },
      summary: { titel: 'Ihre Anfrage', zeigeZusammenfassung: true, zeigePreis: false, zeigeAnsprechpartner: true, ansprechpartner: { name: '', rolle: 'Ihr Ansprechpartner', kontakt: '' }, cta: true },
      seiten: seiten.concat([{ titel: 'Noch etwas?', fragen: [NACHRICHT] }])
    };
  }

  /* Termin-Betriebe: aufgebaut wie der Friseur, mit einer zusätzlichen Seite vorn. */
  function termin(zg, label, ic, name, leist, vorn, platz) {
    var f = V.friseur; if (!f) return null;
    var v = JSON.parse(JSON.stringify(f));
    v.label = label; v.ic = ic; v.name = name; v.zielgruppe = zg; delete v.sprachen;
    v.termin.leistungen = leist;
    var fr = v.seiten[1] && v.seiten[1].fragen[0]; if (fr) { fr.platzhalter = platz; delete fr.tr; }
    if (vorn) v.seiten.unshift(vorn);
    return v;
  }

  var NEU = {
    massage: termin('massage', 'Massage & Physiotherapie', '◌', 'Massage-Termin',
      [{ name: 'Massage 30 Minuten', dauer: 30, preis: 39 }, { name: 'Massage 60 Minuten', dauer: 60, preis: 69 }, { name: 'Massage 90 Minuten', dauer: 90, preis: 95 }],
      { titel: 'Ihr Anliegen', fragen: [A('fokus', 'Worum geht es?', 'Fokus', [['Rücken und Nacken', 0, 1], ['Schulter', 0], ['Beine und Füße', 0], ['Entspannung', 0], ['Sport oder Verletzung', 0]])] },
      'z. B. seit zwei Wochen Verspannung im Nacken'),
    tattoo: termin('tattoo', 'Tattoo- & Piercingstudio', '✦', 'Beratungstermin',
      [{ name: 'Beratungsgespräch Tattoo', dauer: 30, preis: 0 }, { name: 'Piercing', dauer: 30, preis: 45 }],
      { titel: 'Ihr Motiv', fragen: [
        T('motiv', 'Was stellen Sie sich vor?', 'Motiv', 'Motiv, Stil, gern mit Vorlage', { pflicht: true }),
        A('stelle', 'An welcher Körperstelle?', 'Körperstelle', [['Arm', 0, 1], ['Bein', 0], ['Rücken', 0], ['Brust', 0], ['Andere Stelle', 0]]),
        A('groesse', 'Wie groß ungefähr?', 'Größe', [['Bis 5 cm', 4], ['5 bis 15 cm', 8, 1], ['15 bis 30 cm', 14], ['Großflächig', 20]])
      ] },
      'z. B. erstes Tattoo, Feinlinien'),

    solar: pipe('Solar & Photovoltaik', '☀', 'solar', [
      { titel: 'Ihr Dach', fragen: [A('dach', 'Welche Dachform hat Ihr Haus?', 'Dachform', [['Satteldach', 12, 1], ['Flachdach', 10], ['Pultdach', 10], ['Walmdach', 8], ['Weiß ich nicht', 4]]), ORT] },
      { titel: 'Ihr Verbrauch', fragen: [A('verbrauch', 'Wie viel Strom verbrauchen Sie im Jahr?', 'Jahresverbrauch', [['Bis 3.000 kWh', 6], ['3.000 bis 5.000 kWh', 12, 1], ['5.000 bis 8.000 kWh', 16], ['Über 8.000 kWh', 20], ['Weiß ich nicht', 4]])] },
      { titel: 'Speicher', fragen: [A('speicher', 'Wünschen Sie einen Stromspeicher?', 'Speicher', [['Ja', 14, 1], ['Nein', 6], ['Beratung gewünscht', 10]])] }
    ]),
    waermepumpe: pipe('Wärmepumpe & Heizung', '♨', 'waermepumpe', [
      { titel: 'Ihr Haus', fragen: [A('baujahr', 'Wann wurde das Haus gebaut?', 'Baujahr', [['Vor 1978', 8], ['1979 bis 1994', 10], ['1995 bis 2015', 14, 1], ['Nach 2015', 16]]), ORT] },
      { titel: 'Heizung heute', fragen: [A('heizung', 'Wie heizen Sie bisher?', 'Heizart', [['Gas', 12, 1], ['Öl', 14], ['Strom oder Nachtspeicher', 12], ['Fernwärme', 4], ['Andere', 6]])] },
      { titel: 'Wohnfläche', fragen: [A('flaeche', 'Wie groß ist die Wohnfläche?', 'Wohnfläche', [['Bis 100 m²', 8], ['100 bis 150 m²', 12, 1], ['150 bis 250 m²', 16], ['Über 250 m²', 18]])] }
    ]),
    dach: pipe('Dachdecker & Sanierung', '⌂', 'dach', [
      { titel: 'Die Arbeit', fragen: [A('art', 'Was soll gemacht werden?', 'Art', [['Neu eindecken', 20, 1], ['Reparatur', 8], ['Dämmung', 16], ['Dachfenster', 10], ['Flachdach abdichten', 12]]), ORT] },
      { titel: 'Gerüst', fragen: [A('geruest', 'Wird ein Gerüst gebraucht?', 'Gerüst', [['Ja', 12], ['Nein', 6], ['Weiß ich nicht', 8, 1]])] },
      { titel: 'Zeitraum', fragen: [A('zeitraum', 'Wann soll es losgehen?', 'Zeitraum', [['So schnell wie möglich', 16], ['In 1 bis 3 Monaten', 14, 1], ['In 3 bis 6 Monaten', 10], ['Später, erst informieren', 4]])] }
    ]),
    fenster: pipe('Fensterbau & Türen', '▦', 'fenster', [
      { titel: 'Umfang', fragen: [A('anzahl', 'Wie viele Fenster oder Türen?', 'Anzahl', [['1 bis 3', 6], ['4 bis 8', 12, 1], ['9 bis 15', 16], ['Mehr als 15', 20]]), ORT] },
      { titel: 'Material', fragen: [A('material', 'Welches Material wünschen Sie?', 'Material', [['Kunststoff', 10, 1], ['Holz', 12], ['Holz-Aluminium', 14], ['Aluminium', 14], ['Beratung gewünscht', 8]])] },
      { titel: 'Gebäude', fragen: [A('bau', 'Neubau oder Austausch?', 'Gebäude', [['Neubau', 14], ['Altbau, Austausch', 12, 1]])] }
    ]),
    elektro: pipe('Elektriker & Smart Home', 'ϟ', 'elektro', [
      { titel: 'Das Projekt', fragen: [A('projekt', 'Worum geht es?', 'Projekt', [['Störung oder Reparatur', 8], ['Neuinstallation', 16, 1], ['Smart Home', 14], ['Wallbox', 12], ['Zählerschrank oder E-Check', 10]]), ORT] },
      { titel: 'Beschreibung', fragen: [T('beschreibung', 'Beschreiben Sie kurz, was los ist oder was geplant ist.', 'Beschreibung', 'z. B. Sicherung fliegt raus, sobald der Herd läuft', { pflicht: true })] },
      { titel: 'Dringlichkeit', fragen: [A('dringend', 'Wie dringend ist es?', 'Dringlichkeit', [['Notfall, heute', 16], ['Diese Woche', 12], ['In den nächsten Wochen', 10, 1], ['Nur Planung', 6]])] }
    ]),

    makler: pipe('Immobilienmakler', '⌂', 'makler', [
      { titel: 'Ihr Anliegen', fragen: [A('anliegen', 'Worum geht es?', 'Anliegen', [['Besichtigung, Kauf', 14, 1], ['Besichtigung, Miete', 8], ['Ich möchte verkaufen', 20], ['Ich möchte vermieten', 12], ['Wertermittlung', 14]])] },
      { titel: 'Das Objekt', fragen: [T('objekt', 'Um welches Objekt geht es?', 'Objekt', 'Objekt-Nummer oder Adresse', { optional: true })] },
      { titel: 'Termin', fragen: [D('termin', 'Wann passt es Ihnen?', 'Wunschtermin')] }
    ]),
    finanzierung: pipe('Baufinanzierung & Kredite', '€', 'finanzierung', [
      { titel: 'Kaufpreis', fragen: [A('preis', 'Wie hoch ist der Kaufpreis ungefähr?', 'Kaufpreis', [['Bis 250.000 €', 8], ['250.000 bis 500.000 €', 14, 1], ['500.000 bis 800.000 €', 18], ['Über 800.000 €', 20]])] },
      { titel: 'Eigenkapital', fragen: [A('ek', 'Wie viel Eigenkapital bringen Sie mit?', 'Eigenkapital', [['Unter 10 %', 4], ['10 bis 20 %', 10, 1], ['20 bis 30 %', 16], ['Über 30 %', 20]])] },
      { titel: 'Das Objekt', fragen: [A('objekt', 'Haben Sie das Objekt schon gefunden?', 'Objekt', [['Ja, Kauf steht bevor', 20], ['Ja, in Besichtigung', 14, 1], ['Noch auf der Suche', 6], ['Anschlussfinanzierung', 14]])] }
    ]),
    versicherung: pipe('Versicherungsmakler', '◈', 'versicherung', [
      { titel: 'Beruf', fragen: [A('beruf', 'Was machen Sie beruflich?', 'Beruf', [['Angestellt', 10, 1], ['Selbstständig', 14], ['Beamtet', 12], ['Ausbildung oder Studium', 6], ['Rente', 6]])] },
      { titel: 'Alter', fragen: [A('alter', 'Wie alt sind Sie?', 'Alter', [['Unter 25', 6], ['25 bis 39', 12, 1], ['40 bis 54', 12], ['55 oder älter', 8]])] },
      { titel: 'Ihr Ziel', fragen: [A('ziel', 'Was ist Ihnen am wichtigsten?', 'Ziel', [['Berufsunfähigkeit', 14, 1], ['Krankenversicherung', 12], ['Altersvorsorge', 14], ['Haftpflicht und Hausrat', 6], ['Absicherung für die Firma', 16]])] }
    ]),
    agentur: pipe('Webdesign & Marketing', '◐', 'agentur', [
      { titel: 'Ihre Website', fragen: [A('website', 'Wie steht es um Ihre Website?', 'Website', [['Noch keine', 12], ['Veraltet', 14, 1], ['Vorhanden, soll mehr bringen', 12]]), T('url', 'Adresse der Website', 'Adresse', 'www.ihre-firma.de', { optional: true })] },
      { titel: 'Zielgruppe', fragen: [T('zielgruppe', 'Wen möchten Sie erreichen?', 'Zielgruppe', 'z. B. Familien im Umkreis von 30 km', { pflicht: true })] },
      { titel: 'Budget', fragen: [A('budget', 'Welches Budget planen Sie im Monat?', 'Budget', [['Unter 500 €', 4], ['500 bis 1.500 €', 10, 1], ['1.500 bis 5.000 €', 16], ['Über 5.000 €', 20]])] }
    ]),
    steuer: pipe('Steuerberatung & Buchhaltung', '§', 'steuer', [
      { titel: 'Rechtsform', fragen: [A('form', 'Welche Rechtsform hat Ihr Unternehmen?', 'Rechtsform', [['Einzelunternehmen', 10, 1], ['Freiberuflich', 10], ['GbR', 12], ['GmbH oder UG', 16], ['Privatperson', 4]])] },
      { titel: 'Mitarbeiter', fragen: [A('ma', 'Wie viele Mitarbeiter haben Sie?', 'Mitarbeiter', [['Keine', 6, 1], ['1 bis 5', 12], ['6 bis 20', 16], ['Über 20', 20]])] },
      { titel: 'Umsatz', fragen: [A('umsatz', 'Wie hoch ist der Jahresumsatz ungefähr?', 'Umsatz', [['Bis 50.000 €', 6], ['50.000 bis 250.000 €', 12, 1], ['250.000 € bis 1 Mio. €', 16], ['Über 1 Mio. €', 20]])] }
    ])
  };
  Object.keys(NEU).forEach(function (k) { if (NEU[k] && !V[k]) V[k] = NEU[k]; });

  /* Auftrags-Betriebe: ein Tag, ein Ort — aufgebaut wie der Food Truck (Kalender, Richtpreis, Grenzen), eigene Fragen. */
  function AO(key, frage, kurz, opts, x) {
    return Object.assign({ key: key, frage: frage, kurz: kurz, typ: 'auswahl', optionen: opts.map(function (p) { return Object.assign({ label: p[0], score: 0 }, p[1] || {}); }) }, x || {});
  }
  function ADR(key, frage, kurz, x) { return T(key, frage, kurz, 'Straße, Hausnummer, PLZ und Ort', Object.assign({ adresse: true, hinweis: 'Tippen Sie los, wir schlagen passende Adressen vor.' }, x || {})); }
  function TAG(frage) { return { key: 'termin', frage: frage || 'Für welchen Tag brauchen Sie uns?', kurz: 'Termin', typ: 'datum', hinweis: 'Grün markierte Tage sind noch frei.' }; }
  function auftragV(zg, label, ic, name, theme, au, seiten) {
    var f = V.foodtruck; if (!f) return null;
    var v = JSON.parse(JSON.stringify(f));
    v.label = label; v.ic = ic; v.name = name; v.zielgruppe = zg; v.theme = theme; v.auftrag = au; delete v.sprachen;
    var schluss = v.seiten[v.seiten.length - 1];
    v.seiten = seiten.concat(schluss ? [schluss] : []);
    return v;
  }
  var AUFTRAG_NEU = {
    musik: auftragV('musik', 'DJ & Live-Musik', '♫', 'DJ-Anfrage', { accent: '#4b3f8f', font: 'DM Sans', fontAnswer: 'DM Sans', skin: 'glass-milk' },
      { minUmsatz: 400, maxKm: 100, kmPreis: 0.8, ohneStrom: 60, proTag: 1 }, [
        { titel: 'Ihr Termin', fragen: [TAG(), AO('anlass', 'Was wird gefeiert?', 'Anlass', [['Hochzeit', { empfohlen: true }], ['Geburtstag oder Privatfeier'], ['Firmenfeier'], ['Party, Club oder Bar'], ['Andere Feier']])] },
        { titel: 'Zeit', fragen: [
          AO('beginn', 'Ab wann soll Musik laufen?', 'Uhrzeit', [['Ab Nachmittag'], ['Ab 18 Uhr'], ['Ab 20 Uhr', { empfohlen: true }], ['Ab 22 Uhr']]),
          AO('dauer', 'Wie lange soll Musik laufen?', 'Dauer', [['Bis 4 Stunden', { preis: 450 }], ['Bis 6 Stunden', { preis: 600, empfohlen: true }], ['Bis 8 Stunden', { preis: 750 }], ['Open End', { preis: 900, beschreibung: 'Wir spielen, solange getanzt wird.' }]])
        ] },
        { titel: 'Gäste & Technik', fragen: [
          AO('gaeste', 'Wie viele Gäste kommen?', 'Gäste', [['Bis 50 Gäste'], ['50 bis 100 Gäste', { empfohlen: true }], ['100 bis 200 Gäste'], ['Über 200 Gäste (größere Anlage)', { preis: 150 }]]),
          AO('technik', 'Was sollen wir mitbringen?', 'Technik', [['Anlage und Lichtshow', { preis: 150, empfohlen: true }], ['Nur die Musikanlage'], ['Anlage ist vor Ort vorhanden']]),
          AO('mikrofon', 'Brauchen Sie ein Mikrofon für Reden?', 'Mikrofon', [['Ja'], ['Nein']], { optional: true })
        ] },
        { titel: 'Ort', fragen: [
          ADR('ort', 'Wo wird gefeiert?', 'Adresse'),
          AO('strom', 'Gibt es Strom vor Ort?', 'Strom', [['Normale Steckdose (230 V)', { empfohlen: true }], ['Kein Strom vor Ort', { beschreibung: 'Wir bringen einen Generator mit, das kostet etwas extra.' }], ['Weiß ich nicht']]),
          AO('aufbau', 'Wo bauen wir auf?', 'Aufbau', [['Drinnen'], ['Draußen, überdacht'], ['Draußen, ohne Dach']], { optional: true })
        ] },
        { titel: 'Musik', fragen: [T('musikwunsch', 'Welche Musik wünschen Sie sich?', 'Musikwunsch', 'z. B. 80er, Charts, Schlager, bitte kein Techno', { optional: true })] }
      ]),
    floristik: auftragV('floristik', 'Floristik & Event-Deko', '❀', 'Blumen-Anfrage', { accent: '#5f7a48', font: 'Cormorant Garamond', fontAnswer: 'DM Sans', skin: 'glass-milk' },
      { minUmsatz: 150, maxKm: 40, proTag: 2 }, [
        { titel: 'Ihr Anlass', fragen: [AO('anlass', 'Wofür brauchen Sie Blumen?', 'Anlass', [['Hochzeit', { empfohlen: true }], ['Trauerfeier'], ['Firmenevent'], ['Geburtstag oder Jubiläum'], ['Andere Feier']]), TAG('Für welchen Tag?')] },
        { titel: 'Was wir binden', fragen: [
          { key: 'umfang', frage: 'Was brauchen Sie?', kurz: 'Umfang', typ: 'mehrfach', optionen: ['Brautstrauß', 'Anstecker und Armschmuck', 'Tischdeko', 'Kirchen- oder Trauschmuck', 'Autoschmuck', 'Kranz oder Gesteck', 'Raumdeko'].map(function (l) { return { label: l, score: 0 }; }) },
          AO('tische', 'Wie viele Tische sollen geschmückt werden?', 'Tische', [['Keine'], ['Bis 5'], ['6 bis 10', { empfohlen: true }], ['11 bis 20'], ['Mehr als 20']], { optional: true })
        ] },
        { titel: 'Ihr Wunsch', fragen: [
          T('farben', 'Haben Sie Farb- oder Blumenwünsche?', 'Farbwunsch', 'z. B. Weiß und Salbeigrün, Pfingstrosen', { optional: true }),
          AO('budget', 'Welches Budget planen Sie für Blumen?', 'Budget', [['Bis 300 €'], ['300 bis 800 €', { empfohlen: true }], ['800 bis 1.500 €'], ['Über 1.500 €']])
        ] },
        { titel: 'Abholung oder Lieferung', fragen: [
          AO('lieferung', 'Holen Sie ab oder sollen wir liefern?', 'Lieferung', [['Ich hole ab'], ['Bitte liefern', { empfohlen: true }], ['Liefern und vor Ort aufbauen']]),
          ADR('lieferadresse', 'Wohin sollen wir liefern?', 'Lieferadresse', { wenn: { key: 'lieferung', ist: ['Bitte liefern', 'Liefern und vor Ort aufbauen'] } })
        ] }
      ]),
    konditorei: auftragV('konditorei', 'Konditorei & Torten', '◓', 'Torten-Anfrage', { accent: '#a4505a', font: 'Playfair Display', fontAnswer: 'DM Sans', skin: 'glass-milk' },
      { minPersonen: 10, minUmsatz: 60, maxKm: 30, preisVon: 4.5, preisBis: 7, kmPreis: 1, proTag: 3, posten: 'Torte für' }, [
        { titel: 'Ihre Torte', fragen: [AO('art', 'Was dürfen wir backen?', 'Art', [['Hochzeitstorte', { empfohlen: true }], ['Geburtstagstorte'], ['Motivtorte'], ['Sweet Table'], ['Cupcakes oder Cake Pops']]), TAG('Für welchen Tag brauchen Sie die Torte?')] },
        { titel: 'Personen', fragen: [AO('personen', 'Für wie viele Personen?', 'Personen', [['Bis 20 Personen', { gaeste: 20 }], ['20 bis 40 Personen', { gaeste: 40, empfohlen: true }], ['40 bis 80 Personen', { gaeste: 80 }], ['80 bis 150 Personen', { gaeste: 150 }], ['Über 150 Personen', { gaeste: 200 }]])] },
        { titel: 'Geschmack', fragen: [
          T('geschmack', 'Welche Geschmacksrichtung wünschen Sie?', 'Geschmack', 'z. B. Schokolade und Himbeere, Zitrone', { optional: true }),
          { key: 'allergie', frage: 'Gibt es Unverträglichkeiten?', kurz: 'Unverträglichkeiten', typ: 'mehrfach', optional: true, optionen: ['Ohne Nüsse', 'Glutenfrei', 'Laktosefrei', 'Vegan', 'Ohne Alkohol'].map(function (l) { return { label: l, score: 0 }; }) }
        ] },
        { titel: 'Abholung oder Lieferung', fragen: [
          AO('lieferung', 'Holen Sie die Torte ab?', 'Lieferung', [['Ich hole ab', { empfohlen: true }], ['Bitte liefern']]),
          ADR('lieferadresse', 'Wohin sollen wir liefern?', 'Lieferadresse', { wenn: { key: 'lieferung', ist: ['Bitte liefern'] } })
        ] }
      ])
  };
  Object.keys(AUFTRAG_NEU).forEach(function (k) { if (AUFTRAG_NEU[k] && !V[k]) V[k] = AUFTRAG_NEU[k]; });

  if (window.MARKEN) Object.assign(window.MARKEN, {
    massage: 'Praxis Ruhepol', tattoo: 'Ink & Needle', solar: 'Sonnenwerk Nord', waermepumpe: 'Wärme Meier', dach: 'Dachbau Krüger',
    fenster: 'Fensterbau Lange', elektro: 'Elektro Brandt', makler: 'Immobilien Weber', finanzierung: 'Finanzkontor Süd',
    versicherung: 'Vorsorge Becker', agentur: 'Studio Weitblick', steuer: 'Kanzlei Hoffmann',
    musik: 'Klangwerk Events', floristik: 'Blütenwerk', konditorei: 'Tortenatelier Rosa'
  });

  /* ── Vorlagen-Auswahl: vier Kategorien ── */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function kachel(id, name, sub) {
    var v = V[id]; if (!v) return '';
    return '<div class="cat" onclick="startTpl(\'' + id + '\')"><div class="ic">' + esc(v.ic || '✦') + '</div><h3>' + esc(name) + '</h3><span><span>' + esc(sub) + '</span></span></div>';
  }
  function gruppeKachel(v) {
    var ic = (V[v.gruppe[0].id] || {}).ic || '✦';
    return '<div class="cat cz-gr" onclick="czGruppe(\'' + v.id + '\')"><div class="ic">' + esc(ic) + '</div><h3>' + esc(v.name) + '</h3><span><span>' + esc(v.sub + ' · ' + v.gruppe.length + ' Vorlagen') + '</span></span></div>';
  }
  function gruppeVon(id) { var r = null; KATEGORIEN.forEach(function (k) { k.vorlagen.forEach(function (v) { if (v.gruppe && v.id === id) r = v; }); }); return r; }
  /* ?gruppe=kosmetik öffnet die Gruppe gleich (Demo von Kosmetikstudios) */
  var GR_URL = (location.search.match(/[?&]gruppe=([a-z_]+)/) || [])[1] || '';
  window.czGruppe = function (id) {
    var g = gruppeVon(id); if (!g) { window.showPick(); return; }
    document.getElementById('cats').innerHTML = '<div class="catkopf cz-kat"><b>' + esc(g.name) + '</b><span>Wählen Sie, was zu Ihrem Studio passt. Leistungen, Zeiten und Preise ändern Sie danach selbst.</span></div>'
      + g.gruppe.map(function (x) { return kachel(x.id, x.name, x.sub); }).join('')
      + '<div class="cat cz-zur" onclick="showPick()"><div class="ic">‹</div><h3>Alle Vorlagen</h3><span><span>Zurück zur Übersicht</span></span></div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  };
  window.showPick = function () {
    ['hub', 'app', 'wiz'].forEach(function (i) { var x = document.getElementById(i); if (x) x.style.display = 'none'; });
    document.getElementById('pick').style.display = 'block';
    var html = KATEGORIEN.map(function (k) {
      return '<div class="catkopf cz-kat"><b>' + esc(k.titel) + '</b><span>' + esc(k.fokus) + '</span></div>'
        + k.vorlagen.map(function (v) { return v.gruppe ? gruppeKachel(v) : kachel(v.id, v.name, v.sub); }).join('');
    }).join('');
    var weitere = WEITERE.filter(function (id) { return V[id]; });
    if (weitere.length) html += '<details class="cz-weitere"><summary>Weitere Vorlagen für Häuser und Locations (' + weitere.length + ')</summary><div class="cz-weitere-l">'
      + weitere.map(function (id) { return kachel(id, V[id].label, (V[id].seiten || []).length + ' Seiten, fertig ausgefüllt'); }).join('') + '</div></details>';
    html += '<div class="catkopf">Ohne Vorlage</div><div class="cat" onclick="startTpl(\'blank\')"><div class="ic">○</div><h3>Etwas anderes</h3><span><span>Leeres Formular, frei aufbauen</span></span></div>';
    document.getElementById('cats').innerHTML = html;
    if (GR_URL) { var g0 = GR_URL; GR_URL = ''; if (gruppeVon(g0)) window.czGruppe(g0); }
  };
  var st = document.createElement('style');
  st.textContent = '.cz-kat{display:flex;flex-direction:column;gap:3px}.cz-kat b{font-size:inherit}.cz-kat span{font-weight:400;text-transform:none;letter-spacing:0;font-size:13.5px;opacity:.75}'
    + '.cz-weitere{grid-column:1/-1;margin-top:10px}.cz-weitere summary{cursor:pointer;font-weight:600;padding:12px 0;min-height:44px}'
    + '.cz-weitere-l{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}'
    + '#cats .cat{min-width:0;overflow:hidden}#cats .cat h3{hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word;word-break:normal;text-wrap:balance}#cats .cat span{hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}'
    + '.cz-kat span{font-family:inherit}'
    + '@media(min-width:900px){#cats.cats,.cz-weitere-l{grid-template-columns:repeat(5,minmax(0,1fr))}#cats .cat{padding:14px 12px}#cats .cat h3{font-size:15.5px;line-height:1.28}#cats .cat span{font-size:12.5px}}';
  document.head.appendChild(st);
})();
