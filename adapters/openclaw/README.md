# OpenClaw Adapter

This directory contains OpenClaw-specific wrapper assets.

## Managed Surfaces
- `~/.openclaw/CLAUDE.md -> ~/.agents/prompts/system.md`
- `~/.openclaw/workspace/skills -> ~/.agents/skills`
- Generated workspace wrappers:
  - `AGENTS.md`
  - `SOUL.md`
  - `USER.md`
  - `TOOLS.md`

## Local-Only Surfaces
- `~/.openclaw/openclaw.json`
- `~/.openclaw/workspace/IDENTITY.md`

## Canonical Boundary
- Shared workflow policy stays in the hub.
- Wrapper templates in `templates/` preserve OpenClaw-local intent without duplicating hub-owned policy.
