import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/features/users/services/users'
import type { UserActivity } from '@/features/users/types/users'

export interface WeeklyActivityItem {
  day: string
  '提交': number
  '通过': number
}

export interface DayCell {
  dateKey: string
  count: number
  accepted: number
}

export interface WeekColumn {
  days: DayCell[]
}

export function useDashboardData() {
  const { data: userStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => usersService.getUserStats(),
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['userActivity'],
    queryFn: () => usersService.getUserActivity(150),
  })

  const { data: recommendedProblems } = useQuery({
    queryKey: ['recommendedProblems'],
    queryFn: () => usersService.getRecommendedProblems(5),
  })

  const computations = useMemo(() => {
    const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const submissionActivities = (recentActivity ?? []).filter(
      (activity) => activity.type === 'submission'
    )

    // Weekly activity summary
    const weeklyActivity: WeeklyActivityItem[] = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const dateKey = date.toISOString().slice(0, 10)
      const daily = submissionActivities.filter((a) => a.created_at.startsWith(dateKey))
      return {
        day: weekNames[date.getDay()],
        '提交': daily.length,
        '通过': daily.filter((a) => a.status === 'accepted').length,
      }
    })

    const solvedThisWeek = weeklyActivity.reduce((s, i) => s + i['通过'], 0)
    const totalWeeklySubmissions = weeklyActivity.reduce((s, i) => s + i['提交'], 0)

    // Heatmap grid
    const today = new Date()
    const startGridDate = new Date(today)
    startGridDate.setDate(today.getDate() - 364)
    startGridDate.setDate(startGridDate.getDate() - startGridDate.getDay())

    const getLocalDateKey = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }

    const submissionMap = new Map<string, { count: number; accepted: number }>()
    submissionActivities.forEach((a) => {
      const key = getLocalDateKey(new Date(a.created_at))
      const existing = submissionMap.get(key) || { count: 0, accepted: 0 }
      existing.count += 1
      if (a.status === 'accepted') existing.accepted += 1
      submissionMap.set(key, existing)
    })

    // Build 53 weeks × 7 days
    const weeks: WeekColumn[] = []
    const tempDate = new Date(startGridDate)
    for (let w = 0; w < 53; w++) {
      const days: DayCell[] = []
      for (let d = 0; d < 7; d++) {
        const dateKey = getLocalDateKey(tempDate)
        const stats = submissionMap.get(dateKey) || { count: 0, accepted: 0 }
        days.push({ dateKey, count: stats.count, accepted: stats.accepted })
        tempDate.setDate(tempDate.getDate() + 1)
      }
      weeks.push({ days })
    }

    // Month labels
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const monthLabels: { index: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, index) => {
      // Reconstruct the date from startGridDate + index*7
      const weekStartDate = new Date(startGridDate)
      weekStartDate.setDate(weekStartDate.getDate() + index * 7)
      const currentMonth = weekStartDate.getMonth()
      if (currentMonth !== lastMonth) {
        monthLabels.push({ index, label: monthNames[currentMonth] })
        lastMonth = currentMonth
      }
    })

    return {
      weeklyActivity,
      solvedThisWeek,
      totalWeeklySubmissions,
      weeks,
      monthLabels,
    }
  }, [recentActivity])

  return {
    userStats,
    recentActivity,
    recommendedProblems,
    statsLoading,
    statsError,
    ...computations,
  }
}
