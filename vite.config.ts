import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: "dist",
    rolldownOptions: {
      input: {
        studio: "src/studio/index.html",
      },
    },
    sourcemap: process.env.NODE_ENV === "development",
  },
});
