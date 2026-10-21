// Nachtaufgabe (api/nacht.js): offene Zahlungen freundlich erinnern und nach 7 Tagen das Widget pausieren.
// Tag 1: erste Erinnerung · Tag 4: zweite Erinnerung mit Frist · Tag 7: Widget aus, Cockpit bleibt.
// Kommt die Zahlung (Stripe: invoice.paid), hebt api/stripe-webhook.js die automatische Sperre sofort auf.
import { db, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';

const SITE = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';
const LINK = SITE + '/clickzauber-cockpit-live.html#settings';
const STUFEN = [
  { ab: 1, betreff: 'Ihre Zahlung für clickzauber hat nicht geklappt', text: (n) => ['Guten Tag' + n + ',', 'die letzte Abbuchung für Ihr clickzauber-Abo ist leider fehlgeschlagen. Das passiert oft, wenn eine Karte abgelaufen ist oder das Konto kurz nicht gedeckt war.', 'Ihr Formular läuft weiter. Bitte prüfen Sie Ihre Zahlungsart im Cockpit unter „Konto & Abo“. Stripe versucht die Abbuchung in den nächsten Tagen automatisch erneut.'] },
  { ab: 4, betreff: 'Erinnerung: Zahlung für clickzauber offen', text: (n) => ['Guten Tag' + n + ',', 'die Zahlung für Ihr clickzauber-Abo ist weiterhin offen.', 'Wenn sie bis in drei Tagen nicht eingeht, pausieren wir Ihr Formular. Ihre Gäste sehen es dann vorübergehend nicht. Cockpit und alle Daten bleiben erhalten, und sobald die Zahlung da ist, ist das Formular sofort wieder online.'] },
  { ab: 7, betreff: 'Ihr clickzauber-Formular ist pausiert', sperren: true, text: (n) => ['Guten Tag' + n + ',', 'weil die Zahlung für Ihr Abo seit einer Woche offen ist, haben wir Ihr Formular pausiert. Ihr Cockpit, Ihre Anfragen und alle Einstellungen sind unverändert da.', 'Sobald Sie die Zahlungsart im Cockpit unter „Konto & Abo“ aktualisiert haben und die Zahlung eingegangen ist, ist das Formular automatisch wieder online.'] }
];

function html(zeilen) {
  return '<div style="font:15px/1.55 system-ui,sans-serif;color:#27241d;max-width:560px">' + zeilen.map((z) => '<p style="margin:0 0 14px">' + z + '</p>').join('')
    + '<p style="margin:22px 0"><a href="' + LINK + '" style="display:inline-block;background:#2f7d59;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:600">Zahlungsart prüfen</a></p>'
    + '<p style="margin:0;color:#7a7263;font-size:13px">Fragen? Antworten Sie einfach auf diese E-Mail.<br>clickzauber · projekt@clickzauber.de</p></div>';
}
async function senden(an, betreff, zeilen) {
  if (!MAIL_KEY || !an) return false;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [an], reply_to: 'projekt@clickzauber.de', subject: betreff, html: html(zeilen) }) }).catch(() => null);
  return !!(r && r.ok);
}

export default async function handler(req, res) {
  const key = (req.query && req.query.key) || '';
  if (!process.env.CRON_KEY && !process.env.CRON_SECRET) return res.status(500).json({ ok: false });
  if (key !== (process.env.CRON_KEY || process.env.CRON_SECRET)) return res.status(401).json({ ok: false });
  const { data: us, error } = await db.from('users').select('id, email, vorname, tenant_id, zahlung_offen_seit, mahnung_stufe, gesperrt_am, komplett_gesperrt, plan_status')
    .not('zahlung_offen_seit', 'is', null).limit(500);
  if (error) return res.status(200).json({ ok: false, error: 'sql/40 fehlt' });
  const erg = { erinnert: 0, gesperrt: 0 };
  for (const u of us || []) {
    if (u.komplett_gesperrt) continue;
    if (u.plan_status === 'aktiv') { await db.from('users').update({ zahlung_offen_seit: null, mahnung_stufe: 0 }).eq('id', u.id); continue; }
    const tage = Math.floor((Date.now() - Date.parse(u.zahlung_offen_seit)) / 864e5);
    const stufe = u.mahnung_stufe || 0;
    const s = STUFEN[stufe];
    if (!s || tage < s.ab) continue;
    const n = u.vorname ? ' ' + u.vorname : '';
    const upd = { mahnung_stufe: stufe + 1 };
    if (s.sperren && !u.gesperrt_am) { upd.gesperrt_am = new Date().toISOString(); upd.gesperrt_grund = 'Zahlung offen (automatisch)'; }
    await db.from('users').update(upd).eq('id', u.id);
    await senden(u.email, s.betreff, s.text(n));
    await db.from('protokoll').insert({ tenant_id: u.tenant_id || null, was: s.sperren ? 'auto_gesperrt' : 'mahnung', wer: 'automatisch', anzahl: 1, hinweis: s.betreff }).then(() => {}, () => {});
    if (s.sperren) {
      erg.gesperrt++;
      await senden(MAIL_TO, 'Automatisch pausiert: ' + u.email, ['Das Formular von ' + u.email + ' wurde pausiert, weil die Zahlung seit ' + tage + ' Tagen offen ist.', 'Die Sperre hebt sich von selbst auf, sobald Stripe die Zahlung meldet. Von Hand: Plattform-Übersicht → Kunden.']);
    } else erg.erinnert++;
  }
  return res.status(200).json({ ok: true, ...erg });
}
