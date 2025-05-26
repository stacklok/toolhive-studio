export const openapiFixture = {
  openapi: "3.1.0",
  info: {
    title: "ToolHive API (Mock)",
    version: "1.0.0",
    description: "Mock API for ToolHive development",
  },
  servers: [
    {
      url: "http://localhost:5173/api",
      description: "Development server with MSW",
    },
  ],
  paths: {
    "/v1beta/version": {
      get: {
        summary: "Get server version",
        operationId: "getVersion",
        responses: {
          "200": {
            description: "Version information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    version: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1beta/servers": {
      get: {
        summary: "List all servers",
        operationId: "listServers",
        responses: {
          "200": {
            description: "List of servers",
          },
        },
      },
      post: {
        summary: "Create a new server",
        operationId: "createServer",
        responses: {
          "201": {
            description: "Server created",
          },
        },
      },
    },
  },
};
