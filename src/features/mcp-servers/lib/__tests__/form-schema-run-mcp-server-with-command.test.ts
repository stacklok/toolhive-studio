import { it, expect } from "vitest";
import { formSchemaRunMcpCommand } from "../form-schema-run-mcp-server-with-command";

it("passes with valid docker image", () => {
  const validInput = {
    name: "github",
    transport: "stdio",
    type: "docker_image",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(validInput);
  expect(result.success, `${result.error}`).toBe(true);
  expect(result.data).toStrictEqual({
    name: "github",
    transport: "stdio",
    type: "docker_image",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: ["-y", "--oauth-setup"],
  });
});

it("passes with valid npx command", () => {
  const validInput = {
    name: "server-everything",
    transport: "stdio",
    type: "package_manager",
    protocol: "npx",
    package_name: "server-everything",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(validInput);
  expect(result.success, `${result.error}`).toBe(true);
  expect(result.data).toStrictEqual({
    name: "server-everything",
    transport: "stdio",
    type: "package_manager",
    protocol: "npx",
    package_name: "server-everything",
    cmd_arguments: ["-y", "--oauth-setup"],
  });
});

it("passes with valid uvx command", () => {
  const validInput = {
    name: "fetch",
    transport: "stdio",
    type: "package_manager",
    protocol: "uvx",
    package_name: "mcp-server-fetch",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(validInput);
  expect(result.success, `${result.error}`).toBe(true);
  // NOTE: cmd_arguments is transformed to an array
  expect(result.data).toStrictEqual({
    name: "fetch",
    transport: "stdio",
    type: "package_manager",
    protocol: "uvx",
    package_name: "mcp-server-fetch",
    cmd_arguments: ["-y", "--oauth-setup"],
  });
});

it("fails when name is empty", () => {
  const invalidInput = {
    name: "",
    transport: "stdio",
    type: "docker_image",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        name: ["String must contain at least 1 character(s)"],
      }),
    }),
  );
});

it("fails when transport is empty", () => {
  const invalidInput = {
    name: "github",
    transport: "",
    type: "docker_image",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        transport: ["Invalid input"],
      }),
    }),
  );
});

it("fails when transport is invalid", () => {
  const invalidInput = {
    name: "github",
    transport: "foobar",
    type: "docker_image",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        transport: ["Invalid input"],
      }),
    }),
  );
});

it("fails when type is empty", () => {
  const invalidInput = {
    name: "github",
    transport: "stdio",
    type: "",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        type: [
          "Invalid discriminator value. Expected 'docker_image' | 'package_manager'",
        ],
      }),
    }),
  );
});

it("fails when type is invalid", () => {
  const invalidInput = {
    name: "github",
    transport: "stdio",
    type: "foobar",
    image: "ghcr.io/github/github-mcp-server",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        type: [
          "Invalid discriminator value. Expected 'docker_image' | 'package_manager'",
        ],
      }),
    }),
  );
});

it("docker > fails when image is empty", () => {
  const invalidInput = {
    name: "github",
    transport: "foobar",
    type: "docker_image",
    image: "",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        image: ["String must contain at least 1 character(s)"],
      }),
    }),
  );
});

it("package_manager > fails when protocol is empty", () => {
  const invalidInput = {
    name: "fetch",
    transport: "stdio",
    type: "package_manager",
    protocol: "",
    package_name: "mcp-server-fetch",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        protocol: ["Invalid input"],
      }),
    }),
  );
});

it("package_manager > fails when protocol is invalid", () => {
  const invalidInput = {
    name: "fetch",
    transport: "stdio",
    type: "package_manager",
    protocol: "foobar",
    package_name: "mcp-server-fetch",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        protocol: ["Invalid input"],
      }),
    }),
  );
});

it("package_manager > fails when package_name is empty", () => {
  const invalidInput = {
    name: "fetch",
    transport: "stdio",
    type: "package_manager",
    protocol: "uvx",
    package_name: "",
    cmd_arguments: "-y --oauth-setup",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.error?.flatten(), `${result.error}`).toStrictEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({
        package_name: ["String must contain at least 1 character(s)"],
      }),
    }),
  );
});
