// Einladungs-Link für vorgebaute Konten (seit 09.10.2026, sql/67).
// Manuel baut auf der Plattform ein Konto vor (lib/konto-admin.js 'vorbauen'), der Kunde bekommt
// clickzauber.de/einladung.html?c=CODE per WhatsApp.
//
// GET  /api/einladung?c=CODE → Betrieb, Formular, schon eingelöst?, schon live?
// POST /api/einladung { c, email, passwort, agb[, vorname] } → Konto übernehmen: E-Mail und Passwort des Kunden,
//      alle bisherigen Anmeldungen (auch Manuels) enden, Testzugang 14 Tage startet, Sitzung zurück.
//      Die Bestätigungsmail geht sofort raus; bestätigt sein muss die Adresse erst zum Live schalten (lib/save.js).
// POST /api/einladung { aktion:'rueckmeldung', token, text } → Rückmeldung aus dem Cockpit (js/cz-test.js) an Manuel.
// POST /api/einladung { aktion:'schritt', token, schritt } → was nur das Gerät des Kunden weiß (home, probe, teilen, formular),
//      für die Checkliste in der Kundenübersicht der Plattform (sql/68, js/cz-kundenakte.js).
// testPflege() aus api/nacht.js: zwei Tage vor Testende einmal Push und Mail an Manuel (users.test_erinnert_am).
// Checkliste (sql/68): Öffnet der Kunde den Link, nachdem Manuel ihn als verschickt abgehakt hat, steht es in users.schritte
// und Manuel bekommt eine Mitteilung. Mitteilungen führen direkt in die Kundenakte (#akte-ID).
// Seit 10.10.2026 als Push und Mail: jedes Öffnen vor dem Zugang (mit Zähler), jeder Fehlversuch beim Zugang mit Grund
// (schritte.fehlversuche, nie das Passwort), E-Mail bestätigt (lib/auth/bestaetigen.js), Formular angesehen, Home-Bildschirm,
// weitergeschickt, erste Anfrage nach dem Einlösen (lib/lead.js). Nur „Formular eingeschaltet“ bleibt nur Push.
// POST { aktion:'frage', c, text } → „Manuel fragen“ auf einladung.html, geht ohne Zugang, höchstens 10 am Tag.
import { db, cors, body, MAIL_KEY, MAIL_FROM, MAIL_TO, userByToken } from './_lib.js';
import { hashPasswort, passwortSchwach, neuerToken, geraetName, SITE } from './auth/_pw.js';
import { bestaetigungsMail } from './auth/_mail.js';
import { pushSenden } from './_push.js';

export const TEST_TAGE = 14;
const still = () => {};
const codeOk = (c) => /^[a-z0-9]{6,16}$/.test(c);
const tagDe = (d) => new Date(d).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });

async function formularVon(tenantId) {
  if (!tenantId) return {};
  const { data: ws } = await db.from('widgets').select('slug, status').eq('tenant_id', tenantId).order('created_at', { ascending: true }).limit(1);
  const w = ws && ws[0];
  if (!w || !w.slug) return {};
  const { data: v } = await db.from('widget_versions').select('config_json').eq('widget_id', w.slug)
    .order('version', { ascending: false }).limit(1).maybeSingle();
  return { slug: w.slug, live: !w.status || w.status === 'live', config: v ? v.config_json : null };
}

const akteUrl = (u) => 'clickzauber-plattform.html#akte-' + u.id;
const schritteVon = (u) => (u && u.schritte && typeof u.schritte === 'object' && !Array.isArray(u.schritte)) ? u.schritte : {};

// Schritte der Checkliste dazuschreiben (sql/68). Ein Zeitpunkt bleibt beim ersten Mal stehen, nur aufrufe und zuletzt laufen mit.
// Liest den Stand frisch, damit nichts überschrieben wird. Fehlt sql/68, passiert nichts.
// fehlversuche und fragen sind Listen: dafür eine Funktion übergeben, die aus der alten Liste die neue macht.
const LAUFEND = new Set(['aufrufe', 'zuletzt', 'fehlversuche', 'fragen']);
export async function schritteMerken(id, neu) {
  const { data, error } = await db.from('users').select('schritte').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const s = { ...schritteVon(data) };
  let anders = false;
  for (const [k, v] of Object.entries(neu)) if (LAUFEND.has(k) || !s[k]) { s[k] = typeof v === 'function' ? v(s[k]) : v; anders = true; }
  if (anders) await db.from('users').update({ schritte: s }).eq('id', id).then(still, still);
  return s;
}

