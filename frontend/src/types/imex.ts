export interface PreviewItem {
  title: string
  difficulty: string
  test_case_count: number
  status: 'valid' | 'duplicate' | 'error'
  warning?: string
}

export interface ImportWarning {
  item: string
  reason: string
}

export interface ImportError {
  item: string
  reason: string
}

export interface ImportPreview {
  token: string
  total: number
  valid: number
  warnings: ImportWarning[]
  errors: ImportError[]
  preview_items: PreviewItem[]
}

export interface UserImportPreview {
  token: string
  total: number
  valid: number
  warnings: ImportWarning[]
  errors: ImportError[]
  preview_items: UserPreviewItem[]
}

export interface CreatedItem {
  title: string
  id: number
}

export interface SkippedItem {
  item: string
  reason: string
}

export interface ErrorItem {
  item: string
  reason: string
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
  errors: number
  created_items: CreatedItem[]
  skipped_items: SkippedItem[]
  error_items: ErrorItem[]
}

export interface UserPreviewItem {
  username: string
  role: string
  campus_id: number
  display_name: string
  email: string | null
  status: 'valid' | 'duplicate' | 'error'
  warning?: string
}
