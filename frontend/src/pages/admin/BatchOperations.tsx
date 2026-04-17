import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileUp, Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { imexService } from '@/services/imex'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { isAdmin } from '@/types/auth'
import type { ImportPreview, ImportResult, PreviewItem, UserImportPreview } from '@/types/imex'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type ImportState = 'idle' | 'uploading' | 'previewing' | 'executing' | 'completed'

// ---------------------------------------------------------------------------
// Problem Import Tab
// ---------------------------------------------------------------------------

function ProblemImportTab() {
  const [importState, setImportState] = useState<ImportState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setImportState('idle')
    setFile(null)
    setPreview(null)
    setResult(null)
    setShowConfirmDialog(false)
  }, [])

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.zip')) {
      toast.error('Only .zip files are accepted')
      return
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50 MB')
      return
    }
    setFile(selectedFile)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    try {
      setImportState('uploading')
      const data = await imexService.validateProblemImport(file)
      setPreview(data)
      setImportState('previewing')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
      setImportState('idle')
    }
  }, [file])

  const handleConfirmImport = useCallback(async () => {
    if (!preview) return
    setShowConfirmDialog(false)
    try {
      setImportState('executing')
      const data = await imexService.executeProblemImport(preview.token)
      setResult(data)
      setImportState('completed')
      toast.success(`${data.created} problems imported successfully`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed'
      toast.error(message)
      setImportState('previewing')
    }
  }, [preview])

  // --- Drop zone handlers ---
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) handleFileSelect(droppedFile)
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) handleFileSelect(selected)
    },
    [handleFileSelect],
  )

  // --- Render ---
  if (importState === 'uploading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (importState === 'executing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Importing...</p>
      </div>
    )
  }

  if (importState === 'completed' && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="default">
            <CheckCircle2 className="size-3 mr-1" />
            {result.created} created
          </Badge>
          <Badge variant="secondary">
            <AlertTriangle className="size-3 mr-1" />
            {result.skipped} skipped
          </Badge>
          {result.errors > 0 && (
            <Badge variant="destructive">
              <XCircle className="size-3 mr-1" />
              {result.errors} failed
            </Badge>
          )}
        </div>

        {result.created_items.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Created</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {result.created_items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-green-500" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.skipped_items.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Skipped</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {result.skipped_items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    {item.item} -- {item.reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.error_items.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {result.error_items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <XCircle className="size-3.5 text-destructive" />
                    {item.item} -- {item.reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={resetState}>
          Import Another File
        </Button>
      </div>
    )
  }

  if (importState === 'previewing' && preview) {
    return (
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">Total: {preview.total}</Badge>
          <Badge variant="default">Valid: {preview.valid}</Badge>
          <Badge variant="secondary">Skipped: {preview.warnings.length}</Badge>
          {preview.errors.length > 0 && (
            <Badge variant="destructive">Errors: {preview.errors.length}</Badge>
          )}
        </div>

        {preview.valid === 0 ? (
          <p className="text-sm text-muted-foreground">
            No valid items found in the uploaded file. Please fix the errors and try again.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Test Cases</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.preview_items.map((item: PreviewItem, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={item.difficulty} />
                  </TableCell>
                  <TableCell>{item.test_case_count}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={() => setShowConfirmDialog(true)} disabled={preview.valid === 0}>
            Confirm Import
          </Button>
          <Button variant="link" onClick={resetState}>
            Cancel
          </Button>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Import</DialogTitle>
              <DialogDescription>
                This will create {preview.valid} problem{preview.valid !== 1 ? 's' : ''}. This action cannot be undone. Continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmImport}>
                Confirm Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // idle state
  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-primary/5"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload ZIP file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
      >
        <FileUp className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag and drop a ZIP file here, or click to browse
        </p>
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
          Select File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{file.name} ({formatBytes(file.size)})</span>
          <Button onClick={handleUpload}>Validate</Button>
          <Button variant="ghost" onClick={() => setFile(null)}>Remove</Button>
        </div>
      )}

      <FormatDescription type="problem" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Problem Export Tab
// ---------------------------------------------------------------------------

function ProblemExportTab() {
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
                  className={selectedIds.has(problem.id) ? 'bg-muted' : undefined}
                  onClick={() => toggleSelect(problem.id)}
                  style={{ cursor: 'pointer' }}
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

function UserImportTab() {
  const [importState, setImportState] = useState<ImportState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [defaultPassword, setDefaultPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [preview, setPreview] = useState<UserImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setImportState('idle')
    setFile(null)
    setDefaultPassword('')
    setPreview(null)
    setResult(null)
    setShowConfirmDialog(false)
  }, [])

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Only .csv files are accepted')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB')
      return
    }
    setFile(selectedFile)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file || !defaultPassword) return
    if (defaultPassword.length < 6) {
      toast.error('Default password must be at least 6 characters')
      return
    }
    try {
      setImportState('uploading')
      const data = await imexService.validateUserImport(file, defaultPassword)
      setPreview(data)
      setImportState('previewing')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
      setImportState('idle')
    }
  }, [file, defaultPassword])

  const handleConfirmImport = useCallback(async () => {
    if (!preview) return
    setShowConfirmDialog(false)
    try {
      setImportState('executing')
      const data = await imexService.executeUserImport(preview.token)
      setResult(data)
      setImportState('completed')
      toast.success(`${data.created} users imported successfully`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed'
      toast.error(message)
      setImportState('previewing')
    }
  }, [preview])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) handleFileSelect(droppedFile)
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) handleFileSelect(selected)
    },
    [handleFileSelect],
  )

  const canValidate = file && defaultPassword.length >= 6

  // --- Render ---
  if (importState === 'uploading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (importState === 'executing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Importing...</p>
      </div>
    )
  }

  if (importState === 'completed' && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="default">
            <CheckCircle2 className="size-3 mr-1" />
            {result.created} created
          </Badge>
          <Badge variant="secondary">
            <AlertTriangle className="size-3 mr-1" />
            {result.skipped} skipped
          </Badge>
          {result.errors > 0 && (
            <Badge variant="destructive">
              <XCircle className="size-3 mr-1" />
              {result.errors} failed
            </Badge>
          )}
        </div>

        {result.skipped_items.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Skipped</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {result.skipped_items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    {item.item} -- {item.reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.error_items.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {result.error_items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <XCircle className="size-3.5 text-destructive" />
                    {item.item} -- {item.reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={resetState}>
          Import Another File
        </Button>
      </div>
    )
  }

  if (importState === 'previewing' && preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">Total: {preview.total}</Badge>
          <Badge variant="default">Valid: {preview.valid}</Badge>
          <Badge variant="secondary">Skipped: {preview.warnings.length}</Badge>
          {preview.errors.length > 0 && (
            <Badge variant="destructive">Errors: {preview.errors.length}</Badge>
          )}
        </div>

        {preview.valid === 0 ? (
          <p className="text-sm text-muted-foreground">
            No valid items found in the uploaded file. Please fix the errors and try again.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.preview_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>{item.role}</TableCell>
                    <TableCell>{item.campus_id}</TableCell>
                    <TableCell>{item.display_name}</TableCell>
                    <TableCell>{item.email ?? '--'}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={() => setShowConfirmDialog(true)} disabled={preview.valid === 0}>
            Confirm Import
          </Button>
          <Button variant="link" onClick={resetState}>
            Cancel
          </Button>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Import</DialogTitle>
              <DialogDescription>
                This will create {preview.valid} user{preview.valid !== 1 ? 's' : ''}. This action cannot be undone. Continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmImport}>
                Confirm Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // idle state
  return (
    <div className="space-y-4">
      {/* CSV drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-primary/5"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
      >
        <FileUp className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag and drop a CSV file here, or click to browse
        </p>
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
          Select File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {file && (
        <p className="text-sm text-muted-foreground">
          {file.name} ({formatBytes(file.size)})
        </p>
      )}

      <Separator />

      {/* Default password field */}
      <div className="space-y-1.5">
        <label htmlFor="default-password" className="text-sm font-medium">Default Password</label>
        <div className="flex items-center gap-2 max-w-sm">
          <Input
            id="default-password"
            type={showPassword ? 'text' : 'password'}
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            minLength={6}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          All imported users will receive this password. They should change it on first login.
        </p>
      </div>

      <Button onClick={handleUpload} disabled={!canValidate}>
        Validate CSV
      </Button>

      <FormatDescription type="user" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// User Export Tab
// ---------------------------------------------------------------------------

function UserExportTab() {
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    try {
      setExporting(true)
      const blob = await imexService.exportUsers()
      downloadBlob(blob, 'users.csv')

      // Attempt to read row count from blob for toast
      const text = await blob.text()
      const lines = text.split('\n').filter(Boolean)
      const count = Math.max(0, lines.length - 1) // exclude header
      toast.success(`Exported ${count} users`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed'
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }, [])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Export all users in your organization as a CSV file.
      </p>
      <Button onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Download className="size-4 mr-1.5" />}
        Export CSV
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === 'easy'
    ? 'default'
    : difficulty === 'medium'
      ? 'secondary'
      : 'destructive'
  return <Badge variant={variant}>{difficulty}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'valid') return <Badge variant="default">Valid</Badge>
  if (status === 'duplicate') return <Badge variant="secondary">Duplicate</Badge>
  return <Badge variant="destructive">Error</Badge>
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FormatDescription({ type }: { type: 'problem' | 'user' }) {
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
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto font-mono">
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
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto font-mono">
{`username,role,campus_id,display_name,email
jdoe,student,1,John Doe,jdoe@example.com
asmith,teacher,1,Alice Smith,asmith@example.com`}
          </pre>
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export function BatchOperations() {
  const { user } = useAuth()
  const showUserTabs = user?.role ? isAdmin(user.role) : false

  return (
    <div className="space-y-6 p-6">
      {/* Page title section */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="size-3.5" />
          <span>Batch Operations</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Batch Operations</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Import and export problems and users in bulk. Upload a file to preview before committing changes.
        </p>
      </div>

      <Tabs defaultValue="problem-import">
        <TabsList>
          <TabsTrigger value="problem-import">Problem Import</TabsTrigger>
          <TabsTrigger value="problem-export">Problem Export</TabsTrigger>
          {showUserTabs && <TabsTrigger value="user-import">User Import</TabsTrigger>}
          {showUserTabs && <TabsTrigger value="user-export">User Export</TabsTrigger>}
        </TabsList>

        <TabsContent value="problem-import">
          <ProblemImportTab />
        </TabsContent>

        <TabsContent value="problem-export">
          <ProblemExportTab />
        </TabsContent>

        {showUserTabs && (
          <TabsContent value="user-import">
            <UserImportTab />
          </TabsContent>
        )}

        {showUserTabs && (
          <TabsContent value="user-export">
            <UserExportTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default BatchOperations
