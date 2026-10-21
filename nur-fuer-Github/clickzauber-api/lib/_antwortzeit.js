// Antwortzeit eines Betriebs (sql/41). Wird von /api/netz und /api/config genutzt.
import { db } from './_lib.js';

// Median der ersten Reaktion der letzten 90 Tage, ab 5 beantworteten Anfragen.
// Stufen statt Minuten: „innerhalb einer Stunde“, „innerhalb von 3 Stunden“, „am selben Tag“.
export async function antwortZeit(id) {
  if (!id) return null;
  const seit = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data, error } = await db.from('leads').select('created_at, erste_antwort_at').eq('tenant_id', id)
    .gte('created_at', seit).not('erste_antwort_at', 'is', null).limit(400);
  if (error || !data) return null;
  const m = data.map((l) => (new Date(l.erste_antwort_at) - new Date(l.created_at)) / 6e4).filter((x) => x >= 0).sort((a, b) => a - b);
  if (m.length < 5) return { stufe: null, anzahl: m.length };
  const med = m[Math.floor(m.length / 2)];
  return { stufe: med <= 60 ? 'stunde' : med <= 180 ? '3std' : med <= 1440 ? 'tag' : null, minuten: Math.round(med), anzahl: m.length };
}
