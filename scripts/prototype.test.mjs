import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const tempRoots = [];
const scriptPath = fileURLToPath(new URL("./prototype.mjs", import.meta.url));
const hubRoot = path.resolve(path.dirname(scriptPath), "..");
const toolkitRoot = path.join(hubRoot, "prototype-kit");
const refusalMessage =
	"ERROR: Refusing to attach prototype outside a git repository.";

afterEach(() => {
	for (const root of tempRoots.splice(0))
		fs.rmSync(root, { recursive: true, force: true });
});

function runPrototype(args, options = {}) {
	const result = spawnSync(process.execPath, [scriptPath, ...args], {
		cwd: options.cwd ?? hubRoot,
		encoding: "utf8",
		...options,
	});
	return {
		...result,
		output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
	};
}

function makePrimaryRepo(prefix = "prototype-fixture-") {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempRoots.push(root);
	execFileSync("git", ["init", "-q"], { cwd: root });
	fs.writeFileSync(path.join(root, "README.txt"), "fixture\n");
	execFileSync("git", ["add", "README.txt"], { cwd: root });
	execFileSync(
		"git",
		[
			"-c",
			"user.name=Prototype Tests",
			"-c",
			"user.email=prototype-tests@example.test",
			"commit",
			"-qm",
			"initial",
		],
		{ cwd: root },
	);
	return root;
}

function makeLinkedWorktree(prefix = "prototype-worktree-") {
	const primary = makePrimaryRepo();
	const worktree = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempRoots.push(worktree);
	execFileSync(
		"git",
		[
			"worktree",
			"add",
			"-q",
			"-b",
			`prototype-test-${Date.now()}-${Math.random()}`,
			worktree,
			"HEAD",
		],
		{
			cwd: primary,
		},
	);
	return { primary, worktree };
}

function attachmentPath(worktree, slug) {
	return path.join(worktree, "prototypes", slug);
}

function assertFailure(result) {
	assert.equal(result.status, 1, result.output);
	assert.equal(result.error, undefined, result.output);
}

