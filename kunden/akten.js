/* Kundenakten für die Plattform (clickzauber-plattform.html, Reiter „Kundenübersicht“, js/cz-kundenakte.js). Seit 09.10.2026.
   Je Betrieb ein Eintrag, verknüpft über den Betriebsnamen (firma), so wie er im Konto steht.
   Ohne Eintrag zeigt die Plattform das Konto trotzdem, nur ohne Logo, Angebot und Bilder.
   Mit „vorbauen“ steht der Betrieb schon vor dem Vorbauen als Karte da („Jetzt vorbauen“, Angaben vorausgefüllt).
   ACHTUNG: Diese Datei ist auf clickzauber.de lesbar. Nur, was der Betrieb selbst veröffentlicht (Impressum, Website).
   Notizen und Absprachen gehören in die Notiz der Akte (liegt auf dem Server, sieht nur Manuel).
   Felder: firma, name (Ansprache, z. B. „Kate“), logo, logo_grund (Hintergrund hinter einem dunklen Logo), kurz (Karte), zeile (Untertitel der Akte), email, ust,
   vorbauen {firma, vorname, nachname, telefon, website, strasse, plz_ort, datenschutz_url},
   formular {vorlage, name, betrieb, accent, skin, font, fontAnswer, eigen{flaeche, knopf}, logo, bild, bildText, personal[], tage[], platz, salon{}, leistungen[], v}: das fertig gebaute Formular.
   leistungen ersetzt die Leistungen der Vorlage, salon ergänzt die Einstellungen des Inhaltsverzeichnisses (z. B. reihe), platz = Beispiel im Nachrichtenfeld.
   v = Kürzel für die Vorschau verkaufsslides/inhaltsverzeichnis.html?v=… (liest den Eintrag hier, braucht leistungen oder seiten).
   Anfrage-Formulare (z. B. Food Truck): seiten = alle Fragen (ersetzt die der Vorlage), auftrag = Mindestumsatz, km-Preis usw., ansprechpartner {name, rolle};
   bild und bildText stehen dann über der ersten Frage. Eine Option mit preisVon/preisBis (und posten) setzt den Preis pro Person. angebot_spalte = Name der mittleren Spalte (sonst „Dauer“). Die Kundenakte setzt es
   mit einem Knopf ins vorgebaute Konto (clickzauber-editor.html?einsetzen=Betriebsname, gespeichert als Entwurf). Danach ändert man es im Konfigurator. zeigen [[Titel, Link, Satz]],
   angebot [[Gruppe, [[Leistung, Dauer, Preis]]]], angebot_hinweis, bilder [[Datei, Satz]]. Pfade von der Wurzel aus.
   Seit 13.10.2026: preis {basis, titel, wochentag, saison} = Grundpreis mit Faktoren, sumTitel = Überschrift der Einschätzung. Fragen mit gaeste: true liefern die Gästespanne,
   proGast an Antworten rechnet mal Gäste (von bis), aufAnfrage zeigt „auf Anfrage“ statt „inklusive“. */
