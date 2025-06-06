import { client } from "./common/api/generated/client.gen";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { routeTree } from "./app/route-tree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Toaster } from "./common/components/ui/sonner";
import { ThemeProvider } from "./common/components/theme/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import "./index.css";

// @tanstack/react-router setup
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const memoryHistory = createMemoryHistory({
  initialEntries: ["/"],
});

const queryClient = new QueryClient({});
const router = createRouter({
  routeTree,
  context: { queryClient },
  history: memoryHistory,
});

if (!window.electronAPI || !window.electronAPI.getToolhivePort) {
  console.error("ToolHive port API not available in renderer");
}

(async () => {
  try {
    const port = await window.electronAPI.getToolhivePort();
    const baseUrl = `http://localhost:${port}`;
    client.setConfig({ baseUrl });
  } catch (e) {
    console.error("Failed to get ToolHive port from main process", e);
    throw e;
  }

  const rootElement = document.getElementById("root")!;
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="toolhive-ui-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            <Toaster />
            <RouterProvider router={router} />
          </TooltipProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
})();
