// Gemeinsamer Versand für Push-Nachrichten.
//
// Wird von /api/push (Probenachricht) und lib/lead.js (neue Anfrage) benutzt.
// Der Versand darf niemals den Aufrufer stolpern lassen: eine Anfrage muss
// gespeichert werden, auch wenn keine Nachricht rausgeht. Deshalb fängt hier
// alles jeden Fehler ab und gibt nur zurück, wie viele Geräte erreicht wurden.
import { db, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { appBereit, appSenden } from './_app-push.js';

// Browser-Push braucht das VAPID-Paar, die App (iPhone, Android) eigene Schlüssel (lib/_app-push.js).
function webBereit() {
  return !!(process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE);
}
export function pushBereit() {
  return webBereit() || appBereit();
}

export async function pushSenden(tenantId, nachricht) {
  if (!tenantId || !pushBereit()) return 0;

  const { data: geraete } = await db.from('push_geraete')
    .select('id, endpoint, p256dh, auth')
    .eq('tenant_id', tenantId);
  if (!geraete || !geraete.length) return 0;

  const n = {
    titel: nachricht.titel || 'clickzauber',
    text: nachricht.text || '',
    url: nachricht.url || 'clickzauber-cockpit-live.html',
    // Zahl auf dem App-Symbol (Home-Bildschirm, sw.js). Nur Browser-Push; die App aus dem Store bekommt sie nicht, sonst bliebe die Zahl dort stehen.
    ...(Number.isFinite(+nachricht.anzahl) && nachricht.anzahl != null ? { anzahl: Math.max(0, Math.min(999, +nachricht.anzahl)) } : {})
  };
  const istApp = (g) => /^(fcm|apns):/.test(g.endpoint || '');
  const web = geraete.filter((g) => !istApp(g)), app = geraete.filter(istApp);

  let erreicht = 0;
  const weg = [];

  if (web.length && webBereit()) {
    let webpush = null;
    try {
      webpush = (await import('web-push')).default;
      webpush.setVapidDetails(process.env.VAPID_MAILTO || 'mailto:projekt@clickzauber.de', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
    } catch (e) { webpush = null; }   // Paket fehlt oder Schlüssel kaputt: dann eben keine Browser-Nachricht
    if (webpush) {
      const inhalt = JSON.stringify(n);
      await Promise.all(web.map(async (g) => {
        try {
          await webpush.sendNotification({ endpoint: g.endpoint, keys: { p256dh: g.p256dh, auth: g.auth } }, inhalt, { TTL: 3600, urgency: 'high' });
          erreicht++;
        } catch (err) {
          // 404 und 410 heißen: das Gerät gibt es nicht mehr (App gelöscht, Berechtigung entzogen).
          // Dann den Eintrag entfernen, sonst versucht der Server es bei jeder Anfrage erneut.
          const code = err && err.statusCode;
          if (code === 404 || code === 410) weg.push(g.id);
        }
      }));
    }
  }

  if (app.length) {
    const r = await appSenden(app, n).catch(() => ({ erreicht: 0, weg: [] }));
    erreicht += r.erreicht;
    weg.push(...r.weg);
  }

  if (weg.length) {
    try { await db.from('push_geraete').delete().in('id', weg); } catch (e) {}
  }
  return erreicht;
}

// Nachricht an den Betrieb: Push an alle Geräte. Erreicht die Push-Nachricht kein Gerät
// (Push aus oder nie eingeschaltet), geht dieselbe Nachricht als Mail. So bleibt keine Antwort eines Kunden liegen.
function escM(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
export async function betriebMelden(tenantId, nachricht) {
  const n = await pushSenden(tenantId, nachricht).catch(() => 0);
  if (n || !tenantId || !MAIL_KEY) return { push: n, mail: false };
  try {
    const [{ data: e }, { data: t }] = await Promise.all([
      db.from('einstellungen').select('mail_haupt, mail_zweit').eq('tenant_id', tenantId).maybeSingle().then((r) => r, () => ({ data: null })),
      db.from('tenants').select('email, name').eq('id', tenantId).maybeSingle().then((r) => r, () => ({ data: null }))
    ]);
    const an = [...new Set([(e && e.mail_haupt) || (t && t.email), e && e.mail_zweit].filter(Boolean))];
    if (!an.length) return { push: 0, mail: false };
    const site = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';
    const ziel = site.replace(/\/$/, '') + '/' + String(nachricht.url || 'clickzauber-cockpit-live.html').replace(/^\//, '');
    const html = '<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">'
      + '<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:24px 26px">'
      + '<div style="font-size:20px;font-weight:600;color:#211d16">' + escM(nachricht.titel || 'clickzauber') + '</div>'
      + '<p style="color:#5f584a;font-size:15px;line-height:1.6;margin:10px 0 18px">' + escM(nachricht.text || '') + '</p>'
      + '<p style="color:#8a8272;font-size:12.5px;line-height:1.5;margin:18px 0 0">Sie bekommen diese Mail, weil auf Ihrem Handy keine Push-Nachrichten eingeschaltet sind. Einschalten: Cockpit, Einstellungen, Push-Nachrichten.</p>'
      + '</td></tr></table></td></tr></table></body></html>';
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: an, subject: (nachricht.titel || 'clickzauber') + (nachricht.text ? ': ' + String(nachricht.text).slice(0, 80) : ''), html }) });
    return { push: 0, mail: r.ok };
  } catch (err) { return { push: 0, mail: false }; }
}
