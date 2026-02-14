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
          navy: '#1A365D',
          stocks: '#4A90D9',
          bonds: '#2EAD8E',
          cash: '#D9A441',
          surface: '#F8F9FB',
          border: '#D9DFEA',
          panel: '#EEF2F8',
        },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(26, 54, 93, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
