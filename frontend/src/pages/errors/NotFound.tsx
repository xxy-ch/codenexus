import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="text-6xl font-display font-bold text-primary">404</h1>
        <p className="mt-4 text-lg text-on-surface-variant">页面未找到</p>
        <Link to="/" className="mt-6 inline-block btn-primary">
          返回首页
        </Link>
      </div>
    </div>
  )
}
