// POST /api/architekt { text, formular } oder { bild } (Foto der Preisliste, seit 21.10.2026)  (Anmeldung des Betriebs in der Kopfzeile, js/cz-kopf.js; alt: ?token=)
// Seit 20.10.2026. „Lieber in eigenen Worten?“ im Konfigurator (js/cz-konfigurator.js): Die KI liest einen Satz des Betriebs
// und füllt nur die drei Felder des Architekten (Was, Wo, Details). Sie ändert nichts; der Betrieb prüft, holt den Vorschlag
// und übernimmt selbst. Antwort: { ok, auftrag: { was, seite, frage, f } } oder { ok:false, hinweis }.
// Aus, solange der Schalter auf der Plattform aus ist (plattform_status.architekt_ki, sql/73) oder ANTHROPIC_API_KEY fehlt.
// An die KI geht nur der Satz (E-Mail-Adressen und lange Zahlen vorher entfernt) und der Aufbau des Formulars:
// Seiten, Fragen, Antworten, Kacheln, Leistungen. Nie Anfragen, Kunden oder Kontaktdaten. Der Satz wird nicht gespeichert.
// Bremse (lib/_lib.js gebremst): 40 Aufträge je Konto am Tag, 60 je Anschluss in der Stunde.
// Modell: Vercel ARCHITEKT_MODELL, sonst claude-haiku-4-5 (schnell und günstig, reicht für diese Aufgabe).
import { db, cors, body, userByToken, gebremst, ipVon } from './_lib.js';

const MODELL = process.env.ARCHITEKT_MODELL || 'claude-haiku-4-5';
// Foto der Preisliste (seit 21.10.2026): eigenes Modell möglich (ARCHITEKT_MODELL_BILD), Bremse 15 Fotos je Konto am Tag.
const MODELL_BILD = process.env.ARCHITEKT_MODELL_BILD || MODELL;
const AUS = 'Der KI-Helfer ist gerade ausgeschaltet. Die drei Felder gehen wie immer.';

export async function architektAn() {
  if (!process.env.ANTHROPIC_API_KEY) return false;
  try {
    const { data } = await db.from('plattform_status').select('architekt_ki').eq('id', 1).maybeSingle();
    return !!(data && data.architekt_ki);
  } catch (e) { return false; }
}

const SYSTEM = `Du hilfst im clickzauber-Konfigurator. Ein Betrieb (Friseur, Kosmetik, Food Truck, Location …) beschreibt in einem Satz, was sich an seinem Anfrage- oder Buchungsformular ändern soll. Du füllst daraus die drei Felder des Architekten aus. Du erfindest nichts: Fragen, Antworten, Kacheln und Leistungen nimmst du genau so, wie sie im FORMULAR stehen. Gesperrte Seiten (gesperrt: true) wählst du nie als Ziel.

Antworte NUR mit einem JSON-Objekt, ohne Text davor oder danach:
{"was": "...", "seite": 1, "frage": "...", "f": { ... }}

"was" ist genau eines von:
- "frage": neue Frage. seite = Nummer der Seite. f = {"titel": "Fragetext", "art": "auswahl"|"mehrfach"|"text"|"datum", "antworten": ["…","…"], "pflicht": "ja"|"nein"}
- "antwort": neue Antwort bei einer Frage. seite, frage = key der Frage. f = {"text": "…", "preis": "Zahl oder leer", "info": "Hinweis oder leer"}
- "regel": Wenn-Dann-Regel an einer Frage mit Antworten (typ auswahl) oder an der Termin-Frage (typ termin: Antworten sind Namen von Leistungen oder "kat:" + Name einer Kachel, kein "preis"). seite, frage = key. f = {"antworten": [genaue Antworten aus dem Formular], "dann": "zeigen"|"ueberspringen"|"preis"|"hinweis", "dannWert": …}. dannWert: bei zeigen/ueberspringen "p:N" (Seite N, nach dieser Frage) oder "q:KEY" (eine spätere Frage); bei preis eine Zahl; bei hinweis der Text.
- "leistung": neue Leistung. frage = Name einer vorhandenen Kachel. Nennt der Betrieb keine, nimm die passendste vorhandene (gibt es nur eine, diese). "+neu" nur, wenn er ausdrücklich eine neue Kachel will; dann ist f.kat = Name der neuen Kachel Pflicht. f = {"name": "…", "dauer": Minuten, "preis": Zahl, "ab": "ja"|"nein", "info": "…"}
- "aendern": Preis oder Dauer einer Leistung. f = {"lid": nr der Leistung, "dauer": Minuten oder "", "preis": Zahl oder ""}
- "text": Text ändern. seite = Nummer oder "ende" (letzte Seite), frage = "titel" (Überschrift der Seite) oder key der Frage. f = {"neu": "neuer Text"}
- "loeschen": etwas löschen. seite, frage = key. f = {"ziel": "ganz" oder Nummer der Antwort ab 0 als Text}

Lass Felder weg, die im Satz nicht vorkommen. Ist der Satz unklar, passt er zu keiner dieser Möglichkeiten oder würde er etwas Gesperrtes ändern, antworte {"was": null, "rueckfrage": "kurzer Satz auf Deutsch, Sie-Form, was fehlt"}.`;

