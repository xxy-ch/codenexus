use anyhow::Result;

/// A single user row for CSV export.
#[derive(Debug, Clone)]
pub struct UserExportRow {
    pub username: String,
    pub role: String,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub display_name: Option<String>,
    pub email: Option<String>,
}

/// Build a CSV file from user export rows.
///
/// Output format:
/// ```text
/// username,role,campus_id,grade_id,display_name,email
/// alice,student,1,2,Alice Smith,alice@example.com
/// ```
pub fn build_user_csv(users: &[UserExportRow]) -> Result<Vec<u8>> {
    let mut wtr = csv::WriterBuilder::new()
        .has_headers(true)
        .from_writer(Vec::<u8>::new());

    // Write header explicitly to ensure it's always present
    wtr.write_record(&["username", "role", "campus_id", "grade_id", "display_name", "email"])?;

    for user in users {
        wtr.write_record(&[
            user.username.as_str(),
            user.role.as_str(),
            user.campus_id
                .map(|id| id.to_string())
                .as_deref()
                .unwrap_or(""),
            user.grade_id
                .map(|id| id.to_string())
                .as_deref()
                .unwrap_or(""),
            user.display_name.as_deref().unwrap_or(""),
            user.email.as_deref().unwrap_or(""),
        ])?;
    }

    wtr.flush()?;
    let bytes = wtr.into_inner()?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ImportItemStatus;
    use crate::user_import::{parse_user_csv, RolePolicy};
    use std::collections::HashSet;

    #[test]
    fn build_user_csv_produces_correct_header() {
        let users = vec![UserExportRow {
            username: "alice".to_string(),
            role: "student".to_string(),
            campus_id: Some(1),
            grade_id: Some(2),
            display_name: Some("Alice Smith".to_string()),
            email: Some("alice@example.com".to_string()),
        }];

        let csv_bytes = build_user_csv(&users).unwrap();
        let csv_str = String::from_utf8(csv_bytes).unwrap();

        let lines: Vec<&str> = csv_str.lines().collect();
        assert!(lines[0].starts_with("username"));
        assert!(lines[0].contains("role"));
        assert!(lines[0].contains("campus_id"));
        assert!(lines[0].contains("grade_id"));
        assert!(lines[0].contains("display_name"));
        assert!(lines[0].contains("email"));
    }

    #[test]
    fn build_user_csv_produces_correct_rows() {
        let users = vec![
            UserExportRow {
                username: "alice".to_string(),
                role: "student".to_string(),
                campus_id: Some(1),
                grade_id: Some(2),
                display_name: Some("Alice Smith".to_string()),
                email: Some("alice@example.com".to_string()),
            },
            UserExportRow {
                username: "bob".to_string(),
                role: "teacher".to_string(),
                campus_id: None,
                grade_id: None,
                display_name: None,
                email: None,
            },
        ];

        let csv_bytes = build_user_csv(&users).unwrap();
        let csv_str = String::from_utf8(csv_bytes).unwrap();

        let lines: Vec<&str> = csv_str.lines().collect();
        assert_eq!(lines.len(), 3); // header + 2 data rows
        assert!(lines[1].contains("alice"));
        assert!(lines[1].contains("student"));
        assert!(lines[2].contains("bob"));
        assert!(lines[2].contains("teacher"));
    }

    #[test]
    fn round_trip_export_then_import() {
        let users = vec![
            UserExportRow {
                username: "alice".to_string(),
                role: "student".to_string(),
                campus_id: Some(1),
                grade_id: Some(2),
                display_name: Some("Alice Smith".to_string()),
                email: Some("alice@example.com".to_string()),
            },
            UserExportRow {
                username: "bob".to_string(),
                role: "teacher".to_string(),
                campus_id: Some(2),
                grade_id: None,
                display_name: Some("Bob Jones".to_string()),
                email: None,
            },
        ];

        let csv_bytes = build_user_csv(&users).unwrap();

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].username, "alice");
        assert_eq!(rows[0].role, "student");
        assert_eq!(rows[0].campus_id, 1);
        assert_eq!(rows[0].display_name, "Alice Smith");
        assert_eq!(rows[0].email, Some("alice@example.com".to_string()));
        assert_eq!(rows[0].status, ImportItemStatus::Valid);

        assert_eq!(rows[1].username, "bob");
        assert_eq!(rows[1].role, "teacher");
        assert_eq!(rows[1].campus_id, 2);
        assert_eq!(rows[1].display_name, "Bob Jones");
        assert_eq!(rows[1].email, None);
        assert_eq!(rows[1].status, ImportItemStatus::Valid);
    }

    #[test]
    fn build_user_csv_handles_empty_list() {
        let csv_bytes = build_user_csv(&[]).unwrap();
        let csv_str = String::from_utf8(csv_bytes).unwrap();
        // Empty user list still produces header row
        assert!(csv_str.contains("username"));
        assert!(csv_str.contains("role"));
    }
}
