# Admin section — specification

Status: **proposed, not built.** No code in this document has been written yet.
Last updated: 2026-10-05.

This is the plan for the `/admin` section. It is written for review before
implementation; each phase lists what gets built, what gets verified, and what is
deliberately left out.

## Confirmed decisions

| Question | Decision |
|---|---|
| Admin count | 6 total: 1 super admin + 5 role-based |
| Role types | `super_admin`, `fixtures`, `content` |
| Minimum player age | 15, so some squad players are minors |
| Date of birth | Stored in the database, **never rendered publicly**; show age only |
| Sponsors | Public band above the footer, tiered, contract expiry auto-hides |
| Social handles | Data-driven row above the footer, orderable |
| Lineup entry | Deferred to the match-editor phase, not now |

## Shape: one section, not one page

`/admin` is a shell with a persistent sidebar. Each tool is its own screen:

```
/admin                      dashboard: counts, recent activity, quick links
/admin/fixtures             fixture list + editor
/admin/matches/[id]         lineups, goals, cards, match report
/admin/news                 news list + editor
/admin/squad                players, positions, photos, bios
/admin/sponsors             super admin only
/admin/settings             social handles, contact details
/admin/users                super admin only
/admin/media                image library
```

Nine tools. One login, one visual language, one navigation model. A single long
page would be unnavigable and would slow down as tools are added.

### Tool inventory

| Tool | Phase | Roles |
|---|---|---|
| Sponsors | 1 | super admin |
| Settings (social, contact) | 1 | super admin |
| Fixtures | 2 | super admin, fixtures |
| Matches & lineups | 3 | super admin, fixtures |
| News | 4 | super admin, content |
| Squad | 4 | super admin, content |
| Honours & milestones | 4 | super admin, content |
| Users | 5 | super admin |
| Media library | 5 | super admin, content, fixtures |

Stats are **not** a separate tool. Goals, assists and cards are attributes of a
match and live inside the match editor, as do lineups. Tools are per entity, not
per field.

## Roles

`role` is `text` with a CHECK constraint, not a Postgres enum, so adding a role
later is not an `ALTER TYPE`.

```sql
create table public.site_admins (
  email text primary key,
  role text not null default 'content'
    check (role in ('super_admin', 'fixtures', 'content')),
  created_at timestamptz not null default now(),
  constraint site_admins_email_lowercase check (email = lower(email))
);
```

`role` defaults to `content`: the least-privileged role, so a new admin is never
powerful by accident.

### Privilege helper

Every RLS policy would otherwise repeat the same membership subquery. One
function instead:

```sql
create function public.has_role(required text) returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.site_admins
     where email = lower((select auth.jwt() ->> 'email'))
       and role = required
  );
$$;

grant execute on function public.has_role(text) to authenticated;
```

Two details that are easy to get wrong:

- `security definer` **must** pin `search_path`, or the function is exploitable
  through object shadowing.
- The `grant execute` is required, or the RLS policies fail at runtime rather
  than at creation, which makes it a confusing first failure.

A `has_any_role(required text[])` variant is added when a second role needs
`fixtures or super_admin` in one policy.

### Privilege escalation — the trap in this design

**RLS cannot restrict which columns are updated.** A `content` admin with blanket
`update` on `site_admins` could set their own `role` to `super_admin`.

The fix is column-level grants, and it must be written explicitly at migration
time:

```sql
revoke update on public.site_admins from authenticated;
grant update (email) on public.site_admins to authenticated;
-- role is deliberately not granted: only the migration owner can change it
```

The users screen enforces this in the UI as well, but **the UI is not the
security boundary** — RLS and column grants are.

### Screen access matrix

| Screen | super_admin | fixtures | content |
|---|:---:|:---:|:---:|
| Dashboard, fixtures, matches | yes | yes | no |
| News, squad, honours | yes | no | yes |
| Sponsors, settings, users | yes | no | no |
| Media library | yes | yes | yes |

Sponsors and settings are super-admin-only on purpose. Sponsorship is
commercially sensitive — contract terms, partner relationships, deal dates — and
there is no reason an editorial admin can see it.

## Phase 1 — Sponsors and site settings

The first content to move out of `src/data/site.ts`. Chosen first because it is
low-risk (no drafts, no authorship, nothing editorial to get wrong) and because
it makes the public site visibly more finished.

### Storage

Sponsor logos go in **Supabase Storage**, not `public/`. This is the dependency
that gets missed: once content is database-managed, images need their own RLS
policies and an orphan story.

- Bucket `sponsor-logos`, **public read**, with writes restricted to authenticated
  admins. Confirmed by the club: sponsors are public brand assets, and a public
  bucket is simpler and caches far better than signed URLs.
- Uploads still go through a server action; the bucket is never world-writable.
- Files are normalised on upload: trimmed of empty margin, sized to the band's
  display height, and re-encoded as PNG with transparency preserved.
