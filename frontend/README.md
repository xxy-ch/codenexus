# Online Judge Frontend

前端应用基于 Vite + React 18 + TypeScript 构建，集成了Gemini设计的30个高质量界面。

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- 后端API服务运行在 http://localhost:3000

### 安装依赖

```bash
npm install
```

### 环境配置

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── components/         # 组件
│   │   ├── ui/            # 基础UI组件
│   │   ├── layout/        # 布局组件
│   │   └── auth/          # 认证组件
│   ├── pages/             # 页面
│   │   ├── auth/          # 认证页面
│   │   ├── user/          # 用户页面
│   │   ├── teacher/       # 教师页面
│   │   └── admin/         # 管理员页面
│   ├── layouts/           # 页面布局
│   ├── hooks/             # 自定义Hooks
│   ├── services/          # API服务
│   ├── store/             # 状态管理
│   ├── types/             # TypeScript类型
│   ├── lib/               # 工具库
│   └── utils/             # 工具函数
├── public/                # 静态资源
└── index.html             # HTML入口
```

## 🎨 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 7
- **样式**: TailwindCSS 3
- **路由**: React Router v6
- **状态管理**: Zustand
- **数据获取**: React Query
- **UI组件**: Material-UI + 自定义组件
- **图标**: Material Symbols
- **表单**: React Hook Form + Zod
- **HTTP客户端**: Axios

## 🔐 认证功能 (P0已完成)

### ✅ 已实现功能

- ✅ 用户登录 (`/login`)
- ✅ 用户注册 (`/register`)
- ✅ 路由保护 (ProtectedRoute)
- ✅ 认证状态管理 (Zustand)
- ✅ JWT令牌管理
- ✅ 自动令牌刷新
- ✅ 用户登出
- ✅ 访问控制

### 使用示例

```typescript
// 使用认证Hook
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()

  if (!isAuthenticated) {
    return <div>Please login</div>
  }

  return (
    <div>
      <p>Welcome, {user?.username}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### 路由保护

```typescript
// 保护需要认证的路由
<Route path="/" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

// 保护特定角色的路由
<Route path="/admin" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminPanel />
  </ProtectedRoute>
} />
```

## 🎯 已实现界面

### 当前可用界面
- ✅ 登录页面 (`/login`)
- ✅ 注册页面 (`/register`)
- ✅ 未授权页面 (`/403`)

- ✅ 主仪表板 (`/`)
- ✅ 题库 (`/problems`)
- ✅ 题目详情与提交 (`/problems/:id`)
- ✅ 在线 IDE (`/ide`)
- ✅ 提交记录 (`/submissions`)
- ✅ 排行榜 (`/rankings`)
- ✅ 讨论区 (`/discussions`)
- ✅ 竞赛列表与详情 (`/contests`, `/contests/:id`)
- ✅ 管理面板 (`/admin`)
- ✅ 侧边栏导航
- ✅ 顶部导航栏
- ✅ 主布局系统

## 当前范围说明

本轮前端已收敛为精简版 Online Judge 工作台。博客、站内消息、教师工具、搜索页、抄袭报告等旧页面当前不在交付范围内，相关契约与 smoke 用例已同步移除，避免文档和验证面继续漂移。

## 🛠️ 开发指南

### 添加新页面

1. 在 `src/pages/` 对应目录下创建页面组件
2. 在 `src/App.tsx` 中添加路由
3. 如需认证，使用 `ProtectedRoute` 包裹

```typescript
// src/pages/user/MyPage.tsx
export function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  )
}

// src/App.tsx
<Route path="my-page" element={
  <ProtectedRoute>
    <MyPage />
  </ProtectedRoute>
} />
```

### 添加API服务

```typescript
// src/services/myService.ts
import api from './api'

export const myService = {
  async getData() {
    const response = await api.get('/api/endpoint')
    return response.data
  }
}
```

### 添加状态管理

```typescript
// src/store/myStore.ts
import { create } from 'zustand'

interface MyState {
  data: any[]
  fetchData: () => Promise<void>
}

export const useMyStore = create<MyState>((set) => ({
  data: [],
  fetchData: async () => {
    const data = await myService.getData()
    set({ data })
  }
}))
```

## 🐛 调试

### 查看网络请求
打开浏览器开发者工具 -> Network 标签，所有API请求都会显示。

### 查看状态
使用 React DevTools 或在组件中 console.log 状态：

```typescript
const { user, isAuthenticated } = useAuth()
console.log('User:', user, 'Auth:', isAuthenticated)
```

### 热更新
Vite 支持热更新，修改代码后会自动刷新页面。

## 📝 注意事项

1. **API代理**: 开发环境下，`/api` 请求会被代理到后端服务器
2. **认证令牌**: 令牌存储在 localStorage 中，名为 `token`
3. **类型安全**: 使用TypeScript确保类型安全
4. **样式一致性**: 使用TailwindCSS工具类保持样式一致
5. **错误处理**: 使用try-catch处理异步错误

## 🔗 相关链接

- [Vite文档](https://vitejs.dev/)
- [React文档](https://react.dev/)
- [TailwindCSS文档](https://tailwindcss.com/)
- [React Router文档](https://reactrouter.com/)
- [Zustand文档](https://zustand-demo.pmnd.rs/)

## 📄 许可证

Private License
