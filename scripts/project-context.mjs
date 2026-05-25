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
	const planningDir = path.join(projectRoot, ".planning");
	const thoughtsDir = path.join(projectRoot, "thoughts");
	const sessionsDir = path.join(projectDir, "sessions");

	return {
		agentsRoot,
		projectRoot,
		projectSlug,
		projectDir,
		planningDir,
		thoughtPaths: {
			intake: path.join(planningDir, "intake"),
			plans: path.join(thoughtsDir, "plans"),
			research: path.join(thoughtsDir, "research"),
			lessons: path.join(thoughtsDir, "lessons"),
			traces: path.join(thoughtsDir, "traces"),
			evaluations: path.join(thoughtsDir, "evaluations"),
			strategies: path.join(thoughtsDir, "strategies"),
			sessions: sessionsDir,
			handoffs: path.join(thoughtsDir, "handoffs"),
		},
	};
};

export const ensureProjectContext = (options = {}) => {
	return getProjectContext(options);
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
