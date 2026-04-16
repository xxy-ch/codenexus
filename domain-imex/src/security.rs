use std::fmt;

/// Errors from ZIP and CSV security validation.
#[derive(Debug, Clone)]
pub enum SecurityError {
    PathTraversal(String),
    SymlinkDetected(String),
    FileTooLarge { path: String, size: u64, max: u64 },
    TooManyFiles { count: usize, max: usize },
    ArchiveTooLarge { size: usize, max: usize },
}

impl fmt::Display for SecurityError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SecurityError::PathTraversal(path) => {
                write!(f, "Path traversal detected: {}", path)
            }
            SecurityError::SymlinkDetected(path) => {
                write!(f, "Symlink detected: {}", path)
            }
            SecurityError::FileTooLarge { path, size, max } => {
                write!(
                    f,
                    "File too large: {} ({} bytes, max {} bytes)",
                    path, size, max
                )
            }
            SecurityError::TooManyFiles { count, max } => {
                write!(f, "Too many files in archive: {} (max {})", count, max)
            }
            SecurityError::ArchiveTooLarge { size, max } => {
                write!(
                    f,
                    "Archive too large: {} bytes (max {} bytes)",
                    size, max
                )
            }
        }
    }
}

impl std::error::Error for SecurityError {}

/// Maximum individual file size within a ZIP archive (10 MB).
const MAX_FILE_SIZE: u64 = 10_000_000;

/// Maximum number of entries in a ZIP archive.
const MAX_ARCHIVE_ENTRIES: usize = 500;

/// Maximum total raw size of a ZIP archive (50 MB).
const MAX_ARCHIVE_SIZE: usize = 50_000_000;

/// Validate a single ZIP entry for security issues.
///
/// Checks for:
/// - Path traversal (paths containing ".." or starting with "/" or "\")
/// - Symlink entries
/// - Oversized individual files
pub fn validate_zip_entry(path: &str, size: u64, is_symlink: bool) -> Result<(), SecurityError> {
    if path.contains("..") {
        return Err(SecurityError::PathTraversal(path.to_string()));
    }
    if path.starts_with('/') || path.starts_with('\\') {
        return Err(SecurityError::PathTraversal(path.to_string()));
    }
    if is_symlink {
        return Err(SecurityError::SymlinkDetected(path.to_string()));
    }
    if size > MAX_FILE_SIZE {
        return Err(SecurityError::FileTooLarge {
            path: path.to_string(),
            size,
            max: MAX_FILE_SIZE,
        });
    }
    Ok(())
}

/// Validate overall ZIP archive limits.
///
/// Checks for:
/// - Too many entries (max 500)
/// - Total archive size exceeding limit (max 50 MB)
pub fn validate_zip_archive(entry_count: usize, total_raw_size: usize) -> Result<(), SecurityError> {
    if entry_count > MAX_ARCHIVE_ENTRIES {
        return Err(SecurityError::TooManyFiles {
            count: entry_count,
            max: MAX_ARCHIVE_ENTRIES,
        });
    }
    if total_raw_size > MAX_ARCHIVE_SIZE {
        return Err(SecurityError::ArchiveTooLarge {
            size: total_raw_size,
            max: MAX_ARCHIVE_SIZE,
        });
    }
    Ok(())
}

