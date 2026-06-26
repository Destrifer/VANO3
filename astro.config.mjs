import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

import vue from "@astrojs/vue";

// Публичный URL Directus (откуда браузер грузит картинки галереи). Берём из env, чтобы
// работало и локально (http://localhost:8055), и в проде (напр. https://admin.printmos.ru).
// Третий аргумент "" — загрузить все переменные (без префикс-фильтра PUBLIC_).
const { DIRECTUS_PUBLIC_URL = "http://localhost:8055" } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "",
);
const directusAsset = new URL(DIRECTUS_PUBLIC_URL);

export default defineConfig({
  // Канонический домен. Нужен для абсолютных <link rel="canonical"> и sitemap.
  site: "https://printmos.ru",
  // Гибрид: страницы статичны (prerender по умолчанию), а серверные
  // эндпоинты (/api/*) включаются через `export const prerender = false`.
  // Node-адаптер standalone (под прод, см. AGENTS Infrastructure Direction).
  adapter: node({ mode: "standalone" }),
  // astro-icon: инлайнит SVG из локального @iconify-json/tabler на сборке.
  // sitemap: собирает sitemap-index.xml из prerender-страниц; служебные
  // маршруты (корзина, api) в индексе не нужны.
  integrations: [
    icon(),
    vue(),
    sitemap({
      filter: (page) => !page.includes("/cart") && !page.includes("/api/"),
    }),
  ],
  // Картинки галереи (works) лежат в Directus. Разрешаем astro:assets тянуть
  // оригинал и на сборке генерить AVIF/WebP + responsive srcset (см. Gallery.astro).
  // Хост берём из DIRECTUS_PUBLIC_URL — работает и локально, и в проде.
  image: {
    remotePatterns: [
      {
        protocol: directusAsset.protocol.replace(":", ""),
        hostname: directusAsset.hostname,
        ...(directusAsset.port ? { port: directusAsset.port } : {}),
      },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});