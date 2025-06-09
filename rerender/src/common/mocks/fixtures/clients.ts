import type {
  ClientMcpClientStatus,
  V1ClientStatusResponse,
} from "@/common/api/generated";

const MOCK_CLIENTS = [
  { client_type: "roo-code", installed: false, registered: false },
  { client_type: "cline", installed: true, registered: false },
  { client_type: "vscode-insider", installed: true, registered: false },
  { client_type: "vscode", installed: true, registered: false },
  { client_type: "cursor", installed: true, registered: false },
  { client_type: "claude-code", installed: true, registered: false },
] as const satisfies ClientMcpClientStatus[];

export const clientsFixture: V1ClientStatusResponse = {
  clients: MOCK_CLIENTS,
};