/// Sanitize a CSV cell value to prevent formula injection attacks.
///
/// Strips leading characters that could be interpreted as spreadsheet formula
/// prefixes: '=', '+', '-', '@', and tab ('\t'). Multiple leading dangerous
/// characters are all stripped.
pub fn sanitize_csv_cell(value: &str) -> String {
    let trimmed = value.trim_start();
    let stripped = trimmed.trim_start_matches(|c| c == '=' || c == '+' || c == '-' || c == '@' || c == '\t');
    stripped.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- validate_zip_entry tests ---

    #[test]
    fn rejects_path_with_double_dot() {
        let result = validate_zip_entry("../../etc/passwd", 100, false);
        assert!(matches!(result, Err(SecurityError::PathTraversal(_))));
        if let Err(SecurityError::PathTraversal(path)) = result {
            assert_eq!(path, "../../etc/passwd");
        }
    }

    #[test]
    fn rejects_path_with_embedded_double_dot() {
        let result = validate_zip_entry("problems/../secret/config.json", 100, false);
        assert!(matches!(result, Err(SecurityError::PathTraversal(_))));
    }

    #[test]
    fn rejects_absolute_unix_path() {
        let result = validate_zip_entry("/etc/passwd", 100, false);
        assert!(matches!(result, Err(SecurityError::PathTraversal(_))));
    }

    #[test]
    fn rejects_absolute_windows_path() {
        let result = validate_zip_entry("\\windows\\system32", 100, false);
        assert!(matches!(result, Err(SecurityError::PathTraversal(_))));
    }

    #[test]
    fn rejects_symlink_entry() {
        let result = validate_zip_entry("link", 0, true);
        assert!(matches!(result, Err(SecurityError::SymlinkDetected(_))));
        if let Err(SecurityError::SymlinkDetected(path)) = result {
            assert_eq!(path, "link");
        }
    }

    #[test]
    fn rejects_oversized_file() {
        let result = validate_zip_entry("bigfile.dat", 20_000_000, false);
        assert!(matches!(
            result,
            Err(SecurityError::FileTooLarge {
                path: _,
                size: 20_000_000,
                max: 10_000_000
            })
        ));
    }

    #[test]
    fn accepts_valid_entry() {
        let result = validate_zip_entry("problems/two-sum/config.json", 500, false);
        assert!(result.is_ok());
    }

    #[test]
    fn accepts_entry_at_max_size() {
        let result = validate_zip_entry("file.txt", 10_000_000, false);
        assert!(result.is_ok());
    }

    // --- validate_zip_archive tests ---

    #[test]
    fn rejects_archive_with_too_many_files() {
        let result = validate_zip_archive(501, 1000);
        assert!(matches!(
            result,
            Err(SecurityError::TooManyFiles {
                count: 501,
                max: 500
            })
        ));
    }

    #[test]
    fn accepts_archive_at_max_entries() {
        let result = validate_zip_archive(500, 1000);
        assert!(result.is_ok());
    }

    #[test]
    fn rejects_oversized_archive() {
        let result = validate_zip_archive(10, 60_000_000);
        assert!(matches!(
            result,
            Err(SecurityError::ArchiveTooLarge {
                size: 60_000_000,
                max: 50_000_000
            })
        ));
    }

    #[test]
    fn accepts_archive_at_max_size() {
        let result = validate_zip_archive(10, 50_000_000);
        assert!(result.is_ok());
    }

    // --- sanitize_csv_cell tests ---

    #[test]
    fn strips_leading_equals() {
        assert_eq!(sanitize_csv_cell("=CMD(arg)"), "CMD(arg)");
    }

    #[test]
    fn strips_leading_plus() {
        assert_eq!(sanitize_csv_cell("+CMD(arg)"), "CMD(arg)");
    }

    #[test]
    fn strips_leading_minus() {
        assert_eq!(sanitize_csv_cell("-CMD(arg)"), "CMD(arg)");
    }

    #[test]
    fn strips_leading_at() {
        assert_eq!(sanitize_csv_cell("@SUM(A1:A10)"), "SUM(A1:A10)");
    }

    #[test]
    fn strips_leading_tab() {
        assert_eq!(sanitize_csv_cell("\t=CMD(arg)"), "CMD(arg)");
    }

    #[test]
    fn strips_multiple_leading_dangerous_chars() {
        assert_eq!(sanitize_csv_cell("==cmd"), "cmd");
    }

    #[test]
    fn strips_leading_tab_then_equals() {
        assert_eq!(sanitize_csv_cell("\t=CMD(arg)"), "CMD(arg)");
    }

    #[test]
    fn returns_safe_string_unchanged() {
        assert_eq!(sanitize_csv_cell("hello world"), "hello world");
    }

    #[test]
    fn returns_number_string_unchanged() {
        assert_eq!(sanitize_csv_cell("42"), "42");
    }

    #[test]
    fn handles_empty_string() {
        assert_eq!(sanitize_csv_cell(""), "");
    }

    #[test]
    fn trims_leading_whitespace() {
        assert_eq!(sanitize_csv_cell("  hello"), "hello");
    }
}
