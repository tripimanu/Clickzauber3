-- 34: Sprachen
-- users.sprache: Sprache des Cockpits und der Mails an den Betrieb (de, sq, en)
-- leads.sprache: Sprache, in der der Gast das Formular ausgefüllt hat — danach richten sich die Mails an ihn
alter table users add column if not exists sprache text default 'de';
alter table leads add column if not exists sprache text;
-- warteliste.sprache: Sprache des Gastes für die Mail „Wieder frei“
alter table warteliste add column if not exists sprache text;
