// Historie (seit 05.10.2026): Vergangene Kunden stehen 30 Tage im Cockpit unter „Historie“ (js/cz-historie.js).
// Danach löscht diese Aufgabe sie vom Server: feste Termine (Friseur & Co.) und zugesagte Aufträge mit Datum
// (alle anderen), jeweils 30 Tage nach dem Tag. Wer sie behalten will, lädt sie vorher als CSV herunter.
// Gilt erst für Tage ab dem 05.10.2026. Ältere Einträge löscht weiter die Löschfrist (lib/loeschfrist.js).
// Sieben Tage vorher bekommt der Betrieb einmal Bescheid (Push, sonst Mail). Läuft nachts (api/nacht.js).
import { db } from './_lib.js';
import { betriebMelden } from './_push.js';
import { heuteBerlin, plusTage, lokal } from './_termine.js';

export const HISTORIE_TAGE = 30;
export const HISTORIE_AB = '2026-10-05';

function plus(m, k, n) { m.set(k, (m.get(k) || 0) + n); }

export async function historiePflege() {
  const heute = heuteBerlin();
  const grenze = plusTage(heute, -HISTORIE_TAGE);
  const warnTag = plusTage(heute, -(HISTORIE_TAGE - 7));
  let termine = 0, auftraege = 0, hinweise = 0;
  const geloescht = new Map();

  // 1. Feste Termine vor der Grenze
  if (grenze > HISTORIE_AB) {
    const { data: alt } = await db.from('termine').select('id, tenant_id, lead_id').eq('status', 'fest')
      .gte('start', lokal(HISTORIE_AB, '00:00').toISOString()).lt('start', lokal(grenze, '00:00').toISOString()).limit(5000);
    const ids = (alt || []).map((t) => t.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db.from('termine').delete().in('id', ids.slice(i, i + 200));
      if (!error) termine += Math.min(200, ids.length - i);
    }
    (alt || []).forEach((t) => plus(geloescht, t.tenant_id, 1));
    // Die Anfrage zum Termin geht mit, wenn kein anderer Termin mehr daran hängt.
    const leadIds = [...new Set((alt || []).map((t) => t.lead_id).filter(Boolean))];
    for (const lid of leadIds) {
      const { count } = await db.from('termine').select('id', { count: 'exact', head: true }).eq('lead_id', lid);
      if (!count) await db.from('leads').delete().eq('id', lid).then(() => {}, () => {});
    }

    // 2. Zugesagte Aufträge mit Datum vor der Grenze
    const { data: la } = await db.from('leads').select('id, tenant_id').eq('status', 'gebucht').not('tenant_id', 'is', null)
      .gte('termin', HISTORIE_AB).lt('termin', grenze).limit(5000);
    const lids = (la || []).map((l) => l.id);
    for (let i = 0; i < lids.length; i += 200) {
      const { error } = await db.from('leads').delete().in('id', lids.slice(i, i + 200));
      if (!error) auftraege += Math.min(200, lids.length - i);
    }
    (la || []).forEach((l) => plus(geloescht, l.tenant_id, 1));
  }
  for (const [tid, n] of geloescht) {
    await db.from('protokoll').insert({ tenant_id: tid, was: 'historie_geloescht', anzahl: n, hinweis: 'Historie: ' + HISTORIE_TAGE + ' Tage abgelaufen' }).then(() => {}, () => {});
  }

  // 3. Hinweis sieben Tage vorher: alles, was genau an warnTag war
  if (warnTag >= HISTORIE_AB) {
    const bald = new Map();
    const { data: tw } = await db.from('termine').select('tenant_id').eq('status', 'fest')
      .gte('start', lokal(warnTag, '00:00').toISOString()).lt('start', lokal(plusTage(warnTag, 1), '00:00').toISOString()).limit(5000);
    (tw || []).forEach((t) => plus(bald, t.tenant_id, 1));
    const { data: lw } = await db.from('leads').select('tenant_id').eq('status', 'gebucht').not('tenant_id', 'is', null)
      .gte('termin', warnTag).lt('termin', plusTage(warnTag, 1)).limit(5000);
    (lw || []).forEach((l) => plus(bald, l.tenant_id, 1));
    for (const [tid, n] of bald) {
      await betriebMelden(tid, {
        title: n === 1 ? 'Ein Eintrag in der Historie wird in 7 Tagen gelöscht' : n + ' Einträge in der Historie werden in 7 Tagen gelöscht',
        body: 'Wenn Sie sie behalten möchten: im Cockpit unter Historie als CSV herunterladen.',
        url: 'clickzauber-cockpit-live.html#historie', tag: 'cz-historie'
      }).catch(() => {});
      hinweise++;
    }
  }
  return { termine, auftraege, hinweise };
}
