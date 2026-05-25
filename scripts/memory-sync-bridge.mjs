import path from "node:path";

import { flushQueue } from "./lesson-tools.mjs";
import {
	getRelevantMemories,
	resolveMemorySidecarConfig,
} from "./memory-sidecar-adapter.mjs";
import { ensureProjectContext } from "./project-context.mjs";
import { loadDefaultEnvFiles } from "./env-file-tools.mjs";

const agentsRoot = path.resolve(
	path.dirname(new URL(import.meta.url).pathname),
	"..",
);
loadDefaultEnvFiles({ cwd: agentsRoot });

export const buildMemorySyncStatus = ({
	env = process.env,
	projectContext = ensureProjectContext(),
} = {}) => {
	const config = resolveMemorySidecarConfig({ env });

	return {
		bridge: "memory-sync",
		diagnostics: {
			contract_version: "memory-sync-bridge.v1",
			operation: "status",
			explicit_parity_operations: ["status", "recall", "flush"],
		},
		projectRoot: projectContext.projectRoot,
		projectSlug: projectContext.projectSlug,
		memory: {
			enabled: config.enabled,
			backend: config.backend,
			profile: config.profile,
			readiness: config.readiness,
		},
		lessonQueueDir: path.join(
			projectContext.thoughtPaths.lessons,
			"queue",
			projectContext.projectSlug,
		),
		recommendedCommands: {
			preferred: [
				"node ~/.agents/scripts/memory-sync-bridge.mjs status",
				"node ~/.agents/scripts/memory-sync-bridge.mjs recall --workflow-stage create-plan",
				"node ~/.agents/scripts/memory-sync-bridge.mjs recall --workflow-stage implement-plan",
				"node ~/.agents/scripts/memory-sync-bridge.mjs flush",
			],
			compatibility: [
				"node ~/.agents/scripts/codex-memory-bridge.mjs status",
				"node ~/.agents/scripts/codex-memory-bridge.mjs recall --workflow-stage create-plan",
				"node ~/.agents/scripts/codex-memory-bridge.mjs recall --workflow-stage implement-plan",
				"node ~/.agents/scripts/codex-memory-bridge.mjs flush",
			],
		},
	};
};

const parseArgs = (args) => {
	const parsed = { _: [] };

	for (let index = 0; index < args.length; index += 1) {
		const current = args[index];
		if (!current.startsWith("--")) {
			parsed._.push(current);
			continue;
		}

		parsed[current.slice(2)] = args[index + 1];
		index += 1;
	}

	return parsed;
};

const usage = (scriptName = "memory-sync-bridge.mjs") => {
	console.error(
		`Usage: node scripts/${scriptName} <status|recall|flush> [--workflow-stage <create-plan|implement-plan>] [--query text] [--context-summary text]`,
	);
	process.exitCode = 1;
};

export const runMemorySyncBridge = async ({
	argv = process.argv.slice(2),
	env = process.env,
	projectContext = ensureProjectContext(),
	scriptName = "memory-sync-bridge.mjs",
} = {}) => {
	const command = argv[0];
	const args = parseArgs(argv.slice(1));

	switch (command) {
		case "status":
			console.log(
				JSON.stringify(buildMemorySyncStatus({ env, projectContext }), null, 2),
			);
			break;
		case "recall": {
			const workflowStage = args["workflow-stage"]?.trim() || args._[0]?.trim();
			if (!workflowStage) {
				usage(scriptName);
				break;
			}

			const result = await getRelevantMemories(
				{
					workflowStage,
					queryText: args.query?.trim() || null,
					contextSummary: args["context-summary"]?.trim() || null,
					projectContext,
				},
				{ env },
			);

			console.log(
				JSON.stringify(
					{
						...result,
						diagnostics: {
							contract_version: "memory-sync-bridge.v1",
							operation: "recall",
							workflow_stage: workflowStage,
						},
					},
					null,
					2,
				),
			);
			break;
		}
		case "flush":
			console.log(
				JSON.stringify(
					{
						...(await flushQueue({ projectContext })),
						diagnostics: {
							contract_version: "memory-sync-bridge.v1",
							operation: "flush",
						},
					},
					null,
					2,
				),
			);
			break;
		default:
			usage(scriptName);
	}
};

if (import.meta.url === `file://${process.argv[1]}`) {
	runMemorySyncBridge().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
