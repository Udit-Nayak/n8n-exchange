import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
          proxy.on("error", (err, req, res) => {
            console.log("🔌 Proxy error (this is normal during backend restart):", err.code);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            // Suppress normal proxy logs
          });
          proxy.on("proxyReqWs", (proxyReq, req, socket, options, head) => {
            socket.on("error", (err) => {
              console.log("🔌 WS socket error (backend may be restarting):", err.code);
            });
          });
        },
      },
    },
  },
});
