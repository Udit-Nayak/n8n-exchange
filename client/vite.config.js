import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Suppress common WebSocket errors during development
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args[0]?.toString() || "";
  // Suppress WebSocket proxy errors that are expected during backend restarts
  if (
    msg.includes("ECONNABORTED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("EPIPE") ||
    msg.includes("ws proxy socket error")
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          // Suppress all proxy errors
          proxy.on("error", (err, req, res) => {
            // Silently ignore - these are expected during backend restarts
          });

          // Handle WebSocket proxy errors
          proxy.on("proxyReqWs", (proxyReq, req, socket, options, head) => {
            // Suppress socket errors on both client and proxy sockets
            socket.on("error", () => {
              // Silently ignore
            });
            proxyReq.on("error", () => {
              // Silently ignore
            });
          });
        },
      },
    },
  },
});
