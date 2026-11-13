// Records each prompt in this Herdr tab's board (last prompt and time), the opencode
// twin of hooks/board-stamp.sh. Never blocks or fails the prompt; failures go to
// ~/.config/herdr/board-stamp.log. Installed as a symlink in ~/.config/opencode/plugins.
import { execFile } from "node:child_process";
import { appendFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
const BOARD = path.join(home, ".config/herdr/scripts/board.mjs");
const LOG = path.join(home, ".config/herdr/board-stamp.log");

export const BoardStampPlugin = async () => {
  if (!process.env.HC_TERMINAL_ID) return {};
  return {
    "chat.message": async (_input, output) => {
      const prompt = (output?.parts ?? [])
        .filter((part) => part.type === "text" && !part.synthetic)
        .map((part) => part.text)
        .join(" ")
        .trim();
      if (!prompt) return;
      execFile("node", [BOARD, "stamp", "--prompt", prompt], { cwd: process.cwd() }, (error, _out, stderr) => {
        if (error) appendFile(LOG, `board-stamp (opencode): ${stderr || error.message}\n`).catch(() => {});
      });
    },
  };
};

export default { id: "board.stamp", server: BoardStampPlugin, setup() {} };
