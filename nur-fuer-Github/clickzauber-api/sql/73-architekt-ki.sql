-- clickzauber: Schalter für die KI im Architekten (20.10.2026). Nach 72-blockiert.sql ausführen.
-- Plattform → Überblick → „Architekt: KI“ schaltet ihn. Aus = nur die drei Felder, keine KI. Standard: aus.
-- lib/architekt.js fragt ihn bei jedem Auftrag, lib/status.js liefert ihn dem Konfigurator (js/cz-konfigurator.js).
alter table plattform_status add column if not exists architekt_ki boolean not null default false;
