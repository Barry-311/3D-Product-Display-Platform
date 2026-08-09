/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: 'var(--color-bg)',
          panel: 'var(--color-panel)',
          panelAlt: 'var(--color-panel-alt)',
          border: 'var(--color-border)',
          accent: 'var(--color-accent)',
          accentDim: 'var(--color-accent-dim)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          danger: 'var(--color-danger)',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
