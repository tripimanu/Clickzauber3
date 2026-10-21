// POST /api/auth/anmelden — { email, passwort } → Sitzung.
// Sitzungen laufen nicht ab; sie enden beim Abmelden.
import { db, cors, body } from '../_lib.js';
import { passwortStimmt, neuerToken, geraetName } from './_pw.js';

/* Bremse gegen Passwort-Raten (seit 15.10.2026, sql/70). Gezählt wird in der Datenbank, nicht im Speicher:
   Vercel startet viele Instanzen nebeneinander, eine Zählung im Speicher sähe nur einen Teil der Versuche.
   Je Adresse 8 Fehlversuche in 15 Minuten, je IP-Adresse 30 (auch über verschiedene Adressen hinweg).
   Danach ist auch das richtige Passwort 15 Minuten lang gesperrt, sonst könnte man weiterraten.
   Der echte Inhaber kommt über „Passwort vergessen“ trotzdem sofort hinein (lib/auth/passwort-setzen.js).
   Fehlt die Tabelle (sql/70 nicht eingespielt), bremst nichts, die Anmeldung geht aber weiter. */
const FENSTER_MIN = 15, MAX_ADRESSE = 8, MAX_IP = 30;
const ipVon = (req) => String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim().slice(0, 64) || 'ohne';

async function zuVieleVersuche(email, ip) {
  const seit = new Date(Date.now() - FENSTER_MIN * 60e3).toISOString();
  const [a, i] = await Promise.all([
    db.from('anmelde_versuche').select('id', { count: 'exact', head: true }).eq('email', email).gte('am', seit),
    db.from('anmelde_versuche').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('am', seit)
  ]);
  if (a.error || i.error) { console.error('anmelde_versuche', (a.error || i.error).message); return false; }
  return (a.count || 0) >= MAX_ADRESSE || (i.count || 0) >= MAX_IP;
}
const fehlversuch = (email, ip) => db.from('anmelde_versuche').insert({ email, ip }).then(() => {}, () => {});

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  const email = String(p.email || '').trim().toLowerCase();
  const pw = String(p.passwort || '');
  if (!email || !pw) return res.status(400).json({ ok: false, error: 'E-Mail und Passwort nötig.' });

  const ip = ipVon(req);
  if (await zuVieleVersuche(email, ip)) {
    return res.status(429).json({ ok: false, zu_viele: true,
      error: 'Zu viele Versuche. Bitte warten Sie ' + FENSTER_MIN + ' Minuten oder setzen Sie Ihr Passwort über „Passwort vergessen“ neu.' });
  }

  const { data: user } = await db.from('users').select('*').eq('email', email).maybeSingle();
  if (!user) {
    await fehlversuch(email, ip);
    return res.status(404).json({ ok: false, kein_konto: true, error: 'Zu dieser Adresse gibt es noch kein Konto.' });
  }
  if (!user.password_hash) {
    return res.status(409).json({
      ok: false, kein_passwort: true,
      error: 'Für dieses Konto ist noch kein Passwort vergeben. Legen Sie jetzt eines fest.'
    });
  }
  if (!passwortStimmt(pw, user.password_hash)) {
    await fehlversuch(email, ip);
    return res.status(403).json({ ok: false, falsch: true, error: 'E-Mail oder Passwort stimmt nicht.' });
  }
  if (user.komplett_gesperrt) {
    return res.status(403).json({ ok: false, gesperrt: true, error: 'Dieses Konto ist gesperrt. Bitte wenden Sie sich an projekt@clickzauber.de.' });
  }
  // Eine noch nicht bestätigte Adresse hält hier niemanden mehr auf. Die
  // Bestätigung wird erst verlangt, wenn ein Formular live gehen soll (save.js).
  // Sonst stünde sie mitten im Kauf und der Weg bricht dort ab.

  // Geschafft: eigene Fehlversuche vergessen, damit ein Vertipper von vorhin nicht weiterzählt.
  db.from('anmelde_versuche').delete().eq('email', email).then(() => {}, () => {});

  const token = neuerToken();
  await db.from('users').update({ token }).eq('id', user.id);
  await db.from('sessions').insert({ token, user_id: user.id, geraet: geraetName(req.headers['user-agent']) });

  res.status(200).json({
    ok: true, token, email,
    bestaetigt: !!user.verified,
    vorname: user.vorname || '',
    profileComplete: !!(user.vorname && user.firma),
    plan_status: user.plan_status || 'inaktiv',
    plan: user.plan || null
  });
}
