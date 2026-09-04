# TradeLog Dashboard

Professional read-only analytics dashboard for the Telegram trading journal.

## Deploy / update on Vercel

1. Upload the contents of this folder to your `trading-dashboard` GitHub repository, replacing the existing files.
2. Keep your existing Vercel variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Add one new **server-side** Vercel environment variable:
   - `TELEGRAM_BOT_TOKEN` = the current token for your trading journal Telegram bot
4. Redeploy the Vercel project.

`TELEGRAM_BOT_TOKEN` must be added in Vercel's Environment Variables. Do not put it in source code or in a `VITE_...` variable.

## Trade screenshots

The bot already stores Telegram's `photo_file_id` on each trade. The dashboard uses `/api/trade-image` to retrieve that image server-side. The user's Supabase access token is checked first, and existing RLS limits the trade lookup to the linked account.

No Supabase database change is required for the screenshot feature if your `trades` table already contains `photo_file_id`.
