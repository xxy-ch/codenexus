import { Link } from 'react-router-dom'
import { Home, SearchX, Terminal } from 'lucide-react'
import { Button } from '@/shared/components/Button'

export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg mx-auto">
        {/* 404 Illustration */}
        <div className="relative mb-10">
          <div className="relative inline-flex items-center justify-center">
            <h1 className="text-[160px] font-bold text-muted-foreground/15 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                <SearchX className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
          页面未找到
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
          抱歉，您访问的页面不存在或已被移除。请检查URL是否正确。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button variant="default" className="inline-flex items-center gap-2 rounded-lg">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
          <Link to="/problems">
            <Button variant="outline" className="inline-flex items-center gap-2 rounded-lg">
              <Terminal className="h-4 w-4" />
              浏览题目
            </Button>
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            您可能在寻找
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm">
            <Link to="/dashboard" className="text-primary hover:text-primary/80 transition-colors">
              仪表板
            </Link>
            <Link to="/problems" className="text-primary hover:text-primary/80 transition-colors">
              题目列表
            </Link>
            <Link to="/contests" className="text-primary hover:text-primary/80 transition-colors">
              竞赛
            </Link>
            <Link to="/discussions" className="text-primary hover:text-primary/80 transition-colors">
              讨论区
            </Link>
            <Link to="/blog" className="text-primary hover:text-primary/80 transition-colors">
              博客
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
