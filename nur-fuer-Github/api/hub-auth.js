// Sammel-Funktion: leitet nach dem Wert von _h an den passenden Handler weiter.
// Grund: Vercel Hobby erlaubt höchstens 12 Funktionen — dieses Projekt hat mehr Routen,
// also teilen sich mehrere Endpunkte eine Funktion. vercel.json schreibt die Pfade dorthin um.
import h_anmelden from '../lib/auth/anmelden.js';
import h_bestaetigen from '../lib/auth/bestaetigen.js';
import h_bestaetigung_neu from '../lib/auth/bestaetigung-neu.js';
import h_passwort_setzen from '../lib/auth/passwort-setzen.js';
import h_passwort_vergessen from '../lib/auth/passwort-vergessen.js';
import h_pruefen from '../lib/auth/pruefen.js';
import h_registrieren from '../lib/auth/registrieren.js';
// Seit 15.10.2026 ohne Anmeldung per 6-stelligem Code (request-code, verify-code): keine Seite nutzte sie mehr,
// und der Code ließ sich beliebig oft raten. Damit kam man ohne Passwort in jedes Konto. Alte Dateien im Archiv.

import { kopfNachQuery, vorabAntwort } from '../lib/_lib.js';
const ROUTEN = {
  'anmelden': h_anmelden,
  'bestaetigen': h_bestaetigen,
  'bestaetigung-neu': h_bestaetigung_neu,
  'passwort-setzen': h_passwort_setzen,
  'passwort-vergessen': h_passwort_vergessen,
  'pruefen': h_pruefen,
  'registrieren': h_registrieren,
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
