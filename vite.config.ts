import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
// @ts-expect-error The production server is plain ESM so it can run without a build step.
import { createJsonApiHandler } from "./server.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "json-data-api",
      configureServer(server) {
        server.middlewares.use(createJsonApiHandler());
      }
    }
  ],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"]
  }
});
