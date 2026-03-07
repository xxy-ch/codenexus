# Online Judge 前端整合计划

> 基于Gemini设计的30个高质量界面的完整整合实施方案
>
> 制定日期: 2025-02-16

## 📊 项目现状分析

### 现有技术栈
- **后端**: Rust + Axum + PostgreSQL + Redis
- **前端**: 目前没有独立的前端项目，只有API后端
- **架构**: 微服务架构（API服务 + 判题Worker）
- **数据库**: PostgreSQL (migrations文件夹已存在)
- **缓存**: Redis (可选配置)

### Gemini设计的界面模块 (30个界面)

#### 用户端界面 (13个)
1. **模块化首页仪表板** - 2个变体设计
2. **题目解决IDE** - 在线代码编辑和执行环境
3. **题目仓库** - 题目浏览和搜索
4. **题目内容配置** - 题目详情和设置
5. **提交详情分析** - 代码提交结果分析
6. **提交历史** - 用户提交记录
7. **全球用户排名** - 排行榜系统
8. **实时竞赛计分板** - 竞赛实时排名
9. **社区博客动态** - 社区内容流
10. **博客文章编辑器** - 富文本编辑
11. **直接消息** - 用户间消息系统
12. **用户设置和个人资料** - 用户配置

#### 教师端界面 (6个)
13. **教师班级管理** - 6个变体设计
    - 班级创建和管理
    - 学生进度追踪
    - 作业分配和收集

#### 管理端界面 (5个)
14. **管理员仪表板概览** - 系统监控
15. **管理员题目管理** - 题目CRUD
16. **管理员用户管理** - 用户管理
17. **测试数据和判题设置** - 测试用例管理
18. **代码相似度扫描配置** - 抄袭检测设置

#### 抄袭检测界面 (5个)
19. **抄袭检测报告** - 5个变体设计
    - 不同可视化形式的抄袭报告

## 🎯 技术栈选择

### 前端技术栈
```json
{
  "framework": "React 18 + TypeScript",
  "buildTool": "Vite 5",
  "styling": "TailwindCSS 3",
  "stateManagement": "Zustand + React Query",
  "routing": "React Router v6",
  "uiComponents": "自定义组件 + Headless UI",
  "icons": "Material Symbols Outlined",
  "editor": "Monaco Editor (VS Code编辑器)",
  "charts": "Recharts / Chart.js",
  "forms": "React Hook Form + Zod",
  "tables": "TanStack Table",
  "notifications": "React Hot Toast",
  "websocket": "Socket.io Client"
}
```

### 后端扩展
```rust
// 需要添加的模块
mod contests;      // 竞赛相关API
mod submissions;   // 提交相关API
mod users;         // 用户相关API
mod ranking;       // 排名相关API
mod community;     // 社区相关API
mod teacher;       // 教师功能API
mod admin;         // 管理功能API
mod plagiarism;    // 抄袭检测API
mod websocket;     // WebSocket支持
```

## 🏗️ 项目结构

