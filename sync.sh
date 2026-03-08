#!/usr/bin/env bash
set -euo pipefail

HUB="${HUB:-$HOME/.agents}"
MANIFEST="${MANIFEST:-$HUB/manifest.json}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

summary_claude_code_status="OK"
summary_codex_cli_status="OK"
summary_opencode_status="OK"
summary_antigravity_status="OK"
summary_openclaw_status="OK"

summary_claude_code_surfaces=""
summary_codex_cli_surfaces=""
summary_opencode_surfaces=""
summary_antigravity_surfaces=""
summary_openclaw_surfaces=""

ok()   { echo -e "  ${GREEN}OK${NC}    $1"; }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; }
info() { echo -e "  $1"; }

expand_path() {
    local raw="$1"
    if [[ "$raw" == "~/.agents"* ]]; then
        echo "${raw/#\~\/.agents/$HUB}"
    else
        echo "${raw/#\~/$HOME}"
    fi
}

append_unique_surface() {
    local current="$1"
    local surface="$2"
    case " ${current} " in
        *" ${surface} "*) echo "$current" ;;
        *)
            if [ -n "$current" ]; then
                echo "$current $surface"
            else
                echo "$surface"
            fi
            ;;
    esac
}

reset_summary() {
    summary_claude_code_status="OK"
    summary_codex_cli_status="OK"
    summary_opencode_status="OK"
    summary_antigravity_status="OK"
    summary_openclaw_status="OK"

    summary_claude_code_surfaces=""
    summary_codex_cli_surfaces=""
    summary_opencode_surfaces=""
    summary_antigravity_surfaces=""
    summary_openclaw_surfaces=""
}

record_surface_status() {
    local tool="$1"
    local surface="$2"
    local status="$3"

    case "$tool" in
        claude-code)
            summary_claude_code_surfaces=$(append_unique_surface "$summary_claude_code_surfaces" "$surface")
            if [ "$status" = "FAIL" ]; then
                summary_claude_code_status="FAIL"
            fi
            ;;
        codex-cli)
            summary_codex_cli_surfaces=$(append_unique_surface "$summary_codex_cli_surfaces" "$surface")
            if [ "$status" = "FAIL" ]; then
                summary_codex_cli_status="FAIL"
            fi
            ;;
        opencode)
            summary_opencode_surfaces=$(append_unique_surface "$summary_opencode_surfaces" "$surface")
            if [ "$status" = "FAIL" ]; then
                summary_opencode_status="FAIL"
            fi
            ;;
        antigravity)
            summary_antigravity_surfaces=$(append_unique_surface "$summary_antigravity_surfaces" "$surface")
            if [ "$status" = "FAIL" ]; then
                summary_antigravity_status="FAIL"
            fi
            ;;
        openclaw)
            summary_openclaw_surfaces=$(append_unique_surface "$summary_openclaw_surfaces" "$surface")
            if [ "$status" = "FAIL" ]; then
                summary_openclaw_status="FAIL"
            fi
            ;;
    esac
}

tool_label() {
    case "$1" in
        claude-code) echo "Claude Code" ;;
        codex-cli) echo "Codex CLI" ;;
        opencode) echo "OpenCode" ;;
        antigravity) echo "Antigravity" ;;
        openclaw) echo "OpenClaw" ;;
        *) echo "$1" ;;
    esac
}

tool_status_value() {
    case "$1" in
        claude-code) echo "$summary_claude_code_status" ;;
        codex-cli) echo "$summary_codex_cli_status" ;;
        opencode) echo "$summary_opencode_status" ;;
        antigravity) echo "$summary_antigravity_status" ;;
        openclaw) echo "$summary_openclaw_status" ;;
        *) echo "FAIL" ;;
    esac
}

tool_surfaces_value() {
    case "$1" in
        claude-code) echo "$summary_claude_code_surfaces" ;;
        codex-cli) echo "$summary_codex_cli_surfaces" ;;
        opencode) echo "$summary_opencode_surfaces" ;;
        antigravity) echo "$summary_antigravity_surfaces" ;;
        openclaw) echo "$summary_openclaw_surfaces" ;;
        *) echo "" ;;
    esac
}

print_summary_line() {
    local tool="$1"
    local label status surfaces
    label="$(tool_label "$tool")"
    status="$(tool_status_value "$tool")"
    surfaces="$(tool_surfaces_value "$tool")"

    if [ -z "$surfaces" ]; then
        return
    fi

    printf "%-13s %-4s %s\n" "$label" "$status" "$surfaces"
}

