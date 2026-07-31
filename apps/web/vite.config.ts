import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxied so the browser talks to one origin in development and the API
    // base URL is not baked into the bundle.
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
