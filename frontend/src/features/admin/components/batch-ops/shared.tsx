import { useState } from 'react'
import { Badge } from '@/shared/components/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/Card'

export type ImportState = 'idle' | 'uploading' | 'previewing' | 'executing' | 'completed'

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === 'easy'
    ? 'default'
    : difficulty === 'medium'
      ? 'secondary'
      : 'destructive'
  return <Badge variant={variant}>{difficulty}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'valid') return <Badge variant="default">Valid</Badge>
  if (status === 'duplicate') return <Badge variant="secondary">Duplicate</Badge>
  return <Badge variant="destructive">Error</Badge>
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FormatDescription({ type }: { type: 'problem' | 'user' }) {
  const [expanded, setExpanded] = useState(false)

  if (type === 'problem') {
    return (
      <Card size="sm">
        <CardHeader>
          <button
            className="flex items-center gap-2 text-sm font-medium text-left w-full"
            onClick={() => setExpanded((prev) => !prev)}
            type="button"
          >
            Expected Format
            <span className="text-muted-foreground">{expanded ? '(collapse)' : '(expand)'}</span>
          </button>
        </CardHeader>
        {expanded && (
          <CardContent>
            <pre className="rounded-md bg-muted p-3 text-[13px] overflow-x-auto font-mono">
{`problem-folder/
  problem.md        # Problem description (Markdown)
  config.json       # Title, difficulty, time/memory limits
  testcases/
    01.in           # Test case input
    01.out          # Test case expected output
    02.in
    02.out`}
            </pre>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardHeader>
        <button
          className="flex items-center gap-2 text-sm font-medium text-left w-full"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
        >
          Expected Format
          <span className="text-muted-foreground">{expanded ? '(collapse)' : '(expand)'}</span>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          <pre className="rounded-md bg-muted p-3 text-[13px] overflow-x-auto font-mono">
{`username,role,campus_id,display_name,email
jdoe,student,1,John Doe,jdoe@example.com
asmith,teacher,1,Alice Smith,asmith@example.com`}
          </pre>
        </CardContent>
      )}
    </Card>
  )
}
