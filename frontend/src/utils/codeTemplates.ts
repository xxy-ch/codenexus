// 代码模板系统 - 为每种语言提供标准的题目解答模板

export const CODE_TEMPLATES = {
  cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

class Solution {
public:
    // TODO: 在这里实现你的解决方案
    int solve() {
        // 你的代码

        return 0;
    }
};

int main() {
    Solution sol;

    // TODO: 读取输入
    int n;
    cin >> n;

    // TODO: 调用解决方案并输出结果
    int result = sol.solve();
    cout << result << endl;

    return 0;
}`,
  java: `import java.util.*;
import java.io.*;

public class Solution {
    // TODO: 在这里实现你的解决方案
    public int solve() {
        // 你的代码

        return 0;
    }

    public static void main(String[] args) throws Exception {
        Solution sol = new Solution();
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

        // TODO: 读取输入
        String line = br.readLine();
        int n = Integer.parseInt(line.trim());

        // TODO: 调用解决方案并输出结果
        int result = sol.solve();
        System.out.println(result);

        br.close();
    }
}`,
  python: `import sys
from typing import List, Tuple

class Solution:
    # TODO: 在这里实现你的解决方案
    def solve(self) -> int:
        # 你的代码

        return 0

def main():
    sol = Solution()

    # TODO: 读取输入
    n = int(sys.stdin.readline().strip())

    # TODO: 调用解决方案并输出结果
    result = sol.solve()
    print(result)

if __name__ == "__main__":
    main()`,
  javascript: `// TODO: 在这里实现你的解决方案
class Solution {
    solve() {
        // 你的代码

        return 0;
    }
}

function main() {
    const sol = new Solution();

    // TODO: 读取输入 (Node.js)
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('', (input) => {
        const n = parseInt(input.trim());

        // TODO: 调用解决方案并输出结果
        const result = sol.solve();
        console.log(result);

        rl.close();
    });
}

main();`,
  typescript: `// TODO: 在这里实现你的解决方案
class Solution {
    solve(): number {
        // 你的代码

        return 0;
    }
}

function main(): void {
    const sol = new Solution();

    // TODO: 读取输入
    const input: string = require('readline-sync').question('');
    const n: number = parseInt(input.trim());

    // TODO: 调用解决方案并输出结果
    const result: number = sol.solve();
    console.log(result);
}

main();`,
  rust: `use std::io::{self, BufRead};

struct Solution {
    // TODO: 在这里实现你的解决方案
    fn solve(&self) -> i32 {
        // 你的代码

        0
    }
}

fn main() {
    let solution = Solution {};

    // TODO: 读取输入
    let stdin = io::stdin();
    let line = stdin.lock().lines().next().unwrap().unwrap();
    let _n: i32 = line.trim().parse().unwrap();

    // TODO: 调用解决方案并输出结果
    let result = solution.solve();
    println!("{}", result);
}`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
)

type Solution struct {
    // TODO: 添加必要的字段
}

// TODO: 在这里实现你的解决方案
func (s *Solution) Solve() int {
    // 你的代码

    return 0
}

func main() {
    sol := &Solution{}

    // TODO: 读取输入
    scanner := bufio.NewScanner(os.Stdin)
    scanner.Scan()
    n, _ := strconv.Atoi(strings.TrimSpace(scanner.Text()))

    // TODO: 调用解决方案并输出结果
    result := sol.Solve()
    fmt.Println(result)
}`,
  csharp: `using System;
using System.IO;

public class Solution {
    // TODO: 在这里实现你的解决方案
    public int Solve() {
        // 你的代码

        return 0;
    }
}

class Program {
    static void Main(string[] args) {
        Solution sol = new Solution();

        // TODO: 读取输入
        string line = Console.ReadLine();
        int n = int.Parse(line.Trim());

        // TODO: 调用解决方案并输出结果
        int result = sol.Solve();
        Console.WriteLine(result);
    }
}`,
  ruby: `# TODO: 在这里实现你的解决方案
class Solution
  def solve
    # 你的代码

    0
  end
end

def main
  sol = Solution.new

  # TODO: 读取输入
  n = gets.to_i

  # TODO: 调用解决方案并输出结果
  result = sol.solve
  puts result
end

main`,
  php: `<?php
// TODO: 在这里实现你的解决方案
class Solution {
    public function solve(): int {
        // 你的代码

        return 0;
    }
}

// TODO: 读取输入
$fp = fopen("php://stdin", "r");
$line = fgets($fp);
$n = intval(trim($line));

$sol = new Solution();

// TODO: 调用解决方案并输出结果
$result = $sol->solve();
echo $result . PHP_EOL;

fclose($fp);
?>`,
  swift: `import Foundation

class Solution {
    // TODO: 在这里实现你的解决方案
    func solve() -> Int {
        // 你的代码

        return 0
    }
}

// TODO: 读取输入
if let line = readLine() {
    let n = Int(line.trimmingCharacters(in: .whitespaces)) ?? 0

    let sol = Solution()

    // TODO: 调用解决方案并输出结果
    let result = sol.solve()
    print(result)
}`,
  kotlin: `import java.util.*

// TODO: 在这里实现你的解决方案
class Solution {
    fun solve(): Int {
        // 你的代码

        return 0
    }
}

fun main() {
    val sol = Solution()

    // TODO: 读取输入
    val scanner = Scanner(System.`in`)
    val n = scanner.nextInt()

    // TODO: 调用解决方案并输出结果
    val result = sol.solve()
    println(result)
}

main()`,
}

