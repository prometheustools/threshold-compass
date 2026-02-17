import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // NEW: Scientific Instrument Palette
        'base': '#0a0e1a',        // Deep navy background
        'surface': '#111827',      // Card backgrounds
        'elevated': '#1c2333',     // Elevated cards, hover states
        'raised': '#2a3347',       // Highest elevation
        
        // Text
        'ivory': '#e8eaf0',        // Primary text
        'bone': '#8892a4',         // Secondary text
        'ash': '#4a5568',          // Muted text
        
        // NEW: Amber/Gold Accent (replaces orange)
        'amber': '#d4a843',
        'amber-glow': 'rgba(212, 168, 67, 0.25)',
        'ember': '#2a3347',        // Subtle borders
        
        // North Star Colors
        'clarity': '#d4a843',      // Gold
        'connection': '#60a5fa',   // Blue
        'creativity': '#a78bfa',   // Violet
        'calm': '#34d399',         // Mint
        'exploration': '#f472b6',  // Pink
        
        // Status (carryover tiers)
        'status-clear': '#34d399',   // Mint green
        'status-mild': '#d4a843',    // Amber
        'status-moderate': '#f59e0b', // Orange
        'status-elevated': '#ef4444', // Red
        
        // Legacy colors for compatibility
        'orange': '#d4a843',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'instrument': '2px',
        'card': '12px',
        'button': '8px',
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
      boxShadow: {
        'glow-amber': '0 0 40px rgba(212, 168, 67, 0.15)',
        'glow-clarity': '0 0 40px rgba(212, 168, 67, 0.2)',
        'glow-connection': '0 0 40px rgba(96, 165, 250, 0.2)',
        'glow-creativity': '0 0 40px rgba(167, 139, 250, 0.2)',
        'glow-calm': '0 0 40px rgba(52, 211, 153, 0.2)',
      },
    },
  },
  plugins: [],
}

export default config