### 前端项目结构
```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/           # 通用组件
│   │   ├── ui/              # 基础UI组件
│   │   ├── layout/          # 布局组件
│   │   ├── forms/           # 表单组件
│   │   ├── charts/          # 图表组件
│   │   └── editor/          # 编辑器组件
│   ├── pages/               # 页面组件
│   │   ├── user/            # 用户端页面
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProblemSet.tsx
│   │   │   ├── ProblemIDE.tsx
│   │   │   ├── Submissions.tsx
│   │   │   ├── Contest.tsx
│   │   │   ├── Ranking.tsx
│   │   │   ├── Community.tsx
│   │   │   └── Profile.tsx
│   │   ├── teacher/         # 教师端页面
│   │   │   └── ClassManagement.tsx
│   │   └── admin/           # 管理端页面
│   │       ├── AdminDashboard.tsx
│   │       ├── ProblemManage.tsx
│   │       └── UserManage.tsx
│   ├── layouts/             # 页面布局
│   │   ├── MainLayout.tsx
│   │   ├── UserLayout.tsx
│   │   ├── TeacherLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── hooks/               # 自定义Hooks
│   │   ├── useAuth.ts
│   │   ├── useProblems.ts
│   │   ├── useSubmission.ts
│   │   └── useWebSocket.ts
│   ├── services/            # API服务
│   │   ├── api.ts           # API客户端配置
│   │   ├── auth.ts          # 认证服务
│   │   ├── problems.ts      # 题目服务
│   │   ├── contests.ts      # 竞赛服务
│   │   └── submissions.ts   # 提交服务
│   ├── store/               # 状态管理
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript类型
│   │   ├── auth.ts
│   │   ├── problems.ts
│   │   └── contests.ts
│   ├── utils/               # 工具函数
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── styles/              # 样式文件
│   │   └── globals.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🚀 实施优先级

### P0 - 立即实现 (基础核心功能)

#### 1. 用户认证系统
**目标**: 实现完整的用户认证和授权
**界面**: 登录/注册页面 (基于现有设计风格)
**功能**:
- 用户登录/注册
- JWT令牌管理和刷新
- 权限控制 (用户/教师/管理员)
- 密码重置
- 邮箱验证

**API端点**:
```
POST   /auth/login
POST   /auth/register
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
```

#### 2. 题目系统
**目标**: 核心题目浏览和解决功能
**界面**:
- 题目仓库 (题目列表)
- 题目详情页面
- 题目搜索和筛选

**功能**:
- 题目列表展示 (分页、筛选、排序)
- 题目详情 (描述、输入输出、样例)
- 难度标识 (简单/中等/困难)
- 标签系统 (DP、图论、数学等)
- 收藏题目功能

**API端点**:
```
GET    /problems (列表)
GET    /problems/:id (详情)
GET    /problems/:id/testcases (测试用例)
POST   /problems/:id/submit (提交)
```

#### 3. 在线IDE
**目标**: 提供优质的在线编程体验
**界面**: 题目解决IDE
**功能**:
- Monaco代码编辑器集成
- 多语言支持 (C++, Java, Python, Rust等)
- 代码自动补全
- 语法高亮
- 一键提交
- 实时运行结果

**技术要点**:
```typescript
// Monaco Editor配置
const editorOptions = {
  language: 'cpp', // 根据用户选择动态切换
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false
}
```

### P1 - 近期实现 (核心用户体验)

#### 4. 提交系统
**目标**: 完整的提交历史和结果分析
**界面**:
- 提交历史页面
- 提交详情分析页面

**功能**:
- 提交历史记录
- 实时提交状态
- 详细错误信息
- 测试用例对比
- 代码优化建议
- 时间和内存消耗分析

**API端点**:
```
GET    /submissions (我的提交)
GET    /submissions/:id (提交详情)
GET    /problems/:id/submissions (题目的所有提交)
POST   /submissions/:id/rejudge (重新判题)
```

#### 5. 竞赛系统
**目标**: 实时竞赛体验
**界面**:
- 竞赛列表页面
- 实时计分板
- 竞赛详情页面

**功能**:
- 即将开始的竞赛
- 进行中的竞赛
- 历史竞赛
- 实时排名更新 (WebSocket)
- 竞赛题目
- 倒计时显示

**技术方案**:
```typescript
// WebSocket实时更新
const useContestRanking = (contestId: string) => {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/contests/${contestId}/ranking`);
    ws.onmessage = (event) => {
      setRanking(JSON.parse(event.data));
    };
    return () => ws.close();
  }, [contestId]);

  return ranking;
};
```

#### 6. 用户仪表板
**目标**: 个性化学习体验
**界面**: 模块化首页仪表板
**功能**:
- 个人统计信息 (解题数、排名、评分)
- 学习进度图表
- 每日挑战推荐
- 学习连续天数
- 最近活动记录
- 推荐题目

### P2 - 中期实现 (社区功能)

#### 7. 社区功能
**目标**: 建立学习和交流社区
**界面**:
- 社区博客动态
- 博客文章编辑器
- 讨论区

**功能**:
- 文章发布和编辑
- Markdown支持
- 代码高亮
- 评论系统
- 点赞和收藏
- 标签分类
- 热门文章推荐

#### 8. 消息系统
**目标**: 用户间实时沟通
**界面**: 直接消息页面
**功能**:
- 实时聊天
- 消息历史
- 在线状态
- 未读消息提醒
- 群组聊天

#### 9. 排名系统
**界面**: 全球用户排名
**功能**:
- 全球排名
- 好友排名
- 按国家/地区筛选
- 排名历史趋势
- 评分系统

### P3 - 后期实现 (管理功能)

#### 10. 教师工具
**界面**: 教师班级管理 (6个变体)
**功能**:
- 班级创建和管理
- 学生邀请和管理
- 作业创建和发布
- 学生进度追踪
- 成绩统计和分析
- 代码抄袭检测

#### 11. 管理员功能
**界面**:
- 管理员仪表板概览
- 管理员题目管理
- 管理员用户管理
- 测试数据和判题设置
- 代码相似度扫描配置

**功能**:
- 系统监控仪表板
- 题目审核和管理
- 用户权限管理
- 系统配置
- 数据统计和分析

#### 12. 抄袭检测系统
**界面**: 抄袭检测报告 (5个变体)
**功能**:
- 代码相似度分析
- 可视化对比展示
- 检测报告生成
- 历史记录查询
- 检测规则配置

## 🎨 设计系统

### 色彩系统
```css
/* 基于Gemini设计的一致性色彩 */
:root {
  --primary: #0d59f2;
  --primary-hover: #0a47c9;
  --secondary: #6366f1;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;

  --background-light: #f5f6f8;
  --background-dark: #101622;
  --surface-light: #ffffff;
  --surface-dark: #1e2433;

  --text-primary-light: #1f2937;
  --text-secondary-light: #6b7280;
  --text-primary-dark: #f3f4f6;
  --text-secondary-dark: #9ca3af;
}
```

### 字体系统
```css
/* UI字体 */
font-family: 'Inter', sans-serif;

/* 代码字体 */
font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;

/* 字体大小 */
text-xs: 0.75rem;    /* 12px */
text-sm: 0.875rem;   /* 14px */
text-base: 1rem;     /* 16px */
text-lg: 1.125rem;   /* 18px */
text-xl: 1.25rem;    /* 20px */
text-2xl: 1.5rem;    /* 24px */
```

### 组件库优先级

#### 1. 基础组件 (第一批)
- Button (按钮)
- Input (输入框)
- Select (选择器)
- Checkbox (复选框)
- Radio (单选框)
- Badge (徽章)
- Avatar (头像)

#### 2. 导航组件 (第一批)
- Sidebar (侧边栏)
- Header (顶部导航)
- Breadcrumb (面包屑)
- Tabs (标签页)
- Pagination (分页)

#### 3. 数据展示 (第二批)
- Table (表格)
- Card (卡片)
- StatCard (统计卡片)
- Chart (图表)
- Progress (进度条)
- Timeline (时间线)

#### 4. 反馈组件 (第二批)
- Modal (模态框)
- Drawer (抽屉)
- Toast (提示)
- Loading (加载)
- Empty (空状态)
- ErrorBoundary (错误边界)

#### 5. 编辑器组件 (第三批)
- CodeEditor (代码编辑器)
- RichTextEditor (富文本编辑器)
- MarkdownEditor (Markdown编辑器)

## 🔧 具体实施步骤

### 第一步：项目初始化 (1-2天)
```bash
# 1. 创建前端项目
npm create vite@latest frontend -- --template react-ts

# 2. 安装依赖
cd frontend
npm install

# 3. 安装核心依赖
npm install react-router-dom zustand @tanstack/react-query
npm install axios clsx tailwind-merge

# 4. 安装UI相关依赖
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 5. 安装图标和编辑器
npm install @material-icons/material-icons @monaco-editor/react
npm install recharts

# 6. 安装表单和验证
npm install react-hook-form zod @hookform/resolvers

# 7. 安装WebSocket和其他工具
npm install socket.io-client react-hot-toast
```

### 第二步：配置基础设置 (1天)
```typescript
// vite.config.ts - Vite配置
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})

// tailwind.config.js - Tailwind配置
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0d59f2',
        // ... 其他颜色配置
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      }
    }
  }
}
```

### 第三步：创建布局系统 (2-3天)
```typescript
// src/layouts/MainLayout.tsx - 主布局
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 第四步：实现P0功能 (2-3周)

#### 用户认证
```typescript
// src/services/auth.ts - 认证服务
export const authService = {
  async login(credentials: LoginDTO) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterDTO) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async refreshToken() {
    const response = await api.post('/auth/refresh');
    return response.data;
  }
}

