import { Button } from "@/common/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { ActionsMcpServer } from "./actions-mcp-server";
import { useMutationRestartServer } from "../hooks/useMutationRestartServer";
import { useMutationStopServer } from "../hooks/useMutationStopServer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";

export function DetailMcpServer({
  serverName,
  description,
  repo,
  state,
}: {
  serverName: string;
  description: string;
  repo: string;
  state: string;
}) {
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServer({
      name: serverName,
    });
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServer({
      name: serverName,
    });

  return (
    <div className="mt-8">
      <Tabs
        defaultValue="description"
        orientation="vertical"
        className="flex flex-row gap-8 w-full"
      >
        <TabsList className="flex flex-col h-fit w-48 space-y-1 bg-transparent p-0 shrink-0">
          <TabsTrigger
            value="health"
            className="w-full justify-start py-2 px-4 data-[state=active]:bg-gray-100 !shadow-none border-none hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Health
          </TabsTrigger>

          <TabsTrigger
            value="description"
            className="w-full justify-start py-2 px-4 data-[state=active]:bg-gray-100 !shadow-none border-none hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Description
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="health" className="mt-0 w-full">
            <div className="p-2">
              <div className="text-base text-muted-foreground">
                Server health information will be displayed here
              </div>
            </div>
          </TabsContent>

          <TabsContent value="description" className="mt-0 w-full">
            <div className="p-2 gap-6 flex flex-col">
              <div className="text-base text-muted-foreground">
                {description}
              </div>
              <div className="p-4 border border-border">
                <ActionsMcpServer
                  state={state}
                  isPending={isRestartPending || isStopPending}
                  mutate={() => {
                    const isRunning = state === "running";
                    if (isRunning) {
                      return stopMutate({
                        path: {
                          name: serverName,
                        },
                      });
                    }
                    return restartMutate({
                      path: {
                        name: serverName,
                      },
                    });
                  }}
                />
              </div>
              <div>
                <Button variant="outline" asChild>
                  <Link to={repo} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Github
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
