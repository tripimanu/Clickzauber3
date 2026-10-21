// POST /api/konto-loeschen { token, bestaetigung } → Konto und alle Daten löschen (Art. 17 DSGVO)
// Zwei Schritte: erst Übersicht anfordern, dann mit der genauen Bestätigung löschen.
import { db, cors, body, userByToken, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';
import { beratungsFotosWeg } from './_fotos.js';

const WORT = 'LÖSCHEN';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { token, bestaetigung } = body(req);
  const user = await userByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  const tenant = user.tenant_id;

  const slugs = await slugsVon(db, tenant);

  // Schritt 1: nur zeigen, was verschwindet.
  if (!bestaetigung) {
    const [{ count: eigen }, alt, { count: widgets }] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant),
      slugs.length
        ? db.from('leads').select('id', { count: 'exact', head: true }).is('tenant_id', null).in('widget_id', slugs)
        : Promise.resolve({ count: 0 }),
      db.from('widgets').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant)
    ]);
    const anfragen = (eigen || 0) + (alt.count || 0);
    return res.status(200).json({
      ok: true, vorschau: true,
      anfragen: anfragen || 0,
      widgets: widgets || 0,
      abo_aktiv: user.plan_status === 'aktiv',
      wort: WORT
    });
  }

  if (String(bestaetigung).trim().toUpperCase() !== WORT) {
    return res.status(400).json({ ok: false, error: 'Bitte ' + WORT + ' eingeben, um zu bestätigen.' });
  }

  // Laufendes Abo zuerst beenden — sonst wird weiter abgebucht.
  let aboHinweis = null;
  if (user.stripe_sub && process.env.STRIPE_SECRET_KEY) {
    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.cancel(user.stripe_sub);
    } catch (e) {
      aboHinweis = 'Das Abo konnte nicht automatisch beendet werden — wir kümmern uns von Hand darum.';
    }
  }

  // Reihenfolge: erst die abhängigen Daten, dann Konto und Betrieb.
  await beratungsFotosWeg((q) => q.eq('tenant_id', tenant));
  if (slugs.length) await beratungsFotosWeg((q) => q.in('widget_id', slugs));
  if (slugs.length) {
    await db.from('widget_versions').delete().in('widget_id', slugs);
    // Anfragen und Ereignisse aus der Zeit vor dem tenant_id-Feld mit entfernen.
    await db.from('leads').delete().in('widget_id', slugs);
    await db.from('events').delete().in('widget_id', slugs);
  }
  await db.from('leads').delete().eq('tenant_id', tenant);
  await db.from('events').delete().eq('tenant_id', tenant);
  await db.from('widgets').delete().eq('tenant_id', tenant);
  await db.from('interesse').delete().eq('email', user.email);
  await db.from('einstellungen').delete().eq('tenant_id', tenant);

  // Protokoll ohne Mandantenbezug behalten: Nachweis, dass gelöscht wurde,
  // ohne personenbezogene Daten aufzubewahren.
  await db.from('protokoll').insert({
    tenant_id: null, was: 'konto_geloescht', anzahl: slugs.length,
    hinweis: 'Konto auf eigenen Wunsch gelöscht' + (aboHinweis ? ' · ' + aboHinweis : '')
  });

  const email = user.email;
  await db.from('users').delete().eq('id', user.id);
  if (tenant) await db.from('tenants').delete().eq('id', tenant);

  // Bestätigung an den Nutzer und Hinweis an den Betreiber.
  if (MAIL_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(MAIL_KEY);
      await resend.emails.send({
        from: MAIL_FROM, to: [email],
        subject: 'Ihr clickzauber-Konto ist gelöscht',
        html: `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e6ddca;border-radius:16px">
<tr><td style="padding:24px 26px">
<div style="font-size:19px;font-weight:600;color:#211d16">Ihr Konto ist gelöscht</div>
<p style="color:#5f584a;font-size:14.5px;line-height:1.65;margin:14px 0 0">
Alle Anfragen, Formulare und Einstellungen wurden entfernt. Ihr Formular ist auf Ihrer Website nicht mehr aktiv —
bitte entfernen Sie noch die Code-Zeile, damit dort keine leere Stelle bleibt.
</p>
${aboHinweis ? `<p style="color:#a8442f;font-size:14px;line-height:1.6;margin:14px 0 0">${aboHinweis}</p>` : '<p style="color:#5f584a;font-size:14px;line-height:1.6;margin:14px 0 0">Ein laufendes Abo wurde beendet. Es wird nichts mehr abgebucht.</p>'}
<p style="color:#8a8270;font-size:12.5px;line-height:1.55;margin:20px 0 0">
Rechnungen bewahren wir gesetzlich vorgeschrieben zehn Jahre auf (§ 147 AO). Darin stehen nur Rechnungsdaten, keine Anfragen Ihrer Gäste.
</p>
</td></tr></table></td></tr></table></body></html>`
      });
      if (MAIL_TO) {
        await resend.emails.send({
          from: MAIL_FROM, to: [MAIL_TO],
          subject: 'Konto gelöscht: ' + email,
          html: `<p>${email} hat das Konto gelöscht. ${slugs.length} Formular(e) entfernt.${aboHinweis ? ' <b>' + aboHinweis + '</b>' : ''}</p>`
        });
      }
    } catch (e) { /* Mail-Fehler darf die Löschung nicht rückgängig machen */ }
  }

  return res.status(200).json({ ok: true, geloescht: true, hinweis: aboHinweis });
}

/* Anfragen können älter sein als das tenant_id-Feld. Deshalb beide Wege:
   über den Betrieb UND über dessen Formular-Kennungen. */
async function slugsVon(db, tenantId) {
  const { data } = await db.from('widgets').select('slug').eq('tenant_id', tenantId);
  return (data || []).map((w) => w.slug);
}
