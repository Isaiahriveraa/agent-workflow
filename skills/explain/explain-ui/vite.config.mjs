import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExplainConfig } from "./server.mjs";

const toolkitDir = path.dirname(fileURLToPath(import.meta.url));

export default createExplainConfig({
  root: toolkitDir,
  template: true,
  port: undefined,
  strictPort: false,
});
