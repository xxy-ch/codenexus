import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Lock, ArrowLeft, LayoutDashboard } from 'lucide-react'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border border-border rounded-2xl shadow-prominent">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl mb-5 mx-auto">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
              访问被拒绝
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              您没有权限访问此页面。如果您认为这是一个错误，请联系您的管理员。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                返回上一页
              </Button>
              <Link to="/dashboard">
                <Button
                  variant="default"
                  className="inline-flex items-center gap-2 rounded-lg"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  仪表盘
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
