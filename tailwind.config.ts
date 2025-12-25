import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        ivory: '#F5F2E9',
        charcoal: '#2D2D2D',
        black: '#000000',
        
        // Accents
        orange: {
          DEFAULT: '#E07A3E',
          light: '#F09060',
          dark: '#C06830',
        },
        violet: {
          DEFAULT: '#6B4E8D',
          light: '#8B6EAD',
          dark: '#4B2E6D',
        },
        
        // Semantic colors
        success: '#4CAF50',
        warning: '#FFD54F',
        caution: '#FF9800',
        danger: '#F44336',
        
        // UI colors
        border: '#333333',
        muted: '#666666',
        subtle: '#999999',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Custom sizes for the instrument aesthetic
        'data': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.05em' }],
        'label': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.1em' }],
      },
      spacing: {
        // Touch targets
        'touch': '44px',
      },
      borderRadius: {
        'compass': '50%',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'glow-orange': '0 0 20px rgba(224, 122, 62, 0.3)',
        'glow-violet': '0 0 20px rgba(107, 78, 141, 0.3)',
      },
      animation: {
        'needle': 'needle 0.8s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'breathe': 'breathe 8s ease-in-out infinite',
      },
      keyframes: {
        needle: {
          '0%': { transform: 'rotate(-30deg)' },
          '50%': { transform: 'rotate(10deg)' },
          '75%': { transform: 'rotate(-5deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      backgroundImage: {
        'grain': "url('/textures/grain.png')",
        'scanline': "url('/textures/scanline.png')",
      },
    },
  },
  plugins: [],
}

export default config
