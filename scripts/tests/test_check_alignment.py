import tempfile
import unittest
from pathlib import Path

from scripts.check_alignment import (
    BootstrapInsert,
    extract_bootstrap_inserts,
    extract_backend_route_methods,
    extract_frontend_calls,
    check_community_schema_alignment,
    check_notification_service_alignment,
    check_source_patterns,
    check_table_expectations,
    join_route_prefix,
    normalize_path,
    parse_response_body,
    TableExpectation,
    route_matches,
)


class CheckAlignmentHelpersTest(unittest.TestCase):
    def test_normalize_path_strips_query_and_template_variables(self) -> None:
        self.assertEqual(
            normalize_path("/classes/${classId}/students?page=1&limit=20"),
            "/classes/:param/students",
        )

    def test_extract_frontend_calls_reads_multiple_http_methods(self) -> None:
        source = """
        await api.get(`/classes/${classId}/students`)
        await api.post('/auth/login', credentials)
        await api.patch(`/users/admin/${userId}/role`, { role })
        """

        self.assertEqual(
            extract_frontend_calls(source),
            [
                ("GET", "/classes/:param/students"),
                ("POST", "/auth/login"),
                ("PATCH", "/users/admin/:param/role"),
            ],
        )

    def test_extract_backend_route_methods_reads_multi_method_routes(self) -> None:
        source = """
        Router::new()
            .route("/:class_id/students", get(get_class_students))
            .route("/:class_id/students", post(add_student))
            .route("/:assignment_id", patch(update_assignment).delete(delete_assignment))
        """

        self.assertEqual(
            extract_backend_route_methods(source),
            [
                ("GET", "/:class_id/students"),
                ("POST", "/:class_id/students"),
                ("PATCH", "/:assignment_id"),
                ("DELETE", "/:assignment_id"),
            ],
        )

    def test_join_route_prefix_handles_root_and_nested_segments(self) -> None:
        self.assertEqual(join_route_prefix("/classes", "/:class_id/students"), "/classes/:class_id/students")
        self.assertEqual(join_route_prefix("", "/auth/login"), "/auth/login")

    def test_route_matches_treats_path_params_as_compatible(self) -> None:
        self.assertTrue(route_matches("/classes/:param/students", "/classes/:class_id/students"))
        self.assertTrue(route_matches("/users/admin/:param/role", "/users/admin/:user_id/role"))
        self.assertFalse(route_matches("/users/admin/:param/role", "/users/admin/:user_id/status"))

    def test_parse_response_body_falls_back_to_text_for_non_json(self) -> None:
        self.assertEqual(parse_response_body("OK"), "OK")
        self.assertEqual(parse_response_body('{"status":"healthy"}'), {"status": "healthy"})

    def test_extract_bootstrap_inserts_reads_multiline_column_lists(self) -> None:
        source = """
        INSERT INTO users (
            id,
            username,
            email,
            password_hash
        )
        VALUES
            (1, '1001', 'admin@example.com', 'hash');

        INSERT INTO discussions (id, title, content, author_id)
        VALUES (1, 'Two Sum', 'content', '11111111-1111-1111-1111-111111111111');
        """

        self.assertEqual(
            extract_bootstrap_inserts(source),
            [
                BootstrapInsert(
                    table="users",
                    columns=("id", "username", "email", "password_hash"),
                ),
                BootstrapInsert(
                    table="discussions",
                    columns=("id", "title", "content", "author_id"),
                ),
            ],
        )

    def test_community_schema_alignment_matches_runtime_sources(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]

        self.assertEqual(check_community_schema_alignment(repo_root), [])

    def test_community_schema_alignment_fails_when_expected_files_are_missing(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            (temp_root / "api/migrations").mkdir(parents=True)
            source = (repo_root / "api/migrations/2026-02-22-003-notifications.sql").read_text()
            (temp_root / "api/migrations/2026-02-22-003-notifications.sql").write_text(source)

            failures = check_community_schema_alignment(temp_root)

        self.assertTrue(
            any("missing community schema file: api/migrations/2026-02-21-001-discussions.sql" in failure for failure in failures)
        )
        self.assertTrue(
            any("missing community schema file: api/migrations/022_create_blog_tables.sql" in failure for failure in failures)
        )

    def test_notifications_service_alignment_matches_explicit_column_mapping(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]

        self.assertEqual(check_notification_service_alignment(repo_root), [])

    def test_notifications_migration_requires_idempotent_trigger_drop(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        source = (repo_root / "api/migrations/2026-02-22-003-notifications.sql").read_text()
        bad_source = source.replace(
            "DROP TRIGGER IF EXISTS notification_settings_updated_at ON notification_settings;\n",
            "",
        )

        failures = check_source_patterns(
            bad_source,
            "api/migrations/2026-02-22-003-notifications.sql",
            required_patterns=(
                r"DROP\s+TRIGGER\s+IF\s+EXISTS\s+notification_settings_updated_at\s+ON\s+notification_settings",
            ),
        )

        self.assertTrue(
            any("DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+notification_settings_updated_at" in failure for failure in failures)
        )

    def test_notifications_service_checker_flags_select_star_and_returning_star(self) -> None:
        bad_source = """
        let mut base_query = "SELECT * FROM notifications WHERE user_id = $1".to_string();
        let settings = sqlx::query_as::<_, NotificationSettings>(
            "SELECT * FROM notification_settings WHERE user_id = $1"
        );
        let result = sqlx::query_as::<_, NotificationSettings>("RETURNING *");
        """

        failures = check_source_patterns(
            bad_source,
            "api/src/notifications/service.rs",
            required_patterns=(
                r"type\s+AS\s+notification_type",
            ),
            forbidden_patterns=(
                r"SELECT\s+\*\s+FROM\s+notifications",
                r"SELECT\s+\*\s+FROM\s+notification_settings",
                r"RETURNING\s+\*",
            ),
        )

        self.assertTrue(any("notification_type" in failure for failure in failures))
        self.assertTrue(any("SELECT\\s+\\*\\s+FROM\\s+notifications" in failure for failure in failures))
        self.assertTrue(any("SELECT\\s+\\*\\s+FROM\\s+notification_settings" in failure for failure in failures))
        self.assertTrue(any("RETURNING\\s+\\*" in failure for failure in failures))

    def test_notifications_schema_checker_flags_runtime_field_mismatches(self) -> None:
        bad_schema = """
        CREATE TABLE IF NOT EXISTS discussion_replies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            parent_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
            votes_count INT DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS articles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            views_count INT DEFAULT 0,
            likes_count INT DEFAULT 0,
            comments_count INT DEFAULT 0
        );
        """

        failures = check_table_expectations(
            bad_schema,
            "discussion_replies",
            TableExpectation(
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
        )
        failures.extend(
            check_table_expectations(
                bad_schema,
                "articles",
                TableExpectation(
                    required_patterns=(
                        r"\bauthor_id\s+UUID\b",
                        r"\bview_count\s+BIGINT\b",
                        r"\blike_count\s+BIGINT\b",
                        r"\bcomment_count\s+BIGINT\b",
                    ),
                    forbidden_patterns=(
                        r"\bviews_count\b",
                        r"\blikes_count\b",
                        r"\bcomments_count\b",
                    ),
                ),
            )
        )

        self.assertTrue(any("discussion_replies" in failure and "user_id" in failure for failure in failures))
        self.assertTrue(any("discussion_replies" in failure and "votes_count" in failure for failure in failures))
        self.assertTrue(any("articles" in failure and "views_count" in failure for failure in failures))
        self.assertTrue(any("articles" in failure and "likes_count" in failure for failure in failures))


if __name__ == "__main__":
    unittest.main()
