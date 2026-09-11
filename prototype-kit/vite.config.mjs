import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrototypeConfig } from "./server.mjs";

const toolkitDir = path.dirname(fileURLToPath(import.meta.url));

export default createPrototypeConfig({
  root: toolkitDir,
  template: true,
  port: undefined,
  strictPort: false,
});
