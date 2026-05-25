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
  gen-antigravity-agents    Generate Gemini-compatible agents from hub agents
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
        "sync.sh gen-openclaw-workspace") cmd_gen_openclaw_workspace ;;
        "sync.sh gen-opencode-skills") cmd_gen_opencode_skills ;;
        "sync.sh sync-nemoclaw-skills") cmd_sync_nemoclaw_skills ;;
        *)
            echo "Unknown generator command in manifest: $1" >&2
            return 1
            ;;
    esac
}

run_manifest_generators() {
    local generator type seen
    seen=""

    while IFS='|' read -r _tool _surface _source _target generator type _outputs; do
        if [ "$type" = "remote-sync" ]; then
            info "Skipping remote-sync generator in migrate: $generator"
            continue
        fi
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
        cp "$HOME/.claude/CLAUDE.md" "$HUB/adapters/claude-code/CLAUDE.md"
        rm "$HOME/.claude/CLAUDE.md"
        ln -s "$HUB/adapters/claude-code/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
        ok "System prompt migrated"
    else
        info "System prompt: already symlinked or doesn't exist"
    fi
}

cleanup_legacy_antigravity_content() {
    local gemini_skills="$HOME/.gemini/skills"

    if [ -L "$gemini_skills" ]; then
        rm "$gemini_skills"
        ok "Removed legacy ~/.gemini/skills symlink"
    elif [ -d "$gemini_skills" ]; then
        local backup="${gemini_skills}.bak.$(date +%Y%m%d%H%M%S)"
        warn "Backing up legacy ~/.gemini/skills to $backup"
        mv "$gemini_skills" "$backup"
    else
        info "Gemini skills mirror: not present"
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

    while IFS='|' read -r tool surface source target _generator type outputs; do
        if [ "$type" = "remote-sync" ]; then
            info "Skipping remote-sync verification for $tool $surface"
            continue
        fi
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
    cleanup_legacy_antigravity_content

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

def rewrite_for_gemini(value):
    return (
        value
        .replace("~/.claude/get-shit-done", "~/.gemini/get-shit-done")
        .replace("$HOME/.claude/get-shit-done", "$HOME/.gemini/get-shit-done")
    )

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
    body = rewrite_for_gemini(content[frontmatter.end():].strip())

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

cmd_gen_opencode_skills() {
    echo "Registering hub skills in OpenCode skill registry..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
import hashlib
import json
import os
import re

hub = os.environ["HUB"]
lock_path = os.path.join(hub, ".skill-lock.json")
skills_dir = os.path.join(hub, "skills")

# Load existing lock file
if os.path.exists(lock_path):
    with open(lock_path, "r", encoding="utf8") as f:
        lock = json.load(f)
else:
    lock = {"version": 3, "skills": {}}

existing = lock.setdefault("skills", {})
now = "2026-05-25T14:00:00.000Z"
added = 0

# Scan hub skills directory for skill subdirs
if os.path.isdir(skills_dir):
    for entry in sorted(os.listdir(skills_dir)):
        skill_dir = os.path.join(skills_dir, entry)
        skill_md = os.path.join(skill_dir, "SKILL.md")
        if not os.path.isdir(skill_dir) or not os.path.isfile(skill_md):
            continue

        # Skip if already registered
        if entry in existing:
            continue

        # Compute folder hash
        hasher = hashlib.sha256()
        for root, dirs, files in sorted(os.walk(skill_dir)):
            for fname in sorted(files):
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, "rb") as fh:
                        hasher.update(fh.read())
                except OSError:
                    pass

        existing[entry] = {
            "source": ".agents",
            "sourceType": "hub",
            "sourceUrl": f"file://{skill_dir}",
            "skillPath": f"skills/{entry}/SKILL.md",
            "skillFolderHash": hasher.hexdigest()[:40],
            "installedAt": now,
            "updatedAt": now,
        }
        print(f"  Registered: {entry}")
        added += 1

if added == 0:
    print("  All hub skills already registered.")

with open(lock_path, "w", encoding="utf8") as f:
    json.dump(lock, f, indent=2, ensure_ascii=False)

print(f"\nDone. {added} skills registered in {lock_path}")
PYEOF
}

