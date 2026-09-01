import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const agentsRoot = process.env.AGENTS_ROOT
	? path.resolve(process.env.AGENTS_ROOT)
	: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultWorkingDirectory = process.env.AGENTS_PROJECT_ROOT
	? path.resolve(process.env.AGENTS_PROJECT_ROOT)
	: process.cwd();

const slugify = (value) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48) || "project";

const hashProjectRoot = (projectRoot) =>
	crypto.createHash("sha1").update(projectRoot).digest("hex").slice(0, 8);

const findGitRoot = (startDir) => {
	let current = startDir;
	while (true) {
		if (fs.existsSync(path.join(current, ".git"))) {
			return current;
		}
		const parent = path.dirname(current);
		if (parent === current) {
			return startDir;
		}
		current = parent;
	}
};

export const getProjectContext = (options = {}) => {
	const workingDirectory = options.cwd
		? path.resolve(options.cwd)
		: defaultWorkingDirectory;
	const projectRoot = options.projectRoot
		? path.resolve(options.projectRoot)
		: findGitRoot(workingDirectory);
	const slugBase =
		process.env.AGENTS_PROJECT_SLUG ??
		options.projectSlug ??
		path.basename(projectRoot);
	const projectSlug = `${slugify(slugBase)}-${hashProjectRoot(projectRoot)}`;
	const projectDir = path.join(projectRoot, ".omx");
	const contextDir = path.join(projectRoot, "context");
	const sessionsDir = path.join(projectDir, "sessions");
	const artifactTypes = [
		"handoffs",
		"reflections",
		"grill",
		"glossary",
		"adr",
		"prd",
		"issues",
		"reviews",
		"maps",
		"discover",
		"frd",
		"tickets",
		"decisions",
		"research",
		"designs",
		"solutions",
		"plans",
		"test-cases",
		"pr-stack",
		"ui-reviews",
		"debug",
	];
	const contextPaths = Object.fromEntries(
		artifactTypes.map((type) => [type, path.join(contextDir, type)]),
	);

	return {
		agentsRoot,
		projectRoot,
		projectSlug,
		projectDir,
		contextDir,
		contextPaths,
		runtimePaths: { sessions: sessionsDir },
	};
};

export const ensureProjectContext = (options = {}) => {
	const context = getProjectContext(options);
	fs.mkdirSync(context.contextDir, { recursive: true });
	return context;
};

if (import.meta.url === `file://${process.argv[1]}`) {
	const command = process.argv[2] ?? "current";
	const context = ensureProjectContext();

	if (command === "current") {
		console.log(JSON.stringify(context, null, 2));
	} else {
		console.error("Usage: node scripts/project-context.mjs [current]");
		process.exitCode = 1;
	}
}
