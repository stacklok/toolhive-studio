import { it, expect } from "vitest";
import { formSchemaRunMcpCommand } from "../form-schema-run-mcp-server-with-command";

it("passes with valid docker image", () => {
  const validInput = {
    name: "github",
    transport: "stdio",
    command: "docker_run",
    image: "ghcr.io/github/github-mcp-server",
  };

  const result = formSchemaRunMcpCommand.safeParse(validInput);
  expect(result.success, `${result.error}`).toBe(true);
});

it("passes with valid npx command", () => {
  const validInput = {
    name: "github",
    transport: "stdio",
    command: "npx",
    cmd_arguments: ["-y", "@modelcontextprotocol/server-everything"],
  };

  const result = formSchemaRunMcpCommand.safeParse(validInput);
  expect(result.success, `${result.error}`).toBe(true);
});

it("passes with valid uvx command", () => {
  const validInput = {
    name: "github",
    transport: "stdio",
    command: "uvx",
    cmd_arguments: ["mcp-server-fetch"],
  };

  const result = formSchemaRunMcpCommand.safeParse(validInput);
  expect(result.success, `${result.error}`).toBe(true);
});

it("fails when name is empty", () => {
  const invalidInput = {
    name: "",
    transport: "sse",
    command: "docker_run",
    image: "https://example.com/image",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.success, `${result.error}`).toBe(false);
});

it("fails when transport is empty", () => {
  const invalidInput = {
    name: "test-server",
    transport: "",
    command: "docker_run",
    image: "https://example.com/image",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.success, `${result.error}`).toBe(false);
});

it("fails when transport is invalid", () => {
  const invalidInput = {
    name: "test-server",
    transport: "foobar",
    command: "docker_run",
    image: "https://example.com/image",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.success, `${result.error}`).toBe(false);
});

it("fails when command is empty", () => {
  const invalidInput = {
    name: "test-server",
    transport: "sse",
    command: "",
    image: "https://example.com/image",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.success, `${result.error}`).toBe(false);
});

it("fails when protocol is invalid", () => {
  const invalidInput = {
    name: "test-server",
    transport: "sse",
    command: "foobar",
    image: "https://example.com/image",
  };

  const result = formSchemaRunMcpCommand.safeParse(invalidInput);
  expect(result.success, `${result.error}`).toBe(false);
});
