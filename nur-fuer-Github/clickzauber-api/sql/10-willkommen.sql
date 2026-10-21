-- clickzauber 10: Merker für die Willkommensmail.
-- Verhindert, dass ein zweiter Stripe-Event dieselbe Mail nochmal schickt.
-- Nach 03-auth-billing.sql ausführen.

alter table users add column if not exists willkommen_am timestamptz;
