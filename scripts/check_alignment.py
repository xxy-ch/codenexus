#!/usr/bin/env python3
"""Verify frontend/backend/database alignment for the Online Judge workspace."""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request


FRONTEND_CALL_RE = re.compile(
    r"api\.(get|post|put|patch|delete)(?:<[^>]+>)?\(\s*([\"'`])(.+?)\2",
    re.DOTALL,
)
NEST_RE = re.compile(r'\.nest\("([^"]+)"\s*,\s*([a-zA-Z_]+)::')
METHOD_RE = re.compile(r"\b(get|post|put|patch|delete)\b")


@dataclass(frozen=True)
class Endpoint:
    method: str
    path: str
    source: str


def normalize_path(path: str) -> str:
    stripped = path.split("?", 1)[0].strip()
    stripped = re.sub(r"\$\{[^}]+\}", ":param", stripped)
    stripped = re.sub(r"//+", "/", stripped)
    if not stripped.startswith("/"):
        stripped = f"/{stripped}"
    return stripped.rstrip("/") or "/"


def extract_frontend_calls(source: str) -> list[tuple[str, str]]:
    calls: list[tuple[str, str]] = []
    for method, _, path in FRONTEND_CALL_RE.findall(source):
        calls.append((method.upper(), normalize_path(path)))
    return calls


def extract_backend_route_methods(source: str) -> list[tuple[str, str]]:
    routes: list[tuple[str, str]] = []
    for route_call in iter_route_calls(source):
        path_match = re.search(r'\.route\(\s*"([^"]+)"\s*,', route_call, re.DOTALL)
        if not path_match:
            continue
        path = path_match.group(1)
        methods = METHOD_RE.findall(route_call)
        for method in methods:
            routes.append((method.upper(), normalize_path(path)))
    return routes


def iter_route_calls(source: str) -> Iterable[str]:
    cursor = 0
    while True:
        start = source.find(".route(", cursor)
        if start == -1:
            return
        depth = 0
        index = start
        while index < len(source):
            char = source[index]
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    yield source[start : index + 1]
                    cursor = index + 1
                    break
            index += 1
        else:
            return


def join_route_prefix(prefix: str, path: str) -> str:
    normalized_prefix = normalize_path(prefix)
    normalized_path = normalize_path(path)
    if normalized_prefix == "/":
        return normalized_path
    return normalize_path(f"{normalized_prefix}/{normalized_path.lstrip('/')}")


def route_matches(frontend_path: str, backend_path: str) -> bool:
    frontend_segments = normalize_path(frontend_path).strip("/").split("/")
    backend_segments = normalize_path(backend_path).strip("/").split("/")
    if frontend_segments == [""] and backend_segments == [""]:
        return True
    if len(frontend_segments) != len(backend_segments):
        return False
    for frontend_segment, backend_segment in zip(frontend_segments, backend_segments):
        if frontend_segment == ":param" or frontend_segment.startswith(":") or backend_segment.startswith(":"):
            continue
        if frontend_segment != backend_segment:
            return False
    return True


def iter_frontend_endpoints(frontend_root: Path) -> Iterable[Endpoint]:
    for path in sorted(frontend_root.glob("src/services/*.ts")):
        if path.name == "api.ts":
            continue
        calls = extract_frontend_calls(path.read_text())
        for method, route in calls:
            yield Endpoint(method, route, str(path.relative_to(frontend_root.parent)))


def iter_backend_endpoints(repo_root: Path) -> Iterable[Endpoint]:
    api_root = repo_root / "api" / "src"
    main_rs = (api_root / "main.rs").read_text()

    for route_call in iter_route_calls(main_rs):
        path_match = re.search(r'\.route\(\s*"([^"]+)"\s*,', route_call, re.DOTALL)
        if not path_match:
            continue
        path = path_match.group(1)
        methods = METHOD_RE.findall(route_call)
        for method in methods:
            yield Endpoint(method.upper(), normalize_path(path), "api/src/main.rs")

    for prefix, module_name in NEST_RE.findall(main_rs):
        module_files = [
            api_root / module_name / "mod.rs",
            api_root / module_name / "routes.rs",
        ]
        for module_file in module_files:
            if not module_file.exists():
                continue
            for method, route in extract_backend_route_methods(module_file.read_text()):
                yield Endpoint(method, join_route_prefix(prefix, route), str(module_file.relative_to(repo_root)))


def find_static_mismatches(repo_root: Path) -> list[str]:
    backend_endpoints = list(iter_backend_endpoints(repo_root))
    mismatches: list[str] = []
    for frontend_endpoint in iter_frontend_endpoints(repo_root / "frontend"):
        if any(
            frontend_endpoint.method == backend_endpoint.method
            and route_matches(frontend_endpoint.path, backend_endpoint.path)
            for backend_endpoint in backend_endpoints
        ):
            continue
        mismatches.append(
            f"{frontend_endpoint.method} {frontend_endpoint.path} missing backend match ({frontend_endpoint.source})"
        )
    return mismatches


def http_json(
    method: str,
    url: str,
    *,
    payload: dict | None = None,
    token: str | None = None,
) -> tuple[int, object]:
    body = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib_request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib_request.urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return response.status, parse_response_body(raw)
    except urllib_error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        payload = parse_response_body(raw)
        return exc.code, payload


