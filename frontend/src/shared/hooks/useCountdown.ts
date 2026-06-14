import { useState, useEffect } from 'react'

interface FormattedTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const formatTime = (ms: number): FormattedTime => {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

const useCountdown = (endTime: string, intervalMs: number = 1000) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now()
      setTimeLeft(Math.max(0, diff))
    }

    update()
    const timer = setInterval(update, intervalMs)
    return () => clearInterval(timer)
  }, [endTime, intervalMs])

  return { timeLeft, formattedTime: formatTime(timeLeft) }
}

export default useCountdown
