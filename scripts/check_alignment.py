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
BOOTSTRAP_INSERT_RE = re.compile(
    r"INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*VALUES",
    re.DOTALL | re.IGNORECASE,
)
CREATE_TABLE_BLOCK_RE = re.compile(
    r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+{table}\s*\((.*?)\);",
    re.DOTALL | re.IGNORECASE,
)

REQUIRED_COLUMNS: dict[str, set[str]] = {
    "users": {
        "id",
        "user_code",
        "username",
        "email",
        "password_hash",
        "display_name",
        "organization_id",
        "campus_id",
        "status",
        "created_at",
        "updated_at",
    },
    "user_roles": {"id", "user_id", "organization_id", "campus_id", "role", "created_at"},
    "user_competitive_stats": {"user_id", "ac_count", "contest_rating", "updated_at"},
    "judge_language_settings": {"id", "c_enabled", "cpp_enabled", "updated_at"},
    "organizations": {"id", "name", "slug"},
    "campuses": {"id", "organization_id", "name", "slug"},
    "problems": {
        "id",
        "organization_id",
        "campus_id",
        "author_id",
        "title",
        "description",
        "difficulty",
        "visibility",
        "time_limit_ms",
        "memory_limit_kb",
        "tags",
        "source_url",
        "author_note",
        "created_at",
        "updated_at",
    },
    "test_cases": {"id", "problem_id", "input", "output", "is_secret", "points", "order_index", "created_at"},
    "test_case_results": {
        "id",
        "submission_id",
        "test_case_id",
        "verdict",
        "time_ms",
        "memory_kb",
        "created_at",
    },
    "assignments": {"id", "class_id", "problem_id", "deadline", "points", "published_at", "created_at", "updated_at"},
    "classes": {"id", "organization_id", "campus_id", "name", "teacher_id", "semester", "code", "created_at", "updated_at"},
    "class_enrollments": {"id", "class_id", "student_id", "status", "enrolled_at"},
    "contests": {
        "id",
        "organization_id",
        "campus_id",
        "name",
        "description",
        "rules",
        "start_time",
        "end_time",
        "freeze_minutes",
        "created_at",
        "updated_at",
    },
    "contest_problems": {"id", "contest_id", "problem_id", "points", "order_index", "created_at"},
    "contest_participants": {"id", "contest_id", "user_id", "registered_at"},
    "contest_submissions": {"id", "contest_id", "submission_id", "penalty_time", "created_at"},
    "submissions": {
        "id",
        "organization_id",
        "user_id",
        "problem_id",
        "language",
        "code",
        "status",
        "verdict",
        "score",
        "result_error",
        "status_details",
        "is_hidden",
        "time_ms",
        "memory_kb",
        "created_at",
        "updated_at",
    },
    "discussions": {
        "id",
        "title",
        "content",
        "author_id",
        "problem_id",
        "contest_id",
        "tags",
        "is_pinned",
        "is_solved",
        "is_locked",
        "view_count",
        "reply_count",
        "like_count",
        "created_at",
        "updated_at",
    },
    "discussion_replies": {
        "id",
        "discussion_id",
        "parent_id",
        "content",
        "author_id",
        "like_count",
        "created_at",
        "updated_at",
    },
    "articles": {
        "id",
        "title",
        "slug",
        "content",
        "summary",
        "cover_image",
        "author_id",
        "tags",
        "category",
        "is_published",
        "is_featured",
        "view_count",
        "like_count",
        "comment_count",
        "published_at",
        "created_at",
        "updated_at",
    },
    "article_comments": {"id", "article_id", "parent_id", "content", "author_id", "created_at", "updated_at"},
    "likes": {"id", "user_id", "target_type", "target_id", "created_at"},
    "direct_conversations": {"id", "user1_id", "user2_id", "created_at", "updated_at"},
    "direct_messages": {"id", "conversation_id", "sender_id", "content", "read_at", "created_at"},
    "notifications": {
        "id",
        "user_id",
        "type",
        "title",
        "content",
        "link",
        "is_read",
        "created_at",
        "actor_id",
        "discussion_id",
        "article_id",
        "comment_id",
        "metadata",
    },
    "notification_settings": {
        "user_id",
        "email_notifications",
        "reply_notifications",
        "comment_notifications",
        "like_notifications",
        "mention_notifications",
        "system_notifications",
        "digest_mode",
        "updated_at",
    },
    "plagiarism_reports": {
        "id",
        "submission1_id",
        "submission2_id",
        "similarity_score",
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    },
    "plagiarism_scan_configs": {
        "id",
        "enabled",
        "language",
        "threshold",
        "min_token_length",
        "window_size",
        "ignore_comments",
        "ignore_whitespace",
        "max_reports_per_run",
        "created_at",
        "updated_at",
    },
    "plagiarism_scan_reports": {
        "id",
        "contest_id",
        "assignment_id",
        "status",
        "overall_risk",
        "total_submissions",
        "suspicious_pairs",
        "created_at",
        "finished_at",
    },
    "plagiarism_scan_pairs": {
        "id",
        "report_id",
        "left_submission_id",
        "right_submission_id",
        "left_user",
        "right_user",
        "similarity",
        "matched_lines",
    },
}


