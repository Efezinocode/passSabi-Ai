# Admin link fix + installable PWA

## Task 1 — Diagnosis (already verified)

| Check | Result |
| --- | --- |
| 1. `/app/admin` route exists and renders | PASS — the page exists with its own stats + user table |
| 2. Admin role active for uzeziefezino@gmail.com | PASS — the account holds the `admin` role right now |
| 3. UI element that shows an "Admin" link | FAIL — the link exists **only** in the desktop sidebar, which is hidden on screens below tablet width. On phone there is no Admin entry in the bottom nav or on Profile |

So nothing is broken in the backend; the entry point is simply unreachable on mobile.

### Fix

- Add an "Admin dashboard" row on the Profile page, rendered only when the signed-in user's admin check returns true (same server check already used by the sidebar).
- Keep the existing desktop sidebar link as is.
- No change to the `has_role` function, its permissions, or its SECURITY DEFINER settings.

## Task 2 — Installable PWA (manifest + guarded service worker)

1. **Manifest** at `public/manifest.webmanifest`: name "PassSabi AI", short name "PassSabi", `display: standalone`, theme and background colour `#101a2e` (the value already used as the app's theme colour, matching the dark navy background token), icons at 192x192, 512x512 and a maskable 512x512.
2. **Icons**: the project only ships `favicon.ico` — there is no PNG logo asset. Icons will be rendered from the existing PassSabi logo mark already coded in `src/components/brand.tsx` (same gradient tile and glyph), so it is the current logo, not a new design and not an upscale of the favicon.
3. **Head tags** in the root route: manifest link, `apple-touch-icon`, existing theme-color kept.
4. **Service worker** via `vite-plugin-pwa` (generated, not hand-written):
   - Precache the built JS/CSS bundles, fonts and icons.
   - Navigations use network-first; nothing under `/api/*` (tutor, quiz) is cached.
   - Registration happens from a single guarded wrapper that refuses to register in dev, in the Lovable preview/iframe, and on any preview host, and unregisters stale workers there. `?sw=off` acts as a kill switch.
5. **Install prompt verification**: Chrome on Android requires manifest + icons + a registered service worker served over HTTPS. Since the worker is intentionally disabled in preview, this is only testable on the published site. After publishing I will fetch the deployed manifest and `sw.js` to confirm they are served correctly, and give you the steps to confirm the "Add to Home screen" banner on your phone.

Out of scope, as requested: offline chat, offline quiz generation, background sync, push notifications.

## Technical notes

- Profile admin row reuses `checkIsAdmin` from `src/lib/admin.functions.ts` through `useServerFn` + `useQuery`, so no new backend surface.
- `vite-plugin-pwa` is added to `vite.config.ts` with `injectRegister: null` and `devOptions.enabled: false`, `registerType: "autoUpdate"`, SW filename `/sw.js`.
- `/~oauth` excluded from the navigation fallback so sign-in flows are untouched.
