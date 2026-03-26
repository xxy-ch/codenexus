export function PrivacyPolicyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--page-bg-rgb))] px-6 py-10">
      <div className="w-full max-w-3xl rounded-[24px] bg-white/95 p-8 shadow-[0_24px_60px_rgba(19,27,46,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">隐私说明</p>
        <h1 className="mt-3 font-['Manrope'] text-4xl font-extrabold tracking-[-0.05em] text-[#131b2e]">
          隐私政策
        </h1>
        <p className="mt-4 text-base leading-7 text-[#5f6d87]">
          当前页面说明平台对账号资料与提交记录的处理原则。后续若有调整，会通过平台公告同步更新。
        </p>
      </div>
    </main>
  )
}

export default PrivacyPolicyPage
