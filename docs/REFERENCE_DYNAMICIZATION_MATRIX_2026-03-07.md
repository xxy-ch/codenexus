# Reference Dynamicization Matrix - 2026-03-07

## Status Legend
- `matched`: route and page exist, and visual structure is substantially aligned with the reference template.
- `partial`: route and dynamic data exist, but layout/visual hierarchy is not yet a faithful reference conversion.
- `missing`: no clear route/page mapping, or multiple references are still collapsed into a generic page.

## User Experience
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `modular_homepage_dashboard_1` | `/dashboard` | `frontend/src/pages/user/DashboardEnhanced.tsx` | `usersService.getUserStats/getUserActivity/getRecommendedProblems` | `partial` | Functional dashboard exists, but card system, header composition, and panel layout are not reference-faithful. |
| `modular_homepage_dashboard_2` | `/dashboard` | `frontend/src/pages/user/DashboardEnhanced.tsx` | same as above | `partial` | Second dashboard reference has not been explicitly merged into a final information architecture. |
| `problem_repository` | `/problems` | `frontend/src/pages/user/ProblemSet.tsx` | `problemsService.getProblems` | `partial` | Dynamic list exists, but filter bar, overview cards, and repository-style chrome are simplified. |
| `problem_solving_ide` | `/problems/:problemId/solve` | `frontend/src/pages/user/ProblemIDEEnhanced.tsx` | `problemsService.getProblemDetail/submitCode`, websocket updates | `partial` | Core IDE works, but shell, metadata strip, and result docking are not yet reference-faithful. |
| `submission_history` | `/submissions` | `frontend/src/pages/user/SubmissionHistory.tsx` | `problemsService.getUserSubmissions` | `partial` | Table works, but reference header, summary cards, and filter hierarchy are not fully implemented. |
| `submission_detail_analysis` | `/submissions/:submissionId` | `frontend/src/pages/user/SubmissionDetail.tsx` | `problemsService.getSubmissionDetail` | `partial` | Detail page works, but reference-grade analysis layout and code/testcase pane structure are still simplified. |
| `global_user_rankings` | `/ranking` | `frontend/src/pages/user/Ranking.tsx` | `rankingService` | `partial` | Ranking data exists, but visual system is not yet aligned to the reference composition. |
| `live_contest_scoreboard_board` | `/contests/:contestId/scoreboard` | `frontend/src/pages/contest/ContestScoreboard.tsx` | `scoreboardService.getContestScoreboard` | `partial` | Functional scoreboard exists, but not yet transformed to the reference board presentation. |
| `user_settings_&_profile` | `/profile`, `/settings` | `frontend/src/pages/user/Profile.tsx`, `frontend/src/pages/user/Settings.tsx` | `usersService.getMyProfile/updateMyProfile` | `partial` | Data and forms exist, but profile/settings reference is split across two pages and not visually unified. |

## Community
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `community_blog_feed` | `/blog` | `frontend/src/pages/community/BlogList.tsx` | blog services | `partial` | Feed exists, but not yet reference-faithful in information density and card treatment. |
| `blog_article_editor` | `/blog/new`, `/blog/:slug/edit` | `frontend/src/pages/community/CreateArticle.tsx`, `frontend/src/pages/community/EditArticle.tsx` | blog services | `partial` | Dynamic editor exists, but shell and split-pane editing experience differ from reference. |
| `direct_messages` | `/messages` | `frontend/src/pages/community/DirectMessages.tsx` | messages service | `partial` | Core messaging exists, but thread list/message pane styling needs closer reference conversion. |

