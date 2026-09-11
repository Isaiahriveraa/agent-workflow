#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REFUSAL_ERROR =
	"ERROR: Refusing to attach prototype outside a git repository.";
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visual Prototype</title>
    <script>
      window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./.kit/src/main.tsx"></script>
  </body>
</html>
`;
const GITIGNORE = "/.kit\n/node_modules\n/.vite/\n/dist/\n";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_PACKAGES = [
	"react",
	"react-dom",
	"vite",
	"@vitejs/plugin-react",
	"@excalidraw/excalidraw",
];

const scriptPath = fs.realpathSync(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(path.dirname(scriptPath), "..");
const toolkitRoot = path.join(hubRoot, "prototype-kit");
const toolkitDependencies = path.join(toolkitRoot, "node_modules");

function fail(message) {
	console.error(message);
	process.exitCode = 1;
	return false;
}

function canonicalProject(project) {
	let candidate;
	try {
		candidate = fs.realpathSync(path.resolve(project));
	} catch {
		return fail(REFUSAL_ERROR);
	}
	try {
		const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
			cwd: candidate,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		return fs.realpathSync(root);
	} catch {
		return fail(REFUSAL_ERROR);
	}
}

function dependencyFailure() {
	return fail(
		`Toolkit dependencies are missing. Run: npm ci --prefix ${toolkitRoot}`,
	);
}

function dependenciesReady() {
	try {
		const stat = fs.lstatSync(toolkitDependencies);
		if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
		for (const packageName of REQUIRED_PACKAGES) {
			const packagePath = path.join(toolkitDependencies, packageName);
			if (!fs.existsSync(packagePath)) return false;
		}
		return true;
	} catch {
		return false;
	}
}

function validateSlug(slug) {
	if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
		fail(`Invalid prototype slug: ${slug ?? ""}`);
		return false;
	}
	return true;
}

function lstatOrNull(file) {
	try {
		return fs.lstatSync(file);
	} catch (error) {
		if (error?.code === "ENOENT") return null;
		throw error;
	}
}

function preflightDestination(worktree, slug) {
	const prototypes = path.join(worktree, "prototypes");
	const destination = path.join(prototypes, slug);
	const parentStat = lstatOrNull(prototypes);
	if (parentStat?.isSymbolicLink()) {
		fail(`Refusing symlinked prototypes directory: ${prototypes}`);
		return null;
	}
	if (parentStat && !parentStat.isDirectory()) {
		fail(`Refusing non-directory prototypes path: ${prototypes}`);
		return null;
	}
	const destinationStat = lstatOrNull(destination);
	if (destinationStat?.isSymbolicLink()) {
		fail(`Refusing symlinked prototype destination: ${destination}`);
		return null;
	}
	return { prototypes, destination, destinationStat };
}

function isRegularFile(file) {
	const stat = lstatOrNull(file);
	return Boolean(stat?.isFile() && !stat.isSymbolicLink());
}

function isCorrectLink(file, expected) {
	const stat = lstatOrNull(file);
	if (!stat?.isSymbolicLink()) return false;
	try {
		return fs.realpathSync(file) === fs.realpathSync(expected);
	} catch {
		return false;
	}
}

function initializedStatus(destination) {
	const missing = [];
	for (const name of ["prototype.tsx", "index.html", ".gitignore"]) {
		if (!isRegularFile(path.join(destination, name))) missing.push(name);
	}
	if (!isCorrectLink(path.join(destination, ".kit"), toolkitRoot))
		missing.push(".kit (symlink to toolkit)");
	if (
		!isCorrectLink(path.join(destination, "node_modules"), toolkitDependencies)
	)
		missing.push("node_modules (symlink to toolkit dependencies)");
	return missing;
}

function refuseExisting(destination, missing) {
	return fail(
		`Existing prototype attachment is incomplete or mismatched at ${destination}: ${missing.join(", ")}. Refusing to overwrite.`,
	);
}

function initPrototype(worktree, slug) {
	if (!dependenciesReady()) return dependencyFailure();
	const preflight = preflightDestination(worktree, slug);
	if (!preflight) return false;
	const { prototypes, destination, destinationStat } = preflight;
	if (destinationStat) {
		if (!destinationStat.isDirectory())
			return refuseExisting(destination, ["directory"]);
		const missing = initializedStatus(destination);
		if (missing.length) return refuseExisting(destination, missing);
		console.log(`Prototype already initialized: ${destination}`);
		return true;
	}
	try {
		fs.mkdirSync(prototypes, { recursive: true });
		fs.mkdirSync(destination);
		fs.copyFileSync(
			path.join(toolkitRoot, "template", "prototype.tsx"),
			path.join(destination, "prototype.tsx"),
		);
		fs.writeFileSync(path.join(destination, "index.html"), INDEX_HTML);
		fs.writeFileSync(path.join(destination, ".gitignore"), GITIGNORE);
		fs.symlinkSync(toolkitRoot, path.join(destination, ".kit"), "junction");
		fs.symlinkSync(
			toolkitDependencies,
			path.join(destination, "node_modules"),
			"junction",
		);
	} catch (error) {
		return fail(
			`Failed to initialize prototype at ${destination}: ${error.message}`,
		);
	}
	console.log(`Initialized prototype at ${destination}`);
	return true;
}

function cleanPrototype(worktree, slug) {
	const prototypes = path.join(worktree, "prototypes");
	const destination = path.join(prototypes, slug);
	const parentStat = lstatOrNull(prototypes);
	if (parentStat?.isSymbolicLink()) {
		fail(`Refusing symlinked prototypes directory: ${prototypes}`);
		return false;
	}
	if (parentStat && !parentStat.isDirectory()) {
		fail(`Refusing non-directory prototypes path: ${prototypes}`);
		return false;
	}
	const destinationStat = lstatOrNull(destination);
	try {
		if (destinationStat) {
			if (destinationStat.isSymbolicLink() || !destinationStat.isDirectory())
				fs.unlinkSync(destination);
			else fs.rmSync(destination, { recursive: true, force: true });
		}
		if (parentStat?.isDirectory() && fs.readdirSync(prototypes).length === 0)
			fs.rmdirSync(prototypes);
	} catch (error) {
		return fail(
			`Failed to clean prototype at ${destination}: ${error.message}`,
		);
	}
	console.log(`Cleaned prototype at ${destination}`);
	return true;
}

function parsePort(value) {
	if (value === undefined) return undefined;
	if (!/^\d+$/.test(value)) return null;
	const port = Number(value);
	return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

async function devPrototype(worktree, slug, port) {
	if (!dependenciesReady()) return dependencyFailure();
	const preflight = preflightDestination(worktree, slug);
	if (!preflight) return false;
	const { destination, destinationStat } = preflight;
	if (!destinationStat?.isDirectory())
		return fail(`Prototype is not initialized: ${destination}`);
	const missing = initializedStatus(destination);
	if (missing.length) return refuseExisting(destination, missing);
	const serverModule = await import(
		pathToFileURL(path.join(toolkitRoot, "server.mjs")).href
	);
	let server;
	try {
		server = await serverModule.startPrototypeServer({
			root: fs.realpathSync(destination),
			port,
		});
	} catch (error) {
		return fail(`Failed to start prototype server: ${error.message}`);
	}
	let closing = false;
	const close = async () => {
		if (closing) return;
		closing = true;
		try {
			await server.close();
		} finally {
			process.exit(0);
		}
	};
	process.once("SIGINT", close);
	process.once("SIGTERM", close);
	return true;
}

function parseArgs(argv) {
	const [action, slug, ...rest] = argv;
	const options = { project: process.cwd(), port: undefined };
	for (let index = 0; index < rest.length; index += 1) {
		const option = rest[index];
		if (option === "--project" || option === "--port") {
			const value = rest[index + 1];
			if (!value || value.startsWith("--"))
				throw new Error(`Missing value for ${option}`);
			options[option === "--project" ? "project" : "port"] = value;
			index += 1;
		} else {
			throw new Error(`Unknown option: ${option}`);
		}
	}
	return { action, slug, options };
}

async function main() {
	let parsed;
	try {
		parsed = parseArgs(process.argv.slice(2));
	} catch (error) {
		return fail(error.message);
	}
	if (!["init", "dev", "clean"].includes(parsed.action) || !parsed.slug)
		return fail(
			"Usage: prototype.mjs <init|dev|clean> <slug> [--project <path>] [--port <number>]",
		);
	if (!validateSlug(parsed.slug)) return false;
	const worktree = canonicalProject(parsed.options.project);
	if (!worktree) return false;
	if (parsed.action === "init") return initPrototype(worktree, parsed.slug);
	if (parsed.action === "clean") return cleanPrototype(worktree, parsed.slug);
	const port = parsePort(parsed.options.port);
	if (parsed.options.port !== undefined && port === null)
		return fail("Invalid port: expected an integer from 1024 through 65535.");
	return devPrototype(worktree, parsed.slug, port);
}

const result = await main();
if (result === false) process.exitCode = 1;
