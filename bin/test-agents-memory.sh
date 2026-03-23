#!/usr/bin/env bash
# Test script to verify agents-memory integration with create-plan and implement-plan commands

set -euo pipefail

AGENTS_ROOT="${AGENTS_ROOT:-$HOME/.agents}"

echo "=== Testing agents-memory shell wrappers ==="
echo ""

# Test 1: Verify bin directory exists
echo "Test 1: bin directory exists"
if [[ -d "$AGENTS_ROOT/bin" ]]; then
  echo "  ✓ PASS: $AGENTS_ROOT/bin exists"
else
  echo "  ✗ FAIL: $AGENTS_ROOT/bin does not exist"
  exit 1
fi

# Test 2: Verify all wrapper scripts exist and are executable
echo ""
echo "Test 2: wrapper scripts exist and executable"
for script in agents-memory agents-memory-status agents-memory-recall agents-memory-flush; do
  if [[ -x "$AGENTS_ROOT/bin/$script" ]]; then
    echo "  ✓ PASS: $script is executable"
  else
    echo "  ✗ FAIL: $script missing or not executable"
    exit 1
  fi
done

# Test 3: Test agents-memory status
echo ""
echo "Test 3: agents-memory status"
status_output=$(~/.agents/bin/agents-memory status 2>&1)
if echo "$status_output" | jq -e '.memory.enabled' >/dev/null 2>&1; then
  echo "  ✓ PASS: status returns valid JSON with memory.enabled"
else
  echo "  ✗ FAIL: status did not return expected JSON"
  echo "  Output: $status_output"
  exit 1
fi

# Test 4: Test agents-memory recall create-plan
echo ""
echo "Test 4: agents-memory recall create-plan"
recall_output=$(~/.agents/bin/agents-memory recall create-plan --query "test query" 2>&1)
if echo "$recall_output" | jq -e '.workflow_stage == "create-plan"' >/dev/null 2>&1; then
  echo "  ✓ PASS: recall create-plan returns valid JSON"
else
  echo "  ✗ FAIL: recall create-plan did not return expected JSON"
  echo "  Output: $recall_output"
  exit 1
fi

# Test 5: Test agents-memory recall implement-plan
echo ""
echo "Test 5: agents-memory recall implement-plan"
recall_output=$(~/.agents/bin/agents-memory recall implement-plan --query "test query" 2>&1)
if echo "$recall_output" | jq -e '.workflow_stage == "implement-plan"' >/dev/null 2>&1; then
  echo "  ✓ PASS: recall implement-plan returns valid JSON"
else
  echo "  ✗ FAIL: recall implement-plan did not return expected JSON"
  echo "  Output: $recall_output"
  exit 1
fi

# Test 6: Test agents-memory flush
echo ""
echo "Test 6: agents-memory flush"
flush_output=$(~/.agents/bin/agents-memory flush 2>&1)
if echo "$flush_output" | jq -e '.diagnostics.operation == "flush"' >/dev/null 2>&1; then
  echo "  ✓ PASS: flush returns valid JSON"
else
  echo "  ✗ FAIL: flush did not return expected JSON"
  echo "  Output: $flush_output"
  exit 1
fi

# Test 7: Verify PATH setup (if ~/bin exists and is in PATH)
echo ""
echo "Test 7: PATH integration"
if [[ -L "$HOME/bin" ]] && echo "$PATH" | grep -q "$HOME/bin"; then
  echo "  ✓ PASS: ~/bin symlink exists and is in PATH"
  if command -v agents-memory >/dev/null 2>&1; then
    echo "  ✓ PASS: agents-memory is accessible via PATH"
  else
    echo "  ✗ FAIL: agents-memory not in PATH despite symlink"
  fi
else
  echo "  ⚠ SKIP: ~/bin symlink not set up (optional)"
  echo "  To enable: ln -s ~/.agents/bin ~/bin"
fi

# Test 8: Verify command files reference agents-memory
echo ""
echo "Test 8: Command files reference agents-memory"
if grep -q "agents-memory recall create-plan" "$AGENTS_ROOT/commands/create-plan.md"; then
  echo "  ✓ PASS: create-plan.md references agents-memory"
else
  echo "  ✗ FAIL: create-plan.md does not reference agents-memory"
  exit 1
fi

if grep -q "agents-memory recall implement-plan" "$AGENTS_ROOT/commands/implement_plan.md"; then
  echo "  ✓ PASS: implement_plan.md references agents-memory"
else
  echo "  ✗ FAIL: implement_plan.md does not reference agents-memory"
  exit 1
fi

# Test 9: Verify adapters document agents-memory
echo ""
echo "Test 9: Adapter READMEs document agents-memory"
for adapter in codex-cli opencode antigravity openclaw; do
  if grep -q "agents-memory" "$AGENTS_ROOT/adapters/$adapter/README.md" 2>/dev/null; then
    echo "  ✓ PASS: $adapter/README.md documents agents-memory"
  else
    echo "  ✗ FAIL: $adapter/README.md does not document agents-memory"
    exit 1
  fi
done

echo ""
echo "=== All tests passed ==="