## Teacher
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `teacher_class_management_1` | `/teacher/classes` or monitoring sub-view | `frontend/src/pages/teacher/ClassManagement.tsx` | class services | `partial` | Class hub now follows the reference shell more closely, but there is still no dedicated monitoring sub-view. |
| `teacher_class_management_2` | `/teacher/contest-wizard` | `frontend/src/pages/teacher/ContestWizard.tsx` | teacher contest services | `partial` | Wizard now follows the multi-step reference structure with real create flow, but later steps still defer to post-create pages. |
| `teacher_class_management_3` | `/teacher/assignment-report` | `frontend/src/pages/teacher/AssignmentReport.tsx` | teacher report services | `partial` | Report now uses reference-style summary cards and tables, but deeper assignment analytics are still limited by live schema. |
| `teacher_class_management_4` | discussion/thread related | `frontend/src/pages/community/DiscussionDetail.tsx` | discussion services | `partial` | Similar domain coverage, but not formally mapped or visually aligned. |
| `teacher_class_management_5` | `/roadmap` | `frontend/src/pages/user/LearningRoadmap.tsx` | roadmap data | `partial` | Functional roadmap exists, but not yet reference-faithful. |
| `teacher_class_management_6` | `/teacher/classes` | `frontend/src/pages/teacher/ClassManagement.tsx` | class services | `partial` | Main class management view is now much closer to the reference, but multiple teacher references remain partially collapsed. |

## Admin
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `admin_dashboard_overview` | `/admin` | `frontend/src/pages/admin/AdminDashboard.tsx` | admin services | `partial` | Overview shell and summary tiles now follow the reference more closely, but unsupported admin domains are still intentionally removed. |
| `admin_user_management` | `/admin/users` | `frontend/src/pages/admin/UserManagement.tsx` | user admin services | `partial` | Functional table exists, but not yet converted into the reference layout. |
| `admin_problem_management` | `/admin/problems` | `frontend/src/pages/admin/ProblemManagement.tsx` | problem admin services | `partial` | Layout is now much closer to the reference, but the delivered scope remains read-only because real admin CRUD endpoints are still absent. |
| `problem_content_configuration` | `/admin/problem-content` | `frontend/src/pages/admin/ProblemContentConfig.tsx` | admin content services | `partial` | Editing shell now follows the reference much more closely, but only the live backend-supported problem fields are exposed. |
| `test_data_&_judge_settings` | `/admin/judge-settings` | `frontend/src/pages/admin/JudgeSettings.tsx` | judge settings services | `partial` | Test-data shell now follows the reference structure, but advanced judge runtime options remain intentionally out of scope. |
| `code_similarity_scan_config` | `/admin/similarity-scan` | `frontend/src/pages/admin/SimilarityScanConfig.tsx` | plagiarism service | `partial` | Config page now matches the reference hierarchy more closely, but scan scope still stops at current real API parameters. |

## Plagiarism Reports
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `plagiarism_detection_report_1` | `/admin/plagiarism-reports/:reportId` | `frontend/src/pages/admin/PlagiarismReportDetail.tsx` | plagiarism service | `partial` | One detail view exists, but not yet parameterized to represent the report variants from references. |
| `plagiarism_detection_report_2` | same as above | same as above | same as above | `partial` | Variant-specific layout not yet represented. |
| `plagiarism_detection_report_3` | same as above | same as above | same as above | `partial` | Variant-specific layout not yet represented. |
| `plagiarism_detection_report_4` | same as above | same as above | same as above | `partial` | Variant-specific layout not yet represented. |
| `plagiarism_detection_report_5` | same as above | same as above | same as above | `partial` | Variant-specific layout not yet represented. |

## Execution Order
1. User core pages: dashboard, problem repository, IDE, submission history, submission detail.
2. Admin core pages: overview, users, problems, judge settings, problem content, similarity config, plagiarism reports.
3. Teacher and community pages: class flows, blog feed/editor, direct messages, ranking/profile/settings.

## Rule For Completion
A page only moves from `partial` to `matched` when all three conditions are true:
1. Its route is wired to real data or a controlled empty state.
2. Its layout and visual hierarchy clearly match the corresponding reference template.
3. Its main interactions are covered by smoke verification.
