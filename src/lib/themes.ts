export type PaletteId = 'aurora' | 'blossom' | 'midnight' | 'slate' | 'neon' | 'ocean';

export interface Palette {
  id: PaletteId;
  name: string;
  emoji: string;
  gradientA: string;
  gradientB: string;
  persona: string;
}

export const PALETTES: Palette[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '✨',
    gradientA: '#c77dff',
    gradientB: '#7b2ff7',
    persona: 'Girls',
  },
  {
    id: 'blossom',
    name: 'Blossom',
    emoji: '🌸',
    gradientA: '#ff4d6d',
    gradientB: '#ffb347',
    persona: 'Girls',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    gradientA: '#4facfe',
    gradientB: '#00f2fe',
    persona: 'Students',
  },
  {
    id: 'slate',
    name: 'Slate Pro',
    emoji: '💼',
    gradientA: '#6366f1',
    gradientB: '#0ea5e9',
    persona: 'Freelancers',
  },
  {
    id: 'neon',
    name: 'Neon',
    emoji: '⚡',
    gradientA: '#00d2ff',
    gradientB: '#e100ff',
    persona: 'Freelancers',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🔷',
    gradientA: '#1d4ed8',
    gradientB: '#1e40af',
    persona: 'Universal',
  },
];

export const DEFAULT_PALETTE: PaletteId = 'ocean';