// o.url: wohin die Mitteilung führt (Standard: Plattform), o.mail === false: nur Push, keine Mail.
async function betreiberMelden(titel, text, antwortAn, o = {}) {
  try {
    const mails = (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const { data } = await db.from('users').select('tenant_id').in('email', mails);
    const t = [...new Set((data || []).map((u) => u.tenant_id).filter(Boolean))];
    await Promise.all(t.map((id) => pushSenden(id, { titel, text: text.slice(0, 180), url: o.url || 'clickzauber-plattform.html' })));
  } catch (e) { /* Push darf nichts aufhalten */ }
  if (!MAIL_KEY || o.mail === false) return;
  const m = { from: MAIL_FROM, to: MAIL_TO, subject: titel, text };
  if (antwortAn) m.reply_to = antwortAn;
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(m)
  }).catch(still);
}

const mitLink = (u, t) => t + '\n\nKundenakte: ' + SITE + '/' + akteUrl(u);
const zeitDe = (d) => new Date(d).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

// Mitteilung zu einem Schritt der Checkliste, je Schritt einmal (seit 10.10.2026).
async function schrittMelden(u, k) {
  const f = u.firma || 'Ein Betrieb', live = !!schritteVon(u).live;
  const T = {
    formular: [f + ' hat sich das Formular angesehen', live ? 'Das Formular ist schon eingeschaltet.' : 'Als Nächstes: im Cockpit oben rechts mit dem grünen Schalter einschalten.'],
    home: [f + ' hat das Cockpit auf den Home-Bildschirm gelegt', 'Das Cockpit liegt jetzt wie eine App auf dem Handy.'],
    teilen: [f + ' hat das Formular zum Testen weitergeschickt', 'Anfragen von Bekannten kommen im Cockpit an.'],
    anfrage1: [f + ': erste Anfrage seit dem Start', 'Die erste Anfrage seit dem Anlegen des Zugangs ist da. Sie steht im Cockpit.'],
    bestaetigt: [f + ' hat die E-Mail-Adresse bestätigt', live ? 'Das Formular ist schon eingeschaltet.' : 'Ab jetzt lässt sich das Formular einschalten.']
  };
  if (T[k]) await betreiberMelden(T[k][0], mitLink(u, T[k][1]), null, { url: akteUrl(u) });
}

// Fehlversuch beim Zugang anlegen: Grund in die Checkliste (die letzten 20), Push und Mail. Das Passwort nie.
// Vor „Ja, verschickt“ zählt nichts, das sind Manuels eigene Proben.
async function fehlversuch(u, grund, email) {
  if (!schritteVon(u).versendet) return;
  const am = new Date().toISOString(), mail = String(email || '').slice(0, 80);
  const s = await schritteMerken(u.id, { fehlversuche: (alt) => [...(Array.isArray(alt) ? alt : []), { am, grund, email: mail || null }].slice(-20) });
  const n = s && Array.isArray(s.fehlversuche) ? s.fehlversuche.length : 1;
  const tipp = /schon ein Konto/.test(grund) ? '\nUnter „Kunden & Zahlen“ nach der Adresse suchen. Ist es ein altes Testkonto, kann es weg; sonst eine andere Adresse vorschlagen.' : '';
  await betreiberMelden((u.firma || 'Ein Betrieb') + ': Zugang anlegen hat nicht geklappt',
    mitLink(u, 'Grund: ' + grund + (mail ? '\nEingegebene E-Mail: ' + mail : '') + '\nFehlversuch Nr. ' + n + '. Die Seite hat den Grund angezeigt.' + tipp), null, { url: akteUrl(u) });
}

// Aus lib/auth/bestaetigen.js: E-Mail-Adresse bestätigt.
export async function einladungBestaetigt(email) {
  const { data: u, error } = await db.from('users').select('id, firma, email, einladung_code, eingeloest_am, schritte').eq('email', email).maybeSingle();
  if (error || !u || !u.einladung_code || !u.eingeloest_am || schritteVon(u).bestaetigt) return;
  const s = await schritteMerken(u.id, { bestaetigt: new Date().toISOString() });
  if (s) await schrittMelden({ ...u, schritte: s }, 'bestaetigt');
}