- Orphan handling: unpublishing a sponsor does not delete its file. A scheduled
  cleanup would be over-engineering at this scale; superseded logos are simply
  left in place.

### Logo requirements, enforced in the admin

PSG can flatten every logo to one navy because they own the master artwork from
partners. You will be uploading whatever a sponsor sends. So:

- Upload **monochrome SVG or PNG**, on a white or transparent background.
- A live preview in the admin renders the logo exactly as the public band will.
- Document the requirement in the upload panel, because a full-colour PNG
  flattened with `grayscale()` looks muddy and makes the band look broken.

### Supplied logos, measured

Three of the four sponsors supplied artwork, inspected on 2026-10-05. All are PNGs
with a transparent background and transparent corners, which is exactly what the
band needs. Contrast below is the darkest 2% of pixels against white, which is
what actually reads as the logo's ink.

| Sponsor | Source | Mean RGB on white | Ink contrast | Verdict |
|---|---|---|---|---|
| BETTOMAX | 992×992 | 251,251,251 | **7.21:1** | Passes AA |
| Ambivert | 1000×733 | 172,169,165 | **14.65:1** | Passes AA comfortably |
| NEEV Liberia | 820×754 | 229,228,232 | **2.51:1** | **Too low** |

**NEEV needs a dark version.** The supplied artwork is pale lavender-grey, which
on a white band is faint — 2.51:1, below the 3:1 minimum for graphics and well
below AA. The brand name "NEEV" is still readable at full size, but the tagline
beneath it ("NEW ENERGY ELECTRIC VEHICLES, LIBERIA") becomes difficult, and both
will suffer when scaled to 75px.

Three options, in order of preference:

1. **Ask NEEV for the dark or reversed artwork.** Every brand has one; it is a
   quick ask and the right fix.
2. **Apply a CSS filter** (`brightness(0.4) saturate(0)`) to darken the artwork at
   render time. Cheap, and safe for a monochrome mark, but it is a workaround
   rather than the brand's real colour.
3. **Place NEEV on a dark plate** inside the band. Changes the design language,
   so it is a last resort.

The admin's live preview exists precisely so this is caught before publishing
rather than after.

**Ambivert has no wordmark.** The supplied file is a symbol only — a dark
rounded tile with a stepped "A" mark. In a sponsor band that reads as a logo, but
the name is not visible, so the link needs an accessible name ("Ambivert") and the
row benefits from the sponsor name being rendered as text beside it. Worth
confirming with the sponsor whether a horizontal lockup exists.

**BETTOMAX note:** the supplied mark has a star overlapping the middle of the
wordmark, so the central letters are less distinct at small sizes. Legible at
75px, but worth checking in the rendered band.

### Schema

```sql
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  tier smallint not null default 3 check (tier between 1 and 3),
  url text check (url is null or url ~ '^https?://'),
  logo_path text,
  alt_text text,
  starts_on date,
  ends_on date,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_dates_ordered check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
```

`tier` is an integer, not a lookup table: with 3–6 sponsors, a tier label is a
presentation concern, not an entity. `is_published` defaults to **false** so a
sponsor never appears before it has been reviewed.

```sql
create table public.site_settings (
  id boolean primary key default true check (id),
  social_handles jsonb not null default '[]'::jsonb,
  contact_email text,
  phone_orders text,
  updated_at timestamptz not null default now()
);
```

`social_handles` is an ordered jsonb array of
`{ platform, url, label, is_published }`. Storing it as an ordered array rather
than a row-per-platform table keeps ordering trivial and matches the fact that
these are simple, independent links. Validated in the server action, not by the
database, because JSON shape rules are not worth a CHECK constraint here.

One row, `id = true`, so the table has a stable primary key without needing a
known id at write time.

### Public rendering

Modelled on PSG's band, with three deliberate departures.

PSG's band, as measured on psg.fr: 15 sponsors in three rows — 2 principals
(41px), then 7 and 6 partners (72–75px) — all monochrome navy on pure white,
above a 12-icon social row, on the same background, outside the dark footer. The
same 15 sponsors appear on every page.

**Tier 1** — 1–2 logos, own row, generous whitespace.
**Tier 2** — up to 7, centred wrap, 75px cap.
**Tier 3** — up to 8, 75px cap.
**Social** — centred row, 28px icons, labelled.

Departures from PSG:

1. **Three tiers, not two.** PSG has principals + partners. With 4 sponsors, half
   the band being principals would overstate a modest sponsorship list. Three
   tiers degrade gracefully at any size.
2. **Expiry auto-hides.** PSG has no contract expiry — a lapsed sponsor stays on
   the wall until someone edits the CMS. A rival brand sitting quietly on your
   homepage is a real risk. Rows where `ends_on < today()` are excluded from the
   public query, so expiry needs no admin action.
3. **Orderable social row.** PSG's row is fixed and Western-heavy. Ours is
   data-driven so Facebook and WhatsApp can lead — they are the platforms this
   audience actually uses.

