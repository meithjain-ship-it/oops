import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Lets tests import files the same way the app does ("@/lib/...").
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
