import json, os, re

mappings = [
    {"src": "oj_login", "dest": "frontend/src/pages/auth/LoginPage.tsx", "exportName": "LoginPage"},
    {"src": "oj_dashboard", "dest": "frontend/src/pages/user/DashboardEnhanced.tsx", "exportName": "DashboardEnhanced"},
    {"src": "oj_admin_control_panel", "dest": "frontend/src/pages/admin/AdminDashboard.tsx", "exportName": "AdminDashboard"},
    {"src": "oj_contest_system", "dest": "frontend/src/pages/user/ContestList.tsx", "exportName": "ContestList"},
    {"src": "oj_discussion_forum", "dest": "frontend/src/pages/community/DiscussionList.tsx", "exportName": "DiscussionList"},
    {"src": "oj_online_ide", "dest": "frontend/src/pages/user/ProblemIDEEnhanced.tsx", "exportName": "ProblemIDEEnhanced"},
    {"src": "oj_problem_detail", "dest": "frontend/src/pages/user/ProblemDetail.tsx", "exportName": "ProblemDetail"},
    {"src": "oj_problem_list", "dest": "frontend/src/pages/user/ProblemSet.tsx", "exportName": "ProblemSet"},
    {"src": "oj_submission_history", "dest": "frontend/src/pages/user/SubmissionHistory.tsx", "exportName": "SubmissionHistory"},
    {"src": "oj_user_rankings", "dest": "frontend/src/pages/user/Ranking.tsx", "exportName": "Ranking"}
]

dict_zh = {
    'Dashboard': '仪表盘', 'Problems': '题库', 'Problem': '题目',
    'Contests': '比赛', 'Contest': '比赛', 'Rankings': '排行榜',
    'Ranking': '排行榜', 'Discussions': '讨论区', 'Discussion': '讨论区',
    'Submit Code': '提交代码', 'Settings': '设置', 'Logout': '退出登录',
    'Search': '搜索', 'Admin Control Panel': '管理员控制台',
    'Online IDE': '在线编程', 'Submission History': '提交历史',
    'User Rankings': '用户排名'
}

for m in mappings:
    fpath = f"/Users/xiexingyu/Downloads/stitch/{m['src']}/code.html"
    if not os.path.exists(fpath): continue
    
    with open(fpath, "r", encoding="utf-8") as f:
        html = f.read()

    body_match = re.search(r'<body[^>]*>([\s\S]*)</body>', html, re.IGNORECASE)
    if body_match:
        c = body_match.group(1)
        c = c.replace('class=', 'className=')
        c = re.sub(r'style="[^"]*"', '', c)
        c = re.sub(r'onclick="[^"]*"', '', c, flags=re.IGNORECASE)
        c = c.replace('stroke-width', 'strokeWidth')
        c = c.replace('stroke-linecap', 'strokeLinecap')
        c = c.replace('stroke-linejoin', 'strokeLinejoin')
        c = c.replace('fill-rule', 'fillRule')
        c = c.replace('clip-rule', 'clipRule')
        c = c.replace('for="', 'htmlFor="')
        c = re.sub(r'<!--[\s\S]*?-->', '', c)
        c = c.replace('<br>', '<br />')
        c = c.replace('<hr>', '<hr />')
        c = re.sub(r'<input([^>]*?[^/])>', r'<input\1 />', c)
        c = re.sub(r'<img([^>]*?[^/])>', r'<img\1 />', c)
        c = c.replace(' {}', '')     

        for en, zh in dict_zh.items():
            c = re.sub(r'>\s*' + en + r'\s*<', f'>{zh}<', c)

        out_content = f"""import React from 'react';\n\nexport function {m['exportName']}() {{\n  return (\n    <div className="bg-background text-on-background selection:bg-secondary-container min-h-screen">\n      {c}\n    </div>\n  );\n}}\n\nexport default {m['exportName']};\n"""

        with open(m['dest'], "w", encoding="utf-8") as outf:
            outf.write(out_content)
        print("Saved", m['dest'])

