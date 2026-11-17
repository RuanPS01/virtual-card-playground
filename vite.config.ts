import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const BASE = "/virtual-card-playground/";

// Cores do manifesto. O manifesto não lê CSS, então os valores são os dos
// tokens --felt-dark (fundo da tela de abertura e barra do sistema).
const FELT_DARK = "#082117";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: BASE,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // O registro é feito em src/lib/pwa.ts, que avisa quando há versão nova
      // em vez de recarregar a página sozinho no meio de uma partida.
      injectRegister: false,
      registerType: "prompt",
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png"],
      manifest: {
        id: BASE,
        name: "Mesa de Cartas Virtual",
        short_name: "Mesa de Cartas",
        description: "Uma mesa livre para jogar cartas com os amigos, em tempo real.",
        lang: "pt-BR",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "any",
        background_color: FELT_DARK,
        theme_color: FELT_DARK,
        categories: ["games", "entertainment"],
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        // Guarda o app (HTML, JS, CSS, fonte, ícones) para abrir rápido e
        // funcionar sem rede até a tela de entrada. Os dados da sala nunca
        // passam pelo cache: o WebSocket e o Firebase são de outra origem e o
        // service worker não os intercepta.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));
