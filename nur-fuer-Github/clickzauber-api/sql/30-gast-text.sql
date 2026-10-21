-- 30: Eigener Text für die automatische Antwort an den Gast
--     und ein Zahlungslink für Anzahlungen (Stripe-Zahlungslink, PayPal.me …)
alter table einstellungen add column if not exists gast_text text;
alter table einstellungen add column if not exists anzahlung_link text;
