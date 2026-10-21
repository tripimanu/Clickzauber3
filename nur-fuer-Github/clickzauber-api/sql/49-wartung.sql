-- 49: Wartungsmodus für die ganze Plattform (Schalter auf clickzauber-plattform.html → Überblick).
create table if not exists plattform_status (
  id      int primary key default 1 check (id = 1),
  wartung boolean not null default false,
  text    text,
  seit    timestamptz
);
alter table plattform_status enable row level security;
insert into plattform_status (id, wartung) values (1, false) on conflict (id) do nothing;
