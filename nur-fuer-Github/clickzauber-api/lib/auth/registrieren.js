// POST /api/auth/registrieren — { email, passwort }
//
// Legt das Konto an, meldet sofort an und schickt den Bestätigungslink hinterher.
//
// Früher war es umgekehrt: erst bestätigen, dann anmelden. Das stellte mitten in
// den Kauf eine Wand — der Kunde musste die Seite verlassen, ins Postfach, zurück.
// Genau dort brach der Weg ab. Jetzt läuft der Kauf durch; die Bestätigung wird
// erst verlangt, wenn das Formular live gehen soll (siehe save.js). Rechtlich
// verlangt der Vertragsschluss keine bestätigte Adresse — das Doppel-Opt-In gilt
// für Werbe-Mails. Gebraucht wird die Adresse für Rechnung und Anfragen, und dass
// sie stimmt, prüft bis dahin auch Stripe beim Bezahlen.
import { db, cors, body, gebremst, ipVon } from '../_lib.js';
import { hashPasswort, passwortSchwach, neuerToken, geraetName, SITE } from './_pw.js';
import { bestaetigungsMail } from './_mail.js';
import { pilotPlatzNehmen, istPilot, kostenlos } from '../_plans.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  const email = String(p.email || '').trim().toLowerCase();
  const pw = String(p.passwort || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
  }
  const schwach = passwortSchwach(pw);
  if (schwach) return res.status(400).json({ ok: false, error: schwach });
  // Bremse (seit 15.10.2026, sql/71): Jedes neue Konto bekommt eine Mail und, solange frei, einen Pilotplatz.
  // Ohne Grenze ließen sich mit Massen-Anmeldungen alle Pilotplätze belegen.
  if (await gebremst('reg:' + ipVon(req), 10, 60)) return res.status(429).json({ ok: false, error: 'Zu viele neue Konten von diesem Anschluss. Bitte versuchen Sie es in einer Stunde noch einmal.' });

  const { data: da } = await db.from('users').select('id, password_hash, verified').eq('email', email).maybeSingle();

  if (da && da.password_hash) {
    return res.status(409).json({
      ok: false, konto_da: true,
      error: 'Zu dieser Adresse gibt es schon ein Konto. Melden Sie sich mit Ihrem Passwort an.'
    });
  }

  const hash = hashPasswort(pw);
  const token = neuerToken();
  let user = da;
  if (da) {
    const { data } = await db.from('users').update({ password_hash: hash, token })
      .eq('id', da.id).select('*').single();
    user = data || da;
  } else {
    const { data, error } = await db.from('users')
      .insert({ email, password_hash: hash, verified: false, token })
      .select('*').single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    user = data;
    // Neue E-Mail-Adresse: einer der Pilotplätze, solange noch einer frei ist.
    try { await pilotPlatzNehmen(db, user); } catch (e) { /* ohne sql/43 kein Pilotplatz */ }
    // Freunde werben (sql/45): Code aus dem Link merken. Gutgeschrieben wird nach 30 Tagen mit Formular (lib/_vertrauen.js).
    try {
      const wc = String(p.werber || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (wc) { const { data: wt } = await db.from('tenants').select('id').eq('werbe_code', wc).maybeSingle(); if (wt) await db.from('users').update({ geworben_von: wt.id }).eq('id', user.id); }
    } catch (e) { /* ohne sql/45 kein Werben */ }
  }

  await db.from('sessions').insert({ token, user_id: user.id, geraet: geraetName(req.headers['user-agent']) });

  // Bestätigungslink hinterherschicken. Schlägt der Versand fehl, ist das kein
  // Grund, die Anmeldung platzen zu lassen — die Mail lässt sich erneut anfordern.
  let mailRaus = true;
  if (!user.verified) {
    const t = neuerToken();
    await db.from('email_tokens').insert({
      email, token: t, zweck: 'bestaetigen',
      expires_at: new Date(Date.now() + 48 * 3600e3).toISOString()
    });
    try {
      await bestaetigungsMail(email, SITE + '/clickzauber-login.html?bestaetigen=' + t);
    } catch { mailRaus = false; }
  }

  res.status(200).json({
    ok: true, token, email,
    bestaetigt: !!user.verified,
    mail_raus: mailRaus,
    vorname: user.vorname || '',
    profileComplete: !!(user.vorname && user.firma),
    plan_status: user.plan_status || 'inaktiv',
    plan: user.plan || null,
    pilot: istPilot(user) || kostenlos(user)
  });
}
