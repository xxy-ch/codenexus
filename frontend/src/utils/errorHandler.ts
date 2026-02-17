import { useToast } from '@/components/ui/Toast'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
        return '请求参数错误，请检查输入'
      case 401:
        return '未授权，请先登录'
      case 403:
        return '没有权限访问此资源'
      case 404:
        return '请求的资源不存在'
      case 429:
        return '请求过于频繁，请稍后再试'
      case 500:
        return '服务器错误，请稍后重试'
      case 503:
        return '服务暂时不可用，请稍后重试'
      default:
        return error.message || '发生未知错误'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '发生未知错误，请稍后重试'
}

export function useErrorHandler() {
  const { showToast } = useToast()

  const handleError = (error: unknown, context?: string) => {
    const message = handleApiError(error)
    const fullMessage = context ? `${context}: ${message}` : message

    console.error('Error:', error)
    showToast({
      type: 'error',
      title: '错误',
      message: fullMessage,
    })
  }

  const handleSuccess = (message: string) => {
    showToast({
      type: 'success',
      title: '成功',
      message,
    })
  }

  return { handleError, handleSuccess }
}
