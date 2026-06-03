import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

export default defineConfig({
  // astro-icon: инлайнит SVG из локального @iconify-json/tabler на сборке
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});