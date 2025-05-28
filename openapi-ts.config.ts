import { defineConfig, defaultPlugins } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "src/common/api/openapi.json",
  output: {
    case: undefined,
    path: "src/common/api/generated",
    format: "prettier",
    lint: "eslint",
  },
  plugins: [
    ...defaultPlugins,
    "@hey-api/client-fetch",
    "@tanstack/react-query",
    {
      name: "@hey-api/typescript",
      enums: false,
    },
    {
      asClass: false, // default
      name: "@hey-api/sdk",
    },
  ],
});
