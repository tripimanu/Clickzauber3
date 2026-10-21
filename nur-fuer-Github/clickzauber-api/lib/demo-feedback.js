// POST /api/demo-feedback — Feedback aus der Demo (clickzauber.de/demo, js/cz-demo.js).
// { branche, formular, wunsch, schmerz, einrichtung, name, email, telefon, website, quelle, sprache, hp, dauer }
// Speichert in demo_feedback (sql/54) und schickt dem Betreiber eine Mail. Kontaktdaten nur, wenn
// der Interessent die Einrichtung wünscht. Gelöscht wird nach 12 Monaten (api/nacht.js).
import { db, cors, body, MAIL_KEY, MAIL_FROM, MAIL_TO, gebremst, ipVon } from './_lib.js';
const kurz = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Methode nicht erlaubt' });
  const p = body(req) || {};

  // Falle für Programme: Das versteckte Feld füllt kein Mensch aus, und niemand schickt in unter 2,5 Sekunden ab.
  if (p.hp || (Number(p.dauer) > 0 && Number(p.dauer) < 2500)) return res.status(200).json({ ok: true });

  // Bremse in der Datenbank (seit 15.10.2026, sql/71): 5 je Stunde und Anschluss.
  if (await gebremst('feedback:' + ipVon(req), 5, 60)) {
    return res.status(429).json({ ok: false, error: 'zu-viele', hinweis: 'Sie haben schon mehrmals Feedback geschickt. Bitte versuchen Sie es später noch einmal.' });
  }

  const einrichtung = p.einrichtung === true || p.einrichtung === 'true' || p.einrichtung === 1;
  const d = {
    branche: kurz(p.branche, 60) || null,
    formular: kurz(p.formular, 60) || null,
    wunsch: kurz(p.wunsch, 2000) || null,
    schmerz: kurz(p.schmerz, 2000) || null,
    einrichtung,
    name: einrichtung ? kurz(p.name, 80) || null : null,
    email: einrichtung ? kurz(p.email, 120).toLowerCase() || null : null,
    telefon: einrichtung ? kurz(p.telefon, 40) || null : null,
    website: einrichtung ? kurz(p.website, 200) || null : null,
    quelle: kurz(p.quelle, 120) || null,
    sprache: kurz(p.sprache, 8) || null
  };
  if (!d.wunsch && !d.schmerz && !d.einrichtung) return res.status(400).json({ ok: false, error: 'leer', hinweis: 'Bitte beantworten Sie mindestens eine Frage.' });
  if (d.einrichtung && !d.email && !d.telefon) {
    return res.status(400).json({ ok: false, error: 'kontakt-fehlt', hinweis: 'Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an, damit wir Sie erreichen.' });
  }
  if (d.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(d.email)) return res.status(400).json({ ok: false, error: 'email', hinweis: 'Die E-Mail-Adresse sieht nicht vollständig aus.' });

  const { error } = await db.from('demo_feedback').insert(d);

  // Mail an den Betreiber. Klappt das Speichern nicht (z. B. sql/54 noch nicht ausgeführt), ist sie die einzige Kopie.
  let mailOk = false;
  if (MAIL_KEY) {
    const z = [
      'Neues Feedback aus der Demo.', '',
      'Kategorie: ' + (d.branche || '–'),
      'Formular im Cockpit: ' + (d.formular || '–'),
      'Gekommen über: ' + (d.quelle || '–'), '',
      'Was fehlt im Cockpit:', d.wunsch || '–', '',
      'Was bei bisherigen Programmen nicht gut funktioniert hat:', d.schmerz || '–', '',
      'Einrichtung gewünscht: ' + (d.einrichtung ? 'Ja' : 'Nein')
    ];
    if (d.einrichtung) z.push('Name: ' + (d.name || '–'), 'E-Mail: ' + (d.email || '–'), 'Telefon / WhatsApp: ' + (d.telefon || '–'), 'Website: ' + (d.website || '–'));
    if (error) z.push('', 'Achtung: In der Datenbank konnte das Feedback nicht gespeichert werden (' + error.message + '). Diese Mail ist die einzige Kopie.');
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MAIL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: MAIL_TO,
          reply_to: d.email || undefined,
          subject: (d.einrichtung ? 'Demo: möchte Einrichtung' : 'Demo-Feedback') + ' · ' + (d.branche || 'alle Beispiele'),
          text: z.join('\n')
        })
      });
      mailOk = r.ok;
    } catch (x) { /* die Mail darf das Speichern nicht verhindern */ }
  }
  if (error && !mailOk) return res.status(500).json({ ok: false, error: 'speichern', hinweis: error.message });
  return res.status(200).json({ ok: true });
}
