// GET  /api/team?token=…                                → Team des Betriebs
// POST /api/team { token, einladen:{email,name,rolle} }  → einladen
// POST /api/team { token, id, rolle }                    → Rolle ändern
// POST /api/team { token, entfernen:id }                 → Zugang entziehen
import { db, cors, body, userByToken, rolleVon, darf, MAIL_KEY, MAIL_FROM } from './_lib.js';

const TEAM_AUS = true;
const ROLLEN = ['inhaber', 'mitarbeiter', 'empfang'];
const ROLLE_TEXT = {
  inhaber: 'Inhaber — sieht und darf alles, auch Abo und Rechnungen',
  mitarbeiter: 'Mitarbeiter — Anfragen bearbeiten, Belegung pflegen, exportieren',
  empfang: 'Empfang — nur lesen, kein Export von Kontaktdaten'
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Seit 15.10.2026 abgeschaltet (Manuels Entscheidung). Eingeladene bekamen nie Zugang zum Betrieb (users.tenant_id wurde
  // nirgends gesetzt), und Speichern, Export und Konto löschen prüfen keine Rolle. Erst wieder bauen, wenn ein Betrieb danach fragt;
  // dann beides lösen. Der Code darunter bleibt als Vorlage stehen.
  if (TEAM_AUS) return res.status(410).json({ ok: false, aus: true, error: 'Team-Zugänge gibt es zurzeit nicht.' });

  const token = req.method === 'POST' ? body(req).token : req.query.token;
  const user = await userByToken(token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const rolle = await rolleVon(user);

  if (req.method === 'GET') {
    const { data } = await db.from('team').select('*').eq('tenant_id', user.tenant_id).order('eingeladen_am');
    const { data: t } = await db.from('tenants').select('name, email').eq('id', user.tenant_id).maybeSingle();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true, rolle, darf_verwalten: darf(rolle, 'team'),
      inhaber: { email: (t && t.email) || user.email, name: (t && t.name) || '' },
      rollen: ROLLE_TEXT,
      team: data || []
    });
  }

  if (req.method === 'POST') {
    if (!darf(rolle, 'team')) return res.status(403).json({ ok: false, error: 'Nur der Inhaber kann Zugänge verwalten.' });
    const p = body(req);

    if (p.entfernen) {
      const { data: weg } = await db.from('team').select('email').eq('id', p.entfernen).eq('tenant_id', user.tenant_id).maybeSingle();
      await db.from('team').delete().eq('id', p.entfernen).eq('tenant_id', user.tenant_id);
      if (weg && weg.email) {
        // Alle Geräte dieser Person abmelden, sonst läuft der Zugang weiter.
        const { data: u } = await db.from('users').select('id').eq('email', weg.email).maybeSingle();
        if (u) await db.from('sessions').delete().eq('user_id', u.id);
      }
      await db.from('protokoll').insert({
        tenant_id: user.tenant_id, was: 'team_entfernt', wer: user.email,
        hinweis: (weg && weg.email) || p.entfernen
      });
      return res.status(200).json({ ok: true });
    }

    if (p.id && p.rolle) {
      if (!ROLLEN.includes(p.rolle)) return res.status(400).json({ ok: false, error: 'Diese Rolle gibt es nicht.' });
      const { error } = await db.from('team').update({ rolle: p.rolle }).eq('id', p.id).eq('tenant_id', user.tenant_id);
      if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
      await db.from('protokoll').insert({
        tenant_id: user.tenant_id, was: 'team_rolle', wer: user.email, hinweis: p.id + ' → ' + p.rolle
      });
      return res.status(200).json({ ok: true });
    }

    const e = p.einladen || {};
    const email = String(e.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return res.status(400).json({ ok: false, error: 'Diese E-Mail-Adresse sieht nicht richtig aus.' });
    const neueRolle = ROLLEN.includes(e.rolle) ? e.rolle : 'mitarbeiter';

    const { data: schon } = await db.from('team').select('id').eq('tenant_id', user.tenant_id).eq('email', email).maybeSingle();
    if (schon) return res.status(400).json({ ok: false, error: 'Diese Adresse hat schon Zugang.' });

    const { data: neu, error } = await db.from('team').insert({
      tenant_id: user.tenant_id, email,
      name: e.name ? String(e.name).slice(0, 120) : null,
      rolle: neueRolle, eingeladen_von: user.email
    }).select('*').maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: 'einladen fehlgeschlagen' });

    const { data: t } = await db.from('tenants').select('name').eq('id', user.tenant_id).maybeSingle();
    await einladungsMail(email, (t && t.name) || 'Ihrem Betrieb', neueRolle, user.email);
    await db.from('protokoll').insert({
      tenant_id: user.tenant_id, was: 'team_eingeladen', wer: user.email, hinweis: email + ' als ' + neueRolle
    });
    return res.status(200).json({ ok: true, mitglied: neu });
  }

  return res.status(405).json({ ok: false });
}

async function einladungsMail(to, betrieb, rolle, von) {
  if (!MAIL_KEY) return false;
  const was = {
    inhaber: 'Sie können alles einsehen und ändern, auch Abo und Rechnungen.',
    mitarbeiter: 'Sie können Anfragen bearbeiten, die Belegung pflegen und Daten exportieren. Abo und Einstellungen bleiben beim Inhaber.',
    empfang: 'Sie können Anfragen und die Belegung einsehen. Ändern und exportieren kann nur, wer mehr Rechte hat.'
  }[rolle];
  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px">
<tr><td style="padding:26px 28px">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">Zugang zum Cockpit</div>
  <div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px">Sie wurden zu ${esc(betrieb)} hinzugefügt</div>
  <p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">
    ${esc(von)} hat Ihnen Zugang zum clickzauber Cockpit gegeben. ${was}
  </p>
  <p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">
    Legen Sie sich mit dieser E-Mail-Adresse ein Konto an: Passwort ausdenken, Adresse bestätigen, fertig.
  </p>
  <a href="https://clickzauber.de/clickzauber-login.html?neu=1" style="display:inline-block;background:#1f6d4a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:600;font-size:15px;margin-top:20px">Jetzt anmelden</a>
</td></tr></table></td></tr></table></body></html>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: 'Ihr Zugang zum Cockpit von ' + betrieb, html })
    });
    return r.ok;
  } catch { return false; }
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
