// Offene Termine aufräumen und erinnern. Läuft stündlich (api/nacht.js?nur=termine über GitHub Actions)
// und einmal täglich im Nacht-Cron.
//  1. Anfrage oder Vorschlag, deren Uhrzeit vorbei ist → abgesagt. Der Betrieb bekommt Bescheid.
//     Hat der Betrieb nie geantwortet (Status „wunsch“), bekommt auch der Kunde eine Mail. Vorher blieb er ohne Antwort.
//  2. Anfrage oder Vorschlag ohne Antwort → Erinnerung an den Betrieb, einmal je Termin:
//     nach 2 Stunden, bei Terminen in den nächsten 24 Stunden schon nach 30 Minuten.
//     Vorher nur einmal täglich um 11 Uhr und erst nach 12 Stunden.
//  3. Kunde noch nicht informiert (WhatsApp nicht als gesendet bestätigt, älter als 30 Minuten) → in derselben Nachricht.
//  4. Nur täglich: morgen feste Termine mit Handynummer, noch nicht erinnert → „Morgen 6 Termine“ (öffnet #erinnern).
//  5. Stündlich ab 17 Uhr (seit 03.10.2026): wer bis dahin nicht per WhatsApp erinnert wurde, bekommt die Erinnerung
//     automatisch per Mail (mit E-Mail) und per SMS (wenn eingeschaltet), mit Link zum Absagen oder Umbuchen.
//     Abschalten: Einstellung erinnerung = false. Verfällt eine Anfrage, bekommt ein Kunde ohne E-Mail eine SMS.
// Alle Nachrichten an den Betrieb gehen über betriebMelden: Push, und ohne Push als Mail.
import { db, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { betriebMelden } from './_push.js';
import { kalenderNachziehen } from './_kalender-direkt.js';
import { heuteBerlin, plusTage, lokal, lokalText, anfrageNachziehen } from './_termine.js';
import { gt, gtWann } from './_gasttexte.js';
import { smsSenden, SMS_AN } from './_sms.js';

const GAST_HOST = (process.env.GAST_HOST || 'https://clickzauber-api.vercel.app').replace(/\/+$/, '');

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Der Betrieb hat nie geantwortet und die Uhrzeit ist vorbei: dem Kunden kurz Bescheid geben.
async function kundeVerfallen(t) {
  if (!MAIL_KEY || !t.email || (t.eigen && t.leistung === 'Gesperrt')) return false;
  try {
    const [{ data: b }, { data: e }] = await Promise.all([
      db.from('tenants').select('name').eq('id', t.tenant_id).maybeSingle(),
      db.from('einstellungen').select('telefon, antwort_an, mail_haupt').eq('tenant_id', t.tenant_id).maybeSingle().then((r) => r, () => ({ data: null }))
    ]);
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    const vn = t.name ? ' ' + String(t.name).split(/\s+/)[0] : '';
    const wann = gtWann('de', t.start);
    const html = '<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">'
      + '<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:24px 26px">'
      + '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6a6252">' + esc(wer) + '</div>'
      + '<p style="color:#211d16;font-size:16px;line-height:1.6;margin:10px 0 0">Guten Tag' + esc(vn) + ',</p>'
      + '<p style="color:#5f584a;font-size:15px;line-height:1.6;margin:10px 0 0">Ihre Anfrage für ' + esc(wann) + ' konnte leider nicht rechtzeitig bestätigt werden. Bitte entschuldigen Sie.'
      + (e && e.telefon ? ' Für einen neuen Termin erreichen Sie uns unter ' + esc(e.telefon) + '.' : ' Melden Sie sich gern, dann finden wir einen neuen Termin.') + '</p>'
      + '<p style="color:#5f584a;font-size:15px;line-height:1.6;margin:14px 0 0">Viele Grüße, ' + esc(wer) + '</p>'
      + '</td></tr></table></td></tr></table></body></html>';
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [t.email], reply_to: (e && (e.antwort_an || e.mail_haupt)) || undefined, subject: 'Ihre Anfrage für ' + wann + ' · ' + wer, html }) });
    return r.ok;
  } catch (err) { return false; }
}

