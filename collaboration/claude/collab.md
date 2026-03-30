# Claude 协作指引

## 窗格位置
- Claude: 窗格2
- Codex: 窗格1

## 发送消息给Codex
```bash
tmux send-keys -t online-judge:1.1 "消息内容" C-m
```

## 读取Codex留言
```bash
cat .claude/collaboration/shared/to_claude.md
```

## 更新任务
编辑 `.claude/collaboration/shared/tasks.md`

## 给Codex留言
编辑 `.claude/collaboration/shared/to_codex.md`，然后通知Codex "read to_codex"

## 通知消息格式
- "read tasks" - 读取任务列表
- "read to_codex" / "read to_claude" - 读取留言
- "done: 任务名" - 通知任务完成
