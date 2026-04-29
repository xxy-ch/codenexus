/**
 * Global Notification Provider
 * Displays real-time notifications from WebSocket
 */

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useNotifications } from '@/hooks/useWebSocket'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, clear } = useNotifications()

  useEffect(() => {
    // Clear old notifications periodically
    const interval = setInterval(() => {
      if (notifications.length > 50) {
        clear()
      }
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [notifications.length, clear])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#26251e',
            color: '#f2f1ed',
            padding: '12px 16px',
            borderRadius: '8px',
            maxWidth: '400px',
          },
          success: {
            iconTheme: {
              primary: '#1f8a65',
              secondary: '#f2f1ed',
            },
          },
          error: {
            iconTheme: {
              primary: '#cf2d56',
              secondary: '#f2f1ed',
            },
          },
        }}
      />
      {children}
    </>
  )
}
