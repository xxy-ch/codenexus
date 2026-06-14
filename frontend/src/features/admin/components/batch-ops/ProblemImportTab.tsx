import { useCallback, useRef, useState } from 'react'
import { FileUp, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { imexService } from '@/features/admin/services/imex'
import { Button } from '@/shared/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card'
import { Badge } from '@/shared/components/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/dialog'
import { Skeleton } from '@/shared/components/Skeleton'
import type { ImportPreview, ImportResult, PreviewItem } from '@/features/admin/types/imex'
import { type ImportState, DifficultyBadge, StatusBadge, formatBytes, FormatDescription } from './shared'

export function ProblemImportTab() {
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
                    <CheckCircle2 className="size-3.5 text-status-accepted" />
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
                    <AlertTriangle className="size-3.5 text-difficulty-medium" />
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
        className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 transition-colors hover:border-primary/50 hover:bg-primary/5"
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
