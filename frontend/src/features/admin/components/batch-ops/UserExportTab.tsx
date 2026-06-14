import { useCallback, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { imexService } from '@/features/admin/services/imex'
import { Button } from '@/shared/components/Button'
import { downloadBlob } from './shared'

export function UserExportTab() {
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