print_summary() {
    echo ""
    echo "Parity summary:"
    print_summary_line "claude-code"
    print_summary_line "codex-cli"
    print_summary_line "opencode"
    print_summary_line "antigravity"
    print_summary_line "openclaw"
}

usage() {
    cat <<'EOF'
Usage: sync.sh <command>

Commands:
  verify                    Verify all manifest-declared symlinks and generated outputs
  repair                    Repair all manifest-declared symlinks
  migrate                   Repair symlinks, regenerate adapter outputs, then verify
  gen-agents                Backward-compatible alias for gen-opencode-agents
  gen-opencode-agents       Generate OpenCode agents from hub agents
  gen-antigravity-commands  Generate Antigravity command TOML from hub commands
  gen-antigravity-agents    Generate Antigravity agents from hub agents
  gen-antigravity-gsd       Sync hub get-shit-done content into Antigravity
  gen-openclaw-workspace    Generate OpenClaw workspace wrappers

Set HOME and/or HUB to run against fixture environments without touching your real tool directories.
EOF
    exit 1
}

manifest_symlink_rows() {
    python3 - "$MANIFEST" <<'PYEOF'
import json
import os
import sys

manifest_path = sys.argv[1]
with open(manifest_path, 'r', encoding='utf8') as handle:
    manifest = json.load(handle)

def surface(entry):
    source = entry["source"].rstrip("/")
    base = os.path.basename(source)
    if entry["tool"] == "codex-cli" and base == "AGENTS.md":
        return "agents-entry"
    if base == "CLAUDE.md":
        return "prompt"
    return base

for entry in manifest["symlinks"]:
    print("|".join([
        entry["source"],
        entry["target"],
        entry["tool"],
        surface(entry),
        entry["type"]
    ]))
PYEOF
}

manifest_generator_rows() {
    python3 - "$MANIFEST" <<'PYEOF'
import json
import sys

manifest_path = sys.argv[1]
with open(manifest_path, 'r', encoding='utf8') as handle:
    manifest = json.load(handle)

for entry in manifest["generated"]:
    outputs = ",".join(entry.get("outputs", []))
    print("|".join([
        entry["tool"],
        entry["surface"],
        entry["source"],
        entry["target"],
        entry["generator"],
        entry["type"],
        outputs
    ]))
PYEOF
}

repair_symlink() {
    local source="$1"
    local target="$2"
    local src tgt actual backup

    src="$(expand_path "$source")"
    tgt="$(expand_path "$target")"

    if [ -L "$src" ]; then
        actual="$(readlink "$src")"
        if [ "$actual" = "$tgt" ]; then
            ok "$source (already correct)"
            return 0
        fi
    fi

    if [ -e "$src" ] && [ ! -L "$src" ]; then
        backup="${src}.bak.$(date +%Y%m%d%H%M%S)"
        warn "Backing up $source to $backup"
        mv "$src" "$backup"
    fi

    [ -L "$src" ] && rm "$src"
    mkdir -p "$(dirname "$src")"
    ln -s "$tgt" "$src"
    ok "Recreated $source -> $target"
}