function saeubern(t) {
  return String(t || '').slice(0, 800)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[E-Mail entfernt]')
    .replace(/\+?\d[\d\s\/-]{7,}\d/g, '[Nummer entfernt]');
}
function kurz(formular) {
  let s = '';
  try { s = JSON.stringify(formular || {}); } catch (e) { s = '{}'; }
  return s.length > 24000 ? s.slice(0, 24000) : s;
}

const SYSTEM_FOTO = `Du liest das Foto einer Preisliste eines Betriebs (Friseur, Barbier, Kosmetik, Nagelstudio, Massage …) und schreibst jede Leistung genau so ab, wie sie dasteht. Du erfindest nichts.
Antworte NUR mit JSON, ohne Text davor oder danach:
{"leistungen":[{"kat":"Überschrift oder Gruppe auf der Liste","name":"Name der Leistung","dauer":Minuten oder null,"preis":Zahl in Euro oder null,"ab":true wenn „ab“ vor dem Preis steht}]}
Preise als Zahl ohne Euro-Zeichen (25,50 wird 25.5). Steht keine Dauer da, schätze eine übliche Dauer in Minuten, auf 5 gerundet. Gibt es keine Gruppen, nimm "Leistungen". Höchstens 40 Leistungen.
Keine Namen von Personen, keine Telefonnummern, keine Adressen. Ist kein Preis zu lesen: "preis": null. Ist das Foto keine Preisliste: {"leistungen":[]}.`;

