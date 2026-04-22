import { useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'

const languages = [
  { id: 'cpp', name: 'C++', extension: 'cpp', icon: '🔷' },
  { id: 'java', name: 'Java', extension: 'java', icon: '☕' },
  { id: 'python', name: 'Python 3', extension: 'py', icon: '🐍' },
  { id: 'javascript', name: 'JavaScript', extension: 'js', icon: '📜' },
  { id: 'rust', name: 'Rust', extension: 'rs', icon: '🦀' },
  { id: 'go', name: 'Go', extension: 'go', icon: '🐹' },
  { id: 'csharp', name: 'C#', extension: 'cs', icon: '💜' },
  { id: 'ruby', name: 'Ruby', extension: 'rb', icon: '💎' },
]

interface LanguageSelectorProps {
  selectedLanguage: string
  onLanguageChange: (languageId: string) => void
  disabled?: boolean
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLanguageData = languages.find((lang) => lang.id === selectedLanguage)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="text-lg">{selectedLanguageData?.icon}</span>
        <span className="font-medium">{selectedLanguageData?.name}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 下拉菜单 */}
          <div className="absolute z-20 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  onClick={() => {
                    onLanguageChange(language.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    selectedLanguage === language.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-lg">{language.icon}</span>
                  <span className="font-medium">{language.name}</span>
                  {selectedLanguage === language.id && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
