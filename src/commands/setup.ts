import { buildCommand } from "@stricli/core";
import { runSetup } from "@/config";

export const setupCommand = buildCommand({
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {},
  },
  docs: {
    brief: "Run the configuration setup wizard",
  },
  func: async () => {
    await runSetup();
  },
});
