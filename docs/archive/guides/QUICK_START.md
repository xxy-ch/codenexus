# 🚀 Online Judge 快速启动指南

## ⚡ 5分钟快速部署

### 前端部署（最简单，推荐）

```bash
# 1. 进入项目目录
cd Online_Judge

# 2. 启动前端（使用Mock数据）
./deploy.sh frontend

# 3. 访问应用
# 前端: http://localhost:5173
```

**前端特点：**
- ✅ 完整的用户界面和功能
- ✅ 使用Mock数据，无需后端
- ✅ 可以体验所有功能
- ✅ 适合演示和UI测试

### 完整部署（包含后端）

```bash
# 1. 启动数据库服务
docker compose up -d postgres redis

# 2. 初始化数据库
cd api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/online_judge"
./init_db.sh

# 3. 启动后端API
cd ..
export JWT_SECRET="your-secret-key-here"
cargo run --bin api

# 4. 新终端启动前端
cd frontend
npm install
npm run dev
```

**完整部署特点：**
- ✅ 真实的数据库持久化
- ✅ 完整的用户认证系统
- ✅ 题目提交和判题
- ✅ 所有功能正常工作

## 📋 预置账号

### 测试账号（密码都是: admin123）

**管理员账号:**
- Email: admin@example.com
- 密码: admin123
- 权限: 管理员

**普通用户:**
- Email: user@example.com
- 密码: admin123
- 权限: 普通用户

**教师账号:**
- Email: teacher@example.com
- 密码: admin123
- 权限: 教师

## 🎯 核心功能

### 1. 题目系统
- 浏览题目列表（支持搜索、筛选、分页）
- 查看题目详情
- 在IDE中编写代码
- 提交代码并查看结果

### 2. 提交系统
- 提交历史记录
- 实时状态更新
- 详细的测试用例结果
- 支持多种编程语言

### 3. 竞赛系统
- 浏览即将开始的竞赛
- 查看竞赛详情和倒计时
- 注册参加竞赛
- 查看竞赛排名

### 4. 社区功能
- 讨论区浏览和发帖
- 博客文章阅读
- 评论和互动

### 5. 用户系统
- 个人资料管理
- 设置页面
- 提交统计
- 排行榜查看

## 🔧 技术栈

**前端:**
- React 18 + TypeScript
- Vite 7
- TailwindCSS 3
- Monaco Editor
- Recharts (图表)

**后端:**
- Rust + Axum框架
- PostgreSQL数据库
- Redis缓存
- JWT认证

**基础设施:**
- Docker容器化
- Docker Compose编排

## 📝 Docker命令

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f [service]

# 停止服务
docker compose down

# 完全清理（包括数据）
docker compose down -v

# 重新构建并启动
docker compose up -d --build
```

## 🌐 API端点

### 公开端点（无需认证）
- `GET /health` - 健康检查
- `GET /status` - 系统状态
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新Token

### 需要认证的端点
- `GET /users/me` - 获取当前用户信息
- `PATCH /users/me` - 更新用户信息
- `GET /problems` - 获取题目列表
- `GET /problems/:id` - 获取题目详情
- `POST /submissions` - 提交代码
- `GET /submissions` - 获取提交列表

## 🛠️ 开发模式

### 前端开发
```bash
cd frontend
npm install
npm run dev     # 开发服务器
npm run build   # 构建生产版本
npm run test    # 运行测试
```

### 后端开发
```bash
cd api
cargo run --bin api          # 运行API
cargo test                   # 运行测试
cargo check                  # 检查代码
cargo build --release        # 构建生产版本
```

### 数据库操作
```bash
cd api
# 初始化数据库
export DATABASE_URL="your_connection_string"
./init_db.sh

# 或者手动运行SQL
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_sample_data.sql
```

## 📊 示例数据

初始化后的示例数据包括：
- 3个用户（admin, user, teacher）
- 4道题目（简单到困难）
- 2个竞赛
- 2个讨论帖
- 3篇博客文章
- 相关的测试用例和评论

## 🐛 常见问题

### 前端无法连接后端
检查环境变量配置：
```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:3000
VITE_ENABLE_MOCK_DATA=false  # 确保设置为false
```

### 数据库连接失败
确保PostgreSQL服务正在运行：
```bash
docker compose ps postgres
# 或者检查端口
lsof -i :5432
```

### 端口冲突
修改docker-compose.yml中的端口映射：
```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # 改为其他端口
```

## 🎓 下一步

1. **开始使用**: 前端部署最简单，立即体验
2. **完整部署**: 按照完整部署步骤设置后端
3. **自定义开发**: 根据需要修改和扩展功能
4. **生产部署**: 参考生产部署指南进行优化

## 📚 相关文档

- [完整部署文档](./DEPLOYMENT_STATUS.md)
- [项目完成报告](./PROJECT_COMPLETION_REPORT.md)
- [README](./README.md)

---

## 🎉 现在就开始使用Online Judge吧！

选择适合您的部署方式，立即体验这个功能完整的在线判题系统！

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
