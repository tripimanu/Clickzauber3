// Texte, Kalender-Eintrag und Mails für Termin-Links (lib/vertrieb-termin.js, sql/64).
import { MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';
import { utcVon } from './_ical.js';

export const VON = process.env.VERTRIEB_NAME || 'Manuel Tripi';
export const VON_TEL = process.env.VERTRIEB_TELEFON || '+49 176 61398922';
const WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const ARTEN = { telefon: 'Telefonat', video: 'Videogespräch', vor_ort: 'Treffen vor Ort' };
export const BRANCHE_TXT = { friseur: 'Friseur & Beauty', catering: 'Food Truck & Catering', hochzeit: 'Hochzeit & Location', handwerk: 'Handwerk & Solar', beratung: 'Makler & Finanzen' };

export function tagLang(datum) {
  const d = new Date(String(datum).slice(0, 10) + 'T12:00:00Z');
  return WT[d.getUTCDay()] + ', ' + d.getUTCDate() + '. ' + MON[d.getUTCMonth()];
}
export function wannText(v) { return v ? tagLang(v.datum) + ', ' + v.zeit + ' Uhr' : ''; }
export function startMs(v) {
  const [y, m, d] = String(v.datum).split('-').map(Number), [h, mi] = String(v.zeit).split(':').map(Number);
  return utcVon([y, m, d, h, mi]);
}
export function demoLink(t) { return t.demo_code ? 'https://clickzauber.de/demo?z=' + t.demo_code + '&branche=' + (t.branche || 'friseur') : ''; }
export function seitenLink(t) { return 'https://clickzauber.de/t/' + t.code; }
function wo(t) {
  if (t.art === 'telefon') return t.telefon ? 'Ich rufe Sie an: ' + t.telefon : 'Ich rufe Sie an.';
  if (t.art === 'video') return t.ort ? 'Link zum Gespräch: ' + t.ort : 'Den Link zum Gespräch schicke ich Ihnen vorher.';
  return t.ort ? 'Ort: ' + t.ort : 'Ich komme zu Ihnen in den Betrieb.';
}

function icsZeit(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function icsText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
export function ics(t, fuerBetreiber) {
  const v = t.gewaehlt, a = startMs(v), b = a + (t.dauer || 30) * 60e3;
  const titel = fuerBetreiber ? 'clickzauber · ' + (t.betrieb || t.name || 'Interessent') : 'Gespräch mit ' + VON + ' (clickzauber)';
  const info = [ARTEN[t.art] || 'Gespräch', wo(t), fuerBetreiber ? [t.name, t.telefon, t.email].filter(Boolean).join(' · ') : 'Fragen vorher: ' + VON_TEL, 'Termin ändern: ' + seitenLink(t)].join('\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//clickzauber//Termin//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + t.code + '-' + v.datum + v.zeit.replace(':', '') + '@clickzauber.de', 'DTSTAMP:' + icsZeit(Date.now()),
    'DTSTART:' + icsZeit(a), 'DTEND:' + icsZeit(b), 'SUMMARY:' + icsText(titel), 'DESCRIPTION:' + icsText(info),
    t.art === 'vor_ort' && t.ort ? 'LOCATION:' + icsText(t.ort) : '', 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(titel), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

const e = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function rahmen(innen) {
  return '<div style="background:#f5f2ea;padding:24px 12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#241f19">'
    + '<div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e6dfd2;border-radius:16px;padding:24px 22px;font-size:16px;line-height:1.55">' + innen + '</div>'
    + '<p style="max-width:520px;margin:14px auto 0;font-size:12.5px;color:#7a7266;text-align:center">' + e(VON) + ' · clickzauber · ' + e(VON_TEL) + '</p></div>';
}
function knopf(href, text) { return '<p style="margin:18px 0 0"><a href="' + e(href) + '" style="display:inline-block;background:#2f7d59;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">' + e(text) + '</a></p>'; }
function anrede(t) { const v = String(t.name || '').trim().split(/\s+/)[0]; return v ? 'Hallo ' + v + ',' : 'Guten Tag,'; }

export function bestaetigungMail(t) {
  const w = wannText(t.gewaehlt), dl = demoLink(t);
  const html = rahmen('<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2f7d59">Termin bestätigt</p>'
    + '<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">' + e(w) + '</h1>'
    + '<p style="margin:0 0 12px">' + e(anrede(t)) + '<br>vielen Dank, unser Termin steht. ' + e(ARTEN[t.art] || 'Gespräch') + ', etwa ' + (t.dauer || 30) + ' Minuten. ' + e(wo(t)) + '</p>'
    + '<p style="margin:0 0 12px">Den Kalender-Eintrag finden Sie im Anhang. Am Vortag bekommen Sie eine kurze Erinnerung.</p>'
    + (dl ? '<p style="margin:16px 0 0;padding:14px;border-radius:12px;background:#eef5f0">Bis dahin können Sie clickzauber schon ausprobieren: Ihre eigene Demo, 7 Tage, mit Beispieldaten.</p>' + knopf(dl, 'Demo öffnen') : '')
    + '<p style="margin:18px 0 0;font-size:14px;color:#5c544a">Kommt etwas dazwischen? <a href="' + e(seitenLink(t)) + '" style="color:#2f7d59">Anderen Termin wünschen</a></p>'
    + '<p style="margin:16px 0 0">Viele Grüße<br>' + e(VON) + '</p>');
  const text = [anrede(t), '', 'unser Termin steht: ' + w + '.', (ARTEN[t.art] || 'Gespräch') + ', etwa ' + (t.dauer || 30) + ' Minuten. ' + wo(t), '',
    dl ? 'Ihre eigene Demo für 7 Tage: ' + dl : '', 'Anderen Termin wünschen: ' + seitenLink(t), '', 'Viele Grüße', VON, VON_TEL].filter((x) => x !== '').join('\n');
  return { betreff: 'Termin bestätigt: ' + w + ' · ' + VON + ', clickzauber', html, text };
}
export function erinnerungMail(t) {
  const html = rahmen('<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2f7d59">Erinnerung</p>'
    + '<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">Morgen, ' + e(t.gewaehlt.zeit) + ' Uhr</h1>'
    + '<p style="margin:0 0 12px">' + e(anrede(t)) + '<br>kurze Erinnerung an unser ' + e(ARTEN[t.art] || 'Gespräch') + ' morgen um ' + e(t.gewaehlt.zeit) + ' Uhr. ' + e(wo(t)) + '</p>'
    + '<p style="margin:0;font-size:14px;color:#5c544a">Passt es doch nicht? <a href="' + e(seitenLink(t)) + '" style="color:#2f7d59">Anderen Termin wünschen</a></p>'
    + '<p style="margin:16px 0 0">Bis morgen<br>' + e(VON) + '</p>');
  return { betreff: 'Erinnerung: morgen ' + t.gewaehlt.zeit + ' Uhr · ' + VON + ', clickzauber', html, text: anrede(t) + '\n\nkurze Erinnerung an unser Gespräch morgen um ' + t.gewaehlt.zeit + ' Uhr. ' + wo(t) + '\n\nAnderen Termin wünschen: ' + seitenLink(t) + '\n\nBis morgen\n' + VON };
}

export async function mailSenden(an, m, anhang) {
  if (!MAIL_KEY || !an) return false;
  try {
    const d = { from: MAIL_FROM, to: an, reply_to: MAIL_TO, subject: m.betreff, html: m.html, text: m.text };
    if (anhang) d.attachments = [{ filename: 'termin.ics', content: Buffer.from(anhang, 'utf8').toString('base64') }];
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    return r.ok;
  } catch (x) { return false; }
}
