#!/usr/bin/env python3
"""Lint plan step files for the interface-impact convention.

Every plan step file declares its interface impact:

    - **Interface impact:** none — why the boundary does not change

or `new` / `changed` with what changes. A `new` or `changed` declaration
also needs two non-empty blocks:

    **Interface sketch**
    signature plus the comment a caller would read

    **Rejected alternative**
    the second design considered and why it lost

A plan directory with step files lints the step files and skips
`00-index.md`; a directory holding only `00-index.md` lints the index.
A file passed directly is always linted.

Usage:
    python3 scripts/plan-lint.py <path> [<path> ...]

Escape hatches:
    <!-- plan-lint:disable-line -->  suppress findings anchored on that line
    <!-- plan-lint:disable-file -->  skip the file

Exit codes: 0 clean, 1 findings, 2 missing path.
"""

import argparse
import re
import sys
from pathlib import Path

DECLARATION = re.compile(
    r"\binterface impact\b[^A-Za-z0-9]{0,12}\b(none|new|changed)\b", re.IGNORECASE
)
LABEL = re.compile(
    r"^\s*(?:\*\*\s*(?P<bold>interface sketch|rejected alternative|alternative considered)\s*:?\s*\*\*(?P<bold_rest>.*)"
    r"|#{1,6}\s+(?P<head>interface sketch|rejected alternative|alternative considered)\s*:?\s*(?P<head_rest>.*))$",
    re.IGNORECASE,
)
HEADING = re.compile(r"^\s*#{1,6}\s")
BULLET_BOLD = re.compile(r"^\s*(?:[-*]\s+)?\*\*[^*]+\*\*")
FENCE = re.compile(r"^\s*(?:```|~~~)")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
DISABLE_LINE = "plan-lint:disable-line"
DISABLE_FILE = "plan-lint:disable-file"
EMPTY_BODIES = {"todo", "tbd", "placeholder", "na", "none"}


def plural(count, noun):
    return noun if count == 1 else f"{noun}s"


def fenced_lines(lines):
    inside = False
    result = []
    for line in lines:
        if FENCE.match(line):
            result.append(True)
            inside = not inside
        else:
            result.append(inside)
    return result


def body_is_empty(body):
    without_comments = HTML_COMMENT.sub("", body)
    words = re.sub(r"[^\w]", "", without_comments).lower()
    return not words or words in EMPTY_BODIES


def label_kind(match):
    name = (match.group("bold") or match.group("head")).lower()
    return "alternative" if "alternative" in name else "sketch"


def find_label(lines, fenced, kind):
    for index, line in enumerate(lines):
        if fenced[index]:
            continue
        match = LABEL.match(line)
        if match is None or label_kind(match) != kind:
            continue
        rest = match.group("bold_rest") if match.group("bold") else match.group("head_rest")
        body = [rest]
        for following in lines[index + 1 :]:
            if HEADING.match(following) or LABEL.match(following) or BULLET_BOLD.match(following):
                break
            body.append(following)
        return index + 1, "\n".join(body)
    return None


def block_findings(lines, fenced, kind, declaration_line, label, guidance):
    found = find_label(lines, fenced, kind)
    if found is None:
        return [(declaration_line, label, f"add a non-empty **{label}** block: {guidance}")]
    line_number, body = found
    if body_is_empty(body):
        return [(line_number, label, f"fill the empty **{label}** block: {guidance}")]
    return []


def lint_lines(lines, fenced):
    findings = []
    declaration_line = None
    declaration_value = None
    for index, line in enumerate(lines):
        if fenced[index]:
            continue
        match = DECLARATION.search(line)
        if match:
            declaration_line = index + 1
            declaration_value = match.group(1).lower()
            break
    if declaration_line is None:
        findings.append(
            (
                1,
                "interface impact",
                'add "- **Interface impact:** none|new|changed — <why>" (see plan skill §10)',
            )
        )
        return findings
    if declaration_value == "none":
        return findings
    findings.extend(
        block_findings(
            lines,
            fenced,
            "sketch",
            declaration_line,
            "Interface sketch",
            "signature plus the comment a caller would read (design it twice; see codebase-design)",
        )
    )
    findings.extend(
        block_findings(
            lines,
            fenced,
            "alternative",
            declaration_line,
            "Rejected alternative",
            "the second design considered and why it lost (design it twice; see codebase-design)",
        )
    )
    return findings


def collect_files(paths):
    files = []
    for raw in paths:
        target = Path(raw)
        if not target.exists():
            print(f"plan-lint: no such file: {raw}", file=sys.stderr)
            return None
        if target.is_file():
            files.append(target)
            continue
        groups = {}
        for markdown in sorted(target.rglob("*.md")):
            if any(part.startswith(".") or part == "node_modules" for part in markdown.parts):
                continue
            groups.setdefault(markdown.parent, []).append(markdown)
        for parent in sorted(groups, key=str):
            group = groups[parent]
            steps = [markdown for markdown in group if markdown.name != "00-index.md"]
            if steps:
                files.extend(steps)
            else:
                index = next(
                    (markdown for markdown in group if markdown.name == "00-index.md"), None
                )
                if index is not None:
                    files.append(index)
    return files


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="plan-lint.py",
        description="Lint plan step files for the interface-impact convention.",
    )
    parser.add_argument("paths", nargs="+", metavar="PATH", help="plan file or directory to lint")
    args = parser.parse_args(argv)
    files = collect_files(args.paths)
    if files is None:
        return 2
    scanned = 0
    findings = []
    for markdown in files:
        text = markdown.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        if any(DISABLE_FILE in line for line in lines):
            continue
        scanned += 1
        fenced = fenced_lines(lines)
        for line_number, match, fix in lint_lines(lines, fenced):
            if line_number <= len(lines) and DISABLE_LINE in lines[line_number - 1]:
                continue
            findings.append((markdown, line_number, match, fix))
    for markdown, line_number, match, fix in findings:
        print(f'{markdown}:{line_number}: "{match}" -> {fix}')
    if findings:
        finding_files = {markdown for markdown, *_ in findings}
        print(
            f"plan-lint: {len(findings)} {plural(len(findings), 'finding')} "
            f"in {len(finding_files)} {plural(len(finding_files), 'file')}"
        )
        return 1
    print(f"plan-lint: clean ({scanned} {plural(scanned, 'file')} scanned)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
