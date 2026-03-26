export function TermsOfServicePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--page-bg-rgb))] px-6 py-10">
      <div className="w-full max-w-3xl rounded-[24px] bg-white/95 p-8 shadow-[0_24px_60px_rgba(19,27,46,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">平台条款</p>
        <h1 className="mt-3 font-['Manrope'] text-4xl font-extrabold tracking-[-0.05em] text-[#131b2e]">
          服务条款
        </h1>
        <p className="mt-4 text-base leading-7 text-[#5f6d87]">
          当前页面用于说明平台账号使用规范。正式条款发布前，请以教师通知和平台公告中的最新说明为准。
        </p>
      </div>
    </main>
  )
}

export default TermsOfServicePage
