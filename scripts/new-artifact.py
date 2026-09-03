#!/usr/bin/env python3
"""Create worktree-local context artifacts with ISO-timestamp filenames.

Writes to {git-root}/context/{type}/{YYYY-MM-DD_HH-MM-SS}_{slug}.md.
"""

import argparse
import datetime
import pathlib
import subprocess
import sys

TYPES = (
    "handoffs", "reflections", "grill",
    "glossary", "adr", "prd", "issues", "reviews", "maps", "discover", "frd", "tickets",
    "decisions", "research", "designs", "solutions", "plans",
    "test-cases",
)


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


def artifact_ext(_: str) -> str:
    """All context artifacts use plain Markdown."""
    return ".md"


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
        "## Summary",
        "Plan stress-test session. Key terms challenged, resolved decisions, ADRs created, and remaining open questions.",
        "",
        "## Starting Question",
        "*What was the plan or idea being grilled?*",
        "",
        "### Open Questions",
        "- *(add questions still needing resolution)*",
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
        "### Follow-ups",
        "- [ ] {action item}",
        "",
        "## Related",
        "",
        "- `context/glossary/glossary.md`",
        "- `context/handoffs/...`",
        "- `context/plans/...`",
        "",
    ]
    return "\n".join(lines)

def empty_template(title: str, date_str: str, time_str: str) -> str:
    return f"# {title}\n*{date_str} - {time_str}*\n\n"


def adr_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: adr\nstatus: proposed\n---\n\n"
    s += f"# {title}\n*{date_str} - {time_str}*\n\n"
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

def discover_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: discover\n---\n\n"
    s += f"# Discovery: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Summary\n\n\n## Findings\n\n\n## Next Steps\n\n"
    return s


def frd_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: frd\n---\n\n"
    s += f"# Functional Requirements: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Problem Statement\n\n\n## Requirements\n\n\n## Acceptance Criteria\n\n"
    return s


def tickets_template(title: str, date_str: str, time_str: str) -> str:
    s = f"---\ndate: {date_str}\ntitle: {title}\ntype: tickets\n---\n\n"
    s += f"# Ticket: {title}\n*{date_str} - {time_str}*\n\n"
    s += "## Summary\n\n\n## Scope\n\n\n## Acceptance Criteria\n\n"
    return s




# --- Router ---
def template(art_type: str, title: str, date_str: str, time_str: str, iso_date: str | None = None) -> str:
    templates = {
        "handoffs": handoff_template,
        "reflections": reflection_template,
        "grill": grill_template,
        "glossary": glossary_template,
        "adr": adr_template,
        "prd": prd_template,
        "issues": issue_template,
        "reviews": review_template,
        "maps": map_template,
        "discover": discover_template,
        "frd": frd_template,
        "tickets": tickets_template,
        "research": research_template,
        "designs": design_template,
        "solutions": solutions_template,
        "decisions": decision_template,
        "plans": plan_template,
        "test-cases": empty_template,
    }
    tpl = templates.get(art_type, empty_template)
    content = tpl(title, date_str, time_str)
    # Replace frontmatter display date with machine-parseable ISO date
    if iso_date and content.startswith("---"):
        content = content.replace(f"date: {date_str}", f"date: {iso_date}", 1)
    return content
# --- Main ---


def git_root() -> pathlib.Path | None:
    """Return the current worktree root, or None outside a Git worktree."""
    try:
        git_top = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if not git_top:
            return None
        return pathlib.Path(git_top).resolve()
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a worktree-local context artifact.")
    parser.add_argument("--type", choices=TYPES, default="handoffs",
                        help="Artifact type")
    parser.add_argument("--topic", dest="topic_flag",
                        help="Topic for the generated file")
    parser.add_argument("topic", nargs="*",
                        help="Topic for the generated file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    now = datetime.datetime.now()
    raw_topic = args.topic_flag or " ".join(args.topic) or "untitled"
    title = readable(raw_topic)

    repo_root = git_root()
    if repo_root is None:
        print("Error: artifact creation requires a Git worktree.", file=sys.stderr)
        sys.exit(1)
    root = repo_root / "context"

    short_month = now.strftime("%b")
    date_str = f"{short_month} {now.day}, {now.year}"
    iso_date = f"{now.year:04d}-{now.month:02d}-{now.day:02d}"
    time_str = display_time(now)

    # Determine folder and filename
    art_type = args.type

    if art_type == 'glossary':
        folder = root / 'glossary'
        folder.mkdir(parents=True, exist_ok=True)
        filepath = folder / 'glossary.md'
        term_header = f"**{title}**:\n"
        term_body = f"{{A one or two sentence description of {title}}}\n_Avoid_: \n"
        if filepath.exists():
            with open(filepath, "a", encoding="utf-8") as f:
                f.write(f"\n{term_header}{term_body}")
            print(f"Appended to: {filepath}")
            return
        else:
            header = f"# Glossary\n\n{term_header}{term_body}"
            filepath.write_text(header, encoding="utf-8")
            print(f"Created: {filepath}")
            return
    else:
        iso_part = iso_filename(now)
        ext = artifact_ext(art_type)
        folder = root / art_type
        filename = f"{iso_part}_{slug(raw_topic)}{ext}"
    folder.mkdir(parents=True, exist_ok=True)
    filepath = folder / filename

    if filepath.exists():
        print(f"Already exists: {filepath}")
        return

    content = template(art_type, title, date_str, time_str, iso_date)
    filepath.write_text(content, encoding="utf-8")
    print(f"Created: {filepath}")
    return

if __name__ == "__main__":
    main()
