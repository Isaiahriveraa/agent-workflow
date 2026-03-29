---
name: nemoclaw-bridge
description: Use the local NemoClaw sandbox as a reusable chat backend. Trigger this skill when an agent should talk to the user's local NemoClaw/OpenClaw instance, expose it through a local OpenAI-compatible API, or reuse the user's existing NemoClaw tunnel and sandbox from shell scripts or CLI tools.
---

Use this skill when the user wants an agent or CLI to send prompts through the local NemoClaw sandbox instead of a hosted model API.

## What this skill provides

- Direct chat helper: `"$SKILL_DIR/scripts/chat" "your message"`
- Session reset: `"$SKILL_DIR/scripts/chat" --clear`
- Local OpenAI-compatible gateway: `"$SKILL_DIR/scripts/server"`

The skill reads local NemoClaw state from:

- `~/.nemoclaw/credentials.json` for `NVIDIA_API_KEY`
- `~/.nemoclaw/sandboxes.json` for the default sandbox name

## Direct chat

Use the direct helper when the current agent can run shell commands and does not need an HTTP API:

```bash
"$SKILL_DIR/scripts/chat" "Summarize the latest session state"
"$SKILL_DIR/scripts/chat" --user codex "What sandbox am I using?"
"$SKILL_DIR/scripts/chat" --clear
```

The helper persists a local session suffix in `~/.nemoclaw-bridge-session` by default, so follow-up messages stay in the same OpenClaw conversation. `--clear` rotates that suffix.

## Local API server

Use the server when a CLI or tool expects an OpenAI-compatible `chat/completions` endpoint:

```bash
"$SKILL_DIR/scripts/server"
```

Defaults:

- listen address: `127.0.0.1`
- port: `8787`
- base URL: `http://127.0.0.1:8787/v1`
- token file: `~/.nemoclaw-gateway-token`

On first start, the server creates the token file with mode `600` if it does not already exist.

Then point compatible tools at:

```text
OPENAI_BASE_URL=http://127.0.0.1:8787/v1
OPENAI_API_KEY=$(cat ~/.nemoclaw-gateway-token)
```

Supported request shape:

- `POST /v1/chat/completions`
- non-streaming requests only
- uses the last `role=user` message as the prompt
- uses the OpenAI `user` field to derive a stable NemoClaw session

## Environment overrides

- `NEMOCLAW_SANDBOX`: override the sandbox name
- `NEMOCLAW_NVIDIA_API_KEY`: override the API key
- `NEMOCLAW_USER_ID`: default user/session namespace
- `NEMOCLAW_SESSION_FILE`: session suffix file for direct chat
- `NEMOCLAW_BRIDGE_HOST`: server bind host
- `NEMOCLAW_BRIDGE_PORT`: server port
- `NEMOCLAW_BRIDGE_TOKEN_FILE`: server bearer-token file
- `NEMOCLAW_BRIDGE_ALLOW_REMOTE=1`: allow binding or serving non-loopback clients
- `NEMOCLAW_ALLOWED_USERS`: comma-separated allowlist for OpenAI `user` values accepted by the API server

## Notes

- This skill talks to NemoClaw through `openshell sandbox ssh-config` plus `ssh`, not through Telegram.
- If the sandbox is not `Ready`, fix that first with `openshell sandbox list`.
- If an API client supports only hosted OpenAI endpoints, use the local server mode and point it at `127.0.0.1`.
- The server is hardened for local-only use by default. It rejects non-loopback clients unless `NEMOCLAW_BRIDGE_ALLOW_REMOTE=1` is set explicitly.
