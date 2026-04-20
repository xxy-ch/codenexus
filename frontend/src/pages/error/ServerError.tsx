import { Link } from 'react-router-dom'
import { AlertTriangle, Home, Info, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {/* 500 Number */}
        <div className="relative mb-8">
          <h1 className="text-[180px] font-bold text-slate-200 dark:text-slate-800 leading-none">
            500
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="h-20 w-20 text-red-500" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          服务器错误
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          抱歉，服务器遇到了一些问题。我们正在努力修复，请稍后再试。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新页面
          </Button>
          <Link to="/dashboard">
            <Button variant="outline" className="inline-flex items-center gap-2">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>

        {/* Error Info */}
        <div className="mt-12 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-lg mx-auto border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-red-500 shrink-0" />
            <div className="text-left">
              <p className="font-medium text-red-900 dark:text-red-400 mb-1">
                如果问题持续存在
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                请尝试清除浏览器缓存，或者联系我们的技术支持团队。如果是首次遇到此问题，请稍后重试。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