@dataclass(frozen=True)
class Endpoint:
    method: str
    path: str
    source: str


@dataclass(frozen=True)
class BootstrapInsert:
    table: str
    columns: tuple[str, ...]


@dataclass(frozen=True)
class TableExpectation:
    required_patterns: tuple[str, ...]
    forbidden_patterns: tuple[str, ...] = ()


@dataclass(frozen=True)
class FileExpectation:
    required_patterns: tuple[str, ...] = ()
    forbidden_patterns: tuple[str, ...] = ()


COMMUNITY_SCHEMA_FILES: dict[str, dict[str, TableExpectation]] = {
    "api/migrations/2026-02-21-001-discussions.sql": {
        "discussions": TableExpectation(
            required_patterns=(
                r"\bauthor_id\s+UUID\b",
                r"\bview_count\s+BIGINT\b",
                r"\breply_count\s+BIGINT\b",
                r"\blike_count\s+BIGINT\b",
            ),
            forbidden_patterns=(
                r"\buser_id\s+UUID\b",
                r"\bvotes_count\b",
                r"\bviews_count\b",
                r"\blikes_count\b",
                r"\bcomments_count\b",
            ),
        ),
        "discussion_replies": TableExpectation(
            required_patterns=(
                r"\bdiscussion_id\s+BIGINT\b",
                r"\bauthor_id\s+UUID\b",
                r"\blike_count\s+BIGINT\b",
            ),
            forbidden_patterns=(
                r"\buser_id\s+UUID\b",
                r"\bvotes_count\b",
            ),
        ),
        "articles": TableExpectation(
            required_patterns=(
                r"\bauthor_id\s+UUID\b",
                r"\bview_count\s+BIGINT\b",
                r"\blike_count\s+BIGINT\b",
                r"\bcomment_count\s+BIGINT\b",
            ),
            forbidden_patterns=(
                r"\buser_id\s+UUID\b",
                r"\bviews_count\b",
                r"\blikes_count\b",
                r"\bcomments_count\b",
            ),
        ),
        "article_comments": TableExpectation(
            required_patterns=(
                r"\barticle_id\s+BIGINT\b",
                r"\bauthor_id\s+UUID\b",
            ),
            forbidden_patterns=(
                r"\buser_id\s+UUID\b",
                r"\bvotes_count\b",
            ),
        ),
    },
    "api/migrations/022_create_blog_tables.sql": {
        "articles": TableExpectation(
            required_patterns=(
                r"\bauthor_id\s+UUID\b",
                r"\bview_count\s+BIGINT\b",
                r"\blike_count\s+BIGINT\b",
                r"\bcomment_count\s+BIGINT\b",
            ),
            forbidden_patterns=(
                r"\buser_id\s+UUID\b",
                r"\bviews_count\b",
                r"\blikes_count\b",
                r"\bcomments_count\b",
            ),
        ),
        "article_comments": TableExpectation(
            required_patterns=(
                r"\barticle_id\s+BIGINT\b",
                r"\bauthor_id\s+UUID\b",
            ),
            forbidden_patterns=(
                r"\buser_id\s+UUID\b",
                r"\bvotes_count\b",
            ),
        ),
        "likes": TableExpectation(
            required_patterns=(
                r"\buser_id\s+UUID\b",
                r"\btarget_type\s+VARCHAR\(50\)",
                r"\btarget_id\s+BIGINT\b",
            ),
        ),
    },
    "api/migrations/2026-02-22-003-notifications.sql": {
        "notifications": TableExpectation(
            required_patterns=(
                r"\buser_id\s+UUID\b",
                r"\btype\s+VARCHAR\(50\)",
                r"\bactor_id\s+UUID\b",
                r"\bdiscussion_id\s+BIGINT\b",
                r"\barticle_id\s+BIGINT\b",
                r"\bcomment_id\s+BIGINT\b",
            ),
        ),
        "notification_settings": TableExpectation(
            required_patterns=(
                r"\bdigest_mode\s+VARCHAR\(20\)",
            ),
        ),
    },
}


