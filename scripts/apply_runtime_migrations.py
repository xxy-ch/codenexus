#!/usr/bin/env python3
"""Apply supplemental migrations that are not discoverable by sqlx migrate."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def find_supplemental_migrations(migrations_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in migrations_dir.glob("*.sql")
        if not path.name.split("_", 1)[0].isdigit()
    )


def apply_migrations(database_url: str, migrations: list[Path]) -> int:
    for migration in migrations:
        result = subprocess.run(
            ["psql", database_url, "-f", str(migration)],
            check=False,
        )
        if result.returncode != 0:
            return result.returncode
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply supplemental runtime migrations.")
    parser.add_argument("--database-url", required=True, help="PostgreSQL connection string")
    parser.add_argument(
        "--migrations-dir",
        default=str(Path(__file__).resolve().parents[1] / "api" / "migrations"),
        help="Directory containing migration SQL files",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    migrations = find_supplemental_migrations(Path(args.migrations_dir))
    return apply_migrations(args.database_url, migrations)


if __name__ == "__main__":
    sys.exit(main())
