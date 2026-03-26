import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '@/services/searchApi'
import type { SearchSuggestion } from '@/types/search'

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export function SearchBar({ placeholder = '搜索题目与讨论内容', className = '' }: SearchBarProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced suggestions fetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true)
        try {
          const response = await searchApi.getSuggestions(query)
          setSuggestions(response.suggestions)
          setShowSuggestions(true)
        } catch (error) {
          console.error('Failed to fetch suggestions:', error)
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setShowSuggestions(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tag') {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}&type=all`)
    } else if (suggestion.type === 'category') {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}&type=discussion`)
    }
    setShowSuggestions(false)
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'tag':
        return <span className="material-icons text-sm text-text-muted">label</span>
      case 'category':
        return <span className="material-icons text-sm text-text-muted">folder</span>
      default:
        return <span className="material-icons text-sm text-text-muted">history</span>
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <span className="material-icons text-xl">search</span>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.length >= 2) setShowSuggestions(true)
            }}
            placeholder={placeholder}
            aria-label="站内搜索"
            className="block w-full rounded-[16px] border border-[rgba(195,198,214,0.28)] bg-[linear-gradient(180deg,rgba(247,249,255,0.98)_0%,rgba(237,241,255,0.96)_100%)] py-3 pl-11 pr-16 text-sm font-medium text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_24px_rgba(19,27,46,0.04)] placeholder:text-[#93a0bb] outline-none transition-all duration-200 focus:border-[rgba(12,86,208,0.24)] focus:bg-white focus:ring-4 focus:ring-[rgba(12,86,208,0.08)]"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                className="p-1 text-text-muted hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <span className="material-icons text-lg">close</span>
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-text-muted bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (query.length >= 2 || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-text-muted">正在加载建议...</div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                >
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.text}
                    </div>
                    <div className="text-xs text-text-muted capitalize">
                      {suggestion.type === 'tag' ? '标签' : suggestion.type === 'category' ? '分类' : '历史'} • {suggestion.count} 条结果
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-text-muted">没有找到相关建议</div>
          ) : (
            <div className="px-4 py-3 text-sm text-text-muted">
              输入关键词后即可搜索题目和讨论...
            </div>
          )}

          {/* Quick search options */}
          {query && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
              <div className="mb-2 text-xs text-text-muted">搜索范围：</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}&type=all`)
                    setShowSuggestions(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}&type=problem`)
                    setShowSuggestions(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  题目
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}&type=discussion`)
                    setShowSuggestions(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  讨论
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
