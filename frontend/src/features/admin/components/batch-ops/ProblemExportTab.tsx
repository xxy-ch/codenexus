import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { imexService } from '@/features/admin/services/imex'
import { problemsService } from '@/features/problems/services/problems'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/table'
import { DifficultyBadge, downloadBlob } from './shared'

export function ProblemExportTab() {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [problems, setProblems] = useState<Array<{ id: string; title: string; difficulty: string }>>([])
  const [loaded, setLoaded] = useState(false)

  const requestIdRef = useRef(0)

  const loadProblems = useCallback(async () => {
    const myId = ++requestIdRef.current
    try {
      const data = await problemsService.getProblems({ search: search || undefined, limit: 100 })
      // Discard stale responses
      if (requestIdRef.current !== myId) return
      setProblems(data.problems.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty })))
      setLoaded(true)
    } catch (error: unknown) {
      if (requestIdRef.current !== myId) return
      const message = error instanceof Error ? error.message : 'Failed to load problems'
      toast.error(message)
    }
  }, [search])

  // Single loading path: debounce search changes, load on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProblems()
    }, 400)
    return () => clearTimeout(timer)
  }, [loadProblems])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(problems.map((p) => p.id)))
  }, [problems])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleExport = useCallback(async () => {
    if (selectedIds.size === 0) return
    try {
      setExporting(true)
      for (const id of selectedIds) {
        const blob = await imexService.exportProblem(id)
        downloadBlob(blob, `problem-${id}.zip`)
      }
      toast.success(`Exported ${selectedIds.size} problem${selectedIds.size !== 1 ? 's' : ''}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed'
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }, [selectedIds])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search problems..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
        <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
      </div>

      {problems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No problems found.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Title</TableHead>
                <TableHead>Difficulty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {problems.map((problem) => (
                <TableRow
                  key={problem.id}
                  className={cn('cursor-pointer', selectedIds.has(problem.id) ? 'bg-muted' : undefined)}
                  onClick={() => toggleSelect(problem.id)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(problem.id)}
                      readOnly
                      aria-label={`Select ${problem.title}`}
                    />
                  </TableCell>
                  <TableCell>{problem.title}</TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleExport} disabled={selectedIds.size === 0 || exporting}>
          {exporting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Download className="size-4 mr-1.5" />}
          Export ZIP
        </Button>
        {selectedIds.size > 0 && (
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// User Import Tab
// ---------------------------------------------------------------------------