window.CZ_AKTEN = [
  {
    /* Testbetrieb (seit 13.10.2026), kein echter Kunde: zum Durchspielen von Vorbauen, Einladung, Test und Überführen.
       Telefon fehlt mit Absicht (Datei ist online lesbar): beim Vorbauen die eigene Nummer eintragen. */
    firma: 'Test Firma 00', name: 'Test', kurz: 'Testbetrieb · Friseur', zeile: 'Zum Durchspielen des ganzen Wegs bis zum echten Konto. Kein echter Kunde.',
    email: 'projekt@clickzauber.de',
    vorbauen: { firma: 'Test Firma 00', vorname: 'Test', nachname: 'Kunde', telefon: '', website: 'https://clickzauber.de', strasse: 'Teststraße 1', plz_ort: '88131 Lindau (Bodensee)', datenschutz_url: 'https://clickzauber.de/datenschutz.html' },
    formular: { v: 'test00', vorlage: 'friseur_dh', name: 'Test Firma 00', betrieb: 'Test Firma 00', accent: '#2f7d59', skin: 'klar-hell', font: 'DM Sans',
      personal: ['Test'], tage: [1, 2, 3, 4, 5], platz: 'z. B. Wunschschnitt oder eine Frage',
      leistungen: [
        { name: 'Herrenschnitt', kat: 'Haarschnitt', dauer: 30, preis: 28, fuer: 'herren' },
        { name: 'Bart trimmen', kat: 'Bart', dauer: 20, preis: 15, fuer: 'herren' },
        { name: 'Damenschnitt', kat: 'Haarschnitt', dauer: 45, preis: 45, fuer: 'damen', haar: true },
        { name: 'Färben', kat: 'Farbe', dauer: 90, preis: 60, fuer: 'damen', farbe: true, ab: true }
      ] },
    zeigen: [
      ['Formular zum Vorführen', 'verkaufsslides/inhaltsverzeichnis.html?v=test00', 'Damen oder Herren, Leistung mit Preis, Tag und Uhrzeit.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=friseur&probe=Test%20Firma%2000&vorname=Test&leer=1', 'Leer, nur mit dem Inhaber. Es wird nichts gespeichert.']
    ],
    angebot: [
      ['Herren', [['Herrenschnitt', '30 Min.', '28 €'], ['Bart trimmen', '20 Min.', '15 €']]],
      ['Damen', [['Damenschnitt', '45 Min.', '45 €'], ['Färben', '90 Min.', 'ab 60 €']]]
    ],
    angebot_hinweis: 'Testpreise.'
  },
  {
    /* Testbetrieb Location (seit 13.10.2026), kein echter Kunde: Grundpreis 5.000 € und Preis pro Gast je nach Gästezahl. */
    firma: 'Test Firma 01', name: 'Test', kurz: 'Testbetrieb · Hochzeitslocation', zeile: 'Zum Durchspielen eines Anfrage-Formulars mit Grundpreis und Preis pro Gast. Kein echter Kunde.',
    email: 'projekt@clickzauber.de',
    vorbauen: { firma: 'Test Firma 01', vorname: 'Test', nachname: 'Location', telefon: '', website: 'https://clickzauber.de', strasse: 'Teststraße 1', plz_ort: '88131 Lindau (Bodensee)', datenschutz_url: 'https://clickzauber.de/datenschutz.html' },
    formular: { v: 'test01', vorlage: 'hochzeit', name: 'Test Firma 01', betrieb: 'Test Firma 01', accent: '#2f7d59', skin: 'glass-milk', font: 'Playfair Display', fontAnswer: 'DM Sans',
      preis: { basis: 5000, titel: 'Miete der Location' },
      seiten: [
        { titel: 'Ihr Tag', fragen: [{ key: 'datum', frage: 'Wann möchten Sie feiern?', kurz: 'Datum', typ: 'datum' }] },
        { titel: 'Der Rahmen', fragen: [{ key: 'gaeste', frage: 'Wie viele Gäste werden erwartet?', kurz: 'Gäste', typ: 'auswahl', gaeste: true, proGast: true, optionen: [
          { label: 'Bis 50 Gäste', proGast: 125, score: 8 }, { label: '50–100 Gäste', proGast: 120, score: 12 }, { label: '100–150 Gäste', proGast: 115, score: 16 }, { label: '150–220 Gäste', proGast: 110, score: 20 }] }] },
        { titel: 'Extras', fragen: [
          { key: 'extras', frage: 'Was darf dazukommen?', kurz: 'Extras', typ: 'mehrfach', optional: true, optionen: [
            { label: 'Freie Trauung im Garten', preis: 780 }, { label: 'Getränkepauschale', proGast: 39 }, { label: 'Feuerwerk', aufAnfrage: true }] },
          { key: 'nachricht', frage: 'Möchten Sie uns noch etwas sagen?', kurz: 'Nachricht', typ: 'text', optional: true }] }
      ] },
    zeigen: [
      ['Formular zum Vorführen', 'verkaufsslides/inhaltsverzeichnis.html?v=test01', 'Grundpreis 5.000 €, Gäste mal Preis pro Gast, Extras.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=hochzeit&probe=Test%20Firma%2001&leer=1', 'Leer. Es wird nichts gespeichert.']
    ],
    angebot: [['Location', [['Miete', 'einmalig', '5.000 €'], ['Je nach Gästezahl', 'pro Gast', '110 bis 125 €'], ['Getränkepauschale', 'pro Gast', '39 €'], ['Freie Trauung im Garten', 'einmalig', '780 €']]]],
    angebot_spalte: 'Einheit', angebot_hinweis: 'Testpreise. Beispiel: 50–100 Gäste ergibt 5.000 € plus 6.000 bis 12.000 €.'
  },
  {
    firma: 'Kate Cosmetics', name: 'Kate', logo: 'kunden/kate-cosmetics/logo.png', kurz: 'Kosmetik · Lindau',
    zeile: 'Kosmetikstudio in Lindau: Wimpern, Gelnägel, Haarpigmentierung, Ballancer',
    email: 'info@katecosmetics.de', ust: '13425190053 (so im Impressum)',
    vorbauen: { firma: 'Kate Cosmetics', vorname: 'Kathleen Alina', nachname: 'Miner', telefon: '+49 151 10642524', website: 'https://katecosmetics.de', strasse: 'Am Bahnhof 4', plz_ort: '88131 Bodolz/Lindau (Bodensee)', datenschutz_url: 'https://katecosmetics.de/datenschutz' },
    /* Wie verkaufsslides/inhaltsverzeichnis.html?v=kate: Vorlage Kosmetikstudio (ihr ganzes Angebot), zuerst die Behandlung, ihr Bild und Text über den Kacheln */
    formular: { v: 'kate', salon: { wimpern: { an: true, prozent: 50, wochen: 4, fotos: 'whatsapp' }, limit: 3 }, vorlage: 'kosmetik', name: 'Kate Cosmetics', betrieb: 'Kate Cosmetics', accent: '#d81b4a', skin: 'klar-hell', font: 'DM Sans', logo: 'kunden/kate-cosmetics/logo.png', bild: 'kunden/kate-cosmetics/foto.png', bildText: 'Du willst dich mal wieder richtig schön fühlen? Dann buche direkt einen Termin bei mir!', personal: ['Kate'] },
    zeigen: [
      ['Formular zum Vorführen', 'verkaufsslides/inhaltsverzeichnis.html?v=kate', 'So sehen es ihre Kundinnen: Behandlung wählen, Angebot mit Preis, Tag und Uhrzeit.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=kosmetik&probe=Kate%20Cosmetics&vorname=Kate', 'So kommen die Anfragen bei ihr an. Mit Beispieldaten, es wird nichts gespeichert.']
    ],
    angebot: [
      ['Wimpernverlängerung', [['1:1 Technik Neuset', '2 Std.', '100 €'], ['1:1 Technik: Auffüllen nach 2 / 3 / 4 Wochen', '45 / 60 / 75 Min.', '30 / 45 / 60 €'], ['Volumentechnik Neuset', '2,5 Std.', '145 €'], ['Volumentechnik: Auffüllen nach 2 / 3 / 4 Wochen', '60 / 75 / 90 Min.', '40 / 55 / 70 €']]],
      ['Wimpernlifting', [['ohne Färben', '60 Min.', '45 €'], ['mit Färben', '75 Min.', '50 €']]],
      ['Haarpigmentierung (SMP)', [['Beratungsgespräch, danach individuell geplant, inkl. 4 Sitzungen', '30 Min.', 'ab 1.800 €']]],
      ['Gelnägel', [['Neumodellage mit Verlängerung', '2 Std.', '65 €'], ['Naturnagelverstärkung', '90 Min.', '55 €'], ['Auffüllen der Modelle', '75 Min.', '40 €'], ['Maniküre', '30 Min.', '20 €']]],
      ['Ballancer', [['Einzelbehandlung', '40 Min.', '35 €'], ['Einzelbehandlung „Sport“', '40 Min.', '30 €'], ['6-Wochen-Kur (10 + 2 gratis)', '12 × 40 Min.', '350 €']]]
    ],
    angebot_hinweis: 'Preise von ihrer Website, die Dauer ist geschätzt. Steht so in der Vorlage „Kosmetikstudio“ und in ihrem Formular.',
    bilder: [['kunden/kate-cosmetics/logo.png', 'logo.png: Logo, erscheint oben im Formular'], ['kunden/kate-cosmetics/foto.png', 'foto.png: Foto über den Kacheln']]
  },
  {
    firma: 'Barber by Becks', name: 'Amar', logo: 'kunden/barber-by-becks/logo.png', logo_grund: '#181818', kurz: 'Barbier · Lindau',
    zeile: 'Barbershop im Salon „Der Engel für Ihr Haar“ in Lindau: Herrenschnitte, Bart, Nassrasur, Haarsysteme, dazu Damenschnitte',
    email: 'info@barber-bybecks.de', ust: 'DE999999999 (so im Impressum, sieht nach Platzhalter aus)',
    vorbauen: { firma: 'Barber by Becks', vorname: 'Amar', nachname: 'Litric', telefon: '+49 1521 0693988', website: 'https://barber-bybecks.de', strasse: 'Schulstraße 20', plz_ort: '88131 Lindau (Bodensee)', datenschutz_url: 'https://barber-bybecks.de/datenschutzerklaerung/' },
    /* Vorlage Friseur Damen & Herren mit seinen Leistungen: zuerst Damen oder Herren (darüber Foto mit Siegel und sein Satz von der Website), dann die Leistung, dann Tag und Uhrzeit.
       Vorschau: verkaufsslides/inhaltsverzeichnis.html?v=amar. Preise für Schnitt, Bart und Rasur sind Platzhalter, Arbeitstage laut Branchenbuch Mi bis Fr. */
    formular: { v: 'amar', vorlage: 'friseur_dh', name: 'Barber by Becks', betrieb: 'Barber by Becks', accent: '#c9a862', skin: 'concierge', font: 'Source Serif 4', fontAnswer: 'Source Sans 3',
      logo: 'kunden/barber-by-becks/logo-weiss.png', bild: 'kunden/barber-by-becks/foto.jpg', bildText: 'Stilvoll gestutzt, selbstbewusst geschärft: Ihr Look, unser Meisterwerk!',
      personal: ['Amar'], tage: [3, 4, 5], platz: 'z. B. Wunschschnitt, ein Foto als Vorlage oder Fragen zum Haarsystem',
      salon: { reihe: 'leistung', waschen: { an: false } },
      leistungen: [
        { name: 'Klassischer Herrenschnitt', kat: 'Haarschnitt', dauer: 30, preis: 30, fuer: 'herren' },
        { name: 'Moderner Herrenschnitt, z. B. Fade', kat: 'Haarschnitt', dauer: 45, preis: 35, fuer: 'herren' },
        { name: 'Bart trimmen und formen', kat: 'Bart & Rasur', dauer: 20, preis: 20, fuer: 'herren' },
        { name: 'Bart mit Konturen-Nassrasur', kat: 'Bart & Rasur', dauer: 30, preis: 25, fuer: 'herren' },
        { name: 'Traditionelle Nassrasur', kat: 'Bart & Rasur', dauer: 30, preis: 30, fuer: 'herren', info: 'Glatt rasiert mit klassischen Barbier-Techniken und hochwertigen Pflegeprodukten.' },
        { name: 'Kostenlose Beratung', kat: 'Haarsysteme', dauer: 30, preis: 0, fuer: 'herren', info: 'Moderne Echthaar-Haarsysteme von Divine Hair Systems mit natürlichem Haaransatz. Im Gespräch klären wir, was zu Ihnen passt.' },
        { name: 'Anpassung und Einschnitt', kat: 'Haarsysteme', dauer: 180, preis: 0, fuer: 'herren', info: 'Das Haarsystem wird an Ihre Kopfform angepasst und eingeschnitten. Den Preis besprechen wir in der Beratung.' },
        { name: 'Damenhaarschnitt', kat: 'Haarschnitt', dauer: 45, preis: 40, fuer: 'damen', haar: true, info: 'Waschen, Schneiden, Föhnen.' },
        { name: 'Spitzen schneiden', kat: 'Haarschnitt', dauer: 30, preis: 28, fuer: 'damen', haar: true }
      ] },
    zeigen: [
      ['Formular zum Vorführen', 'verkaufsslides/inhaltsverzeichnis.html?v=amar', 'So sehen es seine Kunden: Damen oder Herren, Leistung mit Preis, Tag und Uhrzeit.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=friseur&probe=Barber%20by%20Becks&vorname=Amar&nachname=Litric&leer=1', 'So startet es bei ihm: noch leer, nur er als Mitarbeiter, mit seinen Leistungen. Es wird nichts gespeichert.']
    ],
    angebot: [
      ['Herren: Haarschnitt', [['Klassischer Herrenschnitt', '30 Min.', '30 €'], ['Moderner Herrenschnitt, z. B. Fade', '45 Min.', '35 €']]],
      ['Herren: Bart & Rasur', [['Bart trimmen und formen', '20 Min.', '20 €'], ['Bart mit Konturen-Nassrasur', '30 Min.', '25 €'], ['Traditionelle Nassrasur', '30 Min.', '30 €']]],
      ['Herren: Haarsysteme (Divine Hair Systems)', [['Kostenlose Beratung', '30 Min.', 'kostenlos'], ['Anpassung und Einschnitt', '3 Std.', 'nach Beratung']]],
      ['Damen: Haarschnitt', [['Damenhaarschnitt (Waschen, Schneiden, Föhnen)', '45 Min.', '40 €'], ['Spitzen schneiden', '30 Min.', '28 €']]]
    ],
    angebot_hinweis: 'Auf seiner Website stehen keine Preise. Die Preise für Schnitt, Bart und Rasur sind Platzhalter, die Dauer ist geschätzt; bei langem Haar rechnet das Formular bei Damen etwas mehr. Die kostenlose Beratung zu Haarsystemen steht so auf seiner Website.',
    bilder: [['kunden/barber-by-becks/logo.png', 'logo.png: Logo auf dunklem Grund, für Karte und Akte'], ['kunden/barber-by-becks/logo-weiss.png', 'logo-weiss.png: Logo ohne Hintergrund, oben im dunklen Formular'], ['kunden/barber-by-becks/foto.jpg', 'foto.jpg: sein Foto mit dem Siegel der Meisterschule, über „Für wen ist der Termin?“'], ['kunden/barber-by-becks/siegel.png', 'siegel.png: Siegel von OSTIs Meistervilla, steht so auf seiner Website']]
  },
  {
    firma: 'Speckrausch', name: 'Rainer', logo: 'kunden/speckrausch/logo.png', kurz: 'Feinkost & Catering · Ellwangen',
    zeile: 'Südtiroler Feinkost aus Ellwangen: Onlineshop für Speck, Kaminwurzen und Salami, dazu ein mobiler Stand für Feste, Märkte und Messen',
    email: 'info@speckrausch.de', ust: 'DE 185 476 328 (so im Impressum)',
    vorbauen: { firma: 'Speckrausch', vorname: 'Rainer', nachname: 'Brenner', telefon: '+49 172 5650167', website: 'https://speckrausch.de', strasse: 'Berliner Str. 12', plz_ort: '73479 Ellwangen', datenschutz_url: 'https://speckrausch.de/datenschutzerklaerung/' },
    /* Anfrage-Formular auf Basis der Vorlage Food Truck: Termin, Anlass, Gäste, Angebot (Preis pro Person je nach Wahl), Ort mit Anfahrt ab Ellwangen.
       Vorschau: verkaufsslides/inhaltsverzeichnis.html?v=speckrausch. Preise je Person und Mindestumsatz aus dem Gespräch, Kilometerpreis und weiteste Anfahrt sind Platzhalter. */
    formular: { v: 'speckrausch', vorlage: 'foodtruck', name: 'Speckrausch', betrieb: 'Speckrausch', accent: '#a8442f', skin: 'editorial', font: 'Marcellus', fontAnswer: 'DM Sans',
      logo: 'kunden/speckrausch/logo-transparent.png', bild: 'kunden/speckrausch/foto-breit.jpg', bildText: 'Genuss aus Südtirol – traditioneller Speck, Kaminwurzen & Wurstwaren',
      ansprechpartner: { name: 'Rainer Brenner', rolle: 'Inhaber' },
      auftrag: { minPersonen: 40, minUmsatz: 500, maxKm: 100, kmPreis: 1.2, proTag: 1 },
      seiten: [
        { titel: 'Ihr Termin', fragen: [
          { key: 'termin', frage: 'Für welchen Tag brauchen Sie uns?', kurz: 'Termin', typ: 'datum', hinweis: 'Grün markierte Tage sind noch frei.' },
          { key: 'zeitfenster', frage: 'Wann sollen wir da sein?', kurz: 'Zeitfenster', typ: 'auswahl', optionen: [
            { label: 'Mittags (11–14 Uhr)', score: 8 }, { label: 'Nachmittag', score: 8 }, { label: 'Abends (ab 17 Uhr)', score: 12, empfohlen: true },
            { label: 'Ganztags', score: 18, beschreibung: 'Wir stehen den ganzen Tag und schneiden durchgehend frisch auf.' }] }] },
        { titel: 'Der Anlass', fragen: [
          { key: 'anlass', frage: 'Um was für eine Veranstaltung geht es?', kurz: 'Anlass', typ: 'auswahl', optionen: [
            { label: 'Firmenfeier oder Betriebsfest', score: 14, empfohlen: true }, { label: 'Hochzeit', score: 16 }, { label: 'Geburtstag oder Privatfeier', score: 10 },
            { label: 'Vereinsfest oder Jubiläum', score: 10 }, { label: 'Markt, Messe oder Stadtfest', score: 12, beschreibung: 'Wir kommen mit unserem Stand, Ihre Besucher kaufen direkt bei uns.' }] },
          { key: 'abrechnung', frage: 'Wer bezahlt das Essen?', kurz: 'Abrechnung', typ: 'auswahl', optionen: [
            { label: 'Wir rechnen mit Ihnen ab', score: 14, empfohlen: true, beschreibung: 'Preis pro Person, Ihre Gäste zahlen nichts.' },
            { label: 'Die Gäste zahlen selbst', score: 8, beschreibung: 'Wir verkaufen vor Ort. Sie zahlen nur die Anfahrt oder eine Standgebühr.' }, { label: 'Noch offen', score: 6 }] }] },
        { titel: 'Ihre Gäste', fragen: [
          { key: 'portionen', frage: 'Mit wie vielen Gästen rechnen Sie?', kurz: 'Gäste', typ: 'auswahl', optionen: [
            { label: 'Bis 30 Personen', score: 6, gaeste: 30 }, { label: '30 bis 60 Personen', score: 12, gaeste: 60, empfohlen: true }, { label: '60 bis 120 Personen', score: 18, gaeste: 120 },
            { label: '120 bis 250 Personen', score: 24, gaeste: 250 }, { label: 'Über 250 Personen', score: 30, gaeste: 300, beschreibung: 'Bitte früh anfragen, dann planen wir gemeinsam.' }] }] },
        { titel: 'Das Angebot', fragen: [
          { key: 'umfang', frage: 'Was dürfen wir mitbringen?', kurz: 'Angebot', typ: 'auswahl', optionen: [
            { label: 'Südtiroler Jause & Brotzeit', score: 12, empfohlen: true, preisVon: 12, preisBis: 18, posten: 'Jause & Brotzeit für', beschreibung: 'Frisch aufgeschnittener Traditionsspeck, Kaminwurzen, Schüttelbrot und Südtiroler Käse.' },
            { label: 'Warmes Angebot oder Kombination', score: 18, preisVon: 20, preisBis: 30, posten: 'Warmes Angebot für', beschreibung: 'Je nach Stand gegrillte Südtiroler Spezialitäten, z. B. Schupfnudeln mit Kraut und Speck, Meraner Würste oder belegte Vinschgerl.' },
            { label: 'Beratung gewünscht', score: 10, beschreibung: 'Wir stellen das Angebot gemeinsam mit Ihnen zusammen.' }] },
          { key: 'verkostung', frage: 'Soll es eine Verkostung geben?', kurz: 'Verkostung', typ: 'auswahl', optional: true, optionen: [
            { label: 'Ja, Live-Aufschneiden am Stand', score: 8, beschreibung: 'Wir schneiden Speck, Schinken und Salami vor Ihren Gästen auf und lassen probieren.' }, { label: 'Nein, danke', score: 0 }] },
          { key: 'ernaehrung', frage: 'Gibt es besondere Wünsche beim Essen?', kurz: 'Ernährung', typ: 'mehrfach', optional: true, optionen: [
            { label: 'Vegetarisch', score: 0 }, { label: 'Glutenfrei', score: 0 }, { label: 'Laktosefrei', score: 0 }, { label: 'Kinderportionen', score: 0 }, { label: 'Allergien, melden wir nach', score: 0 }] }] },
        { titel: 'Ort & Anfahrt', fragen: [
          { key: 'ort', frage: 'Wo findet die Veranstaltung statt?', kurz: 'Adresse', typ: 'text', adresse: true, platzhalter: 'Straße, Hausnummer, PLZ und Ort', hinweis: 'Tippen Sie los, wir schlagen passende Adressen vor. Die Anfahrt rechnen wir ab Ellwangen.' },
          { key: 'drinnen', frage: 'Stehen wir drinnen oder draußen?', kurz: 'Standort', typ: 'auswahl', optional: true, optionen: [
            { label: 'Drinnen', score: 4 }, { label: 'Draußen mit Dach oder Zelt', score: 4 }, { label: 'Draußen ohne Dach', score: 2 }, { label: 'Weiß ich noch nicht', score: 2 }] },
          { key: 'strom', frage: 'Gibt es Strom vor Ort?', kurz: 'Strom', typ: 'auswahl', optional: true, optionen: [
            { label: 'Normale Steckdose (230 V)', score: 6, empfohlen: true }, { label: 'Starkstrom (400 V / CEE)', score: 8 },
            { label: 'Kein Strom vor Ort', score: 4, beschreibung: 'Sagen Sie es uns, dann planen wir das ein.' }, { label: 'Weiß ich nicht', score: 2 }] }] },
        { titel: 'Zum Schluss', fragen: [
          { key: 'freitext', frage: 'Möchten Sie uns noch etwas mitgeben?', kurz: 'Ihre Nachricht', typ: 'text', optional: true, platzhalter: 'z. B. Ablauf, Ansprechpartner vor Ort, Lieblingsprodukte aus unserem Shop' },
          { key: 'gefunden', frage: 'Wie haben Sie uns gefunden?', kurz: 'Gefunden über', typ: 'auswahl', optional: true, optionen: [
            { label: 'Empfehlung', score: 0 }, { label: 'Google', score: 0 }, { label: 'Facebook oder Instagram', score: 0 }, { label: 'Über unseren Onlineshop', score: 0 }, { label: 'Auf einem Markt gesehen', score: 0 }] }] }
      ] },
    zeigen: [
      ['Formular zum Vorführen', 'verkaufsslides/inhaltsverzeichnis.html?v=speckrausch', 'So sehen es seine Kunden: Termin, Anlass, Gäste, Angebot, Ort, am Ende eine Preis-Einschätzung.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=catering&probe=Speckrausch&vorname=Rainer', 'So kommen die Anfragen bei ihm an. Mit Beispieldaten, es wird nichts gespeichert.']
    ],
    angebot_spalte: 'Abrechnung',
    angebot: [
      ['Südtiroler Jause & Brotzeit', [['Traditionsspeck frisch aufgeschnitten, Kaminwurzen, Schüttelbrot, Südtiroler Käse', 'je Person', '12–18 €']]],
      ['Warmes Angebot oder Kombination', [['z. B. Schupfnudeln mit Kraut und Speck, Meraner Würste, belegte Vinschgerl', 'je Person', '20–30 €']]],
      ['Verkostung', [['Live-Aufschneiden von Speck, Schinken und Salami', '', 'nach Absprache']]],
      ['Grundlagen', [['Mindestumsatz für Anfahrt und Aufwand', 'je Auftrag', '500 €'], ['Anfahrt ab Ellwangen, hin und zurück', 'je km', '1,20 €']]]
    ],
    angebot_hinweis: 'Auf seiner Website stehen nur Shop-Preise, kein Catering. Preise je Person und Mindestumsatz (genannt: 500 bis 1.000 €) aus dem Gespräch, im Formular 500 €. Kilometerpreis und weiteste Anfahrt (100 km) sind Platzhalter.',
    bilder: [['kunden/speckrausch/logo.png', 'logo.png: Logo, für Karte und Akte'], ['kunden/speckrausch/logo-transparent.png', 'logo-transparent.png: Logo ohne Hintergrund, oben im Formular'], ['kunden/speckrausch/foto-breit.jpg', 'foto-breit.jpg: Ausschnitt fürs Formular, über der ersten Frage'], ['kunden/speckrausch/foto.png', 'foto.png: das ganze Foto, unbearbeitet']]
  },
  {
    /* Tenuta Savoca (seit 13.10.2026): Formular nach ihrem Angebot „Preventivo Nr. 63“ (Hochzeit). Alle Preise zzgl. MwSt.
       Exklusivmiete 8.000 €, Mo bis Do 5.000 € (preis.wochentag, aus dem gewählten Datum). Menü pro Gast mal Gästespanne.
       Kontakt, Kapazität und Freigabe der Preise fehlen noch. Vorschau: verkaufsslides/inhaltsverzeichnis.html?v=savoca */
    firma: 'Tenuta Savoca', name: 'Tenuta Savoca', logo: 'kunden/tenuta-savoca/logo.png', kurz: 'Hochzeitslocation · Sizilien',
    zeile: 'Tenuta bei Piazza Armerina auf Sizilien: Trauung im Wald, Menü im Borgo, Gästezimmer und Pool',
    vorbauen: { firma: 'Tenuta Savoca', vorname: '', nachname: '', telefon: '', website: '', strasse: '', plz_ort: 'Piazza Armerina (EN), Sizilien', datenschutz_url: '' },
    formular: { v: 'savoca', vorlage: 'hochzeit', name: 'Tenuta Savoca', betrieb: 'Tenuta Savoca', accent: '#6f7046', skin: 'glass-milk', font: 'Cormorant Garamond', fontAnswer: 'DM Sans',
      logo: 'kunden/tenuta-savoca/logo.png', sumTitel: 'Ihre unverbindliche Einschätzung, zzgl. MwSt.',
      preis: { basis: 8000, titel: 'Exklusivmiete der Tenuta für einen Tag', wochentag: { 1: 0.625, 2: 0.625, 3: 0.625, 4: 0.625 } },
      seiten: [
        { titel: 'Ihr Tag', fragen: [
          { key: 'datum', frage: 'Wann möchten Sie heiraten?', kurz: 'Datum', typ: 'datum', hinweis: 'Von Montag bis Donnerstag kostet die Exklusivmiete 5.000 € statt 8.000 €.' },
          { key: 'gaeste', frage: 'Wie viele Gäste erwarten Sie?', kurz: 'Gäste', typ: 'auswahl', gaeste: true, optionen: [
            { label: 'Bis 50 Gäste', score: 8 }, { label: '50–80 Gäste', score: 12, empfohlen: true }, { label: '80–120 Gäste', score: 16 },
            { label: '120–160 Gäste', score: 20 }, { label: 'Über 160 Gäste', score: 24, beschreibung: 'Bitte früh anfragen, dann planen wir gemeinsam.' }] }] },
        { titel: 'Die Trauung', fragen: [
          { key: 'trauung', frage: 'Wo möchten Sie sich das Jawort geben?', kurz: 'Trauung', typ: 'auswahl', optionen: [
            { label: 'Freie Trauung im Pappelwäldchen', preis: 500, score: 14, empfohlen: true, beschreibung: 'Bänke mit Kissen, Tisch, Traubogen und Stromanschluss mitten im Wald.' },
            { label: 'Standesamtlich im Wäldchen', preis: 500, score: 14, beschreibung: 'Gleicher Ort. Die Trauung stimmen Sie mit der Gemeinde Piazza Armerina ab, deren Gebühren kommen dazu.' },
            { label: 'Die Trauung ist woanders', score: 8, beschreibung: 'Sie kommen nach der Trauung zu uns zum Feiern.' }] },
          { key: 'casale', frage: 'Möchten Sie sich bei uns fertig machen?', kurz: 'Vorbereitung', typ: 'auswahl', optional: true, optionen: [
            { label: 'Ja, im Casale dell’Ottocento', preis: 500, score: 8, beschreibung: 'Sie machen sich im Landhaus aus dem 19. Jahrhundert fertig, mit kühlen Getränken.' },
            { label: 'Nein, danke', score: 0 }] }] },
        { titel: 'Das Menü', fragen: [
          { key: 'menue', frage: 'Welches Hochzeitsmenü wünschen Sie?', kurz: 'Menü', typ: 'auswahl', proGast: true, unter: 'Bei beiden zur Begrüßung Drinks mit Fruchtcocktails und Bollicine, dazu Häppchen im Giardino Arabo. Preis pro Gast, zzgl. 10 % MwSt.', optionen: [
            { label: 'Festa nel Borgo', proGast: 120, score: 16, empfohlen: true, beschreibung: 'Antipasti-Buffet im Borgo mit Live-Cooking, am Tisch an der alten Tränke zwei Primi und ein Secondo, dann Dessertbuffet mit Hochzeitstorte. Wein, Wasser und Digestif inklusive.' },
            { label: 'Magia del Bosco', proGast: 150, score: 20, beschreibung: 'Die Buffets im Borgo, das Essen am Tisch mitten im Wald, dann Dessertbuffet mit Hochzeitstorte. Wein, Wasser und Digestif inklusive.' }] },
          { key: 'kinder', frage: 'Feiern Kinder mit?', kurz: 'Kinder', typ: 'auswahl', optional: true, optionen: [
            { label: 'Ja, am Tisch der Erwachsenen', score: 4, beschreibung: 'Kindermenü zum halben Preis: 60 € bei Festa nel Borgo, 75 € bei Magia del Bosco.' },
            { label: 'Ja, an einem Kindertisch mit Animation', score: 4, beschreibung: 'Kindermenü 40 €. Die Animation organisieren Sie selbst.' },
            { label: 'Nein', score: 0 }] }] },
        { titel: 'Dazu', fragen: [
          { key: 'extras', frage: 'Was darf dazukommen?', kurz: 'Extras', typ: 'mehrfach', optional: true, unter: 'Am Tag danach dürfen Ihre Gäste bis 13 Uhr in den Pool, auch wenn sie anderswo übernachten.', optionen: [
            { label: 'Gästezimmer mit Frühstück', preis: 2000, beschreibung: '6 Doppel-, 4 Dreibett- und 2 Vierbettzimmer für eine Nacht. Check-in ab 12:30 Uhr, Check-out am nächsten Tag bis 10 Uhr.' },
            { label: 'Bereich im Wald für Aperitif oder Essen', preis: 500, beschreibung: 'Abseits von Küche und Haus, für den Aperitif oder das Essen am Tisch.' },
            { label: 'After-Party mit Open Bar und Musik', preis: 500, beschreibung: 'Nach dem Dessert, nur zusammen mit Open Bar und Tanzmusik. Bei Feiern am Abend bis 3 Uhr.' },
            { label: 'Isola Crudité', proGast: 15, beschreibung: 'Scampi, Gambero rosso aus Mazara, Thunfisch, Austern und Fasolari.' },
            { label: 'Besondere Lichtgestaltung', aufAnfrage: true, beschreibung: 'Szenische Beleuchtung nach Ihren Wünschen.' },
            { label: 'Lounge mit Sofas und Teppichen', aufAnfrage: true, beschreibung: 'Möbel und Deko aus unserem Katalog.' }] },
          { key: 'nachricht', frage: 'Möchten Sie uns noch etwas sagen?', kurz: 'Nachricht', typ: 'text', optional: true, platzhalter: 'z. B. Ihr Stil, Musik oder Fragen zum Ablauf' }] }
      ] },
    zeigen: [
      ['Formular zum Vorführen', 'verkaufsslides/inhaltsverzeichnis.html?v=savoca', 'Datum, Gäste, Trauung, Menü pro Gast, Extras, am Ende eine Einschätzung von bis.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=hochzeit&probe=Tenuta%20Savoca&leer=1', 'So kommen die Anfragen an. Leer, es wird nichts gespeichert.']
    ],
    angebot: [
      ['Exklusivmiete', [['Freitag bis Sonntag', 'pro Tag', '8.000 €'], ['Montag bis Donnerstag, mit Catering im Haus', 'pro Tag', '5.000 €']]],
      ['Menü', [['Festa nel Borgo', 'pro Gast', '120 €'], ['Magia del Bosco', 'pro Gast', '150 €'], ['Kinder am Tisch der Erwachsenen', 'pro Kind', '50 %'], ['Kinder am Kindertisch mit Animation', 'pro Kind', '40 €']]],
      ['Dazu', [['Gästezimmer mit Frühstück', 'eine Nacht', '2.000 €'], ['Casale dell’Ottocento zum Fertigmachen', 'einmalig', '500 €'], ['Trauung im Pappelwäldchen', 'einmalig', '500 €'], ['Bereich im Wald', 'einmalig', '500 €'], ['After-Party', 'einmalig', '500 €'], ['Isola Crudité', 'pro Gast', '15 €'], ['Lichtgestaltung, Lounge', '', 'auf Anfrage']]]
    ],
    angebot_spalte: 'Einheit',
    angebot_hinweis: 'Aus ihrem Angebot „Preventivo Nr. 63“, alle Preise zzgl. MwSt. (Menüs 10 %). Vor dem Zeigen mit der Tenuta abstimmen. Die Gästezahlen im Formular sind geschätzt.',
    bilder: [['kunden/tenuta-savoca/logo.png', 'logo.png: Logo, erscheint oben im Formular']]
  },
  {
    /* Uncle’s Salon 2.0 (seit 13.10.2026): Barbershop in Lindau, Inhaber Ilmir, Mitarbeiter Patriot. Angaben von Instagram (@uncles.saloon2), keine Website.
       Vorlage Friseur Damen & Herren ohne „Für“: nur Herren, zuerst die Leistung als runde Kacheln, dann Tag, Uhrzeit und Barbier.
       Eigenes Aussehen wie das Logo: anthrazit, Knöpfe silbern (eigen). Vorschau: verkaufsslides/inhaltsverzeichnis.html?v=uncles.
       Preise von Ilmir (13.10.2026): Haare und Bart 35 €, Haarschnitt 25 €, Dauer geschätzt. Arbeitstage Mo bis Sa für beide bestätigt.
       Datenschutz 'clickzauber' = unsere Erklärung für Betriebe ohne Website (datenschutz-betrieb.html, Ilmir ist der Verantwortliche). */
    firma: 'Uncle’s Salon 2.0', name: 'Ilmir', logo: 'kunden/uncles-salon/logo-gold.png', kurz: 'Barbier · Lindau',
    zeile: 'Barbershop in Lindau seit 2017: Haarschnitt, Haare und Bart. Inhaber Ilmir, dazu Patriot',
    /* E-Mail von Ilmir (17.10.2026): ilmirmehmeti@gmx.de. Webhoster IONOS. Steuernummer bzw. USt-ID reicht er nach (dann ins Impressum, Platz ist dort vorgemerkt). */
    vorbauen: { firma: 'Uncle’s Salon 2.0', vorname: 'Ilmir', nachname: 'Mehmeti', telefon: '+49 176 21735986', website: 'https://www.instagram.com/uncles.saloon2/', strasse: 'Gustav-Freytag-Straße 1', plz_ort: '88131 Lindau (Bodensee)', datenschutz_url: 'clickzauber' },
    /* Seit 17.10.2026: CI = Farben des Logos (Schwarz und Gold, Schrift Cinzel), Preise aus seiner Preisliste, Dauer geschätzt. */
    formular: { v: 'uncles', vorlage: 'friseur_dh', name: 'Uncle’s Salon 2.0', betrieb: 'Uncle’s Salon 2.0', accent: '#d6aa4c', skin: 'dunkel-minimal', font: 'Cinzel', fontAnswer: 'Barlow',
      eigen: { flaeche: '#14120e', knopf: '#d6aa4c', eineReihe: true, rand: '#d6aa4c' },
      logo: 'kunden/uncles-salon/logo-gold.png',
      personal: ['Ilmir', 'Patriot'], tage: [1, 2, 3, 4, 5, 6], platz: 'z. B. ein Foto vom Wunschschnitt oder wie kurz an den Seiten',
      salon: { reihe: 'leistung', waschen: { an: false } },
      leistungen: [
        { name: 'Haarschnitt', kat: 'Haarschnitt', dauer: 30, preis: 25, info: 'Professioneller Haarschnitt mit Stil.' },
        { name: 'Haarschnitt nur Seiten', kat: 'Haarschnitt', dauer: 20, preis: 20, info: 'Nur die Seiten schneiden.' },
        { name: 'Waschen + Schneiden', kat: 'Haarschnitt', dauer: 40, preis: 35, info: 'Waschen, schneiden und föhnen.' },
        { name: 'Haare und Farbe', kat: 'Haarschnitt', dauer: 60, preis: 40, info: 'Haarschnitt inklusive Farbe.' },
        { name: 'Haarschnitt + Bart', kat: 'Haare & Bart', dauer: 45, preis: 35, info: 'Haarschnitt inklusive Bartstyling.' },
        { name: 'Bart + Contour', kat: 'Bart & Rasur', dauer: 20, preis: 15, info: 'Bart trimmen und konturieren.' },
        { name: 'Rasur', kat: 'Bart & Rasur', dauer: 15, preis: 10, info: 'Rasur mit Maschine.' },
        { name: 'Augenbrauen zupfen', kat: 'Gesicht', dauer: 10, preis: 10, info: 'Formen und zupfen.' },
        { name: 'Warm Wax', kat: 'Gesicht', dauer: 10, preis: 10, info: 'Nase, Ohren oder Augenbrauen.' },
        { name: 'Kinder bis 12 Jahre', kat: 'Kinder', dauer: 25, preis: 16, info: 'Haarschnitt für unsere kleinen Gäste.' }
      ] },
    zeigen: [
      ['Webseite (Entwurf)', 'kunden/uncles-salon/webseite.html', 'One-Pager in Schwarz und Gold wie das Logo: Studio, Marken, Preisliste, Diashow aus dem Salon, Termin mit dem Formular, Kontakt.'],
      ['Cockpit zum Vorführen', 'clickzauber-cockpit-live.html?demo=1&rahmen=1&branche=friseur&probe=Uncle%E2%80%99s%20Salon%202.0&vorname=Ilmir&leer=1', 'So startet es bei ihm: leer, mit Ilmir und Patriot und seinen Leistungen. Es wird nichts gespeichert.']
    ],
    angebot: [
      ['Haarschnitt', [['Haarschnitt', '30 Min.', '25 €'], ['Haarschnitt nur Seiten', '20 Min.', '20 €'], ['Waschen + Schneiden', '40 Min.', '35 €'], ['Haare und Farbe', '60 Min.', '40 €']]],
      ['Haare & Bart', [['Haarschnitt + Bart', '45 Min.', '35 €']]],
      ['Bart & Rasur', [['Bart + Contour', '20 Min.', '15 €'], ['Rasur', '15 Min.', '10 €']]],
      ['Gesicht', [['Augenbrauen zupfen', '10 Min.', '10 €'], ['Warm Wax', '10 Min.', '10 €']]],
      ['Kinder', [['Kinder bis 12 Jahre', '25 Min.', '16 €']]]
    ],
    angebot_hinweis: 'Preise aus Ilmirs Preisliste (17.10.2026), die Dauer ist geschätzt. Weitere Leistungen trägt er im Cockpit unter Leistungen ein.',
    bilder: [['kunden/uncles-salon/logo-gold.png', 'logo-gold.png: Logo Schwarz und Gold, rund freigestellt (17.10.2026), oben im Formular und auf der Karte'], ['kunden/uncles-salon/bilder/preisliste.jpg', 'bilder/preisliste.jpg: seine Preisliste als Bild'], ['kunden/uncles-salon/bilder/studio.jpg', 'bilder/studio.jpg: Startbild der Webseite']]
  }
];
