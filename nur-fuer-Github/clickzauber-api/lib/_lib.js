// Gemeinsame Helfer für alle Endpunkte.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

// Beide Namensschemata akzeptieren — je nachdem, wie die Variablen bei Vercel heißen.
const SB_URL = process.env.SUPABASE_URL || process.env.SB_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SB_SERVICE_KEY;

export const db = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: false }
});

// Schlüssel für Gast-Links, Ausweich-Links, die Kalender-Anmeldung und die Verschlüsselung der Kalender-Zugänge (seit 15.10.2026 an einer Stelle).
// Nie ein fester Wert: Vorher galt ohne Variable 'cz' bzw. 'clickzauber', und jeder hätte Links nachbauen können. Fehlen beide Variablen,
// gilt ein Zufallswert je Server-Instanz. Dann gehen diese Links und Kalender-Verbindungen nicht, statt fälschbar zu sein.
// KALENDER_SCHLUESSEL steht zuerst, wie bisher. Bestehende Links und gespeicherte Kalender-Zugänge bleiben damit gültig.
export const GEHEIM = process.env.KALENDER_SCHLUESSEL || process.env.CRON_SECRET || (() => {
  console.error('KALENDER_SCHLUESSEL fehlt in Vercel: Gast-Links und Kalender-Verbindungen funktionieren nicht.');
  return randomBytes(32).toString('hex');
})();

/* Bremse gegen Massenanfragen (seit 15.10.2026, sql/71). Zählt in der Datenbank, weil Vercel viele Instanzen startet:
   Eine Zählung im Speicher (früher new Map()) sah nur die Aufrufe der eigenen Instanz.
   gebremst('lead:' + ipVon(req), 20, 60) → true, wenn dieser Schlüssel in den letzten 60 Minuten schon 20-mal kam.
   Sonst wird der Aufruf gezählt. Fehlt die Tabelle, bremst nichts (der Weg selbst geht weiter). */
export const ipVon = (req) => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '').split(',')[0].trim().slice(0, 64) || 'ohne';
export async function gebremst(schluessel, max, minuten) {
  const seit = new Date(Date.now() - minuten * 60e3).toISOString();
  const { count, error } = await db.from('bremse').select('id', { count: 'exact', head: true }).eq('schluessel', schluessel).gte('am', seit);
  if (error) { console.error('bremse', error.message); return false; }
  if ((count || 0) >= max) return true;
  await db.from('bremse').insert({ schluessel }).then(() => {}, () => {});
  return false;
}

// Einheitlicher Mail-Zugang für alle Endpunkte.
export const MAIL_KEY = process.env.RESEND_API_KEY || process.env.MAIL_KEY || '';
export const MAIL_FROM = process.env.MAIL_FROM || 'clickzauber <projekt@clickzauber.de>';
export const MAIL_TO = process.env.NOTIFY_TO || process.env.MAIL_TO || 'projekt@clickzauber.de';

// CORS: Widget läuft auf fremden Domains, darf uns aber ansprechen.
/* Blockieren (seit 15.10.2026, sql/72): Gespeichert wird nur ein Fingerabdruck, nie Nummer, Adresse oder Anschluss selbst.
   Telefon: nur die letzten 9 Ziffern, damit 0176…, +49176… und 0049176… gleich sind. */
export function blockHash(art, wert) {
  let v = String(wert || '').trim().toLowerCase();
  if (art === 'tel') v = v.replace(/\D/g, '').slice(-9);
  if (art === 'mail') v = v.replace(/\s+/g, '');
  if (art === 'geraet') v = v.replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (!v || (art === 'tel' && v.length < 6) || (art === 'mail' && !v.includes('@')) || v === 'ohne') return null;
  return createHash('sha256').update(GEHEIM + ':' + art + ':' + v).digest('hex').slice(0, 40);
}
export function cors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/* Token und Betreiber-Schlüssel aus Kopfzeilen (seit 15.10.2026). In der Adresse (?token=…, ?key=…) landeten sie in den
   Protokollen von Vercel. js/cz-kopf.js auf der Website schiebt sie in Kopfzeilen: Authorization: Bearer … und X-CZ-Key.
   Die Sammel-Funktionen (api/hub-*.js) rufen das vor jedem Handler auf und legen die Werte nach req.query, sodass jeder
   Handler unverändert weiterliest. Alte Aufrufe mit ?token= gehen weiter (Adresse hat Vorrang). */
