import { type RenderOptions, render } from "@testing-library/react";
import React from "react";
import type { MemoryRouterProps } from "react-router-dom";
import { TestProvider } from "./test-provider";

type RouteConfig = {
  routeConfig?: MemoryRouterProps;
  pathConfig?: string;
};

export function renderWithProviders(
  children: React.ReactNode,
  options?: Omit<RenderOptions, "queries"> & RouteConfig,
) {
  return render(<TestProvider options={options}>{children}</TestProvider>);
}
