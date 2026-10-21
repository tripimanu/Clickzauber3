// E-Mail-Adresse bestätigen.
//   POST { t } → JSON { ok, bestaetigt, email, grund }. Seit 04.10.2026 führt der Link in der Mail
//                direkt auf clickzauber-login.html?bestaetigen=…, die Seite schickt den Schlüssel hierher
//                (wie beim Passwort-Link). Vorteil: Link auf clickzauber.de statt vercel.app, und
//                Virenscanner, die Links vorab aufrufen, verbrauchen ihn nicht mehr.
//   GET  ?t=…  → ältere Links: bestätigt und leitet zur Anmeldeseite weiter.
import { db, cors, body } from '../_lib.js';
import { SITE } from './_pw.js';

async function pruefen(t) {
  if (!t) return { bestaetigt: false };
  const { data: rec } = await db.from('email_tokens')
    .select('id, email, zweck, used, expires_at').eq('token', t).maybeSingle();
  if (!rec || rec.zweck !== 'bestaetigen') return { bestaetigt: false };

  const abgelaufen = new Date(rec.expires_at).getTime() < Date.now();
  // Verbraucht, aber die Adresse ist bestätigt: kein Fehler (zweiter Klick, Scanner bei alten Links).
  if (rec.used || abgelaufen) {
    const { data: u } = await db.from('users').select('verified').eq('email', rec.email).maybeSingle();
    if (u && u.verified) return { bestaetigt: true, email: rec.email };
    return { bestaetigt: false, grund: abgelaufen ? 'abgelaufen' : 'verbraucht', email: rec.email };
  }

  await db.from('email_tokens').update({ used: true }).eq('id', rec.id);
  await db.from('users').update({ verified: true }).eq('email', rec.email);
  // Einladungs-Konten (seit 10.10.2026): Häkchen in der Kundenakte, Push und Mail an Manuel.
  try { const { einladungBestaetigt } = await import('../einladung.js'); await einladungBestaetigt(rec.email); } catch (e) { /* darf das Bestätigen nicht aufhalten */ }
  return { bestaetigt: true, email: rec.email };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS' || req.method === 'POST') {
    cors(res, req.headers.origin);
    if (req.method === 'OPTIONS') return res.status(200).end();
    try {
      const r = await pruefen(String(body(req).t || '').trim());
      return res.status(200).json({ ok: true, ...r });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'Bestätigen geht gerade nicht. Bitte in einer Minute noch einmal versuchen.' });
    }
  }

  let r = { bestaetigt: false };
  try { r = await pruefen(String(req.query.t || '')); } catch (e) {}
  const p = { bestaetigt: r.bestaetigt ? '1' : '0' };
  if (r.grund) p.grund = r.grund;
  if (r.email) p.email = r.email;
  res.setHeader('Location', SITE + '/clickzauber-login.html?' + new URLSearchParams(p).toString());
  res.status(302).end();
}
