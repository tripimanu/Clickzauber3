// POST /api/checkout  — { token, cycle, zg?, plan?, einrichtung? }  → Stripe-Checkout-Session.
// Der Preis kommt aus der Branche des Formulars (lib/_plans.js). einrichtung = 129 € einmalig dazu.
// Zahlungsarten kommen aus dem Stripe-Konto; Stripe blendet alles aus, was keine
// wiederkehrende Zahlung kann (Klarna z. B.) — sonst bricht die Zahlung erst am Ende ab.
// Erzeugt bei Bedarf einen Stripe-Kunden. Kartendaten liegen nie bei uns (PCI-konform).
import { cors, body, userByToken, db } from './_lib.js';
import { PLANS, STUFEN, EINRICHTUNG_EURO, effektiverPreis, istPilot, stufeVon, stufeVomKonto, kostenlos } from './_plans.js';
import Stripe from 'stripe';
import { checkoutRabatt } from './_vertrauen.js';

const SITE = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  const user = await userByToken(p.token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  // Pilotbetrieb: nichts abbuchen, direkt ins Cockpit.
  if (istPilot(user) || kostenlos(user)) return res.status(200).json({ ok: true, pilot: true, url: SITE + '/clickzauber-cockpit-live.html' });
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ ok: false, error: 'Zahlung noch nicht konfiguriert (STRIPE_SECRET_KEY fehlt).' });
  }

  // Preis nach Branche: Das gespeicherte Formular entscheidet. Gibt es noch keins, zählt die
  // Vorlage des Entwurfs (zg), danach die Wahl auf der Seite. Ein alter Tarif ist nie buchbar.
  const cycle = p.cycle === 'yearly' ? 'yearly' : 'monthly';
  const stufe = (await stufeVomKonto(db, user.tenant_id))
    || (p.zg ? stufeVon(p.zg) : null)
    || (STUFEN.includes(p.plan) ? p.plan : 'projekt');
  const plan = PLANS[stufe];
  const einrichtung = !!p.einrichtung;
  // Ausgehandelter Preis schlägt Listenpreis. Wird auf dem Server bestimmt,
  // nie aus dem Browser übernommen — sonst könnte jeder seinen Preis selbst setzen.
  const price = await effektiverPreis(db, user.email, plan.id, cycle);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Kunde wiederverwenden oder anlegen
  let customer = user.stripe_customer;
  if (!customer) {
    const c = await stripe.customers.create({
      email: user.email,
      name: [user.vorname, user.nachname].filter(Boolean).join(' ') || undefined,
      // Ohne Land rät Stripe anhand der IP und stellt im Bezahlfenster ein fremdes Land ein.
      address: { country: 'DE' },
      metadata: { user_id: user.id, firma: user.firma || '' }
    });
    customer = c.id;
    await db.from('users').update({ stripe_customer: customer }).eq('id', user.id);
  }

  // Bestandskunden ohne Land nachtragen — sonst bleibt das falsche Land stehen.
  try {
    const vorhanden = await stripe.customers.retrieve(customer);
    if (!vorhanden.deleted && !(vorhanden.address && vorhanden.address.country)) {
      await stripe.customers.update(customer, { address: { country: 'DE' } });
    }
  } catch (e) { /* nicht kritisch — Zahlung läuft auch ohne */ }

  // Testphase: nur beim allerersten Abo. Länge über TESTTAGE in Vercel, 0 schaltet sie ab.
  const testtage = Math.max(0, parseInt(process.env.TESTTAGE || '14', 10) || 0);
  const erstesAbo = !user.stripe_sub && !user.plan;
  const subData = { metadata: { user_id: user.id, plan: plan.id, cycle, sonderpreis: price.sonder ? String(price.euro) : '', einrichtung: einrichtung ? '1' : '' } };
  // Erstkunden mit „kostenlos bis …“: abgebucht wird erst nach dem letzten
  // kostenlosen Tag. Eine Testphase kommt nicht zusätzlich obendrauf (AGB § 1b Abs. 4).
  // Stripe verlangt dafür mindestens zwei Tage Abstand — sonst gilt: ab sofort.
  const gratisEnde = user.kostenlos_bis ? Date.parse(String(user.kostenlos_bis).slice(0, 10) + 'T22:00:00Z') : 0;
  if (gratisEnde > Date.now() + 2 * 864e5) subData.trial_end = Math.floor(gratisEnde / 1000);
  else if (testtage > 0 && erstesAbo && !user.kostenlos_bis) subData.trial_period_days = testtage;

  const vtCoupon = await checkoutRabatt(stripe, user.tenant_id);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    // Rechnungsanschrift holt Stripe. Vorher stand sie zweimal im Weg: einmal in
    // unserem Formular, einmal im Bezahlfenster. Stripe braucht sie ohnehin (und
    // prüft sie gegen die Karte), also fragen wir sie nicht mehr selbst ab — der
    // Webhook schreibt sie danach ins Konto zurück.
    billing_address_collection: 'required',
    customer_update: { address: 'auto', name: 'auto' },
    // Bezahlseite in der Cockpit-Sprache. Albanisch bietet Stripe nicht an — dann Deutsch.
    locale: ['en', 'fr', 'it', 'es', 'tr'].includes(user.sprache) ? user.sprache : 'de',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        recurring: { interval: price.interval },
        unit_amount: price.amount,
        product_data: { name: `clickzauber ${plan.name} (${cycle === 'yearly' ? 'jährlich' : 'monatlich'})` }
      }
    }].concat(einrichtung ? [{
      // Einmalig. Stripe berechnet das sofort, auch wenn das Abo mit einer Testphase beginnt.
      quantity: 1,
      price_data: { currency: 'eur', unit_amount: EINRICHTUNG_EURO * 100, product_data: { name: 'clickzauber Einrichtung (einmalig)' } }
    }] : []),
    allow_promotion_codes: true,
    // Rabatt der Vertrauensstufe (lib/_vertrauen.js). Stripe erlaubt nicht beides: Rabatt oder Gutscheincode.
    ...(vtCoupon ? { discounts: [{ coupon: vtCoupon }], allow_promotion_codes: undefined } : {}),
    subscription_data: subData,
    metadata: { user_id: user.id, plan: plan.id, cycle, sonderpreis: price.sonder ? String(price.euro) : '', einrichtung: einrichtung ? '1' : '' },
    success_url: `${SITE}/clickzauber-anmelden.html?bezahlt=1`,
    cancel_url: `${SITE}/clickzauber-anmelden.html?abbruch=1`
  });

  res.status(200).json({ ok: true, url: session.url, plan: plan.id, einrichtung, testtage: subData.trial_period_days || 0, kostenlos_bis: subData.trial_end ? user.kostenlos_bis : null });
}
