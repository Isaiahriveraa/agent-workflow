import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProjectContext } from "./project-context.mjs";
import {
	gradePlanArtifact,
	gradeResearchArtifact,
} from "./workflow-artifact-tools.mjs";

const root = process.env.AGENTS_ROOT
	? path.resolve(process.env.AGENTS_ROOT)
	: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = getProjectContext();
const repoLocalArtifactRoots = {
	intake: project.thoughtPaths.intake,
	plans: project.thoughtPaths.plans,
	research: project.thoughtPaths.research,
};
const sharedArtifactRoots = {
	handoffs: project.thoughtPaths.handoffs,
};
const projectRuntimeArtifactRoots = {
	sessions: project.thoughtPaths.sessions,
};
const categories = {
	...repoLocalArtifactRoots,
	...sharedArtifactRoots,
	...projectRuntimeArtifactRoots,
};

const safeStat = (filePath) => {
	try {
		return fs.statSync(filePath);
	} catch {
		return null;
	}
};

const listFiles = (dir) => {
	if (!fs.existsSync(dir)) return [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...listFiles(fullPath));
		} else if (
			entry.isFile() &&
			entry.name.endsWith(".md") &&
			entry.name !== ".gitkeep"
		) {
			if (safeStat(fullPath)) {
				files.push(fullPath);
			}
		}
	}

	return files.sort(
		(a, b) => (safeStat(b)?.mtimeMs ?? 0) - (safeStat(a)?.mtimeMs ?? 0),
	);
};

const listPlanFiles = () => {
	return listFiles(project.thoughtPaths.plans);
};

const safeReadFile = (filePath) => {
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
};

const looksSubstantial = (content) => {
	if (!content) return false;
	return (
		/^##\s+Phase\s+\d+/im.test(content) ||
		/^##\s+Implementation Approach$/im.test(content) ||
		/^##\s+Detailed Findings$/im.test(content) ||
		/^##\s+Testing Strategy$/im.test(content)
	);
};

const classifyArtifactReadiness = (category, filePath) => {
	if (!filePath) {
		return {
			status: "missing",
			ready: false,
			legacySubstantial: false,
			blockedCommands: [],
		};
	}

	if (category !== "plan" && category !== "research") {
		return {
			status: "not_applicable",
			ready: false,
			legacySubstantial: false,
			blockedCommands: [],
		};
	}

	const content = safeReadFile(filePath);
	if (!content) {
		return {
			status: "unreadable",
			ready: false,
			legacySubstantial: false,
			blockedCommands: [],
		};
	}

	try {
		const grade =
			category === "plan"
				? gradePlanArtifact({ filePath, content })
				: gradeResearchArtifact({ filePath, content });

		return {
			status: grade.passes ? "ready" : "not_ready",
			ready: grade.passes,
			legacySubstantial: false,
			blockedCommands: grade.passes
				? []
				: category === "plan"
					? ["/implement_plan", "/resume-session"]
					: ["/create-plan"],
			blockers: grade.blockers,
			readinessField: grade.readinessField,
		};
	} catch (error) {
		const legacySubstantial = looksSubstantial(content);
		return {
			status: legacySubstantial ? "legacy_substantial" : "legacy_nonready",
			ready: false,
			legacySubstantial,
			blockedCommands: legacySubstantial
				? category === "plan"
					? ["/implement_plan", "/resume-session"]
					: ["/create-plan"]
				: [],
			warning: error.message,
		};
	}
};

const normalizeArtifactPath = (value) => {
	if (!value || value === "none") return null;
	if (!path.isAbsolute(value)) {
		throw new Error(`Artifact path must be absolute or "none": ${value}`);
	}
	if (!fs.existsSync(value)) {
		throw new Error(`Artifact path does not exist: ${value}`);
	}
	return value;
};

const scoreFile = (filePath) => {
	const base = path.basename(filePath).toLowerCase();
	const stat = safeStat(filePath);
	if (!stat) return 0;
	return Math.min(
		5,
		Math.round(Date.now() - stat.mtimeMs < 7 * 24 * 60 * 60 * 1000 ? 5 : 1),
	);
};

const readinessRank = (category, filePath) => {
	const readiness = classifyArtifactReadiness(category, filePath);
	if (readiness.ready) return 3;
	if (!readiness.legacySubstantial && readiness.status === "not_ready")
		return 2;
	if (readiness.legacySubstantial) return 0;
	return 1;
};

const pickLatest = (category) =>
	category === "plans"
		? (listPlanFiles()[0] ?? null)
		: (listFiles(categories[category])[0] ?? null);

const pickRelated = (category) => {
	const files =
		category === "plans" ? listPlanFiles() : listFiles(categories[category]);
	if (files.length === 0) return null;
	const readinessCategory =
		category === "plans" ? "plan" : category === "research" ? "research" : null;
	return (
		files
			.map((filePath) => ({
				filePath,
				score: scoreFile(filePath),
				readiness: readinessCategory
					? readinessRank(readinessCategory, filePath)
					: -1,
			}))
			.sort(
				(a, b) =>
					b.readiness - a.readiness ||
					b.score - a.score ||
					(safeStat(b.filePath)?.mtimeMs ?? 0) -
						(safeStat(a.filePath)?.mtimeMs ?? 0),
			)[0]?.filePath ?? null
	);
};

if (
	import.meta.url === `file://${process.argv[1]}` ||
	fileURLToPath(import.meta.url) === process.argv[1]
) {
	const command = process.argv[2];

	try {
		switch (command) {
			case "latest": {
				const category = process.argv[3];
				if (!categories[category]) {
					console.error(
						"Usage: node scripts/artifact-tools.mjs latest <plans|research|sessions|handoffs>",
					);
					process.exitCode = 1;
					break;
				}
				console.log(pickLatest(category) ?? "");
				break;
			}
			case "related":
				console.log(
					JSON.stringify(
						{
							intake: pickRelated("intake"),
							plans: pickRelated("plans"),
							research: pickRelated("research"),
							sessions: pickRelated("sessions"),
							handoffs: pickRelated("handoffs"),
						},
						null,
						2,
					),
				);
				break;
			case "suggest":
				console.log(
					JSON.stringify(
						{
							intake: pickLatest("intake"),
							plan: pickLatest("plans"),
							research: pickLatest("research"),
							session: pickLatest("sessions"),
							handoff: pickLatest("handoffs"),
							readiness: {
								plan: classifyArtifactReadiness("plan", pickLatest("plans")),
								research: classifyArtifactReadiness(
									"research",
									pickLatest("research"),
								),
							},
						},
						null,
						2,
					),
				);
				break;
			default:
				console.error(
					"Usage: node scripts/artifact-tools.mjs <suggest|related|latest>",
				);
				process.exitCode = 1;
		}
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
