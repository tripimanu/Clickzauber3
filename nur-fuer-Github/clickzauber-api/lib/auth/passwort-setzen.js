// POST /api/auth/passwort-setzen — { t, passwort } → neues Passwort, direkt angemeldet.
import { db, cors, body } from '../_lib.js';
import { hashPasswort, passwortSchwach, neuerToken, geraetName } from './_pw.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  const t = String(p.t || '');
  const pw = String(p.passwort || '');
  const schwach = passwortSchwach(pw);
  if (schwach) return res.status(400).json({ ok: false, error: schwach });

  const { data: rec } = await db.from('email_tokens')
    .select('id, email, zweck, used, expires_at').eq('token', t).maybeSingle();
  if (!rec || rec.used || rec.zweck !== 'passwort' || new Date(rec.expires_at).getTime() < Date.now()) {
    return res.status(403).json({ ok: false, error: 'Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an.' });
  }
  await db.from('email_tokens').update({ used: true }).eq('id', rec.id);

  const token = neuerToken();
  const { data: user } = await db.from('users')
    .update({ password_hash: hashPasswort(pw), verified: true, token })
    .eq('email', rec.email).select('*').single();
  if (!user) return res.status(500).json({ ok: false, error: 'Konto nicht gefunden.' });

  // Alle alten Sitzungen beenden: wer das Passwort neu setzt, sperrt fremde Geräte aus.
  await db.from('sessions').delete().eq('user_id', user.id);
  await db.from('sessions').insert({ token, user_id: user.id, geraet: geraetName(req.headers['user-agent']) });

  res.status(200).json({
    ok: true, token, email: rec.email,
    vorname: user.vorname || '',
    profileComplete: !!(user.vorname && user.firma),
    plan_status: user.plan_status || 'inaktiv'
  });
}