// Foto: nur das Bild geht an die KI, kein Formular, nichts wird gespeichert. Antwort { ok, leistungen: [{ kat, name, dauer, preis, ab }] }.
async function foto(res, user, p) {
  const m = String(p.bild || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 3500000) return res.status(400).json({ ok: false, hinweis: 'Das Foto ist zu groß oder kein Bild.' });
  if (await gebremst('architekt-foto:' + user.id, 15, 1440)) return res.status(429).json({ ok: false, hinweis: 'Für heute sind genug Fotos an die KI gegangen.' });
  const ab = new AbortController(), uhr = setTimeout(() => ab.abort(), 25000);
  let j = null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ab.signal,
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELL_BILD, max_tokens: 3000, temperature: 0, system: SYSTEM_FOTO,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/' + m[1], data: m[2] } }, { type: 'text', text: 'Lies die Leistungen von dieser Preisliste ab.' }] }] })
    });
    j = await r.json().catch(() => null);
    if (!r.ok) { console.error('architekt foto: KI antwortet', r.status, j && j.error && j.error.type); j = null; }
  } catch (e) { console.error('architekt foto:', e.name === 'AbortError' ? 'Zeit abgelaufen' : e.message); }
  finally { clearTimeout(uhr); }
  if (!j) return res.status(200).json({ ok: false, hinweis: 'Die KI hat gerade nicht geantwortet. Bitte noch einmal versuchen.' });
  const roh = String((j.content || []).map((c) => c && c.type === 'text' ? c.text : '').join('')), a = roh.indexOf('{'), b = roh.lastIndexOf('}');
  let o = null;
  try { o = a >= 0 && b > a ? JSON.parse(roh.slice(a, b + 1)) : null; } catch (e) { o = null; }
  const L = (o && Array.isArray(o.leistungen) ? o.leistungen : []).slice(0, 40).map((x) => ({
    kat: String((x && x.kat) || 'Leistungen').slice(0, 60), name: String((x && x.name) || '').trim().slice(0, 80),
    dauer: Math.max(5, Math.min(480, Math.round((+(x && x.dauer) || 30) / 5) * 5)),
    preis: x && x.preis != null && x.preis !== '' && !isNaN(+x.preis) ? Math.max(0, Math.round(+x.preis * 100) / 100) : null, ab: !!(x && x.ab)
  })).filter((x) => x.name);
  if (!L.length) return res.status(200).json({ ok: false, hinweis: 'Auf dem Foto habe ich keine Leistungen gefunden. Bitte gerade und hell fotografieren.' });
  return res.status(200).json({ ok: true, leistungen: L });
}

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, an: await architektAn() });
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const user = await userByToken((req.query && req.query.token) || '');
  if (!user) return res.status(403).json({ ok: false, error: 'kein zugriff', hinweis: 'Bitte neu anmelden. Die drei Felder gehen auch so.' });
  if (!(await architektAn())) return res.status(200).json({ ok: false, aus: true, hinweis: AUS });
  const pb = body(req);
  if (pb && pb.bild) return foto(res, user, pb);
  if (await gebremst('architekt:' + user.id, 40, 1440) || await gebremst('architekt-ip:' + ipVon(req), 60, 60)) {
    return res.status(429).json({ ok: false, hinweis: 'Für heute sind genug Aufträge an die KI gegangen. Die drei Felder gehen weiter.' });
  }
  const p = body(req), text = saeubern(p.text);
  if (text.trim().length < 6) return res.status(400).json({ ok: false, hinweis: 'Bitte beschreiben Sie kurz, was passieren soll.' });

  const ab = new AbortController(), uhr = setTimeout(() => ab.abort(), 9000);
  let j = null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ab.signal,
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELL, max_tokens: 700, temperature: 0, system: SYSTEM,
        messages: [{ role: 'user', content: 'FORMULAR:\n' + kurz(p.formular) + '\n\nWUNSCH DES BETRIEBS:\n' + text }] })
    });
    j = await r.json().catch(() => null);
    if (!r.ok) { console.error('architekt: KI antwortet', r.status, j && j.error && j.error.type); j = null; }
  } catch (e) { console.error('architekt:', e.name === 'AbortError' ? 'Zeit abgelaufen' : e.message); }
  finally { clearTimeout(uhr); }
  if (!j) return res.status(200).json({ ok: false, hinweis: 'Die KI hat gerade nicht geantwortet. Die drei Felder gehen auch so.' });

  const roh = String((j.content || []).map((c) => c && c.type === 'text' ? c.text : '').join('')), a = roh.indexOf('{'), b = roh.lastIndexOf('}');
  let auftrag = null;
  try { auftrag = a >= 0 && b > a ? JSON.parse(roh.slice(a, b + 1)) : null; } catch (e) { auftrag = null; }
  if (!auftrag || typeof auftrag !== 'object') return res.status(200).json({ ok: false, hinweis: 'Das habe ich nicht verstanden. Bitte die drei Felder nutzen.' });
  if (!auftrag.was) return res.status(200).json({ ok: false, hinweis: String(auftrag.rueckfrage || 'Das habe ich nicht verstanden. Bitte etwas genauer beschreiben.').slice(0, 200) });
  return res.status(200).json({ ok: true, auftrag: { was: String(auftrag.was), seite: auftrag.seite, frage: auftrag.frage == null ? null : String(auftrag.frage), f: auftrag.f && typeof auftrag.f === 'object' ? auftrag.f : {} } });
}
