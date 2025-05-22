import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { App } from "../app";
import { renderWithProviders } from "@/common/test/render-with-provider";

it('should render "Hello, world!"', async () => {
  renderWithProviders(<App />);
  expect(screen.getByText("Hello, world!")).toBeVisible();
});
