import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surface hierarchy (dark instrument aesthetic)
        'base': '#0A0A0A',
        'surface': '#121212',
        'elevated': '#1E1E1E',
        'raised': '#2A2A2A',

        // Text
        'ivory': '#F5F2E9',
        'bone': '#C4C0B6',
        'ash': '#8A8A8A',

        // Accent
        'orange': '#E07A3E',
        'ember': '#8B4D2C',

        // Status (carryover tiers)
        'status-clear': '#4A9B6B',
        'status-mild': '#C9A227',
        'status-moderate': '#D4682A',
        'status-elevated': '#B54A4A',

        // Secondary
        'magenta': '#9B4F7C',
        'violet': '#6B4E8D',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'instrument': '2px',
        'card': '8px',
        'button': '6px',
      },
      transitionDuration: {
        'settle': '800ms',
        'quick': '200ms',
      },
      transitionTimingFunction: {
        'settle': 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
      },
      spacing: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

export default config
