import { buildCommand, buildRouteMap } from "@stricli/core";
import { runInteractiveConfig } from "@/config-manager";
import { showCommand } from "./show";

const configDefaultCommand = buildCommand({
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {},
  },
  docs: {
    brief: "Interactive configuration manager",
  },
  func: async () => {
    await runInteractiveConfig();
  },
});

export const configRoutes = buildRouteMap({
  routes: {
    show: showCommand,
  },
  docs: {
    brief: "Manage configuration",
  },
  defaultCommand: configDefaultCommand,
});
