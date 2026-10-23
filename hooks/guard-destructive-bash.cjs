#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks detected force pushes, hard resets,
// forced git cleans, and recursive forced rm commands. Blocked commands return a deny
// decision with a reason, so Claude asks the user instead of running them.
// Any input this hook cannot read is allowed through, so a hook bug never
// freezes the session.

const fs = require('fs');

const DESTRUCTIVE_RULES = [
	{ name: 'force push', test: (words) => isGit(words, 'push') && (hasAnyFlag(words, ['--force', '--force-with-lease', '-f']) || words.some((word) => word.startsWith('--force-with-lease='))) },
	{ name: 'hard reset', test: (words) => isGit(words, 'reset') && words.includes('--hard') },
	{ name: 'forced clean', test: (words) => isGit(words, 'clean') && words.some((word) => isShortFlagGroup(word, 'f') || word === '--force') },
	{ name: 'recursive forced delete', test: (words) => {
		let commandIndex = 0;
		if (words[commandIndex] === 'env') {
			commandIndex += 1;
			while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[commandIndex] ?? '')) commandIndex += 1;
		}
		if (words[commandIndex] === 'command') commandIndex += 1;
		const executable = words[commandIndex]?.split('/').pop();
		return executable === 'rm' && isRecursiveForced(words.slice(commandIndex + 1));
	} },
];

