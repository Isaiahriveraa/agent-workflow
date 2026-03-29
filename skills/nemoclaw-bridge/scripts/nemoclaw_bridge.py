#!/usr/bin/env python3
import argparse
import json
import os
import re
import secrets
import shlex
import subprocess
import sys
import tempfile
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from ipaddress import ip_address
from pathlib import Path


ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
HOME = Path.home()
NEMOCLAW_DIR = HOME / ".nemoclaw"
CREDS_FILE = NEMOCLAW_DIR / "credentials.json"
SANDBOXES_FILE = NEMOCLAW_DIR / "sandboxes.json"
DEFAULT_SESSION_FILE = HOME / ".nemoclaw-bridge-session"
DEFAULT_TOKEN_FILE = HOME / ".nemoclaw-gateway-token"
MAX_REQUEST_BYTES = 64 * 1024


def load_json(path: Path) -> dict:
    try:
      return json.loads(path.read_text())
    except FileNotFoundError:
      return {}
    except json.JSONDecodeError as exc:
      raise SystemExit(f"Invalid JSON in {path}: {exc}")


def load_credentials() -> dict:
    return load_json(CREDS_FILE)


def require_private_file(path: Path) -> None:
    try:
      mode = path.stat().st_mode & 0o777
    except FileNotFoundError:
      return
    if mode != 0o600:
      os.chmod(path, 0o600)


def get_api_key() -> str:
    api_key = os.environ.get("NEMOCLAW_NVIDIA_API_KEY")
    if api_key:
      return api_key
    creds = load_credentials()
    api_key = creds.get("NVIDIA_API_KEY")
    if api_key:
      return api_key
    raise SystemExit(f"NVIDIA_API_KEY not found in {CREDS_FILE}")


def get_sandbox_name() -> str:
    sandbox = os.environ.get("NEMOCLAW_SANDBOX")
    if sandbox:
      return sandbox
    data = load_json(SANDBOXES_FILE)
    sandbox = data.get("defaultSandbox")
    if sandbox:
      return sandbox
    raise SystemExit(f"defaultSandbox not found in {SANDBOXES_FILE}")


def slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-") or "default"


def session_file_path() -> Path:
    path = os.environ.get("NEMOCLAW_SESSION_FILE")
    return Path(path).expanduser() if path else DEFAULT_SESSION_FILE


def read_or_create_session_suffix(path: Path) -> str:
    try:
      suffix = path.read_text().strip()
      if suffix:
        return suffix
    except FileNotFoundError:
      pass
    suffix = uuid.uuid4().hex
    path.write_text(suffix)
    os.chmod(path, 0o600)
    return suffix


def clear_session_suffix(path: Path) -> str:
    suffix = uuid.uuid4().hex
    path.write_text(suffix)
    os.chmod(path, 0o600)
    return suffix


def build_session_id(user_id: str) -> str:
    suffix = read_or_create_session_suffix(session_file_path())
    return f"nemoclaw-{slugify(user_id)}-{suffix}"


def clean_output(text: str) -> str:
    cleaned_lines = []
    for raw_line in text.splitlines():
      line = ANSI_ESCAPE_RE.sub("", raw_line).strip()
      if not line:
        continue
      if line.startswith("Setting up NemoClaw"):
        continue
      if line.startswith("[plugins]"):
        continue
      if line.startswith("(node:"):
        continue
      if "NemoClaw ready" in line or "NemoClaw registered" in line:
        continue
      if "openclaw agent" in line:
        continue
      if "openshell_sandbox::" in line:
        continue
      if " WARN " in line or " INFO " in line or " ERROR " in line or " DEBUG " in line:
        continue
      if line.startswith("┌") or line.startswith("│") or line.startswith("└"):
        continue
      cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


