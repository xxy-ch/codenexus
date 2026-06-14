import { useState } from 'react'
import { Activity } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { WeekColumn } from '../hooks/useDashboardData'

interface ActivityHeatmapProps {
  weeks: WeekColumn[]
  monthLabels: { index: number; label: string }[]
  totalSubmissions: number
  solvedThisWeek: number
}

export function ActivityHeatmap({ weeks, monthLabels, totalSubmissions, solvedThisWeek }: ActivityHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<{ dateKey: string; count: number; accepted: number } | null>(null)

  return (
    <section className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-prominent glass-interactive hover-lift transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            年度提交热力图
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            过去 365 天的代码提交与通过强度分布
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-right">
            <span className="text-[13px] text-muted-foreground uppercase tracking-widest block">年度总提交</span>
            <span className="text-base font-bold text-foreground">{totalSubmissions} 次</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <span className="text-[13px] text-muted-foreground uppercase tracking-widest block">本周已解决</span>
            <span className="text-base font-bold text-primary">{solvedThisWeek} 题</span>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-4 scrollbar-thin select-none">
        <div className="min-w-[760px] flex items-start">
          <div className="flex flex-col justify-between text-[13px] text-muted-foreground mr-3 h-[96px] select-none py-[2px] font-medium">
            <span>周日</span>
            <span>周二</span>
            <span>周四</span>
            <span>周六</span>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex gap-[3px] text-[13px] text-muted-foreground mb-1.5 select-none h-4 relative">
              {weeks.map((_, index) => {
                const labelObj = monthLabels.find((l) => l.index === index)
                return (
                  <div key={index} className="w-3 relative flex-shrink-0">
                    {labelObj && (
                      <span className="absolute left-0 bottom-0 whitespace-nowrap text-[13px] font-semibold text-muted-foreground">
                        {labelObj.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px] flex-shrink-0">
                  {week.days.map((day, dIdx) => {
                    const count = day.count
                    let bgClass = 'bg-white/[0.02] border border-white/[0.04]'
                    if (count > 0 && count <= 2) bgClass = 'bg-primary/20 border border-primary/15 hover:bg-primary/30'
                    else if (count > 2 && count <= 4) bgClass = 'bg-primary/45 border border-primary/25 hover:bg-primary/55'
                    else if (count > 4 && count <= 6) bgClass = 'bg-primary/70 border border-primary/40 hover:bg-primary/80'
                    else if (count > 6) bgClass = 'bg-primary border border-primary/50 shadow-sm shadow-primary/20 hover:opacity-90'

                    return (
                      <div
                        key={dIdx}
                        onClick={() => setSelectedDay({ dateKey: day.dateKey, count, accepted: day.accepted })}
                        className={cn(
                          'w-3 h-3 rounded-[2px] transition-all duration-150 hover:scale-130 hover:z-10 cursor-pointer',
                          bgClass
                        )}
                        title={`${day.dateKey}: ${count} 次提交 (${day.accepted} 次通过)`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border-subtle pt-4 mt-2 gap-4">
        <div className="text-[13px] text-muted-foreground font-medium">
          {selectedDay ? (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/15 text-foreground animate-fade-in-up">
              📅 <strong className="text-primary">{selectedDay.dateKey}</strong>
              <span>• 共 <strong>{selectedDay.count}</strong> 次提交</span>
              {selectedDay.count > 0 && (
                <span className="text-status-accepted font-semibold">({selectedDay.accepted} 次通过)</span>
              )}
            </span>
          ) : (
            <span>点击网格内小方块可查看具体日期的提交概览</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-medium self-end">
          <span>少</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.02] border border-white/[0.04]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/20 border border-primary/15" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/45 border border-primary/25" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/70 border border-primary/40" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary border border-primary/50 shadow-sm shadow-primary/20" />
          <span>多</span>
        </div>
      </div>
    </section>
  )
}
