import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import Loading from '@/components/ui/Loading'

export default function Login() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { login, isLoading } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      showToast('请填写所有字段', 'error')
      return
    }
    try {
      await login(username, password)
      showToast('登录成功', 'success')
      navigate('/')
    } catch {
      showToast('用户名或密码错误', 'error')
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
          欢迎回来
        </h1>
        <p className="text-center text-on-surface-variant text-sm mb-8">
          登录你的账号继续
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
              密码
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {isLoading ? (
            <Loading size="sm" />
          ) : (
            <button type="submit" className="btn-primary w-full text-center block">
              登录
            </button>
          )}
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-on-surface-variant mt-6">
          还没有账号?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            注册
          </Link>
        </p>
      </div>
    </div>
  )
}
