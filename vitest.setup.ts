// import { server } from './src/mocks/msw/node'
import * as testingLibraryMatchers from "@testing-library/jest-dom/matchers";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, beforeAll, vi } from "vitest";
import failOnConsole from "vitest-fail-on-console";
import { client } from "./src/common/api/generated/client.gen";

expect.extend(testingLibraryMatchers);

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  // server.listen({
  //   onUnhandledRequest: 'error',
  // })
  client.setConfig({
    baseUrl: "https://foo.bar.com", // In some cases, node-fetch will not work without a valid base URL
    fetch,
  });
});
afterEach(() => {
  // server.resetHandlers();
  vi.clearAllMocks();
});
// afterAll(() => server.close());

const SILENCED_MESSAGES = [
  "Not implemented: navigation (except hash changes)", // React Router specific bug, which can be safely ignored
];

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
