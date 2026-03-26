import { Link } from 'react-router-dom'

export function AccountRecoveryPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--page-bg-rgb))] px-6 py-10">
      <div className="w-full max-w-2xl rounded-[24px] bg-white/95 p-8 shadow-[0_24px_60px_rgba(19,27,46,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">账号支持</p>
        <h1 className="mt-3 font-['Manrope'] text-4xl font-extrabold tracking-[-0.05em] text-[#131b2e]">
          账号找回
        </h1>
        <p className="mt-4 text-base leading-7 text-[#5f6d87]">
          当前版本暂未开放自助重置密码，请联系授课教师或平台管理员协助恢复访问权限。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex rounded-[12px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 py-3 text-sm font-semibold text-white"
          >
            返回登录
          </Link>
          <Link
            to="/register"
            className="inline-flex rounded-[12px] bg-[rgba(226,231,255,0.88)] px-5 py-3 text-sm font-semibold text-[#244171]"
          >
            创建新账号
          </Link>
        </div>
      </div>
    </main>
  )
}

export default AccountRecoveryPage
