# Codex 协作指引

## 窗格位置
- Codex: 窗格1
- Claude: 窗格2

## 发送消息给Claude
```bash
tmux send-keys -t online-judge:1.2 "消息内容" C-m
```

## 读取Claude留言
```bash
cat .claude/collaboration/shared/to_codex.md
```

## 更新任务
编辑 `.claude/collaboration/shared/tasks.md`

## 给Claude留言
编辑 `.claude/collaboration/shared/to_claude.md`，然后通知Claude "read to_claude"

## 通知消息格式
- "read tasks" - 读取任务列表
- "read to_claude" / "read to_codex" - 读取留言
- "done: 任务名" - 通知任务完成