// src/store/authStore.ts - 认证状态管理
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));
```

#### 题目系统
```typescript
// src/pages/user/ProblemSet.tsx - 题目列表
export function ProblemSet() {
  const { data, isLoading } = useProblems();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Problem Set</h1>
        <ProblemFilters />
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <ProblemTable problems={data} />
      )}
    </div>
  );
}
```

#### 在线IDE
```typescript
// src/pages/user/ProblemIDE.tsx - 题目解决IDE
import Editor from '@monaco-editor/react';

export function ProblemIDE() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');

  const handleSubmit = async () => {
    await submitCode({ problemId, code, language });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ProblemDescription />
      <div className="flex-1 flex flex-col">
        <IDEToolbar onLanguageChange={setLanguage} />
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={setCode}
          theme="vs-dark"
        />
        <IDEResult />
      </div>
    </div>
  );
}
```

### 第五步：实现P1功能 (3-4周)

#### 提交系统
```typescript
// src/pages/user/Submissions.tsx - 提交历史
export function Submissions() {
  const { data: submissions } = useSubmissions();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Submission History</h1>

      <div className="space-y-4">
        {submissions?.map(submission => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
          />
        ))}
      </div>
    </div>
  );
}

// src/components/SubmissionCard.tsx - 提交卡片
export function SubmissionCard({ submission }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{submission.problemTitle}</h3>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={submission.status} />
            <span className="text-sm text-gray-500">
              {submission.language}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            {formatTime(submission.createdAt)}
          </div>
          <div className="text-lg font-semibold">
            {submission.runtime}ms
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 竞赛系统
```typescript
// src/pages/user/Contest.tsx - 竞赛页面
export function Contest() {
  const { contest } = useContest();
  const ranking = useContestRanking(contest.id);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <ContestProblems problems={contest.problems} />
      <LiveRanking ranking={ranking} />
    </div>
  );
}

// src/hooks/useWebSocket.ts - WebSocket钩子
export function useWebSocket<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => setData(JSON.parse(event.data));
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, [url]);

  return { data, connected };
}
```

## 📊 后端API扩展计划

### 需要添加的Rust模块

#### 1. 竞赛模块
```rust
// api/src/contests/mod.rs
pub mod routes;
pub mod models;
pub mod service;

#[derive(Serialize)]
pub struct Contest {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub problems: Vec<Problem>,
}

// 路由定义
pub fn contests_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_contests).post(create_contest))
        .route("/:id", get(get_contest).put(update_contest))
        .route("/:id/rankings", get(get_rankings))
        .route("/:id/register", post(register_contest))
}
```

#### 2. 提交模块
```rust
// api/src/submissions/mod.rs
pub mod routes;
pub mod models;
pub mod service;

#[derive(Serialize)]
pub struct Submission {
    pub id: Uuid,
    pub user_id: Uuid,
    pub problem_id: Uuid,
    pub code: String,
    pub language: String,
    pub status: SubmissionStatus,
    pub runtime: Option<i32>,
    pub memory: Option<i32>,
    pub created_at: DateTime<Utc>,
}

pub enum SubmissionStatus {
    Pending,
    Running,
    Accepted,
    WrongAnswer,
    TimeLimitExceeded,
    MemoryLimitExceeded,
    CompilationError,
}
```

#### 3. WebSocket支持
```rust
// api/src/websocket/mod.rs
use axum::extract::{
    ws::{WebSocket, Message},
    WebSocketUpgrade,
};

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    // 处理WebSocket连接
    while let Some(msg) = socket.recv().await {
        match msg {
            Ok(Message::Text(text)) => {
                // 处理接收到的消息
            }
            _ => break,
        }
    }
}
```

#### 4. 抄袭检测模块
```rust
// api/src/plagiarism/mod.rs
use sim::{default_params, diff_files, lcm };

pub async fn check_plagiarism(
    code1: &str,
    code2: &str,
) -> SimilarityResult {
    // 使用代码相似度检测算法
    let params = default_params();
    let similarity = lcm(code1, code2, &params);

    SimilarityResult {
        similarity_score: similarity * 100.0,
        matched_lines: extract_matched_lines(code1, code2),
    }
}
```

### 数据库迁移
```sql
-- 竞赛表
CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 竞赛注册表
CREATE TABLE contest_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID REFERENCES contests(id),
    user_id UUID REFERENCES users(id),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contest_id, user_id)
);

-- 提交表
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    problem_id UUID REFERENCES problems(id),
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    runtime INTEGER,
    memory INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章表
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息表
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 班级表
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎯 里程碑和时间表

### 阶段1: 基础设施 (2周)
- [x] 项目结构搭建
- [x] 开发环境配置
- [x] 基础组件库
- [x] 布局系统
- [x] 路由配置

### 阶段2: 核心功能 (4周)
- [ ] 用户认证系统
- [ ] 题目系统
- [ ] 在线IDE
- [ ] 提交系统

### 阶段3: 高级功能 (3周)
- [ ] 竞赛系统
- [ ] 用户仪表板
- [ ] 排名系统
- [ ] 实时功能

### 阶段4: 社区功能 (2周)
- [ ] 博客系统
- [ ] 消息系统
- [ ] 评论系统

### 阶段5: 管理功能 (2周)
- [ ] 教师工具
- [ ] 管理员仪表板
- [ ] 抄袭检测

### 阶段6: 优化和部署 (1周)
- [ ] 性能优化
- [ ] 测试覆盖
- [ ] 文档完善
- [ ] 部署配置

**总计**: 约14周 (3.5个月)

## 🔐 安全考虑

### 前端安全
```typescript
// XSS防护
import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html);
}

