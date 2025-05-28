import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions } from "@testing-library/react";
import { type ReactNode } from "react";
import {
  MemoryRouter,
  type MemoryRouterProps,
  Route,
  Routes,
} from "react-router-dom";

type RouteConfig = {
  routeConfig?: MemoryRouterProps;
  pathConfig?: string;
};

const TestQueryClientProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              refetchOnMount: true,
              refetchOnReconnect: true,
              refetchOnWindowFocus: true,
              gcTime: 0,
              staleTime: 0,
            },
          },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
};

export function TestProvider({
  children,
  options,
}: {
  children: ReactNode;
  options?: Omit<RenderOptions, "queries"> & RouteConfig;
}) {
  return (
    <TestQueryClientProvider>
      <MemoryRouter {...options?.routeConfig}>
        <Routes>
          <Route path={options?.pathConfig ?? "*"} element={children} />
        </Routes>
      </MemoryRouter>
    </TestQueryClientProvider>
  );
}
