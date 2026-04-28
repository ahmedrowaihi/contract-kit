import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Glean",
    short_name: "Glean",
    description:
      "Reverse-engineer OpenAPI 3.1 specs from traffic observed in DevTools.",
    permissions: ["storage", "unlimitedStorage"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
