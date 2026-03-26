import unittest

from scripts.check_alignment import (
    extract_backend_route_methods,
    extract_frontend_calls,
    join_route_prefix,
    normalize_path,
    parse_response_body,
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


if __name__ == "__main__":
    unittest.main()
