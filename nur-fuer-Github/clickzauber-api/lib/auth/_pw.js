// Passwörter: Hashen und Prüfen mit scrypt (Node-eigen, keine Zusatz-Bibliothek).
// Format:  scrypt$<salt-hex>$<hash-hex>
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'crypto';

export const SITE = (process.env.SITE_URL || 'https://clickzauber.de').replace(/\/$/, '');
// Eigene Adresse der API. Der Bestätigungslink führt seit 04.10.2026 auf die Website (SITE), wie der Passwort-Link.
export const API_BASE = (process.env.API_URL || 'https://clickzauber-api.vercel.app').replace(/\/$/, '');

export function hashPasswort(pw) {
  const salt = randomBytes(16);
  const key = scryptSync(String(pw), salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + key.toString('hex');
}

export function passwortStimmt(pw, gespeichert) {
  if (!pw || !gespeichert) return false;
  const teile = String(gespeichert).split('$');
  if (teile.length !== 3 || teile[0] !== 'scrypt') return false;
  try {
    const salt = Buffer.from(teile[1], 'hex');
    const soll = Buffer.from(teile[2], 'hex');
    const ist = scryptSync(String(pw), salt, soll.length);
    return timingSafeEqual(soll, ist);
  } catch { return false; }
}

// Mindestanspruch: 8 Zeichen. Kurze Passwörter sind der häufigste Einbruchsweg.
export function passwortSchwach(pw) {
  const s = String(pw || '');
  if (s.length < 8) return 'Das Passwort braucht mindestens 8 Zeichen.';
  if (/^[0-9]+$/.test(s)) return 'Nur Zahlen ist zu wenig — nehmen Sie auch Buchstaben dazu.';
  return null;
}

export function neuerToken() {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

// Lesbare Gerätebezeichnung für die Geräteliste im Cockpit.
export function geraetName(ua) {
  const s = String(ua || '');
  const os = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android'
    : /Mac OS X/.test(s) ? 'Mac' : /Windows/.test(s) ? 'Windows' : 'Gerät';
  const br = /Edg\//.test(s) ? 'Edge' : /Chrome\//.test(s) ? 'Chrome'
    : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Browser';
  return os + ' · ' + br;
}