FILE_REQUIREMENTS: dict[str, FileExpectation] = {
    "api/migrations/2026-02-22-003-notifications.sql": FileExpectation(
        required_patterns=(
            r"DROP\s+TRIGGER\s+IF\s+EXISTS\s+notification_settings_updated_at\s+ON\s+notification_settings",
        ),
    ),
}


NOTIFICATION_SERVICE_REQUIREMENTS = FileExpectation(
    required_patterns=(
        r"type\s+AS\s+notification_type",
        r"SELECT\s+user_id\s*,\s*email_notifications\s*,\s*reply_notifications\s*,\s*comment_notifications\s*,\s*like_notifications\s*,\s*mention_notifications\s*,\s*system_notifications\s*,\s*digest_mode\s+FROM\s+notification_settings",
        r"RETURNING\s+user_id\s*,\s*email_notifications\s*,\s*reply_notifications\s*,\s*comment_notifications\s*,\s*like_notifications\s*,\s*mention_notifications\s*,\s*system_notifications\s*,\s*digest_mode",
    ),
    forbidden_patterns=(
        r"SELECT\s+\*\s+FROM\s+notifications",
        r"SELECT\s+\*\s+FROM\s+notification_settings",
        r"RETURNING\s+\*",
    ),
)


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


def extract_bootstrap_inserts(source: str) -> list[BootstrapInsert]:
    inserts: list[BootstrapInsert] = []
    for table, raw_columns in BOOTSTRAP_INSERT_RE.findall(source):
        columns = tuple(column.strip().strip('"') for column in raw_columns.split(",") if column.strip())
        inserts.append(BootstrapInsert(table=table, columns=columns))
    return inserts


def extract_create_table_block(source: str, table: str) -> str | None:
    pattern = re.compile(
        CREATE_TABLE_BLOCK_RE.pattern.format(table=re.escape(table)),
        CREATE_TABLE_BLOCK_RE.flags,
    )
    match = pattern.search(source)
    if not match:
        return None
    return match.group(1)


def check_source_patterns(
    source: str,
    context: str,
    *,
    required_patterns: tuple[str, ...] = (),
    forbidden_patterns: tuple[str, ...] = (),
) -> list[str]:
    failures: list[str] = []
    for pattern in required_patterns:
        if not re.search(pattern, source, flags=re.IGNORECASE | re.DOTALL):
            failures.append(f"{context} is missing required pattern: {pattern}")
    for pattern in forbidden_patterns:
        if re.search(pattern, source, flags=re.IGNORECASE | re.DOTALL):
            failures.append(f"{context} contains forbidden pattern: {pattern}")
    return failures


def check_table_expectations(source: str, table: str, expectation: TableExpectation) -> list[str]:
    block = extract_create_table_block(source, table)
    if block is None:
        return [f"table {table} is missing from migration source"]
    return check_source_patterns(
        block,
        f"table {table}",
        required_patterns=expectation.required_patterns,
        forbidden_patterns=expectation.forbidden_patterns,
    )


