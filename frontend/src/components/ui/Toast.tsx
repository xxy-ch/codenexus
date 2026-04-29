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
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

const toastConfig: Record<ToastType, {
  icon: typeof CheckCircle
  iconColor: string
  borderColor: string
  bgAccent: string
}> = {
  success: {
    icon: CheckCircle,
    iconColor: 'text-status-accepted',
    borderColor: 'border-status-accepted/30',
    bgAccent: 'bg-status-accepted/5',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-destructive',
    borderColor: 'border-destructive/30',
    bgAccent: 'bg-destructive/5',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-status-tle',
    borderColor: 'border-status-tle/30',
    bgAccent: 'bg-status-tle/5',
  },
  info: {
    icon: Info,
    iconColor: 'text-status-pending',
    borderColor: 'border-status-pending/30',
    bgAccent: 'bg-status-pending/5',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl pointer-events-auto',
        // Glass effect
        'bg-background/90 backdrop-blur-xl',
        'border border-border/50',
        'shadow-elevated',
        // Animation
        'animate-slide-up',
        // Accent border
        config.borderColor,
        config.bgAccent
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className={cn(
          'shrink-0 p-0.5 rounded-md',
          'text-muted-foreground hover:text-foreground',
          'transition-colors duration-150',
          'hover:bg-muted/60'
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
