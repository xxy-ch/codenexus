# 🚀 Online Judge 快速启动指南

## 📋 项目概览

Online Judge - 功能完整的在线判题系统,支持实时通信和完整的教学功能。

**项目状态**: ✅ 生产就绪
**最新版本**: Phase 8 完成
**最后更新**: 2026-02-21

---

## ⚡ 5分钟快速启动

### 方式1: 前端演示模式 (最快)

```bash
# 1. 启动前端
cd frontend
npm install
npm run dev

# 2. 访问应用
open http://localhost:5173

# 使用预置账号登录:
# Email: user@example.com  Password: admin123
```

### 方式2: 完整系统 (推荐)

#### 前置要求
- PostgreSQL 16
- Rust 1.75+
- Node.js 18+
- (可选) Docker

#### 启动步骤

1. **数据库准备**
```bash
# 创建数据库
createdb online_judge

# 或使用Docker
docker run -d \
  --name oj-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=online_judge \
  -p 5432:5432 \
  postgres:16
```

2. **运行迁移**
```bash
cd api
./init_db.sh
```

3. **启动后端**
```bash
cd api
export DATABASE_URL="postgresql://postgres:postgres@localhost/online_judge"
export JWT_SECRET="your-secret-key-change-in-production"
export REDIS_URL="redis://localhost:6379"  # 可选
cargo run
```

4. **启动前端**
```bash
cd frontend
npm run dev
```

5. **访问应用**
- 前端: http://localhost:5173
- API: http://localhost:3000
- 健康检查: http://localhost:3000/health

---

## 🎯 核心功能

### 用户端功能

1. **题目系统**
   - 📝 题目浏览和搜索
   - 💻 在线IDE (Monaco Editor)
   - 🚀 实时判题结果
   - 📊 提交历史

2. **竞赛系统**
   - 🏆 竞赛列表和详情
   - 📈 实时排名
   - ⏱️ 倒计时
   - 📝 竞赛注册

3. **学习功能**
   - 📊 个人统计
   - 📈 排行榜
   - 💬 讨论区
   - 📚 博客文章

### 管理端功能

1. **题目管理**
   - 创建和编辑题目
   - 测试用例管理
   - 难度设置

2. **用户管理**
   - 用户列表
   - 权限管理
   - 统计分析

3. **系统监控**
   - 系统状态
   - 提交统计
   - 性能指标

---

## 📡 实时功能 (Phase 8 新增)

### WebSocket功能

启用后,以下功能将实时更新:

- ✅ **判题结果** - 提交后自动显示状态
- ✅ **竞赛排名** - 实时更新排行榜
- ✅ **用户通知** - 即时消息推送
- ✅ **题目统计** - 实时通过率

### 验证实时功能

1. 登录系统
2. 进入任意题目
3. 点击 "Solve Problem"
4. 编写代码并提交
5. 观察右上角连接状态 (绿点 = 已连接)
6. 查看实时状态更新

---

## 🔧 配置说明

### 环境变量

#### 后端 (.env)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost/online_judge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
API_BIND_ADDRESS=0.0.0.0:3000
RUST_LOG=api=debug,tower_http=debug
```

#### 前端 (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3000
VITE_ENABLE_MOCK_DATA=false        # false=真实API, true=模拟数据
VITE_ENABLE_WEBSOCKET=true          # true=启用实时功能
```

### 切换Mock/真实数据

```bash
# 使用Mock数据 (演示模式)
VITE_ENABLE_MOCK_DATA=true

# 使用真实API (生产模式)
VITE_ENABLE_MOCK_DATA=false
```

---

## 🧪 测试

### 运行测试脚本

```bash
./test_api.sh
```

测试内容:
- ✅ 健康检查
- ✅ 用户认证
- ✅ 题目API
- ✅ 竞赛API
- ✅ 排行榜API
- ✅ WebSocket端点

### 手动测试WebSocket

```javascript
// 在浏览器控制台执行
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('✅ Connected!');

  // 发送认证消息
  ws.send(JSON.stringify({
    type: 'ChatMessage',
    data: {
      id: crypto.randomUUID(),
      contest_id: 0,
      user_id: 'your-user-id',
      username: 'your-username',
      message: '',
      timestamp: new Date().toISOString()
    }
  }));
};

ws.onmessage = (e) => {
  console.log('📨 Received:', JSON.parse(e.data));
};
```

---

## 📚 功能模块详解

