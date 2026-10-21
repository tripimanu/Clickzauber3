repo: tripimanu/clickzauber-api
branch: main

## Last sync
date: 2026-10-15T10:55:33Z

### Updated in this project
- Geprüft: Sicherheits-Dateien von Claude Code sind auf GitHub (gebremst, kopfNachQuery in lib/_lib.js)
- Geprüft: Seite „Ihr Termin“ mit Logo (betriebLogo), bescheidMail und GAST_HOST in lib/termine.js sind auf GitHub
- Logo im Cockpit kommt über /api/config (lib/config.js), keine Server-Änderung nötig

## Screen map
| Bereich | Dateien im Repository |
|---|---|
| Cockpit-Kalender, Hin und Her | lib/termine.js, lib/_termine.js, lib/_termin-pflege.js, lib/buchung.js, lib/_kalender-direkt.js |
| Seite „Ihr Termin“, Bestätigungs-Mail | lib/termine.js (gastAntwort, bescheidMail, betriebLogo, gastKalender) |
| Logo oben im Cockpit | lib/config.js (logo, theme.logo) |
| Formular | public/w.js |
| Anmeldung | api/hub-auth.js, lib/auth/ |
| Bremse, Kopfzeilen | lib/_lib.js, api/hub-*.js, sql/70, sql/71 |
| Demo-Feedback | lib/demo-feedback.js, api/hub-content.js, sql/54-demo-feedback.sql |
| Wartung | lib/_wartung.js |

## Sync history
### 2026-10-15T07:31:57Z
- Abgleich Datei für Datei: GitHub und NICHT-HOCHLADEN/nur-fuer-GitHub/clickzauber-api/ sind gleich (165 Dateien)
- Von Claude Code übernommen: Anmeldung per 6-stelligem Code entfernt (api/hub-auth.js, vercel.json; lib/auth/request-code.js und verify-code.js im Archiv)
- Heute auf GitHub: lib/termine.js mit neuer Bestätigungs-Mail, Kalender-Knopf (aktion=ics), Seite „Ihr Termin“ in der neuen Gestaltung
### 2026-10-03T03:30:20Z
- GitHub verbunden, Stand geprüft: Demo-Feedback (lib/demo-feedback.js, api/hub-content.js, lib/_wartung.js, sql/54) ist auf GitHub
