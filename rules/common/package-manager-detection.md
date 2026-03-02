# Package Manager Detection

Do not assume `npm` when a Node-based repo may use another package manager.

## Detection Order
- `package.json#packageManager`
- `bun.lock` or `bun.lockb`
- `pnpm-lock.yaml`
- `yarn.lock`
- `package-lock.json`
- fallback: `npm`

## Usage
- Detect with `node ./scripts/package-manager-tools.mjs detect [path]`
- Format a run command with `node ./scripts/package-manager-tools.mjs run <script> [-- extra args]`
- Format an install command with `node ./scripts/package-manager-tools.mjs install <packages...>`

## Output Policy
- When presenting or executing package-manager commands, prefer the detected manager over a hardcoded `npm` command.
