-- 61: App-Versionen (05.10.2026). Nach 60 ausführen.
-- Mindestversion je Plattform: Ältere Apps zeigen „Bitte aktualisieren“ und lassen sich erst danach nutzen.
-- ios_app_id: die Apple-ID der App (Zahl aus App Store Connect), damit „Aktualisieren“ direkt den App Store öffnet.
-- Einstellen auf clickzauber-plattform.html → Überblick → App-Versionen.
alter table plattform_status add column if not exists app_min_ios text;
alter table plattform_status add column if not exists app_min_android text;
alter table plattform_status add column if not exists ios_app_id text;
