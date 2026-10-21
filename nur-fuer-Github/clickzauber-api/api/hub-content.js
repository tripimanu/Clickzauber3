// Sammel-Funktion: leitet nach dem Wert von _h an den passenden Handler weiter.
// Grund: Vercel Hobby erlaubt höchstens 12 Funktionen — dieses Projekt hat mehr Routen,
// also teilen sich mehrere Endpunkte eine Funktion. vercel.json schreibt die Pfade dorthin um.
import h_leistungen from '../lib/leistungen.js';
import h_vorlagen from '../lib/vorlagen.js';
import h_config from '../lib/config.js';
import h_event from '../lib/event.js';
import h_lead from '../lib/lead.js';
import h_wlead from '../lib/wlead.js';
import h_demo_mail from '../lib/demo-mail.js';
import h_ds_betrieb from '../lib/ds-betrieb.js';
import h_auftrag from '../lib/auftrag.js';
import h_demo_feedback from '../lib/demo-feedback.js';
import h_demo_zugang from '../lib/demo-zugang.js';
import h_vertrieb_termin from '../lib/vertrieb-termin.js';
import h_einladung from '../lib/einladung.js';

import { wartungSperrt, wartungAntwort } from '../lib/_wartung.js';

import { kopfNachQuery, vorabAntwort } from '../lib/_lib.js';
const ROUTEN = {
  'leistungen': h_leistungen,
  'vorlagen': h_vorlagen,
  'config': h_config,
  'event': h_event,
  'lead': h_lead,
  'wlead': h_wlead,
  'demo-mail': h_demo_mail,
  'ds-betrieb': h_ds_betrieb,
  'auftrag': h_auftrag,
  'demo-feedback': h_demo_feedback,
  'demo-zugang': h_demo_zugang,
  'vertrieb-termin': h_vertrieb_termin,
  'einladung': h_einladung,
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
