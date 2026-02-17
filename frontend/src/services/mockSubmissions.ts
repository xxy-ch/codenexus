import type { ProblemSubmission, TestCaseResult } from '@/types/problems'

// 模拟提交数据
export const mockSubmissions: (ProblemSubmission & {
  problem_title: string
  username: string
})[] = [
  {
    id: '1',
    problem_id: '1',
    problem_title: 'Two Sum',
    user_id: 'user1',
    username: 'testuser',
    code: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (map.find(complement) != map.end()) {
                return {map[complement], i};
            }
            map[nums[i]] = i;
        }
        return {};
    }
};

int main() {
    Solution sol;
    vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    vector<int> result = sol.twoSum(nums, target);
    cout << result[0] << " " << result[1] << endl;
    return 0;
}`,
    language: 'cpp',
    status: 'accepted',
    time_ms: 45,
    memory_kb: 1024,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:05Z',
    test_cases: [
      {
        id: 1,
        input: '2 7 11 15\n9',
        expected_output: '0 1',
        actual_output: '0 1',
        status: 'passed',
        time_ms: 15,
      },
      {
        id: 2,
        input: '3 2 4\n6',
        expected_output: '1 2',
        actual_output: '1 2',
        status: 'passed',
        time_ms: 20,
      },
      {
        id: 3,
        input: '3 3\n6',
        expected_output: '0 1',
        actual_output: '0 1',
        status: 'passed',
        time_ms: 10,
      },
    ],
  },
  {
    id: '2',
    problem_id: '2',
    problem_title: 'Add Two Numbers',
    user_id: 'user1',
    username: 'testuser',
    code: `def addTwoNumbers(l1, l2):
    carry = 0
    result = []
    while l1 or l2 or carry:
        val1 = l1.val if l1 else 0
        val2 = l2.val if l2 else 0
        total = val1 + val2 + carry
        carry = total // 10
        result.append(total % 10)
        if l1:
            l1 = l1.next
        if l2:
            l2 = l2.next
    return result

# 测试代码
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

