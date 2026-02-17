import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { materialSymbols } from '@/utils/materialSymbols'

interface IDELayoutProps {
  problemTitle: string
  problemId: string
  language: string
  onLanguageChange: (language: string) => void
  code: string
  onCodeChange: (code: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  timeLimit: number
  memoryLimit: number
  languages: Array<{ id: string; name: string; icon: string; version: string }>
  children?: React.ReactNode
}

export function IDELayout({
  problemTitle,
  problemId,
  language,
  onLanguageChange,
  code,
  onCodeChange,
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

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return

    const container = document.getElementById('ide-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftPanelWidth(newLeftWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  // 监听鼠标事件
  if (isResizing) {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      id="ide-container"
      className="flex flex-col h-[calc(100vh-8rem)]"
      onMouseUp={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {problemTitle}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{timeLimit}ms</span>
            <span className="material-symbols-outlined text-sm">memory</span>
            <span>{memoryLimit}MB</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Editor Settings */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize(fontSize === 14 ? 16 : fontSize === 16 ? 18 : 14)}
              className="text-xs px-2"
            >
              <span className="material-symbols-outlined text-base">text_fields</span>
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
              <span className="material-symbols-outlined text-base">wrap_text</span>
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={isSubmitting || !code.trim()}
            className="font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </span>
            ) : (
              <span className="flex items-center">
                <span className="material-symbols-outlined mr-2">play_arrow</span>
                Submit Code
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Problem Info */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="bg-white dark:bg-slate-900 rounded-l-xl border border-t border-b border-l border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Tabs */}
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
              <span className="material-symbols-outlined text-base mr-1">description</span>
              Description
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
              <span className="material-symbols-outlined text-base mr-1">code</span>
              Examples
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
              <span className="material-symbols-outlined text-base mr-1">rule</span>
              Constraints
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'description' && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl mt-0.5">
                      lightbulb
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Hint
                      </h4>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        Think about the problem carefully before coding. Break down the problem into smaller parts.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-base font-semibold">Problem Description</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Solve the problem by implementing an efficient algorithm. Pay attention to the time and memory constraints.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-semibold mb-2">Input Format</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      First line contains an integer n (1 ≤ n ≤ 10^5)
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Output Format</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      Print the result as an integer
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
                      Example 1
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Input:</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        5
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Output:</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        120
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Explanation:</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        The input is 5, and the expected output is 120.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Example 2
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Input:</p>
                      <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono">
                        10
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Output:</p>
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
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl mt-0.5">
                      warning
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        Constraints
                      </h4>
                      <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 mt-2">
                        <li>• Time Limit: {timeLimit}ms</li>
                        <li>• Memory Limit: {memoryLimit}MB</li>
                        <li>• Input size: ≤ 10^6</li>
                        <li>• Stack limit: 256MB</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3">Notes</h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Use fast I/O methods for large input/output</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Avoid unnecessary memory allocations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Consider edge cases and boundary conditions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>All test cases are included in the evaluation</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4">
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Complexity Requirements
                  </h4>
                  <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                    <p>• Time Complexity: O(n log n) or better</p>
                    <p>• Space Complexity: O(n) or better</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-slate-200 dark:bg-slate-700 hover:bg-primary cursor-col-resize transition-colors relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 h-8 bg-primary rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div
          style={{ width: `${100 - leftPanelWidth}%` }}
          className="bg-white dark:bg-slate-900 rounded-r-xl border border-t border-b border-r border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Editor Header */}
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
              <span className="material-symbols-outlined text-sm text-slate-400">
                keyboard_shortcuts
              </span>
              <span className="text-xs text-slate-500">Ctrl+S: Save</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1">
            {children}
          </div>

          {/* Editor Footer */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>Ln {code.split('\n').length}, Col {code.split('\n').pop()?.length || 0}</span>
              <span>UTF-8</span>
              <span>{languages.find((l) => l.id === language)?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">history</span>
              <span>Auto-saved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}