import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import Loading from '@/components/ui/Loading'

export default function Register() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { register, isLoading } = useAuthStore()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      showToast('请填写所有字段', 'error')
      return
    }

    if (password.length < 6) {
      showToast('密码长度至少为 6 位', 'error')
      return
    }

    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致', 'error')
      return
    }

    try {
      await register({ username, email, password })
      showToast('注册成功', 'success')
      navigate('/')
    } catch {
      showToast('注册失败，请重试', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="text-white font-display font-bold text-lg">OJ</span>
          </div>
        </div>

        <h1 className="font-display font-bold text-2xl text-center text-on-surface mb-2">
          创建账号
        </h1>
        <p className="text-center text-on-surface-variant text-sm mb-8">
          填写以下信息完成注册
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              用户名
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              邮箱
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="请输入邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              密码
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="至少 6 位字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {isLoading ? (
            <Loading size="sm" />
          ) : (
            <button type="submit" className="btn-primary w-full text-center block">
              注册
            </button>
          )}
        </form>

        <p className="text-center text-sm text-on-surface-variant mt-6">
          已有账号?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  )
}
