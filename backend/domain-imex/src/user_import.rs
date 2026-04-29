use std::collections::HashSet;

use crate::models::{ImportItemStatus, UserImportRow};
use crate::security::sanitize_csv_cell;

use anyhow::{anyhow, Result};
use domain_users::models::{BatchCreateUserInput, BatchCreateUsersRequest};
use shared::models::role::Role;
use std::str::FromStr;

/// UTF-8 BOM prefix bytes.
const BOM: &[u8; 3] = b"\xEF\xBB\xBF";

/// Roles that only a root user may assign via CSV import (canonical lowercase).
const ROOT_ONLY_ROLES: &[&str] = &["campusadmin", "gradeadmin"];

/// The `root` role must never be assigned through CSV import.
const FORBIDDEN_ROLE: &str = "root";

/// Required column headers in the CSV file.
const REQUIRED_HEADERS: &[&str] = &["username", "role", "campus_id", "display_name"];

/// Whether the caller is allowed to assign high-privilege roles (campusAdmin, gradeAdmin).
pub struct RolePolicy {
    pub allow_root_roles: bool,
}

impl Default for RolePolicy {
    fn default() -> Self {
        Self {
            allow_root_roles: false,
        }
    }
}

/// Parse a CSV file containing user definitions.
///
/// Expected header: `username,role,campus_id,display_name,email`
///
/// Returns a Vec of UserImportRow. Rows with validation errors get
/// `ImportItemStatus::Error`. Rows whose username matches an entry in
/// `skip_usernames` or appears earlier in the same CSV get `ImportItemStatus::Duplicate`.
pub fn parse_user_csv(
    csv_bytes: &[u8],
    skip_usernames: &HashSet<String>,
    role_policy: &RolePolicy,
) -> Result<Vec<UserImportRow>> {
    // Strip UTF-8 BOM if present
    let data = if csv_bytes.starts_with(BOM) {
        &csv_bytes[BOM.len()..]
    } else {
        csv_bytes
    };

    let mut reader = csv::Reader::from_reader(data);

    // Read and validate headers
    let headers = reader
        .headers()
        .map_err(|e| anyhow!("Failed to read CSV headers: {}", e))?
        .clone();

    let header_set: std::collections::HashSet<&str> = headers.iter().map(|h| h.trim()).collect();

    for required in REQUIRED_HEADERS {
        if !header_set.contains(required) {
            return Err(anyhow!("Missing required column: '{}'", required));
        }
    }

    let mut rows = Vec::new();

    // First pass: parse all rows, collecting username frequencies
    let mut username_counts: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();

    for record_result in reader.records() {
        let record = match record_result {
            Ok(r) => r,
            Err(e) => {
                rows.push(UserImportRow {
                    username: String::new(),
                    role: String::new(),
                    campus_id: 0,
                    grade_id: None,
                    display_name: String::new(),
                    email: None,
                    status: ImportItemStatus::Error,
                    warning: Some(format!("Failed to parse CSV row: {}", e)),
                });
                continue;
            }
        };

        let username_raw = get_column(&record, &headers, "username").unwrap_or_default();
        let role_raw = get_column(&record, &headers, "role").unwrap_or_default();
        let campus_id_raw = get_column(&record, &headers, "campus_id").unwrap_or_default();
        let display_name_raw = get_column(&record, &headers, "display_name").unwrap_or_default();
        let email_raw = get_column(&record, &headers, "email").unwrap_or_default();
        let grade_id_raw = get_column(&record, &headers, "grade_id").unwrap_or_default();

        // Sanitize all cell values
        let username = sanitize_csv_cell(&username_raw);
        let role = sanitize_csv_cell(&role_raw);
        let campus_id_str = sanitize_csv_cell(&campus_id_raw);
        let display_name = sanitize_csv_cell(&display_name_raw);
        let email = sanitize_csv_cell(&email_raw);
        let grade_id_str = sanitize_csv_cell(&grade_id_raw);

        // Validate username
        if username.is_empty() {
            rows.push(UserImportRow {
                username: String::new(),
                role,
                campus_id: 0,
                grade_id: None,
                display_name,
                email: if email.is_empty() { None } else { Some(email) },
                status: ImportItemStatus::Error,
                warning: Some("Username is required".to_string()),
            });
            continue;
        }

        // Validate role using canonical Role enum (case-insensitive parse)
        let role_result = Role::from_str(&role).map(|parsed| {
            let canonical = parsed.as_str().to_string();
            if canonical == FORBIDDEN_ROLE {
                Err(format!(
                    "Role '{}' cannot be assigned via import",
                    canonical
                ))
            } else if ROOT_ONLY_ROLES.contains(&canonical.as_str()) && !role_policy.allow_root_roles
            {
                Err(format!(
                    "Role '{}' requires root privileges to assign",
                    canonical
                ))
            } else {
                Ok(canonical)
            }
        });

        let role_error = match &role_result {
            Ok(Ok(_)) => None,
            Ok(Err(warning)) => Some(warning.clone()),
            Err(_) => Some(format!("Invalid role: '{}'", role)),
        };

        if let Some(warning) = role_error {
            rows.push(UserImportRow {
                username,
                role,
                campus_id: 0,
                grade_id: None,
                display_name,
                email: if email.is_empty() { None } else { Some(email) },
                status: ImportItemStatus::Error,
                warning: Some(warning),
            });
            continue;
        }

        // Normalize role to canonical lowercase
        let role = match &role_result {
            Ok(Ok(canonical)) => canonical.clone(),
            _ => role, // error path, raw value preserved for error display
        };

        // Parse campus_id
        let campus_id: i64 = match campus_id_str.parse() {
            Ok(id) => id,
            Err(_) => {
                rows.push(UserImportRow {
                    username,
                    role,
                    campus_id: 0,
                    grade_id: None,
                    display_name,
                    email: if email.is_empty() { None } else { Some(email) },
                    status: ImportItemStatus::Error,
                    warning: Some(format!("Invalid campus_id: '{}'", campus_id_str)),
                });
                continue;
            }
        };

        let email_opt = if email.is_empty() { None } else { Some(email) };

        // Parse optional grade_id (empty or absent means None)
        let grade_id_opt: Option<i64> = if grade_id_str.is_empty() {
            None
        } else {
            match grade_id_str.parse() {
                Ok(id) => Some(id),
                Err(_) => {
                    rows.push(UserImportRow {
                        username,
                        role,
                        campus_id,
                        grade_id: None,
                        display_name,
                        email: email_opt,
                        status: ImportItemStatus::Error,
                        warning: Some(format!("Invalid grade_id: '{}'", grade_id_str)),
                    });
                    continue;
                }
            }
        };

        // Tentatively mark as Valid; will be updated in second pass for intra-CSV dupes
        let (status, warning) = if skip_usernames.contains(&username) {
            (
                ImportItemStatus::Duplicate,
                Some("Username already exists in database".to_string()),
            )
        } else {
            (ImportItemStatus::Valid, None)
        };

        // Track username frequency for intra-CSV duplicate detection
        *username_counts.entry(username.clone()).or_insert(0) += 1;

        rows.push(UserImportRow {
            username,
            role,
            campus_id,
            grade_id: grade_id_opt,
            display_name,
            email: email_opt,
            status,
            warning,
        });
    }

    // Second pass: mark ALL rows with intra-CSV duplicate usernames
    for row in &mut rows {
        if row.status == ImportItemStatus::Valid
            && username_counts.get(&row.username).copied().unwrap_or(0) > 1
        {
            row.status = ImportItemStatus::Duplicate;
            row.warning = Some("Duplicate username within CSV".to_string());
        }
    }

    Ok(rows)
}

