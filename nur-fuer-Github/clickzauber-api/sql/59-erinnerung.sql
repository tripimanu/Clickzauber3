-- 59: Kunden am Vortag automatisch erinnern (03.10.2026). Nach 58 ausführen.
-- Standard an. Aus: im Cockpit unter Einstellungen „Kunden am Vortag erinnern“.
alter table einstellungen add column if not exists erinnerung boolean not null default true;