def run_agent(message: str, user_id: str) -> str:
    sandbox = get_sandbox_name()
    api_key = get_api_key()
    session_id = build_session_id(user_id)

    ssh_config = subprocess.run(
      ["openshell", "sandbox", "ssh-config", sandbox],
      capture_output=True,
      text=True,
      check=False,
    )
    if ssh_config.returncode != 0:
      stderr = clean_output(ssh_config.stderr or ssh_config.stdout)
      raise RuntimeError(stderr or f"failed to load ssh config for sandbox {sandbox}")

    with tempfile.NamedTemporaryFile("w", delete=False, prefix="nemoclaw-bridge-", suffix=".conf") as handle:
      handle.write(ssh_config.stdout)
      conf_path = handle.name

    remote_command = (
      f"export NVIDIA_API_KEY={shlex.quote(api_key)} && "
      "nemoclaw-start openclaw agent --agent main --local "
      f"-m {shlex.quote(message)} --session-id {shlex.quote(session_id)}"
    )

    try:
      result = subprocess.run(
        ["ssh", "-T", "-F", conf_path, f"openshell-{sandbox}", remote_command],
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
      )
    finally:
      try:
        os.unlink(conf_path)
      except FileNotFoundError:
        pass

    response = clean_output(result.stdout)
    if response:
      return response

    stderr = clean_output(result.stderr or result.stdout)
    if result.returncode != 0:
      raise RuntimeError(stderr or f"agent exited with code {result.returncode}")
    return "(no response)"


def token_file_path() -> Path:
    path = os.environ.get("NEMOCLAW_BRIDGE_TOKEN_FILE")
    return Path(path).expanduser() if path else DEFAULT_TOKEN_FILE


def allow_remote() -> bool:
    return os.environ.get("NEMOCLAW_BRIDGE_ALLOW_REMOTE") == "1"


def allowed_users() -> set[str] | None:
    raw = os.environ.get("NEMOCLAW_ALLOWED_USERS", "").strip()
    if not raw:
      return None
    return {item.strip() for item in raw.split(",") if item.strip()}


def is_loopback_client(host: str) -> bool:
    try:
      return ip_address(host).is_loopback
    except ValueError:
      return host in {"localhost"}


def ensure_token_file() -> str:
    path = token_file_path()
    if path.exists():
      require_private_file(path)
      token = path.read_text().strip()
      if token:
        return token
    token = secrets.token_urlsafe(32)
    path.write_text(token + "\n")
    os.chmod(path, 0o600)
    return token


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "nemoclaw-bridge/0.1"

    def _json(self, code: int, payload: dict) -> None:
      body = json.dumps(payload).encode("utf-8")
      self.send_response(code)
      self.send_header("Content-Type", "application/json")
      self.send_header("Content-Length", str(len(body)))
      self.end_headers()
      self.wfile.write(body)

    def _authorized(self) -> bool:
      expected = self.server.token
      header = self.headers.get("Authorization", "")
      if not header.startswith("Bearer "):
        return False
      return secrets.compare_digest(header[7:].strip(), expected)

    def _client_allowed(self) -> bool:
      if self.server.allow_remote:
        return True
      return is_loopback_client(self.client_address[0])

    def do_GET(self) -> None:
      if not self._client_allowed():
        self._json(403, {"error": {"message": "remote clients are disabled", "type": "auth_error"}})
        return
      if self.path == "/healthz":
        self._json(200, {"ok": True, "sandbox": get_sandbox_name()})
        return
      self._json(404, {"error": {"message": "not found", "type": "invalid_request_error"}})

    def do_POST(self) -> None:
      if not self._client_allowed():
        self._json(403, {"error": {"message": "remote clients are disabled", "type": "auth_error"}})
        return
      if self.path != "/v1/chat/completions":
        self._json(404, {"error": {"message": "not found", "type": "invalid_request_error"}})
        return
      if not self._authorized():
        self._json(401, {"error": {"message": "unauthorized", "type": "auth_error"}})
        return
      try:
        content_length = int(self.headers.get("Content-Length", "0"))
      except ValueError:
        content_length = 0
      if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
        self._json(413, {"error": {"message": "request too large or empty", "type": "invalid_request_error"}})
        return
      raw_body = self.rfile.read(content_length)
      try:
        payload = json.loads(raw_body.decode("utf-8"))
      except json.JSONDecodeError as exc:
        self._json(400, {"error": {"message": f"invalid json: {exc}", "type": "invalid_request_error"}})
        return

      if payload.get("stream"):
        self._json(400, {"error": {"message": "streaming is not supported", "type": "invalid_request_error"}})
        return

      messages = payload.get("messages") or []
      user_messages = [m for m in messages if m.get("role") == "user" and isinstance(m.get("content"), str)]
      if not user_messages:
        self._json(400, {"error": {"message": "at least one user message is required", "type": "invalid_request_error"}})
        return

      prompt = user_messages[-1]["content"]
      user_id = payload.get("user") or os.environ.get("NEMOCLAW_USER_ID") or "default"
      allowlist = self.server.allowed_users
      if allowlist is not None and user_id not in allowlist:
        self._json(403, {"error": {"message": f"user '{user_id}' is not allowed", "type": "auth_error"}})
        return

      try:
        content = run_agent(prompt, user_id)
      except Exception as exc:
        self._json(500, {"error": {"message": str(exc), "type": "server_error"}})
        return

      now = int(time.time())
      response = {
        "id": f"chatcmpl-nemoclaw-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": now,
        "model": "nemoclaw/local",
        "choices": [
          {
            "index": 0,
            "finish_reason": "stop",
            "message": {
              "role": "assistant",
              "content": content,
            },
          }
        ],
        "usage": {
          "prompt_tokens": 0,
          "completion_tokens": 0,
          "total_tokens": 0,
        },
      }
      self._json(200, response)

    def log_message(self, fmt: str, *args) -> None:
      sys.stderr.write(f"[nemoclaw-bridge] {fmt % args}\n")


