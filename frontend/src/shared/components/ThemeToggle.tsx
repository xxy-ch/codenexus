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
        'inline-flex items-center gap-1 border border-border bg-card p-1',
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
              'inline-flex h-8 w-8 items-center justify-center border border-transparent transition-colors duration-150',
              'hover:border-foreground hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive && 'border-foreground bg-primary text-primary-foreground'
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
