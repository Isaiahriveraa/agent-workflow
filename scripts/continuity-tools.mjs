import fs from "node:fs";
import path from "node:path";
import { getProjectContext } from "./project-context.mjs";
import {
	readActiveExecutionState,
	buildExecutionGuidance,
} from "./execution-state-tools.mjs";

const project = getProjectContext();
const sessionsDir = project.thoughtPaths.sessions;

const readJson = (filePath) => {
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch {
		return null;
	}
};
const parseArgs = (args) => {
	const parsed = {};
	for (let index = 0; index < args.length; index += 1) {
		const current = args[index];
		if (!current.startsWith("--")) continue;
		parsed[current.slice(2)] = args[index + 1];
		index += 1;
	}
	return parsed;
};

const slugify = (value) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60) || "session";

const pad = (value) => String(value).padStart(2, "0");

const timestampParts = (date = new Date()) => {
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hour = pad(date.getHours());
	const minute = pad(date.getMinutes());
	const second = pad(date.getSeconds());

	return {
		date: `${year}-${month}-${day}`,
		time: `${hour}-${minute}-${second}`,
		iso: date.toISOString(),
	};
};

const extractExecutionContext = () => {
	const execution = readActiveExecutionState();
	if (!execution) return null;

	return {
		path: execution.path,
		status: execution.state.status,
		currentTaskKey: execution.state.current_task_key ?? null,
		state: execution.state,
	};
};

// ---------------------------------------------------------------------------
// Phase checkpoint — writes compact JSON to sessions dir.
// No context file reads/writes.
// ---------------------------------------------------------------------------

const readPhaseCheckpointDir = (sessionId) => {
	const dir = path.join(sessionsDir, sessionId);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
};

const nextPhaseNumber = (dir) => {
	const existing = fs
		.readdirSync(dir)
		.map((f) => f.match(/^phase-(\d+)\.json$/))
		.filter(Boolean)
		.map((m) => parseInt(m[1], 10));
	return existing.length > 0 ? Math.max(...existing) + 1 : 1;
};

const phaseCheckpoint = (args) => {
	const now = timestampParts();
	const phaseName = args.phase ?? args["phase-name"] ?? "unknown";
	const workflow = args.workflow ?? "unknown";
	const relatedPlan = args.plan ?? null;

	const sessionId =
		args["session-id"] ??
		`${now.date}_${slugify(workflow || "session").slice(0, 40)}`;
	const checkpointDir = readPhaseCheckpointDir(sessionId);
	const phaseNum = nextPhaseNumber(checkpointDir);
	const checkpointPath = path.join(checkpointDir, `phase-${phaseNum}.json`);

	const splitList = (val) =>
		val
			? val
					.split("|")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];

	const payload = {
		schema: "phase-checkpoint.v1",
		session_id: sessionId,
		phase_number: phaseNum,
		phase_name: phaseName,
		workflow,
		related_plan: relatedPlan ?? null,
		captured_at: now.iso,
		duration_seconds: args["duration-seconds"]
			? Number(args["duration-seconds"])
			: null,
		completed: splitList(args.completed),
		pending: splitList(args.pending),
		key_decisions: splitList(args.decisions),
		files_modified: splitList(args.files),
		test_results: args["test-results"] ?? null,
		next_phase: args["next-phase"] ?? null,
		notes: args.notes ?? null,
	};

	fs.writeFileSync(checkpointPath, JSON.stringify(payload, null, 2) + "\n");

	return {
		action: "phase-checkpoint",
		session_id: sessionId,
		phase_number: phaseNum,
		phase_name: phaseName,
		checkpoint_path: checkpointPath,
	};
};

const listPhaseCheckpoints = (args) => {
	const sessionId = args["session-id"];
	if (!sessionId)
		throw new Error("phase-checkpoint list requires --session-id");
	const dir = path.join(sessionsDir, sessionId);
	if (!fs.existsSync(dir)) return { checkpoints: [] };
	const files = fs
		.readdirSync(dir)
		.filter((f) => /^phase-\d+\.json$/.test(f))
		.sort();
	const checkpoints = files.map((f) =>
		JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
	);
	return { session_id: sessionId, checkpoints };
};

// ---------------------------------------------------------------------------
// CLI router
// ---------------------------------------------------------------------------

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

try {
	if (command === "phase-checkpoint") {
		const subcommand = args.list !== undefined ? "list" : "write";
		if (subcommand === "list") {
			console.log(JSON.stringify(listPhaseCheckpoints(args), null, 2));
		} else {
			console.log(JSON.stringify(phaseCheckpoint(args), null, 2));
		}
	} else {
		console.error(
			"Usage: node scripts/continuity-tools.mjs phase-checkpoint [--key value]\n" +
				"       phase-checkpoint --phase <name> [--session-id <id>] [--completed <a|b>] [--pending <c>] [--decisions <d>] [--files <f>] [--next-phase <name>]\n" +
				"       phase-checkpoint --list --session-id <id>",
		);
		process.exitCode = 1;
	}
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
