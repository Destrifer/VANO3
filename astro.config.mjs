import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

import vue from "@astrojs/vue";

export default defineConfig({
  // astro-icon: инлайнит SVG из локального @iconify-json/tabler на сборке
  integrations: [icon(), vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});