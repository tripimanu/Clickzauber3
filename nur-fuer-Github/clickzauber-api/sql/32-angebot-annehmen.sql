-- 32: Angebot online annehmen
-- Der Gast bekommt einen Link mit geheimem Code, liest das Angebot und nimmt es
-- mit seinem Namen an. Festgehalten werden Zeitpunkt, Name und Angebotssumme.
alter table leads add column if not exists annahme_code text;
alter table leads add column if not exists angenommen_am timestamptz;
alter table leads add column if not exists angenommen_von text;
alter table leads add column if not exists angenommen_summe numeric;
create unique index if not exists leads_annahme_code_idx on leads (annahme_code) where annahme_code is not null;
