import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  helper?: ReactNode
  className?: string
}

export function StatCard({ label, value, helper, className }: StatCardProps) {
  return (
    <section className={cn('rounded-[28px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,245,252,0.92))] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      {helper ? <div className="mt-2 text-sm text-slate-600">{helper}</div> : null}
    </section>
  )
}
