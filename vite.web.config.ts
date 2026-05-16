import { defineConfig } from "vite";

export default defineConfig({
  root: "src/studio",
  publicDir: "../../public",
  base: process.env.CHATMUSIC_WEB_BASE ?? "/",
  build: {
    outDir: "../../dist-web",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
  },
});