import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getStoredTheme, setTheme, watchSystemTheme } from '@/shared/lib/theme-persistence';

type Theme = 'light' | 'dark' | 'system';

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getStoredTheme);
  useEffect(() => {
    const unsubscribe = watchSystemTheme(() => {
      // System theme changed, component will re-render
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-lg glass-subtle',
        className
      )}
    >
      {themes.map(({ value, icon: Icon, label }) => {
        const isActive = currentTheme === value;
        return (
          <button
            key={value}
            onClick={() => handleThemeChange(value)}
            className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive && 'bg-primary text-primary-foreground shadow-sm'
            )}
            title={label}
            aria-label={`Switch to ${label} theme`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
