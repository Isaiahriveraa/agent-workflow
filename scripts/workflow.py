#!/usr/bin/env python3
"""Read the Markdown ticket queue and verify an approved plan without mutation."""

import argparse
from graphlib import TopologicalSorter
import json
import os
from pathlib import Path
import re
import subprocess
import sys

HEADERS = ["ID", "Ticket", "Issue", "Status", "Depends on", "Plan", "Research", "PR", "Evidence"]
STATUSES = {"draft", "needs-review", "ready", "blocked", "in-progress", "in-review", "done"}
# Queue cells hold plain paths; a Markdown link is a reader mistake, not a path.
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\([^)]*\)")


def git(root, *args):
    result = subprocess.run(["git", "--literal-pathspecs", "-C", str(root), *args],
                            capture_output=True, text=True,
                            env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
    if result.returncode:
        raise ValueError(f"git {' '.join(args)}: {result.stderr.strip() or 'failed'}")
    return result.stdout.strip()


def repo_path(root, value, absolute=False):
    if (not value or value == "-" or value.startswith("-")
            or (Path(value).is_absolute() and not absolute)
            or MARKDOWN_LINK.search(value)
            or any(char in value for char in "\n\r\0\\")
            or any(part.startswith("-") for part in Path(value).parts)):
        raise ValueError(f"invalid root-relative path: {value}")
    target = (root / value).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f"path escapes Git root: {value}")
    return target


