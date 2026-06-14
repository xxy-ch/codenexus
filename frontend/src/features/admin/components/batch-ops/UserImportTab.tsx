import { useCallback, useRef, useState } from 'react'
import { FileUp, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { imexService } from '@/features/admin/services/imex'
import { Button } from '@/shared/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/dialog'
import { Separator } from '@/shared/components/separator'
import { Skeleton } from '@/shared/components/Skeleton'
import type { ImportResult, UserImportPreview } from '@/features/admin/types/imex'
import { type ImportState, StatusBadge, formatBytes, FormatDescription } from './shared'

export function UserImportTab() {
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
        className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 transition-colors hover:border-primary/50 hover:bg-primary/5"
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
        <p className="text-[13px] text-muted-foreground">
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
