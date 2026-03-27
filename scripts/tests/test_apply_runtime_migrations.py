import tempfile
import unittest
from pathlib import Path

from scripts.apply_runtime_migrations import find_supplemental_migrations


class ApplyRuntimeMigrationsTest(unittest.TestCase):
    def test_finds_non_sqlx_named_migrations_in_sorted_order(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            migrations_dir = Path(temp_dir) / "api" / "migrations"
            migrations_dir.mkdir(parents=True)

            (migrations_dir / "028_align_submissions_runtime_legacy_fields.sql").write_text("-- sqlx")
            (migrations_dir / "2026-02-22-003-notifications.sql").write_text("-- supplemental")
            (migrations_dir / "2026-02-21-001-discussions.sql").write_text("-- supplemental")
            (migrations_dir / "2026-03-27-001-update-user-login-backfill.sql").write_text("-- supplemental")

            found = find_supplemental_migrations(migrations_dir)

        self.assertEqual(
            [path.name for path in found],
            [
                "2026-02-21-001-discussions.sql",
                "2026-02-22-003-notifications.sql",
                "2026-03-27-001-update-user-login-backfill.sql",
            ],
        )

    def test_ignores_regular_sqlx_migrations(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            migrations_dir = Path(temp_dir) / "api" / "migrations"
            migrations_dir.mkdir(parents=True)

            (migrations_dir / "001_initial.sql").write_text("-- sqlx")
            (migrations_dir / "019_update_user_login.sql").write_text("-- sqlx")

            found = find_supplemental_migrations(migrations_dir)

        self.assertEqual(found, [])


if __name__ == "__main__":
    unittest.main()