def artifact_root(root, index):
    candidate = Path(index) if Path(index).is_absolute() else root / index
    owner = Path(git(candidate.parent, "rev-parse", "--show-toplevel")).resolve()
    execution_common = Path(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir")).resolve()
    artifact_common = Path(git(owner, "rev-parse", "--path-format=absolute", "--git-common-dir")).resolve()
    if execution_common != artifact_common:
        raise ValueError("index belongs to an unrelated Git repository")
    repo_path(owner, str(candidate), absolute=True)
    return owner


def read_queue(root, index):
    lines = repo_path(root, index, absolute=True).read_text().splitlines()
    headings = [i for i, line in enumerate(lines) if line.strip() == "## Queue"]
    if len(headings) != 1:
        raise ValueError("index must have exactly one ## Queue section")
    section = []
    for line in lines[headings[0] + 1:]:
        if re.match(r"^#{1,2}\s", line):
            break
        section.append(line)
    # HTML comments are reader notes, not table rows.
    body = re.sub(r"<!--.*?-->", "", "\n".join(section), flags=re.DOTALL)
    section = [line.strip() for line in body.splitlines() if line.strip()]
    def cells(line):
        if not line.startswith("|") or not line.endswith("|"):
            raise ValueError("malformed Queue table")
        return [cell.strip() for cell in line[1:-1].split("|")]
    if len(section) < 2 or cells(section[0]) != HEADERS:
        raise ValueError("Queue table must have exact columns: " + " | ".join(HEADERS))
    separators = cells(section[1])
    if len(separators) != len(HEADERS) or not all(re.fullmatch(r":?-{3,}:?", value) for value in separators):
        raise ValueError("malformed Queue table separator")
    rows, by_id = [], {}
    for line in section[2:]:
        values = cells(line)
        if len(values) != len(HEADERS) or not all(values):
            raise ValueError("malformed Queue row; use '-' for empty values")
        row = dict(zip(HEADERS, values))
        identifier = row["ID"]
        if not re.fullmatch(r"[0-9]{3}", identifier) or identifier in by_id:
            raise ValueError(f"invalid or duplicate ID: {identifier}")
        if row["Status"] not in STATUSES:
            raise ValueError(f"{identifier}: invalid status {row['Status']}")
        if row["Status"] == "done" and row["Evidence"] == "-":
            raise ValueError(f"{identifier}: done requires Evidence")
        for field in ("Ticket", "Plan", "Research"):
            if row[field] != "-":
                target = repo_path(root, row[field])
                if field == "Ticket" and not target.is_file():
                    raise ValueError(f"{identifier}: missing ticket file {row[field]}")
            elif field == "Ticket":
                raise ValueError(f"{identifier}: missing Ticket path")
        dependencies = [] if row["Depends on"] == "-" else [dep.strip() for dep in row["Depends on"].split(",")]
        if not all(re.fullmatch(r"[0-9]{3}", dep) for dep in dependencies):
            raise ValueError(f"{identifier}: invalid dependency ID")
        by_id[identifier] = dependencies
        rows.append(row)
    for identifier, dependencies in by_id.items():
        for dependency in dependencies:
            if dependency not in by_id:
                raise ValueError(f"{identifier}: missing dependency {dependency}")
    list(TopologicalSorter(by_id).static_order())
    return rows


def select_rows(rows):
    by_id = {row["ID"]: row for row in rows}
    eligible, blocked = [], []
    for row in sorted(rows, key=lambda row: row["ID"]):
        reason = None
        if row["Status"] != "ready":
            reason = f"status is {row['Status']}"
        elif row["PR"] != "-":
            reason = f"active PR: {row['PR']}"
        else:
            unfinished = [dep.strip() for dep in row["Depends on"].split(",")
                          if dep.strip() != "-" and by_id[dep.strip()]["Status"] != "done"]
            if unfinished:
                reason = f"unfinished dependencies: {', '.join(unfinished)}"
        if reason:
            blocked.append({"id": row["ID"], "reason": reason})
        else:
            eligible.append(row)
    return {"selected": eligible[0] if eligible else None,
            "eligible": eligible, "blocked": blocked}


def check_plan(root, row, plan):
    target = repo_path(root, plan, absolute=True)
    if row["Plan"] == "-" or target != repo_path(root, row["Plan"]):
        raise ValueError("supplied plan does not match queue Plan")
    text = target.read_text()
    fields = {}
    for field in ("Ticket", "Plan status", "Planned at", "In-scope files"):
        values = re.findall(r"^\s*\*\*" + re.escape(field) + r":\*\*([^\n]*)$", text, re.MULTILINE)
        if len(values) != 1:
            raise ValueError(f"plan requires exactly one **{field}:** field")
        value = values[0].strip()
        if (not value or value == "-" or "<!--" in value
                or re.fullmatch(r"TODO|TBD|\.\.\.|<[^>]*>", value, re.IGNORECASE)):
            raise ValueError(f"plan {field} is empty or a placeholder")
        fields[field] = value
    if fields["Ticket"] not in (row["Ticket"], row["Issue"]):
        raise ValueError("plan Ticket does not match queue Ticket or Issue")
    if fields["Plan status"] != "approved":
        raise ValueError("plan must have Plan status approved")
    if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", fields["Planned at"]):
        raise ValueError("Planned at must be a full git commit SHA")
    return fields


def check_freshness(root, fields, base):
    planned = fields["Planned at"].lower()
    commit = git(root, "rev-parse", "--verify", "--end-of-options", planned + "^{commit}")
    if commit != planned:
        raise ValueError("Planned at must identify a commit, not a tag")
    base_commit = git(root, "rev-parse", "--verify", "--end-of-options", base + "^{commit}")
    git(root, "merge-base", "--is-ancestor", planned, base_commit)
    scope = []
    for value in fields["In-scope files"].split(","):
        value = value.strip()
        target = repo_path(root, value)
        if any(char in value for char in "*?") or target.is_dir():
            raise ValueError(f"In-scope files must be literal file paths: {value}")
        value = os.path.normpath(value)
        entry = git(root, "ls-tree", planned, "--", value)
        if entry.startswith(("040000 ", "160000 ")):
            raise ValueError(f"In-scope files must be literal file paths: {value}")
        scope.append(value)
    changed = git(root, "diff", "--no-ext-diff", "--no-textconv", "--name-only", planned, base_commit, "--", *scope)
    if changed:
        raise ValueError(f"stale plan; scoped files changed: {changed}")
    dirty = git(root, "status", "--porcelain=v1", "--untracked-files=all", "--ignored", "--", *scope)
    if dirty:
        raise ValueError(f"stale plan; scoped working files changed: {dirty}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    selection = commands.add_parser("select")
    selection.add_argument("index")
    selection.add_argument("--target")
    check = commands.add_parser("check")
    check.add_argument("index")
    check.add_argument("--target", required=True)
    check.add_argument("--plan", required=True)
    check.add_argument("--base", default="HEAD")
    try:
        args = parser.parse_args()
    except SystemExit as error:
        if error.code:
            raise ValueError("invalid CLI arguments") from None
        raise
    root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel")).resolve()
    owner = artifact_root(root, args.index)
    rows = read_queue(owner, args.index)
    result = select_rows(rows)
    if args.target is not None:
        selected = next((row for row in result["eligible"] if row["ID"] == args.target), None)
        if selected is None:
            reason = next((item["reason"] for item in result["blocked"]
                           if item["id"] == args.target), "unknown ID")
            raise ValueError(f"{args.target}: {reason}")
        result["selected"] = selected
    if args.command == "check":
        fields = check_plan(owner, result["selected"], args.plan)
        check_freshness(root, fields, args.base)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
