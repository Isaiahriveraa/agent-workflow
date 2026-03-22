import { runMemorySyncBridge } from './memory-sync-bridge.mjs';

runMemorySyncBridge({
  argv: process.argv.slice(2),
  scriptName: 'codex-memory-bridge.mjs'
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