// Aus lib/lead.js: erste Anfrage nach dem Einlösen. Davor ist es Manuels Online-Test.
// Gab es seit dem Einlösen schon mehr Anfragen (Konten von vor dem 10.10.2026), wird es nur still vermerkt.
export async function einladungAnfrage(tenantId) {
  if (!tenantId) return;
  const { data, error } = await db.from('users').select('id, firma, email, einladung_code, eingeloest_am, schritte').eq('tenant_id', tenantId).not('einladung_code', 'is', null).limit(1);
  const u = !error && data && data[0];
  if (!u || !u.eingeloest_am || schritteVon(u).anfrage1) return;
  const { count } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', u.eingeloest_am).then((r) => r, () => ({}));
  const s = await schritteMerken(u.id, { anfrage1: new Date().toISOString() });
  if (s && !(count > 1)) await schrittMelden({ ...u, schritte: s }, 'anfrage1');
}

// Läuft einmal am Tag (api/nacht.js). Fenster: Test endet in mehr als 24 und höchstens 48 Stunden.
export async function testPflege() {
  const jetzt = Date.now();
  const { data, error } = await db.from('users').select('id, email, firma, vorname, nachname, telefon, test_bis')
    .is('test_erinnert_am', null)
    .gt('test_bis', new Date(jetzt + 864e5).toISOString())
    .lte('test_bis', new Date(jetzt + 2 * 864e5).toISOString()).limit(50);
  if (error) return { erinnert: 0, fehler: 'sql/67 fehlt' };
  let n = 0;
  for (const u of data || []) {
    const wer = [u.vorname, u.nachname].filter(Boolean).join(' ');
    await betreiberMelden('Test von ' + (u.firma || u.email) + ' endet ' + tagDe(u.test_bis),
      'Jetzt ist ein guter Moment für den Anruf.\n' + [wer, u.telefon, u.email].filter(Boolean).join(' · ')
      + '\n\nAuf der Plattform in der Kundenübersicht, letzter Schritt der Checkliste: „In echtes Konto überführen“ oder „+ 14 Tage“.\n' + SITE + '/' + akteUrl(u), null, { url: akteUrl(u) });
    await db.from('users').update({ test_erinnert_am: new Date().toISOString() }).eq('id', u.id).then(still, still);
    n++;
  }
  return { erinnert: n };
}

