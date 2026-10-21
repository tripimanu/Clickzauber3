// Belegte Tage und Zeiten aus angebundenen Kalendern, wie sie in widgets.belegung stehen.
//   kal_*  aus der eingetragenen Kalender-Adresse (iCal-Feed, je Formular)
//   dk_*   aus der Echtzeit-Verbindung (Google, Outlook, iCloud, je Konto in jedes Formular kopiert)
// Klein gehalten, weil /api/config (heißester Weg) es lädt.

// Formulare mit ganzen Tagen: jeder Tag, an dem im Kalender etwas steht.
// Formulare mit Uhrzeit (nurGanz): nur ganztägige Termine sperren den ganzen Tag, der Rest über kalZeiten.
export function kalTage(b, nurGanz) {
  b = b || {};
  return nurGanz ? [...(b.kal_ganz || []), ...(b.dk_ganz || [])] : [...(b.kal_tage || []), ...(b.dk_tage || [])];
}
// [startMs, endeMs, personal_ids|null] — null heißt: gilt für alle Mitarbeiter.
export function kalZeiten(b) {
  b = b || {};
  return [...(Array.isArray(b.kal_zeiten) ? b.kal_zeiten : []), ...(Array.isArray(b.dk_zeiten) ? b.dk_zeiten : [])];
}
// Wie viele Einträge passen an einen Tag: Räume (Location) oder Aufträge pro Tag (Food Truck & Co.).
export function proTag(b) {
  b = b || {};
  const raeume = (Array.isArray(b.raeume) && b.raeume.length) ? b.raeume.length : 1;
  return Math.max(raeume, parseInt(b.pro_tag, 10) || 1);
}