def check_file_expectations(source: str, file_label: str, expectation: FileExpectation) -> list[str]:
    return check_source_patterns(
        source,
        file_label,
        required_patterns=expectation.required_patterns,
        forbidden_patterns=expectation.forbidden_patterns,
    )


def check_community_schema_alignment(repo_root: Path) -> list[str]:
    failures: list[str] = []
    for relative_path, tables in COMMUNITY_SCHEMA_FILES.items():
        path = repo_root / relative_path
        if not path.exists():
            failures.append(f"missing community schema file: {relative_path}")
            continue

        source = path.read_text()
        file_expectation = FILE_REQUIREMENTS.get(relative_path)
        if file_expectation is not None:
            failures.extend(check_file_expectations(source, relative_path, file_expectation))
        for table, expectation in tables.items():
            failures.extend(check_table_expectations(source, table, expectation))
    return failures


def check_notification_service_alignment(repo_root: Path) -> list[str]:
    service_path = repo_root / "api" / "src" / "notifications" / "service.rs"
    if not service_path.exists():
        return ["missing notification service file: api/src/notifications/service.rs"]

    return check_file_expectations(
        service_path.read_text(),
        "api/src/notifications/service.rs",
        NOTIFICATION_SERVICE_REQUIREMENTS,
    )


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


def fetch_table_columns(database_url: str, table_names: Iterable[str]) -> dict[str, set[str]]:
    names = sorted(set(table_names))
    if not names:
        return {}

    table_list = ", ".join(f"'{name}'" for name in names)
    sql = f"""
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ({table_list})
    ORDER BY table_name, column_name
    """

    rows = run_psql(database_url, sql)
    seen: dict[str, set[str]] = {}
    for line in rows.splitlines():
        if not line:
            continue
        table_name, column_name = line.split("|", 1)
        seen.setdefault(table_name, set()).add(column_name)
    return seen


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
    seen = fetch_table_columns(database_url, REQUIRED_COLUMNS.keys())
    failures: list[str] = []
    for table_name, columns in REQUIRED_COLUMNS.items():
        existing = seen.get(table_name, set())
        missing = sorted(columns - existing)
        if missing:
            failures.append(f"table {table_name} missing columns: {', '.join(missing)}")
    return failures


def check_bootstrap_alignment(repo_root: Path, database_url: str) -> list[str]:
    bootstrap_path = repo_root / "scripts" / "bootstrap_demo.sql"
    inserts = extract_bootstrap_inserts(bootstrap_path.read_text())
    seen = fetch_table_columns(database_url, (insert.table for insert in inserts))

    failures: list[str] = []
    for insert in inserts:
        existing = seen.get(insert.table)
        if existing is None:
            failures.append(f"bootstrap inserts into missing table {insert.table}")
            continue
        missing = sorted(set(insert.columns) - existing)
        if missing:
            failures.append(
                f"bootstrap insert for table {insert.table} references missing columns: {', '.join(missing)}"
            )
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
    migration_failures = check_community_schema_alignment(repo_root)
    notification_service_failures = check_notification_service_alignment(repo_root)
    bootstrap_failures = check_bootstrap_alignment(repo_root, args.database_url)
    runtime_failures = check_runtime(args.api_base_url, args.username, args.password)
    db_failures = check_database(args.database_url)

    print_section("Static endpoint alignment", static_failures)
    print_section("Community migration alignment", migration_failures)
    print_section("Notification service SQLx alignment", notification_service_failures)
    print_section("Bootstrap demo alignment", bootstrap_failures)
    print_section("Runtime API alignment", runtime_failures)
    print_section("Database schema alignment", db_failures)

    all_failures = (
        static_failures
        + migration_failures
        + notification_service_failures
        + bootstrap_failures
        + runtime_failures
        + db_failures
    )
    return 1 if all_failures else 0


if __name__ == "__main__":
    sys.exit(main())