verify_generated_surface() {
    local tool="$1"
    local surface="$2"
    local source="$3"
    local target="$4"
    local outputs="$5"
    local message

    if message="$(HUB="$HUB" HOME="$HOME" python3 - "$tool" "$surface" "$source" "$target" "$outputs" <<'PYEOF'
import glob
import os
import re
import sys

tool, surface, source, target, outputs = sys.argv[1:]
hub = os.environ["HUB"]
home = os.environ["HOME"]

def expand(value):
    if value.startswith("~/.agents"):
        return value.replace("~/.agents", hub, 1)
    if value.startswith("~"):
        return os.path.expanduser(value)
    return value

source = expand(source)
target = expand(target)
declared_outputs = [item for item in outputs.split(",") if item]

def list_files(root):
    if not os.path.exists(root):
        return []
    items = []
    for current_root, _, filenames in os.walk(root):
        for filename in filenames:
            full_path = os.path.join(current_root, filename)
            items.append(os.path.relpath(full_path, root))
    return sorted(items)

def fail(message):
    print(message)
    raise SystemExit(1)

if not os.path.exists(target):
    fail(f"{surface} target missing: {target}")

if tool == "opencode" and surface == "agents":
    expected = [os.path.basename(path) for path in sorted(glob.glob(os.path.join(source, "*.md")))]
    missing = [name for name in expected if not os.path.exists(os.path.join(target, name))]
    if missing:
        fail(f"missing generated agents: {', '.join(missing[:5])}")
    print(f"{len(expected)} agents present")
elif tool == "antigravity" and surface == "commands":
    expected = []
    for md_file in sorted(glob.glob(os.path.join(source, "**/*.md"), recursive=True)):
        if md_file.endswith(".bak") or ".bak." in md_file:
            continue
        with open(md_file, 'r', encoding='utf8') as handle:
            content = handle.read()
        frontmatter = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
        if not frontmatter or not re.search(r'^description:\s*(.+)$', frontmatter.group(1), re.MULTILINE):
            continue
        rel = os.path.relpath(md_file, source)
        expected.append(os.path.splitext(rel)[0] + ".toml")
    missing = [name for name in expected if not os.path.exists(os.path.join(target, name))]
    if missing:
        fail(f"missing generated commands: {', '.join(missing[:5])}")
    print(f"{len(expected)} command files present")
elif tool == "antigravity" and surface == "agents":
    expected = [os.path.basename(path) for path in sorted(glob.glob(os.path.join(source, "*.md")))]
    missing = [name for name in expected if not os.path.exists(os.path.join(target, name))]
    if missing:
        fail(f"missing generated agents: {', '.join(missing[:5])}")
    print(f"{len(expected)} agents present")
elif tool == "antigravity" and surface == "gsd":
    expected = list_files(source)
    missing = [name for name in expected if not os.path.exists(os.path.join(target, name))]
    if missing:
        fail(f"missing synced gsd files: {', '.join(missing[:5])}")
    print(f"{len(expected)} gsd files present")
elif tool == "openclaw" and surface == "workspace-wrappers":
    missing = [name for name in declared_outputs if not os.path.exists(os.path.join(target, name))]
    if missing:
        fail(f"missing workspace wrappers: {', '.join(missing)}")
    print(f"{len(declared_outputs)} workspace wrappers present")
else:
    print(f"target present: {target}")
PYEOF
)"; then
        ok "$tool $surface (${message})"
        record_surface_status "$tool" "$surface" "OK"
        return 0
    fi

    fail "$tool $surface (${message})"
    record_surface_status "$tool" "$surface" "FAIL"
    return 1
}

run_generator_command() {
    case "$1" in
        "sync.sh gen-opencode-agents") cmd_gen_opencode_agents ;;
        "sync.sh gen-antigravity-commands") cmd_gen_antigravity_commands ;;
        "sync.sh gen-antigravity-agents") cmd_gen_antigravity_agents ;;
        "sync.sh gen-antigravity-gsd") cmd_gen_antigravity_gsd ;;
        "sync.sh gen-openclaw-workspace") cmd_gen_openclaw_workspace ;;
        *)
            echo "Unknown generator command in manifest: $1" >&2
            return 1
            ;;
    esac
}

run_manifest_generators() {
    local generator seen
    seen=""

    while IFS='|' read -r _tool _surface _source _target generator _type _outputs; do
        case " ${seen} " in
            *" ${generator} "*) continue ;;
        esac
        seen="${seen} ${generator}"
        run_generator_command "$generator"
    done < <(manifest_generator_rows)
}

