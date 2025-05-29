import { render } from "@testing-library/react";
import { screen } from "@testing-library/react";

import { it, vi } from "vitest";
import { DialogFormRunMcpServerWithCommand } from "../dialog-form-run-mcp-command";
import userEvent from "@testing-library/user-event";
import { Dialog } from "@/common/components/ui/dialog";

const onSubmitMock = vi.fn();

window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// afterEach(() => {
//   onSubmit.mockClear();
// });

it("should be able to run an MCP server with docker", async () => {
  render(
    <Dialog open>
      <DialogFormRunMcpServerWithCommand
        isOpen
        onOpenChange={() => {}}
        onSubmit={onSubmitMock}
      />
    </Dialog>,
  );

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.click(screen.getByLabelText("Command"));
  await userEvent.click(screen.getByRole("option", { name: "docker run" }));

  await userEvent.type(
    screen.getByLabelText("Docker image"),
    "ghcr.io/github/github-mcp-server",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(onSubmitMock).toHaveBeenCalledWith(
    {
      name: "foo-bar",
      transport: "stdio",
      image: "ghcr.io/github/github-mcp-server",
    },
    expect.anything(),
  );
});

it("should be able to run an MCP server with npx", async () => {
  render(
    <Dialog open>
      <DialogFormRunMcpServerWithCommand
        isOpen
        onOpenChange={() => {}}
        onSubmit={onSubmitMock}
      />
    </Dialog>,
  );

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.click(screen.getByLabelText("Command"));
  await userEvent.click(screen.getByRole("option", { name: "npx" }));

  await userEvent.type(
    screen.getByLabelText("Command arguments"),
    "-y @modelcontextprotocol/server-everything",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(onSubmitMock).toHaveBeenCalledWith(
    {
      name: "foo-bar",
      transport: "stdio",
      command: "npx",
      cmd_arguments: ["-y", "@modelcontextprotocol/server-everything"],
    },
    expect.anything(),
  );
});

it("should be able to run an MCP server with uvx", async () => {
  render(
    <Dialog open>
      <DialogFormRunMcpServerWithCommand
        isOpen
        onOpenChange={() => {}}
        onSubmit={onSubmitMock}
      />
    </Dialog>,
  );

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.click(screen.getByLabelText("Command"));
  await userEvent.click(screen.getByRole("option", { name: "uvx" }));

  await userEvent.type(
    screen.getByLabelText("Command arguments"),
    "mcp-server-fetch",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(onSubmitMock).toHaveBeenCalledWith(
    {
      name: "foo-bar",
      transport: "stdio",
      command: "uvx",
      cmd_arguments: ["mcp-server-fetch"],
    },
    expect.anything(),
  );
});
