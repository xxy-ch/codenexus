# Markdown 编辑器集成 - 快速实现指南

## 📋 目录
1. [技术选型对比](#技术选型对比)
2. [CodeMirror 6 实现方案](#codemirror-6-实现方案)
3. [集成步骤](#集成步骤)
4. [代码示例](#代码示例)
5. [测试验证](#测试验证)

---

## 技术选型对比

### CodeMirror 6 ⭐⭐⭐⭐⭐ (推荐)

**优点**:
- ✅ 性能最佳,适合大型文档
- ✅ 高度可定制
- ✅ 优秀的移动端支持
- ✅ TypeScript 支持完善
- ✅ 活跃维护

**缺点**:
- ⚠️ 学习曲线稍陡
- ⚠️ 需要更多配置

**适用场景**: 专业代码编辑器,需要高性能

---

### TipTap ⭐⭐⭐⭐

**优点**:
- ✅ 基于 ProseMirror,功能强大
- ✅ 所见即所得 (WYSIWYG)
- ✅ 易于定制和扩展
- ✅ 良好的 TypeScript 支持

**缺点**:
- ⚠️ 包体积较大
- ⚠️ 纯 Markdown 支持需额外配置

**适用场景**: 富文本编辑器,需要可视化编辑

---

### Milkdown ⭐⭐⭐

**优点**:
- ✅ 基于 ProseMirror
- ✅ 插件化架构
- ✅ 支持 Markdown 语法

**缺点**:
- ⚠️ 相对较新,生态较小
- ⚠️ 文档相对较少

**适用场景**: 需要 Markdown 和所见即所得结合

---

## CodeMirror 6 实现方案

### 1. 安装依赖

```bash
# 核心包
npm install @codemirror/view @codemirror/state @codemirror/commands

# 语言支持
npm install @codemirror/language-data
npm install @codemirror/lang-javascript @codemirror/lang-python
npm install @codemirror/lang-java @codemirror/lang-cpp

# 扩展功能
npm install @codemirror/autocomplete @codemirror/lint
npm install @codemirror/search @codemirror/highlight

# Markdown 支持
npm install @codemirror/lang-markdown @codemirror/theme-one-dark
```

### 2. 创建 Markdown 编辑器组件

**文件**: `frontend/src/components/editor/MarkdownEditor.tsx`

```typescript
import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion } from '@codemirror/autocomplete'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  maxHeight?: string
  darkMode?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write in Markdown...',
  readOnly = false,
  maxHeight = '500px',
  darkMode = false,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
        EditorView.theme({
          '&': {
            fontSize: '14px',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
            overflow: 'auto',
          },
          '.cm-content': {
            paddingBottom: '100px',
          },
          '.cm-editor.cm-focused': {
            outline: 'none',
          },
          '.cm-placeholder': {
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
          },
        }),
        darkMode ? oneDark : [],
        autocompletion(),
        bracketMatching(),
        closeBrackets(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        searchKeymap,
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
        EditorView.focusChangeHandler.of((state) => {
          setIsFocused(state)
        }),
      ],
    })

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
      attributes: {
        class: `markdown-editor rounded-lg border ${
          isFocused
            ? 'border-primary ring-1 ring-primary'
            : 'border-gray-300 dark:border-gray-600'
        }`,
      },
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  // Update value when prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      })
    }
  }, [value])

  // Update theme
  useEffect(() => {
    // Re-create editor when dark mode changes
    // This is a simplification; you might want to use a transaction instead
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }
  }, [darkMode])

  return (
    <div
      ref={editorRef}
      className="markdown-editor"
      style={{ maxHeight, overflow: 'auto' }}
    />
  )
}
```

### 3. 创建预览组件

**文件**: `frontend/src/components/editor/MarkdownPreview.tsx`

```typescript
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MarkdownPreviewProps {
  content: string
  darkMode?: boolean
}

export function MarkdownPreview({ content, darkMode = false }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview prose prose-lg dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={darkMode ? vscDarkPlus : vs}
                language={match[1]}
                PreTag="div"
                className="rounded-lg"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={`${className} px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm`}
                {...props}
              >
                {children}
              </code>
            )
          },
          a({ node, children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            )
          },
          img({ node, src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt}
                className="rounded-lg shadow-md my-4"
                loading="lazy"
                {...props}
              />
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

### 4. 创建编辑器容器组件

**文件**: `frontend/src/components/editor/EditorWithPreview.tsx`

```typescript
import { useState } from 'react'
import { MarkdownEditor } from './MarkdownEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { useThemeStore } from '@/stores/themeStore'

interface EditorWithPreviewProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function EditorWithPreview({ value, onChange, placeholder }: EditorWithPreviewProps) {
  const [mode, setMode] = useState<'split' | 'edit' | 'preview'>('split')
  const darkMode = useThemeStore((state) => state.darkMode)

  return (
    <div className="border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'edit'
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-text-muted hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'split'
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-text-muted hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'preview'
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-text-muted hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Preview
          </button>
        </div>

        <div className="text-xs text-text-muted">
          {value.length} characters
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex" style={{ minHeight: '500px' }}>
        {(mode === 'edit' || mode === 'split') && (
          <div
            className={mode === 'split' ? 'w-1/2 border-r border-border-light dark:border-border-dark' : 'w-full'}
          >
            <MarkdownEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              darkMode={darkMode}
            />
          </div>
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className={mode === 'split' ? 'w-1/2' : 'w-full bg-white dark:bg-gray-900'}>
            <div className="p-6 overflow-auto" style={{ maxHeight: '500px' }}>
              <MarkdownPreview content={value} darkMode={darkMode} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 集成步骤

### Step 1: 安装依赖

```bash
cd frontend
npm install @codemirror/view @codemirror/state @codemirror/commands
npm install @codemirror/language-data @codemirror/lang-markdown
npm install @codemirror/autocomplete @codemirror/lint @codemirror/search
npm install @codemirror/highlight @codemirror/theme-one-dark
npm install react-markdown react-syntax-highlighter
npm install remark-gfm remark-math rehype-katex katex
```

### Step 2: 创建组件文件

```bash
mkdir -p src/components/editor
touch src/components/editor/MarkdownEditor.tsx
touch src/components/editor/MarkdownPreview.tsx
touch src/components/editor/EditorWithPreview.tsx
```

### Step 3: 使用编辑器

在创建文章/讨论页面中使用:

```typescript
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { useState } from 'react'

export function CreateArticle() {
  const [content, setContent] = useState('')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Article</h1>

      <input
        type="text"
        placeholder="Article title..."
        className="w-full px-4 py-3 border rounded-lg mb-4"
      />

      <EditorWithPreview
        value={content}
        onChange={setContent}
        placeholder="Write your article in Markdown..."
      />

      <button className="mt-4 px-6 py-2 bg-primary text-white rounded-lg">
        Publish
      </button>
    </div>
  )
}
```

---

## 代码示例

### 完整的创建文章页面

**文件**: `frontend/src/pages/community/CreateArticle.tsx`

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
import type { CreateArticleRequest } from '@/types/community'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'

export function CreateArticle() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content')
      return
    }

    setSubmitting(true)
    try {
      const data: CreateArticleRequest = {
        title,
        content,
        tags,
        category,
        is_published: isPublished,
      }

      const article = await blogApi.createArticle(data)
      navigate(`/blog/${article.slug}`)
    } catch (error) {
      console.error('Failed to create article:', error)
      alert('Failed to create article')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Create Article</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title..."
            className="w-full px-4 py-3 text-xl font-semibold border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Tags */}
          <input
            type="text"
            value={tags.join(', ')}
            onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="Tags (comma separated)..."
            className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Category */}
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category..."
            className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Editor */}
          <EditorWithPreview
            value={content}
            onChange={setContent}
            placeholder="Write your article in Markdown..."
          />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm font-medium">Publish immediately</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/blog')}
                className="px-6 py-2 border border-border-light dark:border-border-dark rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : isPublished ? 'Publish' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

---

## 测试验证

### 1. 功能测试清单

- [ ] 编辑器加载正常
- [ ] 输入内容实时预览
- [ ] Markdown 语法正确渲染
  - [ ] 标题 (h1-h6)
  - [ ] 粗体/斜体
  - [ ] 代码块 (带语法高亮)
  - [ ] 列表 (有序/无序)
  - [ ] 链接
  - [ ] 图片
  - [ ] 表格
  - [ ] 任务列表
- [ ] 切换编辑/预览/分屏模式
- [ ] 深色模式切换正常
- [ ] 自动保存草稿
- [ ] 发布文章成功

### 2. 性能测试

- [ ] 大文件编辑 (1000+ 行)
- [ ] 频繁输入无卡顿
- [ ] 切换模式流畅

### 3. 兼容性测试

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] 移动浏览器

---

## 故障排查

### 问题 1: 编辑器不显示

**可能原因**: 容器高度未设置

**解决方案**:
```css
.markdown-editor {
  min-height: 500px;
}
```

### 问题 2: 代码高亮不工作

**可能原因**: 语法高亮器未正确导入

**解决方案**:
```typescript
import { languages } from '@codemirror/language-data'
// 确保包含所有需要的语言
```

### 问题 3: 预览样式异常

**可能原因**: Tailwind prose 样式冲突

**解决方案**:
```css
/* 添加自定义样式覆盖 */
.markdown-preview h1 {
  @apply text-2xl font-bold mt-8 mb-4;
}
```

---

## 下一步

1. ✅ 安装依赖
2. ✅ 创建组件
3. ✅ 集成到创建页面
4. ✅ 测试功能
5. ⏳ 添加自动保存
6. ⏳ 添加图片上传
7. ⏳ 添加快捷键支持

**预计完成时间**: 4-6 小时

---

**文档更新**: 2026-02-21
**状态**: ✅ 准备实施

🤖 Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
