import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var proxyTarget = (_b = env.VITE_API_PROXY_TARGET) !== null && _b !== void 0 ? _b : "http://localhost:8000";
    return {
        plugins: [react()],
        server: {
            port: 5173,
            open: true,
            proxy: {
                "/api": {
                    target: proxyTarget,
                    changeOrigin: true
                }
            }
        },
        preview: {
            port: 4173
        },
        build: {
            outDir: "dist",
            sourcemap: true
        },
        test: {
            globals: true,
            environment: "jsdom",
            setupFiles: "./src/setupTests.ts",
            pool: "threads",
            poolOptions: {
                threads: {
                    singleThread: true
                }
            },
            maxWorkers: 1,
            minWorkers: 1
        }
    };
});
