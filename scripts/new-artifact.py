#!/usr/bin/env python3
"""Create worktree-local context artifacts with truthful, profile-based scaffolds."""

import argparse
import datetime
import pathlib
import re
import subprocess
import sys

TYPES = (
    "handoffs", "reflections", "grill", "adr", "prd", "issue", "review", "reviews", "maps",
    "glossary", "research", "designs", "solutions", "decisions", "plans", "test-cases",
    "discover", "frd", "tickets", "issues",
)


def display_time(t: datetime.datetime) -> str:
    hour12 = t.hour % 12 or 12
    return f"{hour12}:{t.minute:02d} {'AM' if t.hour < 12 else 'PM'}"


def slug(raw: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")
    return s or "untitled"


def readable(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip())
    return s or "Untitled"


def iso_filename(t: datetime.datetime) -> str:
    return f"{t:%Y-%m-%d_%H-%M-%S}"


def frontmatter(title: str, date_str: str, kind: str, extra: str = "") -> str:
    return f"---\ndate: {date_str}\ntitle: {title}\ntype: {kind}\n{extra}---\n\n"


def profile_template(kind: str, title: str, date_str: str, time_str: str) -> str:
    profiles = {
        "handoffs": ("handoff", "Agent Handoff", ["Active Goal", "Current State", "Latest User Intent", "Locked Decisions", "Do Not Repeat", "Work Completed", "Relevant Files", "Remaining Work", "Open Questions or Blockers", "Resume Here", "Verification", "Success Criteria", "Completion"]),
        "designs": ("design", "Design", ["Situation and who", "Evidence", "Opportunity", "Success", "Worth it?", "Key nouns", "Open questions", "Decision", "Vision and goals", "Scope", "Capabilities (MoSCoW)", "Flow", "Domain", "Unknowns", "Slices", "Brain spill (private)"]),
        "research": ("research", "Research", ["Workflow links", "Question", "Conclusion", "Key Evidence", "Options & Tradeoffs", "Recommendation & System Impact", "Decision needed from you", "Remaining Uncertainty", "Sources"]),
        "review": ("review", "Review", ["Summary", "Rationale Table", "Remaining Issues", "Per-module Details", "Related Notes"]),
        "reviews": ("review", "Review", ["Summary", "Rationale Table", "Remaining Issues", "Per-module Details", "Related Notes"]),
        "plans": ("plan", "Plan", ["Ticket", "Code baseline", "Answers the ticket", "Current behavior", "Approach", "Data", "Failure", "Security", "Tests", "Decisions", "Interface impact", "Status"]),
        "discover": ("discover", "Discovery", ["Question", "Context", "Findings", "Decisions", "Next Steps"]),
        "frd": ("frd", "Functional Requirements", ["Functional Requirements", "Problem Statement", "Requirements", "Acceptance Criteria"]),
        "tickets": ("tickets", "Tickets", ["Summary", "Scope", "Acceptance Criteria"]),
    }
    kind_name, heading, sections = profiles.get(kind, (kind.rstrip("s"), kind.title(), ["Summary", "Details", "Notes"]))
    if kind_name == "handoff":
        extra = "author: unknown\ncommit: unknown\nbranch: unknown\nrepository: unknown\ntopic: " + title + " - Handoff\ntags: [handoff]\nstatus: scaffold\nlast_updated: " + date_str + "\nlast_updated_by: unknown\n"
        result = frontmatter(title, date_str, kind_name, extra)
    else:
        result = frontmatter(title, date_str, kind_name)
    result += f"# {heading}: {title}\n*{date_str} - {time_str}*\n\n"
    for section in sections:
        if kind == "plans" and section == "Status":
            placeholder = "**Plan status:** draft"
        elif kind == "plans" and section == "Ticket":
            placeholder = "**Ticket:** <!-- #<issue number>, or \"direct request\". -->"
        elif kind == "plans" and section == "Code baseline":
            placeholder = "**Planned at:** <!-- Full commit SHA inspected for this ticket. -->\n\n**In-scope files:** <!-- Comma-separated repository-relative literal paths; no globs. -->"
        elif kind == "plans" and section == "Answers the ticket":
            placeholder = "<!-- Each acceptance criterion and edge case from the ticket, and how the change meets it. Anything the ticket does not ask for is out. -->"
        elif kind == "plans" and section == "Interface impact":
            placeholder = "- **Interface impact:** <!-- none | new | changed --> — <!-- why -->"
        elif kind == "research" and section == "Workflow links":
            placeholder = "<!-- The ticket (#n) and existing evidence; write 'standalone' when no ticket applies. -->"
        elif kind == "research" and section == "Decision needed from you":
            placeholder = "<!-- One block per architecture decision: the question, its options, a suggestion labeled as a suggestion, then `**Status:** UNDECIDED` until the user records `**Chosen:** <option>`. Leave none when no architecture decision is open. -->"
        elif kind == "designs":
            placeholder = {
                "Situation and who": "<!-- Who has the problem, how it shows up, and today's workaround. -->",
                "Evidence": "<!-- Each claim marked certain, supposed, or unknown. Record task feedback when available; otherwise say not tested. -->",
                "Opportunity": "<!-- The problem stated without a solution in it. -->",
                "Success": "<!-- 1-3 measurable results with a baseline. -->",
                "Worth it?": "<!-- Desirable, viable, feasible, responsible. -->",
                "Key nouns": "<!-- The things people keep naming; the first domain picture. -->",
                "Open questions": "<!-- Ranked by importance x uncertainty. -->",
                "Decision": "<!-- Invest, explore more, defer, or stop. Only the user decides. -->",
                "Vision and goals": "<!-- One or two sentences of vision; goals are the success measures above. -->",
                "Scope": "<!-- In and out. -->",
                "Capabilities (MoSCoW)": "<!-- Must, Should, Could, Won't (this round). -->",
                "Flow": "<!-- One Mermaid flowchart: starting state, action, visible result, and a consequential failure. Link any sketch or prototype and the question it explores. -->",
                "Domain": "<!-- Mermaid erDiagram of the main things, read as sentences. -->",
                "Unknowns": "<!-- Each becomes a Research ticket. -->",
                "Slices": "<!-- Ordered, each with priority and what blocks it, plus a first-release line. -->",
                "Brain spill (private)": "<!-- The user's original words; never published. -->",
            }[section]
        else:
            placeholder = "<!-- Record only verified information, decisions, or clearly labeled placeholders. -->"
        result += f"## {section}\n\n{placeholder}\n\n"
    return result


def grill_template(title: str, date_str: str, time_str: str) -> str:
    return frontmatter(title, date_str, "grill") + f"# Grill Session: {title}\n*{date_str} - {time_str}*\n\n## Opening Orientation\n\n<!-- State the terminal-first goal, current context, and one question to answer. -->\n\n## Q&A Transcript\n\n<!-- Record one question and answer exchange at a time; do not invent answers. -->\n\n## Summary\n\n<!-- Terminal-first transcript summary; no invented answers. -->\n\n### Open Questions\n\n- <!-- Ask one question at a time. -->\n\n### Terms Challenged\n\n| Term | Issue | Resolution |\n|---|---|---|\n\n### Decisions Made\n\n- <!-- Add only decisions reached in this session. -->\n\n### Follow-ups\n\n- <!-- Add a next step only when it is grounded in the transcript. -->\n"




def adr_template(title: str, date_str: str, time_str: str) -> str:
    return frontmatter(title, date_str, "adr", "status: proposed\n") + f"# {title}\n*{date_str} - {time_str}*\n\n## Context\n\n<!-- Problem and forces. -->\n\n## Decision\n\n<!-- State the decision, or leave this as proposed. -->\n\n## Consequences\n\n<!-- Record positive, negative, and neutral consequences. -->\n"


def glossary_template(title: str, date_str: str, time_str: str) -> str:
    return frontmatter(title, date_str, "glossary") + f"# Glossary: {title}\n*{date_str} - {time_str}*\n\n**{title}**: <!-- Definition. -->\n\n_Avoid_: <!-- Terms or interpretations to avoid. -->\n\nRelationships: <!-- Related terms and distinctions. -->\n\nFlagged ambiguities: <!-- Unresolved meaning or usage questions. -->\n\nExample dialogue: <!-- Short truthful usage example. -->\n"


def generic_template(kind: str, title: str, date_str: str, time_str: str) -> str:
    return profile_template(kind, title, date_str, time_str)


def template(art_type: str, title: str, date_str: str, time_str: str, iso_date=None) -> str:
    if art_type == "grill":
        return grill_template(title, date_str, time_str)
    if art_type == "adr":
        return adr_template(title, date_str, time_str)
    if art_type == "glossary":
        return glossary_template(title, date_str, time_str)
    return generic_template(art_type, title, date_str, time_str)


def git_root() -> pathlib.Path | None:
    try:
        result = subprocess.run(["git", "rev-parse", "--show-toplevel"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
        return pathlib.Path(result.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None




def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a worktree-local context artifact.")
    parser.add_argument("--type", choices=TYPES, required=True, dest="art_type")
    parser.add_argument("--topic", nargs="*", dest="topic_flag", help="Topic for the generated file")
    parser.add_argument("topic", nargs="*", help="Topic for the generated file")
    return parser.parse_args()


def bundle_files(kind: str, title: str, date_str: str, time_str: str) -> dict[str, str]:
    if kind == "plans":
        index = profile_template("plans", title, date_str, time_str)
        return {
            "00-index.md": index,
        }
    if kind == "designs":
        index = profile_template("designs", title, date_str, time_str)
        return {
            "00-index.md": index,
        }
    ticket_name = f"001-{slug(title)}.md"
    return {
        ticket_name: (
            f"# {title}\n\n"
            "Parent: #<!-- n --> · Priority: <!-- Must | Should | Could --> (<!-- reason -->) · Size: <!-- XS | S | M --> · Blocked by: <!-- #n or - -->\n\n"
            "## User story\n\n"
            "As a <!-- role -->, I want <!-- capability --> so that <!-- outcome -->.\n\n"
            "## Context\n\n"
            "<!-- What happens today and why it matters. No solution named. -->\n\n"
            "## User flow\n\n"
            "<!-- Mermaid flowchart: the main path plus failures that change what the user sees. -->\n\n"
            "## Edge cases\n\n"
            "- <!-- variation or failure --> -> <!-- expected result -->\n\n"
            "## Acceptance criteria\n\n"
            "- [ ] Given <!-- state -->, when <!-- action -->, then <!-- observable result -->\n\n"
            "## Out of scope\n\n"
            "<!-- What this ticket deliberately excludes. -->\n\n"
            "## Done when\n\n"
            "Tests pass · reviewed · keyboard accessible\n"
        ),
    }


def main() -> None:
    args = parse_args()
    raw_topic = " ".join(args.topic_flag or args.topic).strip() or "untitled"
    title, root = readable(raw_topic), git_root()
    if root is None:
        print("Error: artifact creation requires a Git worktree.", file=sys.stderr)
        sys.exit(1)
    now = datetime.datetime.now()
    date_str, time_str = f"{now:%Y-%m-%d}", display_time(now)
    if args.art_type == "glossary":
        folder = root / "context" / "glossary"
        filepath = folder / "glossary.md"
        folder.mkdir(parents=True, exist_ok=True)
        term = f"**{title}**: <!-- Definition. -->\n"
        if filepath.exists():
            existing = filepath.read_text(encoding="utf-8")
            if term not in existing:
                with filepath.open("a", encoding="utf-8") as handle:
                    handle.write("\n" + term)
                print(f"Appended to: {filepath}")
            else:
                print(f"Already present: {filepath}")
        else:
            filepath.write_text(glossary_template(title, date_str, time_str), encoding="utf-8")
            print(f"Created: {filepath}")
        return
    if args.art_type in ("plans", "issues", "designs"):
        folder = root / "context" / args.art_type / slug(raw_topic)
        files = bundle_files(args.art_type, title, date_str, time_str)
        if folder.exists():
            print(f"Already exists: {folder}")
            for name in files:
                print(f"Existing: {folder / name}")
            return
        folder.mkdir(parents=True, exist_ok=False)
        for name, content in files.items():
            (folder / name).write_text(content, encoding="utf-8")
            print(f"Created: {folder / name}")
        return
    folder = root / "context" / args.art_type
    folder.mkdir(parents=True, exist_ok=True)
    filepath = folder / f"{iso_filename(now)}_{slug(raw_topic)}{'.md'}"
    if filepath.exists():
        print(f"Already exists: {filepath}")
        return
    filepath.write_text(template(args.art_type, title, date_str, time_str), encoding="utf-8")
    print(f"Created: {filepath}")


if __name__ == "__main__":
    main()
