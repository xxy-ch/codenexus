import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }

    setToasts(prev => [...prev, newToast])

    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, toast.duration || 3000)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-status-accepted/10',
      textColor: 'text-status-accepted',
      borderColor: 'border-status-accepted/20',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      borderColor: 'border-destructive/20',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-status-tle/10',
      textColor: 'text-status-tle',
      borderColor: 'border-status-tle/20',
    },
    info: {
      icon: Info,
      bgColor: 'bg-status-pending/10',
      textColor: 'text-status-pending',
      borderColor: 'border-status-pending/20',
    },
  }[toast.type]

  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in',
        config.bgColor,
        config.borderColor
      )}
    >
      <Icon className={cn('w-5 h-5', config.textColor)} />
      <div className="flex-1">
        <p className={cn('font-medium', config.textColor)}>{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-muted-foreground mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className={cn('hover:opacity-70', config.textColor)}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