function splitCommands(command) {
	const parts = [];
	let start = 0;
	let quote = null;
	let escaped = false;

	for (let index = 0; index < command.length; index += 1) {
		const character = command[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (character === '\\' && quote !== "'") {
			escaped = true;
			continue;
		}
		if (quote) {
			if (character === quote) quote = null;
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			continue;
		}

		const operatorLength = command.startsWith('&&', index) || command.startsWith('||', index) ? 2 :
			[';', '&', '|', '\n'].includes(character) ? 1 : 0;
		if (operatorLength) {
			const part = command.slice(start, index).trim();
			if (part) parts.push(part);
			index += operatorLength - 1;
			start = index + 1;
		}
	}

	const part = command.slice(start).trim();
	if (part) parts.push(part);
	return parts;
}

function splitWords(command) {
	const words = [];
	let word = '';
	let quote = null;
	let escaped = false;

	for (const character of command) {
		if (escaped) {
			word += character;
			escaped = false;
			continue;
		}
		if (character === '\\' && quote !== "'") {
			escaped = true;
			continue;
		}
		if (quote) {
			if (character === quote) quote = null;
			else word += character;
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			continue;
		}
		if (/\s/.test(character)) {
			if (word) words.push(word);
			word = '';
			continue;
		}
		word += character;
	}

	if (word) words.push(word);
	return words;
}

function findClosingParenthesis(command, openIndex) {
	let depth = 1;
	let quote = null;
	let escaped = false;

	for (let index = openIndex + 1; index < command.length; index += 1) {
		const character = command[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (quote === "'") {
			if (character === "'") quote = null;
			continue;
		}
		if (character === '\\' && quote !== "'") {
			escaped = true;
			continue;
		}
		if (quote === '"') {
			if (character === '"') quote = null;
			else if (command.startsWith('$(', index)) {
				const end = findClosingParenthesis(command, index + 1);
				if (end !== -1) index = end;
			} else if (character === '`') {
				const end = findClosingBacktick(command, index);
				if (end !== -1) index = end;
			}
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			continue;
		}
		if (character === '`') {
			const end = findClosingBacktick(command, index);
			if (end !== -1) index = end;
			continue;
		}
		if (command.startsWith('$(', index) || command.startsWith('<(', index) || command.startsWith('>(', index)) {
			const end = findClosingParenthesis(command, index + 1);
			if (end !== -1) index = end;
			continue;
		}
		if (character === '(') depth += 1;
		else if (character === ')') {
			depth -= 1;
			if (depth === 0) return index;
		}
	}

	return -1;
}

function findClosingBacktick(command, openIndex) {
	let escaped = false;
	for (let index = openIndex + 1; index < command.length; index += 1) {
		if (escaped) escaped = false;
		else if (command[index] === '\\') escaped = true;
		else if (command[index] === '`') return index;
	}
	return -1;
}

function findSubstitutionRule(command) {
	let quote = null;
	let escaped = false;

	for (let index = 0; index < command.length; index += 1) {
		const character = command[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (quote === "'") {
			if (character === "'") quote = null;
			continue;
		}
		if (character === '\\' && quote !== "'") {
			escaped = true;
			continue;
		}
		if (quote === '"') {
			if (character === '"') quote = null;
			else if (command.startsWith('$(', index)) {
				const end = findClosingParenthesis(command, index + 1);
				if (end !== -1) {
					const rule = findDestructiveRule(command.slice(index + 2, end));
					if (rule) return rule;
					index = end;
				}
			} else if (character === '`') {
				const end = findClosingBacktick(command, index);
				if (end !== -1) {
					const rule = findDestructiveRule(command.slice(index + 1, end));
					if (rule) return rule;
					index = end;
				}
			}
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			continue;
		}
		if (command.startsWith('$(', index) || command.startsWith('<(', index) || command.startsWith('>(', index)) {
			const end = findClosingParenthesis(command, index + 1);
			if (end !== -1) {
				const rule = findDestructiveRule(command.slice(index + 2, end));
				if (rule) return rule;
				index = end;
			}
			continue;
		}
		if (character === '`') {
			const end = findClosingBacktick(command, index);
			if (end !== -1) {
				const rule = findDestructiveRule(command.slice(index + 1, end));
				if (rule) return rule;
				index = end;
			}
		}
	}

	return null;
}

function isGit(words, subcommand) {
	let commandIndex = 0;
	if (words[commandIndex] === 'env') {
		commandIndex += 1;
		while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[commandIndex] ?? '')) commandIndex += 1;
	}
	if (words[commandIndex] !== 'git') return false;

	let index = commandIndex + 1;
	while (true) {
		if (['-C', '-c', '--work-tree'].includes(words[index])) {
			if (index + 1 >= words.length) return false;
			index += 2;
		} else if (words[index] === '--no-pager' || words[index]?.startsWith('--work-tree=')) {
			index += 1;
		} else {
			break;
		}
	}

	return words[index] === subcommand;
}

function hasAnyFlag(words, flags) {
	return words.some((word) => flags.includes(word));
}

function isShortFlagGroup(word, letter) {
	return /^-[a-zA-Z]+$/.test(word) && word.includes(letter);
}

function isRecursiveForced(args) {
	const flags = args.filter((arg) => arg.startsWith('-'));
	const letters = flags.join('').replace(/-/g, '');
	return letters.includes('f') && (letters.includes('r') || letters.includes('R'));
}

function findDestructiveRule(command) {
	const substitutionRule = findSubstitutionRule(command);
	if (substitutionRule) return substitutionRule;

	for (const segment of splitCommands(command)) {
		const words = splitWords(segment);
		const rule = DESTRUCTIVE_RULES.find((candidate) => candidate.test(words));
		if (rule) return rule;
	}
	return null;
}

function decide(event) {
	if (event?.tool_name !== 'Bash') return null;
	const command = event.tool_input?.command;
	if (typeof command !== 'string') return null;

	const rule = findDestructiveRule(command);
	if (!rule) return null;

	return {
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			permissionDecision: 'deny',
			permissionDecisionReason: `Blocked ${rule.name}. Ask the user for explicit approval before running this command.`,
		},
	};
}

function main() {
	let input = '';
	try {
		input = fs.readFileSync(0, 'utf8');
		const decision = decide(JSON.parse(input));
		if (decision) process.stdout.write(JSON.stringify(decision));
	} catch {
		// Unreadable input is allowed through; see the header comment.
	}
}

if (require.main === module) main();

module.exports = { decide };
