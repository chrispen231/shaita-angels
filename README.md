# Shaita Angels FC

The official website concept for Shaita Angels Football Club, based in Careysburg, Liberia.

## Run locally

Copy `.env.example` to `.env.local`, then add the Supabase publishable key from the project API settings. Keep secret/service-role keys out of all `NEXT_PUBLIC_*` variables and out of Git.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project notes

- Built with Next.js App Router, React, TypeScript, and Tailwind CSS 4.
- Club imagery in `public/` is retained from the original project; generic starter graphics and legacy demo pages have been removed.
- The 2026 Orange Cup result and historical honors are based on published reporting. Names shown on the team page are references from recent coverage, not a confirmed current roster.
- 2026–27 fixtures, official ticketing, and merchandise ordering should only be published once confirmed by the club.

## Fixtures and results admin

The `/admin` area uses Supabase email-and-password sign-in and only grants access to emails present in the protected `site_admins` table. Admins can use the password-reset flow at `/admin/login` to set or recover a password. The fixtures table is protected by row-level security: the public can read published entries; authorized admins can manage entries. Unpublish a fixture to hide it from the public site without deleting its record.

Before enabling admin management:

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in local `.env.local` and the Vercel project's Production/Preview/Development environments as appropriate. The publishable key is intended for browser use; never add a secret or `service_role` key to the application.
2. Apply `supabase/migrations/20260928202929_fixtures_results.sql` to the Supabase project. It creates the protected admin-membership and fixtures tables and seeds the confirmed Orange Cup final.
3. Add the authorized administrator to `public.site_admins` only after their Supabase Auth user exists. The admin signs in at `/admin/login`; first-time password setup and recovery use the email reset flow on that page.
4. In Supabase Auth URL configuration, set the production Site URL and allow `http://localhost:3000/auth/callback` and `https://shaita-angels.vercel.app/auth/callback` as redirect URLs. Add any Vercel preview callback URL patterns you intend to use.

The migration has not been applied automatically. Confirm before changing the connected Supabase project or inviting/granting an administrator.
