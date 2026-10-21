// Link für den Gast: „Absagen oder anderen Tag wünschen“ (seit 03.10.2026).
// Steht in der Bestätigung eines festen Termins. Seite: meine-anfrage.html, Server: lib/auftrag.js (aktion 'gast').
import { createHmac } from 'crypto';
import { GEHEIM } from './_lib.js';

export function gastSchluessel(id) {
  return createHmac('sha256', GEHEIM).update('gast:' + id).digest('hex').slice(0, 20);
}
export function gastLink(id) {
  return 'https://clickzauber.de/meine-anfrage.html?l=' + id + '&k=' + gastSchluessel(id);
}
