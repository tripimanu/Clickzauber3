// POST /api/abo { token, was }
//   was='portal'    → Stripe-Kundenportal öffnen (Tarif ändern, Zahlungsmittel, Rechnungen)
//   was='kuendigen' → Abo zum Ende der Laufzeit beenden (§ 312k BGB: ohne Umwege möglich)
//   was='weiter'    → Kündigung zurücknehmen
import { db, cors, body, userByToken } from './_lib.js';
import Stripe from 'stripe';
import { kontoUebergeben } from './konto-admin.js';

const SITE = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { token, was, neu, sprache } = body(req);
  const user = await userByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  // Konto an den Kunden übergeben (für vorgebaute Formulare). Nur der Inhaber, nicht Team-Mitglieder.
  if (was === 'uebergeben') {
    if (user.rolle && user.rolle !== 'inhaber') return res.status(403).json({ ok: false, error: 'Nur der Inhaber kann das Konto übergeben.' });
    const log = (w, hinweis) => db.from('protokoll').insert({ tenant_id: user.tenant_id || null, was: w, anzahl: 1, hinweis }).then(() => {}, () => {});
    const r = await kontoUebergeben(user, String(user.email || '').toLowerCase(), neu, sprache, log);
    return res.status(r.status).json(r.json);
  }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ ok: false, error: 'Abrechnung nicht eingerichtet' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (was === 'portal') {
    if (!user.stripe_customer) return res.status(400).json({ ok: false, error: 'Noch kein Abo vorhanden.' });
    const s = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer,
      locale: ['en', 'fr', 'it', 'es', 'tr'].includes(user.sprache) ? user.sprache : 'de',
      return_url: `${SITE}/clickzauber-cockpit-live.html`
    });
    return res.status(200).json({ ok: true, url: s.url });
  }

  if (was === 'kuendigen' || was === 'weiter') {
    if (!user.stripe_sub) return res.status(400).json({ ok: false, error: 'Kein laufendes Abo.' });
    const sub = await stripe.subscriptions.update(user.stripe_sub, {
      cancel_at_period_end: was === 'kuendigen'
    });
    await db.from('users').update({
      plan_status: was === 'kuendigen' ? 'gekündigt' : 'aktiv'
    }).eq('id', user.id);
    return res.status(200).json({
      ok: true,
      gekuendigt: was === 'kuendigen',
      laeuft_bis: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
    });
  }

  return res.status(400).json({ ok: false, error: 'unbekannte Aktion' });
}
