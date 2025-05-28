import type { RuntimeContainerInfo } from "@/common/api/generated";
import { CardMcpServer } from "./card-mcp-server";

export function GridCardsMcpServers({
  mcpServers,
}: {
  mcpServers: RuntimeContainerInfo[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {mcpServers.map((mcpServer) => (
        <CardMcpServer
          key={mcpServer.ID}
          image={mcpServer.Image}
          name={mcpServer.Name}
          state={mcpServer.State}
          status={mcpServer.Status}
        />
      ))}
    </div>
  );
}
