#!/usr/bin/env python3
"""Flag AI-slop words and phrases in Markdown prose.

Usage:
    python3 ~/.agents/scripts/slop-lint.py PATH [PATH ...]

PATH is a file or a directory. Directories are searched for *.md and *.mdx,
skipping hidden folders and node_modules. Findings print as
`path:line: "match" -> plain rewrite`, followed by a summary line.
Exit codes: 0 clean, 1 findings, 2 bad usage or missing path.

Silence a false positive with `<!-- slop-lint:disable-line -->` on the line,
or skip a whole file with `<!-- slop-lint:disable-file -->` anywhere inside it.
Fenced code blocks (``` or ~~~) are ignored.

The lexicon curates the Wikipedia:Signs of AI writing taxonomy (WikiProject AI
Cleanup) plus community ban lists (adenaufal/anti-slop-writing, eric-sabe/
slop-lint, bradleydwyer/sloppy, Byk3y/no-slop, vale-ai-tells). Edit WORDS and
PHRASES to taste; every entry carries its plain rewrite.
"""

import argparse
import re
import sys
from pathlib import Path

DISABLE_LINE = "slop-lint:disable-line"
DISABLE_FILE = "slop-lint:disable-file"

# Canonical form -> plain rewrite shown in the report.
WORDS = {
    # Classic tells: far more common in model output than human writing.
    "delve": "say it plainly: dig into, go through",
    "tapestry": "say what the mix actually is",
    "testament": "say what proves it",
    "realm": "name the actual area",
    "landscape": "name the actual field or situation",
    "embark": "start",
    "journey": "say the actual work or process",
    "unlock": "say what it now allows",
    "unleash": "say what it now allows",
    "elevate": "say how it improves",
    "unveil": "show or release",
    "harness": "use",
    "foster": "help or encourage",
    "illuminate": "explain or show",
    "resonate": "say who it affected and how",
    "meticulous": "careful or exact",
    "seamless": "say what makes it smooth",
    "robust": "say what it survives",
    "vibrant": "busy or lively; or give specifics",
    "bustling": "busy",
    "nestled": "in or inside",
    "intricate": "detailed or complex",
    "pivotal": "say why it mattered",
    "paramount": "most important",
    "transformative": "say what changed",
    "groundbreaking": "new or first",
    "revolutionize": "change",
    "redefine": "change",
    "empower": "let or allow",
    "supercharge": "speed up",
    "streamline": "simplify",
    "curate": "pick or choose",
    "symphony": "say the actual combination",
    "canvas": "page or surface",
    "ecosystem": "name the actual tools or projects",
    "myriad": "many",
    "plethora": "many",
    "beacon": "signal or guide",
    "bedrock": "base",
    "cornerstone": "base or core",
    "fabric": "structure or mix",
    "odyssey": "trip or process",
    "quest": "search or goal",
    "catalyst": "trigger or cause",
    "kaleidoscope": "mix",
    "multifaceted": "say the actual parts",
    "nuanced": "specific or detailed",
    "comprehensive": "complete or full",
    "quintessential": "typical or classic",
    "profound": "deep or strong; or cut",
    "vast": "large or wide",
    "boast": "has",
    "showcase": "show",
    "underscore": "show or stress",
    "garner": "get or win",
    "enduring": "lasting",
    "interplay": "interaction",
    "ensure": "make sure; cut it if it is padding",
    # Corporate filler: marketing verbs and buzzwords.
    "leverage": "use",
    "utilize": "use",
    "facilitate": "help or let",
    "synergy": "say the actual benefit",
    "paradigm": "model or way of working",
    "holistic": "say what the whole approach covers",
    "innovative": "say what is new",
    "disruptive": "say what it replaces",
    "best-in-class": "say what makes it good",
    "world-class": "say what makes it good",
    "cutting-edge": "say what is new about it",
    "state-of-the-art": "say what is new about it",
    "mission-critical": "say what breaks without it",
    "value-add": "say the benefit",
    # Overblown abstraction: sounds technical, says nothing.
    "atomic": "say the actual behavior: all-or-nothing, one step",
    "constitutional": "say what actually changes",
    "orthogonal": "say what is independent or unrelated",
    "canonical": "single or standard; say which",
    # Filler transitions and hedges: usually deletable.
    "significantly": "cut unless backed by a number",
    "notably": "cut unless it adds information",
    "remarkably": "cut unless it adds information",
    "increasingly": "say what it is now",
    "essentially": "cut, or say it plainly",
    "fundamentally": "cut, or say it plainly",
    "additionally": "often deletable; start with the point",
    "furthermore": "often deletable; start with the point",
    "moreover": "often deletable; start with the point",
    "conversely": "but",
    "nevertheless": "still or but",
}

