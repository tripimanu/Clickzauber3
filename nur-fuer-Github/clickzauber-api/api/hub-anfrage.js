// Sammel-Funktion: leitet nach dem Wert von _h an den passenden Handler weiter.
// Grund: Vercel Hobby erlaubt höchstens 12 Funktionen — dieses Projekt hat mehr Routen,
// also teilen sich mehrere Endpunkte eine Funktion. vercel.json schreibt die Pfade dorthin um.
import h_anfrage from '../lib/anfrage.js';
import h_angebot from '../lib/angebot.js';
import h_belegung from '../lib/belegung.js';
import h_buchung from '../lib/buchung.js';
import h_kontakte from '../lib/kontakte.js';
import h_einbau_pruefen from '../lib/einbau-pruefen.js';
import h_interesse from '../lib/interesse.js';
import h_termine from '../lib/termine.js';
import h_warteliste from '../lib/warteliste.js';

import { wartungSperrt, wartungAntwort } from '../lib/_wartung.js';

import { kopfNachQuery, vorabAntwort } from '../lib/_lib.js';
const ROUTEN = {
  'anfrage': h_anfrage,
  'angebot': h_angebot,
  'belegung': h_belegung,
  'buchung': h_buchung,
  'kontakte': h_kontakte,
  'einbau-pruefen': h_einbau_pruefen,
  'interesse': h_interesse,
  'termine': h_termine,
  'warteliste': h_warteliste,
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