// Aus lib/save.js nach „Live schalten“: einmal in die Checkliste, Mitteilung an Manuel.
export async function einladungLive(u) {
  if (!u || !u.einladung_code || schritteVon(u).live) return;
  const s = await schritteMerken(u.id, { live: new Date().toISOString() });
  if (!s) return;
  await betreiberMelden((u.firma || 'Ein Betrieb') + ' hat das Formular eingeschaltet', 'Ab jetzt sind die Anfragen echt.', null, { url: akteUrl(u), mail: false });
}

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const c = String(req.query.c || '').trim().toLowerCase();
    if (!codeOk(c)) return res.status(404).json({ ok: false, error: 'Dieser Link ist nicht gültig.' });
    const { data: u, error } = await db.from('users').select('*').eq('einladung_code', c).maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: 'Bitte später noch einmal versuchen.' });
    if (!u || u.komplett_gesperrt) return res.status(404).json({ ok: false, error: 'Dieser Link ist nicht mehr gültig.' });
    const f = await formularVon(u.tenant_id).catch(() => ({}));
    // Checkliste (sql/68): Aufrufe zählen erst, wenn Manuel den Link als verschickt abgehakt hat. Seine eigenen Proben davor zählen nicht.
    const s = schritteVon(u);
    if (s.versendet || u.eingeloest_am) {
      const jetzt = new Date().toISOString(), erst = !s.geoeffnet && !u.eingeloest_am;
      const neu = { aufrufe: (+s.aufrufe || 0) + 1, zuletzt: jetzt, geoeffnet: jetzt };
      if (u.eingeloest_am) neu.formular = jetzt;   // nach dem Einlösen zeigt der Link das Formular
      const ok = await schritteMerken(u.id, neu);
      // Seit 10.10.2026: jedes Öffnen vor dem Zugang als Push und Mail, mit Zähler und dem letzten Fehlversuch.
      if (ok && !u.eingeloest_am) {
        const fv = Array.isArray(ok.fehlversuche) ? ok.fehlversuche : [], l = fv[fv.length - 1];
        await betreiberMelden((u.firma || 'Ein Betrieb') + (erst ? ' hat den Einladungs-Link geöffnet' : ' hat den Einladungs-Link wieder geöffnet (' + neu.aufrufe + '. Mal)'),
          mitLink(u, (erst ? 'Gerade eben. ' : 'Noch ohne Zugang. ') + 'Als Nächstes kommt der Zugang: E-Mail und Passwort.'
            + (l ? '\nLetzter Fehlversuch: ' + zeitDe(l.am) + ' Uhr, ' + l.grund : '')), null, { url: akteUrl(u) });
      } else if (ok && !s.formular && !s.probe) await schrittMelden({ ...u, schritte: ok }, 'formular');
    }
    return res.status(200).json({
      ok: true,
      firma: u.firma || '',
      vorname_fehlt: !u.vorname,
      eingeloest: !!u.eingeloest_am,
      test_bis: u.test_bis || null,
      slug: f.slug || null,
      live: !!f.live,
      config: f.config || null
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const p = body(req);

  if (p.aktion === 'rueckmeldung') {
    const user = await userByToken(String(p.token || ''));
    if (!user) return res.status(401).json({ ok: false, error: 'Bitte melden Sie sich neu an.' });
    const text = String(p.text || '').trim().slice(0, 3000);
    if (text.length < 3) return res.status(400).json({ ok: false, error: 'Bitte schreiben Sie ein paar Worte.' });
    const wer = [user.vorname, user.nachname].filter(Boolean).join(' ');
    await db.from('protokoll').insert({ tenant_id: user.tenant_id || null, was: 'rueckmeldung_test', wer: user.email, anzahl: 1, hinweis: text.slice(0, 500) }).then(still, still);
    await betreiberMelden('Rückmeldung von ' + (user.firma || user.email), text + '\n\n' + [wer, user.telefon, user.email].filter(Boolean).join(' · '), user.email, { url: akteUrl(user) });
    return res.status(200).json({ ok: true });
  }

  if (p.aktion === 'schritt') {
    const user = await userByToken(String(p.token || ''));
    if (!user) return res.status(401).json({ ok: false });
    const k = String(p.schritt || '');
    if (!['home', 'probe', 'teilen', 'formular'].includes(k)) return res.status(400).json({ ok: false });
    if (user.einladung_code) {
      const { data: fr } = await db.from('users').select('schritte').eq('id', user.id).maybeSingle().then((r) => r, () => ({}));
      const s0 = schritteVon(fr), s = await schritteMerken(user.id, { [k]: new Date().toISOString() });
      // Je Schritt eine Mitteilung; „Formular ausprobiert“ (probe) zählt als angesehen.
      const m = k === 'probe' || k === 'formular' ? (!s0.formular && !s0.probe ? 'formular' : '') : (!s0[k] ? k : '');
      if (s && m && user.eingeloest_am) await schrittMelden({ ...user, schritte: s }, m);
    }
    return res.status(200).json({ ok: true });
  }

  // „Manuel fragen“ auf einladung.html (seit 10.10.2026): nur mit dem Code aus dem Link, auch ohne Zugang.
  if (p.aktion === 'frage') {
    const c = String(p.c || '').trim().toLowerCase(), text = String(p.text || '').trim().slice(0, 2000);
    if (!codeOk(c)) return res.status(404).json({ ok: false, error: 'Dieser Link ist nicht gültig.' });
    if (text.length < 3) return res.status(400).json({ ok: false, error: 'Bitte schreiben Sie ein paar Worte.' });
    const { data: u } = await db.from('users').select('*').eq('einladung_code', c).maybeSingle();
    if (!u || u.komplett_gesperrt) return res.status(404).json({ ok: false, error: 'Dieser Link ist nicht mehr gültig.' });
    const fr = schritteVon(u).fragen, heute = (Array.isArray(fr) ? fr : []).filter((f) => Date.now() - new Date(f.am).getTime() < 864e5);
    if (heute.length >= 10) return res.status(429).json({ ok: false, error: 'Heute sind schon viele Fragen angekommen. Bitte schreiben Sie Manuel per WhatsApp.' });
    const am = new Date().toISOString();
    await schritteMerken(u.id, { fragen: (alt) => [...(Array.isArray(alt) ? alt : []), { am, text: text.slice(0, 500) }].slice(-20) });
    await db.from('protokoll').insert({ tenant_id: u.tenant_id || null, was: 'frage_einladung', wer: u.firma || u.email, anzahl: 1, hinweis: text.slice(0, 500) }).then(still, still);
    const wer = [u.vorname, u.nachname, u.telefon].filter(Boolean).join(' · ');
    await betreiberMelden('Frage von ' + (u.firma || 'einem Betrieb'), mitLink(u, text + (wer ? '\n\n' + wer : '') + (u.eingeloest_am ? '' : '\nNoch ohne Zugang, gefragt auf der Einladungs-Seite.')),
      u.eingeloest_am ? u.email : null, { url: akteUrl(u) });
    return res.status(200).json({ ok: true });
  }

  const c = String(p.c || '').trim().toLowerCase();
  const email = String(p.email || '').trim().toLowerCase();
  const pw = String(p.passwort || '');
  if (!codeOk(c)) return res.status(404).json({ ok: false, error: 'Dieser Link ist nicht gültig.' });
  const { data: u } = await db.from('users').select('*').eq('einladung_code', c).maybeSingle();
  if (!u || u.komplett_gesperrt) return res.status(404).json({ ok: false, error: 'Dieser Link ist nicht mehr gültig.' });
  if (u.eingeloest_am) return res.status(409).json({ ok: false, eingeloest: true, error: 'Ihr Zugang ist schon eingerichtet. Bitte melden Sie sich mit Ihrer E-Mail und Ihrem Passwort an.' });
  // Seit 10.10.2026 prüft nur noch der Server. Jeder Fehlversuch kommt mit Grund in die Checkliste und an Manuel.
  const nein = async (status, error, grund) => { await fehlversuch(u, grund, email).catch(still); return res.status(status).json({ ok: false, error }); };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return nein(400, 'Bitte eine gültige E-Mail-Adresse eingeben.', email ? 'E-Mail-Adresse ungültig' : 'E-Mail-Adresse fehlte');
  const schwach = passwortSchwach(pw);
  if (schwach) return nein(400, schwach, 'Passwort abgelehnt: ' + schwach);
  if (!p.agb) return nein(400, 'Bitte AGB und Datenschutz bestätigen.', 'Haken bei AGB und Datenschutz fehlte');
  const vorname = u.vorname || String(p.vorname || '').trim().slice(0, 60);
  if (!vorname) return nein(400, 'Bitte Ihren Vornamen eintragen.', 'Vorname fehlte');
  const { data: belegt } = await db.from('users').select('id').eq('email', email).maybeSingle();
  if (belegt) return nein(409, 'Unter dieser Adresse gibt es schon ein Konto. Bitte eine andere Adresse nehmen oder Manuel Bescheid geben.', 'Unter dieser Adresse gibt es schon ein Konto');

  const alt = String(u.email || '').toLowerCase();
  const jetzt = new Date();
  const bis = new Date(jetzt.getTime() + TEST_TAGE * 864e5).toISOString();
  const token = neuerToken();
  const { error } = await db.from('users').update({
    email, password_hash: hashPasswort(pw), verified: false, token,
    vorname, eingeloest_am: jetzt.toISOString(), test_bis: bis, test_erinnert_am: null
  }).eq('id', u.id).is('eingeloest_am', null);
  if (error) return nein(500, 'Das hat nicht geklappt. Bitte noch einmal versuchen.', 'Speichern am Server ging nicht: ' + String(error.message || '').slice(0, 120));

  // Alle bisherigen Anmeldungen (Manuel beim Bauen) enden. Ab jetzt kommt nur noch der Kunde hinein.
  await db.from('sessions').delete().eq('user_id', u.id).then(still, still);
  await db.from('sessions').insert({ token, user_id: u.id, geraet: geraetName(req.headers['user-agent']) }).then(still, still);
  if (u.tenant_id) await db.from('tenants').update({ email }).eq('id', u.tenant_id).ilike('email', alt).then(still, still);
  await db.from('protokoll').insert({ tenant_id: u.tenant_id || null, was: 'einladung_eingeloest', wer: email, anzahl: 1, hinweis: (u.firma || '') + ' · Test bis ' + bis.slice(0, 10) }).then(still, still);

  let mailRaus = true;
  try {
    const t = neuerToken();
    await db.from('email_tokens').insert({ email, token: t, zweck: 'bestaetigen', expires_at: new Date(Date.now() + 48 * 3600e3).toISOString() });
    await bestaetigungsMail(email, SITE + '/clickzauber-login.html?bestaetigen=' + t);
  } catch (e) { mailRaus = false; }

  await betreiberMelden((u.firma || 'Ein Betrieb') + ' hat die Einladung angenommen',
    vorname + ' (' + email + ') ist jetzt im Cockpit. Der Testzugang läuft 14 Tage, bis ' + tagDe(bis) + '.', email, { url: akteUrl(u) });

  return res.status(200).json({ ok: true, token, email, test_bis: bis, mail_raus: mailRaus });
}
