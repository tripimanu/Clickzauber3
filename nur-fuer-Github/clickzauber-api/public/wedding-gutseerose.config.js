/*
 * clickzauber — Hochzeits-Planer: Location-Config „Gut Seerose"
 * Reine Daten, keine Logik. Rendering/Preislogik/Kalender-UI kommen aus
 * js/wedding-engine.js + js/wedding-planner-core.js (gemeinsamer Core für ALLE Locations).
 *
 * Neue Location aufsetzen = Kopie dieser Datei, window.WEDDING_LOCATIONS['<neue-id>'] = {...},
 * eigene Preise/Texte/Kalender/Feature-Schalter eintragen, im HTML einbinden und
 * <wedding-planner data-location="<neue-id>"> setzen. Der Core bleibt unangetastet.
 */
window.WEDDING_LOCATIONS = window.WEDDING_LOCATIONS || {};
window.WEDDING_LOCATIONS.gutseerose = {

  meta: { name: "Gut Seerose", tenantId: "gutseerose-bodensee", color: "#7c2d3b", privacyUrl: "datenschutz.html", capacityMin: 30, capacityMax: 220 },

  // Feature-Schalter: pro Location ein-/ausblendbar, ohne den Core anzufassen
  features: {
    freieTrauung: true, exklusivbuchung: true, floristikPaket: true, djBand: true,
    fotobox: true, uebernachtung: true, shuttle: true, kinderbetreuung: true, schlechtwetterplan: true
  },

  trust: {
    ansprechpartner: "Julia Berger ist Ihre feste Ansprechpartnerin ab Vertragsunterschrift",
    antwortzeit: "Rückmeldung innerhalb eines Werktags — meist schneller",
    tagSelbst: "Am Tag selbst ist durchgehend ein Host von Gut Seerose für Sie vor Ort erreichbar",
    wetterRegel: "Bei Regen ziehen wir kostenfrei ins historische Gewölbe um — Ihre Feier findet immer statt",
    absageRegel: "Kostenfreie Umbuchung bis 90 Tage vor dem Termin; danach gestaffelte Rückerstattung laut Vertrag",
    kommunikation: "Ein direkter WhatsApp-Kanal zu Ihrer Ansprechpartnerin, sobald der Vertrag steht"
  },

  pricing: {
    baseRentalByGuestTier: { s: 2800, m: 3800, l: 4600, xl: 5400 },
    seasonMonths: { 1: 0.85, 2: 0.85, 3: 0.9, 4: 1.0, 5: 1.15, 6: 1.25, 7: 1.3, 8: 1.3, 9: 1.2, 10: 1.0, 11: 0.85, 12: 0.9 },
    weekdayMultiplier: { 6: 1.15, 5: 1.05, 0: 0.95, default: 0.9 } // 6=Sa,5=Fr,0=So, sonst Werktag
  },

  fields: {
    termin: { type: "date", label: "Ihr Wunschtermin" },
    ausweichtermin: { type: "date", label: "Ausweichtermin (optional)" },
    gaeste: { type: "select", label: "Wie viele Gäste werden erwartet?", options: [
      { value: "s", label: "Bis 50 Gäste", n: 40, def: false },
      { value: "m", label: "50 – 100 Gäste", n: 75, def: true },
      { value: "l", label: "100 – 150 Gäste", n: 130, def: false },
      { value: "xl", label: "150 – 220 Gäste", n: 190, def: false }
    ] },
    budget: { type: "select", label: "An welchen Budgetrahmen denken Sie ungefähr?", options: [
      { value: "b1", label: "Bis 15.000 €", max: 15000, def: false },
      { value: "b2", label: "15.000 – 25.000 €", max: 25000, def: true },
      { value: "b3", label: "25.000 – 40.000 €", max: 40000, def: false },
      { value: "b4", label: "Über 40.000 €", max: 999999, def: false }
    ] },
    stil: { type: "select", label: "Welcher Stil trifft es am ehesten?", options: [
      { value: "klassisch", label: "Klassisch-elegant", def: true, note: "Zeitlos, hochwertig — passt zu unserem Gewölbe und der Seeterrasse." },
      { value: "rustikal", label: "Rustikal-natürlich", note: "Warm und ungezwungen — schön im Garten unter freiem Himmel." },
      { value: "modern", label: "Modern-minimalistisch", note: "Klare Linien, reduzierte Deko — wirkt besonders am Wasser." },
      { value: "verspielt", label: "Verspielt-romantisch", note: "Viele Details, Farben und Blumen — füllt unsere Räume herzlich." }
    ] },
    trauung: { type: "select", label: "Wie und wo findet die Trauung statt?", options: [
      { value: "standesamt_intern", label: "Standesamtlich bei uns im Gewölbe", def: true, category: "location", note: "Im Mietpreis bereits enthalten." },
      { value: "frei_garten", label: "Freie Trauung im Garten", feature: "freieTrauung", key: "freie_trauung", category: "location", preis: 480, note: "Zusätzlicher Auf-/Abbau von Bestuhlung und Zeremonie-Koordination vor Ort." },
      { value: "frei_gewoelbe", label: "Freie Trauung im Gewölbe (wetterunabhängig)", feature: "freieTrauung", key: "freie_trauung_gewoelbe", category: "location", preis: 680, note: "Umbau von Fest- auf Zeremonie-Bestuhlung inklusive Rückumbau." },
      { value: "kirchlich_extern", label: "Kirchlich extern, Feier bei uns", def: false, category: "location", note: "Keine Zusatzkosten — wir stimmen die Ankunftszeit mit der Kirche ab." }
    ] },
    location: { type: "chips", label: "Location-Wunsch", hint: "Mehrfachauswahl möglich.", options: [
      { value: "exklusiv", label: "Exklusivbuchung — nur Ihre Feier an diesem Tag", feature: "exklusivbuchung", key: "exklusiv", category: "location", preis: 1250, reasonHint: "keine zweite Veranstaltung, exklusive Nutzung von Garten, Terrasse und Gewölbe" }
    ] },
    menue: { type: "select", label: "Welcher Menüstil passt zu Ihrer Feier?", options: [
      { value: "menu3", label: "3-Gänge-Menü, serviert", def: true, category: "catering", preisProGast: 89, note: "Klassisch serviertes Menü mit regionaler Küche." },
      { value: "buffet", label: "Warmes Buffet", category: "catering", preisProGast: 72, note: "Entspannt, viel Auswahl, kurze Wartezeiten." },
      { value: "fingerfood", label: "Fingerfood / Walking Dinner", category: "catering", preisProGast: 58, note: "Lockerer Ablauf, gut kombinierbar mit langen Feierabenden." },
      { value: "grill", label: "Grillbuffet im Garten", category: "catering", preisProGast: 52, note: "Nur bei Feiern im Freien — Schlechtwetter-Plan empfohlen." }
    ] },
    getraenke: { type: "select", label: "Welches Getränkepaket wünschen Sie?", options: [
      { value: "basis", label: "Basis-Paket (Wein, Bier, Softdrinks)", def: true, category: "getraenke", preisProGast: 22, note: "Deckt den ganzen Abend ab." },
      { value: "premium", label: "Premium-Paket inkl. Champagner-Empfang", category: "getraenke", preisProGast: 36, note: "Hochwertigere Auswahl plus Empfangsgetränk für alle Gäste." },
      { value: "mitbringen", label: "Eigene Getränke mitbringen (Korkgeld)", category: "getraenke", preisProGast: 9, note: "Sie organisieren die Getränke, wir übernehmen Kühlung und Ausschank." }
    ] },
    mitternachtssnack: { type: "toggle", label: "Mitternachtssnack", category: "catering", preisProGast: 9, key: "mitternachtssnack", note: "Kleine warme Stärkung gegen Mitternacht — kommt bei Gästen immer gut an." },
    floristik: { type: "select", label: "Blumen &amp; Deko: organisieren Sie selbst oder wir?", feature: "floristikPaket", options: [
      { value: "keine", label: "Wir organisieren selbst / eigene Floristin", def: true, category: "floristik", note: "Kein Problem — Sie bringen mit, wer Ihnen gefällt." },
      { value: "basis", label: "Wir übernehmen: Klassische Tischdeko", category: "floristik", preis: 690, note: "Tischgestecke, Kerzen und schlichte Blumen in warmen Tönen für alle Tische." },
      { value: "romantisch", label: "Wir übernehmen: Romantisch-verspielt", category: "floristik", preis: 1240, note: "Üppige Blütenarrangements in Pastelltönen, plus Blumenbogen für die Zeremonie." },
      { value: "voll", label: "Wir übernehmen: Vollausstattung", category: "floristik", preis: 1890, note: "Von Trauung bis Tafel, inklusive Blumenschmuck und Aufbau-Team." }
    ] },
    musik: { type: "select", label: "Musik &amp; Unterhaltung", feature: "djBand", options: [
      { value: "playlist", label: "Eigene Playlist über unsere Anlage", def: true, category: "musik", note: "Kostenlos nutzbar, Sie stellen die Musik zusammen." },
      { value: "dj", label: "DJ (5 Stunden)", key: "dj", category: "musik", preis: 950, note: "Technik-Miete für Ton &amp; Licht, festes Zeitfenster und Gage." },
      { value: "band", label: "Live-Band", key: "band", category: "musik", preis: 2400, note: "Bühnenequipment, Soundcheck und mehrköpfiges Ensemble." }
    ] },
    fotoVideo: { type: "chips", label: "Foto, Video &amp; Fotobox", hint: "Mehrfachauswahl möglich.", options: [
      { value: "fotograf", label: "Fotograf", key: "fotograf", category: "fotoVideo", preis: 1450, reasonHint: "ganztägige Begleitung inkl. Bildbearbeitung" },
      { value: "video", label: "Videograf", key: "video", category: "fotoVideo", preis: 1650, reasonHint: "Kamera-Team plus Schnitt im Nachgang" },
      { value: "fotobox", label: "Fotobox", feature: "fotobox", key: "fotobox", category: "fotoVideo", preis: 590, reasonHint: "Miete, Aufbau, Requisiten inklusive Betreuung" }
    ] },
    zusatz: { type: "chips", label: "Kinder, Übernachtung &amp; Shuttle", hint: "Mehrfachauswahl möglich.", options: [
      { value: "kinder", label: "Kinderbetreuung", feature: "kinderbetreuung", key: "kinderbetreuung", category: "kinderbetreuung", preis: 390, reasonHint: "geschultes Betreuungspersonal für die Dauer der Feier" },
      { value: "shuttle", label: "Shuttle-Service", feature: "shuttle", key: "shuttle", category: "logistik", preis: 480, reasonHint: "Fahrer, Fahrzeug und Wartezeit für den Gästetransfer" },
      { value: "uebernachtung", label: "Übernachtungszimmer vor Ort", feature: "uebernachtung", key: "uebernachtung", category: "extras", preis: 260, reasonHint: "Zimmer-Bereitstellung inkl. Frühstück für das Brautpaar" }
    ] },
    wetterplan: { type: "toggle", label: "Regen-Backup fest einplanen", feature: "schlechtwetterplan", category: "location", preis: 250, key: "wetterplan", note: "Auch ohne Haken gilt: Bei Regen ziehen wir kostenfrei um. Fest einplanen reserviert das Gewölbe zusätzlich exklusiv als Rückzugsort." },
    freitext: { type: "textarea", label: "Erzählen Sie uns von Ihrem Fest in ein bis zwei Sätzen", placeholder: "z. B. „Wir planen 90 Gäste, freie Trauung, DJ, Fotobox, Mitternachtssnack und Shuttle.\u201c" }
  },

  // Freitext-Keywords, die nicht (nur) über die Auswahlfelder abgedeckt sind.
  // "key" dedupliziert gegen bereits im Wizard gewählte Optionen mit demselben key.
  keywords: [
    { key: "dj", aliases: ["dj", "discjockey", "plattenaufleger"], category: "musik", label: "DJ", preis: 950, reasonHint: "Technik-Miete für Ton & Licht, festes Zeitfenster und Gage" },
    { key: "band", aliases: ["live-band", "liveband", " band "], category: "musik", label: "Live-Band", preis: 2400, reasonHint: "Bühnenequipment, Soundcheck und mehrköpfiges Ensemble" },
    { key: "fotobox", aliases: ["fotobox", "photobooth", "photo booth"], category: "fotoVideo", label: "Fotobox", preis: 590, reasonHint: "Miete, Aufbau und Requisiten inklusive Betreuung" },
    { key: "shuttle", aliases: ["shuttle"], category: "logistik", label: "Shuttle-Service", preis: 480, reasonHint: "Fahrer, Fahrzeug und Wartezeit für den Gästetransfer" },
    { key: "kinderbetreuung", aliases: ["kinderbetreuung", "kinderprogramm", "babysitter"], category: "kinderbetreuung", label: "Kinderbetreuung", preis: 390, reasonHint: "geschultes Betreuungspersonal für die Dauer der Feier" },
    { key: "mitternachtssnack", aliases: ["mitternachtssnack", "mitternachts-snack"], category: "catering", label: "Mitternachtssnack", preisProGast: 9, reasonHint: "zusätzliche Küchenschicht spät am Abend" },
    { key: "torte", aliases: ["hochzeitstorte", "torte"], category: "catering", label: "Hochzeitstorte", preis: 190, reasonHint: "individuelle Anfertigung plus Anschnitt-Service" },
    { key: "sektempfang", aliases: ["sektempfang", "empfangsgetränk"], category: "getraenke", label: "Sektempfang", preisProGast: 7, reasonHint: "Empfangsgetränk inkl. Servicepersonal beim Gästeempfang" },
    { key: "feuerwerk", aliases: ["feuerwerk", "wunderkerzen"], category: "extras", label: "Feuerwerk / Wunderkerzen", preis: 360, reasonHint: "Genehmigung, Sicherheitsabstand und Aufsicht vor Ort" },
    { key: "brautauto", aliases: ["brautauto", "oldtimer", "hochzeitsauto"], category: "logistik", label: "Brautauto / Oldtimer", preis: 290, reasonHint: "Anfahrt, Fahrer und Wartezeit vor der Location" },
    { key: "weddingplanner", aliases: ["wedding planner", "hochzeitsplaner vor ort"], category: "extras", label: "Wedding Planner vor Ort", preis: 450, reasonHint: "externe Koordination am Tag selbst, zusätzlich zu unserem Host" },
    { key: "livestream", aliases: ["livestream", "live-stream"], category: "technik", label: "Livestream für Fernbleibende", preis: 320, reasonHint: "Kamera, Ton-Abgriff und technische Betreuung während der Zeremonie" }
  ],

  // Verfügbarkeit: frei (Standard), belegt, reserviert
  calendar: [
    { from: "2026-07-18", to: "2026-07-18", status: "belegt" },
    { from: "2026-07-25", to: "2026-07-26", status: "reserviert" },
    { from: "2026-08-01", to: "2026-08-02", status: "belegt" },
    { from: "2026-08-08", to: "2026-08-08", status: "belegt" },
    { from: "2026-08-15", to: "2026-08-16", status: "reserviert" },
    { from: "2026-08-22", to: "2026-08-22", status: "belegt" },
    { from: "2026-08-29", to: "2026-08-30", status: "belegt" },
    { from: "2026-09-05", to: "2026-09-05", status: "reserviert" },
    { from: "2026-09-12", to: "2026-09-12", status: "belegt" },
    { from: "2026-09-19", to: "2026-09-20", status: "belegt" }
  ]
};