### Phase 1: 判题系统 ✅
- 核心判题逻辑
- 多语言支持
- 沙箱执行

### Phase 2: 竞赛系统 ✅
- 竞赛管理
- 实时排名
- 竞赛注册

### Phase 3: Judge Worker ✅
- 代码执行
- 测试用例验证
- 结果计算

### Phase 4: RBAC权限 ✅
- 角色管理
- 权限检查
- 中间件

### Phase 5: 题目管理 ✅
- 题目CRUD
- 测试用例
- 难度分类

### Phase 6: 排行榜 ✅
- 全球排名
- 题目排名
- 统计分析

### Phase 7: 班级作业 ✅
- 班级管理
- 作业系统
- 学生追踪

### Phase 8: WebSocket ✅
- 实时通信
- 消息推送
- 自动重连

---

## 🐛 常见问题

### 1. 后端无法启动

**问题**: `cargo run` 失败

**解决方案**:
```bash
# 检查数据库连接
psql -h localhost -U postgres -d online_judge

# 检查环境变量
echo $DATABASE_URL
echo $JWT_SECRET

# 查看详细日志
RUST_LOG=debug cargo run
```

### 2. WebSocket连接失败

**问题**: 前端显示 "Connecting..." 但不变成绿色

**解决方案**:
```bash
# 检查后端是否运行
curl http://localhost:3000/health

# 检查WebSocket URL
echo $VITE_WS_BASE_URL

# 查看浏览器控制台
# 应该看到 [WebSocket] 日志
```

### 3. 前端编译错误

**问题**: TypeScript错误

**解决方案**:
```bash
# 清理并重新安装
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 4. 提交后没有实时更新

**问题**: 提交代码后状态不变

**检查清单**:
- [ ] 后端API正在运行
- [ ] WebSocket连接正常 (绿点)
- [ ] 浏览器控制台有日志
- [ ] 环境变量正确配置
- [ ] 没有启用Mock数据

---

## 📊 性能优化建议

### 后端优化

1. **数据库连接池**
```rust
// api/src/db.rs
pool.max_size(20)  // 增加连接池大小
```

2. **Redis缓存**
```bash
# 启用Redis
export REDIS_URL="redis://localhost:6379"
```

3. **编译优化**
```bash
cargo build --release
```

### 前端优化

1. **代码分割** - 已配置
2. **懒加载** - 已实现
3. **CDN** - 建议生产环境使用

---

## 🚢 生产部署

### Docker部署 (推荐)

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 手动部署

详见 `DEPLOYMENT_STATUS.md`

---

## 📖 文档索引

| 文档 | 说明 |
|------|------|
| README.md | 项目概述 |
| QUICK_GUIDE.md | 本文档 - 快速启动 |
| FRONTEND_INTEGRATION_PLAN.md | 前端整合计划 |
| WEBSOCKET_INTEGRATION.md | WebSocket集成指南 |
| COMPREHENSIVE_TEST_REPORT.md | 完整测试报告 |
| PHASE8_COMPLETE.md | Phase 8完成报告 |
| DEPLOYMENT_STATUS.md | 部署指南 |

---

## 🎓 使用示例

### 用户提交流程

```bash
# 1. 登录
Email: user@example.com
Password: admin123

# 2. 选择题目
点击 "Problems" → 选择任意题目

# 3. 编写代码
点击 "Solve Problem" → 编写代码

# 4. 提交
点击 "Submit" → 观察实时更新

# 5. 查看结果
- 状态自动更新 (pending → running → accepted)
- 运行时间和内存显示
- Toast通知结果
```

### 管理员创建题目

```bash
# 1. 登录管理员账号
Email: admin@example.com
Password: admin123

# 2. 进入管理后台
点击 "Admin" → "Problems"

# 3. 创建题目
填写题目信息
添加测试用例
设置难度和分值

# 4. 发布
点击 "Publish"
```

---

## 🎉 开始使用

现在您已经了解了所有信息,可以开始使用Online Judge了!

### 推荐流程

1. **快速体验** - 使用前端演示模式
2. **完整功能** - 启动完整系统
3. **测试功能** - 运行测试脚本
4. **查看文档** - 阅读详细文档
5. **开始使用** - 创建账号开始刷题

### 获取帮助

- 📖 查看文档目录
- 🐛 提交Issue
- 💬 查看讨论区

---

**祝您使用愉快!** 🚀

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering)
Date: 2026-02-21
