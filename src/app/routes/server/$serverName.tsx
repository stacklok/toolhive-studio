import { getApiV1BetaServersByNameOptions } from "@/common/api/generated/@tanstack/react-query.gen";
import { Button } from "@/common/components/ui/button";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Github, Plus } from "lucide-react";

export const Route = createFileRoute("/server/$serverName")({
  component: RouteComponent,
  loader: ({ context: { queryClient }, params: { serverName } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaServersByNameOptions({
        path: { name: serverName },
      }),
    ),
  gcTime: 0,
  shouldReload: false,
});

function RouteComponent() {
  const { serverName } = Route.useParams();
  const { data } = useSuspenseQuery(
    getApiV1BetaServersByNameOptions({
      path: { name: serverName },
    }),
  );

  const serverData = JSON.parse(data as string);
  const description = serverData.Labels["org.opencontainers.image.description"];
  const repo = serverData.Labels["org.opencontainers.image.source"];

  const [activeTab, setActiveTab] = useState<
    "health" | "configuration" | "description"
  >("description");

  return (
    <div>
      <h2 className="text-2xl font-bold">{serverData.Name}</h2>
      <div className="text-muted-foreground">{description}</div>

      <div className="flex gap-2 mt-4">
        <Button variant="default">
          <Plus /> Install tool
        </Button>
        <Button variant="outline" asChild>
          <Link to={repo} target="_blank" rel="noopener noreferrer">
            <Github /> Github
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <div className="flex gap-8">
          <div className="flex flex-col w-48 space-y-1">
            <button
              onClick={() => setActiveTab("health")}
              className={`w-full text-left py-3 px-4 rounded-md transition-colors ${
                activeTab === "health"
                  ? "bg-gray-100 text-black"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Health
            </button>
            <button
              onClick={() => setActiveTab("configuration")}
              className={`w-full text-left py-3 px-4 rounded-md transition-colors ${
                activeTab === "configuration"
                  ? "bg-gray-100 text-black"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab("description")}
              className={`w-full text-left py-3 px-4 rounded-md transition-colors ${
                activeTab === "description"
                  ? "bg-gray-100 text-black"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Description
            </button>
          </div>

          <div className="flex-1">
            {activeTab === "health" && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div>Server health information will be displayed here</div>
              </div>
            )}

            {activeTab === "configuration" && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div>Server configuration will be displayed here</div>
              </div>
            )}

            {activeTab === "description" && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div>{description}</div>
                <div className="mt-4 text-xs text-gray-500">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(serverData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
