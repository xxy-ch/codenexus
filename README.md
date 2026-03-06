<!-- CI/CD Badges -->
[![CI Pipeline](https://github.com/YOUR_USERNAME/online-judge/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/online-judge/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/online-judge/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/online-judge)
[![Docker Hub](https://img.shields.io/docker/pulls/online-judge/api)](https://hub.docker.com/r/online-judge/api)


# Online Judge - 在线判题系统

一个功能完整的在线编程判题系统，支持多语言、实时判题、竞赛和社区功能。

## 📌 文档导航（2026-03-06）

- 当前状态基线（唯一入口）：`docs/PROJECT_BASELINE_2026-03-06.md`
- 执行计划（按需求驱动）：`docs/IMPLEMENTATION_PLAN_BY_REQUIREMENT_2026-03-06.md`
- References 驱动网页与交付计划：`docs/REFERENCE_DRIVEN_WEB_PLAN_2026-03-06.md`
- 交付执行 Backlog（按天 + 文件级）：`docs/DELIVERY_EXECUTION_BACKLOG_2026-03-06.md`
- 历史记录（仅供参考）：`TODO.md`、`DEPLOYMENT_STATUS.md`、`PHASE*_*.md`、`*_REPORT.md`

## 🎯 项目特性

### 核心功能
- ✅ **多语言支持**: Python, Java, C++, C, Go, Rust, JavaScript, TypeScript, Ruby, PHP
- ✅ **实时判题**: 基于沙箱的安全代码执行环境
- ✅ **题目管理**: 支持不同难度和可见性设置的题库系统
- ✅ **竞赛系统**: 创建和管理编程竞赛
- ✅ **社区功能**: 讨论区和博客系统
- ✅ **用户系统**: 完整的认证、权限管理和个人资料

### 技术特点
- 🚀 **现代化前端**: React 18 + TypeScript + Vite + TailwindCSS
- ⚡ **高性能后端**: Rust + Axum + PostgreSQL + Redis
- 🔒 **安全沙箱**: 基于Docker和cgroups的代码隔离
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 🎨 **深色模式**: 全站主题支持
- 📊 **数据可视化**: 用户统计和进度跟踪

## 📁 项目结构

```
Online_Judge/
├── api/                    # Rust后端API服务
│   ├── src/
│   │   ├── main.rs        # API入口
│   │   ├── auth/          # 认证模块
│   │   ├── users/         # 用户管理
│   │   ├── problems/      # 题目管理
│   │   ├── submissions/   # 提交管理
│   │   ├── contests/      # 竞赛管理
│   │   ├── middleware/    # 中间件
│   │   └── db/            # 数据库模块
│   ├── migrations/        # 数据库迁移文件
│   └── Cargo.toml
├── frontend/              # React前端应用
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # UI组件
│   │   ├── services/     # API服务
│   │   ├── store/        # 状态管理
│   │   ├── hooks/        # 自定义Hooks
│   │   └── lib/          # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── judge-worker/         # 判题工作器
│   ├── src/
│   │   ├── processor/    # 代码处理器
│   │   ├── sandbox/      # 沙箱环境
│   │   ├── compiler/     # 编译器支持
│   │   └── queue/        # 任务队列
│   └── Cargo.toml
└── docker-compose.yml    # Docker编排配置
```

## 🚀 快速开始

### ⚡ **推荐：前端快速部署 (使用Mock数据)**

```bash
# 克隆项目
git clone <repository-url>
cd Online_Judge

# 使用部署脚本启动前端 (含PostgreSQL和Redis)
./deploy.sh frontend

# 或者手动启动
docker compose up -d postgres redis frontend

# 访问应用
# 前端: http://localhost:5173
# 所有功能使用Mock数据，无需后端即可完整体验
```

**这是最快的部署方式，可以立即体验完整的前端功能！**

### 🔧 **完整部署 (需要后端修复)**

```bash
# 完整部署所有服务
./deploy.sh full

# 或者手动启动
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

**注意**: 完整部署需要先修复后端API编译错误，详见 [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md)

### 前置要求

- Docker 和 Docker Compose
- Node.js 18+ 和 npm (仅本地开发需要)
- Rust 和 Cargo (仅后端开发需要)

### 初始化数据库

```bash
# 进入API容器
docker compose exec api bash

# 运行数据库迁移
sqlx database create
sqlx migrate run

# 退出容器
exit
```

### 访问应用

- **前端**: http://localhost:5173
- **API**: http://localhost:3000
- **API健康检查**: http://localhost:3000/health

### 部署脚本使用

项目提供了便捷的部署脚本：

```bash
# 前端部署 (推荐，使用Mock数据)
./deploy.sh frontend

# 完整部署
./deploy.sh full

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 停止服务
./deploy.sh stop

# 清理所有数据
./deploy.sh clean
```

详见 [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) 获取详细的部署状态和指南。

## 🛠️ 开发模式

### 本地开发

如果您希望单独运行各个组件进行开发：

#### 1. 启动基础服务

```bash
# 只启动PostgreSQL和Redis
docker compose up -d postgres redis
```

#### 2. 运行API服务

```bash
cd api

# 设置环境变量
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/online_judge"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-development-secret"

# 运行API
cargo run

# 或者运行测试
cargo test
```

#### 3. 运行前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或者构建生产版本
npm run build
npm run preview
```

#### 4. 运行判题器

```bash
cd judge-worker

# 设置环境变量
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/online_judge"
export REDIS_URL="redis://localhost:6379"

# 运行判题器
cargo run
```

## 🔧 配置说明

### 环境变量

#### API (.env)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
API_BIND_ADDRESS=0.0.0.0:3000
RUST_LOG=api=debug,tower_http=debug,axum=trace
```

#### 前端 (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3000
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_WEBSOCKET=false
```

### 数据库配置

PostgreSQL连接信息：
- **Host**: localhost:5432
- **Database**: online_judge
- **User**: postgres
- **Password**: postgres

### Redis配置

- **Host**: localhost:6379
- **无需密码** (开发环境)

## 📚 API文档

### 认证端点

#### 注册
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "organization_id": 1,
  "campus_id": null
}
```

#### 登录
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 刷新Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "your-refresh-token"
}
```

### 提交端点

#### 创建提交
```http
POST /submissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "problem_id": 1,
  "code": "print('Hello, World!')",
  "language": "python"
}
```

#### 获取提交列表
```http
GET /submissions?problem_id=1&status=accepted&limit=20&offset=0
Authorization: Bearer <token>
```

#### 获取提交详情
```http
GET /submissions/:id
Authorization: Bearer <token>
```

### 管理端点

#### 获取统计数据
```http
GET /admin/stats
Authorization: Bearer <admin-token>
```

#### 用户管理
```http
GET /admin/users
Authorization: Bearer <admin-token>
```

## 🧪 测试

### 后端测试

```bash
cd api

# 运行所有测试
cargo test

# 运行特定测试
cargo test test_login

# 显示测试输出
cargo test -- --nocapture
```

### 前端测试

```bash
cd frontend

# 运行单元测试
npm run test

# 运行E2E测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

## 📦 部署

### Docker部署

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 停止服务
docker compose down

# 完全清理（包括数据）
docker compose down -v
```

### 生产环境配置

1. **更新环境变量**
   - 设置强密码和JWT密钥
   - 配置生产数据库连接
   - 启用HTTPS

2. **数据库优化**
   - 调整连接池大小
   - 配置备份策略
   - 启用查询缓存

3. **安全设置**
   - 配置CORS策略
   - 启用速率限制
   - 设置防火墙规则

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 LICENSE 文件。

## 👥 团队

- **开发团队**: Online Judge Team
- **技术栈**: React + TypeScript + Rust + PostgreSQL + Redis

## 📞 联系方式

- **项目主页**: [GitHub Repository]
- **问题反馈**: [Issues]
- **讨论区**: [Discussions]

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

**注意**: 本项目仅用于学习和研究目的。请勿用于非法用途。
