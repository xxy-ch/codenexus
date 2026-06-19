import { useRef } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/editor/browser/coreCommands'
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditor/codeEditorWidget'
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching'
import 'monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard'
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment'
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu'
import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo'
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding'
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions'
import 'monaco-editor/esm/vs/editor/contrib/gotoError/browser/gotoError'
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution'
import 'monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation'
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations'
import 'monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor'
import 'monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2'
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController'
import 'monaco-editor/esm/vs/editor/contrib/tokenization/browser/tokenization'
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter'
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations'
import 'monaco-editor/esm/vs/editor/common/standaloneStrings'
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css'
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon-modifiers.css'
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution'
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution'
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution'
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution'
import 'monaco-editor/esm/vs/basic-languages/swift/swift.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { type editor } from 'monaco-editor/esm/vs/editor/editor.api'

type MonacoWorkerEnvironment = {
  getWorker: () => Worker
}

;(globalThis as unknown as { MonacoEnvironment: MonacoWorkerEnvironment }).MonacoEnvironment = {
  getWorker: () => new editorWorker(),
}

loader.config({ monaco })

interface MonacoEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
  height?: string | number
  theme?: string
  readOnly?: boolean
  fontSize?: number
  minimap?: boolean
  wordWrap?: 'on' | 'off'
  lineHeight?: number
  codeTemplates?: Record<string, string>
}

const LANGUAGE_CONFIG: Record<string, string> = {
  cpp: 'cpp',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  rust: 'rust',
  go: 'go',
  csharp: 'csharp',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
}

export function MonacoEditor({
  language,
  value,
  onChange,
  height = '100%',
  theme = 'custom-dark',
  readOnly = false,
  fontSize = 14,
  minimap = true,
  wordWrap = 'off',
  lineHeight = 24,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const monacoLanguage = LANGUAGE_CONFIG[language] || language

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoApi: typeof monaco) => {
    editorRef.current = editor

    // 配置编辑器选项
    editor.updateOptions({
      fontSize,
      lineHeight,
      minimap: { enabled: minimap },
      wordWrap,
      readOnly,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      renderWhitespace: 'selection',
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      contextmenu: true,
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true,
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
      bracketPairColorization: {
        enabled: true,
      },
    })

    // 配置主题
    monacoApi.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#08090a',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#141618',
        'editorCursor.foreground': '#9f4f24',
        'editor.selectionBackground': '#262930',
        'editor.inactiveSelectionBackground': '#1b1d20',
      },
    })

    // 添加自定义代码片段
    monacoApi.languages.registerCompletionItemProvider(monacoLanguage, {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        // 常用代码片段
        const suggestions = [
          {
            label: 'for',
            kind: monacoApi.languages.CompletionItemKind.Snippet,
            insertText: 'for (${1:int} ${2:i} = 0; $2 < ${3:n}; $2++) {\n\t$0\n}',
            insertTextRules: monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
          {
            label: 'if',
            kind: monacoApi.languages.CompletionItemKind.Snippet,
            insertText: 'if (${1:condition}) {\n\t$0\n}',
            insertTextRules: monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
          {
            label: 'while',
            kind: monacoApi.languages.CompletionItemKind.Snippet,
            insertText: 'while (${1:condition}) {\n\t$0\n}',
            insertTextRules: monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
        ]

        return { suggestions }
      },
    })

    // 添加键盘快捷键
    editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyS, () => {
      // Prevent browser's default save dialog — no-op placeholder.
      // TODO: wire up an onSave callback prop when needed.
    })

    // 格式化文档
    editor.addCommand(monacoApi.KeyMod.Shift | monacoApi.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run()
    })
  }

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '')
  }

  return (
    <div className="h-full w-full">
      <Editor
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={handleEditorChange}
        theme={theme}
        options={{
          fontSize,
          lineHeight,
          minimap: { enabled: minimap },
          wordWrap,
          readOnly,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          renderWhitespace: 'selection',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          contextmenu: true,
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          bracketPairColorization: {
            enabled: true,
          },
        }}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading Editor...</p>
            </div>
          </div>
        }
      />
    </div>
  )
}
