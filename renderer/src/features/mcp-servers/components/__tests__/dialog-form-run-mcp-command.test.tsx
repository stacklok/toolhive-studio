import { render } from "@testing-library/react";
import { screen } from "@testing-library/react";

import { it, vi } from "vitest";
import { DialogFormRunMcpServerWithCommand } from "../dialog-form-run-mcp-command";
import userEvent from "@testing-library/user-event";
import { Dialog } from "@/common/components/ui/dialog";

const onSubmitMock = vi.fn();

window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

it("should be able to run an MCP server while omitting optional fields", async () => {
  render(
    <Dialog open>
      <DialogFormRunMcpServerWithCommand
        isOpen
        onOpenChange={() => {}}
        onSubmit={onSubmitMock}
      />
    </Dialog>,
  );

  await userEvent.click(screen.getByRole("tab", { name: "Docker image" }));

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.type(
    screen.getByLabelText("Docker image"),
    "ghcr.io/github/github-mcp-server",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(onSubmitMock).toHaveBeenCalledWith({
    name: "foo-bar",
    transport: "stdio",
    image: "ghcr.io/github/github-mcp-server",
  });
});

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

  await userEvent.click(screen.getByRole("tab", { name: "Docker image" }));

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.type(
    screen.getByLabelText("Docker image"),
    "ghcr.io/github/github-mcp-server",
  );

  await userEvent.type(
    screen.getByLabelText("Command arguments"),
    "-y --oauth-setup",
  );

  await userEvent.click(
    screen.getByRole("button", { name: "Add environment variable" }),
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable key"),
    "MY_ENV_VAR",
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable value"),
    "123_FOO",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));

  const payload = onSubmitMock.mock.calls[0]?.[0];
  expect(payload).toBeDefined();
  expect(payload["name"], "Should have name").toBe("foo-bar");
  expect(payload["transport"], "Should have transport").toBe("stdio");
  expect(payload["image"], "Should have image").toBe(
    "ghcr.io/github/github-mcp-server",
  );
  expect(payload["cmd_arguments"], "Should have cmd_arguments").toEqual([
    "-y",
    "--oauth-setup",
  ]);
  expect(payload["env_vars"], "Should have env_vars").toEqual([
    "MY_ENV_VAR=123_FOO",
  ]);
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

  await userEvent.click(screen.getByRole("tab", { name: "Package manager" }));

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.click(screen.getByLabelText("Protocol"));
  await userEvent.click(screen.getByRole("option", { name: "npx" }));

  await userEvent.type(
    screen.getByLabelText("Package name"),
    "@modelcontextprotocol/server-everything",
  );

  await userEvent.type(
    screen.getByLabelText("Command arguments"),
    "-y --oauth-setup",
  );

  await userEvent.click(
    screen.getByRole("button", { name: "Add environment variable" }),
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable key"),
    "MY_ENV_VAR",
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable value"),
    "123_FOO",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));

  const payload = onSubmitMock.mock.calls[0]?.[0];
  expect(payload).toBeDefined();
  expect(payload["name"], "Should have name").toBe("foo-bar");
  expect(payload["transport"], "Should have transport").toBe("stdio");
  expect(payload["image"], "Should have image").toBe(
    "npx://@modelcontextprotocol/server-everything",
  );
  expect(payload["cmd_arguments"], "Should have cmd_arguments").toEqual([
    "-y",
    "--oauth-setup",
  ]);
  expect(payload["env_vars"], "Should have env_vars").toEqual([
    "MY_ENV_VAR=123_FOO",
  ]);
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

  await userEvent.click(screen.getByRole("tab", { name: "Package manager" }));

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.click(screen.getByLabelText("Protocol"));
  await userEvent.click(screen.getByRole("option", { name: "uvx" }));

  await userEvent.type(
    screen.getByLabelText("Package name"),
    "mcp-server-fetch",
  );

  await userEvent.type(
    screen.getByLabelText("Command arguments"),
    "-y --oauth-setup",
  );

  await userEvent.click(
    screen.getByRole("button", { name: "Add environment variable" }),
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable key"),
    "MY_ENV_VAR",
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable value"),
    "123_FOO",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));

  const payload = onSubmitMock.mock.calls[0]?.[0];
  expect(payload).toBeDefined();
  expect(payload["name"], "Should have name").toBe("foo-bar");
  expect(payload["transport"], "Should have transport").toBe("stdio");
  expect(payload["image"], "Should have image").toBe("uvx://mcp-server-fetch");
  expect(payload["cmd_arguments"], "Should have cmd_arguments").toEqual([
    "-y",
    "--oauth-setup",
  ]);
  expect(payload["env_vars"], "Should have env_vars").toEqual([
    "MY_ENV_VAR=123_FOO",
  ]);
});

it("should be able to run an MCP server with go", async () => {
  render(
    <Dialog open>
      <DialogFormRunMcpServerWithCommand
        isOpen
        onOpenChange={() => {}}
        onSubmit={onSubmitMock}
      />
    </Dialog>,
  );

  await userEvent.click(screen.getByRole("tab", { name: "Package manager" }));

  await userEvent.type(screen.getByLabelText("Name"), "foo-bar");

  await userEvent.click(screen.getByLabelText("Transport"));
  await userEvent.click(screen.getByRole("option", { name: "stdio" }));

  await userEvent.click(screen.getByLabelText("Protocol"));
  await userEvent.click(screen.getByRole("option", { name: "go" }));

  await userEvent.type(
    screen.getByLabelText("Package name"),
    "github.com/example/go-mcp-server",
  );

  await userEvent.type(
    screen.getByLabelText("Command arguments"),
    "-y --oauth-setup",
  );

  await userEvent.click(
    screen.getByRole("button", { name: "Add environment variable" }),
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable key"),
    "MY_ENV_VAR",
  );
  await userEvent.type(
    screen.getByLabelText("Environment variable value"),
    "123_FOO",
  );

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));

  const payload = onSubmitMock.mock.calls[0]?.[0];
  expect(payload).toBeDefined();
  expect(payload["name"], "Should have name").toBe("foo-bar");
  expect(payload["transport"], "Should have transport").toBe("stdio");
  expect(payload["image"], "Should have image").toBe(
    "go://github.com/example/go-mcp-server",
  );
  expect(payload["cmd_arguments"], "Should have cmd_arguments").toEqual([
    "-y",
    "--oauth-setup",
  ]);
  expect(payload["env_vars"], "Should have env_vars").toEqual([
    "MY_ENV_VAR=123_FOO",
  ]);
});