cmd_gen_opencode_agents() {
    local target_dir="$HOME/.config/opencode/agents"
    local free_flag="${OPENCODE_FREE_MODELS:-0}"
    # Support --free flag from CLI
    for arg in "$@"; do
        [[ "$arg" == "--free" ]] && free_flag="1"
    done
    mkdir -p "$target_dir"

    echo "Generating OpenCode agents from hub agents..."
    if [[ "$free_flag" == "1" ]]; then
        echo "  Mode: FREE (using OpenCode Zen free models)"
    fi
    echo ""

    OPENCODE_FREE_MODELS="$free_flag" HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
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

FREE_MODEL_MAP = {
    "opus": "opencode/minimax-m2.5-free",
    "sonnet": "opencode/minimax-m2.5-free",
    "haiku": "opencode/minimax-m2.5-free",
}

active_map = FREE_MODEL_MAP if os.environ.get("OPENCODE_FREE_MODELS") == "1" else MODEL_MAP

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
        f"model: {active_map.get(model, active_map['sonnet'])}"
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
    cmd_gen_opencode_agents "$@"
}

cmd_gen_antigravity_agents() {
    local target_dir="$HOME/.gemini/agents"
    mkdir -p "$target_dir"

    echo "Generating Antigravity agents from hub agents..."
    echo ""

    HUB="$HUB" HOME="$HOME" python3 <<'PYEOF'
import glob
import os
import re

source = os.path.join(os.environ["HUB"], "agents")
target = os.path.expanduser("~/.gemini/agents")

TOOL_MAP = {
    "Read": "read_file",
    "Write": "write_file",
    "Edit": "replace",
    "MultiEdit": "replace",
    "Bash": "run_shell_command",
    "Grep": "grep_search",
    "Glob": "glob",
    "LS": "list_directory",
    "WebFetch": "web_fetch",
    "WebSearch": "google_web_search",
    "TodoWrite": "write_todos",
}

SAFE_GEMINI_MODEL_PREFIXES = (
    "gemini-",
    "models/",
)

def parse_frontmatter(content):
    frontmatter = re.match(r'^---\n(.*?)\n---\n?', content, re.DOTALL)
    if not frontmatter:
        return {}, content

    metadata = {}
    for raw_line in frontmatter.group(1).splitlines():
        if not raw_line.strip() or ":" not in raw_line:
            continue
        key, value = raw_line.split(":", 1)
        metadata[key.strip()] = value.strip()

    return metadata, content[frontmatter.end():].lstrip("\n")

def clean_scalar(value):
    value = value.strip().strip('"').strip("'")
    value = value.replace("\\n", " ")
    return " ".join(value.split())

def yaml_quote(value):
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'

def rewrite_for_gemini(value):
    return (
        value
        .replace("~/.claude/get-shit-done", "~/.gemini/get-shit-done")
        .replace("$HOME/.claude/get-shit-done", "$HOME/.gemini/get-shit-done")
    )

def map_tools(value):
    mapped = []
    for raw_tool in [item.strip() for item in value.split(",") if item.strip()]:
        translated = TOOL_MAP.get(raw_tool)
        if translated and translated not in mapped:
            mapped.append(translated)
            if translated == "replace" and "write_file" not in mapped:
                mapped.append("write_file")
    return mapped

expected = {os.path.basename(path) for path in glob.glob(os.path.join(source, "*.md"))}
existing = {name for name in os.listdir(target) if name.endswith(".md")}

for stale in sorted(existing - expected):
    os.remove(os.path.join(target, stale))
    print(f"  Removed stale: {stale}")

generated = 0
for md_file in sorted(glob.glob(os.path.join(source, "*.md"))):
    name = os.path.basename(md_file)

    with open(md_file, 'r', encoding='utf8') as handle:
        content = handle.read()

    metadata, body = parse_frontmatter(content)

    frontmatter_lines = [
        "---",
        "kind: local",
        f"name: {yaml_quote(clean_scalar(metadata.get('name', os.path.splitext(name)[0])))}",
    ]

    description = clean_scalar(metadata.get("description", ""))
    if description:
        frontmatter_lines.append(f"description: {yaml_quote(description)}")

    model = clean_scalar(metadata.get("model", ""))
    if model and model.startswith(SAFE_GEMINI_MODEL_PREFIXES):
        frontmatter_lines.append(f"model: {yaml_quote(model)}")

    tools = map_tools(metadata.get("tools", ""))
    if tools:
        frontmatter_lines.append("tools:")
        for tool in tools:
            frontmatter_lines.append(f"  - {yaml_quote(tool)}")

    frontmatter_lines.append("---")

    rendered = "\n".join(frontmatter_lines) + "\n\n" + rewrite_for_gemini(body.rstrip()) + "\n"
    with open(os.path.join(target, name), 'w', encoding='utf8') as handle:
        handle.write(rendered)

    print(f"  Generated: {name}")
    generated += 1

print(f"\nDone. {generated} agents in {target}")
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

cmd_sync_nemoclaw_skills() {
    local sandbox=""
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --sandbox) sandbox="$2"; shift 2 ;;
            --dry-run) dry_run=true; shift ;;
            *) echo "Unknown option: $1" >&2; return 1 ;;
        esac
    done

    local registry="$HOME/.nemoclaw/sandboxes.json"
    if [[ -z "$sandbox" ]]; then
        if [[ ! -f "$registry" ]]; then
            fail "No sandbox registry at $registry — run nemoclaw onboard first"
            return 1
        fi
        sandbox=$(jq -r '.defaultSandbox // empty' "$registry")
        if [[ -z "$sandbox" ]]; then
            fail "No default sandbox in $registry — pass --sandbox <name>"
            return 1
        fi
    fi

    echo "Syncing skills to NemoClaw sandbox '${sandbox}'..."
    echo ""

    # Read skip list
    local skip_file="$HUB/.nemoclaw-skill-skip"
    local -a skip_list=()
    if [[ -f "$skip_file" ]]; then
        while IFS= read -r line; do
            line="${line%%#*}"
            line="${line// /}"
            [[ -n "$line" ]] && skip_list+=("$line")
        done < "$skip_file"
    fi

    is_skipped() {
        local name="$1"
        for skip in "${skip_list[@]+"${skip_list[@]}"}"; do
            [[ "$name" == "$skip" ]] && return 0
        done
        return 1
    }

    # Stage eligible skills
    local staging
    staging=$(mktemp -d)
    trap "rm -rf '$staging'" EXIT

    local synced=0
    local skipped=0
    local skills_dir="$HUB/skills"

    if [[ ! -d "$skills_dir" ]]; then
        fail "Skills directory not found: $skills_dir"
        return 1
    fi

    for skill_path in "$skills_dir"/*/; do
        [[ -d "$skill_path" ]] || continue
        local skill_name
        skill_name=$(basename "$skill_path")

        if is_skipped "$skill_name"; then
            warn "Skipped: $skill_name"
            skipped=$((skipped + 1))
            continue
        fi

        cp -a "$skill_path" "$staging/$skill_name"
        ok "Staged:  $skill_name"
        synced=$((synced + 1))
    done

    echo ""

    if [[ "$synced" -eq 0 ]]; then
        warn "No skills to sync"
        return 0
    fi

    if $dry_run; then
        echo -e "${YELLOW}Dry run:${NC} would sync $synced skills to sandbox '$sandbox' (skipped $skipped)"
        return 0
    fi

    # Get SSH config for the sandbox
    info "Pushing $synced skills to sandbox '$sandbox'..."

    local ssh_conf
    ssh_conf=$(mktemp "${TMPDIR:-/tmp}/nemoclaw-ssh-XXXXXX.conf")
    openshell sandbox ssh-config "$sandbox" > "$ssh_conf"
    trap "rm -rf '$staging' '$ssh_conf'" EXIT

    # Clean remote skills directory
    ssh -T -F "$ssh_conf" "openshell-${sandbox}" \
        "rm -rf /sandbox/.agents/skills && mkdir -p /sandbox/.agents"

    # Upload staged skills
    openshell sandbox upload "$sandbox" "$staging" /sandbox/.agents/skills

    echo ""
    echo -e "${GREEN}Done.${NC} Synced $synced skills to sandbox '$sandbox' at /sandbox/.agents/skills/ (skipped $skipped)"
}

case "${1:-}" in
    verify)                    cmd_verify ;;
    repair)                    cmd_repair ;;
    migrate)                   cmd_migrate ;;
    gen-agents)                cmd_gen_agents "${@:2}" ;;
    gen-opencode-agents)       cmd_gen_opencode_agents "${@:2}" ;;
    gen-opencode-skills)       cmd_gen_opencode_skills ;;
    gen-antigravity-commands)  cmd_gen_antigravity_commands ;;
    gen-antigravity-agents)    cmd_gen_antigravity_agents ;;
    gen-openclaw-workspace)    cmd_gen_openclaw_workspace ;;
    sync-nemoclaw-skills)      cmd_sync_nemoclaw_skills "${@:2}" ;;
    *)                         usage ;;
esac
