#!/usr/bin/env python3
"""
new-handoff.py -- create plan-server artifacts with ISO-timestamp filenames.

With --dest (plan server mode):
    {dest}/projects/{project}/{type}/{YYYY-MM-DD_HH-MM-SS}_{slug}.{ext}

Without --dest (local thoughts mode):
    thoughts/{type}/{Month}/{day}_{time}_{slug}.md  (handoffs/reflections/grill)

All plan server types use flat subdirectories with ISO-8601 timestamp
prefixes for automatic chronological sorting (.sort() == oldest first,
.reverse() == newest first). Plans use .mdx, everything else .md.
"""

import argparse
import datetime
import os
import pathlib
import subprocess
import sys

THOUGHTS_ROOT = pathlib.Path("thoughts")
TYPES = (
    "handoffs", "reflections", "grill",
    "glossary", "adr", "prd", "issues", "reviews", "maps",
    "decisions", "research", "designs", "solutions", "plans",
    "test-cases",
)
MONTHLY_TYPES = ("handoffs", "reflections", "grill")
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def ordinal(n: int) -> str:
    """1 -> 1st, 2 -> 2nd, 3 -> 3rd."""
    suffix = "th" if 11 <= n <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def friendly_time(t: datetime.datetime) -> str:
    """14:28 -> 2_28_PM."""
    ampm = "AM" if t.hour < 12 else "PM"
    hour12 = t.hour % 12 or 12
    return f"{hour12}_{t.minute:02d}_{ampm}"


def display_time(t: datetime.datetime) -> str:
    """14:28 -> 2:28 PM."""
    ampm = "AM" if t.hour < 12 else "PM"
    hour12 = t.hour % 12 or 12
    return f"{hour12}:{t.minute:02d} {ampm}"


def slug(raw: str) -> str:
    """Dash-separated, filename-safe."""
    s = raw.strip()
    for bad in '/\\:*?"<>|':
        s = s.replace(bad, "")
    s = "-".join(s.split())
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-") or "untitled"


def readable(raw: str) -> str:
    """Human title for inside the file."""
    s = raw.strip() or "untitled"
    for bad in '/\\:*?"<>|':
        s = s.replace(bad, "")
    return s


def iso_filename(t: datetime.datetime) -> str:
    """YYYY-MM-DD_HH-MM-SS for ISO-prefixed filenames."""
    return f"{t.year:04d}-{t.month:02d}-{t.day:02d}_{t.hour:02d}-{t.minute:02d}-{t.second:02d}"


def plan_server_ext(art_type: str) -> str:
    """File extension for plan server artifacts."""
    return ".mdx" if art_type == "plans" else ".md"


# --- Templates ---

def reflection_template(title: str, date_str: str, time_str: str) -> str:
    result  = f"# {title}\n"
    result += f"*{date_str} - {time_str}*\n"
    result += "\n## Cold recall (do this first, before opening anything)\n"
    result += "(from memory: what did I do last session? Don't peek.)\n"
    result += "\n## Files I touched (and why)\n"
    result += "\n## Structure changes (and why)\n"
    result += "\n## My rationale\n"
    result += "\n## The big picture\n"
    result += "(Where does this fit in what I'm building?)\n"
    result += "\n## Explain it to someone with zero context\n"
    result += "(The Feynman test. If it won't come out clean, that's the gap.)\n"
    result += "\n## Mode\n"
    result += "(Drive or Delegate? What did I drive vs. hand off?)\n"
    result += "\n## Friction and next thread\n"
    result += "(What's still fuzzy, and what do I pick up next time?)\n"
    return result


def handoff_template(title: str, date_str: str, time_str: str) -> str:
    lines = [
        f"# Agent Handoff: {title}",
        f"*{date_str} - {time_str}*",
        "",
        "## Active Goal",
        "",
        "## Current State",
        "",
        "## Latest User Intent",
        "",
        "## Locked Decisions",
        "",
        "## Do Not Repeat",
        "",
        "## Work Completed",
        "",
        "## Relevant Files",
        "",
        "## Remaining Work",
        "",
        "## Resume Here",
        "",
        "## Open Questions or Blockers",
        "",
        "## Verification Status",
        "",
        "## Success Criteria",
        "",
    ]
    return "\n".join(lines)