migrate_legacy_claude_content() {
    mkdir -p "$HUB"/{agents,commands,hooks,prompts,skills,get-shit-done}

    if [ -d "$HOME/.claude/skills" ] && [ ! -L "$HOME/.claude/skills" ]; then
        cp -rn "$HOME/.claude/skills/." "$HUB/skills/" 2>/dev/null || true
        rm -rf "$HOME/.claude/skills"
        ln -s "$HUB/skills" "$HOME/.claude/skills"
        ok "Skills migrated"
    else
        info "Skills: already symlinked or doesn't exist"
    fi

    if [ -d "$HOME/.claude/agents" ] && [ ! -L "$HOME/.claude/agents" ]; then
        cp -rn "$HOME/.claude/agents/." "$HUB/agents/" 2>/dev/null || true
        rm -rf "$HOME/.claude/agents"
        ln -s "$HUB/agents" "$HOME/.claude/agents"
        ok "Agents migrated"
    else
        info "Agents: already symlinked or doesn't exist"
    fi

    if [ -d "$HOME/.claude/commands" ] && [ ! -L "$HOME/.claude/commands" ]; then
        cp -rn "$HOME/.claude/commands/." "$HUB/commands/" 2>/dev/null || true
        rm -rf "$HOME/.claude/commands"
        ln -s "$HUB/commands" "$HOME/.claude/commands"
        ok "Commands migrated"
    else
        info "Commands: already symlinked or doesn't exist"
    fi

    if [ -d "$HOME/.claude/hooks" ] && [ ! -L "$HOME/.claude/hooks" ]; then
        cp -rn "$HOME/.claude/hooks/." "$HUB/hooks/" 2>/dev/null || true
        rm -rf "$HOME/.claude/hooks"
        ln -s "$HUB/hooks" "$HOME/.claude/hooks"
        ok "Hooks migrated"
    else
        info "Hooks: already symlinked or doesn't exist"
    fi

    if [ -d "$HOME/.claude/get-shit-done" ] && [ ! -L "$HOME/.claude/get-shit-done" ]; then
        cp -rn "$HOME/.claude/get-shit-done/." "$HUB/get-shit-done/" 2>/dev/null || true
        rm -rf "$HOME/.claude/get-shit-done"
        ln -s "$HUB/get-shit-done" "$HOME/.claude/get-shit-done"
        ok "GSD migrated"
    else
        info "GSD: already symlinked or doesn't exist"
    fi

    if [ -f "$HOME/.claude/CLAUDE.md" ] && [ ! -L "$HOME/.claude/CLAUDE.md" ]; then
        cp "$HOME/.claude/CLAUDE.md" "$HUB/prompts/system.md"
        rm "$HOME/.claude/CLAUDE.md"
        ln -s "$HUB/prompts/system.md" "$HOME/.claude/CLAUDE.md"
        ok "System prompt migrated"
    else
        info "System prompt: already symlinked or doesn't exist"
    fi
}

cmd_verify() {
    local all_ok=true
    local src tgt actual generated_ok=true

    reset_summary

    echo "Verifying parity surfaces from manifest..."
    echo ""

    while IFS='|' read -r source target tool surface _type; do
        src="$(expand_path "$source")"
        tgt="$(expand_path "$target")"

        if [ -L "$src" ]; then
            actual="$(readlink "$src")"
            if [ "$actual" = "$tgt" ]; then
                ok "$source -> $target"
                record_surface_status "$tool" "$surface" "OK"
            else
                fail "$source -> $actual (expected $target)"
                record_surface_status "$tool" "$surface" "FAIL"
                all_ok=false
            fi
        elif [ -e "$src" ]; then
            fail "$source exists but is not a symlink"
            record_surface_status "$tool" "$surface" "FAIL"
            all_ok=false
        else
            fail "$source is missing"
            record_surface_status "$tool" "$surface" "FAIL"
            all_ok=false
        fi
    done < <(manifest_symlink_rows)

    while IFS='|' read -r tool surface source target _generator _type outputs; do
        if ! verify_generated_surface "$tool" "$surface" "$source" "$target" "$outputs"; then
            generated_ok=false
        fi
    done < <(manifest_generator_rows)

    print_summary
    echo ""

    if $all_ok && $generated_ok; then
        echo -e "${GREEN}All parity surfaces verified.${NC}"
    else
        echo -e "${RED}Parity verification failed. Run 'sync.sh migrate' to repair/regenerate and re-check.${NC}"
        return 1
    fi
}

cmd_repair() {
    echo "Repairing symlink parity from manifest..."
    echo ""

    while IFS='|' read -r source target _tool _surface _type; do
        repair_symlink "$source" "$target"
    done < <(manifest_symlink_rows)
}

cmd_migrate() {
    echo "Applying CLI workflow parity (idempotent)..."
    echo ""

    migrate_legacy_claude_content

    echo ""
    echo "Repairing manifest symlinks..."
    echo ""
    cmd_repair

    echo ""
    echo "Regenerating adapter outputs..."
    echo ""
    run_manifest_generators

    echo ""
    echo "Running parity verification..."
    echo ""
    cmd_verify
}

