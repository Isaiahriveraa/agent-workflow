# Claude Code Adapter

This directory contains Claude Code-specific operational assets.

## Scope
- Hooks
- Statusline helpers
- Settings helpers

## Canonical Boundary
- Workflow policy lives in `prompts/`, `commands/`, `contexts/`, and `rules/common/`.
- Files in this adapter may improve Claude Code ergonomics, but they must not become the source of truth for workflow behavior.

## Compatibility
- Legacy paths under `/Users/isaiahrivera/.agents/hooks` may delegate to files in this directory.
- Hook failures must remain non-blocking.
