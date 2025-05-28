import {
  createMemoryHistory,
  Outlet,
  RootRoute,
  Route,
  Router,
} from "@tanstack/react-router";
import type { JSX } from "react";

export function createTestRouter(component: () => JSX.Element) {
  const rootRoute = new RootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  });

  const componentRoute = new Route({
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
