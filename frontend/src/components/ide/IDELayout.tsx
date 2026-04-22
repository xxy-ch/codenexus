import { useState, useEffect, useCallback } from 'react'
import { Clock, Cpu, Type, WrapText, Play, Lightbulb, AlertTriangle, CheckCircle, Info, FileText, Code2, Scale, Keyboard, History, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface IDELayoutProps {
  problemTitle: string
  language: string
  code: string
  onLanguageChange: (language: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  timeLimit: number
  memoryLimit: number
  languages: Array<{ id: string; name: string; icon: string; version: string; extension?: string }>
  children?: React.ReactNode
}

export function IDELayout({
  problemTitle,
  language,
  code,
  onLanguageChange,
  onSubmit,
  isSubmitting,
  timeLimit,
  memoryLimit,
  languages,
  children,
}: IDELayoutProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(40)
  const [isResizing, setIsResizing] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'examples' | 'constraints'>('description')
  const [fontSize, setFontSize] = useState(14)
  const [wordWrap, setWordWrap] = useState(false)

  const handleMouseDown = () => {
    setIsResizing(true)
  }

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = document.getElementById('ide-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftPanelWidth(newLeftWidth)
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      id="ide-container"
      className="flex flex-col h-[calc(100vh-8rem)]"
      onMouseUp={handleMouseUp}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {problemTitle}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4" />
            <span>{timeLimit}ms</span>
            <Cpu className="w-4 h-4" />
            <span>{memoryLimit}MB</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 编辑器设置 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize(fontSize === 14 ? 16 : fontSize === 16 ? 18 : 14)}
              className="text-xs px-2"
            >
              <Type className="w-4 h-4" />
              {fontSize}px
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWordWrap(!wordWrap)}
              className={cn(
                'text-xs px-2',
                wordWrap && 'bg-primary/10 text-primary'
              )}
            >
              <WrapText className="w-4 h-4" />
            </Button>
          </div>

          {/* 提交按钮 */}
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={isSubmitting || !code.trim()}
            className="font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                提交中...
              </span>
            ) : (
              <span className="flex items-center">
                <Play className="w-4 h-4 mr-2" />
                提交代码
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧面板 - 题目信息 */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="bg-white dark:bg-slate-900 rounded-l-xl border border-t border-b border-l border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* 标签页 */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => setActiveTab('description')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'description'
                  ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              题目描述
            </button>
            <button
              onClick={() => setActiveTab('examples')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'examples'
                  ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Code2 className="w-4 h-4 inline mr-1" />
              示例
            </button>
            <button
              onClick={() => setActiveTab('constraints')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'constraints'
                  ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Scale className="w-4 h-4 inline mr-1" />
              约束条件
            </button>
          </div>

          {/* 标签页内容 */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'description' && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        提示
                      </h4>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        在编码之前仔细思考问题。将问题分解为更小的部分。
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-base font-semibold">题目描述</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    通过实现高效的算法来解决问题。注意时间和内存约束。
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-semibold mb-2">输入格式</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      第一行包含一个整数 n (1 ≤ n ≤ 10^5)
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">输出格式</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      输出结果为整数
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      示例 1
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">输入：</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        5
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">输出：</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        120
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">解释：</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        输入为 5，期望输出为 120。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      示例 2
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">输入：</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        10
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">输出：</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        550
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        约束条件
                      </h4>
                      <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 mt-2">
                        <li>• 时间限制：{timeLimit}ms</li>
                        <li>• 内存限制：{memoryLimit}MB</li>
                        <li>• 输入大小：≤ 10^6</li>
                        <li>• 栈限制：256MB</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3">注意事项</h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>对于大量输入/输出使用快速 I/O 方法</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>避免不必要的内存分配</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>考虑边界情况和边界条件</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Info className="w-4 h-4" />
                      <span>所有测试用例都包含在评估中</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4">
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    复杂度要求
                  </h4>
                  <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                    <p>• 时间复杂度：O(n log n) 或更好</p>
                    <p>• 空间复杂度：O(n) 或更好</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 调整大小手柄 */}
        <div
          className="w-1 bg-slate-200 dark:bg-slate-700 hover:bg-primary cursor-col-resize transition-colors relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 h-8 bg-primary rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>

        {/* 右侧面板 - 代码编辑器 */}
        <div
          style={{ width: `${100 - leftPanelWidth}%` }}
          className="bg-white dark:bg-slate-900 rounded-r-xl border border-t border-b border-r border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* 编辑器头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.icon} {lang.name} ({lang.version})
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                {problemTitle}.{languages.find((l) => l.id === language)?.extension}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Ctrl+S：保存</span>
            </div>
          </div>

          {/* Monaco 编辑器容器 */}
          <div className="flex-1">
            {children}
          </div>

          {/* 编辑器底部 */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>行 {code.split('\n').length}, 列 {code.split('\n').pop()?.length || 0}</span>
              <span>UTF-8</span>
              <span>{languages.find((l) => l.id === language)?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span>自动保存</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
