-- 33: Kostenlos bis … (Erstkunden) und Übergabe eines vorgebauten Zugangs
-- kostenlos_bis: letzter kostenloser Tag. Bis dahin läuft das Widget ohne Abo,
-- danach schaltet der Nachtlauf das Konto auf „inaktiv“, falls kein Abo gebucht ist.
-- kostenlos_erinnert: wann die Erinnerung 14 Tage vor Ablauf rausging (genau einmal).
alter table users add column if not exists kostenlos_bis date;
alter table users add column if not exists kostenlos_erinnert timestamptz;