def grill_template(title: str, date_str: str, time_str: str) -> str:
    lines = [
        f"# {title} - Grill Session",
        f"*{date_str} - {time_str}*",
        "",
        "> [!summary]",
        "> Plan stress-test session. Key terms challenged, resolved decisions, ADRs created, and remaining open questions.",
        "",
        "## Starting Question",
        "*What was the plan or idea being grilled?*",
        "",
        "> [!question]",
        "> **Open questions**",
        "> - *(add questions still needing resolution)*",
        "",
        "## Terms Challenged",
        "",
        "| Term | Issue | Resolution |",
        "|---|---|---|",
        "| {term} | {what was fuzzy} | {how it was resolved} |",
        "",
        "## Decisions Made",
        "",
        "### Decision: {title}",
        "**Context:** {what prompted the decision}",
        "**Why:** {rationale}",
        "**Tradeoff:** {what was given up}",
        "**Status:** Approved / Pending",
        "",
        "## ADRs Created",
        "",
        "- `adr/NNNN-slug.md` - {title}",
        "",
        "## Key Insights",
        "",
        "> [!todo]",
        "> **Follow-ups**",
        "> - [ ] {action item}",
        "",
        "## Related",
        "",
        "- [[glossary]]",
        "- [[handoff-{related}]]",
        "- [[plan-{related}]]",
        "",
    ]
    return "\n".join(lines)


def empty_template(title: str, date_str: str, time_str: str) -> str:
    return f"# {title}\n*{date_str} - {time_str}*\n\n"


def adr_template(title: str, date_str: str, time_str: str, num: int) -> str:
    s = f"---\ndate: {date_str}\nproject: {{project}}\ntype: adr\ntitle: {title}\n---\n\n"
    s += f"# ADR-{num:04d}: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Status\n\nProposed\n\n## Context\n\n\n## Decision\n\n\n## Consequences\n\n"
    return s

def prd_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: prd\n---\n\n"
    s += f"# PRD: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Problem Statement\n\n\n## Solution\n\n\n## User Stories\n\n\n## Implementation Decisions\n\n\n## Testing Decisions\n\n\n## Out of Scope\n\n\n## Further Notes\n\n"
    return s


def issue_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: issue\n---\n\n"
    s += f"# Issue: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## What to build\n\n\n## Acceptance Criteria\n\n- [ ]\n\n## Blocked by\n\nNone - can start immediately\n"
    return s


def review_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: review\n---\n\n"
    s += f"# Review: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Summary\n\n\n## Findings\n\n"
    return s


def map_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: decision-map\n---\n\n"
    s += f"# Decision Map: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Tickets\n\n"
    return s


def glossary_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: glossary\n---\n\n"
    s += f"# Glossary: {title}\n*{date_str} - {time_str}*\n\n"
    return s


def research_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: research\n---\n\n"
    s += f"# Research: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Summary\n\n\n## Findings\n\n\n## Open Questions\n\n"
    return s


def design_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: design\n---\n\n"
    s += f"# Design: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Summary\n\n\n## Architecture\n\n\n## Decisions\n\n"
    return s


def solutions_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: solutions\n---\n\n"
    s += f"# Solutions: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Options\n\n\n## Recommendation\n\n"
    return s


def decision_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: decision\n---\n\n"
    s += f"# Decision: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Context\n\n\n## Decision\n\n\n## Consequences\n\n"
    return s


def plan_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: plan\n---\n\n"
    s += f"# Plan: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Overview\n\n"
    return s




# --- Router ---
def template(art_type: str, title: str, date_str: str, time_str: str, adr_num: int | None = None, iso_date: str | None = None) -> str:
    templates = {
        "handoffs": handoff_template,
        "reflections": reflection_template,
        "grill": grill_template,
        "glossary": glossary_template,
        "prd": prd_template,
        "issues": issue_template,
        "reviews": review_template,
        "maps": map_template,
        "research": research_template,
        "designs": design_template,
        "solutions": solutions_template,
        "decisions": decision_template,
        "plans": plan_template,
        "test-cases": empty_template,
    }
    if art_type == "adr":
        content = adr_template(title, date_str, time_str, adr_num or 1)
    else:
        tpl = templates.get(art_type, empty_template)
        content = tpl(title, date_str, time_str)
    # Replace frontmatter display date with machine-parseable ISO date
    if iso_date and content.startswith("---"):
        content = content.replace(f"date: {date_str}", f"date: {iso_date}", 1)
    return content

# --- Main ---

def validate_project_root(cwd: pathlib.Path) -> None:
    """Check cwd is a project directory."""
    home = pathlib.Path.home().resolve()
    cwd_resolved = cwd.resolve()
    if cwd_resolved == home:
        print("Refusing to write thoughts/ from home directory. Run from a project.", file=sys.stderr)
        sys.exit(1)
    if not (cwd_resolved / ".git").exists():
        print("Not a git root. Run from a project root.", file=sys.stderr)
        sys.exit(1)


def get_next_adr_num(directory: pathlib.Path) -> int:
    """Find the next available ADR number."""
    if not directory.exists():
        return 1
    nums = []
    for f in directory.iterdir():
        if f.is_file() and f.suffix == ".md":
            try:
                nums.append(int(f.stem.split("-")[0]))
            except (ValueError, IndexError):
                pass
    return max(nums) + 1 if nums else 1


