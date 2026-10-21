/* clickzauber — Menü „Funktionen“ in jedem Cockpit (seit 08.10.2026).
   Alle Funktionen der eigenen Branche, von den Grundlagen bis zu den Profi-Funktionen. „Zeigen“ springt an die Stelle
   und hebt sie hervor, unten erklärt eine Leiste, was dort passiert. „Verstanden“ legt eine Funktion in den Reiter
   „Verstanden“, „Zurückholen“ holt sie wieder. Was ein Betrieb ausgeschaltet hat (js/cz-funktionen.js), fehlt hier.
   Handy: Lasche am linken Rand, verschiebbar. Computer: „Funktionen“ in der Seitenleiste.
   Gemerkt wird je Gerät. Vorführung (rahmen=1: Test-Cockpit, 7-Tage-Demos/) nur, bis der Tab zu ist.
   Jede neue sichtbare Funktion bekommt hier einen Eintrag in F (CLAUDE.md):
   st 1 Grundlagen · 2 Im Alltag · 3 Für Fortgeschrittene, a = Cockpit-Arten (fehlt: alle), fx = Schalter aus js/cz-funktionen.js,
   v = Seite, z = Stelle (Selektor oder { h2: 'Anfang der Überschrift' }), tu = was vorher passiert (Blatt öffnen), neu = Datum (30 Tage „Neu“). */
