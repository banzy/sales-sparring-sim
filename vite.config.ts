import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend .env so proxy uses same PORT.
function loadBackendPort(): number {
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  try {
    const envPath = path.resolve(__dirname, "backend/.env");
    const env = readFileSync(envPath, "utf-8");
    const match = env.match(/^PORT=(.+)$/m);
    return match ? parseInt(match[1].trim(), 10) : 8000;
  } catch {
    return 8000;
  }
}
const backendPort = loadBackendPort();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": `http://127.0.0.1:${backendPort}`,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