function assertDependencyFailure(result) {
	assertFailure(result);
	assert.match(
		result.output,
		new RegExp(`npm ci --prefix ${escapeRegExp(toolkitRoot)}`),
	);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withToolkitDependenciesTemporarilyHidden(callback) {
	const dependencies = path.join(toolkitRoot, "node_modules");
	const backup = `${dependencies}.prototype-test-backup-${process.pid}`;
	const existed =
		fs.existsSync(dependencies) ||
		fs.lstatSync(dependencies, { throwIfNoEntry: false });
	if (existed) fs.renameSync(dependencies, backup);
	try {
		return callback();
	} finally {
		if (fs.existsSync(dependencies))
			fs.rmSync(dependencies, { recursive: true, force: true });
		if (existed) fs.renameSync(backup, dependencies);
	}
}

describe("prototype CLI checkout validation", () => {
	it("allows a primary checkout", () => {
		const primary = makePrimaryRepo();
		const result = runPrototype(["init", "queue-demo", "--project", primary]);
		assert.equal(result.status, 0, result.output);
		assert.equal(fs.existsSync(attachmentPath(primary, "queue-demo")), true);
	});

	it("refuses a non-git directory", () => {
		const directory = fs.mkdtempSync(
			path.join(os.tmpdir(), "prototype-non-git-"),
		);
		tempRoots.push(directory);
		const result = runPrototype(["init", "queue-demo", "--project", directory]);
		assertFailure(result);
		assert.match(result.output, new RegExp(escapeRegExp(refusalMessage)));
	});

	it("rejects invalid slug forms without creating an attachment", () => {
		const { worktree } = makeLinkedWorktree();
		for (const slug of [
			"Queue-demo",
			"queue_demo",
			"queue.demo",
			"-queue",
			"queue-",
			"queue demo",
			"queue--demo",
		]) {
			const result = runPrototype(["init", slug, "--project", worktree]);
			assertFailure(result);
			assert.equal(
				fs.existsSync(path.join(worktree, "prototypes", slug)),
				false,
				slug,
			);
		}
	});
});

describe("prototype CLI init", () => {
	it("attaches a valid slug to a linked worktree with the complete layout", () => {
		const { worktree } = makeLinkedWorktree();
		const slug = "queue-demo";
		const manifest = path.join(worktree, "package.json");
		const lockfile = path.join(worktree, "package-lock.json");
		const hostDependencies = path.join(worktree, "node_modules");
		fs.writeFileSync(
			manifest,
			'{"name":"host-fixture","dependencies":{"left-pad":"1.3.0"}}\n',
		);
		fs.writeFileSync(lockfile, '{"name":"host-fixture","lockfileVersion":3}\n');
		fs.mkdirSync(hostDependencies);
		fs.writeFileSync(
			path.join(hostDependencies, "sentinel"),
			"host dependency\n",
		);
		const hostBefore = [
			manifest,
			lockfile,
			path.join(hostDependencies, "sentinel"),
		].map((file) => fs.readFileSync(file));
		const result = runPrototype(["init", slug, "--project", worktree]);
		assert.equal(result.status, 0, result.output);
		for (const [index, file] of [
			manifest,
			lockfile,
			path.join(hostDependencies, "sentinel"),
		].entries()) {
			assert.deepEqual(fs.readFileSync(file), hostBefore[index], file);
		}
		const destination = attachmentPath(worktree, slug);
		for (const entry of [
			"prototype.tsx",
			"index.html",
			".gitignore",
			".kit",
			"node_modules",
		]) {
			assert.equal(fs.existsSync(path.join(destination, entry)), true, entry);
		}
		for (const file of ["prototype.tsx", "index.html", ".gitignore"]) {
			assert.equal(
				fs.lstatSync(path.join(destination, file)).isFile(),
				true,
				file,
			);
		}
		assert.equal(
			fs.lstatSync(path.join(destination, ".kit")).isSymbolicLink(),
			true,
		);
		assert.equal(
			fs.lstatSync(path.join(destination, "node_modules")).isSymbolicLink(),
			true,
		);
		assert.equal(
			fs.realpathSync(path.join(destination, ".kit")),
			fs.realpathSync(toolkitRoot),
		);
		assert.equal(
			fs.realpathSync(path.join(destination, "node_modules")),
			fs.realpathSync(path.join(toolkitRoot, "node_modules")),
		);
		const gitignore = fs.readFileSync(
			path.join(destination, ".gitignore"),
			"utf8",
		);
		for (const line of ["/.kit", "/node_modules", "/.vite/", "/dist/"])
			assert.match(gitignore, new RegExp(`^${escapeRegExp(line)}$`, "m"));
	});

	it("is idempotent and preserves authored prototype and extra files", () => {
		const { worktree } = makeLinkedWorktree();
		const slug = "queue-demo";
		const first = runPrototype(["init", slug, "--project", worktree]);
		assert.equal(first.status, 0, first.output);
		const destination = attachmentPath(worktree, slug);
		const authored = "export default { title: 'local edit' };\n";
		const extra = path.join(destination, "notes.txt");
		fs.writeFileSync(path.join(destination, "prototype.tsx"), authored);
		fs.writeFileSync(extra, "keep me\n");
		const before = Object.fromEntries(
			["prototype.tsx", "index.html", ".gitignore"].map((file) => [
				file,
				fs.readFileSync(path.join(destination, file)),
			]),
		);

		const second = runPrototype(["init", slug, "--project", worktree]);
		assert.equal(second.status, 0, second.output);
		assert.deepEqual(
			fs.readFileSync(path.join(destination, "prototype.tsx")),
			Buffer.from(authored),
		);
		assert.deepEqual(fs.readFileSync(extra), Buffer.from("keep me\n"));
		for (const file of Object.keys(before))
			assert.deepEqual(
				fs.readFileSync(path.join(destination, file)),
				before[file],
				file,
			);
	});

	it("refuses a partial attachment without overwriting remaining authored files", () => {
		const { worktree } = makeLinkedWorktree();
		const slug = "partial";
		const first = runPrototype(["init", slug, "--project", worktree]);
		assert.equal(first.status, 0, first.output);
		const destination = attachmentPath(worktree, slug);
		fs.writeFileSync(path.join(destination, "prototype.tsx"), "authored\n");
		fs.unlinkSync(path.join(destination, "index.html"));
		const result = runPrototype(["init", slug, "--project", worktree]);
		assertFailure(result);
		assert.equal(
			fs.readFileSync(path.join(destination, "prototype.tsx"), "utf8"),
			"authored\n",
		);
		assert.equal(fs.existsSync(path.join(destination, "index.html")), false);
	});

	it("detects a bad symlink and refuses to relink it", () => {
		const { worktree } = makeLinkedWorktree();
		const slug = "tampered";
		const first = runPrototype(["init", slug, "--project", worktree]);
		assert.equal(first.status, 0, first.output);
		const destination = attachmentPath(worktree, slug);
		fs.unlinkSync(path.join(destination, ".kit"));
		fs.symlinkSync(
			path.join(os.tmpdir(), "missing-prototype-kit"),
			path.join(destination, ".kit"),
		);
		const result = runPrototype(["init", slug, "--project", worktree]);
		assertFailure(result);
		assert.equal(
			fs.readlinkSync(path.join(destination, ".kit")),
			path.join(os.tmpdir(), "missing-prototype-kit"),
		);
	});

	it("refuses a file in place of the attachment directory", () => {
		const { worktree } = makeLinkedWorktree();
		const destination = attachmentPath(worktree, "not-a-directory");
		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.writeFileSync(destination, "do not replace\n");
		const result = runPrototype([
			"init",
			"not-a-directory",
			"--project",
			worktree,
		]);
		assertFailure(result);
		assert.equal(fs.readFileSync(destination, "utf8"), "do not replace\n");
	});

	it("rejects a symlinked prototypes parent", () => {
		const { worktree } = makeLinkedWorktree();
		const outside = fs.mkdtempSync(
			path.join(os.tmpdir(), "prototype-outside-"),
		);
		fs.symlinkSync(outside, path.join(worktree, "prototypes"));
		const result = runPrototype(["init", "queue-demo", "--project", worktree]);
		assertFailure(result);
		assert.equal(fs.readdirSync(outside).length, 0);
	});

	it("handles project and worktree paths containing spaces", () => {
		const { worktree } = makeLinkedWorktree("prototype worktree with spaces-");
		const result = runPrototype(["init", "space-safe", "--project", worktree]);
		assert.equal(result.status, 0, result.output);
		assert.equal(fs.existsSync(attachmentPath(worktree, "space-safe")), true);
	});
});

describe("prototype CLI clean", () => {
	it("removes an initialized prototype and its empty parent directory", () => {
		const { worktree } = makeLinkedWorktree();
		const slug = "queue-demo";
		const init = runPrototype(["init", slug, "--project", worktree]);
		assert.equal(init.status, 0, init.output);
		const destination = attachmentPath(worktree, slug);
		const canonicalDestination = path.join(
			fs.realpathSync(worktree),
			"prototypes",
			slug,
		);
		fs.writeFileSync(path.join(destination, "notes.txt"), "keep during init\n");

		const result = runPrototype(["clean", slug, "--project", worktree]);
		assert.equal(result.status, 0, result.output);
		assert.match(
			result.output,
			new RegExp(`Cleaned prototype at ${escapeRegExp(canonicalDestination)}`),
		);
		assert.equal(fs.existsSync(destination), false);
		assert.equal(fs.existsSync(path.dirname(destination)), false);
	});

	it("succeeds when the prototype does not exist", () => {
		const primary = makePrimaryRepo();
		const result = runPrototype(["clean", "missing", "--project", primary]);
		assert.equal(result.status, 0, result.output);
		const canonicalDestination = path.join(
			fs.realpathSync(primary),
			"prototypes",
			"missing",
		);
		assert.match(
			result.output,
			new RegExp(`Cleaned prototype at ${escapeRegExp(canonicalDestination)}`),
		);
		assert.equal(fs.existsSync(path.join(primary, "prototypes")), false);
	});
});

describe("prototype CLI dependency and dev validation", () => {
	it("recommends npm ci when toolkit dependencies are missing for init and dev", () => {
		const { worktree } = makeLinkedWorktree();
		withToolkitDependenciesTemporarilyHidden(() => {
			const init = runPrototype([
				"init",
				"missing-deps",
				"--project",
				worktree,
			]);
			assertDependencyFailure(init);
			const dev = runPrototype(["dev", "missing-deps", "--project", worktree]);
			assertDependencyFailure(dev);
		});
	});

	it("rejects dev ports outside the valid range or that are not integers", () => {
		const { worktree } = makeLinkedWorktree();
		for (const port of ["80", "70000", "abc", "1023", "65536", "5173.5"]) {
			const result = runPrototype([
				"dev",
				"queue-demo",
				"--project",
				worktree,
				"--port",
				port,
			]);
			assertFailure(result);
		}
	});
});
