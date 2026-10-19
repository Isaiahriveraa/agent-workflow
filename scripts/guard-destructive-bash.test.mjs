import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "guard-destructive-bash.cjs");

function runHook(command) {
	const input = JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });
	const result = spawnSync("node", [HOOK], { input, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function assertDenied(command) {
	const output = runHook(command);
	assert.ok(output, `expected "${command}" to be denied`);
	assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
	assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
	assert.match(output.hookSpecificOutput.permissionDecisionReason, /ask the user/i);
}

function assertAllowed(command) {
	assert.equal(runHook(command), null, `expected "${command}" to be allowed`);
}

test("denies force pushes", () => {
	assertDenied("git push --force origin feature");
	assertDenied("git push -f origin feature");
	assertDenied("git push origin feature --force-with-lease");
	assertDenied("git push origin feature --force-with-lease=main");
	assertDenied("git -C /tmp/repo push --force origin feature");
});

test("denies hard resets", () => {
	assertDenied("git reset --hard HEAD~1");
	assertDenied("git reset --hard origin/master");
	assertDenied("git -C /tmp/repo reset --hard HEAD~1");
});

test("denies destructive Git commands after global config options", () => {
	assertDenied("git -c core.quotePath=false reset --hard HEAD~1");
	assertDenied("git -c protocol.version=2 push --force origin feature");
});

test("denies destructive Git commands after env assignments", () => {
	assertDenied("env GIT_OPTIONAL_LOCKS=0 git reset --hard HEAD");
	assertDenied('env REVIEW_LABEL="needs more care" git reset --hard HEAD');
});

test("denies destructive Git commands after the supported global options", () => {
	assertDenied("git --no-pager push --force origin feature");
	assertDenied("git --work-tree=. reset --hard HEAD");
	assertDenied("git --work-tree . reset --hard HEAD");
});

test("denies force cleaning untracked files", () => {
	assertDenied("git clean -fd");
	assertDenied("git clean -xdf");
});

test("denies recursive forced deletes", () => {
	assertDenied("rm -rf build");
	assertDenied("/bin/rm -rf build");
	assertDenied("env rm -rf build");
	assertDenied("env REVIEW_LABEL=care rm -rf build");
	assertDenied('env REVIEW_LABEL="needs more care" rm -rf build');
	assertDenied("command rm -rf build");
	assertDenied("rm -fr ./dist");
	assertDenied("cd /tmp && rm -rf cache");
});

test("denies a destructive command hidden later in a chain", () => {
	assertDenied("git status && git reset --hard");
});

test("denies destructive commands inside command substitutions", () => {
	assertDenied('echo "$(git reset --hard HEAD)"');
	assertDenied('echo "$(printf \'%s\' \')\' && git reset --hard HEAD)"');
	assertDenied('echo "$(printf \'%s\' "$(git reset --hard HEAD)")"');
	assertDenied("echo `rm -rf cache`");
	assertDenied("cat <(rm -rf cache)");
	assertDenied("echo >(rm -rf cache)");
	assertAllowed("echo '$(git reset --hard HEAD)'");
	assertAllowed('echo "\\$(git reset --hard HEAD)"');
	assertAllowed('echo "$(printf \'%s\' \'git reset --hard HEAD\')"');
	assertAllowed("echo '<(rm -rf cache)'");
});

test("splits only unquoted and unescaped background operators", () => {
	assertAllowed('git commit -m "text & git reset --hard HEAD"');
	assertAllowed("git commit -m text\\& git reset --hard HEAD");
	assertDenied("git status & rm -rf cache");
});

test("allows ordinary commands", () => {
	assertAllowed("git status");
	assertAllowed("git push origin feature");
	assertAllowed("git reset --soft HEAD~1");
	assertAllowed("rm build.log");
	assertAllowed("npm test");
});

test("allows commit commands so the commit skill keeps working", () => {
	assertAllowed("git commit -m 'feat: add thing'");
});

test("does not split separators inside quoted commit messages", () => {
	assertAllowed('git commit -m "text; git reset --hard HEAD"');
});

test("does not split newlines inside quoted commit messages", () => {
	assertAllowed('git commit -m "first line\n git reset --hard HEAD"');
});

test("never blocks a session when the input is not a Bash command", () => {
	const input = JSON.stringify({ tool_name: "Read", tool_input: { file_path: "/x" } });
	const result = spawnSync("node", [HOOK], { input, encoding: "utf8" });
	assert.equal(result.status, 0);
	assert.equal(result.stdout.trim(), "");
});

test("never blocks a session when the input is malformed", () => {
	const result = spawnSync("node", [HOOK], { input: "not json", encoding: "utf8" });
	assert.equal(result.status, 0);
	assert.equal(result.stdout.trim(), "");
});