cmd_gen_antigravity_commands() {
    local out_dir="$HOME/.gemini/commands"
    mkdir -p "$out_dir"

    echo "Generating Antigravity command TOML from hub commands..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
import glob
import os
import re

hub_commands = os.path.join(os.environ["HUB"], "commands")
out_base = os.path.expanduser("~/.gemini/commands")

generated = 0
skipped = 0

for md_file in sorted(glob.glob(os.path.join(hub_commands, "**/*.md"), recursive=True)):
    if md_file.endswith(".bak") or ".bak." in md_file:
        continue

    with open(md_file, 'r', encoding='utf8') as handle:
        content = handle.read()

    frontmatter = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if not frontmatter:
        print(f"  SKIP  {os.path.relpath(md_file, hub_commands)} (no frontmatter)")
        skipped += 1
        continue

    desc_match = re.search(r'^description:\s*(.+)$', frontmatter.group(1), re.MULTILINE)
    if not desc_match:
        print(f"  SKIP  {os.path.relpath(md_file, hub_commands)} (no description)")
        skipped += 1
        continue

    description = desc_match.group(1).strip().strip('"')
    body = content[frontmatter.end():].strip()

    rel = os.path.relpath(md_file, hub_commands)
    rel_toml = os.path.splitext(rel)[0] + ".toml"
    out_path = os.path.join(out_base, rel_toml)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    if "'''" in body:
        escaped = body.replace('\\', '\\\\').replace('"', '\\"')
        toml_content = f'description = "{description}"\nprompt = "{escaped}"\n'
    else:
        toml_content = f"description = \"{description}\"\nprompt = '''\n{body}\n'''\n"

    with open(out_path, 'w', encoding='utf8') as handle:
        handle.write(toml_content)

    print(f"  OK    {rel_toml}")
    generated += 1

print(f"\nDone. {generated} commands generated, {skipped} skipped.")
PYEOF
}

cmd_gen_opencode_agents() {
    local target_dir="$HOME/.config/opencode/agents"
    mkdir -p "$target_dir"

    echo "Generating OpenCode agents from hub agents..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
import glob
import os
import re

hub = os.path.join(os.environ["HUB"], "agents")
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

generated = 0

for md_file in sorted(glob.glob(os.path.join(hub, "*.md"))):
    name = os.path.basename(md_file)

    with open(md_file, 'r', encoding='utf8') as handle:
        content = handle.read()

    frontmatter = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if not frontmatter:
        continue

    fm = frontmatter.group(1)
    body = content[frontmatter.end():]

    desc_match = re.search(r'^description:\s*(.+)$', fm, re.MULTILINE)
    model_match = re.search(r'^model:\s*(.+)$', fm, re.MULTILINE)
    tools_match = re.search(r'^tools:\s*(.+)$', fm, re.MULTILINE)

    description = desc_match.group(1).strip().strip('"') if desc_match else ""
    model = model_match.group(1).strip() if model_match else "sonnet"
    tools_str = tools_match.group(1).strip() if tools_match else ""

    tool_list = [item.strip() for item in tools_str.split(",") if item.strip()]
    opencode_tools = {}
    for item in tool_list:
        mapped = TOOL_MAP.get(item)
        if mapped:
            opencode_tools[mapped] = True

    frontmatter_lines = [
        "---",
        f"name: {os.path.splitext(name)[0]}",
        f"description: {description}",
        f"model: {MODEL_MAP.get(model, MODEL_MAP['sonnet'])}"
    ]
    if opencode_tools:
        frontmatter_lines.append("tools:")
        for key in sorted(opencode_tools):
            frontmatter_lines.append(f"  {key}: true")
    frontmatter_lines.append("---")

    with open(os.path.join(out, name), 'w', encoding='utf8') as handle:
        handle.write("\n".join(frontmatter_lines) + "\n" + body)

    print(f"  Generated: {name}")
    generated += 1

print(f"\nDone. {generated} agents in {out}")
PYEOF
}

cmd_gen_agents() {
    cmd_gen_opencode_agents
}

