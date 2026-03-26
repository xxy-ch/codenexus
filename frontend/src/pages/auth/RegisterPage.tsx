import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import type { RegisterRequest } from '@/types/auth'

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = '请输入邮箱地址'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '邮箱格式不正确'
    }

    if (!formData.username) {
      errors.username = '请输入用户名'
    } else if (formData.username.trim().length < 3) {
      errors.username = '用户名至少需要 3 个字符'
    }

    if (!formData.password) {
      errors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      errors.password = '密码至少需要 6 个字符'
    }

    if (formData.password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }

    if (!agreedToTerms) {
      errors.terms = '请先阅读并同意相关条款'
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
        setError(result.error || '注册失败，请稍后重试')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册时发生异常，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)

    if (validationErrors.confirmPassword) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.confirmPassword
        return next
      })
    }
  }

  if (isLoading) {
    return <Loading message="正在加载注册页..." />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--page-bg-rgb))] p-6 md:p-8">
      <div
        data-testid="register-card"
        className="grid min-h-[640px] w-full max-w-[1200px] overflow-hidden rounded-xl bg-[rgba(255,255,255,0.96)] shadow-[0_30px_70px_rgba(19,27,46,0.08)] md:min-h-[720px] md:grid-cols-12"
      >
        <section className="relative hidden min-h-[720px] overflow-hidden bg-[rgb(var(--sidebar-bg-rgb))] px-12 py-12 md:col-span-5 md:flex md:flex-col md:justify-between lg:col-span-7 lg:px-14 lg:py-14">
          <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[rgba(0,82,204,0.10)] blur-3xl" />
          <div className="absolute right-10 top-1/2 hidden w-64 -translate-y-1/2 rotate-3 rounded-lg border border-[rgba(195,198,214,0.22)] bg-white/80 p-6 shadow-[0_22px_44px_rgba(19,27,46,0.10)] backdrop-blur-xl lg:block">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#ba1a1a]" />
              <span className="h-3 w-3 rounded-full bg-[#68dba9]" />
              <span className="h-3 w-3 rounded-full bg-[#515f74]" />
            </div>
            <div className="space-y-3">
              <div className="h-2 w-3/4 rounded bg-[#dae2ff]" />
              <div className="h-2 w-full rounded bg-[rgba(195,198,214,0.35)]" />
              <div className="h-2 w-1/2 rounded bg-[rgba(195,198,214,0.35)]" />
            </div>
            <div className="mt-6 text-right text-[10px] font-semibold uppercase tracking-[0.24em] text-[#003d9b]">
              注册通道：开放中
            </div>
          </div>

          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-[#003d9b]" aria-hidden="true">
                architecture
              </span>
              <span className="font-['Manrope'] text-2xl font-black tracking-[-0.05em] text-[#003d9b]">
                建筑算法学社
              </span>
            </div>

            <h1 className="max-w-[36rem] font-['Manrope'] text-[3.35rem] font-extrabold leading-[0.95] tracking-[-0.06em] text-[#131b2e]">
              完成一次注册
              <span className="block text-[#0052cc]">就能进入完整训练空间。</span>
            </h1>
            <p className="mt-6 max-w-[30rem] text-lg leading-8 text-[#5f6d87]">
              设置基础资料后，可直接用于题库、班级、竞赛和讨论区的统一身份流转。
            </p>
          </div>

          <div className="relative z-10 mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[
                'https://lh3.googleusercontent.com/aida-public/AB6AXuB3KkJ4pvv6ZgMk3vzTdOJXY2EYcn13dLS1JhOd6hzIMlTIt2aNlCJAwQUTXn0GYh17OfAwOIcg_iWw6XSA9eklPza6x22eKBjRD02Rd5thLznZy9m-D32RlVCOpwIyqMCsEzHDr4zL0PD_T_kbjqmQ9gj5Vg_GPk_BW75WNw1HdM-R1LTYhTStNmj6j0OEu9UwQMjhwl_Q4TTyHTKXHCDJ0bHyc9yI6FJ4GnTrnzpNNNDmPfLlP_gpghutz1atpTzLJX-IaDADVcie',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDWQ0-BujjjQs7scCXJhDLr5RFYakLNOhjhfSaZuH5h78XPeXdXCzt_vHo3dC8PGqxgycc9YYztQmDpSqZ3Mrz4ytIkKGwDDIAqfS1DIWYXYhwl1r1mzlbs217CakYT9lmTYSDfLldZ-Qycl_UBpFdM1A2OhgQ0idHr_reCD_h4shvm16M-kt5K-nA5cgBx7KDsuJuW-RYLyZixDb_5dOaH2uXzW-hczWmNFew6pcJMxqI5fPYlHKXrsH0Tunzin6KIUazovc8rLGh7',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuC18_TD3DeONHvY90CAjTbQU4Hd2nxVfPz2vFWi3d82aXXVdD94ZlQoZWrp3H7HVjaPGXctkaSRnHRWWCvsqgfJxaoHFBbYZuIIUc5O5ZwbACZyApGiEi3x9bRTzIsEIM47bxLmk1KggcYuCBKYf_XAVgBLm1ZBHUSJ3LwKjn4x3kQy1Y5l6Bseov6uAWF_4iNAfd7GdeE5RafTe2Fr1FvcwXsVvJaSgkGIwO7gt2VBf7jojfSte5OPc_WunCiXKdGNydLqZ13uEZi1',
              ].map((src, index) => (
                <img
                  key={src}
                  alt={`成员头像 ${index + 1}`}
                  className="h-10 w-10 rounded-full border-2 border-[rgb(var(--sidebar-bg-rgb))] object-cover"
                  src={src}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-[#65748d]">每周都有新的训练批次进入平台</span>
          </div>
        </section>

        <section
          data-testid="register-form-shell"
          className="flex min-h-[640px] flex-col justify-between p-8 md:col-span-7 md:min-h-[720px] md:p-12 lg:col-span-5 lg:p-16"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-8 flex items-center gap-2 md:hidden">
              <span className="material-symbols-outlined text-[28px] text-[#003d9b]" aria-hidden="true">
                architecture
              </span>
              <span className="font-['Manrope'] text-lg font-bold text-[#003d9b]">建筑算法学社</span>
            </div>

            <div className="mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">账号创建</p>
              <h2 className="mt-3 font-['Manrope'] text-3xl font-bold tracking-[-0.05em] text-[#131b2e]">创建你的账号</h2>
              <p className="mt-2 text-sm font-medium text-[#5f6d87]">
                补齐基础资料后，即可在题库、课堂与竞赛场景中直接使用。
              </p>
            </div>

            {error ? (
              <div className="mb-6 rounded-[12px] bg-[rgba(255,218,214,0.84)] px-4 py-3 text-sm text-[#93000a]">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                {
                  label: '显示名称',
                  name: 'display_name',
                  type: 'text',
                  autoComplete: 'nickname',
                  placeholder: '例如：张三',
                  value: formData.display_name || '',
                  icon: UserRound,
                  error: undefined,
                  onChange: handleChange,
                },
                {
                  label: '用户名',
                  name: 'username',
                  type: 'text',
                  autoComplete: 'username',
                  placeholder: '例如：zhangsan01',
                  value: formData.username,
                  icon: UserRound,
                  error: validationErrors.username,
                  onChange: handleChange,
                },
                {
                  label: '邮箱地址',
                  name: 'email',
                  type: 'email',
                  autoComplete: 'email',
                  placeholder: 'name@example.com',
                  value: formData.email,
                  icon: Mail,
                  error: validationErrors.email,
                  onChange: handleChange,
                },
                {
                  label: '密码',
                  name: 'password',
                  type: 'password',
                  autoComplete: 'new-password',
                  placeholder: '请输入密码',
                  value: formData.password,
                  icon: LockKeyhole,
                  error: validationErrors.password,
                  onChange: handleChange,
                },
                {
                  label: '确认密码',
                  name: 'confirmPassword',
                  type: 'password',
                  autoComplete: 'new-password',
                  placeholder: '请再次输入密码',
                  value: confirmPassword,
                  icon: LockKeyhole,
                  error: validationErrors.confirmPassword,
                  onChange: handleConfirmPasswordChange,
                },
              ].map((field) => {
                const Icon = field.icon
                return (
                  <label key={field.name} className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">
                      {field.label}
                    </span>
                    <div className="relative rounded-[14px] border border-[rgba(195,198,214,0.32)] bg-[rgba(234,237,255,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_rgba(19,27,46,0.04)] transition-all duration-200 focus-within:border-[rgba(12,86,208,0.24)] focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_4px_rgba(12,86,208,0.08)]">
                      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6d87]" />
                      <Input
                        name={field.name}
                        type={field.type}
                        autoComplete={field.autoComplete}
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={field.onChange}
                        required={field.name !== 'display_name'}
                        disabled={isSubmitting}
                        error={field.error}
                        className="bg-transparent py-4 pl-12 pr-4 text-[15px] text-[#17305e] placeholder:text-[#8d98b3] shadow-none focus-visible:bg-transparent focus-visible:ring-0"
                        style={{ paddingTop: '1rem', paddingRight: '1rem', paddingBottom: '1rem', paddingLeft: '3rem' }}
                      />
                    </div>
                    {field.error ? <p className="mt-2 text-sm text-[#93000a]">{field.error}</p> : null}
                  </label>
                )
              })}

              <div className="space-y-2 rounded-[14px] border border-[rgba(195,198,214,0.24)] bg-[rgba(242,243,255,0.72)] px-4 py-3 text-sm text-[#445472]">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked)
                      if (validationErrors.terms) {
                        setValidationErrors((prev) => {
                          const next = { ...prev }
                          delete next.terms
                          return next
                        })
                      }
                    }}
                    disabled={isSubmitting}
                    className="mt-0.5"
                  />
                  <span>
                    我已阅读并同意{' '}
                    <Link to="/terms" className="font-semibold text-[#003d9b] hover:underline underline-offset-4">
                      服务条款
                    </Link>{' '}
                    与{' '}
                    <Link to="/privacy" className="font-semibold text-[#003d9b] hover:underline underline-offset-4">
                      隐私政策
                    </Link>
                    。
                  </span>
                </label>
                {validationErrors.terms ? (
                  <p className="text-sm text-[#93000a]">{validationErrors.terms}</p>
                ) : null}
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
                className="border border-[rgba(0,61,155,0.06)] text-base font-extrabold tracking-[-0.02em] text-white shadow-[0_18px_36px_rgba(0,61,155,0.24)] hover:scale-[1.01] active:scale-[0.985]"
                style={{ backgroundImage: 'linear-gradient(135deg, #003d9b 0%, #0052cc 100%)' }}
              >
                {isSubmitting ? '注册中...' : '创建账号'}
              </Button>
            </form>

            <div className="mt-10 text-center text-sm text-[#65748d]">
              <span>已有账号？</span>
              <Link className="ml-1 font-bold text-[#003d9b] hover:underline underline-offset-4" to="/login">
                立即登录
              </Link>
            </div>
          </div>

          <footer className="mx-auto mt-12 w-full max-w-md border-t border-[rgba(195,198,214,0.16)] pt-8">
            <div className="flex flex-wrap justify-center gap-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(67,70,84,0.56)] md:justify-start">
              <span>隐私说明</span>
              <span>服务状态</span>
              <span>版本记录</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
