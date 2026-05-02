# monitor-server

独立的 Axum HTTP 服务，为 CodeNexus Online Judge 提供实时监控数据收集、控制平面信号管理和审计日志。

完全独立于 `domain-*`、`api-infra`、`judge-worker`、`llm-worker` 等 crate，仅通过 Redis 和 PostgreSQL 进行集成。

## 启动

```bash
# 从仓库根目录
cargo run -p monitor-server

# 或直接
cd backend/monitor-server && cargo run
```

无 CLI 参数，所有配置通过环境变量。

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | ✅ | — | PostgreSQL 连接字符串 |
| `REDIS_URL` | ❌ | `redis://127.0.0.1:6379` | Redis 连接字符串 |
| `MONITOR_BIND_ADDR` | ❌ | `0.0.0.0:9090` | HTTP 监听地址 |
| `PUSH_INTERVAL_SECS` | ❌ | `5` | WebSocket 快照推送间隔（秒） |
| `SIGNAL_TIMEOUT_SECS` | ❌ | `1800` | 控制信号超时时间（秒） |
| `RECOVERY_SCAN_INTERVAL_SECS` | ❌ | `60` | 自动恢复扫描间隔（秒） |

## API 端点

### REST

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/services` | 完整监控快照（所有服务状态 + 指标 + 控制信号） |
| `GET` | `/api/services/{target}` | 单个服务的状态 |
| `POST` | `/api/control/services/{target}/{action}` | 创建控制信号（action: pause/resume/restart），需 JSON body `{"operator":"..."}` |
| `POST` | `/api/control/services/{target}/{action}/confirm` | 确认待执行信号，需 JSON body `{"confirmation_token":"..."}` |
| `GET` | `/api/control/services/{target}/status` | 查看指定目标的当前信号状态 |
| `GET` | `/api/audit` | 审计日志（支持 `?target=` 筛选） |

### WebSocket

| 路径 | 说明 |
|------|------|
| `ws://.../ws/monitor` | 实时监控快照推送，每 `PUSH_INTERVAL_SECS` 秒广播 JSON `MonitorSnapshot` |

WebSocket 使用 `tokio::sync::broadcast` channel（容量 8），慢消费者跳过到最新快照。

## 控制信号机制

1. **创建信号**：`POST /api/control/services/{target}/{action}` → 写入 Redis `control:signal:{target}`，返回 `confirmation_token`
2. **两步确认**：`POST .../confirm` 使用 token 确认信号，目标服务才执行
3. **自动恢复**：后台任务定期扫描过期信号（> `SIGNAL_TIMEOUT_SECS`），清理并记录审计日志
4. **允许的目标**：`api`、`judge-worker`、`llm-worker`、`domain-analysis`、`monitor`

## 监控数据维度

1. **服务状态** — Worker 心跳、健康指标、断路器状态（来自 Redis + DB）
2. **Stream 积压** — Redis Stream 消费者组积压深度
3. **AI 分析指标** — 分析任务统计
4. **功能开关** — 当前功能开关状态

## 与其他服务的交互

- **Redis**：读取 worker 心跳、stream 积压数据；写入/读取控制信号 `control:signal:{target}`
- **PostgreSQL**：读取分析指标、功能开关；写入审计日志（append-only `audit_log` 表）

## 测试

```bash
cargo test -p monitor-server
```

集成测试位于 `backend/monitor-server/tests/integration.rs`，使用 mock Redis 连接。
