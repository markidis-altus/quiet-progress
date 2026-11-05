import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained index.html (works from file:// on a computer too),
// plus manifest / service worker / icons copied from public/ for iPhone install.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: { target: "es2019", outDir: "dist", emptyOutDir: true },
});
