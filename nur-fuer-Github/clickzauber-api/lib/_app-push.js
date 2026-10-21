// Push an die clickzauber-App für iPhone und Android (seit 04.10.2026).
//
// Die App meldet ihr Gerät wie ein Browser über /api/push an, nur mit einer anderen Adresse:
//   fcm:<token>   Android, über Google Firebase Cloud Messaging
//   apns:<token>  iPhone, direkt über Apple (APNs)
// Vercel-Variablen (Anleitung: NICHT-HOCHLADEN/app/App-Anleitung.html, Teil D):
//   FCM_KONTO       Inhalt der JSON-Datei „Dienstkonto“ aus Firebase (Projekteinstellungen → Dienstkonten)
//   APNS_KEY        Inhalt der .p8-Datei aus dem Apple-Entwicklerkonto (Keys → Apple Push Notifications service)
//   APNS_KEY_ID     Schlüssel-ID (10 Zeichen) zu dieser Datei
//   APNS_TEAM_ID    Team-ID (10 Zeichen) aus dem Apple-Entwicklerkonto
//   APNS_BUNDLE_ID  optional, Standard de.clickzauber.app
// Fehlt etwas, gehen an diese Geräte keine Nachrichten. Dann springt wie bisher die Mail ein (lib/_push.js, betriebMelden).
import crypto from 'crypto';
import http2 from 'http2';

const b64u = (x) => Buffer.from(x).toString('base64url');

function fcmKonto() {
  try {
    const k = JSON.parse(process.env.FCM_KONTO || '');
    return k && k.client_email && k.private_key && k.project_id ? k : null;
  } catch (e) { return null; }
}
function apnsDaten() {
  const key = String(process.env.APNS_KEY || '').replace(/\\n/g, '\n').trim();
  if (!key || !process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID) return null;
  return { key, kid: String(process.env.APNS_KEY_ID).trim(), team: String(process.env.APNS_TEAM_ID).trim(), topic: String(process.env.APNS_BUNDLE_ID || 'de.clickzauber.app').trim() };
}
export function appBereit() { return !!(fcmKonto() || apnsDaten()); }
export function appStand() { return { android: !!fcmKonto(), iphone: !!apnsDaten() }; }

// ── Android: Firebase Cloud Messaging (HTTP v1) ──
let FCM_ZUGANG = null;
async function fcmZugang(k) {
  if (FCM_ZUGANG && FCM_ZUGANG.bis > Date.now() + 60e3) return FCM_ZUGANG.wert;
  const t = Math.floor(Date.now() / 1000);
  const kopf = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const inhalt = b64u(JSON.stringify({ iss: k.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: t, exp: t + 3600 }));
  const sig = crypto.sign('sha256', Buffer.from(kopf + '.' + inhalt), k.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: kopf + '.' + inhalt + '.' + sig })
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error('fcm-zugang');
  FCM_ZUGANG = { wert: j.access_token, bis: Date.now() + (+j.expires_in || 3600) * 1000 };
  return j.access_token;
}
async function fcmSenden(k, token, n) {
  const zugang = await fcmZugang(k);
  const r = await fetch('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(k.project_id) + '/messages:send', {
    method: 'POST', headers: { Authorization: 'Bearer ' + zugang, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: {
      token, notification: { title: n.titel, body: n.text }, data: { url: n.url },
      android: { priority: 'HIGH', notification: { channel_id: 'anfragen', sound: 'default' } }
    } })
  });
  if (r.ok) return 'ok';
  const t = await r.text().catch(() => '');
  // Gerät gibt es nicht mehr (App gelöscht, Mitteilungen entzogen): Eintrag entfernen.
  if (r.status === 404 || /UNREGISTERED|not a valid FCM registration token/i.test(t)) return 'weg';
  return 'fehler';
}

// ── iPhone: Apple Push Notification service ──
let APNS_JWT = null;
function apnsJwt(a) {
  if (APNS_JWT && APNS_JWT.bis > Date.now()) return APNS_JWT.wert;
  const kopf = b64u(JSON.stringify({ alg: 'ES256', kid: a.kid }));
  const inhalt = b64u(JSON.stringify({ iss: a.team, iat: Math.floor(Date.now() / 1000) }));
  const sig = crypto.sign('sha256', Buffer.from(kopf + '.' + inhalt), { key: a.key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  APNS_JWT = { wert: kopf + '.' + inhalt + '.' + sig, bis: Date.now() + 40 * 60e3 };   // Apple nimmt ihn höchstens eine Stunde
  return APNS_JWT.wert;
}
function apnsEinmal(host, a, token, n) {
  return new Promise((fertig) => {
    let c = null, vorbei = false;
    const ende = (x) => { if (vorbei) return; vorbei = true; try { if (c) c.close(); } catch (e) {} fertig(x); };
    try { c = http2.connect('https://' + host); } catch (e) { ende({ status: 0 }); return; }
    c.on('error', () => ende({ status: 0 }));
    let anfrage;
    try {
      anfrage = c.request({ ':method': 'POST', ':path': '/3/device/' + token, authorization: 'bearer ' + apnsJwt(a),
        'apns-topic': a.topic, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' });
    } catch (e) { ende({ status: 0 }); return; }
    let status = 0, daten = '';
    anfrage.setEncoding('utf8');
    anfrage.on('response', (h) => { status = h[':status']; });
    anfrage.on('data', (d) => { daten += d; });
    anfrage.on('end', () => { let grund = ''; try { grund = JSON.parse(daten || '{}').reason || ''; } catch (e) {} ende({ status, grund }); });
    anfrage.on('error', () => ende({ status: 0 }));
    anfrage.setTimeout(8000, () => ende({ status: 0 }));
    anfrage.end(JSON.stringify({ aps: { alert: { title: n.titel, body: n.text }, sound: 'default' }, url: n.url }));
  });
}
async function apnsSenden(a, token, n) {
  let r = await apnsEinmal('api.push.apple.com', a, token, n);
  if (r.status === 200) return 'ok';
  // Direkt aus Xcode aufs Handy gespielt: Das Gerät hängt am Testsystem von Apple.
  if (r.status === 400 && r.grund === 'BadDeviceToken') {
    r = await apnsEinmal('api.sandbox.push.apple.com', a, token, n);
    if (r.status === 200) return 'ok';
  }
  if (r.status === 410 || (r.status === 400 && r.grund === 'BadDeviceToken')) return 'weg';
  return 'fehler';
}

// geraete: [{ id, endpoint }] mit endpoint fcm:… oder apns:…   n: { titel, text, url }
export async function appSenden(geraete, n) {
  const k = fcmKonto(), a = apnsDaten();
  let erreicht = 0;
  const weg = [];
  await Promise.all(geraete.map(async (g) => {
    const e = String(g.endpoint || ''), i = e.indexOf(':'), art = e.slice(0, i), token = e.slice(i + 1);
    let s;
    try {
      if (art === 'fcm' && k) s = await fcmSenden(k, token, n);
      else if (art === 'apns' && a) s = await apnsSenden(a, token, n);
      else return;
    } catch (err) { s = 'fehler'; }
    if (s === 'ok') erreicht++;
    else if (s === 'weg') weg.push(g.id);
  }));
  return { erreicht, weg };
}
