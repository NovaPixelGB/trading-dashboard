# Trading Dashboard

Read-only website for the Telegram trading journal.

## Setup

1. Run `supabase_setup.sql` once in Supabase SQL Editor.
2. Add the `/link` command version of your journal bot.
3. Create a Vercel project from this repository.
4. Add:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
5. Build command: npm run build
6. Output directory: dist

The website cannot insert/update/delete trades. Supabase RLS only allows each logged-in
website user to SELECT trades belonging to their verified Telegram user ID.
