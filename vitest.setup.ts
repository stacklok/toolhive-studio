import * as testingLibraryMatchers from "@testing-library/jest-dom/matchers";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, beforeAll, vi, afterAll } from "vitest";
import failOnConsole from "vitest-fail-on-console";
import { client } from "./src/common/api/generated/client.gen";
import { server } from "./src/common/mocks/node";

expect.extend(testingLibraryMatchers);

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });
  client.setConfig({
    baseUrl: "https://foo.bar.com",
    fetch,
  });
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

const SILENCED_MESSAGES = ["Not implemented: navigation (except hash changes)"];

failOnConsole({
  shouldFailOnDebug: false,
  shouldFailOnError: true,
  shouldFailOnInfo: false,
  shouldFailOnLog: false,
  shouldFailOnWarn: true,
  silenceMessage: (message: string) => {
    return SILENCED_MESSAGES.some((m) => message.includes(m));
  },
});
