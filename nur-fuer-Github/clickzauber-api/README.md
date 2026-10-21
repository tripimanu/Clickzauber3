# clickzauber-api — Klick-für-Klick zum Deployen

Das ist das Backend (die API) für clickzauber. Vier Endpunkte:

| Endpunkt | Zweck |
|---|---|
| `POST /api/event` | Ein Klick/Schritt im Widget (anonym) |
| `POST /api/lead` | Fertige Anfrage + E-Mail an dich + Abschluss-Event |
| `GET /api/config?widget=ID` | Widget holt seine Fragen/Design |
| `GET /api/dashboard?widget=ID&days=30` | Kennzahlen fürs Cockpit |

---

## Voraussetzung (hast du schon)
- Supabase-Projekt mit Haupt-Schema (Schritt-1-Dokument, Abschnitt 2) + Widget `clickzauberhochzeit`.
- Danach **`sql/02-config-seed.sql`** im Supabase SQL-Editor ausführen — legt die erste Widget-Config an.
- Resend-API-Key.

## Schritt 1 — Diesen Ordner zu GitHub bringen
Am einfachsten ohne Programme, direkt im Browser:
1. Auf `github.com` → grüner Button **New** → Repository-Name `clickzauber-api` → **Private** → **Create repository**.
2. Auf der nächsten Seite: **"uploading an existing file"** anklicken.
3. Den **kompletten Inhalt** des Ordners `clickzauber-api` per Drag & Drop hochladen (die Ordner `api/`, `sql/`, sowie `package.json`, `vercel.json`, `.gitignore`). **Nicht** `node_modules`.
4. Unten **Commit changes**.

## Schritt 2 — Bei Vercel deployen
1. `vercel.com` → **Add New… → Project**.
2. Dein Repo **clickzauber-api** → **Import**.
3. Vor dem Deploy unter **Environment Variables** eintragen:

| Name | Wert |
|---|---|
| `SB_URL` | Supabase → Project Settings → API → Project URL |
| `SB_SERVICE_KEY` | Supabase → Project Settings → API → **service_role** (geheim!) |
| `MAIL_KEY` | dein Resend-Key (`re_…`) |
| `NOTIFY_TO` | projekt@clickzauber.de |

4. **Deploy**. Nach ~1 Min bekommst du eine Adresse wie `clickzauber-api.vercel.app`.

## Schritt 3 — Testen (ohne Programme)
Öffne im Browser (ID ersetzen falls nötig):
```
https://DEINE-ADRESSE.vercel.app/api/config?widget=clickzauberhochzeit
```
→ Es sollten die Fragen als JSON erscheinen. Klappt das, läuft die API + DB-Verbindung.

Dann im echten Widget testen: in `js/cz-sheets.js` (bzw. w.js später)
```js
window.CZ_API = 'https://DEINE-ADRESSE.vercel.app/api';
```
Widget durchklicken → in Supabase **Table Editor → events** erscheinen Zeilen, Anfrage → **leads** + E-Mail.

## Wichtig
- `SB_SERVICE_KEY` **nur** in Vercel-Env — nie ins Widget, nie öffentlich.
- Später eigene Domain `app.clickzauber.de` in Vercel auf dieses Projekt zeigen lassen.
