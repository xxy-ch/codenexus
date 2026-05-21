import { cn } from '@/lib/utils'
import useCountdown from '@/hooks/useCountdown'

interface ContestCountdownProps {
  endTime: string
  status: 'upcoming' | 'ongoing' | 'completed'
}

export function ContestCountdown({ endTime, status }: ContestCountdownProps) {
  const { formattedTime } = useCountdown(endTime)

  if (status === 'completed') return null

  const formatCountdown = () => {
    if (status === 'upcoming') {
      const { days, hours, minutes } = formattedTime
      if (days > 0) return `Starts in ${days}d ${hours}h`
      if (hours > 0) return `Starts in ${hours}h ${minutes}m`
      if (minutes > 0) return `Starts in ${minutes}m`
      return 'Starting soon'
    }

    if (status === 'ongoing') {
      const { hours, minutes } = formattedTime
      if (hours === 0 && minutes === 0) return 'Ending soon'
      return `${hours}h ${minutes}m left`
    }

    return null
  }

  const displayText = formatCountdown()
  if (!displayText) return null

  return (
    <div className={cn(
      'px-3 py-1.5 rounded-md text-xs font-medium',
      status === 'upcoming'
        ? 'bg-status-pending/10 text-status-pending'
        : 'bg-status-accepted/10 text-status-accepted'
    )}>
      {displayText}
    </div>
  )
}
