import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend .env so proxy uses same PORT.
function loadBackendPort(): number {
  const explicitPort =
    process.env.VITE_BACKEND_PORT ||
    process.env.BACKEND_PORT ||
    process.env.PORT;
  if (explicitPort && !Number.isNaN(parseInt(explicitPort, 10))) {
    return parseInt(explicitPort, 10);
  }

  try {
    const envPath = path.resolve(__dirname, "backend/.env");
    const env = readFileSync(envPath, "utf-8");
    const match = env.match(/^\s*PORT\s*=\s*(.+)\s*$/m);
    return match ? parseInt(match[1].trim(), 10) : 8090;
  } catch {
    return 8090;
  }
}
const backendPort = loadBackendPort();
console.log(`[vite] API proxy target: http://127.0.0.1:${backendPort}`);

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
