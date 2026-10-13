-- Add LFA Super Cup to the competitions list.
-- The club competes in this competition alongside the existing three.

insert into public.competitions (slug, name, short_name, sort_order)
values ('lfa-super-cup', 'LFA Super Cup', 'Super Cup', 3);

-- Shift Club Friendlies down so Super Cup appears before it in dropdowns.
update public.competitions set sort_order = 4 where slug = 'club-friendlies';
