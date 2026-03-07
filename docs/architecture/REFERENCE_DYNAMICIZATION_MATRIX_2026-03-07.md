# Reference Dynamicization Matrix - 2026-03-07

## Status Legend
- `matched`: route and page exist, and visual structure is substantially aligned with the reference template.
- `partial`: route and dynamic data exist, but layout/visual hierarchy is not yet a faithful reference conversion.
- `missing`: no clear route/page mapping, or multiple references are still collapsed into a generic page.

## User Experience
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `modular_homepage_dashboard_1` | `/dashboard` | `frontend/src/pages/user/DashboardEnhanced.tsx` | `usersService.getUserStats/getUserActivity/getRecommendedProblems` | `partial` | Dashboard now includes a stronger operations rail, progress snapshot, and smoke-covered summary blocks; remaining gap is finer reference choreography and denser secondary modules. |
| `modular_homepage_dashboard_2` | `/dashboard` | `frontend/src/pages/user/DashboardEnhanced.tsx` | same as above | `partial` | Secondary dashboard reference is now partially merged via progress/weekly summary panels, but the full alternate information architecture is still not explicitly separated. |
| `problem_repository` | `/problems` | `frontend/src/pages/user/ProblemSet.tsx` | `problemsService.getProblems` | `matched` | Real data, reference-style repository shell, and smoke verification are all in place for the delivered scope. |
| `problem_solving_ide` | `/problems/:problemId/solve` | `frontend/src/pages/user/ProblemIDEEnhanced.tsx` | `problemsService.getProblem/submitCode`, websocket updates | `matched` | Real IDE flow, repaired runtime shell, and smoke verification are in place for the delivered docked workflow. |
| `submission_history` | `/submissions` | `frontend/src/pages/user/SubmissionHistory.tsx` | `problemsService.getUserSubmissions` | `partial` | Table works, but reference header, summary cards, and filter hierarchy are not fully implemented. |
| `submission_detail_analysis` | `/submissions/:submissionId` | `frontend/src/pages/user/SubmissionDetail.tsx` | `problemsService.getSubmissionDetail` | `matched` | Delivered analysis layout, real submission data, and smoke verification are all present. |
| `global_user_rankings` | `/ranking` | `frontend/src/pages/user/Ranking.tsx` | `rankingService` | `matched` | Reference-style ranking shell, live leaderboard data, and smoke verification are in place for the delivered interaction scope. |
| `live_contest_scoreboard_board` | `/contests/:contestId/scoreboard` | `frontend/src/pages/contest/ContestScoreboard.tsx` | `scoreboardService.getContestScoreboard` | `matched` | Delivered live scoreboard shell, real ranking data, auto-refresh, and smoke verification are in place. |
| `user_settings_&_profile` | `/profile`, `/settings` | `frontend/src/pages/user/Profile.tsx`, `frontend/src/pages/user/Settings.tsx` | `usersService.getMyProfile/updateMyProfile` | `partial` | Profile and settings now share a unified account-center shell and consistent card language, but they are still split across two routes and lack dedicated smoke coverage for deeper settings actions. |

## Community
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `community_blog_feed` | `/blog` | `frontend/src/pages/community/BlogList.tsx` | blog services | `matched` | Real article data, reference-style feed shell, and smoke verification are present for the delivered blog flow. |
| `blog_article_editor` | `/blog/new`, `/blog/:slug/edit` | `frontend/src/pages/community/CreateArticle.tsx`, `frontend/src/pages/community/EditArticle.tsx` | blog services | `matched` | Real editor flow, stable runtime shell, and smoke verification are present for the delivered editor experience. |
| `direct_messages` | `/messages` | `frontend/src/pages/community/DirectMessages.tsx` | messages service | `matched` | Real message data, reference-style split-pane layout, and smoke verification are in place. |

