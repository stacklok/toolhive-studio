import type {
  V1ServerListResponse,
  RuntimeContainerInfo,
  V1CreateServerResponse,
} from "@/common/api/generated/types.gen";

export const MOCK_MCP_SERVERS = [
  {
    id: "container-1",
    name: "jupyter-notebook",
    image: "jupyter/base-notebook:latest",
    state: "running",
    status: "Up 2 hours",
    created: "2024-01-15T10:30:00Z",
    ports: [
      {
        containerPort: 8888,
        hostPort: 8888,
        protocol: "tcp",
      },
    ],
    labels: {
      "toolhive.server": "jupyter-notebook",
      "toolhive.type": "notebook",
    },
  },
  {
    id: "container-2",
    name: "vscode-server",
    image: "codercom/code-server:latest",
    state: "running",
    status: "Up 1 hour",
    created: "2024-01-15T11:30:00Z",
    ports: [
      {
        containerPort: 8080,
        hostPort: 8080,
        protocol: "tcp",
      },
    ],
    labels: {
      "toolhive.server": "vscode-server",
      "toolhive.type": "ide",
    },
  },
  {
    id: "container-3",
    name: "postgres-db",
    image: "postgres:15",
    state: "stopped",
    status: "Exited (0) 30 minutes ago",
    created: "2024-01-15T09:00:00Z",
    ports: [
      {
        containerPort: 5432,
        hostPort: 5432,
        protocol: "tcp",
      },
    ],
    labels: {
      "toolhive.server": "postgres-db",
      "toolhive.type": "database",
    },
  },
  {
    id: "container-4",
    name: "redis-cache",
    image: "redis:7-alpine",
    state: "running",
    status: "Up 3 hours",
    created: "2024-01-15T08:00:00Z",
    ports: [
      {
        containerPort: 6379,
        hostPort: 6379,
        protocol: "tcp",
      },
    ],
    labels: {
      "toolhive.server": "redis-cache",
      "toolhive.type": "cache",
    },
  },
] as const satisfies RuntimeContainerInfo[];

export const serverListFixture: V1ServerListResponse = {
  servers: MOCK_MCP_SERVERS,
};

export const createServerResponseFixture: V1CreateServerResponse = {
  name: "new-server",
  port: 8080,
};

// Helper function to get a server by name
export const getServerByName = (
  name: string,
): RuntimeContainerInfo | undefined => {
  return MOCK_MCP_SERVERS.find((server) => server.name === name);
};