(function () {
  'use strict';
  if (window.czFxMenue || !document.getElementById('app') || /[?&]admin=/.test(location.search)) return;
  var Q = location.search, RAHMEN = /[?&]rahmen=1/.test(Q), DEMO = /[?&]demo=1/.test(Q);
  var ZC = (Q.match(/[?&]z=([A-Za-z0-9]+)/) || [])[1] || '';
  var KEY = RAHMEN ? 'cz_fxm_r' : DEMO ? 'cz_fxm_demo_' + (ZC || 'x') : 'cz_fxm_v1';
  function sp() { try { return RAHMEN ? sessionStorage : localStorage; } catch (e) { return null; } }
  var OK = {}; try { OK = JSON.parse(sp().getItem(KEY) || '{}') || {}; } catch (e) { OK = {}; }
  function merken() { try { sp().setItem(KEY, JSON.stringify(OK)); } catch (e) {} try { window.dispatchEvent(new CustomEvent('cz-fxm')); } catch (e) {} }
  var NT = ['auftrag', 'location', 'pipeline'];

  var F = [
    /* ── Grundlagen ── */
    { id: 'mails', st: 1, t: 'Das läuft per E-Mail von selbst', v: 'settings', z: { h2: 'Benachrichtigungen' },
      s: 'Jede Anfrage kommt per E-Mail und als Mitteilung, Ihr Kunde bekommt von selbst eine Bestätigung. Alles steht zusätzlich geordnet im Cockpit.',
      sArt: {
        termin: 'Jede Terminanfrage kommt per E-Mail und als Mitteilung. Ihr Kunde bekommt von selbst eine Bestätigung, Bescheid, wenn Sie annehmen, absagen oder umbuchen, und am Vortag eine Erinnerung. Keine dieser Mails schreiben Sie selbst, und alles steht zusätzlich geordnet im Cockpit.',
        auftrag: 'Jede Anfrage kommt per E-Mail und als Mitteilung. Ihr Kunde bekommt von selbst eine Bestätigung, Ihr Angebot mit Link zum Annehmen und Bescheid zu Ausweichtagen. An Wiedervorlagen erinnert Sie clickzauber per Mail. Alles steht zusätzlich geordnet im Cockpit.',
        location: 'Jede Anfrage kommt per E-Mail und als Mitteilung. Ihr Gast bekommt von selbst eine Bestätigung, nach drei Tagen ohne Antwort eine kurze Zwischennachricht und Bescheid, wenn sein Wunschtag frei wird. Ihr Angebot geht mit Link zum Annehmen raus. Alles steht zusätzlich geordnet im Cockpit.',
        pipeline: 'Jede Anfrage kommt per E-Mail und als Mitteilung. Ihr Kunde bekommt von selbst eine Bestätigung und Ihr Angebot mit Link zum Annehmen. An Wiedervorlagen erinnert Sie clickzauber per Mail. Alles steht zusätzlich geordnet im Cockpit.' } },
    { id: 'auswahl', st: 1, neu: '2026-10-08', t: 'Alles, was Ihr Kunde gewählt hat', tu: 'wa', z: '#sa-aw, #dt-angaben-box, #au-bl .au-alle',
      s: 'In jeder Anfrage steht jede Antwort aus Ihrem Formular, so benannt wie Ihre Frage, dazu der Betrag, den das Formular errechnet hat.',
      sArt: { termin: 'Im Termin-Blatt steht unter „Gewünscht“ jede Antwort aus Ihrem Formular, mit Preisen und Gesamtbetrag. Auf der Kachel sehen Sie Extras und Betrag schon vorher.' } },
    { id: 'live', st: 1, t: 'Formular live schalten', s: 'Der grüne Schalter oben rechts. Erst wenn er an ist, sehen Ihre Gäste das Formular. Vorher sagt clickzauber, was noch fehlt.', z: '#czl-sw' },
    { id: 'tm-heute', st: 1, a: ['termin'], t: 'Heute auf einen Blick', s: 'Die Übersicht zeigt nur den heutigen Tag: links offen, rechts bestätigt, nach Uhrzeit. Eine Kachel öffnet alles zum Termin.', v: 'overview', z: '#sal-heute' },
    { id: 'tm-blatt', st: 1, a: ['termin'], t: 'Annehmen, ablehnen, verschieben', s: 'Kachel antippen, dann große Knöpfe: Anrufen, Annehmen, Ablehnen, Verschieben, Nachricht. Der Kunde bekommt Bescheid.', tu: 'termin' },
    { id: 'tm-schnell', st: 1, a: ['termin'], fx: 'schnelltermin', t: 'Kunde ruft an: Schnell-Termin', s: 'Der Knopf „+ Schnell-Termin“: Tag, Uhrzeit, Mitarbeiter und Name, fertig. Die Zeit ist sofort im Formular belegt.', v: 'overview', z: '#sal-neu' },
    { id: 'tm-team', st: 1, a: ['termin'], t: 'Mitarbeiter und Arbeitszeiten', s: 'Wer bedient und wann, auch mit Pause. Im Formular erscheinen nur Zeiten, in denen jemand frei ist.', v: 'zeiten', z: { h2: 'Mitarbeiter' } },
    { id: 'tm-leistungen', st: 1, a: ['termin'], t: 'Leistungen mit Dauer und Preis', s: 'Jede Leistung hat eine Dauer. Danach richtet sich, welche Uhrzeiten im Formular frei sind.', v: 'zeiten', z: { h2: 'Leistungen' } },
    { id: 'au-uebersicht', st: 1, a: ['auftrag'], t: 'Übersicht auf einen Blick', s: 'Oben Zugesagt und Offen, darunter die nächsten Samstage und was heute ansteht. Eine Anfrage antippen öffnet alles dazu.', v: 'overview', z: '#au-box .au-mon' },
    { id: 'au-angebot', st: 1, a: ['auftrag'], t: 'Annehmen und Angebot senden', s: 'Im Anfrage-Blatt den Preis eintragen und den grünen Knopf tippen. Der Kunde bekommt das Angebot mit Link und nimmt es online an.', tu: 'auftrag', z: '#au-bl [data-au="an"]' },
    { id: 'au-ausweich', st: 1, a: ['auftrag'], t: 'Ausweichtermin anbieten', s: 'Ist der Tag schon belegt, schlagen Sie andere Tage vor. Der Kunde wählt selbst über seinen Link.', tu: 'auftrag', z: '#au-bl [data-au="aus"]' },
    { id: 'lo-anfragen', st: 1, a: ['location'], t: 'Anfragen, schon vorsortiert', s: 'Jede Anfrage kommt mit Datum, Gästen und Budget. Das Formular stuft sie ein: kaufbereit, Interessent oder passt kaum.', v: 'leads', z: '#l-chips' },
    { id: 'lo-entscheiden', st: 1, a: ['location'], t: 'Entscheiden und Bescheid geben', s: 'Anfrage öffnen, annehmen oder absagen. Danach steht ein fertiger Text für den Gast bereit, per Mail oder WhatsApp mit einem Tipp.', tu: 'anfrage' },
    { id: 'pl-tafel', st: 1, a: ['pipeline'], t: 'Die Tafel', s: 'Jede Anfrage ist eine Karte, je Stand eine Spalte: Neu, Kontakt, Angebot, Auftrag, Verloren. Antippen öffnet die Anfrage.', v: 'leads', z: '#pl-box' },
    { id: 'pl-stand', st: 1, a: ['pipeline'], t: 'Stand setzen', s: 'Im Anfrage-Blatt setzen Sie den Stand, etwa nach dem ersten Anruf auf „Kontakt“. Die Karte wandert in die passende Spalte.', tu: 'anfrage' },
    { id: 'formular', st: 1, t: 'Ihr Formular bearbeiten', s: 'Fragen, Preise und Aussehen ändern Sie im Konfigurator. Link und Einbau-Code bleiben dabei gleich.', v: 'widget', z: { h2: 'Ihre Formulare' } },
    { id: 'teilen', st: 1, t: 'Link und QR-Code', s: 'Auch ohne Website: Link in die Instagram-Bio oder in WhatsApp, den QR-Code an die Kasse.', v: 'embed', z: '#embed-link' },
    { id: 'mail', st: 1, t: 'Wohin neue Anfragen gehen', s: 'Jede Anfrage kommt per E-Mail. Eine zweite Adresse bekommt alles in Kopie, etwa die Vertretung im Urlaub.', v: 'settings', z: { h2: 'Benachrichtigungen' } },
    { id: 'push', st: 1, t: 'Mitteilung aufs Handy', s: 'Neue Anfragen melden sich sofort auf dem Bildschirm. Auf dem iPhone, wenn clickzauber auf dem Home-Bildschirm liegt. „Probe senden“ prüft es.', sApp: 'Neue Anfragen melden sich sofort auf dem Bildschirm, auch wenn die App geschlossen ist. „Probe senden“ prüft es.', v: 'settings', z: '#row-push' },
    { id: 'missionen', st: 1, fx: 'missionen', t: 'Missionen und Punkte', s: 'Unten rechts. Jede Mission führt Sie einen Schritt weiter und bringt Punkte. So sehen Sie, was noch fehlt.', z: '#msn' },
    { id: 'sprache', st: 1, t: 'Sprache des Cockpits', s: 'Der Globus oben rechts stellt das Cockpit auf Albanisch, Englisch, Türkisch und weitere Sprachen. Das Formular Ihrer Gäste bleibt, wie es ist.', z: '.gl-btn:not(.gl-zr)' },
    { id: 'ziehen', st: 1, neu: '2026-10-20', t: 'Nach unten ziehen zum Aktualisieren', s: 'In der App und auf dem Home-Bildschirm: ganz oben nach unten ziehen und loslassen. Das Cockpit lädt neu und zeigt den neuesten Stand.' },
    /* ── Im Alltag ── */
    { id: 'tm-umbuchen', st: 2, a: ['termin'], neu: '2026-10-14', t: 'Termin umbuchen', s: 'Im Termin-Blatt „Termin umbuchen“ tippen. Darunter klappt „Weitere Möglichkeiten“ auf, jeweils mit einem Satz, was passiert. Passt Ihrem Kunden die neue Zeit nicht, wünscht er sich über seinen Link eine andere, so oft es nötig ist.', tu: 'termin', z: '#sa-vs-k, #sa-opt' },
    { id: 'tm-morgen', st: 2, a: ['termin'], t: 'Morgen erinnern', s: 'Oben bei den Uhrzeit-Terminen: Erinnerung an alle Kunden von morgen, mit fertigem Text per WhatsApp.', v: 'zeiten', z: '#zt-erinnern' },
    { id: 'tm-vortag', st: 2, a: ['termin'], t: 'Automatisch am Vortag erinnern', s: 'Wer bis 17 Uhr nicht per WhatsApp erinnert wurde, bekommt die Erinnerung per Mail und, wenn eingeschaltet, per SMS.', v: 'settings', z: '#s-erinnerung' },
    { id: 'tm-schluss', st: 2, a: ['termin'], t: 'Früher Schluss oder frei', s: 'Heute früher zu oder spontan frei? Eintragen, dann bietet das Formular diese Zeiten nicht mehr an. „Wieder öffnen“ nimmt es zurück. Passt ein Termin nicht mehr, zeigt das Cockpit ihn an.', v: 'zeiten', z: '#zt-schluss' },
    { id: 'tm-ansicht2', st: 2, a: ['termin'], neu: '2026-10-13', t: 'Ansicht 2: Tagesplan', s: 'Auf der Startseite oben „Ansicht 2“: Mitarbeiter nebeneinander, jede halbe Stunde eine Kachel. Uhrzeit antippen zum Eintragen, Termin ziehen zum Verschieben, auch zu einem anderen Mitarbeiter.', v: 'overview', z: '#ta-wahl' },
    { id: 'tm-sp-kal', st: 2, a: ['termin'], neu: '2026-10-13', t: 'Feierabend im Kalender ein- und ausschalten', s: 'Freie Tage und früher Schluss stehen rot im Kalender. Tag antippen: Mit dem Schalter nehmen Sie den Feierabend zurück oder schalten ihn wieder ein.', v: 'kalender', z: '#kv-gitter' },
    { id: 'tm-wa-bescheid', st: 1, a: ['termin'], neu: '2026-10-13', t: 'Per WhatsApp Bescheid sagen', s: 'Nach „Annehmen“ steht unter „Heute“ der grüne Knopf. Er öffnet WhatsApp mit der fertigen Bestätigung, danach verschwindet er.', v: 'overview', z: '#tm-home' },
    { id: 'tm-wimpern', st: 2, a: ['termin'], neu: '2026-10-15', t: 'Wimpern auffüllen oder neues Set', s: 'Bei Leistungen mit dem Haken „Auffüllen“ fragt das Formular, wann zuletzt aufgefüllt wurde und wie viele Wimpern noch da sind, dazu eine kurze Beschreibung. Ab wann ein neues Set fällig ist und ob Fotos ins Formular oder per WhatsApp kommen, stellen Sie unter Leistungen & Regeln ein. Im Termin-Blatt stellt „Auf neues Set ändern“ Leistung, Dauer und Preis um.', v: 'zeiten', z: '#zt-sab' },
    { id: 'tm-blockieren', st: 2, a: ['termin'], neu: '2026-10-15', t: 'Personen blockieren', s: 'Schickt jemand Unsinn, tippen Sie im Termin auf „Diese Person blockieren“. Von ihrer Nummer, E-Mail und ihrem Handy kommt nichts mehr an, offene Termine werden still abgesagt. Sie selbst sieht weiter „Danke“. Freigeben unter Leistungen & Regeln.', v: 'zeiten', z: '#zt-sab' },
    { id: 'tm-limit', st: 3, a: ['termin'], neu: '2026-10-15', t: 'Höchstzahl Anfragen je Handy', s: 'Unter Leistungen & Regeln: höchstens so viele Anfragen von einem Handy in 24 Stunden, zum Beispiel drei. Wer mehr schickt, sieht Ihre Telefonnummer.', v: 'zeiten', z: '#zt-sab' },
    { id: 'tm-zahl', st: 1, neu: '2026-10-15', t: 'Zahl auf dem App-Symbol', s: 'Liegt clickzauber auf dem Home-Bildschirm und sind Mitteilungen erlaubt, steht auf dem Symbol die Zahl der neuen Anfragen. Sie sinkt, sobald Sie Anfragen beantworten.', v: 'settings', z: { h2: 'Benachrichtigungen' } },
    { id: 'tm-inhalt', st: 2, a: ['termin'], neu: '2026-10-08', t: 'Inhaltsverzeichnis mit runden Kacheln', s: 'Ihre Kunden wählen ihre Leistungen über runde Kacheln, je nach Einstellung vor oder nach dem Tag. Bei Haarleistungen verlängern lange, lockige oder gefärbte Haare Zeit und Preis um Ihre Prozente. In jeder Anfrage steht die Rechnung Zeile für Zeile.', v: 'zeiten', z: '#zt-sab' },
    { id: 'tm-kundenkarte', st: 2, a: ['termin'], neu: '2026-10-04', t: 'Kundenkarte', s: 'Ein Tipp auf den Namen zeigt alle Besuche: wann, was, bei wem und ob jemand nicht gekommen ist.', tu: 'kk', z: '[data-v="stammkunden"] .card' },
    { id: 'tm-stammkunden', st: 2, a: ['termin'], fx: 'stammkunden', t: 'Stammkunden', s: 'Wer in den letzten drei Monaten mindestens viermal gebucht hat. So sehen Sie Ihre treuesten Kunden auf einen Blick.', v: 'stammkunden' },
    { id: 'tm-nichtda', st: 2, a: ['termin'], t: 'Nicht erschienen', s: 'Kam jemand nicht, markieren Sie es am Termin. Bei seiner nächsten Buchung sehen Sie einen Hinweis.', v: 'zeiten', z: '#zt-liste' },
    { id: 'au-fest', st: 2, a: ['auftrag'], t: 'Auftrag fest eintragen', s: 'Hat der Kunde online, per WhatsApp oder am Telefon zugesagt, tragen Sie den Auftrag fest ein. Der Tag ist damit belegt.', tu: 'auftrag', z: '#au-bl [data-au="fest"]' },
    { id: 'au-reiter', st: 2, a: ['auftrag'], t: 'Offen, Zugesagt, Danke sagen', s: 'Drei Reiter sortieren alles. Unter „Danke sagen“ stehen vergangene Aufträge, mit fertiger Danke-Nachricht.', v: 'overview', z: '#au-reiter' },
    { id: 'au-telefon', st: 2, a: ['auftrag'], t: 'Anruf? Auftrag eintragen', s: 'Kommt ein Auftrag per Telefon, tragen Sie Tag, Anlass und Personen ein. Der Tag ist sofort belegt.', v: 'overview', z: '#au-box .au-kopf button' },
    { id: 'au-verschieben', st: 2, a: ['auftrag'], t: 'Auf anderen Tag verschieben', s: 'Im zugesagten Auftrag: Der neue Tag wird belegt, der alte wird frei, und der Kunde bekommt Bescheid.', tu: 'auftragFest', z: '#au-bl [data-au="umb"]' },
    { id: 'raeume', st: 2, a: ['auftrag', 'location'], t: 'Fahrzeuge, Räume oder Zeitfenster', s: 'Ein Tag gilt erst als ausgebucht, wenn alles vergeben ist. Ein Food Truck trägt seine Fahrzeuge ein, eine Location ihre Räume.', v: 'belegung', z: { h2: 'Räume' } },
    { id: 'lo-warteliste', st: 2, a: ['location'], t: 'Warteliste', s: 'War der Wunschtag vergeben, kommt der Gast auf die Warteliste. Wird der Tag frei, bekommen alle mit E-Mail-Adresse von selbst Bescheid.', v: 'kalender', z: '#wl-card' },
    { id: 'suchen-filtern', st: 2, a: ['location', 'pipeline'], t: 'Suchen und filtern', s: 'Nach Name, Ort oder einer Antwort suchen. Die Knöpfe darunter filtern nach Einstufung.', v: 'leads', z: '#l-suche' },
    { id: 'pl-ansicht', st: 2, a: ['pipeline'], t: 'Tafel oder Liste', s: 'Lieber eine Liste? Oben an der Tafel umschalten. Suche und Filter wirken auf beides.', v: 'leads', z: '#pl-box' },
    { id: 'wiedervorlage', st: 2, a: NT, t: 'Erinnere mich am …', s: 'In jeder Anfrage einen Tag wählen. An diesem Tag kommt ab 8 Uhr eine Erinnerung als Mitteilung und per Mail.', tu: 'wv', z: '#au-bl details.au-wv, #dt-wv' },
    { id: 'vorlagen', st: 2, a: NT, fx: 'vorlagen', t: 'Antwort-Vorlagen', s: 'Textbausteine für Zusage, Absage und Rückfrage. Name, Termin und Preis setzt das Cockpit selbst ein.', v: 'vorlagen', z: '#vl-liste' },
    { id: 'whatsapp', st: 2, t: 'WhatsApp mit einem Tipp', s: 'Aus jeder Anfrage öffnet sich WhatsApp mit fertigem Text. Danach fragt das Cockpit, ob die Nachricht raus ist.', tu: 'wa' },
    { id: 'kalender', st: 2, t: 'Mit Ihrem Kalender verbinden', s: 'Jeder Termin erscheint von selbst in Google, Outlook oder Apple Kalender. Private Termine dort sperren die Zeit im Formular.', v: 'kalender', z: '#abo2-karte' },
    { id: 'tage', st: 2, t: 'Tage sperren', s: 'Ruhetage legen Sie einmal fest, Urlaub tippen Sie im Kalender an. Gesperrte Tage kann im Formular niemand wählen.', v: 'belegung', z: { h2: 'Grundsätzlich geschlossen' } },
    { id: 'historie', st: 2, fx: 'historie', neu: '2026-10-05', t: 'Historienbuch', s: 'Alle Kunden der letzten 30 Tage, die da waren, mit allen Angaben. Als Tabelle zum Herunterladen.', tu: 'historie' },
    { id: 'suche', st: 2, t: 'Suchen', s: 'Gast, Seite oder Einstellung finden. Am Computer auch mit Strg+K oder ⌘K.', tu: 'suche' },
    { id: 'gast-mail', st: 2, t: 'Bestätigung an den Gast', s: 'Der Gast bekommt seine Angaben per E-Mail. Mit Ihrem Namen und Ihrer Telefonnummer darunter wirkt das persönlich.', v: 'settings', z: { h2: 'Kontakt für Ihre Gäste' } },
    { id: 'zwischen', st: 2, t: 'Zwischennachricht an den Gast', s: 'Bleibt eine Anfrage drei Tage liegen, bekommt der Gast eine kurze Nachricht, dass sie angekommen ist. Ihre eigenen Erinnerungen kommen immer.', v: 'settings', z: '#s-nachfassen' },
    { id: 'einbauen', st: 2, t: 'Fest in Ihre Website einbauen', s: 'Für Wix, Jimdo, WordPress und Co.: Code kopieren und einfügen. Oder die fertige Mail an Ihre Agentur weiterleiten.', v: 'embed', z: { h2: 'Ich pflege meine Website selbst' } },
    { id: 'recht', st: 2, t: 'Rechtliches an einer Stelle', s: 'Auftragsverarbeitungsvertrag, Datenschutzerklärung und Löschfrist. Sie zählen erst, wenn Sie sie unten mit Haken bestätigt haben. Vorher lässt sich das Formular nicht live schalten.', v: 'recht' },
    { id: 'pause', st: 2, t: 'Formular pausieren', s: 'Ausgebucht oder im Urlaub? Dann sehen Besucher Ihren Hinweis statt der Fragen. Am Code auf Ihrer Website ändert sich nichts.', v: 'settings', z: '#s-pausiert' },
    /* ── Für Fortgeschrittene ── */
    { id: 'tm-dauer', st: 3, a: ['termin'], t: 'Mehr Zeit bei langem Haar', s: 'Bei jeder Leistung einstellbar: Bei langem oder dickem Haar plant das Formular mehr Zeit ein.', v: 'zeiten', z: { h2: 'Leistungen' } },
    { id: 'tm-beratung', st: 3, a: ['termin'], t: 'Nur nach Beratung', s: 'Für Leistungen wie Färben: Der Gast schickt Fotos und einen Wunschtag, Sie schlagen Dauer und Zeit vor.', v: 'zeiten', z: { h2: 'Leistungen' } },
    { id: 'tm-dh', st: 3, a: ['termin'], fx: 'damen_herren', zeigAus: 1, neu: '2026-10-07', t: 'Damen, Herren und Kinder getrennt', s: 'Bei jeder Leistung steht, für wen sie ist. Das Formular fragt zuerst „Für wen ist der Termin?“ und zeigt nur Passendes.', sAus: 'Für Salons mit Damen und Herren. Unter Einstellungen → Funktionen einschalten, dann fragt das Formular zuerst „Für wen ist der Termin?“.', v: 'zeiten', z: { h2: 'Leistungen' } },
    { id: 'leistungen', st: 3, a: NT, t: 'Preise und Leistungen', s: 'Was Sie anbieten und was es kostet. Daraus nennt das Formular Ihren Gästen einen Richtwert, und Ihre Angebote füllen sich von selbst.', v: 'leistungen', z: '#ls-liste' },
    { id: 'preis-gast', st: 3, fx: 'preis_gast', zeigAus: 1, neu: '2026-10-08', t: 'Preise für Ihre Kunden', v: 'settings', z: '#fx-card',
      s: 'Ihr Kunde sieht vor dem Absenden seine Auswahl mit Einzelpreisen und Gesamtbetrag, auch in seiner Bestätigung. Unter Einstellungen → Funktionen schalten Sie das aus, dann sieht er nur seine Auswahl.',
      sAus: 'Ausgeschaltet: Ihr Kunde sieht nur seine Auswahl, ohne Preise. Unter Einstellungen → Funktionen wieder einschalten.' },
    { id: 'umsatz', st: 3, a: NT, t: 'Umsatz', s: 'Was in offenen Anfragen steckt und was davon diesen Monat realistisch kommt.', v: 'umsatz' },
    { id: 'auswertung', st: 3, a: NT, t: 'Auswertung', s: 'Bei welcher Frage Besucher aussteigen und woher sie kommen. So verbessern Sie Ihr Formular gezielt.', v: 'stats' },
    { id: 'vergleich', st: 3, t: 'Zwei Fassungen vergleichen', s: 'Lassen Sie zwei Varianten einer Frage parallel laufen. clickzauber zeigt, welche mehr Anfragen bringt.', v: 'vergleich' },
    { id: 'bericht', st: 3, t: 'Monatsbericht per E-Mail', s: 'Am 1. jeden Monats auf einem Blatt: Anfragen, Abschlussquote, Umsatz und der größte Hebel.', v: 'settings', z: { h2: 'Berichte' } },
    { id: 'funktionen', st: 3, neu: '2026-10-07', t: 'Funktionen ein- und ausschalten', s: 'Unter Einstellungen → Funktionen schalten Sie ab, was Sie nicht brauchen. Es verschwindet sofort, auf allen Ihren Geräten.', v: 'settings', z: '#fx-card' },
    { id: 'netzwerk', st: 3, fx: 'netzwerk', t: 'Vernetzen', s: 'Betriebe aus Ihrer Nähe empfehlen sich gegenseitig. Mit eigenem Profil, Nachrichten und einer Rangliste.', v: 'vernetzen' },
    { id: 'partner', st: 3, fx: 'netzwerk', t: 'Partner im Formular', s: 'Empfehlen Sie vernetzte Betriebe direkt in Ihrem Formular. Ihr Gast sieht sie unter dem Formular.', v: 'partner' },
    { id: 'entdecken', st: 3, fx: 'entdecken', t: 'Andere Vorlagen', s: 'Formulare anderer Branchen zum Durchklicken, als wären Sie Gast. Wählen Sie eine aus, ersetzt sie beim Speichern Ihr Formular.', v: 'entdecken' }
  ];
  var ST = ['', 'Grundlagen', 'Im Alltag', 'Für Fortgeschrittene'];
  var BY = {}; F.forEach(function (x) { BY[x.id] = x; });
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function istApp() { return document.documentElement.classList.contains('cz-app'); }
  function art() { var b = document.body.classList; return b.contains('art-termin') ? 'termin' : b.contains('art-auftrag') ? 'auftrag' : b.contains('art-pipeline') ? 'pipeline' : 'location'; }
  function fxAn(k) { return !k || !window.czFunktionen || window.czFunktionen.an(k) !== false; }
  function aus(x) { return !!(x.zeigAus && !fxAn(x.fx)); }
  function passend() { var a = art(); return F.filter(function (x) { return (!x.a || x.a.indexOf(a) >= 0) && (x.zeigAus || fxAn(x.fx)); }); }
  function istNeu(x) { return !!x.neu && Date.now() - new Date(x.neu + 'T12:00:00').getTime() < 30 * 864e5; }
  function text(x) { return aus(x) ? x.sAus : (istApp() && x.sApp) || (x.sArt && x.sArt[art()]) || x.s; }

  var BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"></path><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"></path></svg>';
  var XX = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';
  var HAKEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>';

  var css = document.createElement('style'); css.id = 'cz-fxm-css';
  css.textContent = ''
    + '#fxm-tab{position:fixed;left:0;top:50%;z-index:65;width:34px;height:54px;margin-top:-27px;display:flex;align-items:center;justify-content:center;border:0;padding:0;border-radius:0 14px 14px 0;background:rgba(33,29,22,.86);color:#fff;cursor:pointer;touch-action:none;box-shadow:2px 4px 16px rgba(0,0,0,.25)}'
    + '#fxm-tab svg{width:20px;height:20px}#fxm-tab[hidden]{display:none}'
    + '#fxm-tab i{position:absolute;top:-7px;right:-9px;min-width:20px;height:20px;border-radius:10px;background:#e0a800;color:#211d16;font:700 11px/20px system-ui,sans-serif;font-style:normal;text-align:center;padding:0 5px;box-sizing:border-box}#fxm-tab i:empty{display:none}'
    + '@media(min-width:761px){#fxm-tab{display:none!important}}'
    + '.side .fxm-nav{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;margin:0 0 6px;border-radius:10px;color:var(--ink);font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;background:none;border:none;text-align:left}'
    + '.side .fxm-nav:hover{background:var(--panel-2)}.side .fxm-nav svg{width:18px;height:18px;flex:0 0 auto}'
    + '.side .fxm-nz{margin-left:auto;font-family:var(--fm,ui-monospace,monospace);font-size:11px;background:#e0a800;color:#211d16;border-radius:999px;padding:1px 7px}.side .fxm-nz:empty{display:none}'
    + '#fxm-rk{position:fixed;inset:0;z-index:8990;background:rgba(20,16,10,.45)}'
    + '#fxm-blatt{position:fixed;left:0;right:0;bottom:0;z-index:9000;max-height:88vh;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:var(--panel,#faf7f0);color:var(--ink,#241f19);border-radius:20px 20px 0 0;padding:14px 16px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;box-shadow:0 -20px 50px rgba(0,0,0,.3);font-family:var(--fd,system-ui,sans-serif)}'
    + '#fxm-blatt>*{flex-shrink:0}#fxm-blatt[hidden],#fxm-rk[hidden],#fxm-bar[hidden]{display:none}'
    + '@media(min-width:761px){#fxm-blatt{left:16px;right:auto;top:16px;bottom:16px;width:420px;max-height:none;border-radius:20px}}'
    + '.fxm-k{display:flex;align-items:center;justify-content:space-between;gap:10px}.fxm-k b{font-size:18px;letter-spacing:-.01em}'
    + '.fxm-x{width:44px;height:44px;padding:0;border-radius:12px;border:1px solid var(--line,rgba(0,0,0,.12));background:var(--panel-2,#fff);display:grid;place-items:center;cursor:pointer;color:var(--ink-2,#5c544a)}'
    + '.fxm-tabs{display:flex;gap:3px;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:12px;background:var(--panel-2,#fff);padding:3px}'
    + '.fxm-tabs button{flex:1 1 0;border:0;background:none;font:inherit;font-size:14px;font-weight:600;color:var(--ink-2,#5c544a);border-radius:9px;min-height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}'
    + '.fxm-tabs button.an{background:var(--accent,#2f7d59);color:var(--on-accent,#fff)}'
    + '.fxm-tabs i{font-style:normal;font-size:11.5px;font-weight:700;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:color-mix(in srgb,currentColor 16%,transparent);display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}.fxm-tabs i:empty{display:none}'
    + '.fxm-sub{margin:2px 0 0;font-size:13.5px;line-height:1.5;color:var(--ink-2,#5c544a);text-wrap:pretty}'
    + '#fxm-liste{display:flex;flex-direction:column;gap:8px}'
    + '.fxm-h{font-family:var(--fm,ui-monospace,monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3,#8a8272);margin:12px 0 0}'
    + '.fxm-e{background:var(--panel-2,#fff);border:1px solid var(--line,rgba(0,0,0,.12));border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;transition:opacity .25s,transform .25s}'
    + '.fxm-e.weg{opacity:0;transform:translateX(24px)}'
    + '.fxm-o{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.fxm-o b{font-size:15px;line-height:1.35}'
    + '.fxm-neu,.fxm-aus{font-size:11.5px;border-radius:99px;padding:1px 8px}.fxm-neu{background:#e0a800;color:#211d16;font-weight:700}.fxm-aus{background:color-mix(in srgb,currentColor 12%,transparent);color:var(--ink-2,#5c544a);font-weight:600}'
    + '.fxm-e p{margin:0;font-size:13.5px;line-height:1.5;color:var(--ink-2,#5c544a);text-wrap:pretty}'
    + '.fxm-u{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:2px}'
    + '.fxm-zeig{display:inline-flex;align-items:center;gap:6px;border:0;background:var(--accent,#2f7d59);color:var(--on-accent,#fff);font:inherit;font-weight:600;font-size:14px;border-radius:10px;padding:0 16px;min-height:44px;cursor:pointer}'
    + '.fxm-ok{display:inline-flex;align-items:center;gap:6px;border:1px solid color-mix(in srgb,currentColor 28%,transparent);background:none;color:var(--ink-2,#5c544a);font:inherit;font-weight:600;font-size:13.5px;border-radius:10px;padding:0 12px;min-height:44px;cursor:pointer}'
    + '.fxm-ok:hover{border-color:var(--accent,#2f7d59);color:var(--accent,#2f7d59)}.fxm-zeig svg,.fxm-ok svg{width:16px;height:16px;flex:0 0 auto}'
    + '.fxm-leer{margin:10px 0 0;font-size:14px;line-height:1.5;color:var(--ink-2,#5c544a)}'
    + '#fxm-bar{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translate(-50%,12px);z-index:9800;width:min(560px,calc(100vw - 24px));box-sizing:border-box;background:var(--ink,#241f19);color:var(--panel,#fffdf8);border-radius:16px;padding:14px 52px 14px 16px;box-shadow:0 16px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:10px;opacity:0;transition:opacity .2s,transform .2s;font-family:var(--fd,system-ui,sans-serif)}'
    + '#fxm-bar.da{opacity:1;transform:translate(-50%,0)}'
    + '@media(max-width:760px){#fxm-bar{bottom:calc(86px + env(safe-area-inset-bottom,0px))}}'
    + '#fxm-bar b{font-size:15px}#fxm-bar p{margin:3px 0 0;font-size:13.5px;line-height:1.5;opacity:.9;text-wrap:pretty}'
    + '.fxm-bk{display:flex;gap:8px;flex-wrap:wrap}#fxm-bar .fxm-ok,#fxm-bar .fxm-ok:hover{color:inherit}#fxm-bar .fxm-ok:hover{border-color:currentColor}'
    + '.fxm-bx{position:absolute;top:6px;right:6px;width:44px;height:44px;padding:0;border:0;background:none;color:inherit;cursor:pointer;display:grid;place-items:center;opacity:.8}'
    + '.fxm-mark{outline:3px solid #e0a800!important;outline-offset:4px;animation:fxm-puls 1s ease-in-out 3}'
    + '@keyframes fxm-puls{50%{outline-color:rgba(224,168,0,.2)}}';
  document.head.appendChild(css);

  /* ── Aufbau ── */
  var TAB = 'offen', BLATT = null, RK = null, LASCHE = null, BAR_AM = 0;
  function bauen() {
    if (BLATT) return;
    RK = document.createElement('div'); RK.id = 'fxm-rk'; RK.hidden = true; RK.setAttribute('data-fxm-zu', '');
    BLATT = document.createElement('div'); BLATT.id = 'fxm-blatt'; BLATT.hidden = true;
    BLATT.setAttribute('role', 'dialog'); BLATT.setAttribute('aria-modal', 'true'); BLATT.setAttribute('aria-label', 'Funktionen');
    BLATT.innerHTML = '<div class="fxm-k"><b>Funktionen</b><button type="button" class="fxm-x" data-fxm-zu aria-label="Schließen">' + XX + '</button></div>'
      + '<div class="fxm-tabs" role="tablist"><button type="button" role="tab" data-fxm-tab="offen">Funktionen <i id="fxm-z1"></i></button><button type="button" role="tab" data-fxm-tab="ok">Verstanden <i id="fxm-z2"></i></button></div>'
      + '<div id="fxm-liste"></div>';
    document.body.appendChild(RK); document.body.appendChild(BLATT);
    LASCHE = document.createElement('button'); LASCHE.type = 'button'; LASCHE.id = 'fxm-tab'; LASCHE.setAttribute('aria-label', 'Funktionen');
    LASCHE.innerHTML = BULB + '<i id="fxm-tz"></i>';
    document.body.appendChild(LASCHE); ziehen(LASCHE);
    var side = document.querySelector('.side');
    if (side) {
      var n = document.createElement('button'); n.type = 'button'; n.className = 'fxm-nav'; n.setAttribute('data-fxm-auf', '');
      n.innerHTML = BULB + 'Funktionen<span class="fxm-nz" id="fxm-nz"></span>';
      side.insertBefore(n, side.querySelector('.suchknopf') || side.querySelector('.sp') || null);
    }
    sichtbar();
  }
  function appDa() { var a = $('app'); return !!a && a.style.display !== 'none' && !window._admin; }
  function sichtbar() { if (LASCHE) LASCHE.hidden = !appDa(); }
  /* Lasche: antippen öffnet, senkrecht ziehen verschiebt. Im Test-Cockpit sitzt dessen eigene Lasche in der Mitte, deshalb dort tiefer. */
  function ziehen(k) {
    var start = null, y0 = 0, zog = false, YK = 'cz_fxm_y', y = NaN;
    try { y = parseInt(localStorage.getItem(YK), 10); } catch (e) {}
    function setz(v) { k.style.top = Math.max(90, Math.min(innerHeight - 120, v)) + 'px'; }
    setz(isNaN(y) ? Math.round(innerHeight * (window.parent !== window ? 0.64 : 0.5)) : y);
    k.addEventListener('pointerdown', function (e) { start = e.clientY; y0 = k.getBoundingClientRect().top + k.offsetHeight / 2; zog = false; try { k.setPointerCapture(e.pointerId); } catch (x) {} });
    k.addEventListener('pointermove', function (e) { if (start === null) return; var d = e.clientY - start; if (Math.abs(d) > 6) zog = true; if (zog) setz(y0 + d); });
    k.addEventListener('pointerup', function () { if (start === null) return; start = null; if (zog) { try { localStorage.setItem(YK, String(parseInt(k.style.top, 10))); } catch (x) {} } else auf(); });
    k.addEventListener('pointercancel', function () { start = null; });
    k.addEventListener('click', function (e) { if (e.detail === 0) auf(); });
    window.addEventListener('resize', function () { setz(parseInt(k.style.top, 10) || innerHeight / 2); });
  }

  /* ── Liste ── */
  function auf(tab) { bauen(); if (tab) TAB = tab; zeichnen(); RK.hidden = false; BLATT.hidden = false; BLATT.scrollTop = 0; barZu(); }
  function zu() { if (BLATT) { BLATT.hidden = true; RK.hidden = true; } }
  function zahlen(o, k) {
    [['fxm-tz', o], ['fxm-nz', o], ['fxm-z1', o], ['fxm-z2', k]].forEach(function (p) { var e = $(p[0]); if (e) e.textContent = p[1] || ''; });
  }
  function stand() { var o = 0, k = 0; passend().forEach(function (x) { if (OK[x.id]) k++; else o++; }); zahlen(o, k); }
  function karte(x, ab) {
    return '<div class="fxm-e"><div class="fxm-o"><b>' + esc(x.t) + '</b>' + (istNeu(x) ? '<span class="fxm-neu">Neu</span>' : '') + (aus(x) ? '<span class="fxm-aus">Ausgeschaltet</span>' : '') + '</div>'
      + '<p>' + esc(text(x)) + '</p><div class="fxm-u"><button type="button" class="fxm-zeig" data-fxm-zeig="' + x.id + '" aria-label="Zeigen: ' + esc(x.t) + '">Zeigen</button>'
      + (ab ? '<button type="button" class="fxm-ok" data-fxm-zur="' + x.id + '" aria-label="Zurückholen: ' + esc(x.t) + '">Zurückholen</button>'
        : '<button type="button" class="fxm-ok" data-fxm-ok="' + x.id + '" aria-label="Verstanden: ' + esc(x.t) + '">' + HAKEN + 'Verstanden</button>')
      + '</div></div>';
  }
  function gruppen(l, ab) {
    return [1, 2, 3].map(function (s) {
      var g = l.filter(function (x) { return x.st === s; });
      return g.length ? '<div class="fxm-h">' + ST[s] + '</div>' + g.map(function (x) { return karte(x, ab); }).join('') : '';
    }).join('');
  }
  function zeichnen() {
    if (!BLATT) return;
    var L = passend(), offen = L.filter(function (x) { return !OK[x.id]; }), ok = L.filter(function (x) { return OK[x.id]; });
    zahlen(offen.length, ok.length);
    [].forEach.call(BLATT.querySelectorAll('[data-fxm-tab]'), function (b) { var an = b.getAttribute('data-fxm-tab') === TAB; b.classList.toggle('an', an); b.setAttribute('aria-selected', an ? 'true' : 'false'); });
    $('fxm-liste').innerHTML = TAB === 'ok'
      ? '<p class="fxm-sub">Was Sie schon kennen. „Zeigen“ geht weiterhin, „Zurückholen“ legt eine Funktion wieder zu den anderen.</p>'
        + (ok.length ? gruppen(ok, true) : '<p class="fxm-leer">Noch nichts hier. Tippen Sie bei einer Funktion auf „Verstanden“, dann liegt sie hier.</p>')
      : '<p class="fxm-sub">Alles, was Ihr Cockpit kann, vom Einstieg bis zu den Profi-Funktionen. „Zeigen“ führt Sie direkt hin. Was Sie kennen, legen Sie mit „Verstanden“ ab.</p>'
        + (offen.length ? gruppen(offen, false) : '<p class="fxm-leer">Sie kennen alle Funktionen. Neue erscheinen hier von selbst.</p>');
  }
  function verstanden(id, ausLeiste) {
    OK[id] = Date.now(); merken();
    if (ausLeiste) { barZu(); stand(); return; }
    var b = BLATT && BLATT.querySelector('[data-fxm-ok="' + id + '"]'), k = b && b.closest('.fxm-e');
    if (k) { k.classList.add('weg'); setTimeout(zeichnen, 260); } else zeichnen();
  }

  /* ── Zeigen ── */
  function warte(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function seite(v) { try { if (typeof window.show === 'function') window.show(v); } catch (e) {} }
  function leads() { return (window.CZ_LEADS_ALL || []).slice(); }
  function heute() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function auftragBlatt(f) { seite('overview'); var l = leads().filter(f)[0]; if (l && window.czAuOeffnen) window.czAuOeffnen(l.id); return warte(450); }
  var TU = {
    historie: function () { if (window.czHistorie && window.czHistorie.oeffnen) window.czHistorie.oeffnen(); return warte(350); },
    suche: function () { var b = document.querySelector('[data-suche]'); if (b) b.click(); return warte(250); },
    termin: function () {
      seite('overview');
      return finden('#sal-offen [data-salk], #sal-fest [data-salk]', 2400).then(function (k) { if (k) { k.click(); return warte(500); } });
    },
    kk: function () { if (fxAn('stammkunden')) { seite('stammkunden'); return warte(350); } return TU.termin(); },
    auftrag: function () { return auftragBlatt(function (l) { return ['neu', 'angerufen', 'angebot'].indexOf(l.status || 'neu') >= 0; }); },
    auftragFest: function () { return auftragBlatt(function (l) { return l.status === 'gebucht' && (!l.termin || String(l.termin).slice(0, 10) >= heute()); }); },
    anfrage: function () {
      seite('leads');
      var l = leads().filter(function (x) { return x.status !== 'verloren'; })[0] || leads()[0];
      if (l && typeof window.dtOeffnen === 'function') { try { window.dtOeffnen(l.id); } catch (e) {} }
      return warte(450);
    },
    wa: function () { var a = art(); return a === 'termin' ? TU.termin() : a === 'auftrag' ? TU.auftrag() : TU.anfrage(); },
    wv: function () { return art() === 'auftrag' ? TU.auftrag() : TU.anfrage(); }
  };
  function zuSehen(el) {
    if (!el || !el.getClientRects().length) return false;
    var s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none';
  }
  /* Steckt die Stelle in einer zugeklappten Karte (Einstellungen), diese aufklappen. */
  function aufklappen(el) {
    var k = el.closest && el.closest('.akk-koerper'), c = k && k.closest('.card');
    if (c && !c.classList.contains('auf')) { var kopf = c.querySelector('.akk-kopf'); if (kopf) { kopf.click(); return true; } }
    return false;
  }
  function treffer(z) {
    var l = [], i;
    if (typeof z === 'string') l = [].slice.call(document.querySelectorAll(z));
    /* Einstellungen: Die Überschrift einer Karte steckt im Akkordeon-Knopf (data-akk), das h2 gibt es dort nicht mehr */
    else [].forEach.call(document.querySelectorAll('.view.on h2, .view.on h3, .view.on .card[data-akk]'), function (h) { var tx = h.hasAttribute('data-akk') ? h.getAttribute('data-akk') : (h.textContent || ''); if (tx.trim().indexOf(z.h2) === 0) l.push(h.closest('.card') || h); });
    for (i = 0; i < l.length; i++) if (zuSehen(l[i])) return l[i];
    for (i = 0; i < l.length; i++) aufklappen(l[i]);
    return null;
  }
  function finden(z, ms) {
    var bis = Date.now() + (ms || 3000);
    return new Promise(function (ok) {
      (function such() {
        var el = treffer(z);
        if (el || Date.now() > bis) { ok(el); return; }
        setTimeout(such, 150);
      })();
    });
  }
  function markieren(el) {
    if (el.tagName === 'DETAILS') el.open = true;
    if (getComputedStyle(el).position !== 'fixed') {
      var p = el.parentElement, fest = false;
      while (p && p !== document.body && p !== document.documentElement) {
        var s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4) break;
        if (s.position === 'fixed') { fest = true; break; }
        p = p.parentElement;
      }
      var r = el.getBoundingClientRect(), oben = innerWidth <= 760 ? 86 : 110;
      if (!fest) {
        if (p && p !== document.body && p !== document.documentElement) p.scrollBy({ top: r.top - p.getBoundingClientRect().top - 24, behavior: 'smooth' });
        else window.scrollBy({ top: r.top - oben, behavior: 'smooth' });
      }
    }
    el.classList.add('fxm-mark');
    setTimeout(function () { el.classList.remove('fxm-mark'); }, 3400);
  }
  function leiste(x) {
    var b = $('fxm-bar');
    if (!b) { b = document.createElement('div'); b.id = 'fxm-bar'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    b.innerHTML = '<div><b>' + esc(x.t) + '</b><p>' + esc(text(x)) + '</p></div><div class="fxm-bk">'
      + (OK[x.id] ? '' : '<button type="button" class="fxm-zeig" data-fxm-ok="' + x.id + '" data-fxm-bar aria-label="Verstanden: ' + esc(x.t) + '">' + HAKEN + 'Verstanden</button>')
      + '<button type="button" class="fxm-ok" data-fxm-auf>Alle Funktionen</button></div>'
      + '<button type="button" class="fxm-bx" data-fxm-barzu aria-label="Schließen">' + XX + '</button>';
    b.classList.remove('da'); b.hidden = false; BAR_AM = Date.now();
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('da'); }); });
  }
  function barZu() { var b = $('fxm-bar'); if (b) { b.classList.remove('da'); b.hidden = true; } }
  /* Zugeklappte Karte erst aufklappen, damit man sieht, was gemeint ist */
  function oeffnen(el) {
    if (el && el.classList && el.classList.contains('akk') && !el.classList.contains('auf')) { var kk = el.querySelector('.akk-kopf'); if (kk) { kk.click(); return warte(160).then(function () { return el; }); } }
    return el;
  }
  function zeigen(id) {
    var x = BY[id]; if (!x) return;
    zu(); barZu();
    var a = aus(x), v = a ? 'settings' : x.v, z = a ? '#fx-card' : x.z;
    if (v) seite(v);
    var vor = !a && x.tu && TU[x.tu] ? TU[x.tu]() : warte(v ? 350 : 60);
    Promise.resolve(vor)
      .then(function () { return z ? finden(z, 3000) : null; })
      .then(oeffnen)
      .then(function (el) { if (el) markieren(el); leiste(x); }, function () { leiste(x); });
  }

  /* ── Klicks ── */
  document.addEventListener('click', function (ev) {
    var t = ev.target, b; if (!t || !t.closest) return;
    if ((b = t.closest('[data-fxm-zeig]'))) { zeigen(b.getAttribute('data-fxm-zeig')); return; }
    if ((b = t.closest('[data-fxm-ok]'))) { verstanden(b.getAttribute('data-fxm-ok'), b.hasAttribute('data-fxm-bar')); return; }
    if ((b = t.closest('[data-fxm-zur]'))) { delete OK[b.getAttribute('data-fxm-zur')]; merken(); zeichnen(); return; }
    if ((b = t.closest('[data-fxm-tab]'))) { TAB = b.getAttribute('data-fxm-tab'); zeichnen(); BLATT.scrollTop = 0; return; }
    if (t.closest('[data-fxm-auf]')) { ev.preventDefault(); auf(); return; }
    if (t.closest('[data-fxm-zu]')) { zu(); return; }
    if (t.closest('[data-fxm-barzu]')) barZu();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && BLATT && !BLATT.hidden) zu(); });
  /* Wechselt man selbst die Seite, verschwindet die Erklär-Leiste. */
  (function hook(n) {
    if (typeof window.show === 'function' && !window.show._fxm) {
      var alt = window.show;
      window.show = function () { if (Date.now() - BAR_AM > 1500) barZu(); return alt.apply(this, arguments); };
      window.show._fxm = 1; return;
    }
    if (n < 40) setTimeout(function () { hook(n + 1); }, 250);
  })(0);

  function start() {
    bauen(); stand();
    var a = $('app');
    if (window.MutationObserver) {
      if (a) new MutationObserver(sichtbar).observe(a, { attributes: true, attributeFilter: ['style'] });
      var tm = 0;
      /* Die Art des Cockpits steht erst fest, wenn das Formular geladen ist (js/cz-art.js). */
      new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { stand(); if (BLATT && !BLATT.hidden) zeichnen(); }, 150); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('cz-funktionen', function () { stand(); if (BLATT && !BLATT.hidden) zeichnen(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  /* Für die Missionen (js/cz-missionen.js): wie viel der Betrieb je Stufe schon kennt */
  window.czFxMenue = { auf: auf, zu: zu, zeigen: zeigen, liste: F,
    kennt: function (id) { return !!OK[id]; },
    stufe: function (s) { var L = passend().filter(function (x) { return x.st === s && !aus(x); }); return { alle: L.length, ok: L.filter(function (x) { return OK[x.id]; }).length }; } };
})();