def detect_project(dest: str | pathlib.Path) -> str | None:
    """Auto-detect plan server project from cwd/git context.

    Behavior:
        Tries three strategies in order:
        1. Checks if cwd is inside a plan server project directory
        2. Walks up from git repo root checking each parent dir name
           against existing plan server project directories
        3. Checks the AGENTS_PROJECT_SLUG environment variable
        Returns None if all strategies fail.

    Returns:
        Matching project name string, or None.
    """
    plan_server_root = pathlib.Path(dest)
    cwd = pathlib.Path.cwd().resolve()
    projects_dir = plan_server_root / "projects"

    if not projects_dir.is_dir():
        return None

    # 1. Check if cwd is inside a plan server project dir
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir() and not project_dir.name.startswith("."):
            try:
                project_resolved = project_dir.resolve()
                if str(cwd).startswith(str(project_resolved) + "/") or str(cwd) == str(project_resolved):
                    return project_dir.name
            except (ValueError, OSError):
                pass

    # 2. Walk up from git top-level checking each parent dir name against projects
    try:
        git_top = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if git_top:
            walk = pathlib.Path(git_top)
            while str(walk) != "/":
                name = walk.name
                if name and (projects_dir / name).is_dir():
                    return name
                walk = walk.parent
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # 3. Check AGENTS_PROJECT_SLUG env var
    slug = os.environ.get("AGENTS_PROJECT_SLUG")
    if slug and (projects_dir / slug).is_dir():
        return slug

    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a plan-server artifact.")
    parser.add_argument("--type", choices=TYPES, default="handoffs",
                        help="Artifact type")
    parser.add_argument("--dest",
                        help="Destination root. When set, writes to {dest}/projects/{project}/{type}/ instead of thoughts/{type}/")
    parser.add_argument("--project", default="general",
                        help="Project name for plan server destination (auto-detected from git/cwd when using default)")
    parser.add_argument("--adr-num", type=int,
                        help="ADR number (auto-incremented if omitted)")
    parser.add_argument("topic", nargs="*",
                        help="Topic for the generated file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    now = datetime.datetime.now()
    raw_topic = " ".join(args.topic) or "untitled"
    title = readable(raw_topic)

    # Determine root directory
    if args.dest:
        # Auto-detect project when using default "general"
        project = args.project
        if project == "general":
            detected = detect_project(args.dest)
            if detected:
                project = detected

        # Validate the project directory already exists -- prevents accidental
        # creation of new projects from wrong --project values
        project_dir = pathlib.Path(args.dest) / "projects" / project
        if not project_dir.exists() or not project_dir.is_dir():
            existing = sorted(
                p.name for p in pathlib.Path(args.dest).glob("projects/*/")
                if p.is_dir() and not p.name.startswith(".")
            )
            print(
                f"Error: project '{project}' does not exist in {args.dest}/projects/.\n"
                f"Existing projects: {', '.join(existing)}",
                file=sys.stderr,
            )
            sys.exit(1)
        root = pathlib.Path(args.dest) / "projects" / project
    else:
        if args.type not in MONTHLY_TYPES:
            print(f"Non-monthly type '{args.type}' requires --dest (plan server path)", file=sys.stderr)
            sys.exit(1)
        validate_project_root(pathlib.Path.cwd())
        root = THOUGHTS_ROOT

    short_month = now.strftime("%b")
    date_str = f"{short_month} {now.day}, {now.year}"
    iso_date = f"{now.year:04d}-{now.month:02d}-{now.day:02d}"
    time_str = display_time(now)

    # Determine folder and filename
    art_type = args.type

    if args.dest:
        # Plan server mode: flat dirs, ISO timestamp prefixes
        iso_part = iso_filename(now)
        ext = plan_server_ext(art_type)
        folder = root / art_type
        filename = f"{iso_part}_{slug(raw_topic)}{ext}"
    elif art_type in MONTHLY_TYPES:
        # Local mode: month subdirs, ordinal names
        month_name = MONTHS[now.month - 1]
        folder = root / art_type / month_name
        day_ord = ordinal(now.day)
        time_part = friendly_time(now)
        filename = f"{day_ord}_{time_part}_{slug(raw_topic)}.md"
    elif art_type == "adr":
        folder = root / "adr"
        num = args.adr_num if args.adr_num else get_next_adr_num(folder)
        filename = f"{num:04d}-{slug(raw_topic)}.md"
    elif art_type == "plans":
        folder = root / "plans"
        filename = f"{slug(raw_topic)}.mdx"
    else:
        folder = root / art_type
        filename = f"{slug(raw_topic)}.md"

    folder.mkdir(parents=True, exist_ok=True)
    filepath = folder / filename

    if filepath.exists():
        print(f"Already exists: {filepath}")
        return

    # Get ADR number for template
    adr_num = None
    if art_type == "adr":
        if args.adr_num:
            adr_num = args.adr_num
        else:
            adr_num = get_next_adr_num(folder)

    content = template(art_type, title, date_str, time_str, adr_num, iso_date)
    filepath.write_text(content, encoding="utf-8")
    print(f"Created: {filepath}")


if __name__ == "__main__":
    main()