export function kopfNachQuery(req) {
  if (!req || !req.headers) return;
  req.query = req.query || {};
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const key = String(req.headers['x-cz-key'] || '').trim();
  if (bearer && !req.query.token) req.query.token = bearer;
  if (key && !req.query.key) req.query.key = key;
}
// Vorabanfrage des Browsers (CORS): Kopfzeilen Authorization und X-CZ-Key erlauben, eine Stunde merken.
export function vorabAntwort(req, res) {
  res.setHeader('Access-Control-Allow-Origin', (req.headers && req.headers.origin) || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CZ-Key');
  res.setHeader('Access-Control-Max-Age', '3600');
  res.setHeader('Vary', 'Origin');
  return res.status(204).end();
}

// Body sicher als JSON lesen (Vercel liefert ihn mal als Objekt, mal als String).
export function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

// Rohen Request-Body als Buffer lesen (für Stripe-Webhook-Signatur).
export function rawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.from('')));
  });
}

// Angemeldeten User anhand des Session-Tokens holen (oder null).
// Zuerst in sessions — dort liegt pro Gerät eine Zeile, mehrere gleichzeitig.
// Danach der alte Weg über users.token, damit bestehende Anmeldungen und eine
// Datenbank ohne SQL 09 weiter funktionieren.
export async function userByToken(token) {
  if (!token) return null;
  const { data: s } = await db.from('sessions').select('user_id').eq('token', token).maybeSingle();
  if (s && s.user_id) {
    // Letzte Nutzung nachziehen, aber die Antwort nicht darauf warten lassen.
    db.from('sessions').update({ last_seen: new Date().toISOString() }).eq('token', token).then(() => {}, () => {});
    const { data: u } = await db.from('users').select('*').eq('id', s.user_id).maybeSingle();
    if (u) return u.komplett_gesperrt ? null : u;
  }
  const { data } = await db.from('users').select('*').eq('token', token).maybeSingle();
  return data && !data.komplett_gesperrt ? data : null;
}

/* ── Rollen ──────────────────────────────────────────────────────────────
   Drei Rollen je Betrieb:
     inhaber      — alles, auch Abo, Team und Konto löschen
     mitarbeiter  — Anfragen bearbeiten, Belegung, Vorlagen, Preise, Export
     empfang      — nur lesen; kein Export, keine Änderungen
   Wer in der team-Tabelle nicht steht, ist Inhaber: das ist der Betrieb selbst,
   der sich vor der Team-Funktion angemeldet hat. */
const RECHTE = {
  inhaber:     ['lesen', 'bearbeiten', 'export', 'einstellungen', 'abo', 'team'],
  mitarbeiter: ['lesen', 'bearbeiten', 'export'],
  empfang:     ['lesen']
};

export async function rolleVon(user) {
  if (!user || !user.tenant_id) return 'empfang';
  const { data } = await db.from('team')
    .select('id, rolle, aktiv_am').eq('tenant_id', user.tenant_id).eq('email', user.email).maybeSingle();
  if (!data) return 'inhaber';
  // Erste Anmeldung festhalten, ohne die Antwort darauf warten zu lassen.
  if (!data.aktiv_am) {
    db.from('team').update({ aktiv_am: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {});
  }
  return RECHTE[data.rolle] ? data.rolle : 'mitarbeiter';
}

export function darf(rolle, was) {
  return (RECHTE[rolle] || RECHTE.empfang).includes(was);
}

/* Laufende Angebotsnummer je Betrieb: 2026-001, 2026-002 …
   Liegt hier, weil sowohl /api/angebot als auch /api/anfrage sie brauchen. */
export async function naechsteNummer(tenantId) {
  const jahr = new Date().getFullYear();
  if (!tenantId) return `${jahr}-001`;
  const { data } = await db.from('angebot_zaehler').select('stand').eq('tenant_id', tenantId).maybeSingle();
  const stand = ((data && data.stand) || 0) + 1;
  await db.from('angebot_zaehler').upsert({ tenant_id: tenantId, stand }, { onConflict: 'tenant_id' });
  return `${jahr}-${String(stand).padStart(3, '0')}`;
}

/* Posten und Summe einer Anfrage — eine Quelle für PDF und Mail,
   damit im Angebot nie andere Zahlen stehen als in der Nachricht. */
export function angebotPosten(lead) {
  let posten = Array.isArray(lead.posten) && lead.posten.length ? lead.posten : null;
  if (!posten && lead.value_est) {
    posten = [{ text: 'Feier nach Ihren Angaben', betrag: Number(lead.value_est) }];
  }
  const summe = posten
    ? posten.reduce((s, p) => s + (Number(p.betrag) || 0), 0)
    : Number(lead.value_est || 0);
  return { posten: posten || [], summe };
}

export function euro(n) {
  return Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
