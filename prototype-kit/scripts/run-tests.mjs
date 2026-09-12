// The Kit runs on Node 20.19, but node:test cannot execute TypeScript there: type stripping arrived
// in Node 22.12. Fail with that explanation instead of node's bare "bad option" for the flag.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const kitRoot = fileURLToPath(new URL("..", import.meta.url));
const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 22 || (major === 22 && minor < 12)) {
  console.error(
    `prototype-kit tests need Node 22.12 or newer to run TypeScript test files; this is Node ${process.versions.node}. The Kit and its dev server still support Node 20.19.`,
  );
  process.exit(1);
}

const run = (command, args) => spawnSync(command, args, { cwd: kitRoot, stdio: "inherit", shell: false });

const units = run("npm", ["run", "test:units"]);
if ((units.status ?? 1) !== 0) process.exit(units.status ?? 1);

const guard = run(process.execPath, ["scripts/check-class-coverage.mjs"]);
process.exit(guard.status ?? 1);
