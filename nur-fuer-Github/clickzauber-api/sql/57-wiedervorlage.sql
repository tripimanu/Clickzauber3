-- 57: Wiedervorlage und mehrfaches Nachfassen (03.10.2026)
-- wv_am / wv_notiz: „Erinnere mich am …“ aus dem Cockpit. wv_gesendet_at: Erinnerung ist raus.
-- nf: welche automatischen Erinnerungen schon raus sind, z. B. {"n1":"2026-10-04T08:05:00Z","a3":"…"}.
-- Einmal ausführen, VOR dem Hochladen zu GitHub. Mehrfaches Ausführen schadet nicht.
alter table leads add column if not exists wv_am date;
alter table leads add column if not exists wv_notiz text;
alter table leads add column if not exists wv_gesendet_at timestamptz;
alter table leads add column if not exists nf jsonb not null default '{}'::jsonb;
create index if not exists leads_wv_idx on leads (wv_am) where wv_am is not null and wv_gesendet_at is null;
create index if not exists leads_offen_idx on leads (status, ts);
