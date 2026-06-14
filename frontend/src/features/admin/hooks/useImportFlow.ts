import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportState = 'idle' | 'uploading' | 'previewing' | 'executing' | 'completed'

/** Minimum shape a preview response must have. */
export interface PreviewBase {
  token: string
  total: number
  valid: number
  warnings: Array<{ item: string; reason: string }>
  errors: Array<{ item: string; reason: string }>
}

/** Minimum shape an import result must have. */
export interface ResultBase {
  created: number
  skipped: number
  errors: number
  skipped_items: Array<{ item: string; reason: string }>
  error_items: Array<{ item: string; reason: string }>
}

/** Configure the import flow for a specific entity type. */
export interface ImportFlowConfig<TPreview extends PreviewBase, TResult extends ResultBase> {
  /** File extension accepted (e.g., '.zip', '.csv') */
  acceptedExtension: string
  /** Maximum file size in bytes */
  maxSizeBytes: number
  /** Validate the uploaded file, returning preview data */
  validate: (file: File) => Promise<TPreview>
  /** Execute the import using the preview token */
  execute: (token: string) => Promise<TResult>
  /** Human-readable entity name for toast messages (e.g., 'problems') */
  entityLabel: string
  /** Optional guard run before upload. Return an error message or null to proceed. */
  preUploadCheck?: () => string | null
}

export interface ImportFlowReturn<TPreview extends PreviewBase, TResult extends ResultBase> {
  importState: ImportState
  file: File | null
  setFile: (file: File | null) => void
  preview: TPreview | null
  result: TResult | null
  showConfirmDialog: boolean
  setShowConfirmDialog: (show: boolean) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  resetState: () => void
  handleFileSelect: (file: File) => void
  handleUpload: () => Promise<void>
  handleConfirmImport: () => Promise<void>
  handleDrop: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the five-state import flow (idle → uploading → previewing →
 * executing → completed) shared by ProblemImportTab and UserImportTab.
 *
 * Callers provide a config that plugs in the entity-specific validation,
 * execution, and label. The hook manages all shared state, handlers,
 * and toast notifications.
 */
export function useImportFlow<TPreview extends PreviewBase, TResult extends ResultBase>(
  config: ImportFlowConfig<TPreview, TResult>,
): ImportFlowReturn<TPreview, TResult> {
  const [importState, setImportState] = useState<ImportState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<TPreview | null>(null)
  const [result, setResult] = useState<TResult | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setImportState('idle')
    setFile(null)
    setPreview(null)
    setResult(null)
    setShowConfirmDialog(false)
  }, [])

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (!selectedFile.name.endsWith(config.acceptedExtension)) {
        toast.error(`Only ${config.acceptedExtension} files are accepted`)
        return
      }
      if (selectedFile.size > config.maxSizeBytes) {
        const maxMB = Math.round(config.maxSizeBytes / 1024 / 1024)
        toast.error(`File size must be under ${maxMB} MB`)
        return
      }
      setFile(selectedFile)
    },
    [config.acceptedExtension, config.maxSizeBytes],
  )

  const handleUpload = useCallback(async () => {
    if (!file) return
    if (config.preUploadCheck) {
      const error = config.preUploadCheck()
      if (error) {
        toast.error(error)
        return
      }
    }
    try {
      setImportState('uploading')
      const data = await config.validate(file)
      setPreview(data)
      setImportState('previewing')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
      setImportState('idle')
    }
  }, [file, config])

  const handleConfirmImport = useCallback(async () => {
    if (!preview) return
    setShowConfirmDialog(false)
    try {
      setImportState('executing')
      const data = await config.execute(preview.token)
      setResult(data)
      setImportState('completed')
      toast.success(`${data.created} ${config.entityLabel} imported successfully`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed'
      toast.error(message)
      setImportState('previewing')
    }
  }, [preview, config])

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

  return {
    importState,
    file,
    setFile,
    preview,
    result,
    showConfirmDialog,
    setShowConfirmDialog,
    fileInputRef,
    resetState,
    handleFileSelect,
    handleUpload,
    handleConfirmImport,
    handleDrop,
    handleDragOver,
    handleInputChange,
  }
}
