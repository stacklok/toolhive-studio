import { Main } from "@/common/components/layout/main";
import { TopNav } from "@/common/components/layout/top-nav";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => (
    <>
      <TopNav />
      <Main>
        <Outlet />
        <TanStackRouterDevtools />
      </Main>
    </>
  ),
  errorComponent: ({ error }) => <div>{error.message}</div>,
});