### Public query

```sql
-- RLS: published, within contract, ordered by tier then sort_order
select * from public.sponsors
 where is_published
   and (starts_on is null or starts_on <= current_date)
   and (ends_on   is null or ends_on   >= current_date)
 order by tier, sort_order, name;
```

Expiry is enforced in the query as well as being handled by convention, so a
stale cached page cannot show a lapsed sponsor for long.

### Accessibility requirements

PSG's social row has **11 of 12 links with no accessible name** — no `aria-label`,
no `alt`, no visually-hidden text. Their sponsor logos are properly labelled; the
social icons are not. That is a genuine defect and we do not copy it.

- Every social icon has a visually-hidden platform name: "Facebook", "WhatsApp".
- Every sponsor logo has `alt` with the sponsor name.
- Outbound links use `rel="sponsored noopener"`, so paid links neither pass link
  equity nor expose `window.opener`.
- Every social and sponsor link is at least 44×44px, despite the icons being
  28px — padding, not a bigger icon.
- The band is a `<section>` with an `aria-label`, so it is reachable as a region.

### Contrast

Sponsor logos are monochrome on white, so contrast is the sponsor's problem, not
ours — but the social icons and any text must meet AA. Verified by measurement on
the rendered page, not by eye.

## Phase 2 — Roles and the fixtures editor

`has_role()`, the `role` column, column-level grants, then the fixtures editor
upgrade. Proves the security model before news and squad depend on it.

Fixtures editor additions over the current form: bulk paste from a text block,
recurring fixtures, and duplicate detection (same opponent, competition and date
within a window).

## Phase 3 — Match editor

One editor per match: lineups (starters + bench, shirt numbers, positions), goals
with scorer and minute, cards, and the written match report. This is what turns
the Lineups and Stats tabs on `/match/[id]` from honest placeholders into real
content.

**Lineup entry is where the age question lands.** The editor stores
`date_of_birth`; the public profile renders age only. The admin shows a visible
note that date of birth is club-confidential and never published, so a
contributor understands it at the point of entry.

## Phase 4 — News and squad

Migration first, editors second. `articles`, `squad` and `honors` move out of
`src/data/site.ts` into the database, then the editors are built against them.

This is the largest single piece of work in the whole plan: it changes who can
publish the site, not just how. After it, the club publishes without a developer.

## Phase 5 — Users, media, audit log

Users screen (super admin only), a shared media library, and an audit log for
score corrections and deletions.

With six admins the audit log stops being optional: with one or two, you trust
each other; with six, you want to know who corrected a score or removed a
sponsor. This also directly serves the standing rule that deletions require
approval.

## Cross-cutting requirements

**Concurrency.** Fixtures are currently last-write-wins. With six admins logging
in, two people can edit the same fixture and one silently overwrites the other.
An `updated_at` comparison on save, showing "this fixture was changed by someone
else while you were editing", is the cheap fix.

**No silent deletion.** The current migration grants only `insert, update` on
`fixtures` — a mistaken fixture can be unpublished but never deleted. That is
deliberate and correct. The admin UI must state it, or it reads as broken.

**Every write is server-side validated** against the shared helpers in
`src/lib/fixtures/validation.ts`, which the existing tests already cover.

**Every screen is tested for role access**, including that a `content` admin gets
404, not merely a hidden nav link.

## Verification plan

Per phase: `npm run check` (lint, types, tests), `npm run build`, and a browser
pass at 1264px and 390px measuring overflow, tap targets and contrast ratios —
the same checks used for the public site. Plus a live check that a non-super
admin cannot reach a super-admin screen by typing its URL.

## Seed data

Four sponsors, as supplied by the club:

| Sponsor | Website | Tier | Logo |
|---|---|---|---|
| BETTOMAX | bettomax-lbr.com | 1 | Supplied, passes AA |
| NEEV Liberia | neevliberia.com | 1 | Supplied, **needs a dark version** |
| TLION ESTATE | none supplied | 2 | **Missing** |
| Ambivert | facebook.com/luxuryGraphiX | 2 | Supplied (symbol only) |

Two gaps to close before the band can ship:

1. **TLION ESTATE has no logo.** It cannot appear in the band without one. A
   text-only fallback is possible but would look inconsistent beside three proper
   logos.
2. **NEEV needs darker artwork**, for the contrast reasons measured above.

Social handles: **none supplied yet.** The only link provided is Ambivert's
Facebook page, which belongs on the Ambivert sponsor record rather than in the
club's own social row. The club's own handles are still needed to seed
`site_settings.social_handles`.

Tiering above is a proposal. The club knows the actual commercial hierarchy and
should set it rather than inferring it from the logo filenames.

## Open questions

1. **Does the fixtures editor need a delete path?** Currently there is none by
   design. If the club wants one, it needs an audit trail and your explicit
   approval.