export async function terminePflege(opt) {
  const stuendlich = !!(opt && opt.stuendlich);
  const jetzt = Date.now(), iso = new Date(jetzt).toISOString();
  let abgelaufen = 0, erinnert = 0, kunden = 0;
  const geaendert = new Set();
  const { data: alt } = await db.from('termine').select('id, tenant_id, lead_id, status, name, email, telefon, start, eigen, leistung').in('status', ['wunsch', 'vorschlag']).lt('start', iso).limit(1000);
  const weg = {};
  for (const t of alt || []) {
    const { data: w } = await db.from('termine').update({ status: 'abgesagt', status_am: iso }).eq('id', t.id).eq('status', t.status).select('id');
    if (!w || !w.length) continue;
    abgelaufen++; geaendert.add(t.tenant_id);
    await anfrageNachziehen(t.lead_id);   // nichts mehr aktiv → Anfrage „verloren“ (seit 14.10.2026)
    const x = weg[t.tenant_id] = weg[t.tenant_id] || { namen: [], vs: [], mail: 0 };
    (t.status === 'vorschlag' ? x.vs : x.namen).push(t.name || 'Kunde');
    x.lead = x.lead === undefined ? t.lead_id || null : null;   // nur bei genau einer Anfrage direkt öffnen
    if (t.status === 'wunsch' && await kundeVerfallen(t)) { x.mail++; kunden++; }
    else if (t.status === 'wunsch' && t.telefon && SMS_AN && !(t.eigen && t.leistung === 'Gesperrt')) {
      const wer = await salonName(t.tenant_id);
      if (await smsSenden(t.telefon, wer + ': Ihre Anfrage für ' + gtWann('de', t.start) + ' konnte leider nicht rechtzeitig bestätigt werden. Bitte entschuldigen Sie. Melden Sie sich gern für einen neuen Termin.', wer).catch(() => false)) { x.mail++; kunden++; }
    }
  }
  for (const [tid, x] of Object.entries(weg)) {
    // Wunsch ohne Antwort des Betriebs und Vorschlag ohne Antwort des Kunden getrennt nennen (seit 14.10.2026).
    const n = x.namen, v = x.vs, alle = n.length + v.length, nm = (l) => l.slice(0, 3).join(', ') + (l.length > 3 ? ' …' : '');
    const teile = [];
    if (n.length) teile.push(nm(n) + (x.mail ? ' · ' + (x.mail > 1 ? x.mail + ' Kunden haben' : 'Der Kunde hat') + ' eine kurze Nachricht bekommen.' : (n.length > 1 ? ' haben' : ' hat') + ' keine Antwort bekommen. Bitte kurz per WhatsApp oder Telefon melden.'));
    if (v.length) teile.push('Keine Antwort auf Ihren Vorschlag: ' + nm(v) + '. Die Zeit ist wieder frei.');
    await betriebMelden(tid, { titel: alle + (alle > 1 ? ' Anfragen' : ' Anfrage') + ' ohne Antwort verfallen', text: teile.join(' · '), url: x.lead && alle === 1 ? 'clickzauber-cockpit-live.html#anfrage-' + x.lead : 'clickzauber-cockpit-live.html#zeiten', tag: 'cz-verfallen' }).catch(() => {});
  }
  const { data: offen, error } = await db.from('termine').select('*').gte('start', iso).is('erinnert_am', null).or('status.in.(wunsch,vorschlag),bescheid.not.is.null').limit(2000);
  if (error) return { abgelaufen, erinnert, kunden, hinweis: 'sql/50 fehlt?' };
  const je = {};
  for (const t of offen || []) {
    if (!['wunsch', 'vorschlag', 'fest'].includes(t.status)) continue;
    const seit = new Date(t.status_am || t.created_at || t.start).getTime();
    const bald = new Date(t.start).getTime() - jetzt < 24 * 3600e3;
    const ohneAntwort = t.status !== 'fest' && seit < jetzt - (bald ? 30 * 60e3 : 2 * 3600e3);
    const info = !!t.bescheid && seit < jetzt - 30 * 60e3;
    if (!ohneAntwort && !info) continue;
    const x = je[t.tenant_id] = je[t.tenant_id] || { wunsch: [], vorschlag: [], info: [], ids: [], bald: false };
    if (ohneAntwort) x[t.status].push(t.name || 'Kunde'); else x.info.push(t.name || 'Kunde');
    if (ohneAntwort && bald) x.bald = true;
    x.ids.push(t.id);
  }
  const namen = (l) => ' (' + l.slice(0, 3).join(', ') + (l.length > 3 ? ' …' : '') + ')';
  for (const [tid, x] of Object.entries(je)) {
    const teile = [];
    if (x.wunsch.length) teile.push(x.wunsch.length + (x.wunsch.length > 1 ? ' Anfragen' : ' Anfrage') + ' ohne Ihre Antwort' + namen(x.wunsch));
    if (x.vorschlag.length) teile.push(x.vorschlag.length + (x.vorschlag.length > 1 ? ' Vorschläge' : ' Vorschlag') + ' ohne Antwort vom Kunden' + namen(x.vorschlag) + '. Erneut fragen oder „Kunde hat zugesagt“ tippen');
    if (x.info.length) teile.push(x.info.length + (x.info.length > 1 ? ' Kunden' : ' Kunde') + ' noch nicht informiert' + namen(x.info));
    await betriebMelden(tid, { titel: x.bald ? 'Bald fällig: bitte kurz ansehen' : 'Bitte kurz ansehen', text: teile.join(' · '), url: 'clickzauber-cockpit-live.html#zeiten', tag: 'cz-offen' }).catch(() => {});
    await db.from('termine').update({ erinnert_am: iso }).in('id', x.ids).then(() => {}, () => {});
    erinnert += x.ids.length;
  }
  for (const tid of geaendert) await kalenderNachziehen(tid).catch(() => null);
  const auto = await autoErinnern().catch(() => 0);
  if (stuendlich) return { abgelaufen, erinnert, kunden, auto };
  let vortag = 0;
  try {
    const m = plusTage(heuteBerlin(), 1);
    const { data: mo } = await db.from('termine').select('tenant_id, telefon, eigen, leistung').eq('status', 'fest').is('gast_erinnert', null)
      .gte('start', lokal(m, '00:00').toISOString()).lt('start', lokal(plusTage(m, 1), '00:00').toISOString()).limit(3000);
    const n = {};
    (mo || []).forEach((t) => { if (t.telefon && !(t.eigen && t.leistung === 'Gesperrt')) n[t.tenant_id] = (n[t.tenant_id] || 0) + 1; });
    for (const [tid, k] of Object.entries(n)) {
      await betriebMelden(tid, { titel: 'Morgen ' + k + (k > 1 ? ' Termine' : ' Termin'), text: 'Tippen, um die Kunden per WhatsApp zu erinnern.', url: 'clickzauber-cockpit-live.html#erinnern', tag: 'cz-morgen' }).catch(() => {});
      vortag++;
    }
  } catch (e) { /* ohne sql/51 */ }
  return { abgelaufen, erinnert, kunden, vortag, auto };
}

