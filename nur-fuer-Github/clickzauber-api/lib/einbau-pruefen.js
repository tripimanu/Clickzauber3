// POST /api/einbau-pruefen { token, widget, url }
// Holt die Seite des Kunden und sieht nach, ob das Formular darin eingebaut ist.
// Beantwortet die Frage, die sich nach dem Einbau jeder stellt: „Hab ich das richtig gemacht?"
import { cors, body, userByToken, db } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  const user = await userByToken(p.token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  const slug = String(p.widget || '').trim();
  if (!/^[a-z0-9-]{2,64}$/i.test(slug)) {
    return res.status(400).json({ ok: false, error: 'Kennung fehlt.' });
  }
  // Nur eigene Formulare prüfen lassen.
  const { data: w } = await db.from('widgets').select('tenant_id').eq('slug', slug).maybeSingle();
  if (!w || (w.tenant_id && w.tenant_id !== user.tenant_id)) {
    return res.status(403).json({ ok: false, error: 'Dieses Formular gehört nicht zu Ihrem Konto.' });
  }

  const ziel = adresse(p.url);
  if (!ziel) {
    return res.status(400).json({
      ok: false,
      error: 'Das sieht nicht wie eine Internetadresse aus. Beispiel: www.ihre-location.de'
    });
  }

  let html = '';
  let status = 0;
  try {
    const steuer = new AbortController();
    const stop = setTimeout(() => steuer.abort(), 9000);
    const r = await fetch(ziel, {
      redirect: 'follow',
      signal: steuer.signal,
      headers: { 'User-Agent': 'clickzauber-Einbaupruefung/1.0 (+https://clickzauber.de)' }
    });
    clearTimeout(stop);
    status = r.status;
    if (r.ok) html = (await r.text()).slice(0, 900000);
  } catch (e) {
    return res.status(200).json({
      ok: true, erreichbar: false, gefunden: false,
      titel: 'Seite nicht erreichbar',
      text: 'Wir konnten ' + ziel + ' nicht laden. Prüfen Sie die Adresse — und ob die Seite schon veröffentlicht ist.'
    });
  }

  if (!html) {
    return res.status(200).json({
      ok: true, erreichbar: false, gefunden: false,
      titel: 'Seite antwortet mit einem Fehler',
      text: 'Der Server hat mit Code ' + status + ' geantwortet. Ist die Adresse richtig geschrieben?'
    });
  }

  const nadel = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const perScript = new RegExp('data-cz\\s*=\\s*["\']' + nadel + '["\']', 'i').test(html);
  const perRahmen = new RegExp('share\\.html\\?w=' + nadel + '\\b', 'i').test(html);
  const nurLader = /\/w\.js\b/i.test(html);
  const fremd = /data-cz\s*=\s*["']([a-z0-9-]+)["']/i.exec(html);

  if (perScript || perRahmen) {
    return res.status(200).json({
      ok: true, erreichbar: true, gefunden: true,
      art: perScript ? 'script' : 'rahmen',
      titel: 'Gefunden — alles richtig',
      text: perScript
        ? 'Das Formular ist per Script eingebaut und lädt auf dieser Seite.'
        : 'Das Formular ist als Fenster eingebettet und lädt auf dieser Seite.'
    });
  }

  if (nurLader && fremd && fremd[1] !== slug) {
    return res.status(200).json({
      ok: true, erreichbar: true, gefunden: false,
      titel: 'Andere Kennung eingebaut',
      text: 'Auf der Seite steht ein clickzauber-Formular mit der Kennung „' + fremd[1] +
            '" statt „' + slug + '". Ersetzen Sie die Kennung im eingebauten Code.'
    });
  }

  return res.status(200).json({
    ok: true, erreichbar: true, gefunden: false,
    titel: 'Noch nichts gefunden',
    text: 'Die Seite lädt, aber das Formular steht nicht darin. Häufigste Gründe: die Änderung ist noch nicht veröffentlicht, ' +
          'sie steht auf einer anderen Unterseite, oder Ihr Baukasten hat den Code beim Speichern entfernt — dann nehmen Sie den Weg über „HTML einbetten".'
  });
}

/* Nur öffentliche http(s)-Adressen. Interne Netze bleiben tabu. */
function adresse(roh) {
  let s = String(roh || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h.endsWith('.local')) return null;
  if (h === 'localhost' ||
      /^(127|10)\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h.includes(':')) return null;
  u.hash = '';
  return u.toString();
}
