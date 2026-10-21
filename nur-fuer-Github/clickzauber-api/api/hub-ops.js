// Sammel-Funktion: leitet nach dem Wert von _h an den passenden Handler weiter.
// Grund: Vercel Hobby erlaubt höchstens 12 Funktionen — dieses Projekt hat mehr Routen,
// also teilen sich mehrere Endpunkte eine Funktion. vercel.json schreibt die Pfade dorthin um.
import h_loeschfrist from '../lib/loeschfrist.js';
import h_bewertung from '../lib/bewertung.js';
import h_monatsbericht from '../lib/monatsbericht.js';
import h_nachfassen from '../lib/nachfassen.js';
import h_kalender from '../lib/kalender.js';
import h_ics from '../lib/ics.js';
import h_kalender_sync from '../lib/kalender-sync.js';
import h_einstellungen from '../lib/einstellungen.js';
import h_push from '../lib/push.js';
import h_kalender_direkt from '../lib/kalender-direkt.js';
import h_status from '../lib/status.js';
import h_architekt from '../lib/architekt.js';

import { wartungSperrt, wartungAntwort } from '../lib/_wartung.js';

import { kopfNachQuery, vorabAntwort } from '../lib/_lib.js';
const ROUTEN = {
  'loeschfrist': h_loeschfrist,
  'bewertung': h_bewertung,
  'monatsbericht': h_monatsbericht,
  'nachfassen': h_nachfassen,
  'kalender': h_kalender,
  'ics': h_ics,
  'kalender-sync': h_kalender_sync,
  'einstellungen': h_einstellungen,
  'push': h_push,
  'kalender-direkt': h_kalender_direkt,
  'status': h_status,
  'architekt': h_architekt,
};

export default async function handler(req, res) {
  // Seit 15.10.2026: Vorabanfrage für Kopfzeilen beantworten, Token und Schlüssel aus Kopfzeilen übernehmen (lib/_lib.js).
  if (req.method === 'OPTIONS') return vorabAntwort(req, res);
  kopfNachQuery(req);
  const name = req.query && req.query._h;
  const fn = ROUTEN[name];
  if (!fn) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(404).json({ error: 'unbekannte Route' });
  }
  if (await wartungSperrt(req, name)) return wartungAntwort(req, res);
  return fn(req, res);
}
