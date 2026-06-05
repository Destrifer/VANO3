import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";

import vue from "@astrojs/vue";

export default defineConfig({
  // Гибрид: страницы статичны (prerender по умолчанию), а серверные
  // эндпоинты (/api/*) включаются через `export const prerender = false`.
  // Node-адаптер standalone (под прод, см. AGENTS Infrastructure Direction).
  adapter: node({ mode: "standalone" }),
  // astro-icon: инлайнит SVG из локального @iconify-json/tabler на сборке
  integrations: [icon(), vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});