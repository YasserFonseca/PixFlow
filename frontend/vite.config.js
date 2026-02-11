import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    // Proxy para backend em desenvolvimento
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  define: {
    // Variáveis globais
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || "http://localhost:5000"),
  },
});

