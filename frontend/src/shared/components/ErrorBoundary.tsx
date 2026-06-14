import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">页面出现错误</h2>
          <p className="text-sm text-muted-foreground">抱歉，页面加载时遇到问题。请刷新页面重试。</p>
          <Button variant="outline" onClick={() => window.location.reload()}>刷新页面</Button>
        </div>
      )
    }
    return this.props.children
  }
}
