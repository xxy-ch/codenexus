use std::collections::HashMap;

/// Result of parsing a mysqldump file.
/// Maps table names to their rows, where each row is a vector of string fields.
#[derive(Debug, Default)]
pub struct ParsedDump {
    pub tables: HashMap<String, Vec<Vec<String>>>,
}

/// UOJ user_info row.
/// Source: `user_info` table (varchar PK, MD5 password).
#[derive(Debug, Clone)]
pub struct UojUser {
    pub usergroup: String,
    pub username: String,
    pub email: String,
    pub password: String,
    pub svn_password: String,
    pub rating: String,
    pub qq: String,
    pub sex: String,
    pub ac_num: String,
    pub register_time: String,
    pub remote_addr: String,
    pub http_x_forwarded_for: String,
    pub remember_token: String,
    pub motto: String,
}

/// UOJ problems row.
/// Source: `problems` table.
#[derive(Debug, Clone)]
pub struct UojProblem {
    pub id: String,
    pub title: String,
    pub is_hidden: String,
    pub submission_requirement: String,
    pub hackable: String,
    pub extra_config: String,
    pub zan: String,
    pub ac_num: String,
    pub submit_num: String,
}

/// UOJ problems_contents row.
/// Source: `problems_contents` table.
#[derive(Debug, Clone)]
pub struct UojProblemContent {
    pub id: String,
    pub statement: String,
    pub statement_md: String,
}

/// UOJ problems_tags row.
/// Source: `problems_tags` table.
#[derive(Debug, Clone)]
pub struct UojProblemTag {
    pub id: String,
    pub problem_id: String,
    pub tag: String,
}

/// UOJ submissions row.
/// Source: `submissions` table.
#[derive(Debug, Clone)]
pub struct UojSubmission {
    pub id: String,
    pub problem_id: String,
    pub contest_id: String,
    pub submit_time: String,
    pub submitter: String,
    pub content: String,
    pub language: String,
    pub tot_size: String,
    pub judge_time: String,
    pub result: String,
    pub status: String,
    pub result_error: String,
    pub score: String,
    pub used_time: String,
    pub used_memory: String,
    pub is_hidden: String,
    pub status_details: String,
}

/// UOJ contests row.
/// Source: `contests` table.
#[derive(Debug, Clone)]
pub struct UojContest {
    pub id: String,
    pub name: String,
    pub start_time: String,
    pub last_min: String,
    pub player_num: String,
    pub status: String,
    pub extra_config: String,
    pub zan: String,
}

/// UOJ contests_problems row.
/// Source: `contests_problems` table.
#[derive(Debug, Clone)]
pub struct UojContestProblem {
    pub problem_id: String,
    pub contest_id: String,
}

/// UOJ contests_registrants row.
/// Source: `contests_registrants` table.
#[derive(Debug, Clone)]
pub struct UojContestRegistrant {
    pub username: String,
    pub user_rating: String,
    pub contest_id: String,
    pub has_participated: String,
    pub rank: String,
}

/// UOJ contests_submissions row.
/// Source: `contests_submissions` table.
#[derive(Debug, Clone)]
pub struct UojContestSubmission {
    pub contest_id: String,
    pub submitter: String,
    pub problem_id: String,
    pub submission_id: String,
    pub score: String,
    pub penalty: String,
}

/// UOJ blogs row.
/// Source: `blogs` table.
#[derive(Debug, Clone)]
pub struct UojBlog {
    pub id: String,
    pub title: String,
    pub content: String,
    pub post_time: String,
    pub poster: String,
    pub content_md: String,
    pub zan: String,
    pub is_hidden: String,
    pub blog_type: String,
    pub is_draft: String,
}

/// UOJ blogs_comments row.
/// Source: `blogs_comments` table.
#[derive(Debug, Clone)]
pub struct UojBlogComment {
    pub id: String,
    pub blog_id: String,
    pub content: String,
    pub post_time: String,
    pub poster: String,
    pub zan: String,
    pub reply_id: String,
}

/// UOJ blogs_tags row.
/// Source: `blogs_tags` table.
#[derive(Debug, Clone)]
pub struct UojBlogTag {
    pub id: String,
    pub blog_id: String,
    pub tag: String,
}

/// UOJ best_ac_submissions row.
/// Source: `best_ac_submissions` table.
#[derive(Debug, Clone)]
pub struct UojBestAcSubmission {
    pub problem_id: String,
    pub submitter: String,
    pub submission_id: String,
    pub used_time: String,
    pub used_memory: String,
    pub tot_size: String,
    pub shortest_id: String,
    pub shortest_used_time: String,
    pub shortest_used_memory: String,
    pub shortest_tot_size: String,
}