l1 = ListNode(2, ListNode(4, ListNode(3)))
l2 = ListNode(5, ListNode(6, ListNode(4)))
print(addTwoNumbers(l1, l2))`,
    language: 'python',
    status: 'wrong_answer',
    time_ms: 120,
    memory_kb: 2048,
    error_message: 'Wrong output on test case 2',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:03Z',
    test_cases: [
      {
        id: 1,
        input: '2 4 3\n5 6 4',
        expected_output: '7 0 8',
        actual_output: '7 0 8',
        status: 'passed',
        time_ms: 40,
      },
      {
        id: 2,
        input: '0\n1',
        expected_output: '1',
        actual_output: '2',
        status: 'failed',
        error: 'Wrong output: expected 1, got 2',
        time_ms: 80,
      },
    ],
  },
  {
    id: '3',
    problem_id: '3',
    problem_title: 'Longest Substring Without Repeating Characters',
    user_id: 'user1',
    username: 'testuser',
    code: `function lengthOfLongestSubstring(s: string): number {
    let maxLen = 0;
    let left = 0;
    const charSet = new Set<string>();

    for (let right = 0; right < s.length; right++) {
        while (charSet.has(s[right])) {
            charSet.delete(s[left]);
            left++;
        }
        charSet.add(s[right]);
        maxLen = Math.max(maxLen, right - left + 1);
    }

    return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb"));
console.log(lengthOfLongestSubstring("bbbbb"));
console.log(lengthOfLongestSubstring("pwwkew"));`,
    language: 'typescript',
    status: 'accepted',
    time_ms: 85,
    memory_kb: 1536,
    created_at: '2024-01-01T08:30:00Z',
    updated_at: '2024-01-01T08:30:02Z',
    test_cases: [
      {
        id: 1,
        input: 'abcabcbb',
        expected_output: '3',
        actual_output: '3',
        status: 'passed',
        time_ms: 25,
      },
      {
        id: 2,
        input: 'bbbbb',
        expected_output: '1',
        actual_output: '1',
        status: 'passed',
        time_ms: 30,
      },
      {
        id: 3,
        input: 'pwwkew',
        expected_output: '3',
        actual_output: '3',
        status: 'passed',
        time_ms: 30,
      },
    ],
  },
  {
    id: '4',
    problem_id: '4',
    problem_title: 'Median of Two Sorted Arrays',
    user_id: 'user1',
    username: 'testuser',
    code: `def findMedianSortedArrays(nums1, nums2):
    # 简单但效率低的实现
    merged = sorted(nums1 + nums2)
    n = len(merged)
    if n % 2 == 1:
        return merged[n // 2]
    else:
        return (merged[n // 2 - 1] + merged[n // 2]) / 2

print(findMedianSortedArrays([1, 3], [2]))
print(findMedianSortedArrays([1, 2], [3, 4]))`,
    language: 'python',
    status: 'time_limit_exceeded',
    time_ms: 3500,
    memory_kb: 1024,
    error_message: 'Time limit exceeded on test case 3',
    created_at: '2024-01-01T07:00:00Z',
    updated_at: '2024-01-01T07:00:04Z',
    test_cases: [
      {
        id: 1,
        input: '[1, 3]\n[2]',
        expected_output: '2.0',
        actual_output: '2.0',
        status: 'passed',
        time_ms: 100,
      },
      {
        id: 2,
        input: '[1, 2]\n[3, 4]',
        expected_output: '2.5',
        actual_output: '2.5',
        status: 'passed',
        time_ms: 150,
      },
      {
        id: 3,
        input: '[1, 2, 3, 4, 5] * 1000\n[6, 7, 8, 9, 10] * 1000',
        expected_output: '5.5',
        actual_output: '5.5',
        status: 'failed',
        error: 'Time limit exceeded',
        time_ms: 3500,
      },
    ],
  },
  {
    id: '5',
    problem_id: '5',
    problem_title: 'Reverse Linked List',
    user_id: 'user1',
    username: 'testuser',
    code: `#include <iostream>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};

ListNode* reverseList(ListNode* head) {
    ListNode *prev = nullptr;
    ListNode *curr = head;
    while (curr) {
        ListNode *next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}

int main() {
    // 测试代码
    ListNode *head = new ListNode(1);
    head->next = new ListNode(2);
    head->next->next = new ListNode(3);
    head->next->next->next = new ListNode(4);
    head->next->next->next->next = new ListNode(5);

    ListNode *reversed = reverseList(head);

    while (reversed) {
        cout << reversed->val << " ";
        reversed = reversed->next;
    }
    cout << endl;

    return 0;
}`,
    language: 'cpp',
    status: 'compilation_error',
    error_message: 'error: expected \';\' before \'return\'',
    created_at: '2024-01-01T06:00:00Z',
    updated_at: '2024-01-01T06:00:01Z',
  },
  {
    id: '6',
    problem_id: '1',
    problem_title: 'Two Sum',
    user_id: 'user1',
    username: 'testuser',
    code: `public int[] twoSum(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) {
                return new int[] { i, j };
            }
        }
    }
    throw new IllegalArgumentException("No two sum solution");
}`,
    language: 'java',
    status: 'runtime_error',
    time_ms: 50,
    memory_kb: 1024,
    error_message: 'ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5',
    created_at: '2024-01-01T05:00:00Z',
    updated_at: '2024-01-01T05:00:02Z',
    test_cases: [
      {
        id: 1,
        input: '[2, 7, 11, 15]\n9',
        expected_output: '[0, 1]',
        actual_output: '[0, 1]',
        status: 'passed',
        time_ms: 20,
      },
      {
        id: 2,
        input: '[3, 2, 4]\n6',
        expected_output: '[1, 2]',
        actual_output: '[1, 2]',
        status: 'passed',
        time_ms: 15,
      },
      {
        id: 3,
        input: '[3, 3]\n6',
        expected_output: '[0, 1]',
        actual_output: 'error',
        status: 'failed',
        error: 'ArrayIndexOutOfBoundsException',
        time_ms: 15,
      },
    ],
  },
]

// 获取用户的所有提交（带过滤）
export function getMockUserSubmissions(filters: {
  page?: number
  limit?: number
  status?: string
  language?: string
} = {}) {
  let filtered = [...mockSubmissions]

  // 按状态过滤
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(s => s.status === filters.status)
  }

  // 按语言过滤
  if (filters.language && filters.language !== 'all') {
    filtered = filtered.filter(s => s.language === filters.language)
  }

  // 分页
  const page = filters.page || 1
  const limit = filters.limit || 20
  const start = (page - 1) * limit
  const end = start + limit
  const paginated = filtered.slice(start, end)

  return {
    submissions: paginated,
    total: filtered.length,
    page,
    limit,
  }
}

// 根据ID获取提交详情
export function getMockSubmissionDetail(id: string) {
  const submission = mockSubmissions.find(s => s.id === id)
  if (!submission) {
    throw new Error('Submission not found')
  }
  return submission
}