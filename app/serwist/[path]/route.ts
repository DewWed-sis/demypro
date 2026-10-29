import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Версия прекэша = текущий коммит.
const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || crypto.randomUUID();

// Экраны, которые должны открываться без сети (карточки, LiD).
const pages = ["/", "/learn", "/learn/cards", "/learn/alphabet", "/lid", "/lid/practice", "/lid/test", "/profile", "/~offline"];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: pages.map((url) => ({ url, revision })),
  swSrc: "app/sw.ts",
  // Озвучка (~1500 файлов) кэшируется при первом прослушивании, а не при установке.
  globIgnores: ["**/audio/**"],
  useNativeEsbuild: true,
});
