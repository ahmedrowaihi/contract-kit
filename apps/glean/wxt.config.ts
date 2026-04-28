import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Glean",
    description:
      "Reverse-engineer an OpenAPI 3.1 spec from traffic observed in DevTools.",
    permissions: ["storage", "unlimitedStorage"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
