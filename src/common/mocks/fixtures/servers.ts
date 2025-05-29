import type {
  V1ServerListResponse,
  RuntimeContainerInfo,
  V1CreateServerResponse,
} from "@/common/api/generated/types.gen";

export const MOCK_MCP_SERVERS = [
  {
    ID: "container-1",
    Name: "jupyter-notebook",
    Image: "jupyter/base-notebook:latest",
    State: "running",
    Status: "Up 2 hours",
    Created: "2024-01-15T10:30:00Z",
    Ports: [
      {
        containerPort: 8888,
        hostPort: 8888,
        protocol: "tcp",
      },
    ],
    Labels: {
      "toolhive.server": "jupyter-notebook",
      "toolhive.type": "notebook",
    },
  },
  {
    ID: "container-2",
    Name: "vscode-server",
    Image: "codercom/code-server:latest",
    State: "running",
    Status: "Up 1 hour",
    Created: "2024-01-15T11:30:00Z",
    Ports: [
      {
        containerPort: 8080,
        hostPort: 8080,
        protocol: "tcp",
      },
    ],
    Labels: {
      "toolhive.server": "vscode-server",
      "toolhive.type": "ide",
    },
  },
  {
    ID: "container-3",
    Name: "postgres-db",
    Image: "postgres:15",
    State: "stopped",
    Status: "Exited (0) 30 minutes ago",
    Created: "2024-01-15T09:00:00Z",
    Ports: [
      {
        containerPort: 5432,
        hostPort: 5432,
        protocol: "tcp",
      },
    ],
    Labels: {
      "toolhive.server": "postgres-db",
      "toolhive.type": "database",
    },
  },
  {
    ID: "container-4",
    Name: "redis-cache",
    Image: "redis:7-alpine",
    State: "running",
    Status: "Up 3 hours",
    Created: "2024-01-15T08:00:00Z",
    Ports: [
      {
        containerPort: 6379,
        hostPort: 6379,
        protocol: "tcp",
      },
    ],
    Labels: {
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
  return MOCK_MCP_SERVERS.find((server) => server.Name === name);
};
