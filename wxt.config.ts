import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: ["sidePanel"],
    host_permissions: ["http://localhost:3000/*", "http://127.0.0.1:3000/*"],
    action: {
      default_title: "打开侧边栏",
    },
    side_panel: {
      default_path: "sidepanel/index.html",
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
});
