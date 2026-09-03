import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "fs";
import { resolve } from "path";

/** Copia index.html → 404.html para hosts estáticos (Render, GitHub Pages). */
function spaFallback() {
  return {
    name: "spa-fallback",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      const index = resolve(dist, "index.html");
      const notFound = resolve(dist, "404.html");
      if (existsSync(index)) {
        copyFileSync(index, notFound);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
