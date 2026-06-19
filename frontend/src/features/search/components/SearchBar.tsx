import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, History, Search, Tag, X } from 'lucide-react'
import { searchApi } from '@/features/search/services/searchApi'
import type { SearchSuggestion } from '@/features/search/types/search'

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export function SearchBar({ placeholder = 'Search problems and discussions...', className = '' }: SearchBarProps) {
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
        return <Tag className="h-4 w-4 text-text-muted" />
      case 'category':
        return <Folder className="h-4 w-4 text-text-muted" />
      default:
        return <History className="h-4 w-4 text-text-muted" />
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Search className="h-5 w-5" />
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
            className="block w-full pl-10 pr-12 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
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
                className="p-1 text-text-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-text-muted bg-secondary border border-border rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (query.length >= 2 || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-text-muted">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3"
                >
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {suggestion.text}
                    </div>
                    <div className="text-xs text-text-muted capitalize">
                      {suggestion.type} • {suggestion.count} results
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-text-muted">No suggestions found</div>
          ) : (
            <div className="px-4 py-3 text-sm text-text-muted">
              Type to search problems and discussions...
            </div>
          )}

          {/* Quick search options */}
          {query && (
            <div className="border-t border-border px-4 py-2">
              <div className="text-xs text-text-muted mb-2">Search in:</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}&type=all`)
                    setShowSuggestions(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-muted transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}&type=problem`)
                    setShowSuggestions(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-muted transition-colors"
                >
                  Problems
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}&type=discussion`)
                    setShowSuggestions(false)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-muted transition-colors"
                >
                  Discussions
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
