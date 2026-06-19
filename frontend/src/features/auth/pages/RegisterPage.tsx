import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card'
import { Loading } from '@/shared/components/Loading'
import { FormSkeleton } from '@/shared/components/FormSkeleton'
import { Checkbox } from '@/shared/components/Checkbox'
import { AlertCircle, UserPlus } from 'lucide-react'
import type { RegisterRequest } from '@/shared/types/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    password: '',
    email: '',
    display_name: '',
    organization_id: 1,
    campus_id: 1,
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '邮箱格式不正确'
    }

    if (!formData.username) {
      errors.username = '请输入用户名'
    } else if (!/^[0-9]+$/.test(formData.username)) {
      errors.username = '用户名必须为纯数字'
    }

    if (!formData.password) {
      errors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      errors.password = '密码至少需要6个字符'
    }

    if (formData.password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await register(formData)
      if (!result.success) {
        setError(result.error || '注册失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生意外错误')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    if (validationErrors.confirmPassword) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next.confirmPassword
        return next
      })
    }
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-24 mb-6">
            <img src="/codenexus-mark.svg" alt="" aria-hidden="true" className="h-14 w-24" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            加入 <span className="font-english tracking-normal">CodeNexus</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            创建账号，开始刷题之旅
          </p>
        </div>

        {/* Register Card */}
        <Card className="border border-border rounded-2xl shadow-prominent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground">
              注册
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-foreground mb-1.5">
                  显示名称
                </label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  autoComplete="nickname"
                  placeholder="请输入显示名称"
                  value={formData.display_name || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                  用户名 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="纯数字，如 2001"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.username}
                />
                {validationErrors.username && (
                  <p className="mt-1 text-sm text-destructive">
                    {validationErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  邮箱 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.email}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  密码 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.password}
                />
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-destructive">
                    {validationErrors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  至少6个字符
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  确认密码 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.confirmPassword}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-destructive">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <Checkbox
                  checked={agreedToTerms}
                  onCheckedChange={setAgreedToTerms}
                />
                <label className="ml-2 text-sm text-muted-foreground cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                  我已阅读并同意{' '}
                  <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors hover:underline" onClick={(e) => e.stopPropagation()}>
                    服务条款
                  </Link>{' '}
                  和{' '}
                  <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors hover:underline" onClick={(e) => e.stopPropagation()}>
                    隐私政策
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting || !agreedToTerms}
                className="w-full py-2.5 rounded-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loading size={16} />
                    注册中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    注册
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
                  已有账号？
                </span>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                返回登录
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