# Regex -> plain rewrite. Cover the constructions, not just single words.
PHRASES = [
    (r"\b(?:it'?s|it is) not just\b", "say what it is, not what it is not"),
    (r"\bnot (?:just|only) [^.\n]{1,60}\bbut\b", "drop the contrast; make the point directly"),
    (r"\bplays? a (?:crucial|critical|important|vital|key|pivotal|significant) role\b", "say what it actually does"),
    (r"\bserves? as\b", "use is"),
    (r"\bstands? as\b", "use is"),
    (r"\bfunctions? as\b", "use is"),
    (r"\bin today'?s (?:[A-Za-z-]+ )?(?:world|age|era|landscape|market)\b", "say when, or cut"),
    (r"\bin (?:an?|the) (?:era|age|world) (?:where|of)\b", "cut the scene-setting"),
    (r"\bin the (?:realm|world) of\b", "name the actual field"),
    (r"\bwhen it comes to\b", "say for or name the thing"),
    (r"\bat the end of the day\b", "cut"),
    (r"\b(?:let'?s|we'?ll|we will) (?:dive in|dive|explore|unpack|take a (?:closer )?look)\b", "start with the point"),
    (r"\b(?:deep dive|dive into|dives? into)\b", "say what to read or do"),
    (r"\b(?:it'?s|it is) worth noting\b", "say it directly"),
    (r"\bworth noting\b", "say it directly"),
    (r"\b(?:it'?s|it is) important to note\b", "say it directly"),
    (r"\bone thing is clear\b", "cut"),
    (r"\bthe key takeaway\b", "say the takeaway"),
    (r"\bkey takeaways?\b", "say the takeaway"),
    (r"\bin conclusion\b", "say the last point, then stop"),
    (r"\bthe future looks bright\b", "cut"),
    (r"\bexciting times ahead\b", "cut"),
    (r"\bcontinues? to evolve\b", "say what changed"),
    (r"\ba (?:rich|diverse) (?:array|mix|tapestry)\b", "say what the parts are"),
    (r"\brich (?:cultural )?heritage\b", "name the actual history"),
    (r"\bmarks? a turning point\b", "say what changed"),
    (r"\bleaves? an indelible mark\b", "say the effect"),
    (r"\bmore than just\b", "say what it is"),
    (r"\bat the forefront of\b", "leading or first"),
    (r"\bpushes? the boundaries\b", "say what it went beyond"),
    (r"\bpaves? the way\b", "made possible; say what"),
    (r"\ba double-edged sword\b", "say both effects"),
    (r"\btip of the iceberg\b", "say what else there is"),
    (r"\bthe possibilities are endless\b", "cut"),
    (r"\bat its core,?\b", "just say it"),
    (r"\bwhere (?:innovation|technology|art|design|craft|tradition|science) meets\b", "say what combines"),
    (r"\bgame[- ]chang(?:er|ing)\b", "say what changed"),
    (r"\bto the next level\b", "say what improved"),
    (r"\bthink outside the box\b", "say the idea"),
    (r"\blow-hanging fruit\b", "say the easy win"),
    (r"\bcircle back\b", "follow up"),
    (r"\btouch base\b", "check in"),
    (r"\bmove the needle\b", "say what changed"),
    (r"\bnavigat(?:e|ing) (?:the|through) (?:complexities|challenges|landscape|world|terrain)\b", "say what to do instead"),
    (r"\bin order to\b", "use to"),
    (r"\bdue to the fact that\b", "because"),
    (r"\bas an ai(?: language)? model\b", "cut; this is model output"),
    (r"\b(?:great|excellent) question\b", "cut"),
    (r"\bi hope this helps\b", "cut"),
]


def build_matchers():
    matchers = []
    for word, suggestion in WORDS.items():
        escaped = re.escape(word)
        variants = [escaped + r"(?:s|es|ed|d|ing)?"]
        if word.endswith("e"):
            variants.append(re.escape(word[:-1]) + r"(?:ing|ed)")
        pattern = re.compile(r"\b(?:" + "|".join(variants) + r")\b", re.IGNORECASE)
        matchers.append((suggestion, pattern))
    for expression, suggestion in PHRASES:
        matchers.append((suggestion, re.compile(expression, re.IGNORECASE)))
    return matchers


def scan_line(line, matchers):
    spans = []
    for suggestion, pattern in matchers:
        for match in pattern.finditer(line):
            spans.append((match.start(), match.end(), match.group(0), suggestion))
    spans.sort(key=lambda span: (span[0], span[1]))
    hits = []
    last_end = -1
    for start, end, text, suggestion in spans:
        if start < last_end:
            continue
        hits.append((text, suggestion))
        last_end = end
    return hits


def collect_files(raw_paths):
    files = []
    for raw in raw_paths:
        path = Path(raw)
        if not path.exists():
            raise FileNotFoundError(raw)
        if path.is_dir():
            candidates = sorted(set(path.rglob("*.md")) | set(path.rglob("*.mdx")))
            for candidate in candidates:
                relative = candidate.relative_to(path)
                if any(part.startswith(".") or part == "node_modules" for part in relative.parts):
                    continue
                files.append(candidate)
        else:
            files.append(path)
    return files


def lint_file(path, matchers):
    text = path.read_text(encoding="utf-8", errors="replace")
    if DISABLE_FILE in text:
        return []
    findings = []
    in_fence = False
    for number, line in enumerate(text.splitlines(), 1):
        stripped = line.lstrip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            continue
        if in_fence or DISABLE_LINE in line:
            continue
        for matched_text, suggestion in scan_line(line, matchers):
            findings.append((number, matched_text, suggestion))
    return findings


def main(argv=None):
    parser = argparse.ArgumentParser(prog="slop-lint", description="Flag AI-slop words and phrases in Markdown prose.")
    parser.add_argument("paths", nargs="+", metavar="PATH", help="Markdown file or directory to lint")
    args = parser.parse_args(argv)

    try:
        files = collect_files(args.paths)
    except FileNotFoundError as error:
        print(f"slop-lint: no such file: {error.args[0]}", file=sys.stderr)
        return 2

    matchers = build_matchers()
    total_hits = 0
    hit_files = 0
    for path in files:
        findings = lint_file(path, matchers)
        if not findings:
            continue
        hit_files += 1
        total_hits += len(findings)
        for number, matched_text, suggestion in findings:
            print(f'{path}:{number}: "{matched_text}" -> {suggestion}')

    if total_hits:
        plural = "s" if total_hits != 1 else ""
        file_plural = "s" if hit_files != 1 else ""
        print(f"slop-lint: {total_hits} hit{plural} in {hit_files} file{file_plural}")
        return 1
    file_plural = "s" if len(files) != 1 else ""
    print(f"slop-lint: clean ({len(files)} file{file_plural} scanned)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
