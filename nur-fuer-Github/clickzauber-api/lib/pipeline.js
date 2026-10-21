// GET /api/pipeline?token=…&tage=90
// Was in offenen Angeboten steckt, und was davon diesen Monat realistisch kommt.
import { db, cors, userByToken, rolleVon } from './_lib.js';

// Erfahrungswerte je Stand — bewusst konservativ, damit die Prognose nicht schmeichelt.
const CHANCE = { neu: 0.15, angerufen: 0.35, angebot: 0.55, gebucht: 1, verloren: 0 };

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await userByToken(req.query.token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const rolle = await rolleVon(user);

  const tage = Math.min(365, Math.max(7, parseInt(req.query.tage, 10) || 90));
  const seit = new Date(Date.now() - tage * 864e5).toISOString();

  const { data: leads } = await db.from('leads')
    .select('id, name, email, status, value_est, termin, ts, angebot_nr, angebot_am')
    .eq('tenant_id', user.tenant_id).gte('ts', seit).order('ts', { ascending: false }).limit(500);

  const alle = leads || [];
  const offen = alle.filter((l) => !['gebucht', 'verloren'].includes(l.status || 'neu'));

  const stufen = ['neu', 'angerufen', 'angebot', 'gebucht', 'verloren'].map((s) => {
    const g = alle.filter((l) => (l.status || 'neu') === s);
    return {
      status: s, anzahl: g.length,
      summe: g.reduce((a, l) => a + Number(l.value_est || 0), 0),
      chance: CHANCE[s]
    };
  });

  const gewichtet = offen.reduce((a, l) => a + Number(l.value_est || 0) * (CHANCE[l.status || 'neu'] ?? 0.15), 0);
  const gebucht = alle.filter((l) => l.status === 'gebucht');

  // Prognose für den laufenden Monat: schon gebucht + gewichtet offen mit Termin in diesem Monat.
  const jetzt = new Date();
  const monatEnde = new Date(jetzt.getFullYear(), jetzt.getMonth() + 1, 0).toISOString().slice(0, 10);
  const monatStart = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1).toISOString().slice(0, 10);
  const imMonat = (l) => l.termin && l.termin >= monatStart && l.termin <= monatEnde;
  const prognose =
    gebucht.filter(imMonat).reduce((a, l) => a + Number(l.value_est || 0), 0) +
    offen.filter(imMonat).reduce((a, l) => a + Number(l.value_est || 0) * (CHANCE[l.status || 'neu'] ?? 0.15), 0);

  // Was liegen bleibt: offene Anfragen ohne Bewegung seit 7 Tagen, teuerste zuerst.
  const grenze = Date.now() - 7 * 864e5;
  const liegen = offen
    .filter((l) => Date.parse(l.ts) < grenze)
    .sort((a, b) => Number(b.value_est || 0) - Number(a.value_est || 0))
    .slice(0, 8)
    .map((l) => ({
      id: l.id, name: l.name, email: l.email, status: l.status || 'neu',
      wert: Number(l.value_est || 0), termin: l.termin,
      tage: Math.floor((Date.now() - Date.parse(l.ts)) / 864e5)
    }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true, rolle, tage,
    offen_anzahl: offen.length,
    offen_summe: offen.reduce((a, l) => a + Number(l.value_est || 0), 0),
    gewichtet: Math.round(gewichtet),
    prognose: Math.round(prognose),
    gebucht_summe: gebucht.reduce((a, l) => a + Number(l.value_est || 0), 0),
    quote: alle.length ? Math.round(gebucht.length / alle.length * 100) : 0,
    stufen, liegen
  });
}
