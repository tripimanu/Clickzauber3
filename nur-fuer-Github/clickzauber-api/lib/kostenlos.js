// GET /api/kostenlos?key=…  (Nachtlauf, täglich)
// Erstkunden mit „kostenlos bis …“ und ohne gebuchtes Abo:
//   14 Tage vorher (wie AGB § 1b Abs. 4) → einmal eine Erinnerung mit Link zum Tarif
//   nach dem letzten Tag → Konto auf „inaktiv“, das Widget wird ausgeblendet
// Wer inzwischen ein Abo hat (stripe_sub), wird nicht angefasst.
import { db, cors } from './_lib.js';
import { SITE } from './auth/_pw.js';
import { kostenlosEndetMail } from './auth/_mail.js';

const heute = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const plusTage = (tag, n) => { const d = new Date(tag + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if ((req.query.key || '') !== process.env.CRON_KEY) return res.status(401).json({ error: 'kein Zugriff' });

  const { data, error } = await db.from('users')
    .select('*')
    .not('kostenlos_bis', 'is', null)
    .is('stripe_sub', null)
    .limit(2000);
  if (error) return res.status(500).json({ ok: false, error: 'Ist sql/33 eingespielt?' });

  const t = heute(), inVierzehn = plusTage(t, 14);
  let erinnert = 0, beendet = 0;
  for (const u of data || []) {
    if (u.kostenlos_bis < t) {
      if (u.plan_status === 'aktiv') {
        await db.from('users').update({ plan_status: 'inaktiv', plan: null }).eq('id', u.id);
        await db.from('protokoll').insert({ tenant_id: u.tenant_id || null, was: 'kostenlos_beendet', anzahl: 1, hinweis: u.kostenlos_bis }).then(() => {}, () => {});
        beendet++;
      }
    } else if (u.kostenlos_bis <= inVierzehn && !u.kostenlos_erinnert) {
      try {
        const l = ['sq', 'en', 'fr', 'it', 'es', 'tr'].includes(u.sprache) ? u.sprache : 'de';
        await kostenlosEndetMail(u.email, u.kostenlos_bis, SITE + '/clickzauber-anmelden.html?ziel=plan', l);
        await db.from('users').update({ kostenlos_erinnert: new Date().toISOString() }).eq('id', u.id);
        erinnert++;
      } catch (e) { /* nächste Nacht erneut */ }
    }
  }
  return res.status(200).json({ ok: true, erinnert, beendet });
}
