use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Language {
    pub id: String,
    pub name: String,
    pub version: String,
    pub compiler_path: String,
    pub source_file_extension: String,
    pub compilation_command: Option<String>,
    pub execution_command: String,
    pub memory_limit_mb: u64,
    pub time_limit_ms: u64,
}

pub fn get_supported_languages() -> HashMap<String, Language> {
    let mut languages = HashMap::new();

    languages.insert(
        "python".to_string(),
        Language {
            id: "python".to_string(),
            name: "Python".to_string(),
            version: "3.11".to_string(),
            compiler_path: "/usr/bin/python3".to_string(),
            source_file_extension: ".py".to_string(),
            compilation_command: None,
            execution_command: "/usr/bin/python3 {file}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "cpp".to_string(),
        Language {
            id: "cpp".to_string(),
            name: "C++".to_string(),
            version: "17".to_string(),
            compiler_path: "/usr/bin/g++".to_string(),
            source_file_extension: ".cpp".to_string(),
            compilation_command: Some(
                "/usr/bin/g++ -std=c++17 -O2 -o {output} {input}".to_string(),
            ),
            execution_command: "{output}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "c".to_string(),
        Language {
            id: "c".to_string(),
            name: "C".to_string(),
            version: "11".to_string(),
            compiler_path: "/usr/bin/gcc".to_string(),
            source_file_extension: ".c".to_string(),
            compilation_command: Some("/usr/bin/gcc -std=c11 -O2 -o {output} {input}".to_string()),
            execution_command: "{output}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "java".to_string(),
        Language {
            id: "java".to_string(),
            name: "Java".to_string(),
            version: "17".to_string(),
            compiler_path: "/usr/bin/javac".to_string(),
            source_file_extension: ".java".to_string(),
            compilation_command: Some("/usr/bin/javac {input}".to_string()),
            execution_command: "/usr/bin/java {class}".to_string(),
            memory_limit_mb: 1024,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "go".to_string(),
        Language {
            id: "go".to_string(),
            name: "Go".to_string(),
            version: "1.21".to_string(),
            compiler_path: "/usr/bin/go".to_string(),
            source_file_extension: ".go".to_string(),
            compilation_command: Some("/usr/bin/go build -o {output} {input}".to_string()),
            execution_command: "{output}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "rust".to_string(),
        Language {
            id: "rust".to_string(),
            name: "Rust".to_string(),
            version: "1.75".to_string(),
            compiler_path: "/usr/bin/rustc".to_string(),
            source_file_extension: ".rs".to_string(),
            compilation_command: Some("/usr/bin/rustc -o {output} {input}".to_string()),
            execution_command: "{output}".to_string(),
            memory_limit_mb: 1024,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "javascript".to_string(),
        Language {
            id: "javascript".to_string(),
            name: "JavaScript".to_string(),
            version: "20".to_string(),
            compiler_path: "/usr/bin/node".to_string(),
            source_file_extension: ".js".to_string(),
            compilation_command: None,
            execution_command: "/usr/bin/node {file}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "typescript".to_string(),
        Language {
            id: "typescript".to_string(),
            name: "TypeScript".to_string(),
            version: "5.3".to_string(),
            compiler_path: "/usr/bin/ts-node".to_string(),
            source_file_extension: ".ts".to_string(),
            compilation_command: None,
            execution_command: "/usr/bin/ts-node {file}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "ruby".to_string(),
        Language {
            id: "ruby".to_string(),
            name: "Ruby".to_string(),
            version: "3.2".to_string(),
            compiler_path: "/usr/bin/ruby".to_string(),
            source_file_extension: ".rb".to_string(),
            compilation_command: None,
            execution_command: "/usr/bin/ruby {file}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages.insert(
        "php".to_string(),
        Language {
            id: "php".to_string(),
            name: "PHP".to_string(),
            version: "8.2".to_string(),
            compiler_path: "/usr/bin/php".to_string(),
            source_file_extension: ".php".to_string(),
            compilation_command: None,
            execution_command: "/usr/bin/php {file}".to_string(),
            memory_limit_mb: 512,
            time_limit_ms: 5000,
        },
    );

    languages
}

pub fn get_language(id: &str) -> Option<Language> {
    get_supported_languages().get(id).cloned()
}
