import { client } from "./common/api/generated/client.gen";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./app/route-tree.gen";

import "./index.css";
import { QueryClient } from "@tanstack/react-query";

// @tanstack/react-router setup
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
const router = createRouter({
  routeTree,
  context: { queryClient: new QueryClient({}) },
});

// @hey-api/openapi-ts setup
const baseUrl = import.meta.env.VITE_BASE_API_URL || "";
client.setConfig({
  baseUrl,
});

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
