import z from "zod/v4";

// TODO: Add secrets into the form schema
const commonFields = z.object({
  name: z.string().nonempty(),
  transport: z.union([z.literal("sse"), z.literal("stdio")]),
  cmd_arguments: z.string().optional(),
});

export const formSchemaRunMcpCommand = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("docker_image"),
    image: z.string().nonempty(),
    ...commonFields.shape,
  }),
  z.object({
    type: z.literal("package_manager"),
    protocol: z.union([z.literal("npx"), z.literal("uvx"), z.literal("go")]),
    package_name: z.string().min(1),
    ...commonFields.shape,
  }),
]);

export type FormSchemaRunMcpCommand = z.infer<typeof formSchemaRunMcpCommand>;
