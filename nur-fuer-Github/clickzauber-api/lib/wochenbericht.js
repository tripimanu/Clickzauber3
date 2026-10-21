// Nachtaufgabe (api/nacht.js), montags: Wochenbericht an den Betreiber (NOTIFY_TO).
import { db, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';
import { PLANS } from './_plans.js';

const PREIS = Object.fromEntries(Object.values(PLANS).map((x) => [x.id, x.monthly]));
const vor = (t) => new Date(Date.now() - t * 864e5).toISOString();
const SITE = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';

export default async function handler(req, res) {
  const key = (req.query && req.query.key) || '';
  if (key !== (process.env.CRON_KEY || process.env.CRON_SECRET)) return res.status(401).json({ ok: false });
  const c = (q) => q.then((r) => r.count || 0, () => 0);
  const [neu, neuVor, konten, wLive, anfr, meld, block, dringend] = await Promise.all([
    c(db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', vor(7))),
    c(db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', vor(14)).lt('created_at', vor(7))),
    c(db.from('users').select('id', { count: 'exact', head: true })),
    c(db.from('widgets').select('slug', { count: 'exact', head: true }).eq('status', 'live')),
    c(db.from('leads').select('id', { count: 'exact', head: true }).gte('ts', vor(7))),
    c(db.from('netz_meldung').select('id', { count: 'exact', head: true }).eq('status', 'offen')),
    c(db.from('netz_moderation').select('id', { count: 'exact', head: true }).gte('created_at', vor(7))),
    c(db.from('netz_moderation').select('id', { count: 'exact', head: true }).eq('status', 'dringend'))
  ]);
  const { data: zahlend } = await db.from('users').select('plan, cycle, kostenlos_bis, stripe_sub').eq('plan_status', 'aktiv').limit(5000);
  const heute = new Date().toISOString().slice(0, 10);
  const mrr = (zahlend || []).filter((u) => !(u.kostenlos_bis && u.kostenlos_bis >= heute && !u.stripe_sub))
    .reduce((s, u) => s + (u.cycle === 'yearly' ? (PREIS[u.plan] || 0) * 10 / 12 : (PREIS[u.plan] || 0)), 0);
  const { data: offen } = await db.from('users').select('email, firma, zahlung_offen_seit, gesperrt_am').eq('plan_status', 'zahlung offen').limit(50);
  const { data: neuListe } = await db.from('users').select('email, firma, vorname, nachname, created_at').gte('created_at', vor(7)).order('created_at', { ascending: false }).limit(20);

  const eur = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const zeile = (l, v, h) => '<tr><td style="padding:8px 0;border-top:1px solid #ece7dc;color:#5c5648">' + l + '</td><td style="padding:8px 0;border-top:1px solid #ece7dc;text-align:right;font-weight:600">' + v + (h ? ' <span style="color:#7a7263;font-weight:400">' + h + '</span>' : '') + '</td></tr>';
  const esc = (s) => String(s || '').replace(/</g, '&lt;');
  let h = '<div style="font:15px/1.5 system-ui,sans-serif;color:#27241d;max-width:560px"><h2 style="margin:0 0 4px;font-size:20px">Ihre Woche bei clickzauber</h2><p style="margin:0 0 16px;color:#7a7263">Letzte 7 Tage</p>'
    + (dringend ? '<p style="background:#fbe6e1;border-radius:10px;padding:12px 14px;color:#8a2e1c;margin:0 0 16px"><b>' + dringend + ' dringender Fall</b> in der Moderation. Bitte sofort ansehen.</p>' : '')
    + '<table style="width:100%;border-collapse:collapse">'
    + zeile('Neue Anmeldungen', neu, neuVor !== neu ? '(Vorwoche ' + neuVor + ')' : '')
    + zeile('Konten gesamt', konten) + zeile('Zahlende Kunden', (zahlend || []).length) + zeile('Monatsumsatz (MRR)', eur(mrr))
    + zeile('Formulare live', wLive) + zeile('Anfragen über alle Formulare', anfr)
    + zeile('Zahlung offen', (offen || []).length) + zeile('Offene Meldungen', meld) + zeile('Automatisch blockiert', block) + '</table>';
  if ((neuListe || []).length) h += '<h3 style="font-size:15px;margin:22px 0 6px">Neu angemeldet</h3>' + neuListe.map((u) => '<div style="padding:4px 0">' + esc(u.firma || [u.vorname, u.nachname].filter(Boolean).join(' ') || '') + ' <span style="color:#7a7263">' + esc(u.email) + '</span></div>').join('');
  if ((offen || []).length) h += '<h3 style="font-size:15px;margin:22px 0 6px">Zahlung offen</h3>' + offen.map((u) => '<div style="padding:4px 0">' + esc(u.firma || u.email) + ' <span style="color:#7a7263">' + (u.zahlung_offen_seit ? 'seit ' + new Date(u.zahlung_offen_seit).toLocaleDateString('de-DE') : '') + (u.gesperrt_am ? ' · Formular pausiert' : '') + '</span></div>').join('');
  h += '<p style="margin:24px 0 0"><a href="' + SITE + '/clickzauber-plattform.html" style="color:#2f7d59;font-weight:600">Plattform-Übersicht öffnen</a> · <a href="' + SITE + '/clickzauber-vertrieb.html" style="color:#2f7d59;font-weight:600">Vertrieb öffnen</a></p></div>';
  if (!MAIL_KEY) return res.status(200).json({ ok: false, error: 'kein Mail-Schlüssel' });
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_TO], subject: 'Wochenbericht: ' + neu + ' neu, ' + eur(mrr) + ' MRR' + (dringend ? ' · DRINGEND' : ''), html: h }) }).catch(() => null);
  return res.status(200).json({ ok: !!(r && r.ok) });
}