// 语言配置
export const LANGUAGE_CONFIG = {
  cpp: {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    icon: '🔷',
    monaco: 'cpp',
    version: 'gnu++17',
    compileTime: 2000,
    memoryLimit: 256,
  },
  java: {
    id: 'java',
    name: 'Java',
    extension: 'java',
    icon: '☕',
    monaco: 'java',
    version: '17',
    compileTime: 3000,
    memoryLimit: 512,
  },
  python: {
    id: 'python',
    name: 'Python 3',
    extension: 'py',
    icon: '🐍',
    monaco: 'python',
    version: '3.11',
    compileTime: 1000,
    memoryLimit: 256,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    icon: '📜',
    monaco: 'javascript',
    version: 'Node.js 20',
    compileTime: 1000,
    memoryLimit: 256,
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extension: 'ts',
    icon: '📘',
    monaco: 'typescript',
    version: '5.0',
    compileTime: 2000,
    memoryLimit: 256,
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    extension: 'rs',
    icon: '🦀',
    monaco: 'rust',
    version: '1.75',
    compileTime: 5000,
    memoryLimit: 512,
  },
  go: {
    id: 'go',
    name: 'Go',
    extension: 'go',
    icon: '🐹',
    monaco: 'go',
    version: '1.21',
    compileTime: 2000,
    memoryLimit: 256,
  },
  csharp: {
    id: 'csharp',
    name: 'C#',
    extension: 'cs',
    icon: '💜',
    monaco: 'csharp',
    version: '.NET 8',
    compileTime: 3000,
    memoryLimit: 256,
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    extension: 'rb',
    icon: '💎',
    monaco: 'ruby',
    version: '3.2',
    compileTime: 1000,
    memoryLimit: 256,
  },
  php: {
    id: 'php',
    name: 'PHP',
    extension: 'php',
    icon: '🐘',
    monaco: 'php',
    version: '8.2',
    compileTime: 1000,
    memoryLimit: 256,
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    extension: 'swift',
    icon: '🍎',
    monaco: 'swift',
    version: '5.9',
    compileTime: 3000,
    memoryLimit: 256,
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    extension: 'kt',
    icon: '🎯',
    monaco: 'kotlin',
    version: '1.9',
    compileTime: 2000,
    memoryLimit: 256,
  },
}

// 获取代码模板
export function getCodeTemplate(language: string): string {
  return CODE_TEMPLATES[language] || CODE_TEMPLATES.cpp
}

// 获取语言配置
export function getLanguageConfig(languageId: string) {
  return LANGUAGE_CONFIG[languageId] || LANGUAGE_CONFIG.cpp
}

// 获取所有支持的语言
export function getAllLanguages() {
  return Object.values(LANGUAGE_CONFIG)
}

// 验证语言是否支持
export function isLanguageSupported(language: string): boolean {
  return language in CODE_TEMPLATES && language in LANGUAGE_CONFIG
}