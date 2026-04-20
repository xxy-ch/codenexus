import { Link } from 'react-router-dom'
import { Home, SearchX, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {/* 404 Number */}
        <div className="relative mb-8">
          <h1 className="text-[180px] font-bold text-slate-200 dark:text-slate-800 leading-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <SearchX className="h-20 w-20 text-primary" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          页面未找到
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          抱歉，您访问的页面不存在或已被移除。请检查URL是否正确。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard">
            <Button variant="primary" className="inline-flex items-center gap-2">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
          <Link to="/problems">
            <Button variant="outline" className="inline-flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              浏览题目
            </Button>
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            您可能在寻找：
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link to="/dashboard" className="text-primary hover:underline">
              仪表板
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/problems" className="text-primary hover:underline">
              题目列表
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/contests" className="text-primary hover:underline">
              竞赛
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/discussions" className="text-primary hover:underline">
              讨论区
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/blog" className="text-primary hover:underline">
              博客
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
