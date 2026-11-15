# FogoTech Platform

Website, client portal and job management for FogoTech (CCTV, intercoms, access control, WiFi networks).

## Stack
- **Next.js** (app in this repo) – hosted on **Vercel**, deploys automatically on every push to `main`.
- **Supabase** – database, logins and file storage (project `Fogotech-platform`, London region).

## Logins
- **Office** – sees everything, assigns and schedules jobs, manages customers and users.
- **Engineer** (incl. sub-contractors) – sees only jobs assigned to them.
- **Customer** – sees only their own company's sites and jobs; can log new jobs.

New sign-ups start as an unlinked customer; the office links or promotes them under *Users & logins*.

## Environment variables (Vercel)
| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

## Local development
```
cp .env.example .env.local
npm install
npm run dev
```

## Database
Schema history is in `supabase/migrations`. Access rules (row level security) are enforced in the database, so data
stays protected even if the website code has a bug.
