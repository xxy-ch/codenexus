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
  placeholder,
  readOnly = false,
  minHeight = '500px',
  darkMode = false,
}: MarkdownEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      spellCheck={false}
      className={`block w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm leading-6 outline-none ${
        darkMode ? 'text-foreground placeholder:text-muted-foreground' : 'text-foreground placeholder:text-muted-foreground'
      }`}
      style={{ minHeight }}
    />
  )
}