cmd_gen_antigravity_agents() {
    local target_dir="$HOME/.gemini/agents"
    mkdir -p "$target_dir"

    echo "Generating Antigravity agents from hub agents..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
import glob
import os
import shutil

source = os.path.join(os.environ["HUB"], "agents")
target = os.path.expanduser("~/.gemini/agents")

expected = {os.path.basename(path) for path in glob.glob(os.path.join(source, "*.md"))}
existing = {name for name in os.listdir(target) if name.endswith(".md")}

for stale in sorted(existing - expected):
    os.remove(os.path.join(target, stale))
    print(f"  Removed stale: {stale}")

generated = 0
for md_file in sorted(glob.glob(os.path.join(source, "*.md"))):
    name = os.path.basename(md_file)
    shutil.copy2(md_file, os.path.join(target, name))
    print(f"  Generated: {name}")
    generated += 1

print(f"\nDone. {generated} agents in {target}")
PYEOF
}

cmd_gen_antigravity_gsd() {
    local target_dir="$HOME/.gemini/get-shit-done"
    mkdir -p "$target_dir"

    echo "Syncing get-shit-done content into Antigravity..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
import os
import shutil

source = os.path.join(os.environ["HUB"], "get-shit-done")
target = os.path.expanduser("~/.gemini/get-shit-done")

source_entries = set()

for current_root, dirnames, filenames in os.walk(source):
    rel_root = os.path.relpath(current_root, source)
    if rel_root == ".":
        rel_root = ""
    target_root = os.path.join(target, rel_root)
    os.makedirs(target_root, exist_ok=True)

    for dirname in dirnames:
        source_entries.add(os.path.join(rel_root, dirname).strip("./"))
        os.makedirs(os.path.join(target_root, dirname), exist_ok=True)

    for filename in filenames:
        rel_path = os.path.join(rel_root, filename).strip("./")
        source_entries.add(rel_path)
        shutil.copy2(os.path.join(current_root, filename), os.path.join(target_root, filename))
        print(f"  Synced: {rel_path}")

for current_root, dirnames, filenames in os.walk(target, topdown=False):
    rel_root = os.path.relpath(current_root, target)
    if rel_root == ".":
        rel_root = ""

    for filename in filenames:
        rel_path = os.path.join(rel_root, filename).strip("./")
        if rel_path not in source_entries:
            os.remove(os.path.join(current_root, filename))
            print(f"  Removed stale: {rel_path}")

    for dirname in dirnames:
        rel_path = os.path.join(rel_root, dirname).strip("./")
        full_path = os.path.join(current_root, dirname)
        if rel_path not in source_entries and not os.listdir(full_path):
            os.rmdir(full_path)
            print(f"  Removed stale dir: {rel_path}")

print("\nDone. Antigravity get-shit-done content synchronized.")
PYEOF
}

cmd_gen_openclaw_workspace() {
    local workspace_dir="$HOME/.openclaw/workspace"
    mkdir -p "$workspace_dir"

    echo "Generating OpenClaw workspace wrappers..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
from datetime import datetime, timezone
import os
import shutil

workspace = os.path.expanduser("~/.openclaw/workspace")
marker = "<!-- Generated by ~/.agents/sync.sh -->"
timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
hub = os.environ["HUB"]
template_root = os.path.join(hub, "adapters", "openclaw", "templates")
template_names = ["AGENTS.md", "SOUL.md", "USER.md", "TOOLS.md"]

for name in template_names:
    with open(os.path.join(template_root, name), 'r', encoding='utf8') as handle:
        content = handle.read().replace("{{HUB}}", hub)
    target = os.path.join(workspace, name)
    if os.path.exists(target):
        with open(target, 'r', encoding='utf8') as handle:
            existing = handle.read()
        if marker not in existing:
            backup = f"{target}.bak.{timestamp}"
            shutil.copy2(target, backup)
            print(f"  Backed up: {os.path.basename(backup)}")
    with open(target, 'w', encoding='utf8') as handle:
        handle.write(content.rstrip() + "\n")
    print(f"  Generated: {name}")

print("\nDone. OpenClaw workspace wrappers refreshed.")
PYEOF
}

case "${1:-}" in
    verify)                    cmd_verify ;;
    repair)                    cmd_repair ;;
    migrate)                   cmd_migrate ;;
    gen-agents)                cmd_gen_agents ;;
    gen-opencode-agents)       cmd_gen_opencode_agents ;;
    gen-antigravity-commands)  cmd_gen_antigravity_commands ;;
    gen-antigravity-agents)    cmd_gen_antigravity_agents ;;
    gen-antigravity-gsd)       cmd_gen_antigravity_gsd ;;
    gen-openclaw-workspace)    cmd_gen_openclaw_workspace ;;
    *)                         usage ;;
esac
