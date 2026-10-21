// Sammel-Funktion: leitet nach dem Wert von _h an den passenden Handler weiter.
// Grund: Vercel Hobby erlaubt höchstens 12 Funktionen — dieses Projekt hat mehr Routen,
// also teilen sich mehrere Endpunkte eine Funktion. vercel.json schreibt die Pfade dorthin um.
import h_abo from '../lib/abo.js';
import h_checkout from '../lib/checkout.js';
import h_save from '../lib/save.js';
import h_abmelden from '../lib/abmelden.js';
import h_konto_loeschen from '../lib/konto-loeschen.js';
import h_widget_loeschen from '../lib/widget-loeschen.js';
import h_sonderpreis from '../lib/sonderpreis.js';
import h_konto_admin from '../lib/konto-admin.js';
import h_pilot from '../lib/pilot.js';

import { kopfNachQuery, vorabAntwort } from '../lib/_lib.js';
const ROUTEN = {
  'abo': h_abo,
  'checkout': h_checkout,
  'save': h_save,
  'abmelden': h_abmelden,
  'konto-loeschen': h_konto_loeschen,
  'widget-loeschen': h_widget_loeschen,
  'sonderpreis': h_sonderpreis,
  'konto-admin': h_konto_admin,
  'pilot': h_pilot,
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
  return fn(req, res);
}
