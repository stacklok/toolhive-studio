import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(async () => {
  const { default: tailwindcss } = await import("@tailwindcss/vite");
  const { TanStackRouterVite } = await import("@tanstack/router-plugin/vite");

  return {
    root: __dirname,
    build: {
      outDir: path.resolve(__dirname, "../.vite/renderer/main_window"),
    },
    plugins: [
      TanStackRouterVite({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: path.resolve(__dirname, "./src/routes"),
        generatedRouteTree: path.resolve(__dirname, "./src/route-tree.gen.ts"),
        quoteStyle: "double",
        routeFileIgnorePattern: "__tests__",
      }),
      react(),
      tailwindcss(), // now loaded via dynamic import → no require() conflict
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