/// Convert validated UserImportRows into a BatchCreateUsersRequest.
pub fn convert_to_batch_request(
    rows: &[UserImportRow],
    default_password: &str,
    organization_id: i64,
) -> BatchCreateUsersRequest {
    let users: Vec<BatchCreateUserInput> = rows
        .iter()
        .filter(|r| r.status == ImportItemStatus::Valid)
        .map(|r| BatchCreateUserInput {
            user_code: r.username.clone(),
            display_name: Some(r.display_name.clone()),
            email: r.email.clone(),
            campus_id: Some(r.campus_id),
            grade_id: r.grade_id,
            password: None,
            role: Some(r.role.clone()),
        })
        .collect();

    BatchCreateUsersRequest {
        users,
        default_password: Some(default_password.to_string()),
        organization_id,
        campus_id: None,
    }
}

/// Helper: get a column value from a CSV record by header name.
fn get_column<'a>(
    record: &'a csv::StringRecord,
    headers: &csv::StringRecord,
    name: &str,
) -> Option<String> {
    headers
        .iter()
        .position(|h| h.trim() == name)
        .and_then(|i| record.get(i).map(|s| s.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_csv(header: &str, rows: &[&str]) -> Vec<u8> {
        let mut csv = header.to_string();
        for row in rows {
            csv.push('\n');
            csv.push_str(row);
        }
        csv.into_bytes()
    }

    #[test]
    fn parses_valid_csv_with_3_rows() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &[
                "alice,student,1,Alice Smith,alice@example.com",
                "bob,teacher,1,Bob Jones,bob@example.com",
                "charlie,student,2,Charlie Brown,",
            ],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].username, "alice");
        assert_eq!(rows[0].role, "student");
        assert_eq!(rows[0].campus_id, 1);
        assert_eq!(rows[0].display_name, "Alice Smith");
        assert_eq!(rows[0].email, Some("alice@example.com".to_string()));
        assert_eq!(rows[0].status, ImportItemStatus::Valid);

        assert_eq!(rows[1].username, "bob");
        assert_eq!(rows[1].role, "teacher");
        assert_eq!(rows[1].status, ImportItemStatus::Valid);

        assert_eq!(rows[2].username, "charlie");
        assert_eq!(rows[2].email, None);
        assert_eq!(rows[2].status, ImportItemStatus::Valid);
    }

    #[test]
    fn rejects_csv_missing_username_column() {
        let csv_bytes = make_csv("role,campus_id,display_name,email", &["student,1,Alice,"]);

        let skip = HashSet::new();
        let result = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default());
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Missing required column: 'username'"));
    }

    #[test]
    fn rejects_csv_missing_role_column() {
        let csv_bytes = make_csv("username,campus_id,display_name,email", &["alice,1,Alice,"]);

        let skip = HashSet::new();
        let result = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default());
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Missing required column: 'role'"));
    }

    #[test]
    fn marks_error_for_empty_username() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &[",student,1,Some Name,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Error);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Username is required"));
    }

    #[test]
    fn marks_error_for_invalid_role() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,superadmin,1,Alice,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Error);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Invalid role: 'superadmin'"));
    }

    #[test]
    fn marks_duplicate_for_existing_username() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,student,1,Alice,"],
        );

        let mut skip = HashSet::new();
        skip.insert("alice".to_string());

        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Duplicate);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("already exists in database"));
    }

    #[test]
    fn handles_utf8_bom() {
        let mut csv_bytes = Vec::new();
        csv_bytes.extend_from_slice(BOM);
        csv_bytes.extend_from_slice(
            b"username,role,campus_id,display_name,email\nalice,student,1,Alice,",
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].username, "alice");
        assert_eq!(rows[0].status, ImportItemStatus::Valid);
    }

    #[test]
    fn sanitizes_csv_injection_payloads() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["=CMD(...),student,1,Evil User,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].username, "CMD(...)");
        assert_eq!(rows[0].status, ImportItemStatus::Valid);
    }

    #[test]
    fn marks_error_for_invalid_campus_id() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,student,not_a_number,Alice,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Error);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Invalid campus_id"));
    }

    #[test]
    fn rejects_root_role_even_for_root_caller() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,root,0,Root User,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(
            &csv_bytes,
            &skip,
            &RolePolicy {
                allow_root_roles: true,
            },
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Error);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("cannot be assigned via import"));
    }

    #[test]
    fn rejects_grade_admin_without_root_policy() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,gradeAdmin,1,Grade Admin,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(
            &csv_bytes,
            &skip,
            &RolePolicy {
                allow_root_roles: false,
            },
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Error);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("requires root privileges"));
    }

    #[test]
    fn allows_grade_admin_with_root_policy() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,gradeAdmin,1,Grade Admin,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(
            &csv_bytes,
            &skip,
            &RolePolicy {
                allow_root_roles: true,
            },
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Valid);
        // Role should be normalized to canonical lowercase
        assert_eq!(rows[0].role, "gradeadmin");
    }

    #[test]
    fn rejects_admin_role_not_in_db() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,admin,1,Admin User,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Error);
        assert!(rows[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Invalid role: 'admin'"));
    }

    #[test]
    fn normalizes_role_case_to_lowercase() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &["alice,Teacher,1,Alice,"],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, ImportItemStatus::Valid);
        assert_eq!(rows[0].role, "teacher");
    }

    #[test]
    fn detects_intra_csv_duplicate_usernames() {
        let csv_bytes = make_csv(
            "username,role,campus_id,display_name,email",
            &[
                "alice,student,1,Alice One,",
                "bob,teacher,1,Bob,",
                "alice,student,2,Alice Two,",
            ],
        );

        let skip = HashSet::new();
        let rows = parse_user_csv(&csv_bytes, &skip, &RolePolicy::default()).unwrap();
        assert_eq!(rows.len(), 3);
        // ALL rows with duplicated username should be marked Duplicate
        assert_eq!(rows[0].status, ImportItemStatus::Duplicate);
        assert!(rows[0].warning.as_ref().unwrap().contains("within CSV"));
        assert_eq!(rows[1].status, ImportItemStatus::Valid);
        assert_eq!(rows[2].status, ImportItemStatus::Duplicate);
        assert!(rows[2].warning.as_ref().unwrap().contains("within CSV"));
    }

    #[test]
    fn convert_to_batch_request_filters_valid_only() {
        let rows = vec![
            UserImportRow {
                username: "alice".to_string(),
                role: "student".to_string(),
                campus_id: 1,
                grade_id: None,
                display_name: "Alice".to_string(),
                email: Some("alice@example.com".to_string()),
                status: ImportItemStatus::Valid,
                warning: None,
            },
            UserImportRow {
                username: "bob".to_string(),
                role: "student".to_string(),
                campus_id: 1,
                grade_id: None,
                display_name: "Bob".to_string(),
                email: None,
                status: ImportItemStatus::Duplicate,
                warning: Some("already exists".to_string()),
            },
            UserImportRow {
                username: "charlie".to_string(),
                role: "student".to_string(),
                campus_id: 2,
                grade_id: None,
                display_name: "Charlie".to_string(),
                email: None,
                status: ImportItemStatus::Valid,
                warning: None,
            },
        ];

        let req = convert_to_batch_request(&rows, "default123", 42);
        assert_eq!(req.users.len(), 2);
        assert_eq!(req.users[0].user_code, "alice");
        assert_eq!(req.users[0].display_name, Some("Alice".to_string()));
        assert_eq!(req.users[0].email, Some("alice@example.com".to_string()));
        assert_eq!(req.users[0].campus_id, Some(1));
        assert_eq!(req.users[0].password, None);
        assert_eq!(req.users[0].role, Some("student".to_string()));
        assert_eq!(req.users[1].user_code, "charlie");
        assert_eq!(req.default_password, Some("default123".to_string()));
        assert_eq!(req.organization_id, 42);
        assert!(req.campus_id.is_none());
    }
}
