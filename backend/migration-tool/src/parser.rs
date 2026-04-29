use std::collections::HashMap;

use crate::models::ParsedDump;

/// Parse a mysqldump file content into a structured representation.
///
/// Extracts INSERT INTO `table_name` VALUES (...) statements from the dump,
/// handling MySQL string escaping, NULL values, and hex-encoded blobs.
pub fn parse_dump(content: &str) -> ParsedDump {
    let mut tables: HashMap<String, Vec<Vec<String>>> = HashMap::new();
    let insert_re = regex::Regex::new(r"INSERT INTO `\w+` VALUES ").unwrap();

    for line in content.lines() {
        if let Some(table_name) = extract_table_name(line) {
            // Find where VALUES starts
            if let Some(values_start) = insert_re.find(line) {
                let values_str = &line[values_start.end()..];
                // Remove trailing semicolon
                let values_str = values_str.trim_end_matches(';');
                let rows = parse_values(values_str);
                tables.entry(table_name).or_default().extend(rows);
            }
        }
    }

    ParsedDump { tables }
}

/// Extract the table name from an INSERT INTO statement.
fn extract_table_name(line: &str) -> Option<String> {
    let re = regex::Regex::new(r"INSERT INTO `(\w+)` VALUES").ok()?;
    re.captures(line).map(|c| c[1].to_string())
}

