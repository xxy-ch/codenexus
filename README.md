# Online Judge

在线判题系统，当前仓库已收敛为可交付版本，包含：

- React + TypeScript 前端
- Rust + Axum API
- Rust 判题工作器
- PostgreSQL + Redis 基础设施

## 文档入口

正式文档请优先阅读：

1. [项目完整开发与维护手册](/Users/xiexingyu/Documents/项目/Online_Judge/docs/architecture/PROJECT_HANDBOOK_2026-03-07.md)
2. [交付文档集入口](/Users/xiexingyu/Documents/项目/Online_Judge/docs/delivery/DELIVERY_DOCUMENT_SET_2026-03-07.md)
3. [最终交付总结](/Users/xiexingyu/Documents/项目/Online_Judge/FINAL_SUMMARY.md)
4. [发布与回滚 Runbook](/Users/xiexingyu/Documents/项目/Online_Judge/docs/delivery/RELEASE_RUNBOOK_2026-03-06.md)

历史状态文档已退役，不再作为当前状态依据。

## 快速启动

### Docker 全栈

```bash
docker compose up -d --build

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```

访问地址：

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

### 本地开发

```bash
docker compose up -d postgres redis

cd api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
cargo run
```

```bash
cd frontend
npm install
npm run dev
```

```bash
cd judge-worker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
cargo run
```

## 质量门禁

```bash
cargo check -p api
cargo test -p api --no-run

cargo check -p judge-worker
cargo test -p judge-worker --no-run

cd frontend
npm run typecheck --silent
npm run build --silent
npx playwright test e2e/smoke.spec.ts
```

## License

本项目使用 [Private License](/Users/xiexingyu/Documents/项目/Online_Judge/LICENSE)。
