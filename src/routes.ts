import { buildRouteMap } from "@stricli/core";
import { configRoutes } from "./commands/config";
import { defaultCommand } from "./commands/default";
import { setupCommand } from "./commands/setup";

export const routes = buildRouteMap({
  routes: {
    setup: setupCommand,
    config: configRoutes,
  },
  docs: {
    brief: "Refine your daily intentions with AI",
  },
  defaultCommand,
});
