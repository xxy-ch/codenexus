import { useEffect, useRef } from 'react'
import { EditorView, basicSetup, ViewUpdate } from '@codemirror/view'
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
  minHeight?: string
  darkMode?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  minHeight = '500px',
  darkMode = false,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

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
            fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", monospace',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", monospace',
          },
          '.cm-content': {
            paddingBottom: '100px',
            padding: '16px',
          },
          '.cm-editor.cm-focused': {
            outline: 'none',
          },
          '.cm-placeholder': {
            color: 'rgb(156 163 175)',
            fontStyle: 'italic',
          },
          '.cm-line': {
            padding: '0 0',
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
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!readOnly),
      ],
    })

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  // Update value when prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      })
      viewRef.current.dispatch(transaction)
    }
  }, [value])

  return (
    <div
      ref={editorRef}
      className="markdown-editor rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
      style={{ minHeight }}
    />
  )
}
