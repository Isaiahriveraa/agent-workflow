---
description: Manage the background daemon for periodic autonomous maintenance
---

# Daemon Commands

The daemon handles background maintenance tasks (like hourly memory consolidation) without blocking your primary sessions. It runs as a lightweight, native background Node.js process (NOT as a Docker container).

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

## 3. Stop

Kill the local daemon process:

```bash
node ~/.agents/scripts/daemon-manager.mjs stop
```
