import { useAuthStore } from '../../store/authStore'

export function TopBar() {
  const { user, logout } = useAuthStore()

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-outline-variant bg-surface-container/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-on-surface-variant">{user?.username}</span>
        <button
          onClick={logout}
          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          退出
        </button>
      </div>
    </header>
  )
}
