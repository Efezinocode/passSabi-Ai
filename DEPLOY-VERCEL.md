# Deploying PassSabi AI to Vercel (passabiai.vercel.app)

## 1. Get the code to GitHub
In the Lovable editor: **Plus (+) → GitHub → Connect project**. Every change then pushes automatically.

## 2. Create your own Supabase project
1. Create a new project at supabase.com.
2. Open the SQL editor and run `supabase/schema-full.sql` from this repo (complete schema, grants, RLS, triggers, admin seed).
3. Authentication → Providers → enable **Google**.
4. Authentication → URL configuration → Site URL `https://passabiai.vercel.app`, and add it as a redirect URL.

Existing users and chat history are **not** carried over — the new project starts empty.

## 3. Get a Gemini API key
Create one in Google AI Studio. The app calls `gemini-2.5-flash` directly when `GEMINI_API_KEY` is set,
and falls back to the Lovable AI Gateway when it is not — so the same code runs on both hosts.

## 4. Import the repo in Vercel
Framework preset: **Other**. Build command `vite build`. Output is produced by the Nitro `vercel` preset
(auto-selected because Vercel sets `VERCEL=1`).

Environment variables:

```text
VITE_SUPABASE_URL              https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  <anon/publishable key>
VITE_SUPABASE_PROJECT_ID       <ref>
SUPABASE_URL                   https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY       <anon/publishable key>
SUPABASE_PROJECT_ID            <ref>
SUPABASE_SERVICE_ROLE_KEY      <service role key>   # enables the admin dashboard
GEMINI_API_KEY                 <Google AI Studio key>
```

## 5. Domain
Project → Settings → Domains → `passabiai.vercel.app`.

## 6. Retiring the Lovable site
Once Vercel is verified, stop publishing here. `passsabi.lovable.app` stays reachable until you unpublish
it in Project settings.
