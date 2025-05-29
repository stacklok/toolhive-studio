import z from "zod";

// TODO: Add secrets into the form schema
const commonFields = z.object({
  name: z.string().min(1),
  transport: z.union([z.literal("sse"), z.literal("stdio")]),
});

export const formSchemaRunMcpCommand = z.discriminatedUnion("command", [
  z
    .object({
      command: z.literal("docker_run"),

      image: z.string(),
    })
    .merge(commonFields),
  z
    .object({
      command: z.literal("npx"),
      cmd_arguments: z.string().transform((val) => val.split(" ")),
    })
    .merge(commonFields),
  z
    .object({
      command: z.literal("uvx"),
      cmd_arguments: z.string().transform((val) => val.split(" ")),
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
