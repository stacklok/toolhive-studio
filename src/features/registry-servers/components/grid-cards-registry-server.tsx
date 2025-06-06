import type { RegistryServer } from "@/common/api/generated/types.gen";
import { CardRegistryServer } from "./card-registry-server";
import { useState, useMemo } from "react";
import { Input } from "@/common/components/ui/input";

export function GridCardsRegistryServer({
  servers,
}: {
  servers: RegistryServer[];
}) {
  const [filter, setFilter] = useState("");

  const filteredServers = useMemo(() => {
    const searchTerm = filter.toLowerCase();
    return servers.filter((server) => {
      const name = server.name?.toLowerCase() || "";
      const description = server.description?.toLowerCase() || "";
      return name.includes(searchTerm) || description.includes(searchTerm);
    });
  }, [servers, filter]);

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <Input
          type="text"
          placeholder="Filter by name or description..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredServers.map((server) => (
          <CardRegistryServer key={server.name} server={server} />
        ))}
      </div>
      {filteredServers.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-sm">
            No registry servers found matching the current filter
          </p>
        </div>
      )}
    </div>
  );
}
