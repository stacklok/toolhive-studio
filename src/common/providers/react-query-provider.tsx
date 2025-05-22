import {
  QueryClient,
  QueryClientProvider as VendorQueryClientProvider,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({}));

  return (
    <VendorQueryClientProvider client={queryClient}>
      {children}
    </VendorQueryClientProvider>
  );
}
