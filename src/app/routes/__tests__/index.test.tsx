import { screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { Index } from "../index";
import userEvent from "@testing-library/user-event";
import { renderRoute } from "@/common/test/render-route";
import { createTestRouter } from "@/common/test/create-test-router";
import { MOCK_MCP_SERVERS } from "@/common/mocks/fixtures/servers";

const router = createTestRouter(Index);

it("should render list of MCP servers", async () => {
  renderRoute(router);
  await waitFor(() => {
    for (const mcpServer of MOCK_MCP_SERVERS) {
      expect(
        screen.queryByText(mcpServer.Name),
        `Expected ${mcpServer.Name} to be in the document`,
      ).toBeVisible();
    }
  });
});

it("should contain the menu to run an MCP server", async () => {
  renderRoute(router);
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Run MCP server" }),
    ).toBeVisible();
  });

  await userEvent.click(screen.getByRole("button", { name: "Run MCP server" }));
  await waitFor(() => {
    expect(screen.getByRole("menu")).toBeVisible();
  });
  expect(
    screen.getByRole("menuitem", { name: "From the registry" }),
  ).toBeVisible();
  expect(
    screen.getByRole("menuitem", { name: "Custom MCP server" }),
  ).toBeVisible();
});

it("should be able to launch a dialog to run an MCP server with a command", async () => {
  renderRoute(router);

  await waitFor(async () => {
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Run MCP server" }),
      ).toBeVisible();
    });
  });
  await userEvent.click(screen.getByRole("button", { name: "Run MCP server" }));
  await userEvent.click(
    screen.getByRole("menuitem", { name: "Custom MCP server" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Custom MCP server" }),
  ).toBeVisible();
});
