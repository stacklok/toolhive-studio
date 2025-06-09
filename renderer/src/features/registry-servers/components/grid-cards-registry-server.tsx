import type { RegistryServer } from "@/common/api/generated/types.gen";
import { CardRegistryServer } from "./card-registry-server";
import { FormCatalogCreation } from "./form-catalog-creation";
import { useState, useMemo } from "react";
import { Input } from "@/common/components/ui/input";

export function GridCardsRegistryServer({
  servers,
  onSubmit,
}: {
  servers: RegistryServer[];
  onSubmit?: (
    server: RegistryServer,
    data: { name: string; envVars: { name: string; value: string }[] },
  ) => void;
}) {
  const [filter, setFilter] = useState("");
  const [selectedServer, setSelectedServer] = useState<RegistryServer | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredServers = useMemo(() => {
    const searchTerm = filter.toLowerCase();
    return servers
      .filter((server) => {
        const name = server.name?.toLowerCase() || "";
        const description = server.description?.toLowerCase() || "";
        return name.includes(searchTerm) || description.includes(searchTerm);
      })
      .sort((a, b) => {
        const nameA = a.name?.toLowerCase() || "";
        const nameB = b.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });
  }, [servers, filter]);

  const handleCardClick = (server: RegistryServer) => {
    setSelectedServer(server);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: {
    name: string;
    envVars: { name: string; value: string }[];
  }) => {
    if (selectedServer && onSubmit) {
      onSubmit(selectedServer, data);
    } else {
      // Fallback for when onSubmit is not provided
      console.log("Installing server:", {
        serverName: data.name,
        sourceServer: selectedServer,
        envVars: data.envVars,
      });
    }
  };

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
          <CardRegistryServer
            key={server.name}
            server={server}
            onClick={() => handleCardClick(server)}
          />
        ))}
      </div>
      {filteredServers.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-sm">
            No registry servers found matching the current filter
          </p>
        </div>
      )}

      <FormCatalogCreation
        key={selectedServer?.name}
        server={selectedServer}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
