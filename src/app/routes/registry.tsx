import { MCP_REGISTRY } from "@/common/constants/mcp-registry";
import { GridCardsMcpRegistryItems } from "@/features/mcp-registry/components/grid-cards-mcp-registry-items";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/registry")({
  component: RouteComponent,
});

function RouteComponent() {
  // const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false);

  // const { mutateAsync } = useToastMutation(postApiV1BetaServersMutation());

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="font-semibold text-3xl">Registry</h1>
        {/* <DropdownMenuRunMcpServer
          openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
          className="ml-auto"
        /> */}
        {/* <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
          onSubmit={(data) => {
            mutateAsync({
              body: data,
            });
          }}
        /> */}
      </div>
      <GridCardsMcpRegistryItems mcpRegistryItems={MCP_REGISTRY} />
    </>
  );
}
