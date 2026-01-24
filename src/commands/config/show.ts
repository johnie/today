import { buildCommand } from "@stricli/core";
import { showConfig } from "@/config-manager";

export const showCommand = buildCommand({
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {},
  },
  docs: {
    brief: "Display current configuration",
  },
  func: async () => {
    await showConfig();
  },
});
