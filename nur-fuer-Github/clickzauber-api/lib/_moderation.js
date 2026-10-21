// Automatische Prüfung von Texten und Bildern im Netzwerk, bevor sie gespeichert werden.
// Dienst: OpenAI Moderation (Modell omni-moderation-latest, kostenlos). Erkennt Hass und Hetze,
// Beleidigung und Drohung, Gewalt, sexuelle Inhalte, sexuelle Inhalte mit Minderjährigen,
// Selbstverletzung und Anleitungen zu Straftaten. Schlüssel: OPENAI_API_KEY in Vercel.
// Ohne Schlüssel greift nur eine kurze Wortliste für Texte; Bilder gelten dann als ungeprüft.
import { db, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';

const KEY = process.env.OPENAI_API_KEY;
const GRUND = {
  'hate': 'Hass oder Hetze', 'hate/threatening': 'Hass mit Drohung', 'harassment': 'Beleidigung oder Belästigung',
  'harassment/threatening': 'Drohung', 'violence': 'Gewalt', 'violence/graphic': 'Gewaltdarstellung',
  'sexual': 'Sexuelle Inhalte', 'sexual/minors': 'Sexuelle Inhalte mit Minderjährigen',
  'self-harm': 'Selbstverletzung', 'self-harm/intent': 'Selbstverletzung', 'self-harm/instructions': 'Selbstverletzung',
  'illicit': 'Anleitung zu Straftaten', 'illicit/violent': 'Anleitung zu Gewalttaten'
};
// Bei Minderjährigen reicht schon ein geringer Verdacht.
const SCHWELLE_MINDERJAEHRIG = 0.15;
const WORTE = /\b(sieg\s*heil|heil\s*hitler|untermensch\w*|vergas\w*|hurensohn\w*|missgeburt\w*|fotze\w*|ich\s+(bring|stech)\w*\s+dich|kinderporn\w*|kipo)\b/i;

export async function pruefen({ text, bild }) {
  const t = String(text || '').trim();
  if (!t && !bild) return { ok: true };
  if (!KEY) {
    if (t && WORTE.test(t)) return { ok: false, grund: 'Unzulässige Wortwahl', kategorien: ['wortliste'], schwer: /kinderporn|kipo/i.test(t) };
    return { ok: true, ungeprueft: !!bild };
  }
  const input = [];
  if (t) input.push({ type: 'text', text: t.slice(0, 8000) });
  if (bild) input.push({ type: 'image_url', image_url: { url: bild } });
  try {
    const r = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input })
    });
    const j = await r.json();
    const e = j && j.results && j.results[0];
    if (!e) return { ok: true, ungeprueft: true };
    const sc = e.category_scores || {};
    const schwer = (sc['sexual/minors'] || 0) >= SCHWELLE_MINDERJAEHRIG;
    // Geschäftsplattform: auch nicht strafbare sexuelle Inhalte sind nicht erlaubt.
    const kat = Object.keys(e.categories || {}).filter((k) => e.categories[k]);
    if (schwer && !kat.includes('sexual/minors')) kat.push('sexual/minors');
    if (!kat.length) return { ok: true };
    return { ok: false, schwer, kategorien: kat, grund: [...new Set(kat.map((k) => GRUND[k] || k))].join(', ') };
  } catch (err) {
    if (t && WORTE.test(t)) return { ok: false, grund: 'Unzulässige Wortwahl', kategorien: ['wortliste'], schwer: false };
    return { ok: true, ungeprueft: true };
  }
}

// Blockierten Inhalt vermerken. Bilder werden nie gespeichert, nur Art und Zeitpunkt.
export async function vermerken(tenantId, art, text, erg) {
  const schwer = !!erg.schwer;
  try {
    await db.from('netz_moderation').insert({
      tenant_id: tenantId, art, auszug: String(text || '').slice(0, 400) || null,
      kategorien: erg.kategorien || [], grund: erg.grund || null, schwer, status: schwer ? 'dringend' : 'blockiert'
    });
    if (schwer) {
      // Verdacht auf Missbrauchsdarstellung: Netzwerk-Teilnahme sofort sperren, Betreiber sofort informieren.
      await db.from('netz_profil').update({ gesperrt: true, sichtbar: false, gesperrt_grund: 'Automatische Sperre: Verdacht auf unzulässige Darstellung Minderjähriger' }).eq('tenant_id', tenantId);
    }
    if (MAIL_KEY && (schwer || art !== 'nachricht')) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MAIL_FROM, to: [MAIL_TO],
          subject: (schwer ? 'DRINGEND: ' : '') + 'Inhalt blockiert (' + art + '): ' + (erg.grund || ''),
          html: '<p>Betrieb ' + tenantId + ', Art: ' + art + '</p><p>Grund: ' + (erg.grund || '') + '</p>'
            + (schwer ? '<p><b>Das Profil wurde automatisch gesperrt. Das Bild wurde nicht gespeichert. Bitte nicht selbst nach dem Inhalt suchen, sondern Anzeige bei der Polizei erstatten (Onlinewache Ihres Bundeslandes) und die Konto-Daten aus der Plattform-Übersicht angeben.</b></p>' : '')
            + '<p><a href="https://clickzauber.de/clickzauber-plattform.html">Plattform-Übersicht öffnen</a></p>'
        })
      });
    }
  } catch (e) { /* Vermerk darf das Blockieren nicht verhindern */ }
}
