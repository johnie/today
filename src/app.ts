import { buildApplication } from "@stricli/core";
import pkg from "../package.json";
import { routes } from "./routes";

export const app = buildApplication(routes, {
  name: "today",
  versionInfo: {
    currentVersion: pkg.version,
  },
});
