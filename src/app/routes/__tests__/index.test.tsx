import { screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { Index } from "../index";
import { renderRoute } from "@/common/test/render-route";
import { createTestRouter } from "@/common/test/create-test-router";
import { MOCK_MCP_SERVERS } from "@/common/mocks/fixtures/servers";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMutationRestartServer } from "@/features/mcp-servers/hooks/use-mutation-restart-server";
import { useMutationStopServer } from "@/features/mcp-servers/hooks/use-mutation-stop-server";
import userEvent from "@testing-library/user-event";

const router = createTestRouter(Index);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

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
      screen.getByRole("button", {
        name: /add a tool/i,
      }),
    ).toBeVisible();
  });

  await userEvent.click(
    screen.getByRole("button", {
      name: /add a tool/i,
    }),
  );
  await waitFor(() => {
    expect(screen.getByRole("menu")).toBeVisible();
  });
  expect(
    screen.getByRole("menuitem", { name: "From the Store" }),
  ).toBeVisible();
  expect(
    screen.getByRole("menuitem", { name: "Custom MCP server" }),
  ).toBeVisible();
});

it("should provide restart server mutation", async () => {
  const serverName = "jupyter-notebook";
  const { result } = renderHook(
    () => useMutationRestartServer({ name: serverName }),
    { wrapper: createWrapper() },
  );

  expect(result.current).toBeDefined();
  expect(typeof result.current.mutateAsync).toBe("function");
  expect(result.current.isPending).toBe(false);
});

it("should provide stop server mutation", async () => {
  const serverName = "jupyter-notebook";
  const { result } = renderHook(
    () => useMutationStopServer({ name: serverName }),
    { wrapper: createWrapper() },
  );

  expect(result.current).toBeDefined();
  expect(typeof result.current.mutateAsync).toBe("function");
  expect(result.current.isPending).toBe(false);
});
