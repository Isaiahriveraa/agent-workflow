// Guards both directions of the Kit's CSS contract: every class a component emits has a rule, and
// every rule belongs to a class the sources mention. Emission is read from `className` values and
// from every string literal in the scanned sources, so a class composed from variables or
// interpolated values still counts; a rule no source mentions is dead CSS.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const kitRoot = fileURLToPath(new URL("..", import.meta.url));
const scanRoots = ["src", "template"];
const SHELL_INLINE_STYLES = /const styles = `([^`]*)`/s;
const CLASS_TOKEN = /^[a-zA-Z][\w-]*$/;

function collectFiles(directory, extensions, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(path, extensions, found);
    else if (extensions.some((extension) => entry.name.endsWith(extension))) found.push(path);
  }
  return found;
}

/** Reads a `className=` value verbatim, delimiters included; balanced braces for expressions. */
function readClassNameValue(text, start) {
  const quote = text[start];
  if (quote === '"' || quote === "'" || quote === "`") {
    const end = text.indexOf(quote, start + 1);
    return end === -1 ? null : text.slice(start, end + 1);
  }
  if (quote !== "{") return null;
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

/** Removes interpolated expressions, keeping static text and the prefixes they complete. */
function staticShape(value) {
  let result = "";
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value.startsWith("${", index)) depth += 1;
    if (depth > 0) {
      if (value[index] === "}") depth -= 1;
      continue;
    }
    result += value[index];
  }
  return result;
}

const classified = (value) => {
  const shape = staticShape(value);
  const tokens = new Set();
  const families = new Set();
  const compared = new Set();
  for (const [, literal] of value.matchAll(/[!=]==?\s*[`"']([^`"']*)[`"']/g)) {
    for (const token of literal.split(/\s+/)) compared.add(token);
  }
  for (const [, literal] of shape.matchAll(/[`"']([^`"']*)[`"']/g)) {
    for (const token of literal.split(/\s+/)) {
      if (CLASS_TOKEN.test(token) && !compared.has(token)) tokens.add(token);
    }
  }
  for (const [, family] of value.matchAll(/([a-zA-Z][\w-]*-)\$\{/g)) families.add(family);
  return { tokens, families };
};

const sources = scanRoots.flatMap((root) => collectFiles(join(kitRoot, root), [".tsx"]));
const stylesheets = [
  ...scanRoots.flatMap((root) => collectFiles(join(kitRoot, root), [".css"])),
  join(kitRoot, "src/main.tsx"),
];

const emitted = new Map();
const emittedFamilies = new Map();
const sourceTexts = [];
const record = (map, name, path) => {
  if (!map.has(name)) map.set(name, new Set());
  map.get(name).add(relative(kitRoot, path));
};

for (const path of sources) {
  const text = readFileSync(path, "utf8");
  sourceTexts.push(text);
  // A class composed as `prefix-${value}` may never appear as a whole literal, so the prefix counts
  // as a family wherever it appears in the file, not only inside a className attribute.
  for (const [, family] of text.matchAll(/([a-zA-Z][\w-]*-)\$\{/g)) record(emittedFamilies, family, path);
  for (const match of text.matchAll(/className=/g)) {
    const value = readClassNameValue(text, match.index + "className=".length);
    if (value === null) continue;
    const { tokens, families } = classified(value);
    for (const token of tokens) record(emitted, token, path);
    for (const family of families) record(emittedFamilies, family, path);
  }
}

const defined = new Map();
for (const path of stylesheets) {
  const text = readFileSync(path, "utf8");
  const css = path.endsWith(".tsx") ? (text.match(SHELL_INLINE_STYLES)?.[1] ?? "") : text;
  for (const [, selector] of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) record(defined, selector, path);
}

const families = [...emittedFamilies.keys()];
const coveredByFamily = (name) => families.some((family) => name.startsWith(family));
// A rule counts as used when its name appears anywhere in the sources: classes built from variables
// never appear as a whole literal, and an incidental substring match is a cheaper error than a
// false alarm on dead CSS.
const mentioned = (name) => sourceTexts.some((text) => text.includes(name));
const missingRules = [...emitted].filter(([name]) => !defined.has(name) && !coveredByFamily(name));
const unusedRules = [...defined].filter(([name]) => !mentioned(name) && !coveredByFamily(name));

const format = (entries) =>
  entries.map(([name, files]) => `  ${name}  <- ${[...files].join(", ")}`).join("\n");

if (missingRules.length > 0 || unusedRules.length > 0) {
  console.error(`Class contract violated: ${missingRules.length} emitted class(es) with no rule, ${unusedRules.length} rule(s) no source mentions.`);
  if (missingRules.length > 0) console.error(`\nEmitted but not defined:\n${format(missingRules)}`);
  if (unusedRules.length > 0) console.error(`\nDefined but not mentioned:\n${format(unusedRules)}`);
  process.exit(1);
}

console.log(`Class contract holds: ${emitted.size} literal class(es) emitted, ${defined.size} rule(s) defined, both directions covered.`);
