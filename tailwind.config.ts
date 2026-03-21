// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#0a0f0a',
        surface: '#0d150d',
        raised:  '#111a11',
        accent:  '#6ee89a',
        'text-primary':   '#edeae0',
        'text-secondary': '#8a9e82',
        'text-muted':     '#3a5a40',
        border:  'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
