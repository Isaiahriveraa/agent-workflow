import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";

const SCRIPT_PATH = fileURLToPath(new URL("./plan-server.mjs", import.meta.url));
const tempDirs = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("plan-server.mjs", () => {
	it("publishes an input plan file to the configured plan-server project", () => {
		const dir = mkdtempSync(join(tmpdir(), "plan-server-contract-"));
		tempDirs.push(dir);
		const inputPath = join(dir, "00-index.md");
		const marker = "verified plan contract marker";
		writeFileSync(inputPath, `# Plan\n\n${marker}\n`, "utf8");

		let result;
		try {
			const output = execFileSync(
				"node",
				[
					SCRIPT_PATH,
					"--input-file",
					inputPath,
					"--project",
					`contract-test-${process.pid}`,
					"--title",
					"Contract Test Plan",
					"--no-server",
				],
				{ encoding: "utf8" },
			);

			result = JSON.parse(output);
			assert.match(result.file, /contract-test-\d+\/plans\/.*\.mdx$/);
			assert.equal(readFileSync(result.file, "utf8").includes(marker), true);
		} finally {
			if (result?.file) {
				rmSync(dirname(dirname(result.file)), { recursive: true, force: true });
			}
		}
	});
});
