import { client } from "./common/api/generated/client.gen";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./app/route-tree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Toaster } from "./common/components/ui/sonner";

import "./index.css";

// @tanstack/react-router setup
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
const queryClient = new QueryClient({});
const router = createRouter({
  routeTree,
  context: { queryClient },
});

// @hey-api/openapi-ts setup
const baseUrl = import.meta.env.VITE_BASE_API_URL || "http://localhost:8080";
client.setConfig({
  baseUrl,
});

const rootElement = document.getElementById("root")!;
console.log("rendering app", "baseUrl:", baseUrl, rootElement);
const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
     <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <Toaster />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