## Teacher
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `teacher_class_management_1` | `/teacher/classes` or monitoring sub-view | `frontend/src/pages/teacher/ClassManagement.tsx` | class services | `matched` | Live schema replacement flows, reference-style class hub shell, and smoke verification are present for the delivered teacher workflow. |
| `teacher_class_management_2` | `/teacher/contest-wizard` | `frontend/src/pages/teacher/ContestWizard.tsx` | teacher contest services | `partial` | Wizard now follows the multi-step reference structure with real create flow, but later steps still defer to post-create pages. |
| `teacher_class_management_3` | `/teacher/assignment-report` | `frontend/src/pages/teacher/AssignmentReport.tsx` | teacher report services | `partial` | Report now uses reference-style summary cards and tables, but deeper assignment analytics are still limited by live schema. |
| `teacher_class_management_4` | discussion/thread related | `frontend/src/pages/community/DiscussionDetail.tsx` | discussion services | `partial` | Similar domain coverage, but not formally mapped or visually aligned. |
| `teacher_class_management_5` | `/roadmap` | `frontend/src/pages/user/LearningRoadmap.tsx` | roadmap data | `partial` | Functional roadmap exists, but not yet reference-faithful. |
| `teacher_class_management_6` | `/teacher/classes` | `frontend/src/pages/teacher/ClassManagement.tsx` | class services | `matched` | Main class management view now covers the delivered live write flows with a reference-aligned shell and smoke verification. |

## Admin
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `admin_dashboard_overview` | `/admin` | `frontend/src/pages/admin/AdminDashboard.tsx` | admin services | `matched` | Delivered overview shell, real admin entry surface, and smoke verification are in place for the accepted admin control plane. |
| `admin_user_management` | `/admin/users` | `frontend/src/pages/admin/UserManagement.tsx` | user admin services | `matched` | Real operator actions, reference-style admin shell, and smoke verification are present for the delivered user-admin workflow. |
| `admin_problem_management` | `/admin/problems` | `frontend/src/pages/admin/ProblemManagement.tsx` | problem admin services | `matched` | Delivered CRUD flow, reference-style management shell, and smoke verification are present for the accepted admin problem scope. |
| `problem_content_configuration` | `/admin/problem-content` | `frontend/src/pages/admin/ProblemContentConfig.tsx` | admin content services | `partial` | Editing shell now follows the reference much more closely, but only the live backend-supported problem fields are exposed. |
| `test_data_&_judge_settings` | `/admin/judge-settings` | `frontend/src/pages/admin/JudgeSettings.tsx` | judge settings services | `partial` | Test-data shell now follows the reference structure, but advanced judge runtime options remain intentionally out of scope. |
| `code_similarity_scan_config` | `/admin/similarity-scan` | `frontend/src/pages/admin/SimilarityScanConfig.tsx` | plagiarism service | `partial` | Config page now matches the reference hierarchy more closely, but scan scope still stops at current real API parameters. |

## Plagiarism Reports
| Reference | Intended Route | Current Page | Data Source | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| `plagiarism_detection_report_1` | `/admin/plagiarism-reports/:reportId` | `frontend/src/pages/admin/PlagiarismReportDetail.tsx` | plagiarism service | `partial` | Detail page now uses a richer report shell with risk summary, evidence cards, and empty-pair handling; remaining gap is source diff and reviewer workflow. |
| `plagiarism_detection_report_2` | same as above | same as above | same as above | `partial` | Variant tone is now derived from live pair count and risk level, but not all static reference states are fully reproduced. |
| `plagiarism_detection_report_3` | same as above | same as above | same as above | `partial` | Multi-pair layout is now supported, but advanced evidence panes are still absent. |
| `plagiarism_detection_report_4` | same as above | same as above | same as above | `partial` | Low/no-risk empty result state is now represented, but reviewer action surfaces are not implemented. |
| `plagiarism_detection_report_5` | same as above | same as above | same as above | `partial` | Timeline and risk summary are now represented, but source-level comparison remains out of scope. |

## Execution Order
1. User core pages: dashboard, problem repository, IDE, submission history, submission detail.
2. Admin core pages: overview, users, problems, judge settings, problem content, similarity config, plagiarism reports.
3. Teacher and community pages: class flows, blog feed/editor, direct messages, ranking/profile/settings.

## Rule For Completion
A page only moves from `partial` to `matched` when all three conditions are true:
1. Its route is wired to real data or a controlled empty state.
2. Its layout and visual hierarchy clearly match the corresponding reference template.
3. Its main interactions are covered by smoke verification.
