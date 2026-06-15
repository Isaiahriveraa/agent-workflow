#!/usr/bin/env python3
"""
new-handoff.py - create a dated handoff, reflection, or grill file.

Creates, from a project root:
    thoughts/June-2026/W1/handoffs/Jun-05_7-30pm--orb-state-machine.md

Use --type handoffs, --type reflections, or --type grill. Names use a 12-hour
clock, dash-separated slugs, and no whitespace in folders or filenames.
"""

import argparse
import datetime
import sys
from pathlib import Path


THOUGHTS_ROOT = Path("thoughts")
TYPES = ("handoffs", "reflections", "grill")
MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def ordinal(n: int) -> str:
    """1 -> '1st', 2 -> '2nd', 3 -> '3rd', 11 -> '11th', 23 -> '23rd'."""
    if 11 <= (n % 100) <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def friendly_time(t: datetime.datetime, sep: str = ":") -> str:
    """11:55 -> '11:55am' (sep=':') or '11-55am' (sep='-')."""
    hour12 = t.hour % 12 or 12
    ampm = "am" if t.hour < 12 else "pm"
    return f"{hour12}{sep}{t.minute:02d}{ampm}"


def slug(raw: str) -> str:
    """Dash-separated, no whitespace, filename-safe."""
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
    return f"""# {title} -- Grill Session
*{date_str} · {time_str}*

## Starting Question

## Terms Challenged

## Terms Resolved

## ADRs Created

## Key Insights
"""


def template(kind: str, title: str, date_str: str, time_str: str) -> str:
    if kind == "handoffs":
        return handoff_template(title, date_str, time_str)
    if kind == "grill":
        return grill_template(title, date_str, time_str)
    return reflection_template(title, date_str, time_str)


def validate_project_root(cwd: Path) -> None:
    home = Path.home().resolve()
    resolved = cwd.resolve()
    if resolved == home or resolved == Path("/"):
        print(
            "Error: run new-handoff.py from a project root, not from home or /.",
            file=sys.stderr,
        )
        sys.exit(1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a thoughts handoff/reflection/grill file.")
    parser.add_argument("--type", choices=TYPES, default="handoffs")
    parser.add_argument("topic", nargs="*", help="Topic for the generated file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    validate_project_root(Path.cwd())

    now = datetime.datetime.now()
    raw_topic = " ".join(args.topic) or "untitled"

    month_folder = now.strftime("%B-%Y")
    week_folder = f"W{((now.day - 1) // 7) + 1}"
    filename = f"{now.strftime('%b-%d')}_{friendly_time(now, sep='-')}--{slug(raw_topic)}.md"

    folder = THOUGHTS_ROOT / month_folder / week_folder / args.type
    folder.mkdir(parents=True, exist_ok=True)

    path = folder / filename
    if path.exists():
        print(f"Already exists: {path}")
        return

    date_str = f"{MONTHS[now.month - 1]} {ordinal(now.day)}, {now.year}"
    path.write_text(template(args.type, readable(raw_topic), date_str, friendly_time(now)), encoding="utf-8")
    print(f"Created: {path}")


if __name__ == "__main__":
    main()
