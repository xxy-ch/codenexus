import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center max-w-md px-6">
        <h1 className="text-4xl font-display font-bold text-primary">访问被拒绝</h1>
        <p className="mt-4 text-base text-on-surface-variant">
          当前账号没有访问该管理页面的权限，请返回工作台或切换为管理员账号。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            返回工作台
          </Link>
          <Link to="/login" className="btn-secondary">
            重新登录
          </Link>
        </div>
      </div>
    </div>
  )
}
