import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "src") },
    },
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        css: {
            // Los CSS modules conservan el nombre de clase (styles.mobileCards → "mobileCards")
            modules: { classNameStrategy: "non-scoped" },
        },
        restoreMocks: true,
        // Los tests de componentes con user-event pueden tardar en equipos lentos o con varios archivos en paralelo
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
