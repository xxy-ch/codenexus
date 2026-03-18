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
    <section className={cn('rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      {helper ? <div className="mt-2 text-sm text-slate-600">{helper}</div> : null}
    </section>
  )
}