/// Parse the VALUES portion of an INSERT statement.
///
/// Handles parenthesized groups: (val1,'val2',...),(val1,'val2',...)
/// Uses a character-by-character state machine for robust handling of
/// MySQL string escaping.
pub fn parse_values(values_str: &str) -> Vec<Vec<String>> {
    let mut rows = Vec::new();
    let mut current_row = Vec::new();
    let mut current_field = String::new();
    let mut chars = values_str.chars().peekable();

    let mut in_string = false;
    let mut in_parens = false;

    while let Some(ch) = chars.next() {
        if in_string {
            if ch == '\\' {
                // Escape sequence
                if let Some(next) = chars.next() {
                    match next {
                        '\'' => current_field.push('\''),
                        '\\' => current_field.push('\\'),
                        '0' => current_field.push('\0'),
                        'n' => current_field.push('\n'),
                        'r' => current_field.push('\r'),
                        't' => current_field.push('\t'),
                        'Z' => current_field.push('\x1a'), // Ctrl+Z
                        _ => {
                            // Unknown escape: preserve both characters
                            current_field.push('\\');
                            current_field.push(next);
                        }
                    }
                }
            } else if ch == '\'' {
                // End of string
                in_string = false;
            } else {
                current_field.push(ch);
            }
        } else if in_parens {
            match ch {
                '\'' => {
                    in_string = true;
                }
                ',' => {
                    // Field separator
                    current_row.push(std::mem::take(&mut current_field));
                }
                ')' => {
                    // End of row
                    current_row.push(std::mem::take(&mut current_field));
                    rows.push(std::mem::take(&mut current_row));
                    in_parens = false;
                }
                _ => {
                    current_field.push(ch);
                }
            }
        } else {
            // Outside parens, look for opening paren
            if ch == '(' {
                in_parens = true;
            }
            // Ignore everything else (commas between rows, whitespace)
        }
    }

    rows
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_dump_returns_empty_tables() {
        let dump = parse_dump("-- just a comment\nCREATE TABLE foo (id int);\n");
        assert!(dump.tables.is_empty());
    }

    #[test]
    fn single_insert_row() {
        let sql = r"INSERT INTO `user_info` VALUES ('U','alice','alice@example.com','md5hash','','1500','0','U','0','2020-01-01 00:00:00','','','','');";
        let dump = parse_dump(sql);
        assert!(dump.tables.contains_key("user_info"));
        let rows = &dump.tables["user_info"];
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0][1], "alice");
        assert_eq!(rows[0][2], "alice@example.com");
        assert_eq!(rows[0][3], "md5hash");
        assert_eq!(rows[0][0], "U");
    }

    #[test]
    fn multiple_rows_in_single_insert() {
        let sql = r"INSERT INTO `table` VALUES (1,'a'),(2,'b'),(3,'c');";
        let dump = parse_dump(sql);
        let rows = &dump.tables["table"];
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0], vec!["1", "a"]);
        assert_eq!(rows[1], vec!["2", "b"]);
        assert_eq!(rows[2], vec!["3", "c"]);
    }

    #[test]
    fn null_values_handled() {
        let sql = r"INSERT INTO `table` VALUES (1,NULL,'text');";
        let dump = parse_dump(sql);
        let rows = &dump.tables["table"];
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0][0], "1");
        assert_eq!(rows[0][1], "NULL");
        assert_eq!(rows[0][2], "text");
    }

    #[test]
    fn escaped_quotes_handled() {
        // Build the SQL with a raw backslash-quote inside the string value
        let sql = "INSERT INTO `table` VALUES (1,'it\\'s a test');";
        let dump = parse_dump(sql);
        let rows = &dump.tables["table"];
        assert_eq!(rows[0][1], "it's a test");
    }

    #[test]
    fn hex_encoded_blob_preserved() {
        let sql = r"INSERT INTO `table` VALUES (1,0x4163636570746564);";
        let dump = parse_dump(sql);
        let rows = &dump.tables["table"];
        assert_eq!(rows[0][1], "0x4163636570746564");
    }

    #[test]
    fn empty_string_values_handled() {
        let sql = r"INSERT INTO `table` VALUES ('','text');";
        let dump = parse_dump(sql);
        let rows = &dump.tables["table"];
        assert_eq!(rows[0][0], "");
        assert_eq!(rows[0][1], "text");
    }

    #[test]
    fn non_insert_lines_ignored() {
        let input = "\
-- MySQL dump 10.13
CREATE TABLE `foo` (id int);
LOCK TABLES `foo` WRITE;
/*!40000 ALTER TABLE `foo` DISABLE KEYS */;
/*!40000 ALTER TABLE `foo` ENABLE KEYS */;
UNLOCK TABLES;
";
        let dump = parse_dump(input);
        assert!(dump.tables.is_empty());
    }

    #[test]
    fn escaped_backslash_in_string() {
        // MySQL value: 'path\\file' (two chars: backslash backslash = escaped backslash)
        let sql = "INSERT INTO `table` VALUES (1,'path\\\\file');";
        let dump = parse_dump(sql);
        let rows = &dump.tables["table"];
        assert_eq!(rows[0][1], "path\\file");
    }

    #[test]
    fn mixed_null_string_integer() {
        let sql = r"INSERT INTO `t` VALUES (1,NULL,'hello',42,'');";
        let dump = parse_dump(sql);
        let rows = &dump.tables["t"];
        assert_eq!(rows[0], vec!["1", "NULL", "hello", "42", ""]);
    }

    /// Realistic multi-table dump snippet combining multiple edge cases:
    /// - Multiple tables (user_info, problems, submissions)
    /// - NULL values, empty strings, escaped quotes
    /// - Hex-encoded blob (UOJ result field)
    /// - Multiple rows per INSERT statement
    /// - Non-INSERT lines (comments, DDL) that must be ignored
    #[test]
    fn test_parse_real_world_dump_format() {
        let dump_content = r#"
-- MySQL dump 10.13  Distrib 5.7.26
-- Host: localhost    Database: uoj
-- ------------------------------------------------------
/*!40101 SET NAMES utf8mb4 */;

CREATE TABLE `user_info` (
  `usergroup` varchar(1) NOT NULL,
  `username` varchar(20) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `password` varchar(50) DEFAULT NULL,
  `svn_password` varchar(50) DEFAULT NULL,
  `rating` int(11) NOT NULL DEFAULT '1500',
  `qq` varchar(20) NOT NULL DEFAULT '0',
  `sex` varchar(1) NOT NULL DEFAULT 'U',
  `ac_num` int(11) NOT NULL DEFAULT '0',
  `register_time` datetime NOT NULL,
  `remote_addr` varchar(50) NOT NULL DEFAULT '',
  `http_x_forwarded_for` varchar(50) NOT NULL DEFAULT '',
  `remember_token` varchar(64) DEFAULT NULL,
  `motto` varchar(200) NOT NULL DEFAULT ''
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

LOCK TABLES `user_info` WRITE;
INSERT INTO `user_info` VALUES ('U','alice','alice@example.com','5f4dcc3b5aa765d61d8327deb882cf99','','1500','0','U','0','2020-01-01 00:00:00','127.0.0.1','','',''),('U','bob','','7c6a180b36896a0a8c02787eeafb0e4c','','1500','0','U','5','2020-06-15 10:30:00','192.168.1.1','','','Hello World'),('B','banned_user','banned@test.com','hash123','','1500','0','U','0','2019-03-20 08:00:00','','','','');
UNLOCK TABLES;

LOCK TABLES `problems` WRITE;
INSERT INTO `problems` VALUES (1,'A + B Problem','0','FILE','0','{"view_content_type":"ALL","time_limit":1000,"memory_limit":256}','0','10','50'),(2,'Dynamic Programming','1','FILE','0','{"time_limit":2000,"memory_limit":512}','0','3','20');
UNLOCK TABLES;

LOCK TABLES `submissions` WRITE;
INSERT INTO `submissions` VALUES (100,1,'NULL','2020-06-01 12:00:00','alice','#include <cstdio>','C++','256','2020-06-01 12:00:05',0x4163636570746564,'Judged','','100','50','2048','0',''),(101,1,'NULL','2020-06-01 12:05:00','bob','print(1+2)','Python3','64','2020-06-01 12:05:02','Accepted','Judged','','100','30','1024','0','');
UNLOCK TABLES;
"#;

        let dump = parse_dump(dump_content);

        // Three tables parsed
        assert_eq!(
            dump.tables.len(),
            3,
            "must find 3 tables: user_info, problems, submissions"
        );
        assert!(dump.tables.contains_key("user_info"));
        assert!(dump.tables.contains_key("problems"));
        assert!(dump.tables.contains_key("submissions"));

        // user_info: 3 users
        let users = &dump.tables["user_info"];
        assert_eq!(users.len(), 3);
        // alice
        assert_eq!(users[0][0], "U");
        assert_eq!(users[0][1], "alice");
        assert_eq!(users[0][2], "alice@example.com");
        assert_eq!(users[0][3], "5f4dcc3b5aa765d61d8327deb882cf99");
        // bob (empty email)
        assert_eq!(users[1][1], "bob");
        assert_eq!(users[1][2], "");
        // banned user
        assert_eq!(users[2][0], "B");
        assert_eq!(users[2][1], "banned_user");

        // problems: 2 problems
        let problems = &dump.tables["problems"];
        assert_eq!(problems.len(), 2);
        assert_eq!(problems[0][1], "A + B Problem");
        assert_eq!(problems[0][2], "0"); // is_hidden = 0 (public)
        assert!(problems[0][5].contains("time_limit"));
        assert_eq!(problems[1][1], "Dynamic Programming");
        assert_eq!(problems[1][2], "1"); // is_hidden = 1 (private)

        // submissions: 2 submissions
        let subs = &dump.tables["submissions"];
        assert_eq!(subs.len(), 2);
        assert_eq!(subs[0][0], "100");
        assert_eq!(subs[0][4], "alice");
        assert_eq!(subs[0][6], "C++");
        // Hex-encoded blob result preserved
        assert_eq!(subs[0][9], "0x4163636570746564");
        // Plain text result
        assert_eq!(subs[1][9], "Accepted");
        assert_eq!(subs[1][4], "bob");
        assert_eq!(subs[1][6], "Python3");
    }
}
