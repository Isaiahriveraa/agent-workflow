---
name: wiki
description: Maintain the LLM wiki — ingest sources, query knowledge, lint health, sync project state
trigger: /wiki
---

# Wiki Skill

Operate on the Obsidian wiki at `~/wiki/`. The wiki is an LLM-maintained knowledge base — you write it, the user browses it in Obsidian.

**Before any operation, read `~/wiki/CLAUDE.md` for the full schema and conventions.**

## Subcommands

### `/wiki ingest [path]`

Process a raw source into wiki pages.

1. If `path` is provided, read the file. Otherwise ask the user what to ingest.
2. Read the source fully.
3. Discuss key takeaways with the user.
4. Create a source summary page in `wiki/` with type `source-summary`.
5. Create or update entity/concept pages for important topics.
6. Update existing project pages if relevant.
7. Add `[[wikilinks]]` and update Connections sections on all affected pages.
8. Update `~/wiki/index.md`.
9. Append an ingest entry to `~/wiki/log.md` with format: `## [YYYY-MM-DD] ingest | Source Title`.

### `/wiki query [question]`

Search the wiki and synthesize an answer.

1. Read `~/wiki/index.md` to find relevant pages.
2. Read those pages.
3. Synthesize an answer with `[[wikilinks]]` as citations.
4. If the answer is substantial and reusable, offer to save it as a new wiki page (type: synthesis).

### `/wiki lint`

Health-check the wiki.

1. Read `~/wiki/index.md`.
2. Scan all pages in `~/wiki/wiki/` for:
   - Orphan pages (no inbound `[[wikilinks]]`)
   - Broken `[[wikilinks]]` to nonexistent pages
   - Pages missing Connections section
   - Missing `updated` dates
   - Important concepts mentioned but lacking their own page
3. Report findings as a checklist.
4. Offer to fix each issue.
5. Append a lint entry to `~/wiki/log.md`.

### `/wiki sync`

Pull current project state into wiki pages.

1. Read each project's state from `~/.agents/projects/*/contexts/state.md`.
2. For each project with state:
   - If a wiki page exists in `~/wiki/wiki/projects/`, update the "Current State" section.
   - If no wiki page exists, create one with whatever info is available.
3. Update `~/wiki/index.md` with any new pages.
4. Append a sync entry to `~/wiki/log.md`.

### `/wiki brain [agent-name]`

Create or update an agent brain page.

1. If `agent-name` is provided, work on `~/wiki/wiki/agents/<agent-name>.md`.
2. If no name provided, ask which agent to set up.
3. Create or update the page following the agent brain format from `CLAUDE.md`:
   - Role, Context it needs, Preferences, Lessons learned, Current focus
4. Update `~/wiki/index.md` and `~/wiki/log.md`.

### `/wiki` (no subcommand)

Show available subcommands and current wiki stats:
- Total pages by category
- Last log entry
- Any recent changes
