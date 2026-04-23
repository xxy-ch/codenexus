/// Password migration utilities.
///
/// UOJ stores passwords as unsalted MD5 hashes. AlgoMaster uses bcrypt.
/// Per D-10-2, migrated passwords are stored with a `{MD5}` prefix marker.
/// The auth middleware will detect this prefix and transparently upgrade to
/// bcrypt on the user's first successful login.
///
/// Format an MD5 hash with the {MD5} prefix marker for transparent migration.
///
/// The prefix follows the Django-style password marker pattern (D-10-2).
/// Format: `"{MD5}{hex_md5_hash}"`
pub fn format_md5_prefix(md5_hash: &str) -> String {
    format!("{{MD5}}{}", md5_hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_md5_prefix_basic() {
        let result = format_md5_prefix("5f4dcc3b5aa765d61d8327deb882cf99");
        assert_eq!(result, "{MD5}5f4dcc3b5aa765d61d8327deb882cf99");
    }

    #[test]
    fn format_md5_prefix_empty_hash() {
        let result = format_md5_prefix("");
        assert_eq!(result, "{MD5}");
    }

    #[test]
    fn format_md5_prefix_starts_with_brace_md5() {
        let result = format_md5_prefix("abc123");
        assert!(result.starts_with("{MD5}"));
        assert_eq!(&result[5..], "abc123");
    }
}
