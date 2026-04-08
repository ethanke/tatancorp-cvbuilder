#!/usr/bin/env python3
"""Deploy the built Next.js app to cPanel using Fileman + PassengerApps."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests
import urllib3

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional for CI/local convenience
    load_dotenv = None


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


RUNTIME_ENV_KEYS = [
    "OPENROUTER_API_KEY",
    "NEXT_PUBLIC_BACKEND_URL",
    "BACKEND_URL",
    "NEXT_PUBLIC_APP_URL",
    "NODE_ENV",
]

TOP_LEVEL_FILES = [
    "server.js",
    "package.json",
    "package-lock.json",
]

TOP_LEVEL_DIRS = [
    ".next",
    "public",
]

EXCLUDED_PREFIXES = [
    ".git/",
    "node_modules/",
    "out/",
    ".next/cache/",
    ".next/diagnostics/",
    ".next/types/",
    ".next/turbopack/",
]

EXCLUDED_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".DS_Store",
}

EXCLUDED_SUFFIXES = [
    ".tsbuildinfo",
    ".log",
    ".body",
    ".woff2",
    ".ico",
]


class CpanelAPI:
    def __init__(self) -> None:
        self.host = require_env("CPANEL_HOST")
        self.port = os.getenv("CPANEL_PORT", "2083")
        self.username = require_env("CPANEL_USERNAME")
        self.api_key = require_env("CPANEL_API_KEY")
        self.base_url = f"https://{self.host}:{self.port}"
        self.session = requests.Session()
        self.session.verify = False
        self.session.headers.update(
            {"Authorization": f"cpanel {self.username}:{self.api_key}"}
        )

    def uapi(self, module: str, function: str, params: dict | None = None) -> dict:
        response = self.session.get(
            f"{self.base_url}/execute/{module}/{function}",
            params=params or {},
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("status") == 0:
            raise RuntimeError(
                f"UAPI {module}/{function} failed: {data.get('errors') or data.get('messages')}"
            )
        return data

    def api2(self, module: str, function: str, params: dict | None = None) -> dict:
        url = (
            f"{self.base_url}/json-api/cpanel"
            f"?cpanel_jsonapi_user={self.username}"
            f"&cpanel_jsonapi_apiversion=2"
            f"&cpanel_jsonapi_module={module}"
            f"&cpanel_jsonapi_func={function}"
        )
        response = self.session.get(url, params=params or {}, timeout=60)
        response.raise_for_status()
        return response.json()

    def list_passenger_apps(self) -> dict:
        return self.uapi("PassengerApps", "list_applications").get("data", {})

    def register_passenger_app(
        self,
        *,
        name: str,
        path: str,
        domain: str,
        base_uri: str,
        enabled: bool,
        deployment_mode: str,
    ) -> dict:
        return self.uapi(
            "PassengerApps",
            "register_application",
            {
                "name": name,
                "path": path,
                "domain": domain,
                "base_uri": base_uri,
                "enabled": "1" if enabled else "0",
                "deployment_mode": deployment_mode,
            },
        )

    def enable_passenger_app(self, name: str) -> dict:
        return self.uapi("PassengerApps", "enable_application", {"name": name})

    def mkdir(self, parent: str, name: str) -> None:
        result = self.api2("Fileman", "mkdir", {"path": parent, "name": name})
        cpresult = result.get("cpanelresult", {})
        data = cpresult.get("data", [])
        if data and isinstance(data, list) and data[0].get("result") == 0:
            reason = data[0].get("reason", "unknown")
            if "exists" not in reason.lower():
                raise RuntimeError(f"mkdir failed for {parent}/{name}: {reason}")

    def write_file(self, remote_dir: str, filename: str, content: str) -> None:
        response = self.session.post(
            f"{self.base_url}/execute/Fileman/save_file_content",
            data={"dir": remote_dir, "file": filename, "content": content},
            timeout=300,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("status") == 0:
            raise RuntimeError(
                f"UAPI Fileman/save_file_content failed: {data.get('errors') or data.get('messages')}"
            )


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def infer_domain() -> str:
    app_domain = os.getenv("APP_DOMAIN") or os.getenv("CPANEL_DOMAIN")
    if app_domain:
        return app_domain.strip().replace("https://", "").replace("http://", "").strip("/")

    app_url = os.getenv("NEXT_PUBLIC_APP_URL", "")
    if app_url:
        return app_url.replace("https://", "").replace("http://", "").split("/", 1)[0]

    raise RuntimeError("Set APP_DOMAIN, CPANEL_DOMAIN, or NEXT_PUBLIC_APP_URL")


def build_runtime_env() -> str:
    lines: list[str] = []
    for key in RUNTIME_ENV_KEYS:
        value = os.getenv(key)
        if value is not None:
            lines.append(f"{key}={value}")
    if not any(line.startswith("NODE_ENV=") for line in lines):
        lines.append("NODE_ENV=production")
    return "\n".join(lines) + "\n"


def should_include(rel_path: str) -> bool:
    normalized = rel_path.replace("\\", "/")
    name = Path(normalized).name

    if name in EXCLUDED_NAMES:
        return False
    if any(normalized.startswith(prefix) for prefix in EXCLUDED_PREFIXES):
        return False
    if any(normalized.endswith(suffix) for suffix in EXCLUDED_SUFFIXES):
        return False
    return True


def iter_runtime_files(project_root: Path) -> list[Path]:
    files: list[Path] = []

    for rel_file in TOP_LEVEL_FILES:
        file_path = project_root / rel_file
        if file_path.exists():
            files.append(file_path)

    for rel_dir in TOP_LEVEL_DIRS:
        dir_path = project_root / rel_dir
        if not dir_path.exists():
            continue
        for path in dir_path.rglob("*"):
            if path.is_file():
                rel_path = path.relative_to(project_root).as_posix()
                if should_include(rel_path):
                    files.append(path)

    return sorted(files, key=lambda path: path.relative_to(project_root).as_posix())


def ensure_remote_dirs(api: CpanelAPI, remote_root: str, files: list[Path], project_root: Path) -> None:
    dirs = {remote_root}
    for file_path in files:
        rel_parts = file_path.relative_to(project_root).parts[:-1]
        current = remote_root
        for part in rel_parts:
            current = f"{current}/{part}"
            dirs.add(current)

    for directory in sorted(dirs):
        if directory == remote_root:
            parent = str(Path(directory).parent).replace("\\", "/")
            name = Path(directory).name
            api.mkdir(parent, name)
            continue

        parent = str(Path(directory).parent).replace("\\", "/")
        name = Path(directory).name
        api.mkdir(parent, name)


def upload_runtime(api: CpanelAPI, project_root: Path, remote_root: str) -> int:
    files = iter_runtime_files(project_root)
    ensure_remote_dirs(api, remote_root, files, project_root)

    uploaded = 0
    for file_path in files:
        rel_path = file_path.relative_to(project_root).as_posix()
        remote_dir = f"{remote_root}/{Path(rel_path).parent.as_posix()}" if "/" in rel_path else remote_root
        if remote_dir.endswith("/."):
            remote_dir = remote_root
        content = file_path.read_text(encoding="utf-8")
        api.write_file(remote_dir, Path(rel_path).name, content)
        uploaded += 1
        print(f"uploaded {rel_path}")

    env_content = build_runtime_env()
    api.write_file(remote_root, ".env", env_content)
    api.mkdir(remote_root, "tmp")
    api.write_file(f"{remote_root}/tmp", "restart.txt", "restart\n")
    print("uploaded .env and tmp/restart.txt")
    return uploaded


def ensure_app(api: CpanelAPI, name: str, remote_root: str, domain: str, base_uri: str) -> None:
    apps = api.list_passenger_apps()
    app = apps.get(name)
    if app:
        same_target = (
            app.get("path") == remote_root
            and app.get("domain") == domain
            and app.get("base_uri") == base_uri
        )
        if not same_target:
            raise RuntimeError(
                f"Passenger app '{name}' already exists with different config: {app}"
            )
        print(f"passenger app '{name}' already registered")
        return

    api.register_passenger_app(
        name=name,
        path=remote_root,
        domain=domain,
        base_uri=base_uri,
        enabled=False,
        deployment_mode="production",
    )
    print(f"registered passenger app '{name}'")


def print_status(api: CpanelAPI, remote_root: str, app_name: str) -> None:
    apps = api.list_passenger_apps()
    print(f"registered apps: {list(apps.keys())}")
    if app_name in apps:
        print(apps[app_name])

    try:
        entries = api.api2("Fileman", "listfiles", {"dir": remote_root}).get("cpanelresult", {}).get("data", [])
        names = [entry.get("file") for entry in entries]
        print(f"remote root entries: {names}")
    except Exception as error:
        print(f"status warning: {error}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy Next.js runtime files to cPanel via API")
    parser.add_argument("--deploy", action="store_true", help="Upload runtime files and env")
    parser.add_argument("--register", action="store_true", help="Ensure Passenger app is registered")
    parser.add_argument("--enable", action="store_true", help="Call Passenger ensure_deps_and_enable")
    parser.add_argument("--status", action="store_true", help="Show app and remote root status")
    args = parser.parse_args()

    if load_dotenv is not None:
        load_dotenv()
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        load_dotenv(Path(__file__).resolve().parents[2] / ".env")

    project_root = Path(__file__).resolve().parents[1]
    build_id = project_root / ".next" / "BUILD_ID"
    if (args.deploy or args.enable) and not build_id.exists():
        raise RuntimeError("Missing .next/BUILD_ID. Run npm run build before deploy.")

    api = CpanelAPI()
    domain = infer_domain()
    app_name = os.getenv("CPANEL_APP_NAME", "tatancorp-site")
    base_uri = os.getenv("CPANEL_APP_BASE_URI", "/")
    remote_root = f"/home/{api.username}/{app_name}"

    if args.register:
        ensure_app(api, app_name, remote_root, domain, base_uri)

    if args.deploy:
        uploaded = upload_runtime(api, project_root, remote_root)
        print(f"uploaded {uploaded} runtime files")

    if args.enable:
        try:
            result = api.enable_passenger_app(app_name)
            print(result)
        except RuntimeError as e:
            # App may already be enabled (manually configured in cPanel) — not fatal
            print(f"Warning: enable_passenger_app: {e} (continuing)", file=sys.stderr)

    if args.status or (not args.deploy and not args.register and not args.enable):
        print_status(api, remote_root, app_name)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise