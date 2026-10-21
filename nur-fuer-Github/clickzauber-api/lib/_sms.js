// SMS an Gäste: Zusage, Absage, neue Uhrzeit. Nur für Uhrzeit-Termine (Friseur, Nagelstudio & Co.).
// Anbieter: seven.io (Firmensitz Berlin). Vercel-Variablen:
//   SMS_KEY       API-Schlüssel aus seven.io → Entwickler → API-Schlüssel
//   SMS_ABSENDER  optional, höchstens 11 Zeichen, Standard: Name des Betriebs
// Ohne SMS_KEY wird nichts gesendet; das Cockpit zeigt dann den WhatsApp-Knopf.
export const SMS_AN = !!process.env.SMS_KEY;

export function smsNummer(t) {
  let n = String(t || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('00')) n = n.slice(2); else if (n.startsWith('0')) n = '49' + n.slice(1);
  return /^\d{9,15}$/.test(n) ? n : '';
}

export async function smsSenden(tel, text, absender) {
  const to = smsNummer(tel);
  if (!SMS_AN || !to || !text) return false;
  const roh = String(process.env.SMS_ABSENDER || absender || 'clickzauber');
  const from = roh.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^A-Za-z0-9 .-]/g, '').trim().slice(0, 11).trim() || 'clickzauber';
  try {
    const r = await fetch('https://gateway.seven.io/api/sms', {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.SMS_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to, from, text: String(text).slice(0, 459) })
    });
    const j = await r.json().catch(() => null);
    const ok = r.ok && j && String(j.success) === '100';
    if (!ok) console.error('sms:', r.status, j && j.success);
    return !!ok;
  } catch (e) { console.error('sms:', e && e.message); return false; }
}
