#!/usr/bin/env python3
"""
new-handoff.py — create handoff, reflection, grill, or other plan-server artifact.

Creates, with --dest set (plan server):
    {dest}/projects/{project}/{type}/{filename}

Creates, without --dest (project-local thoughts/):
    thoughts/{type}/{Month}/{day}_{time}_{slug}.md   (handoffs/reflections/grill)

Supported types:
  handoffs, reflections, grill    — monthly subdirs, readable date names
  adr                             — sequential numbering (0001-*.md)
  plans                           — .mdx extension
  glossary, prd, issues, reviews, maps, decisions, research, designs, solutions, test-cases
                                  — slug-based .md names
"""

import argparse
import datetime
import pathlib
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
    """1 -> '1st', 2 -> '2nd', 3 -> '3rd'."""
    suffix = "th" if 11 <= n <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def friendly_time(t: datetime.datetime) -> str:
    """14:28 -> '2_28_PM'."""
    ampm = "AM" if t.hour < 12 else "PM"
    hour12 = t.hour % 12 or 12
    return f"{hour12}_{t.minute:02d}_{ampm}"


def display_time(t: datetime.datetime) -> str:
    """14:28 -> '2:28 PM'."""
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


# ── Templates ──────────────────────────────────────────────

def reflection_template(title: str, date_str: str, time_str: str) -> str:
    return f"""# {title}
*{date_str} · {time_str}*

## Cold recall (do this first, before opening anything)
<!-- From memory: what did I do last session? Don't peek. -->

## Files I touched (and why)

## Structure changes (and why)

## My rationale

## The big picture
<!-- Where does this fit in what I'm building? -->

## Explain it to someone with zero context
<!-- The Feynman test. If it won't come out clean, that's the gap. -->

## Mode
<!-- Drive or Delegate? What did I drive vs. hand off? -->

## Friction & next thread
<!-- What's still fuzzy, and what do I pick up next time? -->
"""


def handoff_template(title: str, date_str: str, time_str: str) -> str:
    return f"""# Handoff: {title}
*{date_str} · {time_str}*

## Task(s)

## Critical References

## Recent changes

## Learnings

## Artifacts

## Action Items & Next Steps

## Other Notes
"""


def grill_template(title: str, date_str: str, time_str: str) -> str:
    return f"""# {title} — Grill Session
*{date_str} · {time_str}*

> [!summary]
> Plan stress-test session. Key terms challenged, resolved decisions, ADRs created, and remaining open questions.

## Starting Question
*What was the plan or idea being grilled?*

> [!question]
> **Open questions**
> - *(add questions still needing resolution)*

## Terms Challenged

| Term | Issue | Resolution |
|------|-------|------------|
| {{term}} | {{what was fuzzy}} | {{how it was resolved}} |

## Decisions Made

### Decision: {{title}}
**Context:** {{what prompted the decision}}
**Why:** {{rationale}}
**Tradeoff:** {{what was given up}}
**Status:** Approved / Pending

## ADRs Created

- `adr/NNNN-slug.md` — {{title}}

## Key Insights

> [!todo]
> **Follow-ups**
> - [ ] {{action item}}

## Related

- [[glossary]]
- [[handoff-{{related}}]]
- [[plan-{{related}}]]
"""


def empty_template(title: str, date_str: str, time_str: str) -> str:
    return f"# {title}\n*{date_str} · {time_str}*\n\n"


def adr_template(title: str, date_str: str, time_str: str, num: int) -> str:
    return f"""---
date: {date_str}
project: {{project}}
type: adr
title: {title}
---

# ADR-{num:04d}: {title}

## Status

Proposed

## Context


## Decision


## Consequences

"""


def prd_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: prd
---

# PRD: {title}

## Problem Statement


## Solution


## User Stories


## Implementation Decisions


## Testing Decisions


## Out of Scope


## Further Notes

"""


def issue_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: issue
---

# Issue: {title}

## What to build


## Acceptance Criteria

- [ ]

## Blocked by

None - can start immediately
"""


def review_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: review
---

# Review: {title}

## Summary


## Findings

"""


def map_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: decision-map
---

# Decision Map: {title}

## Tickets

"""


def glossary_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: glossary
---

# Glossary: {title}

"""


def research_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: research
---

# Research: {title}

## Summary


## Findings


## Open Questions

"""


def design_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: design
---

# Design: {title}

## Summary


## Architecture


## Decisions

"""


def solutions_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: solutions
---

# Solutions: {title}

## Options


## Recommendation

"""


def decision_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: decision
---

# Decision: {title}

## Context


## Decision


## Consequences

"""


def plan_template(title: str, date_str: str, time_str: str) -> str:
    return f"""---
date: {date_str}
title: {title}
type: plan
---

# Plan: {title}

## Overview

"""


# ── Router ─────────────────────────────────────────────────

def template(art_type: str, title: str, date_str: str, time_str: str, adr_num: int | None = None) -> str:
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
        return adr_template(title, date_str, time_str, adr_num or 1)
    tpl = templates.get(art_type, empty_template)
    return tpl(title, date_str, time_str)


# ── Main ───────────────────────────────────────────────────

def validate_project_root(cwd: pathlib.Path) -> None:
    """Check cwd is a project directory with a reasonable structure."""
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a handoff, reflection, grill, or plan-server artifact.")
    parser.add_argument("--type", choices=TYPES, default="handoffs",
                        help="Artifact type")
    parser.add_argument("--dest",
                        help="Destination root. When set, writes to {dest}/projects/{project}/{type}/ instead of thoughts/{type}/")
    parser.add_argument("--project", default="general",
                        help="Project name for plan server destination")
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
        root = pathlib.Path(args.dest) / "projects" / args.project
    else:
        if args.type not in MONTHLY_TYPES:
            print(f"Non-monthly type '{args.type}' requires --dest (plan server path)", file=sys.stderr)
            sys.exit(1)
        validate_project_root(pathlib.Path.cwd())
        root = THOUGHTS_ROOT

    date_str = f"{MONTHS[now.month - 1]} {ordinal(now.day)}, {now.year}"
    time_str = display_time(now)

    # Determine folder and filename
    art_type = args.type

    if art_type in MONTHLY_TYPES:
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

    content = template(art_type, title, date_str, time_str, adr_num)
    filepath.write_text(content, encoding="utf-8")
    print(f"Created: {filepath}")


if __name__ == "__main__":
    main()
