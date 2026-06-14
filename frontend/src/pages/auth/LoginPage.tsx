import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card'
import { Loading } from '@/shared/components/Loading'
import { FormSkeleton } from '@/shared/components/FormSkeleton'
import { Code2, AlertCircle, LogIn } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await login(formData)
      if (!result.success) {
        setError(result.error || '登录失败')
      }
      // Login successful, the useEffect will navigate to dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生意外错误')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <FormSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl shadow-lg shadow-primary/25 mb-6">
            <Code2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            欢迎使用 <span className="font-serif tracking-normal">CodeNexus</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            登录以继续你的编程之旅
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-border rounded-2xl shadow-prominent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground">
              登录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  用户名
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  密码
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loading size={16} />
                    登录中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" />
                    登录
                  </span>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-card text-muted-foreground">
                  还没有账号？
                </span>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                创建新账号
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
