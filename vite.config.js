import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function copyOptionalLocalConfig() {
  return {
    name: "copy-optional-local-config",
    closeBundle() {
      const source = path.resolve("config/local-config.js");
      const targetDir = path.resolve("dist/config");
      const target = path.join(targetDir, "local-config.js");

      fs.mkdirSync(targetDir, { recursive: true });

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        return;
      }

      fs.writeFileSync(target, "window.LECTURE_ASSISTANT_LOCAL_CONFIG = window.LECTURE_ASSISTANT_LOCAL_CONFIG || {};\n");
    },
  };
}

export default defineConfig({
  plugins: [react(), copyOptionalLocalConfig()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
