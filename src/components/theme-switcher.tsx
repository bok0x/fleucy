'use client';

import { Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PALETTES } from '@/lib/themes';
import { usePalette } from '@/providers/palette-provider';

export function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const { paletteId, setPalette } = usePalette();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Palette swatches */}
      <div
        className="flex gap-1.5 overflow-hidden transition-all duration-200"
        style={{ maxWidth: collapsed ? 40 : 200 }}
      >
        {collapsed ? (
          <Palette className="size-5 text-[var(--color-muted)]" />
        ) : (
          PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => setPalette(p.id)}
              className="size-6 flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                background: `linear-gradient(135deg, ${p.gradientA}, ${p.gradientB})`,
                boxShadow:
                  paletteId === p.id
                    ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${p.gradientA}`
                    : 'none',
              }}
            />
          ))
        )}
      </div>

      {/* Dark / Light toggle */}
      {!collapsed && (
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-white/5"
        >
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
      )}
    </div>
  );
}
