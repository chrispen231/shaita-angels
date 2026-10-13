-- Unify all season values to YYYY/YY format.
-- Previously the database had "2025–26", "2026-2027", and "2026-27" as separate values.
-- They are now all "2025/26" and "2026/27".

update fixtures set season = '2025/26' where season = '2025–26';
update fixtures set season = '2026/27' where season = '2026-2027';
update fixtures set season = '2026/27' where season = '2026-27';
