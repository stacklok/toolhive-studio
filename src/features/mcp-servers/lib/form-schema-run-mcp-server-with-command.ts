import z from "zod";

// TODO: Add secrets into the form schema
const commonFields = z.object({
  name: z.string().nonempty(),
  transport: z.union([z.literal("sse"), z.literal("stdio")]),
  cmd_arguments: z
    .string()
    .optional()
    .transform((val) => val?.split(" ")),
});

export const formSchemaRunMcpCommand = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("docker_image"),
      image: z.string().nonempty(),
    })
    .merge(commonFields),
  z
    .object({
      type: z.literal("package_manager"),
      protocol: z.union([z.literal("npx"), z.literal("uvx"), z.literal("go")]),
      package_name: z.string().min(1),
    })
    .merge(commonFields),
  // .and(commonFields),
  // TODO: When we figure out how to handle the GO protocol, we can bring this
  // back in
  //   z
  //     .object({
  //       protocol: z.literal("go"),
  //       cmd_arguments: z.array(z.string()),
  //     })
  //     .merge(commonFields),
]);

export type FormSchemaRunMcpCommand = z.infer<typeof formSchemaRunMcpCommand>;
