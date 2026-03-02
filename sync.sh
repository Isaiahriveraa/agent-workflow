#!/usr/bin/env bash
set -euo pipefail

HUB="$HOME/.agents"
MANIFEST="$HUB/manifest.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}OK${NC}    $1"; }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; }
info() { echo -e "  $1"; }

# Expand ~ to $HOME in a path string
expand_path() {
    echo "${1/#\~/$HOME}"
}

usage() {
    cat <<'EOF'
Usage: sync.sh <command>

Commands:
  verify                    Check all symlinks are intact, report broken ones
  repair                    Recreate any broken symlinks from manifest
  migrate                   Move content from tool dirs to hub (idempotent)
  gen-agents                Generate OpenCode agent definitions from canonical format
  gen-antigravity-commands  Convert hub .md commands to antigravity .toml format

Run 'sync.sh verify' periodically or on shell startup to catch
tool updates that overwrite symlinks with real directories.
EOF
    exit 1
}

# --- verify ---
cmd_verify() {
    echo "Verifying symlinks from manifest..."
    echo ""

    local all_ok=true

    # Read symlinks from manifest using python (available on macOS)
    while IFS='|' read -r source target; do
        src=$(expand_path "$source")
        tgt=$(expand_path "$target")

        if [ -L "$src" ]; then
            actual=$(readlink "$src")
            if [ "$actual" = "$tgt" ]; then
                ok "$source -> $target"
            else
                fail "$source -> $actual (expected $target)"
                all_ok=false
            fi
        elif [ -e "$src" ]; then
            fail "$source exists but is NOT a symlink (may have been overwritten by tool update)"
            all_ok=false
        else
            warn "$source does not exist (parent dir may not exist)"
            all_ok=false
        fi
    done < <(python3 -c "
import json, sys
with open('$MANIFEST') as f:
    m = json.load(f)
for s in m['symlinks']:
    print(s['source'] + '|' + s['target'])
")

    echo ""
    if $all_ok; then
        echo -e "${GREEN}All symlinks verified.${NC}"
    else
        echo -e "${RED}Some symlinks are broken. Run 'sync.sh repair' to fix.${NC}"
        return 1
    fi
}

# --- repair ---
cmd_repair() {
    echo "Repairing broken symlinks from manifest..."
    echo ""

    while IFS='|' read -r source target type; do
        src=$(expand_path "$source")
        tgt=$(expand_path "$target")

        if [ -L "$src" ]; then
            actual=$(readlink "$src")
            if [ "$actual" = "$tgt" ]; then
                ok "$source (already correct)"
                continue
            fi
        fi

        # If it's a real file/dir (not a symlink), back it up
        if [ -e "$src" ] && [ ! -L "$src" ]; then
            backup="${src}.bak.$(date +%Y%m%d%H%M%S)"
            warn "Backing up $source to ${backup}"
            mv "$src" "$backup"
        fi

        # Remove broken symlink if present
        [ -L "$src" ] && rm "$src"

        # Ensure parent directory exists
        mkdir -p "$(dirname "$src")"

        # Create the symlink
        ln -s "$tgt" "$src"
        ok "Recreated $source -> $target"

    done < <(python3 -c "
import json
with open('$MANIFEST') as f:
    m = json.load(f)
for s in m['symlinks']:
    print(s['source'] + '|' + s['target'] + '|' + s['type'])
")

    echo ""
    echo "Repair complete. Running verify..."
    echo ""
    cmd_verify
}

# --- migrate ---
cmd_migrate() {
    echo "Migrating content to hub (idempotent)..."
    echo ""

    # Create hub directories
    mkdir -p "$HUB"/{agents,commands,hooks,prompts,skills,get-shit-done}

    # Migrate skills
    if [ -d "$HOME/.claude/skills" ] && [ ! -L "$HOME/.claude/skills" ]; then
        cp -rn "$HOME/.claude/skills/"* "$HUB/skills/" 2>/dev/null || true
        rm -rf "$HOME/.claude/skills"
        ln -s "$HUB/skills" "$HOME/.claude/skills"
        ok "Skills migrated"
    else
        info "Skills: already symlinked or doesn't exist"
    fi

    # Migrate agents
    if [ -d "$HOME/.claude/agents" ] && [ ! -L "$HOME/.claude/agents" ]; then
        cp -r "$HOME/.claude/agents/"* "$HUB/agents/" 2>/dev/null || true
        rm -rf "$HOME/.claude/agents"
        ln -s "$HUB/agents" "$HOME/.claude/agents"
        ok "Agents migrated"
    else
        info "Agents: already symlinked or doesn't exist"
    fi

    # Migrate commands
    if [ -d "$HOME/.claude/commands" ] && [ ! -L "$HOME/.claude/commands" ]; then
        cp -r "$HOME/.claude/commands/"* "$HUB/commands/" 2>/dev/null || true
        rm -rf "$HOME/.claude/commands"
        ln -s "$HUB/commands" "$HOME/.claude/commands"
        ok "Commands migrated"
    else
        info "Commands: already symlinked or doesn't exist"
    fi

    # Migrate hooks
    if [ -d "$HOME/.claude/hooks" ] && [ ! -L "$HOME/.claude/hooks" ]; then
        cp -r "$HOME/.claude/hooks/"* "$HUB/hooks/" 2>/dev/null || true
        rm -rf "$HOME/.claude/hooks"
        ln -s "$HUB/hooks" "$HOME/.claude/hooks"
        ok "Hooks migrated"
    else
        info "Hooks: already symlinked or doesn't exist"
    fi

    # Migrate GSD
    if [ -d "$HOME/.claude/get-shit-done" ] && [ ! -L "$HOME/.claude/get-shit-done" ]; then
        cp -r "$HOME/.claude/get-shit-done/"* "$HUB/get-shit-done/" 2>/dev/null || true
        rm -rf "$HOME/.claude/get-shit-done"
        ln -s "$HUB/get-shit-done" "$HOME/.claude/get-shit-done"
        ok "GSD migrated"
    else
        info "GSD: already symlinked or doesn't exist"
    fi

    # Migrate system prompt
    if [ -f "$HOME/.claude/CLAUDE.md" ] && [ ! -L "$HOME/.claude/CLAUDE.md" ]; then
        cp "$HOME/.claude/CLAUDE.md" "$HUB/prompts/system.md"
        rm "$HOME/.claude/CLAUDE.md"
        ln -s "$HUB/prompts/system.md" "$HOME/.claude/CLAUDE.md"
        ok "System prompt migrated"
    else
        info "System prompt: already symlinked or doesn't exist"
    fi

    # Codex AGENTS.md
    mkdir -p "$HOME/.codex"
    if [ -L "$HOME/.codex/AGENTS.md" ]; then
        current_target="$(readlink "$HOME/.codex/AGENTS.md" || true)"
        if [ "$current_target" != "$HUB/AGENTS.md" ]; then
            rm "$HOME/.codex/AGENTS.md"
            ln -s "$HUB/AGENTS.md" "$HOME/.codex/AGENTS.md"
            ok "Codex AGENTS.md relinked"
        else
            info "Codex AGENTS.md: already symlinked"
        fi
    elif [ -e "$HOME/.codex/AGENTS.md" ]; then
        rm "$HOME/.codex/AGENTS.md"
        ln -s "$HUB/AGENTS.md" "$HOME/.codex/AGENTS.md"
        ok "Codex AGENTS.md linked"
    else
        ln -s "$HUB/AGENTS.md" "$HOME/.codex/AGENTS.md"
        ok "Codex AGENTS.md linked"
    fi

    # OpenCode commands
    if [ ! -L "$HOME/.config/opencode/commands" ]; then
        mkdir -p "$HOME/.config/opencode"
        [ -d "$HOME/.config/opencode/commands" ] && rm -rf "$HOME/.config/opencode/commands"
        ln -s "$HUB/commands" "$HOME/.config/opencode/commands"
        ok "OpenCode commands linked"
    else
        info "OpenCode commands: already symlinked"
    fi

    # Antigravity skills
    if [ -d "$HOME/.gemini/antigravity" ] && [ ! -L "$HOME/.gemini/antigravity/skills" ]; then
        [ -d "$HOME/.gemini/antigravity/skills" ] && rm -rf "$HOME/.gemini/antigravity/skills"
        ln -s "$HUB/skills" "$HOME/.gemini/antigravity/skills"
        ok "Antigravity skills linked"
    else
        info "Antigravity skills: already symlinked or parent doesn't exist"
    fi

    # Antigravity commands (format bridge: .md -> .toml)
    cmd_gen_antigravity_commands

    # OpenClaw skills
    if [ -d "$HOME/.openclaw/workspace" ] && [ ! -L "$HOME/.openclaw/workspace/skills" ]; then
        [ -d "$HOME/.openclaw/workspace/skills" ] && rm -rf "$HOME/.openclaw/workspace/skills"
        ln -s "$HUB/skills" "$HOME/.openclaw/workspace/skills"
        ok "OpenClaw skills linked"
    else
        info "OpenClaw skills: already symlinked or parent doesn't exist"
    fi

    echo ""
    echo "Migration complete. Running verify..."
    echo ""
    cmd_verify
}

# --- gen-antigravity-commands ---
cmd_gen_antigravity_commands() {
    local out_dir="$HOME/.gemini/commands"
    mkdir -p "$out_dir"

    echo "Generating antigravity .toml commands from hub .md commands..."
    echo ""

    python3 << 'PYEOF'
import os, re, glob

hub_commands = os.path.expanduser("~/.agents/commands")
out_base = os.path.expanduser("~/.gemini/commands")

generated = 0
skipped = 0

for md_file in sorted(glob.glob(os.path.join(hub_commands, "**/*.md"), recursive=True)):
    # Skip .bak files
    if md_file.endswith(".bak") or ".bak." in md_file:
        continue

    with open(md_file) as f:
        content = f.read()

    # Parse YAML frontmatter
    fm_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if not fm_match:
        print(f"  SKIP  {os.path.relpath(md_file, hub_commands)} (no frontmatter)")
        skipped += 1
        continue

    fm = fm_match.group(1)
    body = content[fm_match.end():].strip()

    desc_m = re.search(r'^description:\s*(.+)$', fm, re.MULTILINE)
    if not desc_m:
        print(f"  SKIP  {os.path.relpath(md_file, hub_commands)} (no description)")
        skipped += 1
        continue

    description = desc_m.group(1).strip().strip('"')

    # Compute output path, mirroring subdirectory structure
    rel = os.path.relpath(md_file, hub_commands)          # e.g. gsd/help.md
    rel_toml = os.path.splitext(rel)[0] + ".toml"         # e.g. gsd/help.toml
    out_path = os.path.join(out_base, rel_toml)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Escape backslashes and double-quotes in the prompt body for TOML multi-line string
    # Use TOML literal multi-line strings (''' ... ''') to avoid escaping issues
    # Fall back to basic double-quote string if body contains '''
    if "'''" in body:
        # Escape for basic TOML string
        escaped = body.replace('\\', '\\\\').replace('"', '\\"')
        toml_content = f'description = "{description}"\nprompt = "{escaped}"\n'
    else:
        toml_content = f"description = \"{description}\"\nprompt = '''\n{body}\n'''\n"

    with open(out_path, 'w') as f:
        f.write(toml_content)

    print(f"  OK    {rel_toml}")
    generated += 1

print(f"\nDone. {generated} commands generated, {skipped} skipped.")
PYEOF
}

# --- gen-agents ---
cmd_gen_agents() {
    local target_dir="$HOME/.config/opencode/agents"
    mkdir -p "$target_dir"

    echo "Generating OpenCode agent definitions from canonical format..."
    echo ""

    # Model mapping: Claude Code format -> OpenCode full model ID
    python3 << 'PYEOF'
import os, re, glob, json

hub = os.path.expanduser("~/.agents/agents")
out = os.path.expanduser("~/.config/opencode/agents")

MODEL_MAP = {
    "opus": "anthropic/claude-opus-4-6",
    "sonnet": "anthropic/claude-sonnet-4-5-20250929",
    "haiku": "anthropic/claude-haiku-4-5-20251001",
}

TOOL_MAP = {
    "Read": "read",
    "Write": "write",
    "Edit": "edit",
    "MultiEdit": "edit",
    "Bash": "bash",
    "Grep": "grep",
    "Glob": "glob",
    "LS": "ls",
    "WebFetch": "fetch",
    "WebSearch": "fetch",
    "TodoWrite": "write",
}

for md_file in sorted(glob.glob(os.path.join(hub, "*.md"))):
    name = os.path.basename(md_file)
    with open(md_file) as f:
        content = f.read()

    # Parse YAML frontmatter
    fm_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if not fm_match:
        continue

    fm = fm_match.group(1)
    body = content[fm_match.end():]

    # Extract fields
    desc_m = re.search(r'^description:\s*(.+)$', fm, re.MULTILINE)
    model_m = re.search(r'^model:\s*(.+)$', fm, re.MULTILINE)
    tools_m = re.search(r'^tools:\s*(.+)$', fm, re.MULTILINE)

    desc = desc_m.group(1).strip().strip('"') if desc_m else ""
    model = model_m.group(1).strip() if model_m else "sonnet"
    tools_str = tools_m.group(1).strip() if tools_m else ""

    # Map model
    oc_model = MODEL_MAP.get(model, MODEL_MAP["sonnet"])

    # Map tools to OpenCode format
    tool_list = [t.strip() for t in tools_str.split(",")]
    oc_tools = {}
    for t in tool_list:
        mapped = TOOL_MAP.get(t)
        if mapped:
            oc_tools[mapped] = True

    # Build OpenCode frontmatter
    oc_fm = f"---\nname: {os.path.splitext(name)[0]}\ndescription: {desc}\nmodel: {oc_model}\n"
    if oc_tools:
        oc_fm += "tools:\n"
        for k, v in sorted(oc_tools.items()):
            oc_fm += f"  {k}: true\n"
    oc_fm += "---\n"

    out_path = os.path.join(out, name)
    with open(out_path, 'w') as f:
        f.write(oc_fm + body)

    print(f"  Generated: {name}")

print(f"\nDone. {len(glob.glob(os.path.join(out, '*.md')))} agents in {out}")
PYEOF
}

# --- main ---
case "${1:-}" in
    verify)                    cmd_verify ;;
    repair)                    cmd_repair ;;
    migrate)                   cmd_migrate ;;
    gen-agents)                cmd_gen_agents ;;
    gen-antigravity-commands)  cmd_gen_antigravity_commands ;;
    *)                         usage ;;
esac