async function salonName(tid) {
  const { data: b } = await db.from('tenants').select('name').eq('id', tid).maybeSingle();
  return (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
}

// 5. Ab 17 Uhr: morgen feste Termine, noch nicht erinnert → Mail und (wenn eingeschaltet) SMS, mit Link zum Absagen oder Umbuchen.
// Nur Handynummer und keine SMS: bleibt beim WhatsApp-Knopf aus der Nachricht um 11 Uhr.
async function autoErinnern() {
  const stunde = Number(lokalText(Date.now()).zeit.slice(0, 2));
  if (stunde < 17 || stunde >= 21) return 0;
  const m = plusTage(heuteBerlin(), 1);
  const { data: mo, error } = await db.from('termine').select('id, tenant_id, lead_id, name, email, telefon, start, leistung, personal_name, gast_key, eigen')
    .eq('status', 'fest').is('gast_erinnert', null)
    .gte('start', lokal(m, '00:00').toISOString()).lt('start', lokal(plusTage(m, 1), '00:00').toISOString()).limit(2000);
  if (error) return 0;
  const aus = {}, namen = {};
  let n = 0;
  for (const t of mo || []) {
    if (t.eigen && t.leistung === 'Gesperrt') continue;
    if (!t.email && !(t.telefon && SMS_AN)) continue;
    if (!(t.tenant_id in aus)) {
      const { data: e } = await db.from('einstellungen').select('*').eq('tenant_id', t.tenant_id).maybeSingle().then((r) => r, () => ({ data: null }));
      aus[t.tenant_id] = !!(e && e.erinnerung === false);
      namen[t.tenant_id] = { wer: await salonName(t.tenant_id), antwort: e && (e.antwort_an || e.mail_haupt), telefon: e && e.telefon };
    }
    if (aus[t.tenant_id]) continue;
    const s = namen[t.tenant_id], link = t.gast_key ? GAST_HOST + '/api/termine?aktion=antwort&id=' + encodeURIComponent(t.id) + '&k=' + t.gast_key : '';
    const v = { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '', w: gtWann('de', t.start), a: link, wer: s.wer };
    const text = gt('de', 'hallo', v) + gt('de', 'erinnerung', v) + (link ? gt('de', 'erinn_ab', v) : '') + gt('de', 'gruss', v);
    let ok = false;
    if (t.email && MAIL_KEY) {
      const html = '<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:24px 26px">'
        + '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">Erinnerung</div>'
        + '<div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px">' + esc(v.w) + '</div>'
        + '<p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">' + esc([t.leistung, t.personal_name ? 'bei ' + t.personal_name : ''].filter(Boolean).join(' ')) + '</p>'
        + '<p style="color:#5f584a;font-size:15px;line-height:1.65;margin:10px 0 0">Wir freuen uns auf Sie!' + (s.telefon ? ' Telefon: ' + esc(s.telefon) : '') + '</p>'
        + (link ? '<a href="' + esc(link) + '" style="display:inline-block;margin-top:16px;border:1.5px solid #d9cfba;color:#211d16;text-decoration:none;border-radius:10px;padding:11px 18px;font-weight:600;font-size:14.5px">Absagen oder andere Zeit</a>' : '')
        + '<p style="color:#5f584a;font-size:15px;line-height:1.6;margin:16px 0 0">Viele Grüße, ' + esc(s.wer) + '</p></td></tr></table></td></tr></table></body></html>';
      try {
        const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: MAIL_FROM, to: [t.email], reply_to: s.antwort || undefined, subject: 'Erinnerung: ' + v.w + ' · ' + s.wer, html }) });
        ok = r.ok;
      } catch (err) { /* nächste Stunde erneut */ }
    }
    if (t.telefon && SMS_AN) ok = (await smsSenden(t.telefon, text, s.wer).catch(() => false)) || ok;
    if (ok) { await db.from('termine').update({ gast_erinnert: new Date().toISOString() }).eq('id', t.id).then(() => {}, () => {}); n++; }
  }
  return n;
}
