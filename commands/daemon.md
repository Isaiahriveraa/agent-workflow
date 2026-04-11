---
description: Manage the background daemon for periodic autonomous maintenance
---

# Daemon Commands

The daemon handles background maintenance tasks without blocking your primary sessions. It runs as a lightweight, native background Node.js process (NOT as a Docker container).

When started from a project root, it also scans that project's `thoughts/research/` and `thoughts/plans/` directories every few seconds. If a substantial workflow artifact changes and is not critique-ready, the daemon triggers Codex to run the `rpi-critique` workflow in the background. This path works independently of provider-specific hook support, so it can cover Codex, OpenCode, OpenClaw, and Claude sessions working in the same repo.

## 1. Status

Check if the daemon is currently running:

```bash
node ~/.agents/scripts/daemon-manager.mjs status
```

## 2. Start

Start the daemon locally in the background (detached):

```bash
node ~/.agents/scripts/daemon-manager.mjs start
```

You can also pass an explicit project root:

```bash
node ~/.agents/scripts/daemon-manager.mjs start /absolute/path/to/repo
```

## 3. Add Or Remove Projects

Add another repo to the active watch set:

```bash
node ~/.agents/scripts/daemon-manager.mjs add-project /absolute/path/to/another-repo
```

Remove a repo from the watch set:

```bash
node ~/.agents/scripts/daemon-manager.mjs remove-project /absolute/path/to/repo
```

List the currently watched repos:

```bash
node ~/.agents/scripts/daemon-manager.mjs list-projects
```

## 4. Stop

Kill the local daemon process:

```bash
node ~/.agents/scripts/daemon-manager.mjs stop
```
