// Konten aus der App ohne Tarif (seit 06.10.2026).
// In der App wird nicht bezahlt und nicht aufs Bezahlen verwiesen (Apple-Regel 3.1.3(f), Google ebenso).
// Will jemand dort live schalten und hat noch keinen Tarif, schickt der Server eine E-Mail mit dem Weg zum Tarif
// auf clickzauber.de und meldet das Konto dem Betreiber (Push und Mail), damit er anruft.
// Höchstens einmal in 20 Stunden je Konto (users.app_hinweis_am, sql/63). Fehlt sql/63, wird nichts verschickt.
// Aufruf: lib/save.js (aktion 'live' mit app:true, aktion 'app_freischalten'). In der App: js/cz-live.js, js/cz-native.js.
import { db, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';
import { pushSenden } from './_push.js';

const SEITE = (process.env.SITE_URL || 'https://clickzauber.de').replace(/\/+$/, '');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function senden(an, betreff, html, antwort) {
  if (!MAIL_KEY || !an) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [an], reply_to: antwort || undefined, subject: betreff, html }) });
    return r.ok;
  } catch (e) { return false; }
}
function rahmen(inhalt) {
  return '<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">'
    + '<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:26px 28px">' + inhalt + '</td></tr></table></td></tr></table></body></html>';
}
const P = 'color:#5f584a;font-size:15px;line-height:1.65;margin:12px 0 0';

/* Push an den Betreiber: an alle Geräte der Konten aus ADMIN_EMAILS (wie in lib/demo-zugang.js) */
async function betreiberPush(titel, text) {
  try {
    const mails = (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const { data } = await db.from('users').select('tenant_id').in('email', mails);
    const t = [...new Set((data || []).map((u) => u.tenant_id).filter(Boolean))];
    await Promise.all(t.map((id) => pushSenden(id, { titel, text, url: 'clickzauber-vertrieb.html' })));
  } catch (e) { /* Push darf nichts aufhalten */ }
}

export async function appFreischalten(user, stufe) {
  if (!user || !user.id || !user.email) return { gesendet: false };
  const { data: u, error } = await db.from('users').select('app_hinweis_am').eq('id', user.id).maybeSingle();
  if (error) return { gesendet: false, fehlt: 'sql/63' };
  if (u && u.app_hinweis_am && Date.now() - Date.parse(u.app_hinweis_am) < 20 * 3600e3) return { gesendet: false, schon: true };
  await db.from('users').update({ app_hinweis_am: new Date().toISOString() }).eq('id', user.id);

  const preis = stufe === 'service' ? '79 €' : stufe === 'projekt' ? '199 €' : '';
  const link = SEITE + '/clickzauber-anmelden.html?ziel=plan';
  const gesendet = await senden(user.email, 'Ihr Formular ist fertig: so schalten Sie es live', rahmen(
    '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">Fast geschafft</div>'
    + '<div style="font-size:21px;font-weight:600;color:#211d16;margin-top:7px">Ihr Formular ist fertig</div>'
    + '<p style="' + P + '">Hallo' + (user.vorname ? ' ' + esc(user.vorname) : '') + ', Ihr Formular ist gespeichert. Damit Ihre Kunden anfragen können, fehlt nur noch Ihr Tarif.</p>'
    + (preis ? '<p style="' + P + '">Ihr Tarif: <b style="color:#211d16">' + preis + ' im Monat</b>, monatlich kündbar.</p>' : '')
    + '<a href="' + esc(link) + '" style="display:inline-block;margin-top:18px;background:#1d7f54;color:#fff;text-decoration:none;border-radius:12px;padding:13px 20px;font-weight:700;font-size:15.5px">Tarif wählen und live schalten</a>'
    + '<p style="' + P + '">Sie melden sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an. Danach ist Ihr Formular sofort live, auch in der App.</p>'
    + '<p style="' + P + '">Sollen wir alles gemeinsam einrichten? Das können Sie dort gleich mit ankreuzen.</p>'
    + '<p style="' + P + '">Fragen? Antworten Sie einfach auf diese E-Mail.<br>Viele Grüße, Manuel Tripi · clickzauber</p>'), MAIL_TO);

  const wer = [user.vorname, user.nachname].filter(Boolean).join(' ') || user.email, betrieb = user.firma || wer;
  await betreiberPush('Aus der App: ' + betrieb + ' will live schalten', wer + (user.telefon ? ' · ' + user.telefon : '') + ' · noch kein Tarif. Am besten heute anrufen.');
  await senden(MAIL_TO, 'Aus der App: ' + betrieb + ' will live schalten', rahmen(
    '<div style="font-size:20px;font-weight:600;color:#211d16">' + esc(betrieb) + ' will live schalten</div>'
    + '<p style="' + P + '">Das Konto wurde in der App eingerichtet und hat noch keinen Tarif. In der App steht nur „Wir melden uns bei Ihnen“.</p>'
    + '<p style="' + P + '">' + ['Name: ' + esc(wer), 'E-Mail: ' + esc(user.email), 'Telefon: ' + esc(user.telefon || '–'), 'Tarif: ' + (preis ? preis + ' im Monat' : 'noch offen')].join('<br>') + '</p>'
    + '<p style="' + P + '">' + (gesendet ? 'Die E-Mail mit dem Weg zum Tarif ist rausgegangen.' : '<b style="color:#a5341f">Die E-Mail an den Kunden ging nicht raus.</b> Bitte selbst melden.') + ' Am besten heute anrufen.</p>'), user.email);
  return { gesendet };
}