/// UOJ click_zans row.
/// Source: `click_zans` table.
#[derive(Debug, Clone)]
pub struct UojClickZan {
    pub zan_type: String,
    pub username: String,
    pub target_id: String,
    pub zan_val: String,
}

/// UOJ user_msg row.
/// Source: `user_msg` table.
#[derive(Debug, Clone)]
pub struct UojUserMsg {
    pub id: String,
    pub sender: String,
    pub receiver: String,
    pub message: String,
    pub send_time: String,
    pub read_time: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uoj_user_has_all_fields() {
        let user = UojUser {
            usergroup: "U".to_string(),
            username: "alice".to_string(),
            email: "alice@example.com".to_string(),
            password: "md5hash".to_string(),
            svn_password: "".to_string(),
            rating: "1500".to_string(),
            qq: "0".to_string(),
            sex: "U".to_string(),
            ac_num: "0".to_string(),
            register_time: "2020-01-01 00:00:00".to_string(),
            remote_addr: "".to_string(),
            http_x_forwarded_for: "".to_string(),
            remember_token: "".to_string(),
            motto: "".to_string(),
        };
        assert_eq!(user.username, "alice");
        assert_eq!(user.usergroup, "U");
        assert_eq!(user.email, "alice@example.com");
        assert_eq!(user.password, "md5hash");
        assert_eq!(user.register_time, "2020-01-01 00:00:00");
    }

    #[test]
    fn uoj_problem_has_all_fields() {
        let problem = UojProblem {
            id: "1".to_string(),
            title: "A + B".to_string(),
            is_hidden: "0".to_string(),
            submission_requirement: "NULL".to_string(),
            hackable: "0".to_string(),
            extra_config: r#"{"view_content_type":"ALL","view_details_type":"ALL","time_limit":1000,"memory_limit":256}"#.to_string(),
            zan: "0".to_string(),
            ac_num: "10".to_string(),
            submit_num: "50".to_string(),
        };
        assert_eq!(problem.id, "1");
        assert_eq!(problem.title, "A + B");
        assert!(problem.extra_config.contains("time_limit"));
    }

    #[test]
    fn uoj_submission_has_all_fields() {
        let submission = UojSubmission {
            id: "100".to_string(),
            problem_id: "1".to_string(),
            contest_id: "NULL".to_string(),
            submit_time: "2020-06-01 12:00:00".to_string(),
            submitter: "bob".to_string(),
            content: "#include <cstdio>".to_string(),
            language: "C++".to_string(),
            tot_size: "100".to_string(),
            judge_time: "2020-06-01 12:00:05".to_string(),
            result: "Accepted".to_string(),
            status: "Judged".to_string(),
            result_error: "NULL".to_string(),
            score: "100".to_string(),
            used_time: "50".to_string(),
            used_memory: "1024".to_string(),
            is_hidden: "0".to_string(),
            status_details: "".to_string(),
        };
        assert_eq!(submission.id, "100");
        assert_eq!(submission.submitter, "bob");
        assert_eq!(submission.result, "Accepted");
        assert_eq!(submission.language, "C++");
    }

    #[test]
    fn uoj_contest_has_all_fields() {
        let contest = UojContest {
            id: "1".to_string(),
            name: "Test Contest".to_string(),
            start_time: "2020-01-01 10:00:00".to_string(),
            last_min: "180".to_string(),
            player_num: "20".to_string(),
            status: "ended".to_string(),
            extra_config: "{}".to_string(),
            zan: "0".to_string(),
        };
        assert_eq!(contest.id, "1");
        assert_eq!(contest.name, "Test Contest");
        assert_eq!(contest.last_min, "180");
    }

    #[test]
    fn uoj_blog_has_all_fields() {
        let blog = UojBlog {
            id: "1".to_string(),
            title: "My First Blog".to_string(),
            content: "<p>Hello</p>".to_string(),
            post_time: "2020-01-01 00:00:00".to_string(),
            poster: "alice".to_string(),
            content_md: "# Hello".to_string(),
            zan: "5".to_string(),
            is_hidden: "0".to_string(),
            blog_type: "B".to_string(),
            is_draft: "0".to_string(),
        };
        assert_eq!(blog.id, "1");
        assert_eq!(blog.title, "My First Blog");
        assert_eq!(blog.poster, "alice");
        assert_eq!(blog.zan, "5");
    }

    #[test]
    fn parsed_dump_default_is_empty() {
        let dump = ParsedDump::default();
        assert!(dump.tables.is_empty());
    }
}
