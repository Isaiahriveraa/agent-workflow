# Herdr CLI Development Reference

This reference is specific to the personal Herdr fork and complements the general parallel-dev contracts.

## Binary selection

```bash
REPO=/Users/isaiahrivera/Documents/Github/herdr
export PATH="$REPO/target/debug:$PATH"
herdr-dev --version
herdr-dev inbox --help
```

Use the exact current executable in worker prompts whenever possible. The fork's `inbox enroll` command resolves `current_exe()` and embeds its safely quoted path in the prompt, so a worker launched from a worktree reports through the same fork rather than an unrelated PATH binary.

## Recommended development smoke test

```bash
cd /Users/isaiahrivera/Documents/Github/herdr
cargo build
export PATH="$PWD/target/debug:$PATH"
env -u HERDR_SOCKET_PATH -u HERDR_CLIENT_SOCKET_PATH herdr-dev --session inbox-dev
```

In the coordinator pane:

```bash
herdr-dev inbox create main
herdr-dev inbox enroll main worker-a
herdr-dev inbox enroll main worker-b
herdr-dev inbox watch main --after 0
```

In worker panes:

```bash
herdr-dev inbox send main "tests pass"
herdr-dev inbox send main "blocked on schema"
```

For deterministic checks:

```bash
herdr-dev inbox read main --after 0 --json
herdr-dev inbox wait main --after 2 --timeout 1000
herdr-dev inbox ask main worker-a "What remains?" --timeout 30000
```

## API and state facts

- Inbox names are validated and limited to 32 live inboxes.
- Each inbox retains at most 256 reports; older reports are evicted and reads/watches expose `truncated_before`.
- Reports are ordered by sequence and include source pane/agent metadata, optional reply tokens, and creation time.
- State is server-session-only and disappears on server restart.
- `HERDR_PANE_ID` can provide the coordinator pane identity for CLI creation when `--pane` is omitted.
- `inbox ask` is safe coordinator-to-worker delivery through the existing recognized-agent prompt path. It rejects missing, stale, or non-owning agents rather than injecting raw terminal input.
- Watchers replay retained reports without duplicates, advance cursors after filtered or truncated frames, and reconcile against authoritative inbox state after event-hub gaps.

## Worktree rules

Each worker gets one issue branch and one worktree. The commander allocates Herdr workspaces and panes; workers do not create or remove workspaces. Keep worker commands rooted in their assigned worktree and ensure the debug binary is first on PATH before spawning panes. Use separate session names to avoid accidentally attaching to an unrelated Herdr server.

Before claiming completion, check:

```bash
git status --short --branch
cargo check --locked
cargo nextest run --locked -E 'test(inbox) or test(watch_) or test(inbox_wait) or test(inbox_ask)'
```

Then report the exact commit SHA and verification result to the coordinator inbox and via the canonical STATUS message. Do not push, open a PR, merge, or replace the user's installed `herdr` unless the approved plan and human approval authorize it.
