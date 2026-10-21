// Sammel-Funktion: leitet nach dem Wert von _h an den passenden Handler weiter.
// Grund: Vercel Hobby erlaubt höchstens 12 Funktionen — dieses Projekt hat mehr Routen,
// also teilen sich mehrere Endpunkte eine Funktion. vercel.json schreibt die Pfade dorthin um.
import h_dashboard from '../lib/dashboard.js';
import h_export from '../lib/export.js';
import h_pipeline from '../lib/pipeline.js';
import h_vergleich from '../lib/vergleich.js';
import h_team from '../lib/team.js';
import h_profile from '../lib/profile.js';
import h_admin from '../lib/admin.js';
import h_netz from '../lib/netz.js';
import h_moderation from '../lib/moderation.js';

import { wartungSperrt, wartungAntwort } from '../lib/_wartung.js';

import { kopfNachQuery, vorabAntwort } from '../lib/_lib.js';
const ROUTEN = {
  'dashboard': h_dashboard,
  'export': h_export,
  'pipeline': h_pipeline,
  'vergleich': h_vergleich,
  'team': h_team,
  'profile': h_profile,
  'admin': h_admin,
  'netz': h_netz,
  'moderation': h_moderation,
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