// CSRF防护
const api = axios.create({
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// 内容安全策略
// index.html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

### 认证安全
```typescript
// 令牌刷新机制
const useTokenRefresh = () => {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await authService.refreshToken();
      } catch (error) {
        // 刷新失败，登出用户
        useAuthStore.getState().logout();
      }
    }, 14 * 60 * 1000); // 每14分钟刷新

    return () => clearInterval(interval);
  }, []);
};
```

## 📈 性能优化

### 代码分割
```typescript
// 路由级别的代码分割
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const ProblemIDE = lazy(() => import('./pages/user/ProblemIDE'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/problems/:id" element={<ProblemIDE />} />
      </Routes>
    </Suspense>
  );
}
```

### 缓存策略
```typescript
// React Query缓存配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5分钟内数据视为新鲜
      cacheTime: 10 * 60 * 1000,    // 10分钟后清除缓存
      refetchOnWindowFocus: false,  // 窗口聚焦时不重新获取
    },
  },
});
```

## 🚀 部署配置

### 前端部署
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3001:80"
    depends_on:
      - api

  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=online_judge
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 📝 总结

这个整合计划将Gemini设计的30个高质量界面与现有的Rust后端完美结合，通过以下关键点确保项目成功：

1. **渐进式实现**: 按照P0→P3优先级逐步实现，确保核心功能优先
2. **技术一致性**: 保持与Gemini设计相同的技术栈和设计语言
3. **架构扩展**: 在现有Rust后端基础上添加必要的API和模块
4. **用户体验**: 重点关注在线编程体验和实时功能
5. **可维护性**: 清晰的项目结构和模块化设计
6. **安全性**: 完善的认证授权和内容安全策略
7. **性能优化**: 代码分割、缓存策略和优化配置

通过这个计划，我们将创建一个功能完整、用户体验优秀的在线判题系统前端应用。