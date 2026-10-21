// Fotos aus Beratungsanfragen (Speicher „beratung“) mit den Anfragen löschen.
// filter bekommt die Abfrage auf leads und grenzt sie ein, z. B. q => q.eq('tenant_id', id).
// Fehler werden geschluckt: ohne sql/47 gibt es keine Fotos, und Löschen darf nie hängen bleiben.
import { db } from './_lib.js';

export async function beratungsFotosWeg(filter) {
  try {
    const { data, error } = await filter(db.from('leads').select('fotos').not('fotos', 'is', null)).limit(5000);
    if (error || !data) return;
    const pfade = data.flatMap((l) => (Array.isArray(l.fotos) ? l.fotos : []));
    for (let i = 0; i < pfade.length; i += 100) await db.storage.from('beratung').remove(pfade.slice(i, i + 100));
  } catch (e) { /* still */ }
}
