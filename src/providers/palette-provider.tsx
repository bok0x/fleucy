'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_PALETTE, type PaletteId } from '@/lib/themes';

const STORAGE_KEY = 'fleucy-palette';

interface PaletteContextValue {
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  paletteId: DEFAULT_PALETTE,
  setPalette: () => {},
});

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as PaletteId | null;
    const initial = stored ?? DEFAULT_PALETTE;
    setPaletteState(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteState(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute('data-theme', id);
  }, []);

  return (
    <PaletteContext.Provider value={{ paletteId, setPalette }}>{children}</PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}
