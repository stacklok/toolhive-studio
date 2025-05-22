import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClientProvider } from "./common/providers/react-query-provider";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider>
      <App />
      <ReactQueryDevtools initialIsOpen={false} position="left" />
    </QueryClientProvider>
  </StrictMode>,
);
