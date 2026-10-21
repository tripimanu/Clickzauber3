// POST /api/stripe-webhook  — Stripe meldet erfolgreiche Zahlung → Abo aktivieren.
import { db, rawBody } from '../lib/_lib.js';
import { pflichtOffen } from '../lib/einstellungen.js';
import Stripe from 'stripe';

// Rohen Body behalten (für die Signaturprüfung).
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const buf = await rawBody(req);
  const sig = req.headers['stripe-signature'];

  // Seit 15.10.2026 nur mit Signatur. Vorher galt ohne STRIPE_WEBHOOK_SECRET jede Nachricht ungeprüft: Jeder hätte
  // „Zahlung erfolgreich“ schicken und ein Abo freischalten können. Stripe wiederholt abgelehnte Meldungen bis zu 3 Tage.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET fehlt in Vercel: Stripe-Meldungen werden abgelehnt.');
    return res.status(503).send('Webhook-Secret fehlt');
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook-Fehler: ${e.message}`);
  }

  // Zahlung ist wieder da: Mahnstand zurücksetzen und eine automatische Sperre aufheben.
  // Eine Sperre, die der Betreiber von Hand gesetzt hat, bleibt bestehen.
  async function zahlungWiederDa(subId) {
    const { data: us } = await db.from('users').select('id, tenant_id, gesperrt_grund, komplett_gesperrt, zahlung_offen_seit').eq('stripe_sub', subId);
    for (const u of us || []) {
      const upd = { zahlung_offen_seit: null, mahnung_stufe: 0 };
      const auto = String(u.gesperrt_grund || '').startsWith('Zahlung offen (automatisch)') && !u.komplett_gesperrt;
      if (auto) { upd.gesperrt_am = null; upd.gesperrt_grund = null; }
      await db.from('users').update(upd).eq('id', u.id);
      if (auto || u.zahlung_offen_seit) await db.from('protokoll').insert({ tenant_id: u.tenant_id || null, was: 'zahlung_wieder_da', anzahl: 1, hinweis: auto ? 'Automatische Sperre aufgehoben' : null }).then(() => {}, () => {});
    }
  }

  async function activate(meta, subId) {
    const uid = meta && meta.user_id;
    if (!uid) return;
    const { data: user } = await db.from('users')
      .update({
        plan: meta.plan || null,
        cycle: meta.cycle || null,
        plan_status: 'aktiv',
        stripe_sub: subId || null
      }).eq('id', uid).select('email, vorname, tenant_id, willkommen_am').single();
    // Gespeicherte Entwürfe gehen mit der Zahlung live, wenn der Betrieb startklar ist (seit 15.10.2026 alle vier Punkte,
    // vorher nur der Datenschutz-Link). Sonst bleibt der Entwurf; im Cockpit führt „Live schalten“ dann zu den offenen Punkten.
    if (user && user.tenant_id) {
      try {
        const offen = await pflichtOffen(user.tenant_id, user);
        if (!offen.length) await db.from('widgets').update({ status: 'live' }).eq('tenant_id', user.tenant_id).eq('status', 'entwurf');
      } catch (x) { /* nicht kritisch */ }
    }
    if (user) await willkommensMail(user, meta.einrichtung === '1');
    if (meta.einrichtung === '1') await einrichtungMelden(uid, user);
  }

  // Einrichtung gebucht (129 € einmalig): ins Protokoll und eine kurze Mail an den Betreiber.
  async function einrichtungMelden(uid, user) {
    const { data: u } = await db.from('users').select('email, firma, vorname, nachname, telefon, tenant_id').eq('id', uid).maybeSingle();
    const wer = u ? (u.firma || [u.vorname, u.nachname].filter(Boolean).join(' ') || u.email) : ((user && user.email) || uid);
    await db.from('protokoll').insert({ tenant_id: (u && u.tenant_id) || null, was: 'einrichtung_gebucht', anzahl: 1, hinweis: wer }).then(() => {}, () => {});
    const an = process.env.NOTIFY_TO || process.env.MAIL_TO;
    if (!an || !process.env.RESEND_API_KEY) return;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'clickzauber <projekt@clickzauber.de>',
          to: an,
          subject: 'Einrichtung gebucht: ' + wer,
          text: ['Einrichtung gebucht (129 € einmalig).', '', 'Betrieb: ' + wer, 'E-Mail: ' + ((u && u.email) || '–'), 'Telefon: ' + ((u && u.telefon) || '–')].join('\n')
        })
      });
    } catch (e) { /* Meldung darf die Freischaltung nie blockieren */ }
  }

  // Nach der ersten Zahlung genau einmal: Zugang, Einbau-Code, drei Wege.
  // Ohne diese Mail sitzt der Kunde nach dem Kauf vor einer leeren Seite.
  async function willkommensMail(user, einrichtung) {
    if (!user.email || user.willkommen_am) return;
    if (!process.env.RESEND_API_KEY) return;

    let slug = null;
    if (user.tenant_id) {
      const { data: w } = await db.from('widgets')
        .select('slug').eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      slug = w && w.slug;
    }

    const app = (process.env.APP_URL || 'https://clickzauber.de').replace(/\/$/, '');
    const api = (process.env.API_URL || 'https://clickzauber-api.vercel.app').replace(/\/$/, '');
    const anrede = user.vorname ? `Hallo ${user.vorname},` : 'Hallo,';
    const snippet = slug ? `<script src="${api}/w.js" data-cz="${slug}" async><\/script>` : null;
    const seite = slug ? `${api}/share.html?w=${slug}` : null;

    const zeilen = [
      anrede, '',
      'Ihr clickzauber-Zugang ist freigeschaltet. Sie melden sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.', '',
      `Cockpit öffnen: ${app}/clickzauber-anmelden.html`, ''
    ];
    if (snippet) zeilen.push('So kommt das Formular auf Ihre Website. Eine Zeile, einmal einfügen:', '', snippet, '',
      `Anleitung für WordPress, Wix, Jimdo und andere: ${app}/einbauen.html`, '');
    if (seite) zeilen.push('Sie wollen an Ihrer Website nichts ändern? Dann nutzen Sie diese fertige Seite und verlinken sie einfach — mit einem Knopf, in Ihrem Instagram-Profil oder per QR-Code:', '', seite, '');
    if (einrichtung) zeilen.push('Sie haben die Einrichtung dazugebucht. Ich richte Ihr Formular für Sie ein und melde mich dafür bei Ihnen.', '');
    else zeilen.push('Wenn Sie möchten, baue ich es in einem kurzen Termin gemeinsam mit Ihnen ein. Antworten Sie einfach auf diese E-Mail.', '');
    zeilen.push(
      'Viele Grüße', 'clickzauber');

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'clickzauber <projekt@clickzauber.de>',
          to: user.email,
          bcc: process.env.NOTIFY_TO || undefined,
          subject: 'Ihr clickzauber-Zugang ist da',
          text: zeilen.join('\n')
        })
      });
      await db.from('users').update({ willkommen_am: new Date().toISOString() }).eq('email', user.email);
    } catch (e) { /* Mail darf die Freischaltung nie blockieren */ }
  }

  // Rechnungsanschrift aus dem Bezahlfenster ins Konto zurückschreiben. Seit
  // Stripe sie erhebt, fragt unser Formular sie nicht mehr ab — ohne diesen
  // Schritt stünde im Cockpit keine Adresse.
  async function adresseUebernehmen(s) {
    const uid = s.metadata && s.metadata.user_id;
    const d = s.customer_details;
    if (!uid || !d) return;
    const a = d.address || {};
    const patch = {};
    const strasse = [a.line1, a.line2].filter(Boolean).join(', ');
    const ort = [a.postal_code, a.city].filter(Boolean).join(' ');
    if (strasse) patch.strasse = strasse;
    if (ort) patch.plz_ort = ort;
    if (d.phone) patch.telefon = d.phone;
    if (!Object.keys(patch).length) return;
    // Nur füllen, was leer ist — eine im Cockpit gepflegte Adresse bleibt stehen.
    const { data: u } = await db.from('users').select('strasse, plz_ort, telefon').eq('id', uid).single();
    if (u) Object.keys(patch).forEach((k) => { if (u[k]) delete patch[k]; });
    if (Object.keys(patch).length) await db.from('users').update(patch).eq('id', uid);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      await adresseUebernehmen(s);
      await activate(s.metadata, s.subscription);
    } else if (event.type === 'customer.subscription.updated') {
      // Tarifwechsel, Pause oder Zahlungsverzug — Stand übernehmen.
      const sub = event.data.object;
      const aktiv = ['active', 'trialing'].includes(sub.status);
      await db.from('users').update({
        plan: (sub.metadata && sub.metadata.plan) || undefined,
        cycle: (sub.metadata && sub.metadata.cycle) || undefined,
        plan_status: aktiv ? 'aktiv' : (sub.status === 'past_due' ? 'zahlung offen' : 'inaktiv')
      }).eq('stripe_sub', sub.id);
      if (aktiv) await zahlungWiederDa(sub.id);
    } else if (event.type === 'invoice.payment_failed') {
      // Zahlung geplatzt — Widget bleibt live, aber im Cockpit sichtbar.
      const inv = event.data.object;
      if (inv.subscription) {
        await db.from('users').update({ plan_status: 'zahlung offen' }).eq('stripe_sub', inv.subscription);
        // Beginn der offenen Zahlung nur beim ersten Fehlschlag setzen. Ab hier zählt lib/mahnung.js die Tage.
        await db.from('users').update({ zahlung_offen_seit: new Date().toISOString(), mahnung_stufe: 0 }).eq('stripe_sub', inv.subscription).is('zahlung_offen_seit', null);
      }
    } else if (event.type === 'invoice.paid') {
      const inv = event.data.object;
      if (inv.subscription) {
        await db.from('users').update({ plan_status: 'aktiv' }).eq('stripe_sub', inv.subscription);
        await zahlungWiederDa(inv.subscription);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await db.from('users').update({ plan_status: 'inaktiv' }).eq('stripe_sub', sub.id);
    }
  } catch (e) { /* Fehler nicht an Stripe zurückwerfen, sonst Retry-Sturm */ }

  res.status(200).json({ received: true });
}