def parse_response_body(raw: str) -> object:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def check_runtime(api_base_url: str, username: str, password: str) -> list[str]:
    failures: list[str] = []

    status, _ = http_json("GET", urllib_parse.urljoin(api_base_url, "/health"))
    if status != 200:
        failures.append(f"GET /health returned {status}")
        return failures

    status, auth_payload = http_json(
        "POST",
        urllib_parse.urljoin(api_base_url, "/auth/login"),
        payload={"username": username, "password": password},
    )
    if status != 200 or not isinstance(auth_payload, dict) or "token" not in auth_payload:
        failures.append(f"POST /auth/login returned {status} or missing token")
        return failures

    token = str(auth_payload["token"])
    runtime_checks: list[tuple[str, str, callable]] = [
        ("GET", "/users/me", lambda payload: isinstance(payload, dict) and bool(payload.get("id"))),
        ("GET", "/problems?page=1&limit=1", lambda payload: isinstance(payload, dict) and isinstance(payload.get("problems"), list)),
        ("GET", "/classes?page=1&limit=1", lambda payload: isinstance(payload, dict) and isinstance(payload.get("classes"), list)),
        ("GET", "/blog?page=1&limit=1", lambda payload: isinstance(payload, dict) and isinstance(payload.get("articles"), list)),
        ("GET", "/messages/conversations", lambda payload: isinstance(payload, list)),
        ("GET", "/admin/plagiarism/reports?page=1&limit=1", lambda payload: isinstance(payload, dict)),
    ]

    for method, route, validator in runtime_checks:
        status, payload = http_json(method, urllib_parse.urljoin(api_base_url, route), token=token)
        if status != 200:
            failures.append(f"{method} {route} returned {status}")
            continue
        if not validator(payload):
            failures.append(f"{method} {route} returned unexpected payload shape")

    status, classes_payload = http_json("GET", urllib_parse.urljoin(api_base_url, "/classes?page=1&limit=1"), token=token)
    if status == 200 and isinstance(classes_payload, dict):
        classes = classes_payload.get("classes") or []
        if classes:
            class_id = classes[0].get("id")
            nested_checks: list[tuple[str, str, callable]] = [
                ("GET", f"/classes/{class_id}/stats", lambda payload: isinstance(payload, dict) and "total_students" in payload),
                ("GET", f"/classes/{class_id}/students", lambda payload: isinstance(payload, list)),
                ("GET", f"/classes/{class_id}/assignments", lambda payload: isinstance(payload, list)),
            ]
            for method, route, validator in nested_checks:
                status, payload = http_json(method, urllib_parse.urljoin(api_base_url, route), token=token)
                if status != 200:
                    failures.append(f"{method} {route} returned {status}")
                    continue
                if not validator(payload):
                    failures.append(f"{method} {route} returned unexpected payload shape")

    return failures


def run_psql(database_url: str, sql: str) -> str:
    command = ["psql", database_url, "-At", "-F", "|", "-c", sql]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "psql command failed")
    return result.stdout


def check_database(database_url: str) -> list[str]:
    required_columns = {
        "users": {"id", "email", "password_hash", "username"},
        "problems": {"id", "title", "difficulty", "created_at"},
        "classes": {"id", "teacher_id", "code", "semester"},
        "class_enrollments": {"class_id", "student_id", "status"},
        "assignments": {"id", "class_id", "problem_id", "deadline", "points"},
        "articles": {"id", "title", "content", "author_id"},
        "direct_messages": {"id", "conversation_id", "sender_id", "content"},
        "plagiarism_scan_reports": {"id", "status", "overall_risk"},
    }

    sql = """
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users','problems','classes','class_enrollments','assignments','articles','direct_messages','plagiarism_scan_reports')
    ORDER BY table_name, column_name
    """

    rows = run_psql(database_url, sql)
    seen: dict[str, set[str]] = {}
    for line in rows.splitlines():
        table_name, column_name = line.split("|", 1)
        seen.setdefault(table_name, set()).add(column_name)

    failures: list[str] = []
    for table_name, columns in required_columns.items():
        existing = seen.get(table_name, set())
        missing = sorted(columns - existing)
        if missing:
            failures.append(f"table {table_name} missing columns: {', '.join(missing)}")
    return failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check frontend/backend/database alignment.")
    parser.add_argument("--repo-root", default=".", help="Repository root path")
    parser.add_argument("--api-base-url", default="http://localhost:3000", help="Base URL for API checks")
    parser.add_argument("--username", default=os.getenv("OJ_ALIGNMENT_USER", "1001"), help="Login username for runtime checks")
    parser.add_argument("--password", default=os.getenv("OJ_ALIGNMENT_PASSWORD", "admin123"), help="Login password for runtime checks")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL") or f"postgresql://{getpass.getuser()}@localhost:5432/online_judge",
        help="PostgreSQL connection string for schema checks",
    )
    return parser.parse_args()


def print_section(title: str, failures: list[str]) -> None:
    if failures:
        print(f"[FAIL] {title}")
        for failure in failures:
            print(f"  - {failure}")
    else:
        print(f"[OK] {title}")


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()

    static_failures = find_static_mismatches(repo_root)
    runtime_failures = check_runtime(args.api_base_url, args.username, args.password)
    db_failures = check_database(args.database_url)

    print_section("Static endpoint alignment", static_failures)
    print_section("Runtime API alignment", runtime_failures)
    print_section("Database schema alignment", db_failures)

    all_failures = static_failures + runtime_failures + db_failures
    return 1 if all_failures else 0


if __name__ == "__main__":
    sys.exit(main())
