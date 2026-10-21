// w.js — clickzauber Widget-Loader + Runtime (eine Datei, kein Framework).
// Einbau beim Kunden:  <script src="https://clickzauber-api.vercel.app/w.js" data-cz="WIDGET-ID" async></script>
(function () {
  "use strict";
  var API = "https://clickzauber-api.vercel.app/api";

  var me = document.currentScript;
  var widget = me && me.getAttribute("data-cz");
  if (!widget) return;
  /* Vorschau aus dem Konfigurator: die Konfiguration liegt schon auf der Seite,
     es wird nichts geladen, nichts gezählt und nichts abgeschickt. */
  var VORSCHAU = widget === "__vorschau" && !!window.CZ_VORSCHAU_CONFIG;
  var mountId = widget;   // der Einbau-Punkt auf der Seite — bleibt, auch wenn eine Vergleichs-Variante läuft
  var merker = "cz_var_" + mountId;
  var channel = (me && me.getAttribute("data-cz-channel")) || null;

  /* Das Widget speichert nichts auf dem Gerät des Gastes — keine Cookies, kein
     localStorage, kein sessionStorage. Die Sitzungskennung lebt nur, solange die
     Seite offen ist. Dadurch braucht der Betrieb wegen clickzauber kein
     Cookie-Banner (§ 25 TDDDG greift nur beim Speichern auf dem Endgerät). */
  var sid = Math.random().toString(36).slice(2) + Date.now().toString(36);

  function track(type, extra) {
    if (VORSCHAU) return;
    try {
      var payload = Object.assign({ widget: widget, session: sid, type: type }, extra || {});
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) navigator.sendBeacon(API + "/event", body);
      else fetch(API + "/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
    } catch (e) {}
  }

  // ---- Design-Stile: dieselben Tokens wie im Editor ----
  var MOOD = {
    garden:   "radial-gradient(120% 90% at 25% 0%,rgba(170,200,150,.55),transparent 55%),radial-gradient(100% 80% at 90% 20%,rgba(90,130,100,.6),transparent 60%),linear-gradient(180deg,#4a6349,#1e2b1f)",
    blush:    "radial-gradient(120% 90% at 25% 0%,rgba(240,200,205,.55),transparent 55%),radial-gradient(100% 80% at 88% 15%,rgba(200,140,150,.55),transparent 60%),linear-gradient(180deg,#8a6068,#2f2024)",
    sand:     "radial-gradient(120% 90% at 20% 0%,rgba(240,220,190,.6),transparent 55%),radial-gradient(100% 80% at 88% 20%,rgba(200,170,130,.55),transparent 60%),linear-gradient(180deg,#a08a6c,#4a3c2c)",
    blue:     "radial-gradient(120% 90% at 20% 0%,rgba(150,180,210,.5),transparent 55%),radial-gradient(100% 80% at 85% 15%,rgba(70,95,140,.6),transparent 60%),linear-gradient(180deg,#3d4d6b,#1a2233)",
    sunset:   "radial-gradient(120% 90% at 15% 0%,rgba(255,196,140,.55),transparent 55%),radial-gradient(110% 80% at 90% 10%,rgba(214,120,90,.6),transparent 60%),linear-gradient(180deg,#8a5a44,#3a2820)",
    lake:     "radial-gradient(120% 90% at 20% 0%,rgba(180,205,205,.5),transparent 55%),radial-gradient(100% 80% at 85% 25%,rgba(90,135,140,.55),transparent 60%),linear-gradient(180deg,#4c6d70,#1c2b2c)",
    lavender: "radial-gradient(120% 90% at 25% 0%,rgba(215,205,235,.55),transparent 55%),radial-gradient(100% 80% at 88% 15%,rgba(150,135,180,.55),transparent 60%),linear-gradient(180deg,#7b6f97,#2b2436)",
    noir:     "radial-gradient(120% 80% at 30% 0%,rgba(200,170,120,.4),transparent 55%),linear-gradient(180deg,#2a2418,#12100a)"
  };
  // hell = Milchglas (heller Panel-Look), dunkel = Glas (Panel transparent auf dunkel)
  var SKINS = {
    "glass-milk":          { mood: "garden",   hell: 1, ink: "#1e2b1f", ink2: "#5b6b5c", line: "#d5e0d6", accent: "#1f6d4a", radius: 22, brad: 999 },
    "glass-milk-blush":    { mood: "blush",    hell: 1, ink: "#2f2024", ink2: "#7c6068", line: "#ecdcdf", accent: "#a8566a", radius: 22, brad: 999 },
    "glass-milk-sand":     { mood: "sand",     hell: 1, ink: "#3a2f22", ink2: "#7a6a52", line: "#e6dcc8", accent: "#a8442f", radius: 22, brad: 999 },
    "glass-milk-blue":     { mood: "blue",     hell: 1, ink: "#1a2233", ink2: "#5c6a80", line: "#d6dee9", accent: "#2f6d8a", radius: 22, brad: 999 },
    "glass-milk-sunset":   { mood: "sunset",   hell: 1, ink: "#3a2820", ink2: "#7d6455", line: "#eaddd2", accent: "#b3452e", radius: 22, brad: 999 },
    "glass-milk-lake":     { mood: "lake",     hell: 1, ink: "#1c2b2c", ink2: "#5b7173", line: "#d5e2e2", accent: "#1f7a7d", radius: 22, brad: 999 },
    "glass-milk-lavender": { mood: "lavender", hell: 1, ink: "#2b2436", ink2: "#6a6180", line: "#e0dcea", accent: "#6b5b8a", radius: 22, brad: 999 },
    "glass-milk-noir":     { mood: "noir",     hell: 1, ink: "#14120d", ink2: "#6e6551", line: "#e3dccb", accent: "#8a6a2f", radius: 22, brad: 999 },
    "glass-sunset":        { mood: "sunset",   ink: "#fff", ink2: "rgba(255,255,255,.76)", line: "rgba(255,255,255,.3)",  accent: "#fff", aink: "#3a2820", radius: 20, brad: 9 },
    "glass-blue":          { mood: "blue",     ink: "#fff", ink2: "rgba(255,255,255,.78)", line: "rgba(255,255,255,.34)", accent: "#fff", aink: "#1a2233", radius: 18, brad: 999 },
    "glass-garden":        { mood: "garden",   ink: "#fff", ink2: "rgba(255,255,255,.8)",  line: "rgba(255,255,255,.36)", accent: "#fff", aink: "#1e2b1f", radius: 16, brad: 10 },
    "glass-gold":          { mood: "noir",     ink: "#f2ead7", ink2: "#c9a862", line: "rgba(201,168,98,.4)", accent: "#c9a862", aink: "#14120d", radius: 16, brad: 9 },
    "glass-blush":         { mood: "blush",    ink: "#fff", ink2: "rgba(255,255,255,.78)", line: "rgba(255,255,255,.34)", accent: "#fff", aink: "#2f2024", radius: 16, brad: 9 },
    "glass-lake":          { mood: "lake",     ink: "#fff", ink2: "rgba(255,255,255,.76)", line: "rgba(255,255,255,.3)",  accent: "#fff", aink: "#1c2b2c", radius: 20, brad: 9 },
    "glass-minimal":       { mood: "sunset",   ink: "#fff", ink2: "rgba(255,255,255,.7)",  line: "rgba(255,255,255,.28)", accent: "#fff", aink: "#3a2820", radius: 14, brad: 9 },
    /* Dunkel Minimal: Glas Minimal mit fast schwarzem Knopf (wie Uncle’s Salon in der Verkaufspräsentation). */
    /* Klar & hell: ruhige Creme-Fläche, Kalendertage als weiche Kacheln (freie Tage mintgrün), runder Knopf. */
    "klar-hell":   { flach: "#fbf8f3", hell: 1, ink: "#27241d", ink2: "#7a7263", line: "#e7e0d2", surface: "#fbf8f3", field: "#fff", accent: "#2f7d59", aink: "#fff", radius: 28, brad: 999, kacheln: 1 },
    "dunkel-minimal":      { mood: "sunset",   ink: "#fff", ink2: "rgba(255,255,255,.7)",  line: "rgba(255,255,255,.28)", accent: "#1f1d1a", aink: "#fff", radius: 14, brad: 9 },
    /* Nur ab Vertrauensabzeichen Gold (Editor sperrt sie vorher) */
    "gold-edel":     { flach: "#fbf6e9", hell: 1, ink: "#2b2412", ink2: "#7a6a45", line: "#eadfbf", surface: "#fbf6e9", field: "#fff", accent: "#b08a1e", aink: "#fff", radius: 18, brad: 999 },
    "kristall-rose": { flach: "#fff5f9", hell: 1, ink: "#2a1420", ink2: "#7d5a6b", line: "#f1d6e3", surface: "#fff5f9", field: "#fff", accent: "#d0357f", aink: "#fff", radius: 24, brad: 999 },
    // Flächige Stile — kein Glas, eigene Grundfarbe
    /* Weiß: Grundeinstellung neuer Formulare (seit 02.10.2026) — weiße Fläche, schwarze Schrift, schwarzer Knopf. */
    "blank":     { flach: "#fff",    hell: 1, ink: "#141414", ink2: "#5f5f5f", line: "#e2e2e2", surface: "#fff", field: "#fff", accent: "#1c1a14", aink: "#fff", radius: 20, brad: 999 },
    "clean":     { flach: "#fff",    hell: 1, ink: "#211d16", ink2: "#8a8270", line: "#e6ddca", surface: "#fdfbf5", field: "#fff", accent: "#1f8a5b", aink: "#fff", radius: 20, brad: 999 },
    "editorial": { flach: "#f7f1e4", hell: 1, ink: "#211d16", ink2: "#8a7d5f", line: "#d8c8a8", surface: "#fffdf6", field: "#fff", accent: "#a8442f", aink: "#fff", radius: 4,  brad: 0 },
    "concierge": { flach: "#14120d", ink: "#f2ead7", ink2: "#8a7f66", line: "#3d3626", surface: "#1c1a12", field: "#161309", accent: "#c9a862", aink: "#14120d", radius: 18, brad: 999 },
    "notebook":  { flach: "#fcfbf5", hell: 1, ink: "#2a2620", ink2: "#5b5341", line: "#e3ddc8", surface: "#fff", field: "#fff", accent: "#c1573f", aink: "#fff", radius: 14, brad: 999, muster: "radial-gradient(#e0dac4 1px,transparent 1px)", musterGr: "20px 20px" },
    "terminal":  { flach: "#0d1510", ink: "#d6ffe6", ink2: "#3f7d57", line: "#24402e", surface: "#0a110c", field: "#0a110c", accent: "#7df0a8", aink: "#0d1510", radius: 10, brad: 4 },
    "brutal":    { flach: "#f5d90a", hell: 1, ink: "#111", ink2: "#444", line: "#111", surface: "#fff", field: "#fff", accent: "#111", aink: "#fff", radius: 0, brad: 0, rahmen: "3px solid #111", schatten: "8px 8px 0 #111" },
    "timeline":  { flach: "#fff",    hell: 1, ink: "#211d16", ink2: "#6b6350", line: "#e6ddca", surface: "#faf6ec", field: "#faf6ec", accent: "#1f8a5b", aink: "#fff", radius: 18, brad: 999 },
    "chat":      { flach: "#f4efe6", hell: 1, ink: "#211d16", ink2: "#8a7f66", line: "#e2d9c4", surface: "#fff", field: "#fff", accent: "#1f8a5b", aink: "#fff", radius: 20, brad: 999 },
    "swiss":     { flach: "#fff",    hell: 1, ink: "#111", ink2: "#888", line: "#111", surface: "#fff", field: "#fff", accent: "#e2231a", aink: "#fff", radius: 0, brad: 0, rahmen: "1px solid #111" },
    "ticket":    { flach: "#fffdf8", hell: 1, ink: "#15352a", ink2: "#8a9b93", line: "#cfe0d8", surface: "#f4f9f6", field: "#f4f9f6", accent: "#15352a", aink: "#fff", radius: 16, brad: 999 },
    "glass":     { foto: 1, ink: "#fff", ink2: "rgba(255,255,255,.78)", line: "rgba(255,255,255,.32)", surface: "rgba(255,255,255,.14)", field: "rgba(255,255,255,.17)", accent: "#fff", aink: "#1f2e28", radius: 20, brad: 999 }
  };

  /* Sprachen des Gäste-Formulars. Feste Texte stehen hier; was der Betrieb selbst
     schreibt (Fragen, Antworten, Hinweise), steht je Sprache unter .tr.en / .tr.sq
     am jeweiligen Eintrag. Fehlt eine Übersetzung, erscheint der deutsche Text.
     An den Betrieb geht die Anfrage immer auf Deutsch. */
  var D = {
    de: { name: "Deutsch", loc: "de-DE", sprache: "Sprache",
      wn: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
      mn: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
      wkM: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], wkS: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      pausiert: "Zurzeit nehmen wir keine neuen Anfragen an.",
      wlStart: "Wunschtag schon vergeben? Auf die Warteliste setzen",
      wlDone: function (d) { return "<b>Sie stehen auf der Warteliste für " + d + ".</b> Wird der Termin frei, melden wir uns."; },
      wlTap: "Tippen Sie im Kalender auf Ihren <b>roten</b> Wunschtag.", abbr: "Abbrechen", wlFor: "Warteliste für ", bei: " bei ",
      kontakt: "E-Mail oder Telefonnummer", wlConsent: "Ich bin einverstanden, dass meine Angaben für die Warteliste gespeichert werden.",
      ds: "Datenschutzerklärung", ds2: "Datenschutzerklärung", wlBtn: "Auf die Warteliste", wlZust: "Bitte der Speicherung zustimmen.",
      wlKontakt: "Bitte eine E-Mail-Adresse oder Telefonnummer angeben.", wlLaeuft: "Wird eingetragen …", fehlerAllg: "Das hat nicht geklappt.", offline: "Server nicht erreichbar.",
      hTop: "Unsere gefragteste Kombination — bitte früh anfragen.", hBeliebt: "Beliebter Zeitraum. Termine sind schnell vergeben.",
      hRuhig: "Ruhiger Zeitraum — der günstigste Termin.", hGut: "Gute Chancen auf einen freien Termin.",
      bUnter: function (l, p) { return "<b>Ihr Wunschbudget liegt unter dem Richtwert.</b> Sie haben " + l + " angegeben, die aktuelle Auswahl liegt bei " + p + ". Kein Problem — wir zeigen Ihnen im Angebot, wo sich am meisten sparen lässt (Menüstil, Wochentag, Getränkepaket)."; },
      bLuft: function (p) { return "<b>Da ist noch Luft.</b> Ihr Budget liegt über dem Richtwert von " + p + " — wir schlagen im Angebot gern Erweiterungen vor."; },
      location: "Location", proGast: " / Gast", aufAnfrage: "auf Anfrage", datumWaehlen: "Datum wählen", vergeben: "vergeben", vorbei: "vorbei", frei: "frei",
      vorMonat: "Voriger Monat", naechMonat: "Nächster Monat", jahr: "Jahr", legBusy: "schon vergeben",
      tmSetup: "Die Online-Buchung wird gerade eingerichtet. Bitte melden Sie sich direkt bei uns.",
      person: "Person", personWeg: "Person entfernen", fuerWen: "Für wen?", nameFrei: "Name (freiwillig)", wasDarf: "Was darf es sein?", min: "Min.",
      beiWem: "Bei wem?", egal: "Egal wer", ersterFrei: "erster freier Termin", nichtBuchbar: ", nicht buchbar", welcherTag: "Welcher Tag?",
      frueher: "Frühere Tage", spaeter: "Spätere Tage", uhrzeit: "Uhrzeit", laden: "Freie Zeiten werden geladen …",
      ladeFehler: "Die freien Zeiten konnten gerade nicht geladen werden. Bitte den Tag noch einmal antippen.",
      nichtsFrei: function (w) { return "An diesem Tag ist " + (w ? "bei " + w + " " : "") + "nichts mehr frei. Bitte einen anderen Tag wählen."; },
      wlTag: "Für diesen Tag auf die Warteliste setzen", ihrTermin: "Ihr Termin: ", weiterePerson: "+ Termin für eine weitere Person", zurueckK: "Zurück", verbindlich: function (tel) { return "Ihre Reservierung ist verbindlich. Wenn Sie nicht kommen können, rufen Sie uns bitte an" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return z + " Uhr"; },
      gruenFrei: "Grün markierte Tage sind noch frei.", inkl: "inklusive",
      errVergeben: "Diese Uhrzeit wurde gerade von jemand anderem gebucht. Bitte wählen Sie eine andere.",
      errTermin: "Bitte für jede Person Leistung, Tag und Uhrzeit wählen.", errLeer: "Bitte hier noch eine Angabe machen.",
      ihreAnfrage: "Ihre Anfrage", fertig: "Fertig", zurueck: "← Zurück", seiteVon: function (a, b) { return "Seite " + a + " von " + b; },
      fastFertig: "Fast fertig", weiter: "Weiter", ueberspringen: "Überspringen",
      pflicht: "<b>*</b> Pflichtfrage. Fragen ohne Sternchen können Sie überspringen.",
      sumTitel: "Ihre unverbindliche Einschätzung", ihreAngaben: "Ihre Angaben", zusatz: "Zusatzleistungen", kosten: "Kostenaufstellung",
      gesamt: "Gesamt (Richtwert)", richtwert: "Richtwert", ca: "ca.", weiterAnfrage: "Weiter zur Anfrage",
      lName: "Ihr Name", lEmail: "Ihre E-Mail", lTel: "Ihre Telefonnummer", leadH: "Fast geschafft — wohin dürfen wir antworten?",
      consent: "Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert und verarbeitet werden.",
      dsMehr: function (a) { return "Mehr dazu in der " + a + "."; }, absenden: "Anfrage absenden",
      dsH: "Hinweis zum Datenschutz:",
      dsText: function (b) { return "Ihre Angaben verwenden wir nur, um Ihre Anfrage zu bearbeiten und Ihnen zu antworten (Art. 6 Abs. 1 lit. b DSGVO). Verantwortlich ist " + (b || "der Betrieb, bei dem Sie anfragen") + ". Das Formular stellt clickzauber in dessen Auftrag technisch bereit. Ohne Ihre Zustimmung geben wir nichts an Dritte weiter. Sie können jederzeit Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen und eine erteilte Einwilligung mit Wirkung für die Zukunft widerrufen."; },
      dsOhne: function (b) { return b ? "Die Datenschutzerklärung finden Sie auf der Website von " + b + "." : "Die Datenschutzerklärung finden Sie auf unserer Website."; },
      danke: "Vielen Dank!", doneTermin: "Ihr Terminwunsch ist für Sie reserviert. Wir bestätigen ihn in Kürze per Telefon oder Nachricht.",
      doneAnfrage: "Ihre Anfrage ist eingegangen. Wir melden uns innerhalb von 24 Stunden mit einem konkreten Angebot.",
      alertFelder: "Bitte alle Felder ausfüllen und zustimmen.", sendet: "Wird gesendet …",
      errH: "Das hat gerade nicht geklappt.", errText: "Ihre Angaben sind noch da. Bitte versuchen Sie es erneut",
      errTel: " oder rufen Sie uns an — wir nehmen die Anfrage sofort auf.", erneut: "Erneut senden", perMail: "Per E-Mail", anrufen: "Lieber anrufen?" },
    en: { name: "English", loc: "en-GB", sprache: "Language",
      wn: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      mn: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      wkM: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], wkS: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      pausiert: "We are not taking new enquiries at the moment.",
      wlStart: "Your date is already taken? Join the waiting list",
      wlDone: function (d) { return "<b>You are on the waiting list for " + d + ".</b> If the date becomes available, we will let you know."; },
      wlTap: "Tap your preferred <b>red</b> date in the calendar.", abbr: "Cancel", wlFor: "Waiting list for ", bei: " with ",
      kontakt: "Email or phone number", wlConsent: "I agree that my details are stored for the waiting list.",
      ds: "Privacy policy", ds2: "privacy policy", wlBtn: "Join the waiting list", wlZust: "Please agree to your details being stored.",
      wlKontakt: "Please enter an email address or phone number.", wlLaeuft: "Adding you …", fehlerAllg: "That did not work.", offline: "The server cannot be reached.",
      hTop: "Our most requested combination — please enquire early.", hBeliebt: "A popular period. Dates fill up quickly.",
      hRuhig: "A quiet period — the best-value date.", hGut: "Good chances of a free date.",
      bUnter: function (l, p) { return "<b>Your budget is below the estimate.</b> You chose " + l + ", your current selection comes to " + p + ". No problem — in our offer we will show you where you can save the most (menu style, day of the week, drinks package)."; },
      bLuft: function (p) { return "<b>There is still room.</b> Your budget is above the estimate of " + p + " — we are happy to suggest extras in our offer."; },
      location: "Venue", proGast: " / guest", aufAnfrage: "on request", datumWaehlen: "Choose a date", vergeben: "taken", vorbei: "past", frei: "free",
      vorMonat: "Previous month", naechMonat: "Next month", jahr: "Year", legBusy: "already taken",
      tmSetup: "Online booking is being set up. Please contact us directly.",
      person: "Person", personWeg: "Remove person", fuerWen: "For whom?", nameFrei: "Name (optional)", wasDarf: "What would you like?", min: "min",
      beiWem: "With whom?", egal: "Anyone", ersterFrei: "first available slot", nichtBuchbar: ", not available", welcherTag: "Which day?",
      frueher: "Earlier days", spaeter: "Later days", uhrzeit: "Time", laden: "Loading available times …",
      ladeFehler: "The available times could not be loaded. Please tap the day again.",
      nichtsFrei: function (w) { return "Nothing is available on this day" + (w ? " with " + w : "") + ". Please choose another day."; },
      wlTag: "Join the waiting list for this day", ihrTermin: "Your appointment: ", weiterePerson: "+ Appointment for another person", zurueckK: "Back", verbindlich: function (tel) { return "Your booking is binding. If you cannot come, please call us" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return z; },
      gruenFrei: "Days marked green are still available.", inkl: "included",
      errVergeben: "Someone else has just booked this time. Please choose another one.",
      errTermin: "Please choose a service, day and time for each person.", errLeer: "Please fill in this field.",
      ihreAnfrage: "Your enquiry", fertig: "Done", zurueck: "← Back", seiteVon: function (a, b) { return "Page " + a + " of " + b; },
      fastFertig: "Almost done", weiter: "Next", ueberspringen: "Skip",
      pflicht: "<b>*</b> Required. You can skip questions without an asterisk.",
      sumTitel: "Your non-binding estimate", ihreAngaben: "Your details", zusatz: "Extras", kosten: "Cost breakdown",
      gesamt: "Total (estimate)", richtwert: "Estimate", ca: "approx.", weiterAnfrage: "Continue to enquiry",
      lName: "Your name", lEmail: "Your email", lTel: "Your phone number", leadH: "Almost there — where should we reply?",
      consent: "I agree that my details are stored and processed to handle my enquiry.",
      dsMehr: function (a) { return "More in our " + a + "."; }, absenden: "Send enquiry",
      danke: "Thank you!", doneTermin: "Your requested appointment is reserved for you. We will confirm it shortly by phone or message.",
      doneAnfrage: "Your enquiry has been received. We will get back to you within 24 hours with a concrete offer.",
      alertFelder: "Please fill in all fields and give your consent.", sendet: "Sending …",
      errH: "Something went wrong.", errText: "Your details are still here. Please try again",
      errTel: " or give us a call — we will take your enquiry right away.", erneut: "Send again", perMail: "By email", anrufen: "Prefer to call?" },
    sq: { name: "Shqip", loc: "sq-AL", sprache: "Gjuha",
      wn: ["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"],
      mn: ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"],
      wkM: ["Hë", "Ma", "Më", "En", "Pr", "Sh", "Di"], wkS: ["Di", "Hë", "Ma", "Më", "En", "Pr", "Sh"],
      pausiert: "Për momentin nuk pranojmë kërkesa të reja.",
      wlStart: "Data e dëshiruar është e zënë? Regjistrohuni në listën e pritjes",
      wlDone: function (d) { return "<b>Jeni në listën e pritjes për " + d + ".</b> Nëse data lirohet, do t'ju njoftojmë."; },
      wlTap: "Prekni në kalendar ditën e dëshiruar me ngjyrë <b>të kuqe</b>.", abbr: "Anulo", wlFor: "Lista e pritjes për ", bei: " te ",
      kontakt: "Email ose numër telefoni", wlConsent: "Pranoj që të dhënat e mia të ruhen për listën e pritjes.",
      ds: "Politika e privatësisë", ds2: "politikën e privatësisë", wlBtn: "Në listën e pritjes", wlZust: "Ju lutemi pranoni ruajtjen e të dhënave.",
      wlKontakt: "Ju lutemi shkruani një adresë email-i ose një numër telefoni.", wlLaeuft: "Po regjistrohet …", fehlerAllg: "Nuk funksionoi.", offline: "Serveri nuk është i arritshëm.",
      hTop: "Kombinimi ynë më i kërkuar — ju lutemi pyesni herët.", hBeliebt: "Periudhë e kërkuar. Datat zihen shpejt.",
      hRuhig: "Periudhë e qetë — data më e favorshme.", hGut: "Shanse të mira për një datë të lirë.",
      bUnter: function (l, p) { return "<b>Buxheti juaj është nën vlerën orientuese.</b> Keni zgjedhur " + l + ", zgjedhja aktuale kushton rreth " + p + ". Asnjë problem — në ofertë ju tregojmë ku mund të kurseni më shumë (menuja, dita e javës, paketa e pijeve)."; },
      bLuft: function (p) { return "<b>Ka ende hapësirë.</b> Buxheti juaj është mbi vlerën orientuese prej " + p + " — në ofertë ju propozojmë me kënaqësi shtesa."; },
      location: "Lokali", proGast: " / mysafir", aufAnfrage: "sipas kërkesës", datumWaehlen: "Zgjidhni datën", vergeben: "e zënë", vorbei: "e kaluar", frei: "e lirë",
      vorMonat: "Muaji i kaluar", naechMonat: "Muaji tjetër", jahr: "Viti", legBusy: "e zënë",
      tmSetup: "Rezervimi online po përgatitet. Ju lutemi na kontaktoni drejtpërdrejt.",
      person: "Personi", personWeg: "Hiq personin", fuerWen: "Për kë?", nameFrei: "Emri (nuk është i detyrueshëm)", wasDarf: "Çfarë dëshironi?", min: "min.",
      beiWem: "Te kush?", egal: "Kushdo", ersterFrei: "orari i parë i lirë", nichtBuchbar: ", nuk mund të rezervohet", welcherTag: "Cila ditë?",
      frueher: "Ditët e mëparshme", spaeter: "Ditët në vijim", uhrzeit: "Ora", laden: "Po ngarkohen oraret e lira …",
      ladeFehler: "Oraret e lira nuk u ngarkuan. Ju lutemi prekni sërish ditën.",
      nichtsFrei: function (w) { return "Këtë ditë nuk ka më orar të lirë" + (w ? " te " + w : "") + ". Ju lutemi zgjidhni një ditë tjetër."; },
      wlTag: "Regjistrohuni në listën e pritjes për këtë ditë", ihrTermin: "Termini juaj: ", weiterePerson: "+ Termin për një person tjetër", zurueckK: "Kthehu", verbindlich: function (tel) { return "Rezervimi juaj është i detyrueshëm. Nëse nuk mund të vini, ju lutemi na telefononi" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return "ora " + z; },
      gruenFrei: "Ditët me ngjyrë të gjelbër janë ende të lira.", inkl: "i përfshirë",
      errVergeben: "Kjo orë sapo u rezervua nga dikush tjetër. Ju lutemi zgjidhni një orë tjetër.",
      errTermin: "Ju lutemi zgjidhni shërbimin, ditën dhe orën për secilin person.", errLeer: "Ju lutemi plotësoni këtë fushë.",
      ihreAnfrage: "Kërkesa juaj", fertig: "Gati", zurueck: "← Prapa", seiteVon: function (a, b) { return "Faqja " + a + " nga " + b; },
      fastFertig: "Pothuajse gati", weiter: "Vazhdo", ueberspringen: "Kapërce",
      pflicht: "<b>*</b> Pyetje e detyrueshme. Pyetjet pa yll mund t'i kapërceni.",
      sumTitel: "Vlerësimi juaj pa detyrim", ihreAngaben: "Të dhënat tuaja", zusatz: "Shërbime shtesë", kosten: "Përllogaritja e kostove",
      gesamt: "Gjithsej (vlerë orientuese)", richtwert: "Vlerë orientuese", ca: "rreth", weiterAnfrage: "Vazhdo te kërkesa",
      lName: "Emri juaj", lEmail: "Email-i juaj", lTel: "Numri juaj i telefonit", leadH: "Pothuajse gati — ku t'ju përgjigjemi?",
      consent: "Pranoj që të dhënat e mia të ruhen dhe të përpunohen për trajtimin e kërkesës sime.",
      dsMehr: function (a) { return "Më shumë në " + a + "."; }, absenden: "Dërgo kërkesën",
      danke: "Faleminderit!", doneTermin: "Termini që kërkuat është rezervuar për ju. Do ta konfirmojmë së shpejti me telefon ose mesazh.",
      doneAnfrage: "Kërkesa juaj u mor. Do t'ju kontaktojmë brenda 24 orëve me një ofertë konkrete.",
      alertFelder: "Ju lutemi plotësoni të gjitha fushat dhe jepni pëlqimin.", sendet: "Po dërgohet …",
      errH: "Diçka nuk funksionoi.", errText: "Të dhënat tuaja janë ende këtu. Ju lutemi provoni sërish",
      errTel: " ose na telefononi — e marrim kërkesën menjëherë.", erneut: "Dërgo sërish", perMail: "Me email", anrufen: "Preferoni të telefononi?" },
    fr: { name: "Français", loc: "fr-FR", sprache: "Langue",
      wn: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
      mn: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
      wkM: ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"], wkS: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
      pausiert: "Nous ne prenons pas de nouvelles demandes pour le moment.",
      wlStart: "Votre date est déjà prise ? Inscrivez-vous sur la liste d’attente",
      wlDone: function (d) { return "<b>Vous êtes sur la liste d’attente pour " + d + ".</b> Si la date se libère, nous vous prévenons."; },
      wlTap: "Touchez dans le calendrier votre date souhaitée en <b>rouge</b>.", abbr: "Annuler", wlFor: "Liste d’attente pour ", bei: " avec ",
      kontakt: "E-mail ou numéro de téléphone", wlConsent: "J’accepte que mes informations soient enregistrées pour la liste d’attente.",
      ds: "Politique de confidentialité", ds2: "politique de confidentialité", wlBtn: "M’inscrire sur la liste d’attente", wlZust: "Veuillez accepter l’enregistrement de vos informations.",
      wlKontakt: "Veuillez indiquer une adresse e-mail ou un numéro de téléphone.", wlLaeuft: "Inscription en cours …", fehlerAllg: "Cela n’a pas fonctionné.", offline: "Serveur injoignable.",
      hTop: "Notre combinaison la plus demandée — faites votre demande tôt.", hBeliebt: "Période très demandée. Les dates partent vite.",
      hRuhig: "Période calme — la date la plus avantageuse.", hGut: "Bonnes chances de trouver une date libre.",
      bUnter: function (l, p) { return "<b>Votre budget est inférieur à l’estimation.</b> Vous avez indiqué " + l + ", la sélection actuelle revient à " + p + ". Pas de problème — dans notre offre, nous vous montrons où économiser le plus (style de menu, jour de la semaine, forfait boissons)."; },
      bLuft: function (p) { return "<b>Il reste de la marge.</b> Votre budget dépasse l’estimation de " + p + " — nous vous proposerons volontiers des options dans notre offre."; },
      location: "Lieu", proGast: " / invité", aufAnfrage: "sur demande", datumWaehlen: "Choisir une date", vergeben: "pris", vorbei: "passé", frei: "libre",
      vorMonat: "Mois précédent", naechMonat: "Mois suivant", jahr: "Année", legBusy: "déjà pris",
      tmSetup: "La réservation en ligne est en cours de configuration. Veuillez nous contacter directement.",
      person: "Personne", personWeg: "Retirer la personne", fuerWen: "Pour qui ?", nameFrei: "Nom (facultatif)", wasDarf: "Que souhaitez-vous ?", min: "min",
      beiWem: "Avec qui ?", egal: "Peu importe", ersterFrei: "premier créneau libre", nichtBuchbar: ", non réservable", welcherTag: "Quel jour ?",
      frueher: "Jours précédents", spaeter: "Jours suivants", uhrzeit: "Heure", laden: "Chargement des créneaux libres …",
      ladeFehler: "Les créneaux libres n’ont pas pu être chargés. Veuillez toucher à nouveau le jour.",
      nichtsFrei: function (w) { return "Plus rien n’est libre ce jour-là" + (w ? " avec " + w : "") + ". Veuillez choisir un autre jour."; },
      wlTag: "M’inscrire sur la liste d’attente pour ce jour", ihrTermin: "Votre rendez-vous : ", weiterePerson: "+ Rendez-vous pour une autre personne", zurueckK: "Retour", verbindlich: function (tel) { return "Votre réservation est ferme. Si vous ne pouvez pas venir, merci de nous appeler" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return z; },
      gruenFrei: "Les jours en vert sont encore libres.", inkl: "inclus",
      errVergeben: "Cet horaire vient d’être réservé par quelqu’un d’autre. Veuillez en choisir un autre.",
      errTermin: "Veuillez choisir une prestation, un jour et une heure pour chaque personne.", errLeer: "Veuillez renseigner ce champ.",
      ihreAnfrage: "Votre demande", fertig: "Terminé", zurueck: "← Retour", seiteVon: function (a, b) { return "Page " + a + " sur " + b; },
      fastFertig: "Presque terminé", weiter: "Suivant", ueberspringen: "Passer",
      pflicht: "<b>*</b> Question obligatoire. Vous pouvez passer les questions sans astérisque.",
      sumTitel: "Votre estimation sans engagement", ihreAngaben: "Vos informations", zusatz: "Prestations supplémentaires", kosten: "Détail des coûts",
      gesamt: "Total (estimation)", richtwert: "Estimation", ca: "env.", weiterAnfrage: "Continuer vers la demande",
      lName: "Votre nom", lEmail: "Votre e-mail", lTel: "Votre numéro de téléphone", leadH: "Presque fini — où pouvons-nous vous répondre ?",
      consent: "J’accepte que mes informations soient enregistrées et traitées pour le traitement de ma demande.",
      dsMehr: function (a) { return "Plus d’informations dans notre " + a + "."; }, absenden: "Envoyer la demande",
      danke: "Merci beaucoup !", doneTermin: "La date souhaitée est réservée pour vous. Nous la confirmerons sous peu par téléphone ou par message.",
      doneAnfrage: "Votre demande a bien été reçue. Nous revenons vers vous sous 24 heures avec une offre concrète.",
      alertFelder: "Veuillez remplir tous les champs et donner votre accord.", sendet: "Envoi en cours …",
      errH: "Cela n’a pas fonctionné.", errText: "Vos informations sont toujours là. Veuillez réessayer",
      errTel: " ou appelez-nous — nous prenons votre demande tout de suite.", erneut: "Renvoyer", perMail: "Par e-mail", anrufen: "Vous préférez appeler ?" },
    it: { name: "Italiano", loc: "it-IT", sprache: "Lingua",
      wn: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
      mn: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
      wkM: ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"], wkS: ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"],
      pausiert: "Al momento non accettiamo nuove richieste.",
      wlStart: "La data desiderata è già occupata? Si iscriva alla lista d’attesa",
      wlDone: function (d) { return "<b>È in lista d’attesa per " + d + ".</b> Se la data si libera, La avviseremo."; },
      wlTap: "Tocchi nel calendario il giorno desiderato in <b>rosso</b>.", abbr: "Annulla", wlFor: "Lista d’attesa per ", bei: " con ",
      kontakt: "E-mail o numero di telefono", wlConsent: "Acconsento alla memorizzazione dei miei dati per la lista d’attesa.",
      ds: "Informativa sulla privacy", ds2: "informativa sulla privacy", wlBtn: "Iscriviti alla lista d’attesa", wlZust: "Acconsenta alla memorizzazione dei dati.",
      wlKontakt: "Indichi un indirizzo e-mail o un numero di telefono.", wlLaeuft: "Iscrizione in corso …", fehlerAllg: "Non ha funzionato.", offline: "Server non raggiungibile.",
      hTop: "La nostra combinazione più richiesta — chieda per tempo.", hBeliebt: "Periodo molto richiesto. Le date si esauriscono in fretta.",
      hRuhig: "Periodo tranquillo — la data più conveniente.", hGut: "Buone possibilità di trovare una data libera.",
      bUnter: function (l, p) { return "<b>Il Suo budget è inferiore alla stima.</b> Ha indicato " + l + ", la selezione attuale è di " + p + ". Nessun problema — nell’offerta Le mostriamo dove si può risparmiare di più (stile del menù, giorno della settimana, pacchetto bevande)."; },
      bLuft: function (p) { return "<b>C’è ancora margine.</b> Il Suo budget supera la stima di " + p + " — nell’offerta Le proporremo volentieri delle aggiunte."; },
      location: "Location", proGast: " / ospite", aufAnfrage: "su richiesta", datumWaehlen: "Scegli la data", vergeben: "occupato", vorbei: "passato", frei: "libero",
      vorMonat: "Mese precedente", naechMonat: "Mese successivo", jahr: "Anno", legBusy: "già occupato",
      tmSetup: "La prenotazione online è in fase di configurazione. La preghiamo di contattarci direttamente.",
      person: "Persona", personWeg: "Rimuovi persona", fuerWen: "Per chi?", nameFrei: "Nome (facoltativo)", wasDarf: "Cosa desidera?", min: "min",
      beiWem: "Con chi?", egal: "Chiunque", ersterFrei: "primo orario libero", nichtBuchbar: ", non prenotabile", welcherTag: "Quale giorno?",
      frueher: "Giorni precedenti", spaeter: "Giorni successivi", uhrzeit: "Orario", laden: "Caricamento degli orari liberi …",
      ladeFehler: "Non è stato possibile caricare gli orari liberi. Tocchi di nuovo il giorno.",
      nichtsFrei: function (w) { return "In questo giorno non c’è più nulla di libero" + (w ? " con " + w : "") + ". Scelga un altro giorno."; },
      wlTag: "Iscriviti alla lista d’attesa per questo giorno", ihrTermin: "Il Suo appuntamento: ", weiterePerson: "+ Appuntamento per un’altra persona", zurueckK: "Indietro", verbindlich: function (tel) { return "La Sua prenotazione è vincolante. Se non può venire, ci chiami per favore" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return "ore " + z; },
      gruenFrei: "I giorni in verde sono ancora liberi.", inkl: "incluso",
      errVergeben: "Questo orario è appena stato prenotato da qualcun altro. Ne scelga un altro.",
      errTermin: "Scelga servizio, giorno e orario per ogni persona.", errLeer: "Compili questo campo.",
      ihreAnfrage: "La Sua richiesta", fertig: "Fatto", zurueck: "← Indietro", seiteVon: function (a, b) { return "Pagina " + a + " di " + b; },
      fastFertig: "Quasi fatto", weiter: "Avanti", ueberspringen: "Salta",
      pflicht: "<b>*</b> Domanda obbligatoria. Può saltare le domande senza asterisco.",
      sumTitel: "La Sua stima non vincolante", ihreAngaben: "I Suoi dati", zusatz: "Servizi aggiuntivi", kosten: "Dettaglio dei costi",
      gesamt: "Totale (stima)", richtwert: "Stima", ca: "ca.", weiterAnfrage: "Prosegui con la richiesta",
      lName: "Il Suo nome", lEmail: "La Sua e-mail", lTel: "Il Suo numero di telefono", leadH: "Quasi fatto — dove possiamo risponderLe?",
      consent: "Acconsento alla memorizzazione e al trattamento dei miei dati per la gestione della mia richiesta.",
      dsMehr: function (a) { return "Maggiori informazioni nell’" + a + "."; }, absenden: "Invia richiesta",
      danke: "Grazie mille!", doneTermin: "La data richiesta è riservata per Lei. La confermeremo a breve per telefono o messaggio.",
      doneAnfrage: "La Sua richiesta è arrivata. La ricontatteremo entro 24 ore con un’offerta concreta.",
      alertFelder: "Compili tutti i campi e dia il Suo consenso.", sendet: "Invio in corso …",
      errH: "Non ha funzionato.", errText: "I Suoi dati sono ancora qui. Riprovi",
      errTel: " oppure ci chiami — prendiamo subito la Sua richiesta.", erneut: "Invia di nuovo", perMail: "Per e-mail", anrufen: "Preferisce chiamare?" },
    es: { name: "Español", loc: "es-ES", sprache: "Idioma",
      wn: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
      mn: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
      wkM: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"], wkS: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
      pausiert: "En este momento no aceptamos nuevas solicitudes.",
      wlStart: "¿Su fecha ya está ocupada? Apúntese a la lista de espera",
      wlDone: function (d) { return "<b>Está en la lista de espera para " + d + ".</b> Si la fecha queda libre, le avisaremos."; },
      wlTap: "Toque en el calendario el día deseado en <b>rojo</b>.", abbr: "Cancelar", wlFor: "Lista de espera para ", bei: " con ",
      kontakt: "Correo electrónico o teléfono", wlConsent: "Acepto que mis datos se guarden para la lista de espera.",
      ds: "Política de privacidad", ds2: "política de privacidad", wlBtn: "Apuntarme a la lista de espera", wlZust: "Por favor, acepte que se guarden sus datos.",
      wlKontakt: "Indique un correo electrónico o un número de teléfono.", wlLaeuft: "Apuntando …", fehlerAllg: "No ha funcionado.", offline: "No se puede conectar con el servidor.",
      hTop: "Nuestra combinación más solicitada — consulte con antelación.", hBeliebt: "Época muy solicitada. Las fechas se agotan rápido.",
      hRuhig: "Época tranquila — la fecha más económica.", hGut: "Buenas posibilidades de encontrar fecha libre.",
      bUnter: function (l, p) { return "<b>Su presupuesto está por debajo de la estimación.</b> Ha indicado " + l + ", la selección actual asciende a " + p + ". No hay problema — en la oferta le mostraremos dónde se puede ahorrar más (estilo de menú, día de la semana, paquete de bebidas)."; },
      bLuft: function (p) { return "<b>Todavía hay margen.</b> Su presupuesto supera la estimación de " + p + " — en la oferta le propondremos con gusto algunos extras."; },
      location: "Local", proGast: " / invitado", aufAnfrage: "a consultar", datumWaehlen: "Elegir fecha", vergeben: "ocupado", vorbei: "pasado", frei: "libre",
      vorMonat: "Mes anterior", naechMonat: "Mes siguiente", jahr: "Año", legBusy: "ya ocupado",
      tmSetup: "La reserva online se está configurando. Por favor, contacte directamente con nosotros.",
      person: "Persona", personWeg: "Quitar persona", fuerWen: "¿Para quién?", nameFrei: "Nombre (opcional)", wasDarf: "¿Qué desea?", min: "min",
      beiWem: "¿Con quién?", egal: "Cualquiera", ersterFrei: "primera hora libre", nichtBuchbar: ", no reservable", welcherTag: "¿Qué día?",
      frueher: "Días anteriores", spaeter: "Días siguientes", uhrzeit: "Hora", laden: "Cargando horas libres …",
      ladeFehler: "No se han podido cargar las horas libres. Toque de nuevo el día.",
      nichtsFrei: function (w) { return "Este día ya no queda nada libre" + (w ? " con " + w : "") + ". Elija otro día."; },
      wlTag: "Apuntarme a la lista de espera para este día", ihrTermin: "Su cita: ", weiterePerson: "+ Cita para otra persona", zurueckK: "Atrás", verbindlich: function (tel) { return "Su reserva es vinculante. Si no puede venir, llámenos por favor" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return z; },
      gruenFrei: "Los días en verde siguen libres.", inkl: "incluido",
      errVergeben: "Otra persona acaba de reservar esta hora. Por favor, elija otra.",
      errTermin: "Elija servicio, día y hora para cada persona.", errLeer: "Por favor, complete este campo.",
      ihreAnfrage: "Su solicitud", fertig: "Listo", zurueck: "← Atrás", seiteVon: function (a, b) { return "Página " + a + " de " + b; },
      fastFertig: "Casi listo", weiter: "Siguiente", ueberspringen: "Omitir",
      pflicht: "<b>*</b> Pregunta obligatoria. Puede omitir las preguntas sin asterisco.",
      sumTitel: "Su estimación sin compromiso", ihreAngaben: "Sus datos", zusatz: "Servicios adicionales", kosten: "Desglose de costes",
      gesamt: "Total (estimación)", richtwert: "Estimación", ca: "aprox.", weiterAnfrage: "Continuar con la solicitud",
      lName: "Su nombre", lEmail: "Su correo electrónico", lTel: "Su número de teléfono", leadH: "Casi listo — ¿dónde le respondemos?",
      consent: "Acepto que mis datos se guarden y traten para gestionar mi solicitud.",
      dsMehr: function (a) { return "Más información en nuestra " + a + "."; }, absenden: "Enviar solicitud",
      danke: "¡Muchas gracias!", doneTermin: "La fecha solicitada está reservada para usted. La confirmaremos en breve por teléfono o mensaje.",
      doneAnfrage: "Hemos recibido su solicitud. Le responderemos en un plazo de 24 horas con una oferta concreta.",
      alertFelder: "Por favor, complete todos los campos y dé su consentimiento.", sendet: "Enviando …",
      errH: "Algo no ha funcionado.", errText: "Sus datos siguen aquí. Por favor, inténtelo de nuevo",
      errTel: " o llámenos — tomamos su solicitud al momento.", erneut: "Enviar de nuevo", perMail: "Por correo", anrufen: "¿Prefiere llamar?" },
    tr: { name: "Türkçe", loc: "tr-TR", sprache: "Dil",
      wn: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
      mn: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
      wkM: ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"], wkS: ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"],
      pausiert: "Şu anda yeni talep kabul etmiyoruz.",
      wlStart: "İstediğiniz tarih dolu mu? Bekleme listesine yazılın",
      wlDone: function (d) { return "<b>" + d + " için bekleme listesindesiniz.</b> Tarih boşalırsa size haber veririz."; },
      wlTap: "Takvimde istediğiniz <b>kırmızı</b> güne dokunun.", abbr: "İptal", wlFor: "Bekleme listesi: ", bei: " · ",
      kontakt: "E-posta veya telefon numarası", wlConsent: "Bilgilerimin bekleme listesi için saklanmasını kabul ediyorum.",
      ds: "Gizlilik politikası", ds2: "gizlilik politikası", wlBtn: "Bekleme listesine yazıl", wlZust: "Lütfen bilgilerinizin saklanmasını onaylayın.",
      wlKontakt: "Lütfen bir e-posta adresi veya telefon numarası girin.", wlLaeuft: "Kaydediliyor …", fehlerAllg: "İşlem başarısız oldu.", offline: "Sunucuya ulaşılamıyor.",
      hTop: "En çok talep gören kombinasyonumuz — lütfen erken sorun.", hBeliebt: "Yoğun bir dönem. Tarihler hızla doluyor.",
      hRuhig: "Sakin bir dönem — en uygun fiyatlı tarih.", hGut: "Boş tarih bulma şansınız yüksek.",
      bUnter: function (l, p) { return "<b>Bütçeniz tahmini tutarın altında.</b> Belirttiğiniz bütçe: " + l + ", mevcut seçim: " + p + ". Sorun değil — teklifimizde en çok nereden tasarruf edebileceğinizi gösteririz (menü tarzı, haftanın günü, içecek paketi)."; },
      bLuft: function (p) { return "<b>Hâlâ pay var.</b> Bütçeniz tahmini tutarın (" + p + ") üzerinde — teklifimizde memnuniyetle ekstralar öneririz."; },
      location: "Mekân", proGast: " / kişi", aufAnfrage: "talep üzerine", datumWaehlen: "Tarih seçin", vergeben: "dolu", vorbei: "geçti", frei: "boş",
      vorMonat: "Önceki ay", naechMonat: "Sonraki ay", jahr: "Yıl", legBusy: "dolu",
      tmSetup: "Online rezervasyon şu anda kuruluyor. Lütfen doğrudan bizimle iletişime geçin.",
      person: "Kişi", personWeg: "Kişiyi kaldır", fuerWen: "Kimin için?", nameFrei: "İsim (isteğe bağlı)", wasDarf: "Ne istersiniz?", min: "dk",
      beiWem: "Kiminle?", egal: "Fark etmez", ersterFrei: "ilk boş saat", nichtBuchbar: ", rezervasyon yapılamaz", welcherTag: "Hangi gün?",
      frueher: "Önceki günler", spaeter: "Sonraki günler", uhrzeit: "Saat", laden: "Boş saatler yükleniyor …",
      ladeFehler: "Boş saatler şu anda yüklenemedi. Lütfen güne tekrar dokunun.",
      nichtsFrei: function (w) { return "Bu gün" + (w ? " (" + w + ")" : "") + " boş saat kalmadı. Lütfen başka bir gün seçin."; },
      wlTag: "Bu gün için bekleme listesine yazıl", ihrTermin: "Randevunuz: ", weiterePerson: "+ Başka bir kişi için randevu", zurueckK: "Geri", verbindlich: function (tel) { return "Rezervasyonunuz bağlayıcıdır. Gelemeyecekseniz lütfen bizi arayın" + (tel ? ": " + tel : "") + "."; },
      uhr: function (z) { return "saat " + z; },
      gruenFrei: "Yeşil işaretli günler hâlâ boş.", inkl: "dahil",
      errVergeben: "Bu saat az önce başka biri tarafından alındı. Lütfen başka bir saat seçin.",
      errTermin: "Lütfen her kişi için hizmet, gün ve saat seçin.", errLeer: "Lütfen bu alanı doldurun.",
      ihreAnfrage: "Talebiniz", fertig: "Tamam", zurueck: "← Geri", seiteVon: function (a, b) { return "Sayfa " + a + " / " + b; },
      fastFertig: "Neredeyse bitti", weiter: "İleri", ueberspringen: "Atla",
      pflicht: "<b>*</b> Zorunlu soru. Yıldızsız soruları atlayabilirsiniz.",
      sumTitel: "Bağlayıcı olmayan tahmininiz", ihreAngaben: "Bilgileriniz", zusatz: "Ek hizmetler", kosten: "Maliyet dökümü",
      gesamt: "Toplam (tahmini)", richtwert: "Tahmini tutar", ca: "yakl.", weiterAnfrage: "Talebe devam et",
      lName: "Adınız", lEmail: "E-postanız", lTel: "Telefon numaranız", leadH: "Neredeyse bitti — size nereden dönelim?",
      consent: "Bilgilerimin talebimin işlenmesi amacıyla saklanmasını ve işlenmesini kabul ediyorum.",
      dsMehr: function (a) { return "Ayrıntılar: " + a + "."; }, absenden: "Talebi gönder",
      danke: "Çok teşekkürler!", doneTermin: "İstediğiniz tarih sizin için ayrıldı. Kısa süre içinde telefon veya mesajla onaylayacağız.",
      doneAnfrage: "Talebiniz alındı. 24 saat içinde size somut bir teklifle dönüş yapacağız.",
      alertFelder: "Lütfen tüm alanları doldurun ve onay verin.", sendet: "Gönderiliyor …",
      errH: "Bir sorun oluştu.", errText: "Bilgileriniz hâlâ burada. Lütfen tekrar deneyin",
      errTel: " veya bizi arayın — talebinizi hemen alırız.", erneut: "Tekrar gönder", perMail: "E-postayla", anrufen: "Aramayı mı tercih edersiniz?" }
  };
  /* Termine, die länger dauern: Haarlänge und „erst ansehen, dann Termin“ */
  (function () {
    var X = {
      de: { haarFrage: "Wie ist Ihr Haar?", haar: ["Kurz", "Mittel", "Lang", "Sehr dick oder sehr lang"], haarKurz: "Haar", bertLabel: "nach Beratung",
        bertH: "Erst ansehen, dann Termin. ", bertText: "Für diese Leistung sehen wir uns Ihr Haar vorher an, damit genug Zeit eingeplant ist. Schicken Sie bis zu drei Fotos und Ihren Wunschtag. Sie bekommen dann einen Terminvorschlag.",
        fotoLbl: "Fotos von Ihrem Haar", fotoKnopf: "+ Foto hinzufügen", fotoHinweis: "Am besten bei Tageslicht, von hinten und von der Seite.", fotoWeg: "Foto entfernen",
        wunschtag: "Wunschtag (freiwillig)", tageszeit: "Wann passt es Ihnen meistens?", tz: { vormittags: "Vormittags", nachmittags: "Nachmittags", abends: "Abends" }, bertKurz: "Beratung",
        doneBeratung: "Ihre Anfrage ist eingegangen. Wir sehen uns die Angaben an und schicken Ihnen einen Terminvorschlag." },
      en: { haarFrage: "What is your hair like?", haar: ["Short", "Medium", "Long", "Very thick or very long"], haarKurz: "Hair", bertLabel: "after consultation",
        bertH: "We look first, then book. ", bertText: "For this service we take a look at your hair beforehand so that enough time is planned. Send up to three photos and your preferred day. You will then receive a suggested appointment.",
        fotoLbl: "Photos of your hair", fotoKnopf: "+ Add photo", fotoHinweis: "Ideally in daylight, from behind and from the side.", fotoWeg: "Remove photo",
        wunschtag: "Preferred day (optional)", tageszeit: "When usually suits you?", tz: { vormittags: "Mornings", nachmittags: "Afternoons", abends: "Evenings" }, bertKurz: "Consultation",
        doneBeratung: "Your request has been received. We will look at your details and send you a suggested appointment." },
      sq: { haarFrage: "Si janë flokët tuaj?", haar: ["Të shkurtër", "Mesatarë", "Të gjatë", "Shumë të dendur ose shumë të gjatë"], haarKurz: "Flokët", bertLabel: "pas këshillimit",
        bertH: "Së pari shikojmë, pastaj termini. ", bertText: "Për këtë shërbim i shikojmë flokët tuaj më parë, që të planifikojmë kohë të mjaftueshme. Dërgoni deri në tre foto dhe ditën që dëshironi. Pastaj do të merrni një propozim për termin.",
        fotoLbl: "Foto të flokëve tuaj", fotoKnopf: "+ Shto foto", fotoHinweis: "Më mirë në dritë dite, nga pas dhe nga anash.", fotoWeg: "Hiq foton",
        wunschtag: "Dita e dëshiruar (nuk është e detyrueshme)", tageszeit: "Kur ju përshtatet zakonisht?", tz: { vormittags: "Paradite", nachmittags: "Pasdite", abends: "Mbrëmje" }, bertKurz: "Këshillim",
        doneBeratung: "Kërkesa juaj u mor. Do t'i shikojmë të dhënat dhe do t'ju dërgojmë një propozim për termin." },
      fr: { haarFrage: "Comment sont vos cheveux ?", haar: ["Courts", "Mi-longs", "Longs", "Très épais ou très longs"], haarKurz: "Cheveux", bertLabel: "après conseil",
        bertH: "D’abord un regard, puis le rendez-vous. ", bertText: "Pour cette prestation, nous regardons vos cheveux à l’avance afin de prévoir assez de temps. Envoyez jusqu’à trois photos et votre jour souhaité. Vous recevrez ensuite une proposition de rendez-vous.",
        fotoLbl: "Photos de vos cheveux", fotoKnopf: "+ Ajouter une photo", fotoHinweis: "Idéalement à la lumière du jour, de dos et de côté.", fotoWeg: "Retirer la photo",
        wunschtag: "Jour souhaité (facultatif)", tageszeit: "Quand cela vous convient-il le plus souvent ?", tz: { vormittags: "Le matin", nachmittags: "L’après-midi", abends: "Le soir" }, bertKurz: "Conseil",
        doneBeratung: "Votre demande a bien été reçue. Nous examinons vos informations et vous envoyons une proposition de rendez-vous." },
      it: { haarFrage: "Come sono i Suoi capelli?", haar: ["Corti", "Medi", "Lunghi", "Molto folti o molto lunghi"], haarKurz: "Capelli", bertLabel: "dopo consulenza",
        bertH: "Prima guardiamo, poi l’appuntamento. ", bertText: "Per questo servizio guardiamo prima i Suoi capelli, così da prevedere abbastanza tempo. Invii fino a tre foto e il giorno desiderato. Riceverà poi una proposta di appuntamento.",
        fotoLbl: "Foto dei Suoi capelli", fotoKnopf: "+ Aggiungi foto", fotoHinweis: "Meglio alla luce del giorno, da dietro e di lato.", fotoWeg: "Rimuovi foto",
        wunschtag: "Giorno desiderato (facoltativo)", tageszeit: "Quando Le va bene di solito?", tz: { vormittags: "Mattina", nachmittags: "Pomeriggio", abends: "Sera" }, bertKurz: "Consulenza",
        doneBeratung: "La Sua richiesta è arrivata. Guardiamo i dati e Le inviamo una proposta di appuntamento." },
      es: { haarFrage: "¿Cómo es su cabello?", haar: ["Corto", "Media melena", "Largo", "Muy grueso o muy largo"], haarKurz: "Cabello", bertLabel: "tras consulta",
        bertH: "Primero lo vemos, luego la cita. ", bertText: "Para este servicio miramos antes su cabello para reservar el tiempo suficiente. Envíe hasta tres fotos y su día preferido. Después recibirá una propuesta de cita.",
        fotoLbl: "Fotos de su cabello", fotoKnopf: "+ Añadir foto", fotoHinweis: "Mejor con luz de día, por detrás y de lado.", fotoWeg: "Quitar foto",
        wunschtag: "Día preferido (opcional)", tageszeit: "¿Cuándo le viene mejor normalmente?", tz: { vormittags: "Mañanas", nachmittags: "Tardes", abends: "Noches" }, bertKurz: "Consulta",
        doneBeratung: "Hemos recibido su solicitud. Revisaremos los datos y le enviaremos una propuesta de cita." },
      tr: { haarFrage: "Saçınız nasıl?", haar: ["Kısa", "Orta", "Uzun", "Çok gür veya çok uzun"], haarKurz: "Saç", bertLabel: "danışmadan sonra",
        bertH: "Önce bakarız, sonra randevu. ", bertText: "Bu hizmet için yeterli zaman ayırabilmek adına saçınıza önceden bakıyoruz. En fazla üç fotoğraf ve istediğiniz günü gönderin. Ardından bir randevu önerisi alacaksınız.",
        fotoLbl: "Saçınızın fotoğrafları", fotoKnopf: "+ Fotoğraf ekle", fotoHinweis: "En iyisi gün ışığında, arkadan ve yandan.", fotoWeg: "Fotoğrafı kaldır",
        wunschtag: "İstenen gün (isteğe bağlı)", tageszeit: "Genellikle ne zaman uygunsunuz?", tz: { vormittags: "Öğleden önce", nachmittags: "Öğleden sonra", abends: "Akşam" }, bertKurz: "Danışma",
        doneBeratung: "Talebiniz alındı. Bilgilere bakıp size bir randevu önerisi göndereceğiz." }
    };
    Object.keys(X).forEach(function (l) { if (D[l]) for (var k in X[l]) D[l][k] = X[l][k]; });
    /* Damen, Herren, Kinder (Funktion „damen_herren“, sql/65) */
    var G = {
      de: ["Für wen ist der Termin?", { damen: "Damen", herren: "Herren", kinder: "Kinder" }],
      en: ["Who is the appointment for?", { damen: "Women", herren: "Men", kinder: "Children" }],
      sq: ["Për kë është termini?", { damen: "Gra", herren: "Burra", kinder: "Fëmijë" }],
      fr: ["Pour qui est le rendez-vous ?", { damen: "Femmes", herren: "Hommes", kinder: "Enfants" }],
      it: ["Per chi è l’appuntamento?", { damen: "Donna", herren: "Uomo", kinder: "Bambini" }],
      es: ["¿Para quién es la cita?", { damen: "Mujer", herren: "Hombre", kinder: "Niños" }],
      tr: ["Randevu kimin için?", { damen: "Kadın", herren: "Erkek", kinder: "Çocuk" }]
    };
    Object.keys(G).forEach(function (l) { if (D[l]) { D[l].gruppeFrage = G[l][0]; D[l].gruppe = G[l][1]; } });
    var WA = { de: "Die Antwort bekommen Sie per WhatsApp an ", en: "You will receive the reply via WhatsApp at ", sq: "Përgjigjen do ta merrni në WhatsApp në numrin ", fr: "Vous recevrez la réponse par WhatsApp au ", it: "Riceverà la risposta su WhatsApp al numero ", es: "Recibirá la respuesta por WhatsApp en el ", tr: "Yanıtı WhatsApp üzerinden şu numaraya alacaksınız: " };
    Object.keys(WA).forEach(function (l) { if (D[l]) D[l].doneWa = function (n) { return WA[l] + n + (l === "tr" ? "" : "."); }; });
  })();
  var LANG = "de", ROH = false, BASIS = "de";
  function t(k) { var v = D[ROH ? BASIS : LANG] || D.de; return v[k] != null ? v[k] : D.de[k]; }
  /* Vernetzen: Partner des Betriebs und Zustimmung zur Weitergabe */
  var PT = {
    de: { h: "Unsere Partner", sub: "Mit diesen Betrieben arbeiten wir gern zusammen.", an: "Anfragen", kurz: "Unsere Partner:", weiter: "Meine Anfrage darf an Partnerbetriebe weitergegeben werden, wenn sie etwas anbieten, das hier fehlt (z. B. Catering oder Blumen). Freiwillig." },
    en: { h: "Our partners", sub: "Businesses we like to work with.", an: "Enquire", kurz: "Our partners:", weiter: "My enquiry may be passed on to partner businesses if they offer something not available here (e.g. catering or flowers). Optional." },
    sq: { h: "Partnerët tanë", sub: "Biznese me të cilët punojmë me kënaqësi.", an: "Kërko ofertë", kurz: "Partnerët tanë:", weiter: "Kërkesa ime mund t'u kalohet bizneseve partnere, nëse ofrojnë diçka që mungon këtu (p.sh. catering ose lule). Opsionale." },
    fr: { h: "Nos partenaires", sub: "Les entreprises avec lesquelles nous aimons travailler.", an: "Demander", kurz: "Nos partenaires :", weiter: "Ma demande peut être transmise à des entreprises partenaires si elles proposent quelque chose qui manque ici (p. ex. traiteur ou fleurs). Facultatif." },
    it: { h: "I nostri partner", sub: "Le attività con cui lavoriamo volentieri.", an: "Richiedi", kurz: "I nostri partner:", weiter: "La mia richiesta può essere inoltrata ad attività partner, se offrono qualcosa che qui manca (ad es. catering o fiori). Facoltativo." },
    es: { h: "Nuestros socios", sub: "Empresas con las que nos gusta trabajar.", an: "Solicitar", kurz: "Nuestros socios:", weiter: "Mi solicitud puede enviarse a empresas asociadas si ofrecen algo que aquí falta (p. ej. catering o flores). Opcional." },
    tr: { h: "Partnerlerimiz", sub: "Birlikte çalışmaktan memnun olduğumuz işletmeler.", an: "Talep et", kurz: "Partnerlerimiz:", weiter: "Burada olmayan bir şey sunuyorlarsa (ör. catering veya çiçek) talebim partner işletmelere iletilebilir. İsteğe bağlı." }
  };
  function tp(k) { return (PT[LANG] || PT.de)[k]; }
  /* Gemeinsame Pakete mit Partnern */
  var PKT = {
    de: { h: "Gleich mit anfragen", nein: "Nein danke, nur hier anfragen", mit: "Ihre Anfrage geht dann auch an:" },
    en: { h: "Enquire together", nein: "No thanks, just enquire here", mit: "Your enquiry will also go to:" },
    sq: { h: "Kërkoni njëherësh", nein: "Jo, faleminderit, vetëm këtu", mit: "Kërkesa juaj shkon edhe te:" },
    fr: { h: "Demander en même temps", nein: "Non merci, seulement ici", mit: "Votre demande sera aussi envoyée à :" },
    it: { h: "Richiedi insieme", nein: "No grazie, solo qui", mit: "La tua richiesta andrà anche a:" },
    es: { h: "Solicitar a la vez", nein: "No, gracias, solo aquí", mit: "Tu solicitud también llegará a:" },
    tr: { h: "Birlikte talep et", nein: "Hayır, teşekkürler, sadece burada", mit: "Talebiniz ayrıca şunlara gider:" }
  };
  function tpk(k) { return (PKT[LANG] || PKT.de)[k]; }
  /* Ausgebucht? Partner, die an dem Tag frei sind. Antwortzeit-Abzeichen. */
  var FZ = {
    de: { h: "Am {d} sind wir leider schon ausgebucht.", sub: "Diese Partner sind an dem Tag noch frei:", keine: "Auch unsere Partner sind an dem Tag belegt. Wählen Sie gern einen anderen Tag.", stunde: "Antwortet meist innerhalb einer Stunde", "3std": "Antwortet meist innerhalb von 3 Stunden", tag: "Antwortet meist am selben Tag" },
    en: { h: "Sorry, we are already booked on {d}.", sub: "These partners are still free that day:", keine: "Our partners are booked that day too. Feel free to choose another day.", stunde: "Usually replies within an hour", "3std": "Usually replies within 3 hours", tag: "Usually replies the same day" },
    sq: { h: "Më {d} jemi fatkeqësisht të zënë.", sub: "Këta partnerë janë ende të lirë atë ditë:", keine: "Edhe partnerët tanë janë të zënë atë ditë. Zgjidhni një ditë tjetër.", stunde: "Zakonisht përgjigjet brenda një ore", "3std": "Zakonisht përgjigjet brenda 3 orëve", tag: "Zakonisht përgjigjet të njëjtën ditë" },
    fr: { h: "Désolés, nous sommes déjà complets le {d}.", sub: "Ces partenaires sont encore libres ce jour-là :", keine: "Nos partenaires sont aussi pris ce jour-là. Choisissez volontiers un autre jour.", stunde: "Répond généralement en moins d’une heure", "3std": "Répond généralement en moins de 3 heures", tag: "Répond généralement le jour même" },
    it: { h: "Ci dispiace, il {d} siamo già al completo.", sub: "Questi partner sono ancora liberi quel giorno:", keine: "Anche i nostri partner sono occupati quel giorno. Scelga pure un altro giorno.", stunde: "Di solito risponde entro un’ora", "3std": "Di solito risponde entro 3 ore", tag: "Di solito risponde in giornata" },
    es: { h: "Lo sentimos, el {d} ya estamos completos.", sub: "Estos socios aún están libres ese día:", keine: "Nuestros socios también están ocupados ese día. Elija otro día si lo desea.", stunde: "Suele responder en menos de una hora", "3std": "Suele responder en menos de 3 horas", tag: "Suele responder el mismo día" },
    tr: { h: "Maalesef {d} tarihinde doluyuz.", sub: "Bu partnerler o gün hâlâ boş:", keine: "Partnerlerimiz de o gün dolu. Başka bir gün seçebilirsiniz.", stunde: "Genellikle bir saat içinde yanıt verir", "3std": "Genellikle 3 saat içinde yanıt verir", tag: "Genellikle aynı gün yanıt verir" }
  };
  function tfz(k) { return (FZ[LANG] || FZ.de)[k]; }
  var TAG_IN = (function () { try { var x = String(new URLSearchParams(location.search).get("tag") || ""); return /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : ""; } catch (e) { return ""; } })();
  /* Kam der Gast über „Unsere Partner“ eines anderen Betriebs? (?von=slug) */
  var VON = (function () { try { return String(new URLSearchParams(location.search).get("von") || "").slice(0, 80); } catch (e) { return ""; } })();
  /* Text des Betriebs in der Sprache des Gastes. ROH = für die Anfrage an den Betrieb: immer Deutsch. */
  function TR(o, f) {
    if (!o || typeof o !== "object") return "";
    if (!ROH && LANG !== BASIS && o.tr && o.tr[LANG] && o.tr[LANG][f]) return o.tr[LANG][f];
    return o[f];
  }

  function ladeSchrift(f) {
    if (!f) return;
    var id = "cz-f-" + f.replace(/\W+/g, "");
    if (document.getElementById(id)) return;
    var l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    var fam = encodeURIComponent(f).replace(/%20/g, "+");
    l.href = "https://fonts.bunny.net/css2?family=" + fam + ":wght@400;600&display=swap";
    l.onerror = function () { this.onerror = null; this.href = "https://fonts.bunny.net/css2?family=" + fam + "&display=swap"; };
    document.head.appendChild(l);
  }

  /* Ist eine Farbe dunkel? Entscheidet, ob Schrift und Felder hell werden. */
  function istDunkel(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
    if (!m) return false;
    return (0.2126 * parseInt(m[1], 16) + 0.7152 * parseInt(m[2], 16) + 0.0722 * parseInt(m[3], 16)) < 140;
  }

  /* Eigenes Design: Hausfarben, Hintergrundbild und Schrift des Kunden. Der
     Konfigurator legt sie unter theme.eigen ab; hier werden daraus dieselben
     Werte wie bei einem Stil, damit der Gast auf der Kundenwebsite genau das
     sieht, was in der Vorschau stand. */
  function eigenStil(basis, ei) {
    var bild = ei.bild ? String(ei.bild).replace(/["'\\\s]/g, "") : "";
    var flaeche = ei.flaeche || "#f4f1ea";
    var dunkel = !!bild || istDunkel(flaeche);
    var knopf = ei.knopf || basis.accent || "#1f8a5b";
    return {
      eigenBild: bild,
      flach: bild ? null : flaeche,
      hell: !dunkel,
      ink: dunkel ? "#ffffff" : "#221f18",
      ink2: dunkel ? "rgba(255,255,255,.8)" : "#6b6350",
      line: dunkel ? "rgba(255,255,255,.3)" : "#e0d9c9",
      surface: dunkel ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.92)",
      field: dunkel ? "rgba(255,255,255,.17)" : "#ffffff",
      accent: knopf,
      aink: istDunkel(knopf) ? "#ffffff" : "#1a1710",
      radius: basis.radius != null ? basis.radius : 20,
      brad: basis.brad != null ? basis.brad : 999
    };
  }

  /* Widget-Vergleich: Läuft für dieses Widget ein Vergleich, sieht jeder zweite Besucher
     die andere Variante — und behält sie beim nächsten Besuch. Am Einbau-Code ändert sich
     nichts. Beide Anfragen laufen parallel, damit der Normalfall keine Zeit verliert. */
  var gemerkt = null;   // Vergleichs-Variante nur für diesen Seitenaufruf

  function configHolen(slug) {
    return fetch(API + "/config?widget=" + encodeURIComponent(slug))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }

  var ersteConfig = VORSCHAU ? null : configHolen(gemerkt || mountId);

  if (VORSCHAU) { boot(window.CZ_VORSCHAU_CONFIG); } else {
  fetch(API + "/vergleich?slug=" + encodeURIComponent(mountId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var v = j && j.vergleich;
      if (!v) {
        return gemerkt ? configHolen(mountId).then(function (c) { widget = mountId; return c; }) : ersteConfig;
      }
      if (gemerkt === v.slug_a || gemerkt === v.slug_b) { widget = gemerkt; return ersteConfig; }
      var neu = Math.random() < 0.5 ? v.slug_a : v.slug_b;
      widget = neu;
      return neu === (gemerkt || mountId) ? ersteConfig : configHolen(neu);
    })
    .catch(function () { return ersteConfig; })
    .then(function (cfg) { if (cfg) boot(cfg); })
    .catch(function () { /* Seite nie stören */ });
  }

  function boot(cfg) {
    /* Grundsprache = die Sprache, in der der Betrieb seine Fragen schreibt. */
    /* Das Formular ist immer auf Deutsch. Die Übersetzungen bleiben im Code, falls später wieder gewünscht. */
    BASIS = "de";
    var SPR = ["de"];
    LANG = "de";
    var host = document.querySelector('[data-cz-mount="' + mountId + '"]');
    if (!host) { host = document.createElement("div"); me.parentNode.insertBefore(host, me); }
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    /* Auftrags-Betriebe (Food Truck & Co.): Anfahrt aus der PLZ, Hinweis unter den Mindestwerten, Richtpreis von-bis.
       Nur Hinweise: der Kunde kann immer absenden. */
    var AU = cfg.auftrag || null, AU_T = null, AU_PLZ = "";
    var AU_S = Math.random().toString(36).slice(2) + Date.now().toString(36), AU_Q = {}, AU_V = {}, AU_CSS = false;
    function auStep(key) { for (var i = 0; i < steps.length; i++) if (steps[i].key === key) return steps[i]; return null; }
    function auAdr(s) { return !!(AU && s && (s.adresse || s.key === "ort")); }
    function auEl(sel) { return (root.querySelector ? root : document).querySelector(sel); }
    function auKm(key, v) {
      if (!auAdr(auStep(key))) return;
      auVorschlag(key, v);
      if (st.a.__kmFix && st.a.__kmFix === v) return;
      var m = String(v || "").match(/\b\d{5}\b/), plz = m ? m[0] : "";
      if (plz === AU_PLZ) return;
      AU_PLZ = plz; clearTimeout(AU_T);
      if (!plz) { delete st.a.__km; auKmZeigen(); return; }
      AU_T = setTimeout(function () {
        fetch(API + "/auftrag?aktion=km&w=" + encodeURIComponent(widget) + "&plz=" + plz).then(function (r) { return r.json(); }).then(function (j) {
          if (plz !== AU_PLZ) return;
          if (j && j.ok && j.km != null) st.a.__km = j.km; else delete st.a.__km;
          auKmZeigen();
        }).catch(function () {});
      }, 450);
    }
    /* Adressvorschläge während der Eingabe. Die Anfrage geht an unseren Server, nicht direkt an den Kartendienst. */
    function auVorschlag(key, v) {
      var q = String(v || "").trim();
      clearTimeout(AU_Q[key]);
      if (q.length < 4 || q === st.a.__kmFix) { auListe(key, []); return; }
      AU_Q[key] = setTimeout(function () {
        fetch(API + "/auftrag?aktion=adresse&w=" + encodeURIComponent(widget) + "&s=" + AU_S + "&q=" + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
          var ta = auEl('[data-text="' + key + '"]');
          if (!ta || ta.value.trim() !== q) return;
          auListe(key, (j && j.ok && j.liste) || [], j && j.quelle);
        }).catch(function () {});
      }, 320);
    }
    function auListe(key, l, quelle) {
      var box = auEl('[data-auvor="' + key + '"]'); if (!box) return;
      AU_V[key] = l;
      if (!AU_CSS) {
        AU_CSS = true;
        var cs = document.createElement("style");
        cs.textContent = ".au-vor{display:flex;flex-direction:column;gap:6px;margin:8px 0 0}.au-vor:empty{display:none}"
          + ".au-vor button{display:block;width:100%;text-align:left;font:inherit;font-size:15px;line-height:1.35;padding:12px 14px;min-height:48px;border-radius:12px;border:1px solid rgba(0,0,0,.16);background:rgba(255,255,255,.9);color:#222;cursor:pointer}"
          + ".au-vor button:hover,.au-vor button:focus-visible{border-color:currentColor}.au-vor small{display:block;font-size:11px;opacity:.65;padding:0 2px}";
        root.appendChild(cs);
      }
      box.innerHTML = l.length ? l.map(function (x, i) { return '<button type="button" data-auv="' + esc(key) + '" data-aui="' + i + '">' + esc(x.t) + "</button>"; }).join("")
        + (quelle === "osm" ? "<small>Adressen: © OpenStreetMap-Mitwirkende</small>" : "") : "";
    }
    function auWahl(key, i) {
      var x = (AU_V[key] || [])[i]; if (!x) return;
      function setzen(t, km) {
        var ta = auEl('[data-text="' + key + '"]');
        st.a[key] = t; st.a.__kmFix = t; if (ta) ta.value = t;
        var m = String(t).match(/\b\d{5}\b/); if (m) AU_PLZ = m[0];
        if (km != null) st.a.__km = km;
        auListe(key, []); auKmZeigen();
      }
      setzen(x.t, x.km);
      if (x.id) fetch(API + "/auftrag?aktion=ort&w=" + encodeURIComponent(widget) + "&s=" + AU_S + "&id=" + encodeURIComponent(x.id)).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok) setzen(j.t || x.t, j.km); }).catch(function () {});
    }
    root.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("[data-auv]"); if (!b) return;
      e.preventDefault(); auWahl(b.getAttribute("data-auv"), +b.getAttribute("data-aui"));
    });
    function auZuWeit() { return !!(AU && AU.maxKm && st.a.__km > AU.maxKm); }
    function auKmText() {
      if (st.a.__km == null) return "";
      return "Anfahrt ca. " + st.a.__km + " km" + (auZuWeit() ? ". Das liegt außerhalb unseres üblichen Gebiets (bis " + AU.maxKm + " km). Sie können trotzdem anfragen." : "");
    }
    function auKmZeigen() { var el = auEl("[data-aukm]"); if (el) { el.textContent = auKmText(); el.style.fontWeight = auZuWeit() ? "600" : ""; } }
    function auHinweis(s) {
      if (!AU) return "";
      if (auAdr(s)) return '<div class="au-vor" data-auvor="' + esc(s.key) + '"></div><div class="hint" data-aukm style="' + (auZuWeit() ? "font-weight:600" : "") + '">' + esc(auKmText()) + "</div>";
      var v = st.a[s.key];
      if (v && v.gaeste && AU.minPersonen && v.gaeste < AU.minPersonen)
        return '<div class="hint" style="font-weight:600">Für Gruppen unter ' + AU.minPersonen + " Personen gilt bei uns ein Mindestumsatz" + (AU.minUmsatz ? " von " + eur(AU.minUmsatz) : "") + ". Sie können trotzdem anfragen.</div>";
      return "";
    }
    var _auFrage = frageHTML;
    frageHTML = function (s, m) { return _auFrage(s, m) + auHinweis(s); };

    // Der Betrieb hat das Widget pausiert — freundlicher Hinweis statt leerer Stelle.
    if (cfg.pausiert) {
      var ps = document.createElement("style");
      ps.textContent = ":host{all:initial;display:block}"
        + '.czp{font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#f7f4ec;border:1px solid #e2dac7;'
        + "border-radius:18px;padding:26px 24px;text-align:center;color:#3a352a;font-size:15px;line-height:1.6;box-sizing:border-box}";
      root.appendChild(ps);
      var pd = document.createElement("div");
      pd.className = "czp";
      pd.textContent = (LANG === BASIS ? cfg.pausiert_text : ((cfg.tr && cfg.tr[LANG]) || {}).pausiert_text) || t("pausiert");
      root.appendChild(pd);
      return;
    }

    var theme = cfg.theme || {};
    var skin = SKINS[theme.skin] || SKINS["glass-milk"];
    var eigen = theme.eigen || null;
    if (eigen && (eigen.flaeche || eigen.bild || eigen.knopf || eigen.schrift)) skin = eigenStil(skin, eigen);
    var accent = (eigen && eigen.knopf) || theme.accent || skin.accent;
    /* Schrift auf dem Knopf richtet sich nach der Knopffarbe: dunkler Knopf,
       helle Schrift. Sonst verschwand „Weiter“ bei dunklem Akzent auf Stilen,
       die für helle Akzente gedacht sind (z. B. glass-minimal). */
    var aink = /^#?[0-9a-f]{6}$/i.test(String(accent || "")) ? (istDunkel(accent) ? "#fff" : "#1d1b16") : (skin.aink || "#fff");
    var flaeche = skin.eigenBild
      ? 'linear-gradient(rgba(12,10,6,.42),rgba(12,10,6,.58)),url("' + skin.eigenBild + '")'
      : (skin.foto
        ? 'linear-gradient(rgba(20,32,26,.5),rgba(20,32,26,.66)),url("https://clickzauber.de/assets/wedding-green-900.jpg")'
        : (skin.flach ? "linear-gradient(" + skin.flach + "," + skin.flach + ")" : MOOD[skin.mood]));
    var istGlas = !skin.flach;
    var rNum = (theme.radius != null ? theme.radius : skin.radius);
    var radius = rNum + "px";
    var brad = skin.brad + "px";
    /* Innenradien folgen dem Stil: 0 bleibt 0 (Swiss, Brutalism), sonst etwas kleiner als die Hülle */
    var rIn  = Math.max(0, Math.round(rNum * 0.64)) + "px";   // Optionen, Auswahlfelder
    var rIn2 = Math.max(0, Math.round(rNum * 0.5))  + "px";   // Eingaben, Kalendertage
    var fq = (eigen && eigen.schrift) || theme.font || "system-ui";
    var fa = (eigen && eigen.schrift) || theme.fontAnswer || fq;
    var sizeQ = (theme.sizeQ || 21) + "px";
    var sizeA = (theme.sizeA || 15) + "px";
    ladeSchrift(theme.font); ladeSchrift(theme.fontAnswer);
    if (eigen && eigen.schrift) ladeSchrift(eigen.schrift);

    var surface = skin.surface || (skin.hell ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.16)");
    var field = skin.field || (skin.hell ? "#fff" : "rgba(255,255,255,.16)");

    var style = document.createElement("style");
    style.textContent =
      ":host{all:initial;display:block;-webkit-text-size-adjust:100%;text-size-adjust:100%}" +
      '.cz{--a:' + accent + ';--ai:' + aink + ';--ink:' + skin.ink + ';--ink2:' + skin.ink2 + ';--line:' + skin.line + ';--sf:' + surface + ';--fd:' + field + ';' +
        '--fq:"' + fq + '",system-ui,sans-serif;--fa:"' + fa + '",system-ui,sans-serif;--ue:44px;' +
        "font-family:var(--fa);max-width:600px;margin:0 auto;box-sizing:border-box;position:relative;" +
        "border-radius:" + radius + ";background-image:" + (skin.muster ? skin.muster + "," + flaeche : flaeche) + ";background-size:" + (skin.musterGr ? skin.musterGr + ",cover" : "cover") + ";background-position:center;" +
        "padding:18px 22px;display:flex;flex-direction:column;justify-content:center;min-height:470px;box-shadow:" + (skin.schatten || "0 30px 64px -32px rgba(20,15,8,.6)") + "}" +
      ".cz *{box-sizing:border-box}" +
      ".cz .lg{display:flex;justify-content:center;padding:2px 0 10px}.cz .lg img{display:block;height:56px;width:auto;max-width:190px;object-fit:contain}" +
      ".cz.intro>*{opacity:0}.cz.intro.intro-da>*{opacity:1;transition:opacity .5s .3s}.cz.intro.intro-da>.lg{transition:none;opacity:0}" +
      ":host{position:relative}.cz-intro{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:" + (skin.flach && !skin.hell ? skin.flach : "var(--fd,#fbf8f3)") + ";border-radius:inherit;transition:background-color .6s .25s}" +   /* dunkle Stile (z. B. concierge): Vorspann dunkel, sonst verschwindet ein helles Logo */
      ".cz-intro img{display:block;width:auto;height:auto;max-width:min(70%,300px);max-height:45%;object-fit:contain;transform-origin:center;animation:czIn .6s cubic-bezier(.2,.9,.3,1.2) both;transition:transform .75s cubic-bezier(.65,0,.25,1)}" +
      ".cz-intro.weg{background:transparent;pointer-events:none}" +
      "@keyframes czIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}" +
      ".cz .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;color:" + (skin.flach ? "var(--ink)" : "#fff") + ";margin-bottom:auto;padding:4px 4px 24px}" +
      ".cz .brand{font-family:var(--fq);font-size:20px;line-height:1.1" + (skin.flach ? "" : ";text-shadow:0 2px 12px rgba(0,0,0,.45)") + "}" +
      ".cz .brand small{display:block;font-size:9px;letter-spacing:.2em;text-transform:uppercase;opacity:.9;margin-top:3px;font-family:var(--fa)}" +
      ".cz .cnt{font-size:10px;letter-spacing:.16em;color:" + (skin.flach ? "var(--ink2)" : "rgba(255,255,255,.88)") + (skin.flach ? "" : ";text-shadow:0 2px 10px rgba(0,0,0,.5)") + ";white-space:nowrap;padding-top:4px}" +
      ".cz .panel{background:var(--sf);" + (istGlas ? "backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);" : "") + "border:" + (skin.rahmen || "1px solid " + (istGlas && skin.hell ? "rgba(255,255,255,.92)" : "var(--line)")) + ";border-radius:calc(" + radius + " * .9);padding:20px 18px;box-shadow:0 18px 40px -20px rgba(0,0,0,.35)}" +
      ".cz .bar{height:4px;border-radius:999px;background:var(--line);overflow:hidden;margin-bottom:14px}" +
      ".cz .bar>i{display:block;height:100%;background:var(--a);border-radius:999px;transition:width .4s cubic-bezier(.2,.7,.2,1)}" +
      ".cz .nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:11px}" +
      ".cz .back{background:none;border:none;color:var(--ink2);font:inherit;font-size:13px;cursor:pointer;padding:6px 2px;min-height:36px}" +
      ".cz .of{font-size:11px;letter-spacing:.1em;color:var(--ink2)}" +
      ".cz .sec{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--a);margin-bottom:7px}" +
      ".cz .frage+.frage{margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}" +
      ".cz h3.qh{font-size:calc(" + sizeQ + " * .82);margin-bottom:11px}" +
      ".cz .opt.on{border-color:var(--a);box-shadow:inset 0 0 0 1px var(--a)}" +
      ".cz h3{font-family:var(--fq);font-size:" + sizeQ + ";font-weight:600;color:var(--ink);line-height:1.22;letter-spacing:-.01em;margin:0 0 14px;text-wrap:pretty}" +
      ".cz h3 .req{color:#c0573c;font-weight:700}" +
      ".cz .legende{font-size:12px;line-height:1.45;color:var(--ink2);margin:16px 0 0}.cz .legende b{color:#c0573c}" +
      ".cz .lbl{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);margin-bottom:7px}" +
      ".cz .opts{display:flex;flex-direction:column;gap:8px}" +
      ".cz .opt{font-family:var(--fa);font-size:" + sizeA + ";text-align:left;width:100%;background:var(--fd);border:1.5px solid var(--line);border-radius:" + rIn + ";padding:13px 16px;color:var(--ink);cursor:pointer;transition:border-color .18s,transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s,margin .22s cubic-bezier(.2,.8,.2,1);min-height:48px;position:relative}" +
      ".cz .opt:hover{border-color:var(--a)}.cz .opt:active{transform:scale(.985)}" +
      /* Die gewählte Antwort tritt einen Millimeter über den Rand des Widgets
         hinaus — sie löst sich sichtbar aus der Karte. */
      ".cz .opt.on,.cz .chk.on{width:auto;margin-left:calc(var(--ue) * -1);margin-right:calc(var(--ue) * -1);padding-left:calc(16px + var(--ue));padding-right:calc(16px + var(--ue));box-shadow:0 12px 30px -14px rgba(20,15,8,.5);z-index:2}" +
      ".cz .opt small{display:block;font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.42}" +
      ".cz .opt .pr{float:right;font-size:11.5px;color:var(--ink2);margin-left:10px}" +
      ".cz .chk{font-family:var(--fa);display:flex;align-items:flex-start;gap:11px;background:var(--fd);border:1.5px solid var(--line);border-radius:" + rIn + ";padding:12px 14px;cursor:pointer;text-align:left;width:100%;min-height:48px;color:var(--ink);font-size:" + sizeA + ";transition:border-color .18s,transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s,margin .22s cubic-bezier(.2,.8,.2,1);position:relative}" +
      ".cz .chk.on{border-color:var(--a)}" +
      ".cz .chk .bx{flex:0 0 auto;width:19px;height:19px;border-radius:" + rIn2 + ";border:1.5px solid var(--line);background:var(--fd);margin-top:1px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ai)}" +
      ".cz .chk.on .bx{background:var(--a);border-color:var(--a)}" +
      ".cz .chk .tx{flex:1 1 0;min-width:0;overflow-wrap:anywhere}.cz .chk .tx b{display:block;font-weight:600}" +
      ".cz .chk .tx small{display:block;font-size:12.5px;color:var(--ink2);margin-top:2px;line-height:1.42}" +
      ".cz .chk .pr{font-size:11.5px;color:var(--ink2);white-space:nowrap;padding-top:2px;flex:0 0 auto}" +
      "@media(max-width:600px){.cz{padding:16px;max-width:none}.cz .chk{flex-wrap:wrap}.cz .chk .pr{flex:1 1 100%;padding:5px 0 0 30px;white-space:normal}" +
        ".cz{--ue:12px}}" +
      /* Seitenwechsel: die neue Seite kommt von rechts herein, die Antworten
         erscheinen kurz nacheinander. */
      "@keyframes czRein{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none}}" +
      "@keyframes czReinL{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}" +
      "@keyframes czRaus{from{opacity:1;transform:none}to{opacity:0;transform:translateX(-22px)}}" +
      "@keyframes czRausR{from{opacity:1;transform:none}to{opacity:0;transform:translateX(22px)}}" +
      "@keyframes czAuf{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
      ".cz .panel.rein{animation:czRein .3s cubic-bezier(.2,.8,.2,1) both}" +
      ".cz .panel.rein.rueck{animation-name:czReinL}" +
      ".cz .panel.raus{animation:czRaus .18s cubic-bezier(.4,0,1,1) both}" +
      ".cz .panel.raus-r{animation:czRausR .18s cubic-bezier(.4,0,1,1) both}" +
      ".cz .panel.rein .opt,.cz .panel.rein .chk,.cz .panel.rein .picker,.cz .panel.rein .ta{animation:czAuf .26s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--n,0) * 40ms + 90ms)}" +
      "@media(prefers-reduced-motion:reduce){.cz .panel.rein,.cz .panel.raus,.cz .panel.raus-r,.cz .panel.rein .opt,.cz .panel.rein .chk,.cz .panel.rein .picker,.cz .panel.rein .ta{animation:none}.cz .opt,.cz .chk{transition:border-color .18s}}" +
      ".cz .picker{background:var(--fd);border:1.5px solid var(--line);border-radius:" + rIn + ";overflow:hidden}" +
      ".cz .tgl{font-family:var(--fa);width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:none;border:none;padding:14px 15px;font-size:16px;color:var(--ink);cursor:pointer;min-height:52px;text-align:left}" +
      ".cz .tgl .ph{color:var(--ink2)}" +
      ".cz .picker.open .tgl{border-bottom:1px solid var(--line)}" +
      ".cz .cal{padding:13px}" +
      ".cz .ch{display:flex;align-items:center;gap:8px;margin-bottom:9px}" +
      ".cz .ch b{flex:1;text-align:center;font-size:15px;color:var(--ink)}" +
      ".cz .cn{background:var(--fd);border:1.5px solid var(--line);border-radius:" + rIn2 + ";width:44px;height:44px;font-size:16px;color:var(--ink2);cursor:pointer;line-height:1;flex:0 0 auto}" +
      ".cz .cn:disabled{opacity:.35;cursor:default}" +
      ".cz .yr{font-family:var(--fa);font-size:13px;border:1.5px solid var(--line);border-radius:" + rIn2 + ";padding:7px 9px;background:var(--fd);color:var(--ink);min-height:36px}" +
      ".cz .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}" +
      /* Niedrige Bildschirme: Kalender enger, damit die Seite ohne Scrollen passt. */
      "@media(max-height:860px){.cz .cal{padding:10px}.cz .day{min-height:34px;padding:6px 0;font-size:12.5px}.cz .cn{width:38px;height:38px}.cz .grid{gap:3px}.cz .leg{margin-top:8px}}" +
      ".cz .wd{font-size:9.5px;text-align:center;color:var(--ink2);padding-bottom:2px}" +
      ".cz .day{font-family:var(--fa);border-radius:" + rIn2 + ";border:1.5px solid transparent;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:9px 0;min-height:40px}" +
      ".cz .day.free{background:#edf7f1;border-color:#c2e0d0;color:#1b6144}" +
      ".cz .day.free:hover{border-color:var(--a)}" +
      ".cz .day.busy{background:#fceeee;border-color:#efc9c9;color:#a94442;cursor:not-allowed}" +
      ".cz .day.past{background:rgba(120,115,100,.14);border-color:transparent;color:var(--ink2);cursor:not-allowed}" +
      ".cz .day.off{visibility:hidden}" +
      ".cz .day.sel{background:var(--a);border-color:var(--a);color:var(--ai);font-weight:600}" +
      (skin.kacheln ? ".cz .day{border:none;border-radius:" + Math.max(9, Math.round(rNum * 0.36)) + "px;min-height:44px;font-size:14px}.cz .day.past,.cz .day.busy{background:#efe9dd;color:#a39b8b}.cz .day.free{background:#dcefe3;color:#1f5e41;font-weight:600}.cz .day.free:hover{box-shadow:inset 0 0 0 1.5px var(--a)}.cz .day.sel{background:var(--a);color:var(--ai);font-weight:650}" : "") +
      ".cz .leg{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--ink2)}" +
      ".cz .leg span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}" +
      ".cz .leg i{width:11px;height:11px;border-radius:4px;display:inline-block}" +
      ".cz .leg .fr{background:#edf7f1;border:1.5px solid #c2e0d0}.cz .leg .bu{background:#fceeee;border:1.5px solid #efc9c9}" +
      ".cz .hint{font-size:13px;line-height:1.45;color:var(--ink2);margin-top:11px;background:" + (skin.hell ? "color-mix(in srgb,var(--a) 7%,#fff)" : "rgba(255,255,255,.12)") + ";border-radius:" + rIn + ";padding:10px 13px}" +
      ".cz .hint b{color:var(--ink)}" +
      ".cz .unter{margin:-4px 0 12px;font-size:13.5px;line-height:1.5;color:var(--ink2);text-wrap:pretty}" +
      ".cz .hint.warn{background:#fdf3ec;border:1px solid #e8c9b4;color:#7a4a2a}.cz .hint.warn b{color:#8a3d1c}" +
      ".cz .row{display:flex;gap:9px;margin-top:13px}" +
      ".cz .go{font-family:var(--fa);flex:1;background:var(--a);color:var(--ai);border:none;border-radius:" + brad + ";padding:14px;font-size:15px;font-weight:600;cursor:pointer;min-height:48px}" +
      ".cz .skip{font-family:var(--fa);background:var(--fd);border:1.5px solid var(--line);border-radius:" + brad + ";padding:14px 18px;color:var(--ink2);cursor:pointer;font-size:14px;white-space:nowrap;min-height:48px}" +
      ".cz .ta{font-family:var(--fa);width:100%;border:1.5px solid var(--line);border-radius:" + rIn + ";padding:13px 14px;font-size:" + sizeA + ";color:var(--ink);background:var(--fd);min-height:100px;resize:vertical;line-height:1.5}" +
      ".cz .ta:focus,.cz input:focus{outline:none;border-color:var(--a)}" +
      ".cz .sum{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}" +
      ".cz .sum>div{display:flex;justify-content:space-between;gap:14px;font-size:13.5px;color:var(--ink2);border-bottom:1px dashed var(--line);padding-bottom:6px}" +
      ".cz .sum b{color:var(--ink);font-weight:600;text-align:right}" +
      ".cz .sum .grp{border:none;padding:12px 0 3px;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink2);display:block}" +
      ".cz .sum .tot{border-bottom:none;padding-top:9px;font-size:15px;color:var(--ink)}" +
      ".cz .price{background:" + (skin.hell ? "color-mix(in srgb,var(--a) 9%,#fff)" : "rgba(255,255,255,.14)") + ";border-radius:" + rIn + ";padding:13px 15px;margin-bottom:13px}" +
      ".cz .price span{display:block;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)}" +
      ".cz .price b{font-size:24px;color:var(--a);letter-spacing:-.02em}" +
      ".cz label.f{display:block;font-size:13px;color:var(--ink2);margin:12px 0 5px}" +
      ".cz input{width:100%;border:1.5px solid var(--line);border-radius:" + rIn2 + ";padding:12px 14px;font:inherit;font-size:15px;background:var(--fd);color:var(--ink);min-height:46px}" +
      /* iPhone/iPad zoomen beim Antippen in jedes Feld unter 16px hinein — die Website des Kunden verrutscht dann. */
      "@supports (-webkit-touch-callout:none){.cz input,.cz select{font-size:16px}.cz .ta{font-size:max(16px," + sizeA + ")}}" +
      ".cz .consent{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--ink2);margin:14px 0 4px;line-height:1.45}" +
      ".cz .consent input{width:16px;height:16px;margin-top:2px;flex:0 0 auto;min-height:0;accent-color:var(--a)}" +
      ".cz .consent a{color:var(--a);text-decoration:underline;text-underline-offset:2px}" +
      /* Datenschutz-Hinweis unter dem Absenden-Knopf (Art. 13 DSGVO) */
      ".cz .dsh{margin:14px 2px 0;font-size:12px;line-height:1.5;color:var(--ink2);text-wrap:pretty}.cz .dsh b{color:var(--ink);font-weight:600}" +
      ".cz .dsh a{color:var(--a);text-decoration:underline;text-underline-offset:2px}" +
      ".cz .pk{margin:16px 0 6px;text-align:left}.cz .pk h4{margin:0 0 6px;font-size:14px;color:var(--ink)}" +
      ".cz .pk-o{display:flex;gap:10px;align-items:flex-start;border:1.5px solid var(--line);border-radius:12px;padding:11px 13px;margin-top:6px;cursor:pointer}" +
      ".cz .pk-o:has(input:checked){border-color:var(--a)}" +
      ".cz .pk-o input{width:17px;height:17px;min-height:0;margin-top:2px;flex:0 0 auto;accent-color:var(--a)}" +
      ".cz .pk-o span{display:flex;flex-direction:column;gap:2px;font-size:13.5px;color:var(--ink);line-height:1.4}.cz .pk-o em{font-style:normal;font-size:12.5px;color:var(--ink2)}.cz .pk-o small{font-size:12px;color:var(--ink2)}" +
      ".cz .done{text-align:center;padding:8px 0}" +
      ".cz .done .ok{width:56px;height:56px;border-radius:50%;background:var(--a);color:var(--ai);font-size:30px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}" +
      ".cz .done p{color:var(--ink2);font-size:14.5px;margin:0}" +
      /* Herkunftszeile unter jeder Ansicht — klein, dezent, anklickbar. */
      ".cz .fuss{font-family:var(--fa);text-align:center;padding:12px 4px 0;font-size:12px;letter-spacing:.03em}.cz .fuss a{display:inline-flex;align-items:center;min-height:32px}" +
      ".cz .fuss a{color:var(--ink2);text-decoration:none;transition:color .18s}" +
      ".cz .fuss a:hover{color:var(--a)}" +
      ".cz .fuss b{font-weight:600;letter-spacing:0}" +
      /* Vernetzen: Partner des Betriebs */
      ".cz .pn{margin-top:22px;text-align:left;border-top:1px solid var(--line);padding-top:18px}" +
      ".cz .pn h4{margin:0 0 3px;font-size:15px;color:var(--ink)}" +
      ".cz .pn .pns{margin:0 0 12px;font-size:12.5px;color:var(--ink2)}" +
      ".cz .pn-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}" +
      ".cz .pn-k{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-decoration:none;color:var(--ink);transition:border-color .18s}" +
      ".cz .pn-k:hover{border-color:var(--a)}" +
      ".cz .pn-av{width:40px;height:40px;border-radius:50%;flex:0 0 auto;background:var(--line) center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:var(--ink2)}" +
      ".cz .pn-k b{display:block;font-size:13.5px;line-height:1.25}" +
      ".cz .pn-k span{display:block;font-size:11.5px;color:var(--ink2);margin-top:2px}" +
      ".cz .pn-k em{font-style:normal;margin-left:auto;font-size:12px;color:var(--a);font-weight:600;white-space:nowrap;padding-left:6px}" +
      ".cz .pn-l{display:flex;flex-wrap:wrap;gap:4px 10px;justify-content:center;align-items:center;font-size:11.5px;color:var(--ink2);padding:12px 4px 0}" +
      ".cz .pn-l a{color:var(--ink2);text-decoration:none;display:inline-flex;align-items:center;gap:5px}" +
      ".cz .pn-l a:hover{color:var(--a)}" +
      ".cz .pn-l i{width:18px;height:18px;border-radius:50%;background:var(--line) center/cover no-repeat;display:inline-block}" +
      /* Uhrzeit-Termine */
      ".cz .tm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}" +
      ".cz .tm-tab{font-family:var(--fa);font-size:13px;border:1.5px solid var(--line);background:var(--fd);color:var(--ink2);border-radius:999px;padding:8px 14px;min-height:40px;cursor:pointer}" +
      ".cz .tm-tab.on{border-color:var(--a);color:var(--ink);font-weight:600}" +
      ".cz .tm-tab .x{margin-left:8px;opacity:.6}" +
      ".cz .tm-block{margin-bottom:16px}" +
      ".cz .tm-chips{display:flex;flex-wrap:wrap;gap:8px}" +
      ".cz .tm-chip{font-family:var(--fa);font-size:14.5px;border:1.5px solid var(--line);background:var(--fd);color:var(--ink);border-radius:" + rIn + ";padding:10px 14px;min-height:46px;cursor:pointer;text-align:left}" +
      ".cz .tm-chip small{display:block;font-size:11.5px;color:var(--ink2);margin-top:2px}" +
      ".cz .tm-chip:hover,.cz .tm-day:not(:disabled):hover,.cz .tm-z:hover{border-color:var(--a)}" +
      ".cz .tm-chip.on,.cz .tm-day.on,.cz .tm-z.on{background:var(--a);border-color:var(--a);color:var(--ai)}" +
      ".cz .tm-chip.on small,.cz .tm-day.on small{color:inherit;opacity:.85}" +
      ".cz .tm-mon{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}" +
      ".cz .tm-mon b{font-size:14px;color:var(--ink);font-weight:600}" +
      ".cz .tm-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}" +
      ".cz .tm-day{font-family:var(--fa);border:1.5px solid var(--line);background:var(--fd);color:var(--ink);border-radius:" + rIn2 + ";padding:6px 0;min-height:54px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:15px;font-weight:600}" +
      ".cz .tm-day small{font-size:10px;font-weight:400;color:var(--ink2);letter-spacing:.04em}" +
      ".cz .tm-day:disabled{opacity:.32;cursor:not-allowed}" +
      ".cz .tm-zeiten{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;max-height:220px;overflow-y:auto;padding:2px}" +
      ".cz .tm-z{font-family:var(--fa);border:1.5px solid var(--line);background:var(--fd);color:var(--ink);border-radius:" + rIn2 + ";min-height:44px;font-size:14.5px;cursor:pointer}" +
      ".cz .tm-sumz{display:flex;align-items:center;gap:10px;margin:0 0 14px;font-size:14px;color:var(--ink)}" +
      ".cz .tm-zur{font-family:var(--fa);flex:0 0 auto;width:36px;height:36px;border-radius:50%;border:1.5px solid var(--line);background:var(--fd);color:var(--ink);font-size:18px;line-height:1;cursor:pointer}" +
      ".cz .tm-gross .tm-chip{flex:1 1 100%;text-align:left;font-size:16px;padding:14px 16px;min-height:54px}" +
      ".cz .tm-alle{max-height:none;overflow:visible;grid-template-columns:repeat(4,minmax(0,1fr))}" +
      ".cz .tm-leer{font-size:13.5px;color:var(--ink2);line-height:1.5;padding:4px 0}" +
      ".cz .tm-add{font-family:var(--fa);background:none;border:1.5px dashed var(--line);border-radius:" + rIn + ";color:var(--ink2);padding:11px;width:100%;cursor:pointer;min-height:46px;font-size:14px;margin-top:6px}" +
      ".cz .tm-add:hover{border-color:var(--a);color:var(--ink)}" +
      /* Inhaltsverzeichnis: runde Kacheln (saKatalog) */
      ".cz .sa-unter{margin:-2px 0 12px;font-size:13px;line-height:1.45;color:var(--ink2)}" +
      ".cz .sa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:12px;justify-items:center}" +
      /* theme.eigen.eineReihe (seit 17.10.2026, z. B. Uncle’s Salon): alle runden Kacheln in einer Reihe, auch am Handy */
      /* theme.eigen.rand (seit 17.10.2026): feiner Rand in dieser Farbe um das Formular und die Karte, z. B. Gold bei Uncle’s Salon */
      (eigen && /^#[0-9a-f]{3,8}$/i.test(String(eigen.rand || "")) ? ".cz{box-shadow:inset 0 0 0 1px " + eigen.rand + "," + (skin.schatten || "0 30px 64px -32px rgba(20,15,8,.6)") + "}.cz .panel{border-color:color-mix(in srgb," + eigen.rand + " 55%,transparent)!important}" : "") +
      (eigen && eigen.eineReihe ? ".cz .sa-grid:not(.sa-gr){grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:clamp(5px,1.6vw,12px)}.cz .sa-grid:not(.sa-gr) .sa-k{padding:7%}.cz .sa-grid:not(.sa-gr) .sa-k b{font-size:min(14px,max(8.5px,15cqi))!important;hyphens:auto}.cz .sa-grid:not(.sa-gr) .sa-k small{font-size:min(12px,max(7.5px,12cqi))!important}" : "") +
      ".cz .sa-k{width:100%;max-width:134px;aspect-ratio:1;border-radius:50%;border:1.5px solid var(--line);background:var(--fd);color:var(--ink);font-family:var(--fa);cursor:pointer;padding:15%;overflow:hidden;-webkit-text-size-adjust:100%;text-size-adjust:100%;display:flex;align-items:center;justify-content:center;position:relative;transition:border-color .15s,background .15s,box-shadow .15s}" +
      ".cz .sa-k i{font-style:normal;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;min-width:0;width:100%;hyphens:auto;-webkit-hyphens:auto;hyphenate-limit-chars:12 5 5;overflow-wrap:break-word;max-width:100%}" +
      ".cz .sa-k{container-type:inline-size}.cz .sa-k b{font-size:max(12px,min(14px,calc((100cqi - 18px) / (var(--l,10) * .6))));font-weight:600;line-height:1.2;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word;word-break:normal}.cz .sa-k small{font-size:11px;line-height:1.25;color:var(--ink2)}" +
      ".cz .sa-k:hover{border-color:var(--a)}.cz .sa-k.auf{border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 22%,transparent)}" +
      ".cz .sa-k.on{background:var(--a);border-color:var(--a);color:var(--ai)}.cz .sa-k.on small{color:inherit;opacity:.85}" +
      ".cz .sa-k.on::after{content:'✓';position:absolute;top:2px;right:2px;width:26px;height:26px;border-radius:50%;background:#fff;color:var(--a);font-weight:700;font-size:14px;line-height:26px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.2)}" +
      ".cz .sa-gr{display:flex;flex-wrap:wrap;justify-content:center;container-type:inline-size}.cz .sa-gr .sa-k{flex:0 0 auto;width:min(134px,calc((100cqi - 12px) / 2))}@container (min-width:336px){.cz .sa-gr .sa-k{width:min(134px,calc((100cqi - 24px) / 3))}}@container (min-width:452px){.cz .sa-gr .sa-k{width:min(134px,calc((100cqi - 36px) / 4))}}.cz .sa-gr .sa-k b{font-size:15px}" +
      ".cz .sa-auf{margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}.cz .sa-auf-k{font-size:13px;font-weight:600;color:var(--ink2);margin-bottom:8px}" +
      ".cz .tm-chip .sa-info{margin-top:5px;font-size:11.5px;line-height:1.4}" +
      ".cz .sa-wahl{margin-top:14px;font-size:14px;font-weight:600;color:var(--ink)}" +
      ".cz .sa-bild{position:relative;margin:0 0 18px;border-radius:16px;overflow:hidden;aspect-ratio:16/9;background:#fff}.cz .sa-bild img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 30%}" +
      ".cz .sa-bild p{position:absolute;right:8px;top:50%;transform:translateY(-50%);max-width:34%;margin:0;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.94);box-shadow:0 6px 18px -8px rgba(0,0,0,.3);font-size:clamp(11px,2.6vw,13px);line-height:1.35;font-weight:600;color:#27241d;text-wrap:pretty;hyphens:manual;overflow-wrap:normal;word-break:normal}" +
      ".cz .sa-alle{display:inline-flex;align-items:center;gap:4px;background:none;border:0;padding:0;margin:0 0 6px;min-height:44px;font:inherit;font-size:14px;font-weight:600;color:var(--a);cursor:pointer}" +
      ".cz .sa-weiter{font-family:var(--fa);margin-top:12px;width:100%;min-height:50px;border:0;border-radius:" + rIn + ";background:var(--a);color:var(--ai);font-size:15.5px;font-weight:600;cursor:pointer}.cz .sa-weiter:disabled{opacity:.4;cursor:default}" +
      ".cz .sa-tab{width:100%;border-collapse:collapse;font-size:14px;margin-top:11px;color:var(--ink)}.cz .sa-tab td{padding:8px 0;border-bottom:1px solid var(--line);vertical-align:top}.cz .sa-tab td+td{text-align:right;white-space:nowrap;padding-left:12px}" +
      ".cz .sa-tab small{display:block;font-size:12px;color:var(--ink2);margin-top:2px}.cz .sa-tab tr.sum td{font-weight:700;border-bottom:0;padding-top:10px}" +
      ".cz .tm-name{margin-bottom:14px}.cz .sa-tab tr.ns td{padding:0 0 8px;font-size:13px;font-weight:600;color:#a8442f;text-align:left}.cz textarea.ta{width:100%;box-sizing:border-box}" +
      ".cz .tm-fotos{display:flex;flex-wrap:wrap;gap:8px}" +
      ".cz .tm-foto{position:relative;width:84px;height:84px;border-radius:" + rIn + ";background:var(--fd) center/cover no-repeat;border:1.5px solid var(--line)}" +
      ".cz .tm-foto button{position:absolute;top:-8px;right:-8px;width:28px;height:28px;border-radius:50%;border:none;background:var(--ink);color:var(--fd);font-size:16px;line-height:1;cursor:pointer}" +
      ".cz .tm-fotoadd{display:flex;align-items:center;justify-content:center;min-width:84px;height:84px;padding:0 12px;border:1.5px dashed var(--line);border-radius:" + rIn + ";color:var(--ink2);font-size:13.5px;cursor:pointer;text-align:center}" +
      ".cz .tm-fotoadd:hover{border-color:var(--a);color:var(--ink)}" +
      ".cz .tm-fotoadd input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}" +
      ".cz .tm-wd{font-family:var(--fa);width:100%;box-sizing:border-box;min-height:46px;border:1.5px solid var(--line);background:var(--fd);color:var(--ink);border-radius:" + rIn + ";padding:0 12px;font-size:15px}" +
      /* Barrierefreiheit: sichtbarer Fokus für Tastatur-Nutzer */
      ".cz button:focus-visible,.cz input:focus-visible,.cz textarea:focus-visible,.cz select:focus-visible,.cz a:focus-visible{outline:3px solid var(--a);outline-offset:2px}" +
      ".cz .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
      /* Warteliste */
      ".cz .wl-link{font-family:var(--fa);background:none;border:none;color:var(--ink);font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:8px 0;min-height:40px;text-align:left}" +
      ".cz .wl-box{margin-top:12px;border:1.5px dashed var(--line);border-radius:" + rIn + ";padding:12px 14px;font-size:13.5px;color:var(--ink2);line-height:1.5}" +
      ".cz .wl-box b{color:var(--ink)}.cz .wl-box input{margin-top:8px}" +
      ".cz .wl-box .row{margin-top:10px}" +
      ".cz .mit-k{cursor:pointer}.cz .mit-k input{width:20px;height:20px;min-height:0;margin:0;flex:0 0 auto;accent-color:var(--acc,#2f7d59)}.cz .mit-frei{color:#2f7d59!important;font-weight:600}.cz .mit-f{color:#a94442;font-size:13px;margin:8px 0 0;min-height:1em}.cz .mit-b{margin-top:6px;width:100%}.cz .mit-ok{margin:0;font-weight:600;color:#2f7d59}" +
      ".cz .day.busy.pnd{cursor:pointer}.cz .day.busy.pnon{outline:2px solid #a94442;outline-offset:1px}" +
      ".cz .pnf{margin-top:12px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--ink);background:var(--fd)}" +
      ".cz .pnf>span{color:var(--ink2)}" +
      ".cz .az{display:inline-flex;align-items:center;gap:7px;margin:4px 0 10px;font-size:12.5px;color:var(--ink2)}.cz .az i{width:8px;height:8px;border-radius:50%;background:#2f9e6a;box-shadow:0 0 0 3px rgba(47,158,106,.18)}.cz .done .az{margin-top:12px}" +
      ".cz .day.busy.wlp{cursor:pointer;border-color:#c0573c;border-style:dashed}" +
      /* Sprachwahl oben rechts */
      ".cz .rechts{display:flex;flex-direction:column;align-items:flex-end;gap:6px}" +
      ".cz .spr{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:2px;max-width:220px}" +
      ".cz .spr button{font-family:var(--fa);font-size:11px;letter-spacing:.08em;font-weight:600;background:none;border:1.5px solid transparent;color:inherit;opacity:.7;border-radius:999px;padding:0 9px;min-height:36px;min-width:40px;cursor:pointer" + (skin.flach ? "" : ";text-shadow:0 1px 8px rgba(0,0,0,.45)") + "}" +
      ".cz .spr button:hover{opacity:1}.cz .spr button.on{opacity:1;border-color:currentColor}";
    root.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "cz";
    wrap.setAttribute("lang", LANG);
    root.appendChild(wrap);
    /* Logo-Intro: Logo groß in der Mitte, dann wird es kleiner und setzt sich oben über die Fragen.
       cfg.logo (oder theme.logo) = Bildadresse; cfg.intro === false schaltet es ab; cfg.introKlang: "schere" | false. */
    var LOGO = cfg.logo || (cfg.theme && cfg.theme.logo) || "";
    function introKlang() {
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        var ac = new AC(); if (ac.state === "suspended") { ac.resume(); }
        if (ac.state !== "running") { ac.close(); return; }
        [0, 0.16].forEach(function (t0) {
          var len = Math.floor(ac.sampleRate * 0.07), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
          var src = ac.createBufferSource(); src.buffer = buf;
          var bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5200; bp.Q.value = 1.4;
          var g = ac.createGain(); g.gain.value = 0.35;
          src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(ac.currentTime + t0);
        });
        setTimeout(function () { ac.close(); }, 800);
      } catch (e) {}
    }
    function introStart() {
      if (!LOGO || cfg.intro === false) return;
      var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      /* Nur im Speicher der offenen Seite merken — nichts auf dem Gerät (siehe oben). */
      var sk = "cz_intro_" + widget; window.__czIntro = window.__czIntro || {}; if (window.__czIntro[sk]) return; window.__czIntro[sk] = 1;
      if (still) return;
      wrap.classList.add("intro");
      var ov = document.createElement("div"); ov.className = "cz-intro";
      ov.innerHTML = '<img src="' + esc(LOGO) + '" alt="">';
      root.appendChild(ov);
      var im = ov.querySelector("img");
      function los() {
        var ziel = wrap.querySelector(".lg img"); if (!ziel) { fertig(); return; }
        var r0 = im.getBoundingClientRect(), r1 = ziel.getBoundingClientRect();
        if (!r0.width) { fertig(); return; }
        var k = r1.width / r0.width, dx = (r1.left + r1.width / 2) - (r0.left + r0.width / 2), dy = (r1.top + r1.height / 2) - (r0.top + r0.height / 2);
        im.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + k + ")";
        if (cfg.introKlang !== false) introKlang();
        /* Erst wenn das Logo oben sitzt, erscheinen die Fragen dahinter. */
        setTimeout(function () { ov.classList.add("weg"); wrap.classList.add("intro-da"); }, 720);
        setTimeout(fertig, 1500);
      }
      function fertig() { wrap.classList.remove("intro", "intro-da"); if (ov.parentNode) ov.parentNode.removeChild(ov); }
      var los2 = function () { setTimeout(los, 750); };
      if (im.complete) los2(); else { im.onload = los2; im.onerror = fertig; }
      setTimeout(function () { if (ov.parentNode && !ov.classList.contains("weg")) los(); }, 2600);
    }
    function sprHTML() {
      if (SPR.length < 2) return "";
      return '<div class="spr" role="group" aria-label="' + t("sprache") + '">' + SPR.map(function (c) {
        return '<button type="button" data-lang="' + c + '" lang="' + c + '" title="' + D[c].name + '" aria-label="' + D[c].name + '" aria-pressed="' + (c === LANG) + '"' + (c === LANG ? ' class="on"' : "") + ">" + c.toUpperCase() + "</button>";
      }).join("") + "</div>";
    }

    // Steht unter jeder Ansicht des Widgets.
    var PARTNER = (Array.isArray(cfg.partner) ? cfg.partner : []).filter(function (p) { return p && p.name; }).slice(0, 6);
    var BR = { hochzeit: "Hochzeitslocation", foodtruck: "Food Truck", catering: "Catering", foto: "Foto & Video", floristik: "Floristik", deko: "Dekoration", musik: "Musik & DJ", konditorei: "Konditorei", planung: "Hochzeitsplanung", friseur: "Friseur & Styling", tagung: "Tagungshaus", sonstige: "" };
    function pnBild(p, cls) {
      var st = p.bild && /^https:\/\//.test(p.bild) ? ' style="background-image:url(\'' + esc(p.bild).replace(/'/g, "%27") + '\')"' : '';
      return '<' + (cls === "i" ? 'i' : 'span class="pn-av"') + st + '>' + (st || cls === "i" ? '' : esc(p.name.charAt(0))) + '</' + (cls === "i" ? 'i' : 'span') + '>';
    }
    function pnLink(p, inhalt, cls) {
      return p.link ? '<a class="' + cls + '" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + inhalt + '</a>' : '<div class="' + cls + '">' + inhalt + '</div>';
    }
    function partnerKarten() {
      if (!PARTNER.length) return "";
      return '<div class="pn"><h4>' + tp("h") + '</h4><p class="pns">' + tp("sub") + '</p><div class="pn-g">' +
        PARTNER.map(function (p) {
          var zeile = [BR[p.branche] || "", p.ort || ""].filter(Boolean).join(" · ");
          return pnLink(p, pnBild(p) + '<div><b>' + esc(p.name) + '</b>' + (zeile ? '<span>' + esc(zeile) + '</span>' : '') + '</div>' + (p.link ? '<em>' + tp("an") + ' ›</em>' : ''), "pn-k");
        }).join("") + '</div></div>';
    }
    var PN_LEISTE = PARTNER.length ? '<div class="pn-l"><span>' + tp("kurz") + '</span>' + PARTNER.map(function (p) {
      return p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + pnBild(p, "i") + esc(p.name) + '</a>' : '<span>' + esc(p.name) + '</span>';
    }).join("") + '</div>' : '';
    var PN_FREI = PARTNER.filter(function (p) { return p.link && Array.isArray(p.zu); });
    function pnFreiHTML(s) {
      var d = parseISO(s), wd = d ? d.getDay() : -1;
      var frei = PN_FREI.filter(function (p) { return p.zu.indexOf(s) < 0 && (p.zu_wt || []).indexOf(wd) < 0; });
      return '<div class="pnf" role="status"><b>' + esc(tfz("h").replace("{d}", deDate(s))) + '</b>' + (frei.length
        ? '<span>' + tfz("sub") + '</span><div class="pn-g">' + frei.map(function (p) {
          var zeile = [BR[p.branche] || "", p.ort || ""].filter(Boolean).join(" · ");
          return '<a class="pn-k" href="' + esc(p.link + "&tag=" + s) + '" target="_blank" rel="noopener">' + pnBild(p) + '<div><b>' + esc(p.name) + '</b>' + (zeile ? '<span>' + esc(zeile) + '</span>' : '') + '</div><em>' + tp("an") + ' ›</em></a>';
        }).join("") + '</div>' : '<span>' + tfz("keine") + '</span>') + '</div>';
    }
    function azHTML() { return cfg.antwortzeit && FZ.de[cfg.antwortzeit] ? '<div class="az"><i></i>' + esc(tfz(cfg.antwortzeit)) + '</div>' : ''; }
    /* Seit 09.10.2026 wieder: „Erstellt mit clickzauber“ unter jedem Formular, Link auf clickzauber.de. */
    var FUSS_NUR = '<div class="fuss"><a href="https://clickzauber.de/?ref=formular" target="_blank" rel="noopener">Erstellt mit&nbsp;<b>clickzauber</b></a></div>';
    var FUSS = PN_LEISTE + FUSS_NUR;

    var ALLE = cfg.steps || [];
    // Verzweigung: eine Frage kann an eine frühere Antwort gebunden sein.
    //   { wenn: { key:"anlass", ist:["Tagung / Seminar","Workshop"] } }
    // Ohne "wenn" wird eine Frage immer gezeigt. Der Weg wird nach jeder
    // Antwort neu bestimmt — wer zurückgeht und anders antwortet, bekommt
    // sofort den passenden Weg.
    var steps = [];
    var leadCfg = cfg.lead || { felder: ["name", "email"], consent: true };
    /* Uhrzeit-Termine: Die Antwort kommt per WhatsApp, deshalb ist die Handynummer Pflicht und die E-Mail freiwillig. */
    function tmForm() { return steps.some(function (s) { return s.typ === "termin"; }); }
    function lfelder() { var f = (leadCfg.felder || ["name", "email"]).slice(); if (tmForm() && f.indexOf("telefon") < 0) f.push("telefon"); return f; }
    function lpflicht(f) { return !(tmForm() && f === "email"); }
    var FREIW = { de: " (freiwillig)", en: " (optional)", sq: " (opsionale)", fr: " (facultatif)", it: " (facoltativo)", es: " (opcional)", tr: " (isteğe bağlı)" };
    var sum = cfg.summary || {};
    var preis = cfg.preis || null;              // { basis, proGast, saison:{1..12}, wochentag:{0..6} }
    // Belegung kommt mit der Config aus dem Cockpit.
    var belegt = {};
    (cfg.belegt || []).forEach(function (d) { belegt[d] = 1; });
    (cfg.frei || []).forEach(function (d) { belegt[d] = 'frei'; });   // Ausnahme trotz gesperrtem Wochentag
    var regel = cfg.belegungsregel || null;     // z.B. { wochentage:[0,1,2,3,4] } = unter der Woche zu

    var total = 1;
    var st = { i: 0, a: {}, m: {}, open: null, cal: null, fehler: {}, t: {} };
    /* Uhrzeit-Termine: Mitarbeiter und Leistungen kommen mit der Config. */
    var TC = cfg.termin || (VORSCHAU ? {
      personal: [{ id: "a", name: "Mitarbeiter 1", tage: [1, 2, 3, 4, 5, 6] }, { id: "b", name: "Mitarbeiter 2", tage: [1, 2, 3, 4, 5, 6] }],
      leistungen: [{ name: "Herrenschnitt", dauer: 30, preis: 28 }, { name: "Damenschnitt", dauer: 60, preis: 52, zuschlag: [0, 15, 30] }, { name: "Färben", dauer: 90, zuschlag: [0, 20, 40] }, { name: "Blondierung / Silber", dauer: 180, beratung: true }],
      tage: 42 } : { personal: [], leistungen: [], tage: 42 });
    var SL = {}, TM_IDX = null, DONE_TEL = "", DONE_WA = "";
    /* Höchstzahl Anfragen je Gerät (seit 15.10.2026, TC.salon.limit, z. B. 3 in 24 Stunden). Der Server prüft dasselbe zusätzlich je Anschluss. */
    function geraetId() { try { var g = localStorage.getItem("cz_geraet"); if (!g) { g = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("cz_geraet", g); } return g; } catch (e) { return ""; } }
    /* Auch für Formulare ohne Termine: Texte und Telefon mit Rückfall, falls die Termin-Helfer dort nicht greifen. */
    function limT(k, d) { try { return typeof sa === "function" ? sa(k) : d; } catch (e) { return d; } }
    function limTel() { try { return typeof saTelB === "function" ? saTelB() : String((cfg.summary && cfg.summary.ansprechpartner && cfg.summary.ansprechpartner.kontakt) || ""); } catch (e) { return ""; } }
    function limMax() { var sal = false; try { sal = typeof saAn === "function" && saAn() && TC && TC.salon && TC.salon.limit != null; } catch (e) {} var v = sal ? TC.salon.limit : cfg.limit; return v == null || v === "" ? 0 : Math.max(0, Math.min(20, +v || 0)); }
    function limListe() { try { var x = JSON.parse(localStorage.getItem("cz_lim_" + widget) || "[]"); return (Array.isArray(x) ? x : []).filter(function (t) { return Date.now() - t < 864e5; }); } catch (e) { return []; } }
    function limMerk() { try { var x = limListe(); x.push(Date.now()); localStorage.setItem("cz_lim_" + widget, JSON.stringify(x.slice(-20))); } catch (e) {} }
    function renderLimit() {
      var tel = limTel(), n = limMax() || 3;
      wrap.innerHTML = '<div class="top"><div class="brand">' + esc(cfg.name || "") + "</div></div>" + '<div class="panel"><h3>' + esc(limT("limitH", "Schon genug Anfragen von diesem Gerät")) + '</h3><p style="color:var(--ink2);font-size:14.5px;line-height:1.6;margin:0 0 14px">' + esc(String(limT("limitT", "Von diesem Gerät sind höchstens {n} Anfragen am Tag möglich. Morgen geht es wieder. Bei einer Frage rufen Sie gern direkt an.")).split("{n}").join(n)) + "</p>" +
        (tel ? '<div class="row"><a class="go" style="text-decoration:none;display:flex;align-items:center;justify-content:center" href="tel:' + esc(tel.replace(/[^\d+]/g, "")) + '">' + esc(limT("anrufen2", "Anrufen")) + "</a></div>" : "") + "</div>" + FUSS_NUR;
    }
    /* Warteliste nur für Locations und ähnliche Häuser. Friseur, Nagelstudio, Food Truck, Foto & Co. bekommen keine. */
    var WL_OK = ["friseur", "nagel", "wimpern", "kosmetik", "barbier", "massage", "foodtruck", "fotovideo"].indexOf(String(cfg.zielgruppe || "")) < 0;
    /* Warteliste: { key, datum, personal, fertig } */
    function wlHTML(key, datum, personal) {
      if (!WL_OK) return "";
      var W = st.wl && st.wl.key === key ? st.wl : null;
      if (!W) return datum === undefined ? '<button class="wl-link" data-wlstart="' + esc(key) + '">' + t("wlStart") + '</button>' : "";
      if (W.fertig) return '<div class="wl-box">' + t("wlDone")(deDate(W.datum)) + "</div>";
      if (!W.datum) return '<div class="wl-box">' + t("wlTap") + ' <button class="wl-link" data-wlstop="1">' + t("abbr") + '</button></div>';
      return '<div class="wl-box"><b>' + t("wlFor") + deDate(W.datum) + (W.personal && W.personal !== "egal" ? t("bei") + esc(tmName(W.personal)) : "") + "</b>" +
        '<input id="cz-wl-name" placeholder="' + t("lName") + '">' +
        '<input id="cz-wl-kontakt" placeholder="' + t("kontakt") + '">' +
        '<label class="consent"><input type="checkbox" id="cz-wl-ok"><span>' + t("wlConsent") +
        (cfg.datenschutz_url ? ' <a href="' + esc(cfg.datenschutz_url) + '" target="_blank" rel="noopener">' + t("ds") + '</a>' : "") + "</span></label>" +
        (W.fehler ? '<div class="hint warn" role="alert">' + esc(W.fehler) + "</div>" : "") +
        '<div class="row"><button class="go" data-wlsend="1">' + t("wlBtn") + '</button><button class="skip" data-wlstop="1">' + t("abbr") + '</button></div></div>';
    }
    function wlSenden(b) {
      var W = st.wl; if (!W) return;
      var name = (wrap.querySelector("#cz-wl-name") || {}).value || "", k = ((wrap.querySelector("#cz-wl-kontakt") || {}).value || "").trim();
      if (!(wrap.querySelector("#cz-wl-ok") || {}).checked) { W.fehler = t("wlZust"); render(); return; }
      var mail = /@/.test(k) ? k : "", tel = mail ? "" : k;
      if (!mail && tel.replace(/\D/g, "").length < 6) { W.fehler = t("wlKontakt"); render(); return; }
      if (VORSCHAU) { W.fertig = true; render(); return; }
      b.disabled = true; b.textContent = t("wlLaeuft");
      fetch(API + "/warteliste", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widget: widget, datum: W.datum, personal: W.personal || null, name: name.trim(), email: mail, telefon: tel, consent: true, sprache: LANG }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (j) { if (j.ok) { W.fertig = true; W.fehler = null; } else W.fehler = (LANG === "de" && j.error) || t("fehlerAllg"); render(); })
        .catch(function () { W.fehler = t("offline"); render(); });
    }
    var score = 0;

    function passt(s) {
      var w = s && s.wenn;
      if (!w || !w.key) return true;
      var ist = Array.isArray(w.ist) ? w.ist : (w.ist != null ? [w.ist] : []);
      if (!ist.length) return true;
      /* Wenn – Dann ab der Leistung (seit 21.10.2026, js/cz-konfigurator.js): Schlüssel ist der Termin-Schritt,
         ist nennt Leistungen oder „kat:Kachel“. */
      var tsx = (cfg.steps || []).filter(function (x) { return x.key === w.key && x.typ === "termin"; })[0];
      if (tsx) {
        try {
          var gew = [];
          (tmState(w.key).pers || []).forEach(function (P) {
            (Array.isArray(P.ls) && P.ls.length ? P.ls : (P.l != null ? [P.l] : [])).forEach(function (i) { var l = TC.leistungen[i]; if (l) gew.push(l.name, "kat:" + (l.kat || "Leistungen")); });
          });
          return ist.some(function (x) { return gew.indexOf(x) >= 0; });
        } catch (e) { return true; }
      }
      var v = st.a[w.key + "_l"];
      if (v == null) v = st.a[w.key];
      if (v && typeof v === "object") v = v.label;
      return ist.indexOf(v) >= 0;
    }
    /* Seiten: eine Seite ist ein Schritt für den Gast und kann mehrere Fragen
       tragen. Woher die Einteilung kommt, in dieser Reihenfolge:
         1. step.seite ist gesetzt   (neue Widgets aus dem Konfigurator)
         2. step.gruppe ist gesetzt  (ältere Widgets — gleiche Gruppe = eine Seite)
         3. nichts davon             (jede Frage bekommt ihre eigene Seite)     */
    /* Mehrfachauswahl wurde in älteren Entwürfen als mehrfach:true auf einer
       Auswahlfrage gespeichert. Diese Eigenschaft kannte das Widget nicht — der
       Gast konnte dort nur eine Antwort geben. Einmal übersetzen, dann läuft
       jedes bereits veröffentlichte Formular richtig. */
    steps.forEach(function (s) {
      if (s && s.mehrfach && s.typ !== "mehrfach") { s.typ = "mehrfach"; s.optional = true; }
    });

    var seiten = [];

    /* Wieviel Platz eine Frage braucht — grob geschätzt, aber genau genug für
       die Entscheidung, ob zwei Fragen zusammen auf einen Bildschirm passen.
       Beim Datum wird mit geöffnetem Kalender gerechnet: sonst schiebt sich
       die Seite beim Antippen wieder aus dem Bild. */
    function platz(s) {
      var h = 62;
      if (s.hinweis) h += 42;
      if (s.typ === "datum") return h + 56 + 320;
      if (s.typ === "termin") return 5000;
      if (s.typ === "text" || s.typ === "freitext" || s.typ === "textarea") return h + 108;
      if (s.typ === "zahl" || s.typ === "eingabe") return h + 62;
      var o = s.optionen || [], n = o.length || 1;
      var lang = o.some(function (x) { return x && (x.sub || x.beschreibung); });
      return h + n * (lang ? 78 : 58) + (n - 1) * 8;
    }
    /* Was auf einen Bildschirm geht: Fensterhöhe minus Kopfzeile, Fortschritt,
       Zurück-Zeile, Weiter-Knopf, Fußzeile und Innenabstand der Karte. */
    /* Seit 13.10.2026: die größte Höhe bei dieser Breite. Die Tastatur verkleinert auf Android das Fenster;
       mit der kleineren Höhe würden die Seiten beim nächsten Tipp anders aufgeteilt. Drehen misst neu. */
    var hMax = 0, hBreite = -1;
    function budget() {
      var w = window.innerWidth || 0, h = window.innerHeight || 820;
      if (Math.abs(w - hBreite) > 1) { hBreite = w; hMax = h; } else if (h > hMax) hMax = h;
      return Math.max(300, hMax - 300);
    }

    function seitenBauen() {
      var hatSeite = steps.some(function (s) { return typeof s.seite === "number"; });
      var roh = [], letzter = null;
      steps.forEach(function (s, i) {
        var k = hatSeite ? (typeof s.seite === "number" ? "s" + s.seite : "x" + i)
                         : (s.gruppe ? "g" + s.gruppe : "e" + i);
        if (letzter === k && roh.length) roh[roh.length - 1].fragen.push(s);
        else roh.push({ k: k, titel: s.gruppe || "", fragen: [s] });
        letzter = k;
      });
      /* Eine Gruppe, die nicht auf den Bildschirm passt, wird aufgeteilt.
         Kurze Fragen bleiben zusammen, ein Kalender steht allein. Dadurch
         muss der Gast nie scrollen, um die ganze Frage zu sehen. */
      var b = budget(), fein = [];
      roh.forEach(function (p) {
        var akt = null, hoehe = 0;
        p.fragen.forEach(function (f) {
          var fh = platz(f);
          if (akt && hoehe + fh + 42 <= b) { akt.fragen.push(f); hoehe += fh + 42; return; }
          akt = { k: p.k + "#" + fein.length, titel: p.titel, fragen: [f] };
          hoehe = fh;
          fein.push(akt);
        });
      });
      seiten.length = 0;
      for (var j = 0; j < fein.length; j++) seiten.push(fein[j]);
    }
    function neuOrdnen() {
      steps.length = 0;
      for (var i = 0; i < ALLE.length; i++) if (passt(ALLE[i])) steps.push(ALLE[i]);
      seitenBauen();
      total = seiten.length + 1;
    }
    neuOrdnen();

    track("start");
    if (channel) track("channel", { value: channel });
    render();
    introStart();

    /* Drehen ändert die Fensterhöhe und damit den Schnitt der Seiten.
       Seit 13.10.2026 nur bei anderer Breite und nie während der Eingabe: Auf Android ändert schon die Tastatur
       die Höhe. Neu zeichnen ersetzte dann das Textfeld, und die Tastatur ging sofort wieder zu. */
    var dreh, breite = window.innerWidth;
    window.addEventListener("resize", function () {
      if (Math.abs(window.innerWidth - breite) < 2) return;
      var fokus = document.activeElement;
      if (fokus && /^(INPUT|TEXTAREA|SELECT)$/.test(fokus.tagName)) return;
      breite = window.innerWidth;
      clearTimeout(dreh);
      dreh = setTimeout(function () { render(); }, 180);
    });

    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
    function pad(x) { return (x < 10 ? "0" : "") + x; }
    function eur(n) { return n.toLocaleString(t("loc")) + " €"; }
    function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function parseISO(s) { var p = String(s || "").split("-"); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
    function deDate(s) { var d = parseISO(s); return d ? (t("wkS")[d.getDay()] + ", " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear()) : ""; }

    function istBelegt(d) {
      var k = iso(d);
      if (belegt[k] === 'frei') return false;                 // ausdrücklich freigegeben
      if (belegt[k]) return true;                             // einzeln gesperrt
      if (regel && regel.wochentage && regel.wochentage.indexOf(d.getDay()) >= 0) return true;
      return false;
    }
    /* Gäste als Spanne (seit 13.10.2026): „50–100 Gäste“ heißt 50 bis 100. Gilt für die Frage nach den Gästen
       (gaeste: true, sonst Schlüssel oder Frage mit Gäste, Personen, pax). Preise pro Gast laufen dann von bis. */
    function gaesteFrage(s) {
      if (!s) return false;
      if (s.gaeste === true) return true;
      if (steps.some(function (x) { return x && x.gaeste === true; })) return false;
      return /g(ae|ä)ste|personen|pax|guest|ospiti|invitat/i.test((s.key || "") + " " + (s.frage || ""));
    }
    function gaesteSpanne(s, o) {
      if (!o || !gaesteFrage(s)) return null;
      var gv = +o.gaesteVon || 0, gb = +o.gaesteBis || 0;
      if (gv || gb) return [gv || Math.max(1, Math.round(gb / 2)), gb || gv];
      var z = String(o.label || "").replace(/(\d)\.(\d{3})/g, "$1$2").match(/\d+/g);
      if (!z) return null;
      z = z.map(Number);
      if (z.length > 1) return [Math.min(z[0], z[1]), Math.max(z[0], z[1])];
      if (/bis|unter|max|up to|under|fino|meno/i.test(o.label)) return [Math.max(1, Math.round(z[0] / 2)), z[0]];
      return [z[0], z[0]];
    }
    function faktor(d) {
      if (!preis) return 1;
      var s = (preis.saison && preis.saison[d.getMonth() + 1]) || 1;
      var w = (preis.wochentag && preis.wochentag[d.getDay()] != null) ? preis.wochentag[d.getDay()] : 1;
      return s * w;
    }
    function tagHinweis(s) {
      var d = parseISO(s); if (!d) return "";
      var f = faktor(d), txt = "<b>" + t("wn")[d.getDay()] + ", " + t("mn")[d.getMonth()] + " " + d.getFullYear() + ".</b> ";
      if (f >= 1.35) txt += t("hTop");
      else if (f >= 1.15) txt += t("hBeliebt");
      else if (f <= .9) txt += t("hRuhig");
      else txt += t("hGut");
      return txt;
    }

    // Budget-Abgleich: Wunschbudget gegen errechneten Richtwert
    function budgetWarnung() {
      var b = st.a.__budget, p = rechnung().sum;
      if (!b || !p) return "";
      if (p > b.max * 1.12) {
        return t("bUnter")(esc(b.o ? TR(b.o, "label") : b.label), eur(p));
      }
      if (b.min && p < b.min * .7) {
        return t("bLuft")(eur(p));
      }
      return "";
    }


    function rechnung() {
      neuOrdnen();
      /* Preis pro Person je nach Antwort (seit 09.10.2026, Speckrausch): eine gewählte Option mit preisVon/preisBis (und posten) ersetzt den Rahmen aus den Einstellungen */
      var auPv = AU ? +AU.preisVon || 0 : 0, auPb = AU ? +AU.preisBis || 0 : 0, auPo = AU ? AU.posten : "";
      if (AU) steps.forEach(function (sp) { var v = st.a[sp.key]; if (v && typeof v === "object" && +v.preisVon) { auPv = +v.preisVon; auPb = +v.preisBis || 0; if (v.posten) auPo = v.posten; } });
      if (AU && auPv && st.a.__gaeste) {
        var hoch = st.a.__gaeste, tief = 0;
        steps.forEach(function (sp) { (sp.optionen || []).forEach(function (o) { if (o.gaeste && o.gaeste < hoch && o.gaeste > tief) tief = o.gaeste; }); });
        if (!tief) tief = Math.max(1, Math.round(hoch / 2));
        var km = st.a.__km || 0, fahrt = km && AU.kmPreis ? Math.round(km * 2 * AU.kmPreis) : 0;
        var ohne = steps.some(function (sp) { var v = st.a[sp.key]; return v && /kein strom/i.test(v.label || ""); });
        var gen = ohne && AU.ohneStrom ? +AU.ohneStrom : 0, mind = AU.minUmsatz || 0;
        var ev = Math.max(tief * auPv, mind), eb = Math.max(hoch * (auPb || auPv), mind);
        var r50 = function (x) { return Math.round(x / 50) * 50; }, rw = [[(auPo || "Essen für") + " " + tief + "–" + hoch + " Personen", r50((ev + eb) / 2)]];
        if (fahrt) rw.push(["Anfahrt · ca. " + km + " km, hin und zurück", fahrt]);
        if (gen) rw.push(["Generator, kein Strom vor Ort", gen]);
        return { rows: rw, sum: r50((ev + eb) / 2 + fahrt + gen), von: r50(ev + fahrt + gen), bis: r50(eb + fahrt + gen) };
      }
      var rows = [], s = 0, sV = 0, sB = 0;
      var n = st.a.__gaeste || (preis && preis.gaesteStandard) || 0;
      /* Gäste als Spanne (seit 13.10.2026): Preise pro Gast und die Summe laufen von bis */
      var nV = st.a.__gv || n, nB = st.a.__gb || n;
      function dazu(text, x) { rows.push([text, x]); s += x; sV += x; sB += x; }
      function proG(text, pg) {
        if (nV === nB) { dazu(text + " · " + nV + " × " + eur(pg), pg * nV); return; }
        var a = pg * nV, b = pg * nB;
        rows.push([text + " · " + nV + "–" + nB + " × " + eur(pg), (a + b) / 2, [a, b]]); s += (a + b) / 2; sV += a; sB += b;
      }
      /* Uhrzeit-Termine: Preis der gewählten Leistung je Person (nicht bei „nur nach Beratung“) */
      steps.forEach(function (step) {
        if (step.typ !== "termin" || !st.t[step.key]) return;
        var TT = st.t[step.key];
        TT.pers.forEach(function (P, i) {
          if (saAn()) { saRechnen(P).po.forEach(function (x) { if (!(x.p > 0)) return; rows.push([x.n + (x.ids.length ? " (" + x.ids.map(function (id) { return saLab(id); }).join(", ") + ")" : "") + (x.ab ? " · " + sa("ab") : "") + (TT.pers.length > 1 ? " · " + (P.n || t("person") + " " + (i + 1)) : ""), x.p]); s += x.p; sV += x.p; sB += x.p; }); return; }
          var l = TC.leistungen[P.l]; if (!l || l.beratung || !(+l.preis > 0)) return;
          rows.push([TR(l, "name") + (TT.pers.length > 1 ? " · " + (P.n || t("person") + " " + (i + 1)) : ""), +l.preis]); s += +l.preis; sV += +l.preis; sB += +l.preis;
        });
      });
      if (preis && preis.basis) {
        var d = parseISO(st.a[dateKey()]) || new Date();
        var miete = Math.round((st.a.__basis || preis.basis) * faktor(d));
        dazu(preis.titel || t("location"), miete);
      }
      steps.forEach(function (step) {
        var v = st.a[step.key];
        if (!v) return;
        if (v.proGast && (nV || nB)) proG(TR(v, "label"), +v.proGast);
        else if (+v.preis) dazu(TR(v, "label"), +v.preis);
      });
      steps.forEach(function (step) {
        if (step.typ !== "mehrfach") return;
        var sel = st.m[step.key] || {};
        (step.optionen || []).forEach(function (o, j) {
          if (!sel[j]) return;
          if (o.proGast && (nV || nB)) { proG(TR(o, "label"), +o.proGast); return; }
          if (+o.preis) dazu(TR(o, "label"), +o.preis);
        });
      });
      /* DJ, Floristik & Co.: Preise kommen aus den Antworten, dazu Anfahrt, Generator und Mindestbetrag */
      if (AU && s > 0) {
        var km2 = st.a.__km || 0, fahrt2 = km2 && AU.kmPreis ? Math.round(km2 * 2 * AU.kmPreis) : 0;
        if (fahrt2) { rows.push(["Anfahrt · ca. " + km2 + " km, hin und zurück", fahrt2]); s += fahrt2; sV += fahrt2; sB += fahrt2; }
        var ohne2 = AU.ohneStrom && steps.some(function (sp) { var v = st.a[sp.key]; return v && /kein strom/i.test(v.label || ""); });
        if (ohne2) { rows.push(["Generator, kein Strom vor Ort", +AU.ohneStrom]); s += +AU.ohneStrom; sV += +AU.ohneStrom; sB += +AU.ohneStrom; }
        if (+AU.minUmsatz && s < +AU.minUmsatz) { rows.push(["Mindestbetrag " + eur(AU.minUmsatz) + ", Differenz", AU.minUmsatz - s]); s = +AU.minUmsatz; }
        if (+AU.minUmsatz) { sV = Math.max(sV, +AU.minUmsatz); sB = Math.max(sB, +AU.minUmsatz); }
      }
      /* Uhrzeit-Termine: feste Preise, deshalb genau. Sonst ein Richtwert, auf 50 € gerundet. */
      var spanne = !tmForm() && Math.round(sV / 50) !== Math.round(sB / 50);
      return { rows: rows, sum: tmForm() ? Math.round(s * 100) / 100 : Math.round(s / 50) * 50, von: spanne ? Math.round(sV / 50) * 50 : undefined, bis: spanne ? Math.round(sB / 50) * 50 : undefined };
    }

    function dateKey() {
      for (var i = 0; i < steps.length; i++) if (steps[i].typ === "datum") return steps[i].key;
      return "__kein";
    }

    function kalender(key, sel) {
      var offen = st.open === key;
      var head = '<div class="picker' + (offen ? " open" : "") + '">' +
        '<button class="tgl" data-tgl="' + esc(key) + '">' + (sel ? "<span>" + deDate(sel) + "</span>" : '<span class="ph">' + t("datumWaehlen") + '</span>') + "<i>▾</i></button>";
      if (!offen) return head + "</div>";
      var today = new Date(); today.setHours(0, 0, 0, 0);
      if (!st.cal) st.cal = { y: today.getFullYear(), m: today.getMonth() };
      var first = new Date(st.cal.y, st.cal.m, 1), start = (first.getDay() + 6) % 7, days = new Date(st.cal.y, st.cal.m + 1, 0).getDate();
      var cells = "";
      for (var i = 0; i < start; i++) cells += '<span class="day off"></span>';
      for (var n = 1; n <= days; n++) {
        var d = new Date(st.cal.y, st.cal.m, n), s = iso(d), cls, dis = "";
        if (d < today) { cls = "past"; dis = " disabled"; }
        else if (istBelegt(d)) { cls = "busy"; dis = " disabled"; }
        else cls = "free";
        if (s === sel) cls += " sel";
        if (cls === "busy" && PN_FREI.length && !(st.wl && st.wl.key === key)) {
          cells += '<button class="day busy pnd' + (st.pn && st.pn.tag === s ? ' pnon' : '') + '" data-pnday="' + s + '" data-k="' + key + '" aria-label="' + deDate(s) + ", " + t("vergeben") + '">' + n + "</button>"; continue;
        }
        if (cls === "busy" && st.wl && st.wl.key === key && !st.wl.datum) {
          cells += '<button class="day busy wlp" data-wlday="' + s + '">' + n + "</button>"; continue;
        }
        cells += '<button class="day ' + cls + '" data-day="' + s + '" data-k="' + key + '"' + dis + ' aria-label="' + deDate(s) + ", " + t(cls.indexOf("busy") >= 0 ? "vergeben" : cls.indexOf("past") >= 0 ? "vorbei" : "frei") + '"' + (s === sel ? ' aria-pressed="true"' : "") + ">" + n + "</button>";
      }
      var prevOff = (st.cal.y === today.getFullYear() && st.cal.m <= today.getMonth()) ? " disabled" : "";
      var years = "";
      for (var yy = today.getFullYear(); yy <= today.getFullYear() + 4; yy++) years += '<option value="' + yy + '"' + (yy === st.cal.y ? " selected" : "") + ">" + yy + "</option>";
      return head + '<div class="cal"><div class="ch">' +
        '<button class="cn" data-cal="-1"' + prevOff + ' aria-label="' + t("vorMonat") + '">‹</button>' +
        "<b>" + t("mn")[st.cal.m] + "</b>" +
        '<select class="yr" data-year="1" aria-label="' + t("jahr") + '">' + years + "</select>" +
        '<button class="cn" data-cal="1" aria-label="' + t("naechMonat") + '">›</button></div>' +
        '<div class="grid">' + t("wkM").map(function (w) { return '<span class="wd">' + w + "</span>"; }).join("") + cells + "</div>" +
        '<div class="leg"><span><i class="fr"></i>' + t("frei") + '</span><span><i class="bu"></i>' + t("legBusy") + '</span></div></div></div>';
    }

    /* Pflicht oder freiwillig? Freitext und Mehrfachauswahl sind immer
       freiwillig — dort kann man nichts falsch machen. Alles andere muss der
       Gast beantworten und trägt darum ein Sternchen. Eine Stelle für diese
       Regel, damit Kennzeichnung und Prüfung nie auseinanderlaufen. */
    function mussFrage(s) {
      if (s.typ === "termin") return true;
      if (s.typ === "text") return !!s.pflicht;
      return !(s.optional || s.typ === "mehrfach");
    }
    function istLeer(s) {
      if (s.typ === "termin") return !tmFertig(s.key);
      if (s.typ === "datum" || s.typ === "text") return !String(st.a[s.key] || "").trim();
      return !st.a[s.key + "_l"];
    }

    /* ── Uhrzeit-Termine ─────────────────────────────────────── */
    var WK = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    function tmState(k) { return st.t[k] || (st.t[k] = { pers: [{}], akt: 0, woche: 0 }); }
    function tmFertig(k) {
      var T = st.t[k]; if (!T || !T.pers.length) return false;
      if (saAn()) return saFertig(T);
      return T.pers.every(function (P) {
        if (P.l == null) return false;
        if (tmBer(P)) return true;
        if (tmHaar(TC.leistungen[P.l]) && P.h == null) return false;
        return P.p && P.d && P.z && (TC.gefuehrt === false || P.wer);
      });
    }
    function tmName(id) { for (var i = 0; i < TC.personal.length; i++) if (TC.personal[i].id === id) return TC.personal[i].name; return ""; }
    function tmMin(z) { var p = z.split(":"); return +p[0] * 60 + +p[1]; }
    /* Leistung mit Zuschlag je Haarlänge: zuschlag = [mittel, lang, sehr dick] in Minuten */
    function tmHaar(l) { return !!(l && !l.beratung && Array.isArray(l.zuschlag) && l.zuschlag.some(function (x) { return +x > 0; })); }
    function tmDauer(P) { if (saAn()) return saRechnen(P).d || 30; var l = TC.leistungen[P.l] || {}; return (+l.dauer || 30) + (tmHaar(l) && P.h > 0 ? (+l.zuschlag[P.h - 1] || 0) : 0); }
    /* Leistung „nur nach Beratung“: keine feste Zeit, sondern Fotos und Wunschtag */
    function tmBer(P) { if (saAn()) return false; var l = TC.leistungen[P.l]; return !!(l && l.beratung); }
    /* Leistungen mit „fuer“ (damen, herren, kinder). Ab zwei Gruppen fragt das Formular zuerst „Für wen?“
       und zeigt danach nur die passenden Leistungen und die für alle. */
    var GRP = ["damen", "herren", "kinder"];
    /* G statt GRP: tmGruppen läuft schon beim ersten Zeichnen, bevor die Zeile mit GRP erreicht ist */
    function tmGruppen() { var g = {}, G = ["damen", "herren", "kinder"]; TC.leistungen.forEach(function (l) { if (l && G.indexOf(l.fuer) >= 0) g[l.fuer] = 1; }); var r = G.filter(function (x) { return g[x]; }); return r.length > 1 ? r : []; }
    function tmPasst(x, P) { return !P.g || !x.fuer || x.fuer === P.g; }
    function gruppeHTML(ek, wahl) {
      var gross = wahl === null;
      return '<div class="tm-block"><label class="lbl">' + esc(t("gruppeFrage")) + '</label><div class="tm-chips' + (gross ? " tm-gross" : "") + '">' + tmGruppen().map(function (g) {
        var on = !gross && wahl === g;
        return '<button class="tm-chip' + (on ? " on" : "") + '"' + (gross ? "" : ' aria-pressed="' + on + '"') + ek + ' data-tmgr="' + g + '">' + esc(t("gruppe")[g]) + "</button>";
      }).join("") + "</div></div>";
    }
    function tmKlein(l) { return "<small>" + (l.beratung ? t("bertLabel") : (l.dauer || 30) + " " + t("min")) + (l.preis ? " · " + eur(l.preis) : "") + "</small>"; }
    function haarHTML(P, ek) {
      var l = TC.leistungen[P.l] || {};
      return '<div class="tm-block"><label class="lbl">' + t("haarFrage") + '</label><div class="tm-chips tm-gross">' + t("haar").map(function (x, i) {
        var m = (+l.dauer || 30) + (i > 0 ? (+l.zuschlag[i - 1] || 0) : 0);
        return '<button class="tm-chip' + (P.h === i ? " on" : "") + '" aria-pressed="' + (P.h === i) + '"' + ek + ' data-tmh="' + i + '">' + esc(x) + "<small>" + t("ca") + " " + m + " " + t("min") + "</small></button>";
      }).join("") + "</div></div>";
    }
    function beratungHTML(k, P, ek) {
      var f = P.fotos || [];
      var h = '<div class="tm-block"><div class="hint"><b>' + t("bertH") + "</b>" + esc(t("bertText")) + "</div></div>";
      h += '<div class="tm-block"><label class="lbl">' + t("fotoLbl") + '</label><div class="tm-fotos">' + f.map(function (u, i) {
        return '<span class="tm-foto" style="background-image:url(\'' + u + '\')"><button type="button"' + ek + ' data-tmfx="' + i + '" aria-label="' + t("fotoWeg") + '">×</button></span>';
      }).join("") + (f.length < 3 ? '<label class="tm-fotoadd">' + t("fotoKnopf") + '<input type="file" accept="image/*" multiple data-tmf="' + esc(k) + '"></label>' : "") +
        '</div><div class="tm-leer">' + t("fotoHinweis") + "</div></div>";
      h += '<div class="tm-block"><label class="lbl">' + t("wunschtag") + '</label><input type="date" class="tm-wd" data-tmwd="' + esc(k) + '" min="' + iso(new Date()) + '" value="' + esc(P.wd || "") + '"></div>';
      h += '<div class="tm-block"><label class="lbl">' + t("tageszeit") + '</label><div class="tm-chips">' + ["vormittags", "nachmittags", "abends"].map(function (z) {
        return '<button class="tm-chip' + (P.tz === z ? " on" : "") + '" aria-pressed="' + (P.tz === z) + '"' + ek + ' data-tmtz="' + z + '">' + t("tz")[z] + "</button>";
      }).join("") + "</div></div>";
      return h;
    }
    /* Foto verkleinern (höchstens 1000 px, JPEG) — spart Datenvolumen und bleibt unter der Größengrenze */
    function fotoKlein(f, fertig) {
      if (!f || !/^image\//.test(f.type || "image/")) return fertig(null);
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement("canvas"), d = "";
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        try { c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); d = c.toDataURL("image/jpeg", 0.72); } catch (x) {}
        URL.revokeObjectURL(url); fertig(d.indexOf("data:image/jpeg") === 0 ? d : null);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fertig(null); };
      img.src = url;
    }
    function tmText(P) {
      if (saAn()) {
        var wer2 = P.p === "egal" ? (P.pz ? tmName(P.pz) : "") : tmName(P.p), nm = saRechnen(P).po.filter(function (x) { return !x.w; }).map(function (x) { return x.n; });
        return (P.d ? deDate(P.d) : "") + (P.z ? " · " + t("uhr")(P.z) : "") + (wer2 ? " · " + wer2 : "") + (nm.length ? " · " + nm.join(" + ") : "");
      }
      var l = TC.leistungen[P.l] || {};
      if (l.beratung) return TR(l, "name") + " · " + t("bertKurz") + (P.wd ? " · " + deDate(P.wd) : "") + (P.tz ? " · " + t("tz")[P.tz] : "");
      var wer = P.p === "egal" ? (P.pz ? tmName(P.pz) : "") : tmName(P.p);
      return deDate(P.d) + " · " + t("uhr")(P.z) + (wer ? " · " + wer : "") + (l.name ? " · " + TR(l, "name") : "") + (tmHaar(l) && P.h != null ? " · " + t("haarKurz") + ": " + t("haar")[P.h] : "");
    }
    function tmLaden(d, dauer) {
      var key = d + "|" + dauer;
      if (SL[key]) return;
      if (VORSCHAU) {
        var z = [], wd = parseISO(d).getDay();
        for (var m = 540; m + dauer <= (wd === 6 ? 840 : 1080); m += (+TC.raster || 15)) if ((m / 15 + wd) % 4) z.push({ z: pad(Math.floor(m / 60)) + ":" + pad(m % 60), p: ["a", "b"] });
        SL[key] = { status: "ok", zeiten: z }; return;
      }
      SL[key] = { status: "laden" };
      fetch(API + "/termine?aktion=frei&widget=" + encodeURIComponent(widget) + "&datum=" + d + "&dauer=" + dauer)
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { SL[key] = { status: "ok", zeiten: j.zeiten || [] }; render(); })
        .catch(function () { SL[key] = { status: "fehler" }; render(); });
    }
    /* Freie Zeiten für die gerade gewählte Person — ohne die Zeiten, die eine
       andere Person derselben Anfrage schon beim selben Mitarbeiter belegt. */
    function tmFreie(k, idx) {
      var T = tmState(k), P = T.pers[idx], l = TC.leistungen[P.l];
      if (!l || !P.d || !P.p) return null;
      var dauer = tmDauer(P), key = P.d + "|" + dauer;
      tmLaden(P.d, dauer);
      var c = SL[key];
      if (!c || c.status !== "ok") return c ? c.status : "laden";
      var liste = c.zeiten.map(function (x) { return { z: x.z, p: x.p.slice() }; });
      T.pers.forEach(function (O, j) {
        if (j === idx || !O.z || O.d !== P.d || tmBer(O)) return;
        var oid = O.p === "egal" ? O.pz : O.p, od = tmDauer(O);
        if (!oid) return;
        var a = tmMin(O.z), b = a + od;
        liste.forEach(function (x) { var s2 = tmMin(x.z); if (s2 < b && s2 + dauer > a) x.p = x.p.filter(function (id) { return id !== oid; }); });
      });
      return liste.filter(function (x) { return P.p === "egal" ? x.p.length : x.p.indexOf(P.p) >= 0; });
    }
    function terminHTML(s) {
      var k = s.key, T = tmState(k), P = T.pers[T.akt] || (T.pers[T.akt] = {});
      if (!TC.personal.length || !TC.leistungen.length) return '<div class="hint">' + t("tmSetup") + '</div>';
      if (TC.personal.length === 1) P.p = TC.personal[0].id;
      if (TC.leistungen.length === 1 && P.l == null) P.l = 0;
      var ek = ' data-tk="' + esc(k) + '"';
      var h = "";
      if (T.pers.length > 1) {
        h += '<div class="tm-tabs">' + T.pers.map(function (Q, i) {
          return '<button class="tm-tab' + (i === T.akt ? " on" : "") + '"' + ek + ' data-tmt="' + i + '">' + (Q.n ? esc(Q.n) : t("person") + " " + (i + 1)) + (Q.z ? " ✓" : "") +
            (i > 0 ? '<span class="x" data-tmx="' + i + '" aria-label="' + t("personWeg") + '">×</span>' : "") + "</button>";
        }).join("") + "</div>";
        if (T.akt > 0) h += '<div class="tm-name"><label class="lbl">' + t("fuerWen") + '</label><input data-tmn="' + esc(k) + '" value="' + esc(P.n || "") + '" placeholder="' + t("nameFrei") + '"></div>';
      }
      if (saAn()) return h + saGefuehrt(s, k, T, P, ek);
      if (TC.gefuehrt !== false) return h + tmGefuehrt(s, k, T, P, ek);
      if (tmGruppen().length) { h += gruppeHTML(ek, P.g || ""); if (!P.g) return h; }
      if (TC.leistungen.length > 1) h += '<div class="tm-block"><label class="lbl">' + esc(TR(s, "fLeistung") || t("wasDarf")) + '</label><div class="tm-chips">' + TC.leistungen.map(function (l, i) {
        return tmPasst(l, P) ? '<button class="tm-chip' + (P.l === i ? " on" : "") + '" aria-pressed="' + (P.l === i) + '"' + ek + ' data-tml="' + i + '">' + esc(TR(l, "name")) + tmKlein(l) + "</button>" : "";
      }).join("") + "</div></div>";
      if (P.l == null) return h;
      if (tmBer(P)) return h + beratungHTML(k, P, ek);
      if (tmHaar(TC.leistungen[P.l])) { h += haarHTML(P, ek); if (P.h == null) return h; }
      if (TC.personal.length > 1) {
        h += '<div class="tm-block"><label class="lbl">' + esc(TR(s, "fWer") || t("beiWem")) + '</label><div class="tm-chips">' +
          '<button class="tm-chip' + (P.p === "egal" ? " on" : "") + '" aria-pressed="' + (P.p === "egal") + '"' + ek + ' data-tmp="egal">' + t("egal") + '<small>' + t("ersterFrei") + '</small></button>' +
          TC.personal.map(function (m) { return '<button class="tm-chip' + (P.p === m.id ? " on" : "") + '" aria-pressed="' + (P.p === m.id) + '"' + ek + ' data-tmp="' + esc(m.id) + '">' + esc(m.name) + "</button>"; }).join("") +
          "</div></div>";
      }
      if (!P.p) return h;
      var arbeitet = function (d) {
        var wd = d.getDay();
        return TC.personal.some(function (m) { return (P.p === "egal" || m.id === P.p) && (m.tage || []).indexOf(wd) >= 0; });
      };
      var heute = new Date(); heute.setHours(0, 0, 0, 0);
      var maxW = Math.max(0, Math.ceil((TC.tage || 42) / 7) - 1);
      var start = new Date(heute); start.setDate(start.getDate() + T.woche * 7);
      var tage = "";
      for (var i = 0; i < 7; i++) {
        var d = new Date(start); d.setDate(start.getDate() + i);
        var di = iso(d), zu = istBelegt(d) || !arbeitet(d) || (d - heute) / 864e5 > (TC.tage || 42);
        tage += '<button class="tm-day' + (P.d === di ? " on" : "") + '"' + ek + ' data-tmd="' + di + '" aria-label="' + deDate(di) + (zu ? t("nichtBuchbar") : "") + '" aria-pressed="' + (P.d === di) + '"' + (zu ? " disabled" : "") + "><small>" + t("wkS")[d.getDay()] + "</small>" + d.getDate() + "</button>";
      }
      h += '<div class="tm-block"><label class="lbl">' + t("welcherTag") + '</label><div class="tm-mon">' +
        '<button class="cn"' + ek + ' data-tmw="-1"' + (T.woche ? "" : " disabled") + ' aria-label="' + t("frueher") + '">‹</button><b>' + t("mn")[start.getMonth()] + " " + start.getFullYear() + "</b>" +
        '<button class="cn"' + ek + ' data-tmw="1"' + (T.woche < maxW ? "" : " disabled") + ' aria-label="' + t("spaeter") + '">›</button></div>' +
        '<div class="tm-days">' + tage + "</div></div>";
      if (!P.d) return h;
      var fr = tmFreie(k, T.akt);
      h += '<div class="tm-block"><label class="lbl">' + t("uhrzeit") + '</label>';
      if (fr === "laden" || fr === null) h += '<div class="tm-leer">' + t("laden") + '</div>';
      else if (fr === "fehler") h += '<div class="tm-leer">' + t("ladeFehler") + '</div>';
      else if (!fr.length) h += '<div class="tm-leer">' + t("nichtsFrei")(P.p === "egal" ? "" : esc(tmName(P.p))) + "</div>" +
        (st.wl && st.wl.key === k && st.wl.datum === P.d ? wlHTML(k, P.d, P.p) : (WL_OK ? '<button class="wl-link" data-wlt="' + esc(k) + '">' + t("wlTag") + '</button>' : ""));
      else h += '<div class="tm-zeiten">' + fr.map(function (x) {
        return '<button class="tm-z' + (P.z === x.z ? " on" : "") + '" aria-pressed="' + (P.z === x.z) + '" aria-label="' + t("uhr")(x.z) + '"' + ek + ' data-tmz="' + x.z + '" data-pz="' + esc(x.p[0]) + '">' + x.z + "</button>";
      }).join("") + "</div>";
      h += "</div>";
      if (P.z) h += '<div class="hint"><b>' + (T.pers.length > 1 ? (P.n ? esc(P.n) : t("person") + " " + (T.akt + 1)) + ": " : t("ihrTermin")) + "</b>" + esc(tmText(P)) + "</div>";
      /* Seit 13.10.2026 ein Termin je Anfrage: kein „+ Termin für eine weitere Person“ mehr. */
      return h;
    }
    /* Geführte Buchung: eine Frage pro Bildschirm — Leistung (falls mehrere), Tag, Uhrzeit, dann wer frei ist. */
    function tmGefuehrt(s, k, T, P, ek) {
      if (TC.personal.length === 1) { P.p = TC.personal[0].id; P.wer = true; }
      else if (!P.wer) P.p = "egal";
      var h = "", l = TC.leistungen[P.l], teile = [];
      if (P.g && tmGruppen().length) teile.push(t("gruppe")[P.g]);
      if (TC.leistungen.length > 1 && l) teile.push(TR(l, "name"));
      if (tmHaar(l) && P.h != null) teile.push(t("haar")[P.h]);
      if (P.d) teile.push(deDate(P.d));
      if (P.z) teile.push(t("uhr")(P.z));
      if (P.wer && TC.personal.length > 1) teile.push(P.p === "egal" ? tmName(P.pz) || t("egal") : tmName(P.p));
      if (teile.length) h += '<div class="tm-sumz"><button class="tm-zur"' + ek + ' data-tmb="1" aria-label="' + t("zurueckK") + '">‹</button><span>' + esc(teile.join(" · ")) + "</span></div>";
      if (P.l == null && !P.g && tmGruppen().length) return h + gruppeHTML(ek, null);
      if (TC.leistungen.length > 1 && P.l == null) {
        return h + '<div class="tm-block"><label class="lbl">' + esc(TR(s, "fLeistung") || t("wasDarf")) + '</label><div class="tm-chips tm-gross">' + TC.leistungen.map(function (x, i) {
          return tmPasst(x, P) ? '<button class="tm-chip"' + ek + ' data-tml="' + i + '">' + esc(TR(x, "name")) + tmKlein(x) + "</button>" : "";
        }).join("") + "</div></div>";
      }
      if (tmBer(P)) return h + beratungHTML(k, P, ek);
      if (tmHaar(l) && P.h == null) return h + haarHTML(P, ek);
      if (!P.d) {
        var heute = new Date(); heute.setHours(0, 0, 0, 0);
        var maxW = Math.max(0, Math.ceil((TC.tage || 42) / 7) - 1);
        var start = new Date(heute); start.setDate(start.getDate() + T.woche * 7);
        var tage = "";
        for (var i = 0; i < 7; i++) {
          var d = new Date(start); d.setDate(start.getDate() + i);
          var wd = d.getDay(), di = iso(d);
          var zu = istBelegt(d) || !TC.personal.some(function (m) { return (m.tage || []).indexOf(wd) >= 0; }) || (d - heute) / 864e5 > (TC.tage || 42);
          tage += '<button class="tm-day"' + ek + ' data-tmd="' + di + '" aria-label="' + deDate(di) + (zu ? t("nichtBuchbar") : "") + '"' + (zu ? " disabled" : "") + "><small>" + t("wkS")[wd] + "</small>" + d.getDate() + "</button>";
        }
        return h + '<div class="tm-block"><label class="lbl">' + t("welcherTag") + '</label><div class="tm-mon">' +
          '<button class="cn"' + ek + ' data-tmw="-1"' + (T.woche ? "" : " disabled") + ' aria-label="' + t("frueher") + '">‹</button><b>' + t("mn")[start.getMonth()] + " " + start.getFullYear() + "</b>" +
          '<button class="cn"' + ek + ' data-tmw="1"' + (T.woche < maxW ? "" : " disabled") + ' aria-label="' + t("spaeter") + '">›</button></div>' +
          '<div class="tm-days">' + tage + "</div></div>";
      }
      if (!P.z) {
        var fr = tmFreie(k, T.akt);
        h += '<div class="tm-block"><label class="lbl">' + t("uhrzeit") + '</label>';
        if (fr === "laden" || fr === null) h += '<div class="tm-leer">' + t("laden") + "</div>";
        else if (fr === "fehler") h += '<div class="tm-leer">' + t("ladeFehler") + "</div>";
        else if (!fr.length) h += '<div class="tm-leer">' + t("nichtsFrei")("") + "</div>" +
          (st.wl && st.wl.key === k && st.wl.datum === P.d ? wlHTML(k, P.d, "egal") : (WL_OK ? '<button class="wl-link" data-wlt="' + esc(k) + '">' + t("wlTag") + "</button>" : ""));
        else h += '<div class="tm-zeiten tm-alle">' + fr.map(function (x) {
          return '<button class="tm-z" aria-label="' + t("uhr")(x.z) + '"' + ek + ' data-tmz="' + x.z + '" data-pz="' + esc(x.p[0]) + '" data-pf="' + esc(x.p.join(",")) + '">' + x.z + "</button>";
        }).join("") + "</div>";
        return h + "</div>";
      }
      if (!P.wer) {
        var frei = (P.frei && P.frei.length ? P.frei : TC.personal.map(function (m) { return m.id; }));
        return h + '<div class="tm-block"><label class="lbl">' + esc(TR(s, "fWer") || t("beiWem")) + '</label><div class="tm-chips tm-gross">' +
          (frei.length > 1 ? '<button class="tm-chip"' + ek + ' data-tmg="1" data-tmp="egal">' + t("egal") + "</button>" : "") +
          TC.personal.filter(function (m) { return frei.indexOf(m.id) >= 0; }).map(function (m) { return '<button class="tm-chip"' + ek + ' data-tmg="1" data-tmp="' + esc(m.id) + '">' + esc(m.name) + "</button>"; }).join("") +
          "</div></div>";
      }
      var tel = TC.telefon || (cfg.summary && cfg.summary.ansprechpartner && cfg.summary.ansprechpartner.kontakt) || "";
      h += '<div class="hint"><b>' + t("ihrTermin") + "</b>" + esc(tmText(P)) + "</div>";
      h += '<div class="hint warn">' + esc(t("verbindlich")(tel)) + "</div>";
      return h;
    }
    /* ── Inhaltsverzeichnis mit runden Kacheln (seit 08.10.2026) ──────────────
       Schalter: termin.salon.an (Cockpit → Termine → Leistungen & Regeln; Vorlagen „Friseur Damen & Herren“ und „Kosmetikstudio“).
       Ablauf: Tag → Für wen (wenn Leistungen „fuer“ haben; mit salon.reihe = "leistung" kommen Tag und Uhrzeit erst nach den Leistungen, siehe saErst) → Kacheln je Kategorie (l.kat; je Kategorie eine Leistung, insgesamt mehrere)
       → Ihre Haare (nur wenn eine gewählte Leistung l.haar oder l.farbe hat) → freie Uhrzeit für die ganze Dauer → Mitarbeiter → Übersicht.
       Zuschläge in Prozent auf Zeit und Preis: TC.salon.z[id] = [Zeit %, Preis %]. l.waschen bringt „Waschen & Föhnen“ mit.
       Dieselbe Rechnung macht der Server (lib/_termine.js salonRechnen) und reserviert danach genau diese Dauer. */
    /* Daten erst beim ersten Aufruf anlegen: Das Formular zeichnet schon, bevor diese Zeilen ausgeführt sind. */
    var SA_LAENGE, SA_STRUKTUR, SA_FARBE, SA_T;
    function saDaten() {
      if (SA_T) return;
      SA_LAENGE = ["kurz", "schulter", "lang"]; SA_STRUKTUR = ["lockig", "dick", "duenn", "fein"]; SA_FARBE = ["blond", "hellbraun", "dunkelbraun", "schwarz", "rot", "grau"];
      SA_T = {
      de: { tippen: "Tippen Sie auf eine Kachel. Mehrere Leistungen sind möglich.", angebote: "Angebote", leistung1: "Leistung", leistungen: "Leistungen", weiter: "Weiter", laenge: "Wie lang sind Ihre Haare?", l_kurz: "Kurz", l_schulter: "Schulterlang", l_lang: "Lang", struktur: "Wie sind Ihre Haare? (freiwillig)", s_lockig: "Lockig", s_dick: "Dick", s_duenn: "Dünn", s_fein: "Fein", farbe: "Welche Haarfarbe haben Sie jetzt?", f_blond: "Blond", f_hellbraun: "Hellbraun", f_dunkelbraun: "Dunkelbraun", f_schwarz: "Schwarz", f_rot: "Rot", f_grau: "Grau", vor: "Sind Ihre Haare schon gefärbt oder blondiert?", ja: "Ja", nein: "Nein", vorK: "schon gefärbt", std: "Std.", dauer: "Dauer", ab: "ab", waschen: "Waschen & Föhnen", schaetz: "Alle Preise und Zeiten sind Schätzungen. Den genauen Preis berechnet der Salon vor Ort, je nach Haar und Aufwand.", schaetz2: "Alle Preise und Zeiten sind Schätzungen. Den genauen Preis erfahren Sie vor Ort.", zeitFuer: "Freie Zeiten für ca. ", wasMoechten: "Was möchten Sie buchen?", tippen1: "Tippen Sie auf eine Behandlung. Danach sehen Sie die Angebote mit Preis.", alleKat: "Alle Behandlungen",
        wimFrage1: "Wann war Ihr letztes Auffüllen?", w_2: "Vor bis zu 2 Wochen", w_3: "Vor 3 Wochen", w_4: "Vor 4 Wochen", w_5: "Vor 5 Wochen oder länger", w_99: "Bei einem anderen Studio oder weiß nicht",
        wimFrage2: "Wie viele Wimpern sind noch da?", p_90: "Fast alle (über 80 %)", p_70: "Etwa 60 bis 80 %", p_50: "Etwa 40 bis 60 %", p_30: "Weniger als 40 %",
        wimText: "Beschreiben Sie kurz Ihre Wimpern", wimPh: "z. B. außen fehlen einige, links weniger als rechts", wimFotoW: "Fotos Ihrer Augen (freiwillig, bis zu 3)", wimFotoH: "Am besten von vorn und von der Seite, bei Tageslicht, ohne Mascara.",
        wimWa: "Bitte schicken Sie nach dem Absenden ein Foto Ihrer Augen per WhatsApp. Den Knopf dafür sehen Sie gleich.",
        neuH: "Voraussichtlich ein neues Set", neuT: "Nach Ihren Angaben ist vermutlich ein neues Set nötig ({n}). Die Zeit dafür planen wir ein. Den Preis bestätigen wir, wenn wir Ihre Wimpern gesehen haben.", neuKlein: "Kann ein neues Set werden: {n}",
        waFoto: "Fotos per WhatsApp schicken", waFotoText: "Hallo, hier sind Fotos meiner Wimpern für meinen Termin {w}. Viele Grüße{vn}",
        limitH: "Schon genug Anfragen von diesem Gerät", limitT: "Von diesem Gerät sind höchstens {n} Anfragen am Tag möglich. Morgen geht es wieder. Bei einer Frage rufen Sie gern direkt an.", anrufen2: "Anrufen" },
      en: { tippen: "Tap a tile. You can choose several services.", angebote: "options", leistung1: "service", leistungen: "services", weiter: "Next", laenge: "How long is your hair?", l_kurz: "Short", l_schulter: "Shoulder-length", l_lang: "Long", struktur: "What is your hair like? (optional)", s_lockig: "Curly", s_dick: "Thick", s_duenn: "Thin", s_fein: "Fine", farbe: "What is your current hair colour?", f_blond: "Blonde", f_hellbraun: "Light brown", f_dunkelbraun: "Dark brown", f_schwarz: "Black", f_rot: "Red", f_grau: "Grey", vor: "Is your hair already coloured or bleached?", ja: "Yes", nein: "No", vorK: "already coloured", std: "hrs", dauer: "Duration", ab: "from", waschen: "Wash & blow-dry", schaetz: "All prices and times are estimates. The salon will calculate the exact price on site, depending on your hair and the work involved.", schaetz2: "All prices and times are estimates. You will get the exact price on site.", zeitFuer: "Free times for approx. ", wasMoechten: "What would you like to book?", tippen1: "Tap a treatment to see the options and prices.", alleKat: "All treatments",
        wimFrage1: "When was your last infill?", w_2: "Up to 2 weeks ago", w_3: "3 weeks ago", w_4: "4 weeks ago", w_5: "5 weeks ago or longer", w_99: "At another studio or not sure",
        wimFrage2: "How many lashes are still there?", p_90: "Almost all (over 80 %)", p_70: "About 60 to 80 %", p_50: "About 40 to 60 %", p_30: "Less than 40 %",
        wimText: "Briefly describe your lashes", wimPh: "e.g. some missing on the outside, fewer on the left", wimFotoW: "Photos of your eyes (optional, up to 3)", wimFotoH: "Ideally from the front and the side, in daylight, without mascara.",
        wimWa: "After sending, please send a photo of your eyes via WhatsApp. You will see the button in a moment.",
        neuH: "Probably a new set", neuT: "Based on your answers a new set is probably needed ({n}). We will plan the time for it. We confirm the price once we have seen your lashes.", neuKlein: "May become a new set: {n}",
        waFoto: "Send photos via WhatsApp", waFotoText: "Hello, here are photos of my lashes for my appointment {w}. Kind regards{vn}",
        limitH: "Enough requests from this device", limitT: "This device can send at most {n} requests per day. Please try again tomorrow, or simply call us.", anrufen2: "Call" },
      sq: { tippen: "Prekni një pllakë. Mund të zgjidhni disa shërbime.", angebote: "oferta", leistung1: "shërbim", leistungen: "shërbime", weiter: "Vazhdo", laenge: "Sa të gjatë i keni flokët?", l_kurz: "Të shkurtër", l_schulter: "Deri te supet", l_lang: "Të gjatë", struktur: "Si janë flokët tuaj? (opsionale)", s_lockig: "Kaçurrela", s_dick: "Të dendur", s_duenn: "Të rrallë", s_fein: "Të imët", farbe: "Çfarë ngjyre flokësh keni tani?", f_blond: "Bjonde", f_hellbraun: "Kafe e çelët", f_dunkelbraun: "Kafe e errët", f_schwarz: "E zezë", f_rot: "E kuqe", f_grau: "E thinjur", vor: "A janë flokët tuaj të lyer ose të zbardhur?", ja: "Po", nein: "Jo", vorK: "të lyer më parë", std: "orë", dauer: "Kohëzgjatja", ab: "nga", waschen: "Larje & tharje", schaetz: "Të gjitha çmimet dhe kohët janë vlerësime. Çmimin e saktë e llogarit salloni në vend, sipas flokëve dhe punës.", schaetz2: "Të gjitha çmimet dhe kohët janë vlerësime. Çmimin e saktë do ta mësoni në vend.", zeitFuer: "Orare të lira për rreth ", wasMoechten: "Çfarë dëshironi të rezervoni?", tippen1: "Prekni një trajtim për të parë ofertat dhe çmimet.", alleKat: "Të gjitha trajtimet" },
      fr: { tippen: "Touchez une vignette. Vous pouvez choisir plusieurs prestations.", angebote: "offres", leistung1: "prestation", leistungen: "prestations", weiter: "Continuer", laenge: "Quelle est la longueur de vos cheveux ?", l_kurz: "Courts", l_schulter: "Aux épaules", l_lang: "Longs", struktur: "Comment sont vos cheveux ? (facultatif)", s_lockig: "Bouclés", s_dick: "Épais", s_duenn: "Peu épais", s_fein: "Fins", farbe: "Quelle est votre couleur actuelle ?", f_blond: "Blonds", f_hellbraun: "Châtain clair", f_dunkelbraun: "Châtain foncé", f_schwarz: "Noirs", f_rot: "Roux", f_grau: "Gris", vor: "Vos cheveux sont-ils déjà colorés ou décolorés ?", ja: "Oui", nein: "Non", vorK: "déjà colorés", std: "h", dauer: "Durée", ab: "à partir de", waschen: "Shampoing & brushing", schaetz: "Tous les prix et durées sont des estimations. Le salon calcule le prix exact sur place, selon vos cheveux et le travail.", schaetz2: "Tous les prix et durées sont des estimations. Le prix exact vous sera communiqué sur place.", zeitFuer: "Créneaux libres pour env. ", wasMoechten: "Que souhaitez-vous réserver ?", tippen1: "Touchez un soin pour voir les offres et les prix.", alleKat: "Tous les soins" },
      it: { tippen: "Tocchi una casella. Può scegliere più servizi.", angebote: "offerte", leistung1: "servizio", leistungen: "servizi", weiter: "Avanti", laenge: "Quanto sono lunghi i Suoi capelli?", l_kurz: "Corti", l_schulter: "Alle spalle", l_lang: "Lunghi", struktur: "Come sono i Suoi capelli? (facoltativo)", s_lockig: "Ricci", s_dick: "Folti", s_duenn: "Radi", s_fein: "Sottili", farbe: "Di che colore sono ora i Suoi capelli?", f_blond: "Biondi", f_hellbraun: "Castano chiaro", f_dunkelbraun: "Castano scuro", f_schwarz: "Neri", f_rot: "Rossi", f_grau: "Grigi", vor: "I Suoi capelli sono già tinti o decolorati?", ja: "Sì", nein: "No", vorK: "già tinti", std: "h", dauer: "Durata", ab: "da", waschen: "Shampoo e piega", schaetz: "Tutti i prezzi e i tempi sono stime. Il prezzo esatto lo calcola il salone sul posto, in base ai capelli e al lavoro.", schaetz2: "Tutti i prezzi e i tempi sono stime. Il prezzo esatto Le sarà comunicato sul posto.", zeitFuer: "Orari liberi per circa ", wasMoechten: "Cosa desidera prenotare?", tippen1: "Tocchi un trattamento per vedere offerte e prezzi.", alleKat: "Tutti i trattamenti" },
      es: { tippen: "Toque una casilla. Puede elegir varios servicios.", angebote: "opciones", leistung1: "servicio", leistungen: "servicios", weiter: "Continuar", laenge: "¿Qué largo tiene su cabello?", l_kurz: "Corto", l_schulter: "Por los hombros", l_lang: "Largo", struktur: "¿Cómo es su cabello? (opcional)", s_lockig: "Rizado", s_dick: "Grueso", s_duenn: "Escaso", s_fein: "Fino", farbe: "¿De qué color es su cabello ahora?", f_blond: "Rubio", f_hellbraun: "Castaño claro", f_dunkelbraun: "Castaño oscuro", f_schwarz: "Negro", f_rot: "Pelirrojo", f_grau: "Canoso", vor: "¿Su cabello ya está teñido o decolorado?", ja: "Sí", nein: "No", vorK: "ya teñido", std: "h", dauer: "Duración", ab: "desde", waschen: "Lavado y secado", schaetz: "Todos los precios y tiempos son estimaciones. El salón calcula el precio exacto en el local, según su cabello y el trabajo.", schaetz2: "Todos los precios y tiempos son estimaciones. El precio exacto se lo darán en el local.", zeitFuer: "Horas libres para aprox. ", wasMoechten: "¿Qué le gustaría reservar?", tippen1: "Toque un tratamiento para ver las opciones y precios.", alleKat: "Todos los tratamientos" },
      tr: { tippen: "Bir kutucuğa dokunun. Birden fazla hizmet seçebilirsiniz.", angebote: "seçenek", leistung1: "hizmet", leistungen: "hizmet", weiter: "Devam", laenge: "Saçınız ne uzunlukta?", l_kurz: "Kısa", l_schulter: "Omuz hizası", l_lang: "Uzun", struktur: "Saçınız nasıl? (isteğe bağlı)", s_lockig: "Kıvırcık", s_dick: "Kalın", s_duenn: "Seyrek", s_fein: "İnce", farbe: "Şu anki saç renginiz nedir?", f_blond: "Sarı", f_hellbraun: "Açık kahve", f_dunkelbraun: "Koyu kahve", f_schwarz: "Siyah", f_rot: "Kızıl", f_grau: "Gri", vor: "Saçınız daha önce boyandı veya açıldı mı?", ja: "Evet", nein: "Hayır", vorK: "daha önce boyalı", std: "sa.", dauer: "Süre", ab: "en az", waschen: "Yıkama & fön", schaetz: "Tüm fiyatlar ve süreler tahminidir. Kesin fiyatı salon, saçınıza ve işçiliğe göre yerinde hesaplar.", schaetz2: "Tüm fiyatlar ve süreler tahminidir. Kesin fiyatı yerinde öğrenirsiniz.", zeitFuer: "Yaklaşık şu süre için boş saatler: ", wasMoechten: "Ne rezerve etmek istersiniz?", tippen1: "Seçenekleri ve fiyatları görmek için bir işleme dokunun.", alleKat: "Tüm işlemler" }
      };
    }
    function sa(k) { saDaten(); var o = SA_T[LANG] || SA_T.de; return o[k] != null ? o[k] : SA_T.de[k]; }
    /* Seit 21.10.2026: Ohne eigene Einstellung läuft jedes Termin-Formular wie Uncle’s Salon (blank): zuerst die Leistung als runde Kacheln, dann Tag, Uhrzeit, Mitarbeiter. */
    function saAn() { saDaten(); if (TC && TC.leistungen && !TC.salon) TC.salon = { an: true, hinweis: '', reihe: 'leistung', waschen: { an: false, name: 'Waschen & Föhnen', preis: 30, dauer: 30 }, z: {kurz:[0,0],schulter:[20,15],lang:[40,30],lockig:[20,10],dick:[20,10],duenn:[0,0],fein:[0,0],blond:[0,0],hellbraun:[0,0],dunkelbraun:[20,15],schwarz:[40,30],rot:[40,30],grau:[10,10],vor:[30,20]} }; return !!(TC && TC.salon && TC.salon.an); }
    /* termin.salon.reihe = "leistung": zuerst die Behandlung (Kacheln je Kategorie, dann die Angebote dieser Kategorie mit Preis), danach Tag und Uhrzeit.
       termin.salon.bild (und bildText) steht über den Kacheln. Sonst wie bisher: zuerst der Tag. */
    /* Längstes Wort im Kachel-Namen: die Schrift wird so klein, dass es ohne Trennstrich in den Kreis passt. */
    /* Kachel-Text passt auf jedem Gerät (seit 13.10.2026): Android hat breitere Schriften und kennt Silbentrennung oft nicht.
       Nach jedem Zeichnen wird die Schrift jeder Kachel so weit verkleinert (bis 9 px), dass Name und Preis ganz in den Kreis passen. */
    function saFit() {
      var ks = wrap && wrap.querySelectorAll(".sa-k"); if (!ks || !ks.length) return;
      for (var n = 0; n < ks.length; n++) {
        var k = ks[n], i = k.querySelector("i"), b = k.querySelector("b"), sm = k.querySelector("small"); if (!i || !b) continue;
        /* Erst ohne Trennung messen: sonst bricht der Browser lange Wörter um und es sieht aus, als passe alles. */
        [b, i].forEach(function (x) { x.style.fontSize = ""; x.style.hyphens = x.style.webkitHyphens = "manual"; x.style.overflowWrap = "normal"; x.style.wordBreak = "keep-all"; });
        if (sm) sm.style.fontSize = "";
        var cs = getComputedStyle(k), platzB = k.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), platzH = k.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        var g = parseFloat(getComputedStyle(b).fontSize) || 14, gs = sm ? parseFloat(getComputedStyle(sm).fontSize) || 11 : 0, schritt = 0;
        var zuGross = function () { return b.scrollWidth > platzB + 1 || i.scrollWidth > platzB + 1 || i.scrollHeight > platzH + 1; };
        while (schritt < 24 && g > 9 && zuGross()) {
          g -= 0.5; b.style.fontSize = g + "px"; if (sm && gs > 9) { gs = Math.max(9, gs - 0.25); sm.style.fontSize = gs + "px"; } schritt++;
        }
        /* Passt es bei 9 px immer noch nicht, darf getrennt werden. */
        if (zuGross()) [b, i].forEach(function (x) { x.style.hyphens = x.style.webkitHyphens = ""; x.style.overflowWrap = ""; x.style.wordBreak = ""; });
      }
    }
    var saFitUhr = 0;
    function saFitBald() { clearTimeout(saFitUhr); saFitUhr = setTimeout(function () { requestAnimationFrame(saFit); }, 30); }
    function saL(n) { return Math.max(6, String(n || '').split(/\s+/).reduce(function (m, x) { return Math.max(m, x.length); }, 0)); }
    function saErst() { return !!(TC && TC.salon && TC.salon.reihe === "leistung"); }
    /* Bild und Text des Betriebs stehen auf der ersten Seite: fragt das Formular zuerst „Für wen?“, dort (seit 09.10.2026, Barber by Becks), sonst über den Kacheln. */
    function saBild() { var S = TC.salon || {}; return S.bild ? '<div class="sa-bild"><img src="' + esc(S.bild) + '" alt="">' + (S.bildText ? "<p>" + esc(S.bildText) + "</p>" : "") + "</div>" : ""; }
    function saPreise() { return !(cfg.summary && cfg.summary.zeigePreis === false); }
    function saLs(P) { return (P.ls || []).filter(function (i) { return TC.leistungen[i] && tmPasst(TC.leistungen[i], P); }); }
    function saBraucht(P, was) { return saLs(P).some(function (i) { return !!TC.leistungen[i][was]; }); }
    function saHaarNoetig(P) { return saBraucht(P, "haar") || saBraucht(P, "farbe"); }
    /* Wimpern auffüllen (seit 15.10.2026, Kate Cosmetics): Leistungen mit l.wimpern fragen nach dem letzten Auffüllen, wie viele Wimpern noch da sind,
       und verlangen eine kurze Beschreibung. TC.salon.wimpern = { prozent, wochen, fotos: "widget" | "whatsapp" | "aus" } stellt der Betrieb selbst ein.
       Weniger als „prozent“ % noch da oder länger als „wochen“ Wochen her: voraussichtlich neues Set (l.neuset = Name der Leistung, sonst die Neuset-Leistung derselben Kachel).
       Dann wird die Zeit des neuen Sets reserviert, der Preis bleibt der fürs Auffüllen, darunter steht der Preis fürs neue Set. Dieselbe Regel rechnet der Server (lib/_termine.js salonRechnen). */
    var SA_WW = [2, 3, 4, 5, 99], SA_WP = [90, 70, 50, 30];
    function saF(k, o) { var s = String(sa(k)); Object.keys(o || {}).forEach(function (x) { s = s.split("{" + x + "}").join(o[x]); }); return s; }
    function saWR() { var w = (TC && TC.salon && TC.salon.wimpern) || {}; return { prozent: +w.prozent || 50, wochen: +w.wochen || 4, fotos: ["widget", "whatsapp", "aus"].indexOf(w.fotos) >= 0 ? w.fotos : "whatsapp" }; }
    function saWimNoetig(P) { var W = TC && TC.salon && TC.salon.wimpern; return !(W && W.an === false) && saBraucht(P, "wimpern"); }
    function saWort(n) { return String(n || "").trim().split(/[\s:]+/)[0].toLowerCase(); }
    function saNs(l) {
      if (!l || !l.wimpern) return null;
      var n = String(l.neuset || "").trim().toLowerCase(), r = null;
      TC.leistungen.some(function (x) {
        if (!x || x === l) return false;
        var ok = n ? String(x.name || "").trim().toLowerCase() === n : (x.kat || "") === (l.kat || "") && /neu\s*-?\s*set|neues set/i.test(x.name || "") && saWort(x.name) === saWort(l.name);
        if (ok) r = x; return ok;
      });
      return r;
    }
    function saNeu(P) { if (P.ww == null || P.wp == null) return false; var R = saWR(); return P.ww > R.wochen || P.wp < R.prozent; }
    function saWtOk(P) { return String(P.wt || "").replace(/\s+/g, " ").trim().length >= 8; }
    function saTelB() { return String((TC && TC.telefon) || (cfg.summary && cfg.summary.ansprechpartner && cfg.summary.ansprechpartner.kontakt) || cfg.telefon || ""); }
    function saWaNr(t) { var n = String(t || "").replace(/[^\d+]/g, ""); if (n.indexOf("+") === 0) n = n.slice(1); else if (n.indexOf("00") === 0) n = n.slice(2); else if (n.indexOf("0") === 0) n = "49" + n.slice(1); return n.length >= 8 ? n : ""; }
    function saWimHTML(P, ek, k) {
      var R = saWR(), h = "";
      var reihe = function (frage, ids, pre, wahl, attr) {
        return '<div class="tm-block"><label class="lbl">' + esc(frage) + '</label><div class="tm-chips">' + ids.map(function (id) {
          var on = wahl === id; return '<button type="button" class="tm-chip' + (on ? " on" : "") + '" aria-pressed="' + on + '"' + ek + " " + attr + '="' + id + '">' + esc(sa(pre + id)) + "</button>";
        }).join("") + "</div></div>";
      };
      h += reihe(sa("wimFrage1"), SA_WW, "w_", P.ww, "data-saww") + reihe(sa("wimFrage2"), SA_WP, "p_", P.wp, "data-sawp");
      h += '<div class="tm-block"><label class="lbl" for="cz-wt">' + esc(sa("wimText")) + '</label><textarea class="ta" id="cz-wt" rows="3" maxlength="400" data-sawt="' + esc(k) + '" placeholder="' + esc(sa("wimPh")) + '">' + esc(P.wt || "") + "</textarea></div>";
      if (R.fotos === "widget") {
        var f = P.fotos || [];
        h += '<div class="tm-block"><label class="lbl">' + esc(sa("wimFotoW")) + '</label><div class="tm-fotos">' + f.map(function (u, i) {
          return '<span class="tm-foto" style="background-image:url(\'' + u + '\')"><button type="button"' + ek + ' data-tmfx="' + i + '" aria-label="' + t("fotoWeg") + '">×</button></span>';
        }).join("") + (f.length < 3 ? '<label class="tm-fotoadd">' + t("fotoKnopf") + '<input type="file" accept="image/*" multiple data-tmf="' + esc(k) + '"></label>' : "") + '</div><p class="sa-unter">' + esc(sa("wimFotoH")) + "</p></div>";
      } else if (R.fotos === "whatsapp" && saWaNr(saTelB())) h += '<div class="hint">' + esc(sa("wimWa")) + "</div>";
      if (saNeu(P)) {
        var ns = saLs(P).map(function (i) { return saNs(TC.leistungen[i]); }).filter(Boolean)[0];
        if (ns) h += '<div class="hint warn"><b>' + esc(sa("neuH")) + ". </b>" + esc(saF("neuT", { n: TR(ns, "name") + (saPreise() && +ns.preis > 0 ? ", " + eur(+ns.preis) : "") })) + "</div>";
      }
      var ok = P.ww != null && P.wp != null && saWtOk(P);
      return h + '<button type="button" class="sa-weiter"' + ek + ' data-sawok="1"' + (ok ? "" : " disabled") + ">" + esc(sa("weiter")) + "</button>";
    }
    function saKats(P) {
      var r = [], m = {};
      TC.leistungen.forEach(function (l, i) {
        if (!l || !tmPasst(l, P)) return;
        var key = String(l.kat || l.name || i);
        if (!m[key]) { m[key] = { k: key, n: l.kat ? String(l.kat) : TR(l, "name"), ls: [] }; r.push(m[key]); }
        m[key].ls.push(i);
      });
      return r;
    }
    function saLab(id, de) { var key = id === "vor" ? "vorK" : (SA_LAENGE.indexOf(id) >= 0 ? "l_" : SA_STRUKTUR.indexOf(id) >= 0 ? "s_" : "f_") + id; return de ? SA_T.de[key] : sa(key); }
    function saZeit(m, de) { var mi = de ? "Min." : t("min"); m = +m || 0; return m < 60 ? m + " " + mi : Math.floor(m / 60) + " " + (de ? SA_T.de.std : sa("std")) + (m % 60 ? " " + (m % 60) + " " + mi : ""); }
    function saKlein(l, zp) { return saZeit(+l.dauer || 30) + (zp && +l.preis > 0 ? " · " + (l.ab ? sa("ab") + " " : "") + eur(+l.preis) : ""); }
    function saRechnen(P) {
      var S = TC.salon || {}, z = S.z || {}, po = [], d = 0, p = 0, wa = false, hN = saBraucht(P, "haar");
      var zu = function (haar, farbe) {
        var r = { d: 0, p: 0, ids: [] }, add = function (id) { var x = z[id]; if (x && (+x[0] || +x[1])) { r.d += +x[0] || 0; r.p += +x[1] || 0; r.ids.push(id); } };
        if (haar) { if (P.hl) add(P.hl); (P.hs || []).forEach(add); }
        if (farbe) { if (P.hf) add(P.hf); if (P.hv) add("vor"); }
        return r;
      };
      var posten = function (n, nd, d0, p0, x, ab, w) { var e = { n: n, nd: nd, d0: d0, p0: p0, d: Math.round(d0 * (100 + x.d) / 100), p: Math.round(p0 * (100 + x.p) / 100), zd: x.d, zp: x.p, ids: x.ids, ab: !!ab, w: !!w }; po.push(e); d += e.d; p += e.p; };
      saLs(P).forEach(function (i) {
        var l = TC.leistungen[i], ns = l.wimpern && saNeu(P) ? saNs(l) : null;
        posten(TR(l, "name"), l.name, ns ? (+ns.dauer || 30) : (+l.dauer || 30), +l.preis || 0, zu(l.haar, l.farbe), l.ab);
        if (ns) po[po.length - 1].ns = { n: TR(ns, "name"), nd: ns.name, p: +ns.preis || 0, d: +ns.dauer || 30 };
        if (l.waschen) wa = true;
      });
      if (wa && S.waschen && S.waschen.an !== false) {
        var wn = S.waschen.name && S.waschen.name !== SA_T.de.waschen ? S.waschen.name : sa("waschen");
        posten(wn, S.waschen.name || SA_T.de.waschen, +S.waschen.dauer || 30, +S.waschen.preis || 0, zu(hN, false), false, true);
      }
      return { po: po, d: Math.min(480, Math.ceil(d / 5) * 5), p: p, ab: po.some(function (x) { return x.ab; }) };
    }
    function saHaarText(P, de) {
      var x = [];
      if (saBraucht(P, "haar")) { if (P.hl) x.push(saLab(P.hl, de)); (P.hs || []).forEach(function (id) { x.push(saLab(id, de)); }); }
      if (saBraucht(P, "farbe")) { if (P.hf) x.push(saLab(P.hf, de)); if (P.hv) x.push(saLab("vor", de)); }
      return x.join(", ");
    }
    function saFertig(T) { return T.pers.every(function (P) { return !!(P.d && saLs(P).length && P.kok && (!saHaarNoetig(P) || P.hok) && (!saWimNoetig(P) || P.wok) && P.p && P.z && P.wer); }); }
    function saTage(T, ek) {
      var heute = new Date(); heute.setHours(0, 0, 0, 0);
      var maxW = Math.max(0, Math.ceil((TC.tage || 42) / 7) - 1), start = new Date(heute); start.setDate(start.getDate() + T.woche * 7);
      var tage = "";
      for (var i = 0; i < 7; i++) {
        var d = new Date(start); d.setDate(start.getDate() + i);
        var wd = d.getDay(), di = iso(d), zu = istBelegt(d) || !TC.personal.some(function (m) { return (m.tage || []).indexOf(wd) >= 0; }) || (d - heute) / 864e5 > (TC.tage || 42);
        tage += '<button class="tm-day"' + ek + ' data-tmd="' + di + '" aria-label="' + deDate(di) + (zu ? t("nichtBuchbar") : "") + '"' + (zu ? " disabled" : "") + "><small>" + t("wkS")[wd] + "</small>" + d.getDate() + "</button>";
      }
      return '<div class="tm-block"><label class="lbl">' + t("welcherTag") + '</label><div class="tm-mon">' +
        '<button class="cn"' + ek + ' data-tmw="-1"' + (T.woche ? "" : " disabled") + ' aria-label="' + t("frueher") + '">‹</button><b>' + t("mn")[start.getMonth()] + " " + start.getFullYear() + "</b>" +
        '<button class="cn"' + ek + ' data-tmw="1"' + (T.woche < maxW ? "" : " disabled") + ' aria-label="' + t("spaeter") + '">›</button></div>' +
        '<div class="tm-days">' + tage + "</div></div>";
    }
    function saKatalog(s, P, ek, R, zp) {
      var kats = saKats(P), sel = {}; P.ls.forEach(function (i) { sel[i] = 1; });
      var h = '<div class="tm-block"><label class="lbl">' + esc(TR(s, "fLeistung") || t("wasDarf")) + '</label><p class="sa-unter">' + esc(sa("tippen")) + '</p><div class="sa-grid" lang="de" style="--l:' + Math.min(12, kats.reduce(function (m, K) { return Math.max(m, saL(K.n)); }, 6)) + '">';
      kats.forEach(function (K, j) {
        var on = K.ls.some(function (i) { return sel[i]; }), auf = P.ko === K.k && K.ls.length > 1;
        var klein = K.ls.length > 1 ? K.ls.length + " " + sa("angebote") : saKlein(TC.leistungen[K.ls[0]], zp);
        h += '<button type="button" class="sa-k' + (on ? " on" : "") + (auf ? " auf" : "") + '"' + ek + ' data-sak="' + j + '" aria-pressed="' + (K.ls.length > 1 ? auf : on) + '"><i><b>' + esc(K.n) + "</b><small>" + esc(klein) + "</small></i></button>";
      });
      h += "</div>";
      var A = kats.filter(function (K) { return K.k === P.ko && K.ls.length > 1; })[0];
      if (A) h += '<div class="sa-auf"><div class="sa-auf-k">' + esc(A.n) + '</div><div class="tm-chips tm-gross">' + A.ls.map(function (i) {
        var l = TC.leistungen[i], on = !!sel[i];
        return '<button type="button" class="tm-chip' + (on ? " on" : "") + '" aria-pressed="' + on + '"' + ek + ' data-sal="' + i + '">' + esc(TR(l, "name")) + "<small>" + esc(saKlein(l, zp)) + "</small>" + (l.info ? '<small class="sa-info">' + esc(l.info) + "</small>" : "") + "</button>";
      }).join("") + "</div></div>";
      P.ls.forEach(function (i) { var l = TC.leistungen[i]; if (l.info && !(A && A.ls.indexOf(i) >= 0)) h += '<div class="hint"><b>' + esc(TR(l, "name")) + ": </b>" + esc(l.info) + "</div>"; });
      if (P.ls.length) h += '<div class="sa-wahl">' + esc(P.ls.length + " " + (P.ls.length === 1 ? sa("leistung1") : sa("leistungen")) + " · " + t("ca") + " " + saZeit(R.d) + (zp && R.p > 0 ? " · " + (R.ab ? sa("ab") + " " : t("ca") + " ") + eur(R.p) : "")) + "</div>";
      return h + '<button type="button" class="sa-weiter"' + ek + ' data-saok="1"' + (P.ls.length ? "" : " disabled") + ">" + esc(sa("weiter")) + "</button></div>";
    }
    function saKatalogErst(s, P, ek, R, zp) {
      var kats = saKats(P), sel = {}; P.ls.forEach(function (i) { sel[i] = 1; });
      var A = kats.filter(function (K) { return K.k === P.ko; })[0], h = '<div class="tm-block">', S = TC.salon || {};
      var wahl = P.ls.length ? '<div class="sa-wahl">' + esc(P.ls.length + " " + (P.ls.length === 1 ? sa("leistung1") : sa("leistungen")) + " · " + t("ca") + " " + saZeit(R.d) + (zp && R.p > 0 ? " · " + (R.ab ? sa("ab") + " " : t("ca") + " ") + eur(R.p) : "")) + "</div>" : "";
      var weiter = '<button type="button" class="sa-weiter"' + ek + ' data-saok="1"' + (P.ls.length ? "" : " disabled") + ">" + esc(sa("weiter")) + "</button>";
      if (!A) {
        if (!tmGruppen().length) h += saBild();
        h += '<label class="lbl">' + esc(TR(s, "fLeistung") || sa("wasMoechten")) + '</label><p class="sa-unter">' + esc(sa("tippen1")) + '</p><div class="sa-grid" lang="de" style="--l:' + Math.min(12, kats.reduce(function (m, K) { return Math.max(m, saL(K.n)); }, 6)) + '">';
        kats.forEach(function (K, j) {
          var on = K.ls.some(function (i) { return sel[i]; });
          var klein = K.ls.length > 1 ? K.ls.length + " " + sa("angebote") : saKlein(TC.leistungen[K.ls[0]], zp);
          h += '<button type="button" class="sa-k' + (on ? " on" : "") + '"' + ek + ' data-sak="' + j + '" aria-pressed="' + on + '"><i><b>' + esc(K.n) + "</b><small>" + esc(klein) + "</small></i></button>";
        });
        return h + "</div>" + wahl + weiter + "</div>";
      }
      h += '<button type="button" class="sa-alle"' + ek + ' data-sako="1">‹ ' + esc(sa("alleKat")) + '</button><label class="lbl">' + esc(A.n) + '</label><div class="tm-chips tm-gross">' + A.ls.map(function (i) {
        var l = TC.leistungen[i], on = !!sel[i];
        return '<button type="button" class="tm-chip' + (on ? " on" : "") + '" aria-pressed="' + on + '"' + ek + ' data-sal="' + i + '">' + esc(TR(l, "name")) + "<small>" + esc(saKlein(l, zp)) + "</small>" + (l.info ? '<small class="sa-info">' + esc(l.info) + "</small>" : "") + "</button>";
      }).join("") + "</div>";
      return h + wahl + weiter + "</div>";
    }
    function saHaarHTML(P, ek) {
      var haar = saBraucht(P, "haar"), farbe = saBraucht(P, "farbe"), h = "";
      var reihe = function (frage, ids, pre, wahl, attr, mehr) {
        return '<div class="tm-block"><label class="lbl">' + esc(frage) + '</label><div class="tm-chips">' + ids.map(function (id) {
          var on = mehr ? (wahl || []).indexOf(id) >= 0 : wahl === id;
          return '<button type="button" class="tm-chip' + (on ? " on" : "") + '" aria-pressed="' + on + '"' + ek + " " + attr + '="' + id + '">' + esc(sa(pre + id)) + "</button>";
        }).join("") + "</div></div>";
      };
      if (haar) h += reihe(sa("laenge"), SA_LAENGE, "l_", P.hl, "data-sahl") + reihe(sa("struktur"), SA_STRUKTUR, "s_", P.hs, "data-sahs", true);
      if (farbe) h += reihe(sa("farbe"), SA_FARBE, "f_", P.hf, "data-sahf") + '<div class="tm-block"><label class="lbl">' + esc(sa("vor")) + '</label><div class="tm-chips">' + [[1, "ja"], [0, "nein"]].map(function (x) {
        var on = P.hv === x[0]; return '<button type="button" class="tm-chip' + (on ? " on" : "") + '" aria-pressed="' + on + '"' + ek + ' data-sahv="' + x[0] + '">' + esc(sa(x[1])) + "</button>";
      }).join("") + "</div></div>";
      var ok = (!haar || P.hl) && (!farbe || (P.hf && P.hv != null));
      return h + '<button type="button" class="sa-weiter"' + ek + ' data-sahok="1"' + (ok ? "" : " disabled") + ">" + esc(sa("weiter")) + "</button>";
    }
    function saUebersicht(R, zp) {
      var h = '<table class="sa-tab">';
      R.po.forEach(function (x) {
        h += "<tr><td>" + esc(x.n) + "<small>" + esc(t("ca") + " " + saZeit(x.d) + (x.ids.length ? " · " + x.ids.map(function (id) { return saLab(id); }).join(", ") : "")) + "</small></td><td>" + (zp && x.p > 0 ? esc((x.ab ? sa("ab") + " " : "") + eur(x.p)) : "") + "</td></tr>";
        if (x.ns) h += '<tr class="ns"><td colspan="2">' + esc(saF("neuKlein", { n: x.ns.n + (zp && x.ns.p > 0 ? ", " + eur(x.ns.p) : "") })) + "</td></tr>";
      });
      return h + '<tr class="sum"><td>' + esc(sa("dauer") + " " + t("ca") + " " + saZeit(R.d)) + "</td><td>" + (zp && R.p > 0 ? esc((R.ab ? sa("ab") + " " : t("ca") + " ") + eur(R.p)) : "") + "</td></tr></table>";
    }
    function saGefuehrt(s, k, T, P, ek) {
      if (TC.personal.length === 1) { P.p = TC.personal[0].id; P.wer = true; } else if (!P.wer) P.p = "egal";
      P.ls = saLs(P); P.l = P.ls.length ? P.ls[0] : null;
      var h = "", R = saRechnen(P), zp = saPreise(), teile = [], grp = tmGruppen();
      var erst = saErst();
      if (P.d && !erst) teile.push(deDate(P.d));
      if (P.g && grp.length) teile.push(t("gruppe")[P.g]);
      if (P.kok && P.ls.length) teile.push(P.ls.length === 1 ? TR(TC.leistungen[P.ls[0]], "name") : P.ls.length + " " + sa("leistungen"));
      if (P.hok && saHaarNoetig(P)) teile.push(saHaarText(P));
      if (P.d && erst) teile.push(deDate(P.d));
      if (P.z) teile.push(t("uhr")(P.z));
      if (P.wer && TC.personal.length > 1) teile.push(P.p === "egal" ? tmName(P.pz) || t("egal") : tmName(P.p));
      if (teile.length) h += '<div class="tm-sumz"><button class="tm-zur"' + ek + ' data-tmb="1" aria-label="' + t("zurueckK") + '">‹</button><span>' + esc(teile.join(" · ")) + "</span></div>";
      if (!erst && !P.d) return h + saTage(T, ek);
      if (grp.length && !P.g) return h + '<div class="tm-block">' + (erst ? saBild() : "") + '<label class="lbl">' + esc(t("gruppeFrage")) + '</label><div class="sa-grid sa-gr">' + grp.map(function (g) {
        return '<button type="button" class="sa-k"' + ek + ' data-tmgr="' + g + '"><i><b>' + esc(t("gruppe")[g]) + "</b></i></button>";
      }).join("") + "</div></div>";
      if (!P.kok) return h + (erst ? saKatalogErst(s, P, ek, R, zp) : saKatalog(s, P, ek, R, zp));
      if (saHaarNoetig(P) && !P.hok) return h + saHaarHTML(P, ek);
      if (saWimNoetig(P) && !P.wok) return h + saWimHTML(P, ek, k);
      if (erst && !P.d) return h + saTage(T, ek);
      if (!P.z) {
        var fr = tmFreie(k, T.akt);
        h += '<div class="tm-block"><label class="lbl">' + t("uhrzeit") + '</label><p class="sa-unter">' + esc(sa("zeitFuer") + saZeit(R.d)) + "</p>";
        if (fr === "laden" || fr === null) h += '<div class="tm-leer">' + t("laden") + "</div>";
        else if (fr === "fehler") h += '<div class="tm-leer">' + t("ladeFehler") + "</div>";
        else if (!fr.length) h += '<div class="tm-leer">' + t("nichtsFrei")("") + "</div>" +
          (st.wl && st.wl.key === k && st.wl.datum === P.d ? wlHTML(k, P.d, "egal") : (WL_OK ? '<button class="wl-link" data-wlt="' + esc(k) + '">' + t("wlTag") + "</button>" : ""));
        else h += '<div class="tm-zeiten tm-alle">' + fr.map(function (x) {
          return '<button class="tm-z" aria-label="' + t("uhr")(x.z) + '"' + ek + ' data-tmz="' + x.z + '" data-pz="' + esc(x.p[0]) + '" data-pf="' + esc(x.p.join(",")) + '">' + x.z + "</button>";
        }).join("") + "</div>";
        return h + "</div>";
      }
      if (!P.wer) {
        var frei = (P.frei && P.frei.length ? P.frei : TC.personal.map(function (m) { return m.id; }));
        return h + '<div class="tm-block"><label class="lbl">' + esc(TR(s, "fWer") || t("beiWem")) + '</label><div class="tm-chips tm-gross">' +
          (frei.length > 1 ? '<button class="tm-chip"' + ek + ' data-tmg="1" data-tmp="egal">' + t("egal") + "</button>" : "") +
          TC.personal.filter(function (m) { return frei.indexOf(m.id) >= 0; }).map(function (m) { return '<button class="tm-chip"' + ek + ' data-tmg="1" data-tmp="' + esc(m.id) + '">' + esc(m.name) + "</button>"; }).join("") +
          "</div></div>";
      }
      var tel = TC.telefon || (cfg.summary && cfg.summary.ansprechpartner && cfg.summary.ansprechpartner.kontakt) || "";
      h += '<div class="hint"><b>' + t("ihrTermin") + "</b>" + esc(tmText(P)) + "</div>" + saUebersicht(R, zp);
      h += '<div class="hint">' + esc((TC.salon && TC.salon.hinweis) || sa(saHaarNoetig(P) ? "schaetz" : "schaetz2")) + "</div>";
      h += '<div class="hint warn">' + esc(t("verbindlich")(tel)) + "</div>";
      return h;
    }
    function saWahl(P, i, K) { var ls = saLs(P), j = ls.indexOf(i); if (j >= 0) ls.splice(j, 1); else { if (K) ls = ls.filter(function (x) { return K.ls.indexOf(x) < 0; }); ls.push(i); } P.ls = ls; P.kok = false; P.hok = false; P.wok = false; }
    function saKlick(b, T, P) {
      var a = function (n) { return b.getAttribute(n); }, neu = function () { P.z = null; P.pz = null; P.wer = TC.personal.length === 1; };
      if (b.hasAttribute("data-tmb") && saErst()) {
        if (P.wer && TC.personal.length > 1) { P.wer = false; P.p = "egal"; }
        else if (P.z) { P.z = null; P.pz = null; P.wer = TC.personal.length === 1; }
        else if (P.d) P.d = null;
        else if (P.wok && saWimNoetig(P)) P.wok = false;
        else if (P.hok && saHaarNoetig(P)) P.hok = false;
        else if (P.kok) { P.kok = false; P.hok = false; }
        else if (P.ko) P.ko = null;
        else if (P.g && tmGruppen().length) { P.g = null; P.ls = []; P.ko = null; }
        return true;
      }
      if (b.hasAttribute("data-sako")) { P.ko = null; return true; }
      if (b.hasAttribute("data-tmb")) {
        if (P.wer && TC.personal.length > 1) { P.wer = false; P.p = "egal"; }
        else if (P.z) { P.z = null; P.pz = null; P.wer = TC.personal.length === 1; }
        else if (P.wok && saWimNoetig(P)) P.wok = false;
        else if (P.hok && saHaarNoetig(P)) P.hok = false;
        else if (P.kok) { P.kok = false; P.hok = false; }
        else if (P.g && tmGruppen().length) { P.g = null; P.ls = []; P.ko = null; }
        else if (P.d) P.d = null;
        return true;
      }
      if (b.hasAttribute("data-tmgr")) { P.g = a("data-tmgr"); P.ls = []; P.ko = null; P.kok = false; P.hok = false; neu(); return true; }
      if (b.hasAttribute("data-tmd")) { P.d = a("data-tmd"); neu(); return true; }
      if (b.hasAttribute("data-sak")) { var K = saKats(P)[+a("data-sak")]; if (K) { if (saErst()) P.ko = K.k; else if (K.ls.length === 1) saWahl(P, K.ls[0], K); else P.ko = P.ko === K.k ? null : K.k; } neu(); return true; }
      if (b.hasAttribute("data-sal")) { var i = +a("data-sal"); saWahl(P, i, saKats(P).filter(function (x) { return x.ls.indexOf(i) >= 0; })[0]); neu(); return true; }
      if (b.hasAttribute("data-saok")) { if (saLs(P).length) { P.kok = true; P.ko = null; } neu(); return true; }
      if (b.hasAttribute("data-sahl")) { P.hl = a("data-sahl"); neu(); return true; }
      if (b.hasAttribute("data-sahs")) {
        var x = a("data-sahs"), L2 = (P.hs || []).slice(), j = L2.indexOf(x);
        if (j >= 0) L2.splice(j, 1); else { L2.push(x); var weg = x === "dick" ? ["duenn", "fein"] : (x === "duenn" || x === "fein" ? ["dick"] : []); L2 = L2.filter(function (y) { return weg.indexOf(y) < 0; }); }
        P.hs = L2; neu(); return true;
      }
      if (b.hasAttribute("data-sahf")) { P.hf = a("data-sahf"); neu(); return true; }
      if (b.hasAttribute("data-sahv")) { P.hv = +a("data-sahv"); neu(); return true; }
      if (b.hasAttribute("data-sahok")) { P.hok = true; neu(); return true; }
      if (b.hasAttribute("data-saww")) { P.ww = +a("data-saww"); P.wok = false; neu(); return true; }
      if (b.hasAttribute("data-sawp")) { P.wp = +a("data-sawp"); P.wok = false; neu(); return true; }
      if (b.hasAttribute("data-sawok")) { if (P.ww != null && P.wp != null && saWtOk(P)) P.wok = true; neu(); return true; }
      return false;
    }
    /* An den Betrieb immer auf Deutsch: jede Leistung mit Preis, Waschen & Föhnen, Haare und Dauer als eigene Zeile. Cockpit und Mail addieren daraus. */
    function saAuswahl(aw, s, TS, P, i) {
      var R = saRechnen(P), vor = TS.pers.length > 1 ? (P.n || "Person " + (i + 1)) + " · " : "";
      aw.push({ k: s.key, typ: "termin", f: TS.pers.length > 1 ? (P.n || "Person " + (i + 1)) : "Termin", a: tmText(P), w: R.po.filter(function (x) { return !x.w; }).map(function (x) { return x.nd; }).join(" + "), p: null });
      R.po.forEach(function (x, j) {
        aw.push({ k: s.key + "_l" + i + "_" + j, typ: "leistung", f: vor + (x.w ? "Dazu" : "Leistung"), a: x.nd + " · ca. " + saZeit(x.d, 1) + (x.zp || x.zd ? " · " + x.ids.map(function (id) { return saLab(id, 1); }).join(", ") + " (+" + x.zd + " % Zeit, +" + x.zp + " % Preis)" : "") + (x.ab ? " · ab-Preis" : ""), w: x.nd, p: x.p > 0 ? x.p : null });
      });
      if (saHaarNoetig(P)) aw.push({ k: s.key + "_haar" + i, typ: "haar", f: vor + "Haare", a: saHaarText(P, 1), p: null });
      if (saWimNoetig(P) && P.wok) {
        var nsx = R.po.filter(function (x) { return x.ns; })[0];
        aw.push({ k: s.key + "_wim" + i, typ: "wimpern", f: vor + "Wimpern", a: "Letztes Auffüllen: " + SA_T.de["w_" + P.ww] + " · Noch da: " + SA_T.de["p_" + P.wp] + " · „" + String(P.wt || "").replace(/\s+/g, " ").trim().slice(0, 300) + "“" + (nsx ? " · Voraussichtlich neues Set" : ""), p: null,
          ns: nsx ? { n: nsx.ns.nd, p: nsx.ns.p, d: nsx.ns.d, von: nsx.nd } : null });
      }
      aw.push({ k: s.key + "_dauer" + i, typ: "dauer", f: vor + "Dauer", a: "ca. " + saZeit(R.d, 1) + " (geschätzt)", p: null });
    }
    function tmKlick(b) {
      var k = b.getAttribute("data-tk"), T = tmState(k), P = T.pers[T.akt];
      if (saAn() && saKlick(b, T, P)) { delete st.fehler[k]; render(); return; }
      if (b.hasAttribute("data-tmb")) {
        if (P.wer && TC.personal.length > 1) { P.wer = false; P.p = "egal"; }
        else if (P.z) { P.z = null; P.pz = null; P.wer = TC.personal.length === 1; }
        else if (P.d) { P.d = null; }
        else if (P.h != null && tmHaar(TC.leistungen[P.l])) { P.h = null; }
        else if (P.l != null && TC.leistungen.length > 1) { P.l = null; P.h = null; }
        else if (P.g) { P.g = null; }
      }
      else if (b.hasAttribute("data-tmgr")) { P.g = b.getAttribute("data-tmgr"); P.l = null; P.h = null; P.z = null; P.pz = null; P.wer = false; }
      else if (b.hasAttribute("data-tml")) { P.l = +b.getAttribute("data-tml"); P.h = null; P.z = null; P.pz = null; P.wer = false; }
      else if (b.hasAttribute("data-tmh")) { P.h = +b.getAttribute("data-tmh"); P.z = null; P.pz = null; P.wer = false; }
      else if (b.hasAttribute("data-tmtz")) { var tz = b.getAttribute("data-tmtz"); P.tz = P.tz === tz ? null : tz; }
      else if (b.hasAttribute("data-tmfx")) { (P.fotos || []).splice(+b.getAttribute("data-tmfx"), 1); }
      else if (b.hasAttribute("data-tmp")) {
        P.p = b.getAttribute("data-tmp");
        if (b.hasAttribute("data-tmg")) { P.wer = true; if (P.p === "egal") P.pz = (P.frei || [])[0] || P.pz; else P.pz = P.p; }
        else { P.z = null; P.pz = null; }
      }
      else if (b.hasAttribute("data-tmd")) { P.d = b.getAttribute("data-tmd"); P.z = null; P.pz = null; P.wer = false; }
      else if (b.hasAttribute("data-tmz")) { P.z = b.getAttribute("data-tmz"); P.pz = b.getAttribute("data-pz"); if (b.hasAttribute("data-pf")) { P.frei = b.getAttribute("data-pf").split(","); P.wer = TC.personal.length === 1; } }
      else if (b.hasAttribute("data-tmw")) { T.woche = Math.max(0, T.woche + (+b.getAttribute("data-tmw"))); }
      else if (b.hasAttribute("data-tma")) { T.pers.push({}); T.akt = T.pers.length - 1; }
      else if (b.hasAttribute("data-tmt")) { T.akt = +b.getAttribute("data-tmt"); }
      delete st.fehler[k];
      render();
    }

    /* Eine einzelne Frage. Auf einer Seite mit mehreren Fragen wird die
       Fragestellung kleiner gesetzt, damit die Seite nicht wie drei
       gleichrangige Blöcke wirkt. */
    function frageHTML(s, mehrere) {
      var h = s.frage ? "<h3" + (mehrere ? ' class="qh"' : "") + ">" + esc(TR(s, "frage")) + (mussFrage(s) ? ' <span class="req">*</span>' : "") + "</h3>" : "";
      if (s.unter) h += '<p class="unter">' + esc(TR(s, "unter")) + "</p>";
      if (s.typ === "termin") {
        h += terminHTML(s);
      } else if (s.typ === "datum") {
        /* Kam der Gast von einem ausgebuchten Partner (?tag=…), ist sein Wunschtag schon gewählt. */
        if (TAG_IN && !st.tagIn) { st.tagIn = 1; var d0 = parseISO(TAG_IN), h0 = new Date(); h0.setHours(0, 0, 0, 0); if (d0 && d0 >= h0 && !istBelegt(d0) && !st.a[s.key]) { st.a[s.key] = TAG_IN; st.cal = { y: d0.getFullYear(), m: d0.getMonth() }; } }
        var val = st.a[s.key] || "";
        h += (s.label ? '<label class="lbl">' + esc(TR(s, "label")) + "</label>" : "") + kalender(s.key, val) +
          '<div class="hint" data-hint="' + esc(s.key) + '">' + (val ? tagHinweis(val) : esc(TR(s, "hinweis") || t("gruenFrei"))) + "</div>" + (st.pn && st.pn.key === s.key ? pnFreiHTML(st.pn.tag) : "") + ((cfg.belegt || []).length && cfg.warteliste !== false ? wlHTML(s.key) : "");
      } else if (s.typ === "text") {
        h += '<textarea class="ta" data-text="' + esc(s.key) + '" placeholder="' + esc(TR(s, "platzhalter") || "") + '">' + esc(st.a[s.key] || "") + "</textarea>" +
          (s.hinweis ? '<div class="hint">' + esc(TR(s, "hinweis")) + "</div>" : "");
      } else if (s.typ === "mehrfach") {
        var sel = st.m[s.key] || (st.m[s.key] = {});
        h += '<div class="opts">' + (s.optionen || []).map(function (o, j) {
          var pr = o.proGast ? eur(o.proGast) + t("proGast") : (o.preis ? eur(o.preis) : (o.aufAnfrage ? t("aufAnfrage") : t("inkl")));
          return '<button class="chk' + (sel[j] ? " on" : "") + '" role="checkbox" aria-checked="' + (sel[j] ? "true" : "false") + '" data-q="' + esc(s.key) + '" data-mi="' + j + '"><span class="bx">' + (sel[j] ? "✓" : "") + "</span>" +
            '<span class="tx"><b>' + esc(TR(o, "label")) + "</b>" + ((o.beschreibung || o.note) ? "<small>" + esc(TR(o, "beschreibung") || TR(o, "note")) + "</small>" : "") + "</span>" +
            '<span class="pr">' + pr + "</span></button>";
        }).join("") + "</div>" + (s.hinweis ? '<div class="hint">' + esc(TR(s, "hinweis")) + "</div>" : "");
      } else {
        var gew = st.a[s.key + "_l"] || "";
        h += '<div class="opts">' + (s.optionen || []).map(function (o, j) {
          var pr = o.proGast ? eur(o.proGast) + t("proGast") : (o.preis ? "+ " + eur(o.preis) : (o.aufAnfrage ? t("aufAnfrage") : ""));
          return '<button class="opt' + (gew === o.label ? " on" : "") + '" aria-pressed="' + (gew === o.label ? "true" : "false") + '" data-q="' + esc(s.key) + '" data-j="' + j + '">' +
            (pr ? '<span class="pr">' + pr + "</span>" : "") + esc(TR(o, "label")) +
            ((o.beschreibung || o.note) ? "<small>" + esc(TR(o, "beschreibung") || TR(o, "note")) + "</small>" : "") + "</button>";
        }).join("") + "</div>" + (s.hinweis ? '<div class="hint">' + esc(TR(s, "hinweis")) + "</div>" : "");
      }
      if (st.fehler[s.key]) h += '<div class="hint warn" role="alert">' + t(st.fehler[s.key] === "vergeben" ? "errVergeben" : s.typ === "termin" ? "errTermin" : "errLeer") + "</div>";
      return '<div class="frage">' + h + "</div>";
    }

    /* Nach jedem Seitenwechsel: die neue Seite gleitet herein, die Antworten
       erscheinen kurz nacheinander. Innerhalb einer Seite (Antwort angeklickt,
       Kalender geöffnet) bleibt alles ruhig — sonst zappelt es. */
    var letzteSeite = -1, ZURUECK = false, ersterAufbau = true;
    function ruhigGestellt() {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches);
    }
    /* Seite verlassen: die alte gleitet weg, danach wird neu gezeichnet.
       dir = 1 vorwärts, -1 zurück. vor = zusätzliche Wartezeit in ms. */
    function blaettern(fn, dir, vor) {
      var p = wrap.querySelector(".panel");
      if (!p || ruhigGestellt()) { ZURUECK = dir === -1; fn(); return; }
      ZURUECK = dir === -1;
      p.classList.remove("rein", "rueck");
      setTimeout(function () { p.classList.add(ZURUECK ? "raus-r" : "raus"); }, vor || 0);
      setTimeout(fn, 180 + (vor || 0));
    }
    /* Stellt das Fenster so, dass die Karte oben anfängt. Ohne das landet man
       nach dem Weiterblättern mitten in der neuen Frage, weil die vorige Seite
       länger war — genau das sah abgeschnitten aus. */
    function obenAnfangen() {
      try {
        var r = wrap.getBoundingClientRect();
        if (Math.abs(r.top - 12) < 6) return;
        var y = (window.pageYOffset || document.documentElement.scrollTop || 0);
        window.scrollTo({ top: Math.max(0, r.top + y - 12), behavior: "smooth" });
      } catch (e) {}
    }
    function belebe() {
      var p = wrap.querySelector(".panel");
      if (!p) return;
      var kinder = p.querySelectorAll(".opt,.chk,.picker,.ta");
      Array.prototype.forEach.call(kinder, function (el, i) { el.style.setProperty("--n", i); });
      if (st.i !== letzteSeite) {
        p.classList.add("rein");
        if (ZURUECK) p.classList.add("rueck");
        letzteSeite = st.i;
        /* Beim allerersten Anzeigen nicht scrollen: das Widget sitzt mitten in einer
           fremden Website, und ein Sprung dorthin beim Laden reißt den Besucher
           aus dem Text. Erst ab dem zweiten Blättern nachfassen. */
        if (!ersterAufbau) obenAnfangen();
        ersterAufbau = false;
      }
      ZURUECK = false;
    }

    /* Bild des Betriebs über der ersten Frage (Anfrage-Formulare, seit 09.10.2026): theme.titelbild und theme.titelText */
    function titelBild() { var th = cfg.theme || {}; return th.titelbild ? '<div class="sa-bild"><img src="' + esc(th.titelbild) + '" alt="">' + (th.titelText ? "<p>" + esc(th.titelText) + "</p>" : "") + "</div>" : ""; }
    function render() {
      neuOrdnen();
      /* Vorschau im Konfigurator (seit 20.10.2026, js/cz-konfigurator.js): meldet die Antworten, damit dort „Regel greift gerade“ stimmt. Nur in der Vorschau. */
      if (VORSCHAU && typeof window.CZ_VORSCHAU_STAND === "function") { try { window.CZ_VORSCHAU_STAND(st.a, st.i); } catch (e) {} }
      if (st.i > seiten.length + 1) st.i = seiten.length;
      var kopf = (LOGO ? '<div class="lg"><img src="' + esc(LOGO) + '" alt="' + esc(cfg.name || "") + '"></div>' : "") + '<div class="top"><div class="brand">' + esc(cfg.name || "") +
        (cfg.ort ? "<small>" + esc(cfg.ort) + "</small>" : "") + "</div>" +
        '<div class="rechts"><div class="cnt">' + (st.i < seiten.length ? pad(st.i + 1) + " / " + pad(seiten.length) : (st.i === seiten.length ? t("ihreAnfrage") : t("fertig"))) + "</div>" + sprHTML() + "</div></div>";
      var pct = Math.round((st.i / total) * 100);
      var nav = '<div class="nav">' + (st.i > 0 ? '<button class="back" data-back="1">' + t("zurueck") + '</button>' : "<span></span>") +
        '<span class="of">' + (st.i < seiten.length ? t("seiteVon")(st.i + 1, seiten.length) : t("fastFertig")) + "</span></div>";
      var inner;

      if (st.i < seiten.length) {
        var seite = seiten[st.i];
        var mehrere = seite.fragen.length > 1;
        inner = '<div class="bar"><i style="width:' + Math.max(pct, 6) + '%"></i></div>' + nav + (st.i === 0 ? titelBild() : "") +
          (seite.titel ? '<div class="sec">' + esc(TR(seite.fragen[0], "gruppe") || seite.titel) + "</div>" : "") +
          seite.fragen.map(function (s) { return frageHTML(s, mehrere); }).join("");
        /* Der Weiter-Knopf steht auf jeder Seite — auch dort, wo eine einzelne
           Auswahl beim Klick von allein weiterblättert. */
        var alleOptional = seite.fragen.every(function (s) { return !mussFrage(s); });
        /* Führt ein Salon-Ablauf mit eigenem „Weiter“, bleibt es bei diesem einen Knopf. */
        var saEigen = inner.indexOf('class="sa-weiter"') >= 0;
        inner += (saEigen ? "" : '<div class="row"><button class="go" data-next="1">' + t("weiter") + '</button>' +
          (alleOptional ? '<button class="skip" data-skip="1">' + t("ueberspringen") + '</button>' : "") + "</div>") +
          /* Das Sternchen erklärt sich nur, wenn auf der Seite beides vorkommt. */
          (!alleOptional && seite.fragen.some(function (s) { return !mussFrage(s); })
            ? '<div class="legende">' + t("pflicht") + '</div>' : "");
      } else if (st.i === seiten.length && sum.zeigeZusammenfassung !== false) {
        var b = rechnung(), warn = budgetWarnung();
        var zeilen = steps.filter(function (x) { return st.a[x.key + "_l"] || (x.typ === "datum" && st.a[x.key]); })
          .map(function (x) { return [TR(x, "kurz") || String(TR(x, "frage") || "").replace(/\?$/, ""), x.typ === "datum" ? deDate(st.a[x.key]) : (st.a[x.key] && typeof st.a[x.key] === "object" ? TR(st.a[x.key], "label") : st.a[x.key + "_l"])]; });
        steps.forEach(function (x) {
          if (x.typ !== "termin" || !st.t[x.key]) return;
          var TT = st.t[x.key];
          TT.pers.forEach(function (P, i) { if (P.z) zeilen.push([TT.pers.length > 1 ? (P.n || t("person") + " " + (i + 1)) : t("ihrTermin").replace(/:\s*$/, ""), tmText(P)]); });
        });
        var extras = [];
        steps.forEach(function (x) {
          if (x.typ !== "mehrfach") return;
          var sl = st.m[x.key] || {};
          (x.optionen || []).forEach(function (o, j) { if (sl[j]) extras.push(TR(o, "label")); });
        });
        inner = '<div class="bar"><i style="width:' + Math.max(pct, 6) + '%"></i></div>' + nav +
          "<h3>" + esc((LANG === BASIS ? sum.titel : ((sum.tr && sum.tr[LANG]) || {}).titel) || t("sumTitel")) + "</h3>" +
          '<div class="sum"><span class="grp">' + t("ihreAngaben") + '</span>' +
          zeilen.map(function (r) { return "<div><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>"; }).join("") +
          (extras.length ? "<div><span>" + t("zusatz") + "</span><b>" + esc(extras.join(", ")) + "</b></div>" : "") +
          (b.rows.length && sum.zeigePreis !== false ? '<span class="grp">' + t("kosten") + '</span>' +
            b.rows.map(function (r) { return "<div><span>" + esc(r[0]) + "</span><b>" + (r[2] ? eur(Math.round(r[2][0])) + " – " + eur(Math.round(r[2][1])) : eur(r[1])) + "</b></div>"; }).join("") +
            '<div class="tot"><span><b>' + t("gesamt") + '</b></span><b>' + (b.von && b.bis ? eur(b.von) + " – " + eur(b.bis) : eur(b.sum)) + "</b></div>" : "") +
          "</div>" +
          (b.sum && sum.zeigePreis !== false && !tmForm() ? '<div class="price"><span>' + t("richtwert") + '</span><b>' + t("ca") + " " + (b.von && b.bis && b.von !== b.bis ? eur(b.von) + " – " + eur(b.bis) : eur(b.sum)) + "</b></div>" : "") +
          (warn ? '<div class="hint warn" role="alert">' + warn + "</div>" : "") +
          '<div class="row"><button class="go" data-next="1">' + t("weiterAnfrage") + '</button></div>';
      } else {
        return renderLead(kopf, nav);
      }
      wrap.innerHTML = kopf + '<div class="panel">' + inner + "</div>" + FUSS;
      belebe(); saFitBald();
      if (!wrap._saFit) { wrap._saFit = 1; try { new MutationObserver(saFitBald).observe(wrap, { childList: true, subtree: true }); } catch (e) {} if (document.fonts && document.fonts.ready) document.fonts.ready.then(saFitBald); }
    }

    function renderLead(kopf, nav) {
      var felder = lfelder();
      var labels = { name: t("lName"), email: t("lEmail"), telefon: t("lTel") };
      var types = { name: "text", email: "email", telefon: "tel" };
      var html = '<div class="bar"><i style="width:94%"></i></div>' + nav +
        "<h3>" + t("leadH") + "</h3>" + azHTML();
      felder.forEach(function (f) {
        html += '<label class="f" for="cz-' + f + '">' + esc(labels[f] || f) + (lpflicht(f) ? "" : '<span class="opt">' + (FREIW[LANG] || FREIW.de) + "</span>") + "</label><input id=\"cz-" + f + '" type="' + (types[f] || "text") + '" autocomplete="' + ({ name: "name", email: "email", telefon: "tel" }[f] || "on") + '"' + (lpflicht(f) ? " required" : "") + ">";
      });
      if (leadCfg.consent) html += '<label class="consent"><input type="checkbox" id="cz-consent"><span>' + t("consent") + '</span></label>';
      if (cfg.weitergabe) html += '<label class="consent"><input type="checkbox" id="cz-weiter"><span>' + tp("weiter") + '</span></label>';
      var PAKETE = (Array.isArray(cfg.pakete) ? cfg.pakete : []).filter(function (x) { return x && x.id && x.titel && (x.partner || []).length; }).slice(0, 3);
      if (PAKETE.length) html += '<div class="pk"><h4>' + tpk("h") + '</h4>' + PAKETE.map(function (x) {
        return '<label class="pk-o"><input type="radio" name="cz-paket" value="' + esc(x.id) + '"><span><b>' + esc(x.titel) + '</b>' + (x.text ? '<em>' + esc(x.text) + '</em>' : '') + '<small>' + tpk("mit") + ' ' + x.partner.map(function (y) { return esc(y.name); }).join(", ") + '</small></span></label>';
      }).join("") + '<label class="pk-o"><input type="radio" name="cz-paket" value="" checked><span><b>' + tpk("nein") + '</b></span></label></div>';
      html += '<div class="row"><button class="go" id="cz-send">' + t("absenden") + '</button></div>';
      /* Immer am Ende: kurzer Datenschutz-Hinweis mit Link zur Datenschutzerklärung des Betriebs. */
      var dsB = esc(cfg.betrieb || "");
      html += '<p class="dsh"><b>' + t("dsH") + '</b> ' + t("dsText")(dsB) + ' ' + (cfg.datenschutz_url
        ? t("dsMehr")('<a href="' + esc(cfg.datenschutz_url) + '" target="_blank" rel="noopener">' + t("ds2") + '</a>')
        : t("dsOhne")(dsB)) + '</p>';
      wrap.innerHTML = kopf + '<div class="panel">' + html + "</div>" + FUSS;
      belebe();
    }

    /* Option B: Danke-Seite. Der Gast hakt Partner an, die seine Anfrage auch bekommen sollen.
       Gezeigt werden nur Partner, die am Wunschtag frei sind (ohne Termin: alle mit Formular). */
    var MIT = null;
    var FM = {
      de: ["Auch bei unseren Partnern anfragen?", "Ihre Angaben gehen nur an die Betriebe, die Sie anhaken. Sie müssen nichts neu eintippen.", "Auch an diese Partner schicken", "Gesendet. Die Partner melden sich bei Ihnen.", "Bitte mindestens einen Partner anhaken.", "Frei am Wunschtag"],
      en: ["Also ask our partners?", "Your details only go to the businesses you tick. You don't need to type anything again.", "Send to these partners too", "Sent. The partners will get in touch with you.", "Please tick at least one partner.", "Free on your date"],
      sq: ["Të pyesni edhe partnerët tanë?", "Të dhënat tuaja shkojnë vetëm te bizneset që shënoni. Nuk keni nevojë të shkruani sërish.", "Dërgoja edhe këtyre partnerëve", "U dërgua. Partnerët do t’ju kontaktojnë.", "Ju lutemi shënoni të paktën një partner.", "I lirë në datën tuaj"],
      fr: ["Demander aussi à nos partenaires ?", "Vos informations ne vont qu’aux entreprises cochées. Rien à ressaisir.", "Envoyer aussi à ces partenaires", "Envoyé. Les partenaires vous contacteront.", "Veuillez cocher au moins un partenaire.", "Libre à votre date"],
      it: ["Chiedere anche ai nostri partner?", "I Suoi dati vanno solo alle attività che spunta. Non deve riscrivere nulla.", "Invia anche a questi partner", "Inviato. I partner La contatteranno.", "Spunti almeno un partner.", "Libero nella Sua data"],
      es: ["¿Preguntar también a nuestros socios?", "Sus datos solo van a los negocios que marque. No tiene que escribir nada de nuevo.", "Enviar también a estos socios", "Enviado. Los socios se pondrán en contacto con usted.", "Marque al menos un socio.", "Libre en su fecha"],
      tr: ["Partnerlerimize de sorulsun mu?", "Bilgileriniz yalnızca işaretlediğiniz işletmelere gider. Tekrar yazmanız gerekmez.", "Bu partnerlere de gönder", "Gönderildi. Partnerler sizinle iletişime geçecek.", "Lütfen en az bir partner işaretleyin.", "Tarihinizde boş"]
    };
    function fm(i) { return (FM[LANG] || FM.de)[i]; }
    function mitHTML() {
      if (!MIT) return "";
      if (MIT.fertig) return '<div class="pn mit"><p class="mit-ok">✓ ' + fm(3) + '</p></div>';
      var tag = MIT.tag, d = tag ? parseISO(tag) : null, wd = d ? d.getDay() : -1;
      var l = PARTNER.filter(function (p) { return p.ws && (!tag || !Array.isArray(p.zu) || (p.zu.indexOf(tag) < 0 && (p.zu_wt || []).indexOf(wd) < 0)); });
      if (!l.length) return "";
      return '<div class="pn mit"><h4>' + fm(0) + '</h4><p class="pns">' + fm(1) + '</p><div class="pn-g">' + l.map(function (p) {
        var zeile = [BR[p.branche] || "", p.ort || ""].filter(Boolean).join(" · ");
        return '<label class="pn-k mit-k"><input type="checkbox" value="' + esc(p.ws) + '">' + pnBild(p) + '<div><b>' + esc(p.name) + '</b>' + (zeile ? '<span>' + esc(zeile) + '</span>' : '') + (tag && Array.isArray(p.zu) ? '<span class="mit-frei">' + fm(5) + '</span>' : '') + '</div></label>';
      }).join("") + '</div><p class="mit-f" role="alert"></p><button type="button" class="go mit-b" data-mit-senden>' + fm(2) + '</button></div>';
    }
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-mit-senden]"); if (!b || !MIT) return;
      var an = [].map.call(wrap.querySelectorAll(".mit-k input:checked"), function (x) { return x.value; });
      var f = wrap.querySelector(".mit-f");
      if (!an.length) { if (f) f.textContent = fm(4); return; }
      b.disabled = true; b.textContent = t("sendet");
      fetch(API + "/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mit_an: an, id: MIT.id, ts: MIT.ts, sig: MIT.sig }) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) { if (j && j.ok) { MIT.fertig = true; renderDone(); } else { b.disabled = false; b.textContent = fm(2); if (f) f.textContent = t("fehlerAllg"); } })
        .catch(function () { b.disabled = false; b.textContent = fm(2); if (f) f.textContent = t("offline"); });
    });

    function renderDone() {
      wrap.innerHTML = '<div class="top"><div class="brand">' + esc(cfg.name || "") + "</div></div>" +
        '<div class="panel"><div class="done"><div class="ok">✓</div><h3>' + t("danke") + '</h3>' +
        "<p>" + (Object.keys(st.t).some(function (k) { var T = st.t[k]; return T && T.pers.length && T.pers.every(tmBer); })
          ? t("doneBeratung")
          : ALLE.some(function (x) { return x.typ === "termin"; })
          ? t("doneTermin")
          : t("doneAnfrage")) + "</p>" + (DONE_TEL && ALLE.some(function (x) { return x.typ === "termin"; }) && typeof t("doneWa") === "function" ? "<p><b>" + t("doneWa")(esc(DONE_TEL)) + "</b></p>" : "") + (DONE_WA ? '<div class="row" style="margin-top:14px"><a class="go" style="text-decoration:none;display:flex;align-items:center;justify-content:center" target="_blank" rel="noopener" href="' + esc(DONE_WA) + '">' + esc(sa("waFoto")) + "</a></div>" : "") + azHTML() + "</div>" + (mitHTML() || partnerKarten()) + "</div>" + FUSS_NUR;
    }

    wrap.addEventListener("change", function (e) {
      var fi = e.target.closest && e.target.closest("[data-tmf]");
      if (fi) {
        var TF = tmState(fi.getAttribute("data-tmf")), PF = TF.pers[TF.akt]; PF.fotos = PF.fotos || [];
        var dateien = [].slice.call(fi.files || [], 0, Math.max(0, 3 - PF.fotos.length)), offen = dateien.length;
        dateien.forEach(function (f) { fotoKlein(f, function (u) { if (u && PF.fotos.length < 3) PF.fotos.push(u); if (!--offen) render(); }); });
        return;
      }
      var y = e.target.closest("[data-year]"); if (!y) return;
      st.cal = { y: +y.value, m: st.cal.m }; render();
    });
    wrap.addEventListener("input", function (e) {
      var tn = e.target.closest("[data-tmn]");
      if (tn) { var TN = tmState(tn.getAttribute("data-tmn")); TN.pers[TN.akt].n = tn.value.slice(0, 60); return; }
      var wt = e.target.closest("[data-sawt]");
      if (wt) { var TT = tmState(wt.getAttribute("data-sawt")), PT = TT.pers[TT.akt]; PT.wt = wt.value.slice(0, 400); var bt = wrap.querySelector("[data-sawok]"); if (bt) bt.disabled = !(PT.ww != null && PT.wp != null && saWtOk(PT)); return; }
      var wd = e.target.closest("[data-tmwd]");
      if (wd) { var TW = tmState(wd.getAttribute("data-tmwd")); TW.pers[TW.akt].wd = /^\d{4}-\d{2}-\d{2}$/.test(wd.value) ? wd.value : null; return; }
      var t = e.target.closest("[data-text]"); if (!t) return;
      st.a[t.getAttribute("data-text")] = t.value;
      auKm(t.getAttribute("data-text"), t.value);
    });
    wrap.addEventListener("click", function (e) {
      var xr = e.target.closest("[data-tmx]");
      if (xr) {
        e.stopPropagation();
        var XB = xr.closest("[data-tk]"), XT = tmState(XB.getAttribute("data-tk"));
        XT.pers.splice(+xr.getAttribute("data-tmx"), 1); XT.akt = Math.min(XT.akt, XT.pers.length - 1); render(); return;
      }
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-lang")) { LANG = b.getAttribute("data-lang"); wrap.setAttribute("lang", LANG); render(); return; }
      if (b.hasAttribute("data-tk")) { tmKlick(b); return; }
      if (b.hasAttribute("data-wlstart")) { st.wl = { key: b.getAttribute("data-wlstart") }; st.open = st.wl.key; if (!st.cal) { var hh = new Date(); st.cal = { y: hh.getFullYear(), m: hh.getMonth() }; } render(); return; }
      if (b.hasAttribute("data-wlday")) { st.wl.datum = b.getAttribute("data-wlday"); render(); return; }
      if (b.hasAttribute("data-wlt")) { var wk = b.getAttribute("data-wlt"), WT = tmState(wk), WP = WT.pers[WT.akt]; st.wl = { key: wk, datum: WP.d, personal: WP.p }; render(); return; }
      if (b.hasAttribute("data-wlstop")) { st.wl = null; render(); return; }
      if (b.hasAttribute("data-wlsend")) { wlSenden(b); return; }

      if (b.hasAttribute("data-back")) { if (st.i > 0) blaettern(function () { st.i--; st.open = null; st.fehler = {}; render(); }, -1); return; }
      if (b.hasAttribute("data-tgl")) { var tk = b.getAttribute("data-tgl"); st.open = (st.open === tk ? null : tk); render(); return; }
      if (b.hasAttribute("data-cal")) { var c = new Date(st.cal.y, st.cal.m + (+b.getAttribute("data-cal")), 1); st.cal = { y: c.getFullYear(), m: c.getMonth() }; render(); return; }
      if (b.hasAttribute("data-pnday")) { var pk0 = b.getAttribute("data-k"), pt0 = b.getAttribute("data-pnday"); st.pn = st.pn && st.pn.tag === pt0 ? null : { key: pk0, tag: pt0 }; render(); return; }
      if (b.hasAttribute("data-day")) { st.pn = null; var dk = b.getAttribute("data-k"); st.a[dk] = b.getAttribute("data-day"); st.open = null; delete st.fehler[dk]; render(); return; }
      if (b.hasAttribute("data-mi")) {
        var k = b.getAttribute("data-q") || (steps[0] || {}).key, j = +b.getAttribute("data-mi");
        st.m[k] = st.m[k] || {}; st.m[k][j] = !st.m[k][j]; render(); return;
      }
      if (b.hasAttribute("data-skip")) {
        ((seiten[st.i] || {}).fragen || []).forEach(function (sk) {
          if (sk.typ === "mehrfach") st.m[sk.key] = {}; else st.a[sk.key] = "";
        });
        blaettern(function () { st.i++; st.open = null; st.fehler = {}; render(); });
        return;
      }
      if (b.hasAttribute("data-next")) {
        var seite = seiten[st.i];
        if (seite) {
          st.fehler = {};
          var fehlt = null;
          seite.fragen.forEach(function (s) {
            if (!mussFrage(s)) return;
            if (istLeer(s)) { st.fehler[s.key] = 1; if (!fehlt) fehlt = s; }
          });
          if (fehlt) {
            /* Fehlt ein Datum, den Kalender gleich aufklappen — sonst sucht
               der Gast, wo er klicken soll. */
            st.open = fehlt.typ === "datum" ? fehlt.key : null;
            render(); return;
          }
        }
        blaettern(function () {
          st.i++;
          var nx = (seiten[st.i] || {}).fragen || [];
          st.open = (nx.length === 1 && nx[0].typ === "datum" && !st.a[nx[0].key]) ? nx[0].key : null;
          st.fehler = {};
          render();
        });
        return;
      }
      if (b.id === "cz-send") return senden(b);

      var j2 = b.getAttribute("data-j"); if (j2 === null) return;
      var qk = b.getAttribute("data-q"), s = null;
      for (var qi = 0; qi < steps.length; qi++) if (steps[qi].key === qk) s = steps[qi];
      if (!s) return;
      var o = (s.optionen || [])[+j2]; if (!o) return;
      st.a[s.key] = o; st.a[s.key + "_l"] = o.label;
      if (o.gaeste) st.a.__gaeste = o.gaeste;
      var gsp = gaesteSpanne(s, o);
      if (gsp && !o.gaeste) { st.a.__gv = gsp[0]; st.a.__gb = gsp[1]; } else if (gaesteFrage(s)) { delete st.a.__gv; delete st.a.__gb; }
      if (o.basis) st.a.__basis = o.basis;
      if (o.budgetMin != null || o.budgetMax != null) st.a.__budget = { min: o.budgetMin, max: o.budgetMax || 1e9, label: o.label, o: o };
      score += (o.score || 0);
      delete st.fehler[s.key];
      track("answer", { step: st.i, key: s.key, value: o.label });
      /* Nur wenn die Seite aus dieser einen Frage besteht, springt es weiter. */
      var jetzt = seiten[st.i];
      if (jetzt && jetzt.fragen.length === 1) {
        /* Erst tritt die gewählte Antwort heraus, dann blättert die Seite — so
           sieht man noch, was man angeklickt hat. */
        var geschw = b.parentNode ? b.parentNode.children : [];
        Array.prototype.forEach.call(geschw, function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        blaettern(function () {
          st.i++;
          var nx2 = (seiten[st.i] || {}).fragen || [];
          st.open = (nx2.length === 1 && nx2[0].typ === "datum" && !st.a[nx2[0].key]) ? nx2[0].key : null;
          render();
        }, 1, 200);
        return;
      }
      render();
    });

    function senden(btn) {
      var felder = lfelder(), out = {}, ok = true;
      felder.forEach(function (f) {
        var v = (wrap.querySelector("#cz-" + f) || {}).value || "";
        out[f] = v.trim(); if (!out[f] && lpflicht(f)) ok = false;
        if (f === "telefon" && out[f] && out[f].replace(/\D/g, "").length < 6) ok = false;
      });
      if (leadCfg.consent && !(wrap.querySelector("#cz-consent") || {}).checked) ok = false;
      if (!ok) { alert(t("alertFelder")); return; }
      var weiterOk = !!(wrap.querySelector("#cz-weiter") || {}).checked;
      var paketWahl = (wrap.querySelector('input[name="cz-paket"]:checked') || {}).value || "";
      if (VORSCHAU && !window.CZ_VORSCHAU_SENDEN) { renderDone(); return; }
      if (!VORSCHAU && limMax() && limListe().length >= limMax()) { renderLimit(); return; }

      btn.disabled = true; btn.textContent = t("sendet");
      neuOrdnen();
      ROH = true;
      var antworten = {};
      steps.forEach(function (s) {
        if (s.typ === "mehrfach") {
          var sl = st.m[s.key] || {}, gew = [];
          (s.optionen || []).forEach(function (o, j) { if (sl[j]) gew.push(o.label); });
          if (gew.length) antworten[s.key] = gew.join(", ");
        } else if (s.typ === "termin") {
          var TS = st.t[s.key];
          if (TS) antworten[s.key] = TS.pers.map(function (P, i) { return (TS.pers.length > 1 ? (P.n || "Person " + (i + 1)) + ": " : "") + tmText(P); }).join(" | ");
        } else if (s.typ === "datum" || s.typ === "text") {
          if (st.a[s.key]) antworten[s.key] = st.a[s.key];
        } else if (st.a[s.key + "_l"]) antworten[s.key] = st.a[s.key + "_l"];
      });
      /* Jede Antwort lesbar und mit Preis (answers._auswahl): Cockpit, Kachel und Mail an den Betrieb zeigen genau das. */
      var auswahl = [], nG = st.a.__gaeste || (st.a.__gb ? Math.round((st.a.__gv + st.a.__gb) / 2) : 0) || (preis && preis.gaesteStandard) || 0;
      var awPreis = function (o) { return o ? (o.proGast && nG ? o.proGast * nG : (+o.preis || 0)) : 0; };
      steps.forEach(function (s) {
        var f = String(TR(s, "kurz") || TR(s, "frage") || s.key).replace(/\?$/, "").slice(0, 80);
        if (s.typ === "termin") {
          var TS = st.t[s.key]; if (!TS) return;
          TS.pers.forEach(function (P, i) {
            if (saAn()) { saAuswahl(auswahl, s, TS, P, i); return; }
            var l = TC.leistungen[P.l] || {};
            auswahl.push({ k: s.key, typ: "termin", f: TS.pers.length > 1 ? (P.n || "Person " + (i + 1)) : "Termin", a: tmText(P), w: l.name || "", p: l.beratung ? null : (+l.preis || null) });
          });
        } else if (s.typ === "mehrfach") {
          var sl = st.m[s.key] || {}, g = [], ps = 0;
          (s.optionen || []).forEach(function (o, j) { if (sl[j]) { g.push(o.label); ps += awPreis(o); } });
          if (g.length) auswahl.push({ k: s.key, typ: "wahl", f: f, a: g.join(", "), p: ps || null });
        } else if (s.typ === "datum") { if (st.a[s.key]) auswahl.push({ k: s.key, typ: "datum", f: f, a: deDate(st.a[s.key]), p: null }); }
        else if (s.typ === "text") { if (st.a[s.key]) auswahl.push({ k: s.key, typ: "text", f: f, a: String(st.a[s.key]).slice(0, 300), p: null }); }
        else if (st.a[s.key + "_l"]) {
          var v = st.a[s.key];
          auswahl.push({ k: s.key, typ: "wahl", f: f, a: st.a[s.key + "_l"], p: v && typeof v === "object" ? (awPreis(v) || null) : null });
        }
      });
      if (auswahl.length) antworten._auswahl = auswahl;
      var b = rechnung();
      TM_IDX = null; DONE_TEL = out.telefon || "";
      if (AU && st.a.__km != null) antworten["Anfahrt (km)"] = st.a.__km;
      var nutzlast = {
        widget: widget, session: sid,
        name: out.name || null, email: out.email || null, phone: out.telefon || null,
        answers: antworten, score: score, wert: b.sum || null,
        // Einzelposten mitgeben: das Angebot der Location zeigt später dieselben Zahlen.
        posten: b.rows.map(function (r) { return r[2] ? { text: r[0], betrag: r[1], von: r[2][0], bis: r[2][1] } : { text: r[0], betrag: r[1] }; }),
        termin: st.a[dateKey()] || null, geraet: geraetId() || null, consent: true, sprache: LANG, weiter_ok: weiterOk || !!paketWahl, paket: paketWahl || null, von: VON || null
      };
      steps.forEach(function (s) {
        if (s.typ === "termin" && st.t[s.key] && !TM_IDX) {
          var TP = st.t[s.key].pers, BR = TP.filter(tmBer), erst = TP.filter(function (P) { return !tmBer(P); })[0];
          TM_IDX = []; nutzlast.termine = [];
          TP.forEach(function (P, i) { if (tmBer(P)) return; TM_IDX.push(i); var tz = { leistung: P.l, personal: P.p, datum: P.d, zeit: P.z, name: P.n || "", haar: P.h == null ? null : P.h };
            if (saAn()) { tz.leistungen = saLs(P); tz.salon = { l: P.hl || null, s: P.hs || [], f: P.hf || null, v: P.hv ? 1 : 0, w: saWimNoetig(P) && P.wok ? { w: P.ww, p: P.wp, t: String(P.wt || "").trim().slice(0, 400) } : null }; tz.dauer = saRechnen(P).d; }
            nutzlast.termine.push(tz); });
          if (BR.length) {
            nutzlast.beratung = BR.map(function (P) { return { leistung: (TC.leistungen[P.l] || {}).name, name: P.n || "", wunschtag: P.wd || null, tageszeit: P.tz || null }; });
            nutzlast.fotos = [].concat.apply([], BR.map(function (P) { return P.fotos || []; })).slice(0, 3);
          }
          /* Fotos der Augen (Einstellung „im Formular“): wie bei der Beratung, höchstens drei. Bei „per WhatsApp“ kommt nach dem Absenden ein Knopf. */
          var WP = TP.filter(function (P) { return saAn() && saWimNoetig(P) && P.wok; });
          if (WP.length && saWR().fotos === "widget" && !nutzlast.fotos) { var wf = [].concat.apply([], WP.map(function (P) { return P.fotos || []; })).slice(0, 3); if (wf.length) nutzlast.fotos = wf; }
          DONE_WA = "";
          if (WP.length && saWR().fotos === "whatsapp" && saWaNr(saTelB())) DONE_WA = "https://wa.me/" + saWaNr(saTelB()) + "?text=" + encodeURIComponent(saF("waFotoText", { w: tmText(WP[0]), vn: out.name ? ", " + out.name : "" }));
          nutzlast.termin = erst ? erst.d : (BR[0] && BR[0].wd) || null;
          if (!nutzlast.termine.length) delete nutzlast.termine;
        }
        if (s.typ === "text" && st.a[s.key] && !nutzlast.nachricht) nutzlast.nachricht = st.a[s.key];
      });

      ROH = false;
      nutzlast.basis = BASIS;
      /* Für die Bestätigung an den Gast: seine Angaben in seiner Sprache */
      if (LANG !== BASIS) {
        nutzlast.gast_zeilen = [];
        steps.forEach(function (s) {
          var lab = String(TR(s, "kurz") || TR(s, "frage") || s.key).replace(/\?$/, ""), v = "";
          if (s.typ === "mehrfach") {
            var sl = st.m[s.key] || {}, g = [];
            (s.optionen || []).forEach(function (o, j) { if (sl[j]) g.push(TR(o, "label")); });
            v = g.join(", ");
          } else if (s.typ === "termin") {
            var TS = st.t[s.key];
            if (TS) v = TS.pers.map(function (P, i) { return (TS.pers.length > 1 ? (P.n || t("person") + " " + (i + 1)) + ": " : "") + tmText(P); }).join(" | ");
          } else if (s.typ === "datum") { if (st.a[s.key]) v = deDate(st.a[s.key]); }
          else if (s.typ === "text") { v = st.a[s.key] || ""; }
          else if (st.a[s.key + "_l"]) {
            var o = (s.optionen || []).filter(function (x) { return x.label === st.a[s.key + "_l"]; })[0];
            v = o ? TR(o, "label") : st.a[s.key + "_l"];
          }
          if (v) nutzlast.gast_zeilen.push([lab, v]);
        });
      }
      // Zweimal versuchen; erst dann ehrlich scheitern. Eine verlorene Anfrage
      // ist für den Betrieb teurer als eine Sekunde Wartezeit.
      /* Vorschau mit Cockpit (vorschau.html, seit 13.10.2026): nichts an den Server, die Seite legt die Anfrage ins Beispiel-Cockpit. */
      if (VORSCHAU) { try { window.CZ_VORSCHAU_SENDEN(nutzlast); } catch (e) {} renderDone(); return; }
      senden(nutzlast, 2);

      function senden(daten, versuche) {
        fetch(API + "/lead", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(daten)
        })
          .then(function (r) {
            if (r.ok) { limMerk(); r.json().then(function (j) { if (j && j.sig) MIT = { id: j.id, ts: j.ts, sig: j.sig, tag: daten.termin || null }; renderDone(); }, function () { renderDone(); }); return; }
            if (r.status === 429) { r.json().then(function (j) { if (j && j.error === "limit") renderLimit(); else renderFehler(daten); }, function () { renderFehler(daten); }); return; }
            if (r.status === 409) { r.json().then(tmKonflikt, function () { tmKonflikt({}); }); return; }
            if (versuche > 1) { setTimeout(function () { senden(daten, versuche - 1); }, 1200); return; }
            renderFehler(daten);
          })
          .catch(function () {
            if (versuche > 1) { setTimeout(function () { senden(daten, versuche - 1); }, 1200); return; }
            renderFehler(daten);
          });
      }
    }

    /* Eine Uhrzeit wurde zwischen Auswahl und Absenden vergeben: zurück zur
       Terminseite, die betroffene Zeit leeren, frische Zeiten laden. */
    function tmKonflikt(j) {
      neuOrdnen();
      for (var i = 0; i < seiten.length; i++) {
        var tf = seiten[i].fragen.filter(function (x) { return x.typ === "termin"; })[0];
        if (!tf) continue;
        var T = tmState(tf.key), ix = TM_IDX && TM_IDX[+j.index] != null ? TM_IDX[+j.index] : (+j.index || 0), n = Math.min(Math.max(0, ix), T.pers.length - 1), P = T.pers[n];
        SL = {};
        if (P) { P.z = null; P.pz = null; }
        T.akt = n; st.i = i; st.fehler = {}; st.fehler[tf.key] = "vergeben";
        render(); return;
      }
      renderFehler({});
    }

    // Absenden gescheitert: Angaben behalten, Ausweichweg anbieten.
    function renderFehler(daten) {
      var mailto = "mailto:" + (cfg.email || "") + "?subject=" + encodeURIComponent("Anfrage " + (cfg.name || ""))
        + "&body=" + encodeURIComponent(
            "Name: " + (daten.name || "") + "\n"
            + "E-Mail: " + (daten.email || "") + "\n"
            + (daten.phone ? "Telefon: " + daten.phone + "\n" : "")
            + "\n" + Object.keys(daten.answers || {}).map(function (k) { return k + ": " + daten.answers[k]; }).join("\n")
            + (daten.wert ? "\n\nRichtwert: " + eur(daten.wert) : "")
          );
      wrap.innerHTML = '<div class="top"><div class="brand">' + esc(cfg.name || "") + "</div></div>"
        + '<div class="panel"><h3>' + t("errH") + '</h3>'
        + '<p style="color:var(--ink2);font-size:14.5px;line-height:1.6;margin:0 0 14px">' + t("errText")
        + (cfg.telefon ? t("errTel") : '.') + '</p>'
        + '<div class="row"><button class="go" data-retry="1">' + t("erneut") + '</button>'
        + (cfg.email ? '<a class="skip" style="text-decoration:none;display:flex;align-items:center" href="' + mailto + '">' + t("perMail") + '</a>' : '')
        + '</div>'
        + (cfg.telefon ? '<div class="hint"><b>' + t("anrufen") + '</b> <a href="tel:' + esc(cfg.telefon).replace(/\s/g, "") + '" style="color:var(--a)">' + esc(cfg.telefon) + '</a></div>' : '')
        + "</div>" + FUSS;
      wrap.querySelector("[data-retry]").onclick = function () {
        this.disabled = true; this.textContent = t("sendet");
        senden2(daten);
      };
      function senden2(d) {
        fetch(API + "/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
          .then(function (r) { if (r.ok) renderDone(); else renderFehler(d); })
          .catch(function () { renderFehler(d); });
      }
    }
  }
})();
