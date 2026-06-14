import { Link } from 'react-router-dom'
import { AlertTriangle, Home, Info, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/Button'

export function ServerError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg mx-auto">
        {/* 500 Illustration */}
        <div className="relative mb-10">
          <div className="relative inline-flex items-center justify-center">
            <h1 className="text-[160px] font-bold text-muted-foreground/15 leading-none select-none">
              500
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
          服务器错误
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
          抱歉，服务器遇到了一些问题。我们正在努力修复，请稍后再试。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="default"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
            刷新页面
          </Button>
          <Link to="/dashboard">
            <Button variant="outline" className="inline-flex items-center gap-2 rounded-lg">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>

        {/* Error Info */}
        <div className="mt-16 p-5 bg-destructive/5 border border-destructive/10 rounded-xl max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground mb-1">
                如果问题持续存在
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                请尝试清除浏览器缓存，或者联系我们的技术支持团队。如果是首次遇到此问题，请稍后重试。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
