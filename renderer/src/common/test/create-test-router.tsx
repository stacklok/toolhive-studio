import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from "@tanstack/react-router";
import type { JSX } from "react";

export function createTestRouter(component: () => JSX.Element) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  });

  const componentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component,
  });

  const router = new Router({
    routeTree: rootRoute.addChildren([componentRoute]),
    history: createMemoryHistory(),
  });

  return router;
}
