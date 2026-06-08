import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

import vue from "@astrojs/vue";

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
  image: {
    remotePatterns: [{ protocol: "http", hostname: "localhost", port: "8055" }],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});