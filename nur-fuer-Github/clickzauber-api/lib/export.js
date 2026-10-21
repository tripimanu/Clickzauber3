// GET /api/export?token=…&was=anfragen  → CSV aller eigenen Anfragen
// Erfüllt Art. 20 DSGVO (Datenportabilität) und ist die Grundlage, wenn ein Gast
// nach Art. 15 Auskunft verlangt. Der Betrieb kann jederzeit selbst exportieren.
import { db, cors, userByToken } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Methode nicht erlaubt' });

  const user = await userByToken(req.query.token);
  if (!user) return res.status(401).json({ error: 'nicht angemeldet' });
  if (!user.tenant_id) return res.status(400).json({ error: 'kein Betrieb hinterlegt' });

  if (req.query.was === 'termine') {
    const { data: tt } = await db.from('termine').select('*').eq('tenant_id', user.tenant_id).order('start', { ascending: false }).limit(20000);
    const fmt = (t) => new Date(t).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    const zeilenT = [['Beginn', 'Ende', 'Status', 'Mitarbeiter', 'Leistung', 'Name', 'Telefon', 'E-Mail', 'Nachricht', 'Eingetragen'].map(feld).join(';')];
    (tt || []).forEach((t) => zeilenT.push([fmt(t.start), fmt(t.ende), t.status, t.personal_name, t.leistung, t.name, t.telefon, t.email, t.nachricht, fmt(t.created_at)].map(feld).join(';')));
    await db.from('protokoll').insert({ tenant_id: user.tenant_id, was: 'export', wer: user.email, anzahl: (tt || []).length, hinweis: 'CSV-Export aller Uhrzeit-Termine' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="termine-' + new Date().toISOString().slice(0, 10) + '.csv"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send('\uFEFF' + zeilenT.join('\r\n'));
  }

  const slugs = await slugsVon(db, user.tenant_id);
  const spalten = 'ts, name, email, phone, termin, value_est, status, answers, widget_id';
  const [eigen, ueberWidget] = await Promise.all([
    db.from('leads').select(spalten).eq('tenant_id', user.tenant_id).order('ts', { ascending: false }).limit(20000),
    slugs.length
      ? db.from('leads').select(spalten).is('tenant_id', null).in('widget_id', slugs).order('ts', { ascending: false }).limit(20000)
      : Promise.resolve({ data: [] })
  ]);
  const leads = [...(eigen.data || []), ...(ueberWidget.data || [])]
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));

  const zeilen = leads || [];

  // Alle vorkommenden Antwortfelder sammeln, damit jede Antwort eine eigene Spalte bekommt.
  const felder = new Set();
  zeilen.forEach((l) => Object.keys(l.answers || {}).forEach((k) => felder.add(k)));
  const extra = [...felder].sort();

  const kopf = ['Eingang', 'Name', 'E-Mail', 'Telefon', 'Wunschtermin', 'Richtwert', 'Status', 'Widget', ...extra];
  const csv = [kopf.map(feld).join(';')];
  zeilen.forEach((l) => {
    const a = l.answers || {};
    csv.push([
      l.ts ? new Date(l.ts).toLocaleString('de-DE') : '',
      l.name || '', l.email || '', l.phone || '',
      l.termin || '', l.value_est || '', l.status || '', l.widget_id || '',
      ...extra.map((k) => a[k] || '')
    ].map(feld).join(';'));
  });

  await db.from('protokoll').insert({
    tenant_id: user.tenant_id, was: 'export', wer: user.email, anzahl: zeilen.length,
    hinweis: 'CSV-Export aller Anfragen'
  });

  const datum = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="anfragen-${datum}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  // Kennung, damit Excel die Umlaute richtig liest.
  return res.status(200).send('\uFEFF' + csv.join('\r\n'));
}

function feld(v) {
  const s = String(v == null ? '' : v);
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/* Anfragen können älter sein als das tenant_id-Feld. Deshalb beide Wege:
   über den Betrieb UND über dessen Widget-Kennungen. */
async function slugsVon(db, tenantId) {
  const { data } = await db.from('widgets').select('slug').eq('tenant_id', tenantId);
  return (data || []).map((w) => w.slug);
}
