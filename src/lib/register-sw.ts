const SW_URL = "/sw.js";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

/** Registers the generated service worker only in the published production app. */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const swOff = new URL(window.location.href).searchParams.get("sw") === "off";
  const blocked =
    !import.meta.env.PROD || inIframe || swOff || isPreviewHost(window.location.hostname);

  if (blocked) {
    void unregisterAppServiceWorkers();
    return;
  }

  // `controllerchange` fires the very first time a service worker takes
  // control of a page, not just on a real update -- so this used to force a
  // reload on a plain first load/refresh too, right in the middle of the
  // login session being restored. That's what was bouncing signed-in users
  // back to /auth after a refresh. Now we only reload once `updatefound`
  // has told us this is a genuine new version.
  let sawUpdate = false;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!sawUpdate || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          sawUpdate = true;
        });

        const checkForUpdate = () => {
          void registration.update().catch(() => {
            /* offline or transient network error */
          });
        };

        // Check on launch, when the app is brought back to the foreground,
        // and hourly while it stays open.
        checkForUpdate();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("online", checkForUpdate);
        window.setInterval(checkForUpdate, 60 * 60 * 1000);
      })
      .catch(() => {
        /* registration is best-effort */
      });
  });
}
