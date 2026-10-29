/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { BackgroundSyncPlugin, CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const supabaseRest = (url: URL) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/");
// Ответы оценки FSRS, прогресс LiD: офлайн встают в очередь и уходят при появлении сети.
const sync = new BackgroundSyncPlugin("supabase-writes", { maxRetentionTime: 24 * 60 });

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Данные Supabase (карточки, LiD, план): сеть, а без неё — последний ответ из кэша.
    {
      matcher: ({ url, request }) => request.method === "GET" && supabaseRest(url),
      handler: new NetworkFirst({ cacheName: "supabase-api", networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 86400 })] }),
    },
    ...(["POST", "PATCH"] as const).map((method) => ({
      matcher: ({ url }: { url: URL }) => supabaseRest(url),
      method,
      handler: new NetworkOnly({ plugins: [sync] }),
    })),
    // Озвучка Piper и картинки LiD не меняются.
    {
      matcher: ({ url }) => url.origin === self.location.origin && /^\/(audio|lid)\//.test(url.pathname),
      handler: new CacheFirst({ cacheName: "media", plugins: [new ExpirationPlugin({ maxEntries: 1500, maxAgeSeconds: 365 * 86400 })] }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
