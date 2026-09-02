# Move PassSabi AI to Vercel (passabiai.vercel.app)

Yes, this works. The app is a TanStack Start app, which Vercel deploys natively (SSR + API routes). Three things must change: the hosting target, the AI provider, and the backend.

## 1. Hosting on Vercel

- Add a Vercel build target so the server build output is what Vercel expects (currently the build targets Cloudflare Workers).
- Keep the PWA setup as-is; it works the same on Vercel.
- You connect GitHub from the editor (Plus (+) → GitHub → Connect project), then import that repo in Vercel and set the domain to `passabiai.vercel.app`. I cannot push or deploy from chat.

## 2. AI: Google Gemini directly

- Replace the two Lovable AI Gateway call sites (tutor streaming chat and quiz generation) with direct calls to the Google Generative Language API using your own `GEMINI_API_KEY`.
- Model: `gemini-2.5-flash`, streaming preserved for the tutor so answers still type out live.
- The same code runs on both hosts: if `GEMINI_API_KEY` is set it is used, so nothing else changes.
- You'll need a key from Google AI Studio; I'll request it through the secure secret form for the preview, and you paste the same value into Vercel's environment variables.

## 3. Your own Supabase project

Vercel needs full key access (the admin dashboard uses the service-role key), so the app moves onto a Supabase project you own.

- I'll produce a single consolidated SQL file containing the complete schema: `profiles`, `chat_sessions`, `chat_messages`, `practice_attempts`, `study_plan_items`, `user_roles`, `feedback`, the `has_role` function, all grants, RLS policies and triggers — exactly matching what's live now. You run it once in your new project's SQL editor.
- You then enable Google sign-in in that project and add the redirect URL `https://passabiai.vercel.app`.
- Existing users and their chat history are **not** carried over automatically — a new project starts empty. If you want the current data moved, that's a separate export/import step; tell me and I'll add it.
- The admin role for `uzeziefezino@gmail.com` is included as a seed row in that SQL.

## 4. Environment variables on Vercel

```text
VITE_SUPABASE_URL              (new project URL)
VITE_SUPABASE_PUBLISHABLE_KEY  (new anon/publishable key)
VITE_SUPABASE_PROJECT_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY      (enables the admin dashboard)
GEMINI_API_KEY
```

## 5. Retiring the Lovable site

Once Vercel is live and verified, stop publishing here. `passsabi.lovable.app` stays reachable until you unpublish it in Project settings.

## Technical notes

- `src/routes/api/tutor.ts` and `src/lib/quiz.server.ts`: swap `ai.gateway.lovable.dev` for `generativelanguage.googleapis.com/v1beta/.../streamGenerateContent?alt=sse`, translate the message array into Gemini `contents` + `systemInstruction`, and adapt the SSE parser to Gemini's chunk shape. The client stream contract stays unchanged.
- `vite.config.ts`: nitro preset switched to `vercel`, plus `.vercelignore`/`vercel.json` if the preset needs it.
- Supabase client modules (`src/integrations/supabase/*`) already read plain env vars, so they work against any project without edits.
- Schema is reconstructed from the six existing migration files into one idempotent script.

## What I need from you

- A Google AI Studio API key (secure form).
- Your new Supabase project's URL, publishable key, project ref, and service-role key — after you create it.
- Whether existing users/data must be migrated.
