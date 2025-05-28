import { screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { Index } from "../routes/index";

import { renderRoute } from "@/common/test/render-route";
import { createTestRouter } from "@/common/test/create-test-router";
import { MOCK_MCP_SERVERS } from "@/common/mocks/fixtures/servers";

const router = createTestRouter(Index);

it("should render list of MCP servers", async () => {
  renderRoute(router);
  await waitFor(() => {
    for (const mcpServer of MOCK_MCP_SERVERS) {
      expect(screen.queryByText(mcpServer.name)).toBeInTheDocument();
    }
  });
});
