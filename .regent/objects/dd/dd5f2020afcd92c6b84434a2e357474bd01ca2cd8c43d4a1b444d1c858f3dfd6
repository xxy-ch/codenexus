import { useState } from 'react'
import { MarkdownEditor } from './MarkdownEditor'
import { MarkdownPreview } from './MarkdownPreview'

type ViewMode = 'split' | 'edit' | 'preview'

interface EditorWithPreviewProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  darkMode?: boolean
}

export function EditorWithPreview({
  value,
  onChange,
  placeholder,
  readOnly = false,
  darkMode = false,
}: EditorWithPreviewProps) {
  const [mode, setMode] = useState<ViewMode>('split')

  const wordCount = value.split(/\s+/).filter(Boolean).length
  const charCount = value.length
  const lineCount = value.split('\n').length

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'edit'
                ? 'bg-secondary text-primary shadow-sm'
                : 'text-text-muted hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span className="material-icons text-[18px] align-middle mr-1">edit</span>
            Edit
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'split'
                ? 'bg-secondary text-primary shadow-sm'
                : 'text-text-muted hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span className="material-icons text-[18px] align-middle mr-1">view_column</span>
            Split
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'preview'
                ? 'bg-secondary text-primary shadow-sm'
                : 'text-text-muted hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span className="material-icons text-[18px] align-middle mr-1">visibility</span>
            Preview
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{lineCount} lines</span>
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex" style={{ minHeight: '500px' }}>
        {(mode === 'edit' || mode === 'split') && (
          <div
            className={`bg-card ${
              mode === 'split' ? 'w-1/2 border-r border-border' : 'w-full'
            }`}
          >
            <MarkdownEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              readOnly={readOnly}
              darkMode={darkMode}
            />
          </div>
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div
            className={`bg-card overflow-auto ${
              mode === 'split' ? 'w-1/2' : 'w-full'
            }`}
            style={{ maxHeight: '500px' }}
          >
            <MarkdownPreview content={value} darkMode={darkMode} />
          </div>
        )}
      </div>

      {/* Markdown Tips */}
      <div className="px-4 py-2 bg-muted border-t border-border">
        <div className="text-xs text-text-muted">
          <span className="font-medium">Markdown tips:</span>{' '}
          <span className="italic">**bold**</span>, {' '}
          <span className="italic">*italic*</span>, {' '}
          <span className="italic">`code`</span>, {' '}
          <span className="italic">```language```</span> for code blocks
        </div>
      </div>
    </div>
  )
}
