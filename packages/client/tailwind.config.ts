import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        brand: {
          navy: 'var(--theme-color-brand-navy)',
          blue: 'var(--theme-color-brand-blue)',
          stocks: 'var(--theme-color-asset-stocks)',
          bonds: 'var(--theme-color-asset-bonds)',
          cash: 'var(--theme-color-asset-cash)',
          surface: 'var(--theme-color-surface-secondary)',
          border: 'var(--theme-color-border-primary)',
          panel: 'var(--theme-color-surface-muted)',
        },
      },
      boxShadow: {
        panel: 'var(--theme-shadow-panel)',
      },
    },
  },
  plugins: [],
} satisfies Config;