def run_chat(args: argparse.Namespace) -> int:
    session_path = session_file_path()
    if args.clear:
      clear_session_suffix(session_path)
      print(f"Session reset: {session_path}")
      return 0

    user_id = args.user or os.environ.get("NEMOCLAW_USER_ID") or "default"
    if args.message:
      message = " ".join(args.message)
    else:
      message = sys.stdin.read().strip()
    if not message:
      raise SystemExit("Provide a message argument or pipe message content on stdin.")

    print(run_agent(message, user_id))
    return 0


def run_server(args: argparse.Namespace) -> int:
    host = args.host or os.environ.get("NEMOCLAW_BRIDGE_HOST") or "127.0.0.1"
    port = args.port or int(os.environ.get("NEMOCLAW_BRIDGE_PORT", "8787"))
    if not allow_remote() and host not in {"127.0.0.1", "localhost", "::1"}:
      raise SystemExit("Refusing non-loopback bind. Set NEMOCLAW_BRIDGE_ALLOW_REMOTE=1 to override.")
    token = ensure_token_file()

    server = ThreadingHTTPServer((host, port), BridgeHandler)
    server.token = token
    server.allow_remote = allow_remote()
    server.allowed_users = allowed_users()

    token_path = token_file_path()
    print(f"NemoClaw bridge listening on http://{host}:{port}/v1")
    print(f"Bearer token file: {token_path}")
    print(f"Sandbox: {get_sandbox_name()}")
    print(f"Remote clients allowed: {server.allow_remote}")
    if server.allowed_users is not None:
      print(f"Allowed users: {','.join(sorted(server.allowed_users))}")
    try:
      server.serve_forever()
    except KeyboardInterrupt:
      pass
    finally:
      server.server_close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Local NemoClaw bridge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    chat_parser = subparsers.add_parser("chat", help="Send a message directly to NemoClaw")
    chat_parser.add_argument("--user", help="Logical user/session namespace")
    chat_parser.add_argument("--clear", action="store_true", help="Rotate the local session suffix and exit")
    chat_parser.add_argument("message", nargs=argparse.REMAINDER, help="Message to send")
    chat_parser.set_defaults(func=run_chat)

    server_parser = subparsers.add_parser("server", help="Run an OpenAI-compatible local API server")
    server_parser.add_argument("--host", help="Bind host")
    server_parser.add_argument("--port", type=int, help="Bind port")
    server_parser.set_defaults(func=run_server)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
