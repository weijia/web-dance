/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00f3ff',
        'neon-pink': '#ff00ff',
        'neon-green': '#00ff66',
        'cyber-black': '#0a0a0f',
        'cyber-dark': '#121218',
        'cyber-gray': '#1e1e2a',
      },
      fontFamily: {
        'cyber': ['Orbitron', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 5px #00f3ff, 0 0 10px #00f3ff',
        'neon-pink': '0 0 5px #ff00ff, 0 0 10px #ff00ff',
        'neon-green': '0 0 5px #00ff66, 0 0 10px #00ff66',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 5px #00f3ff, 0 0 10px #00f3ff' },
          '100%': { textShadow: '0 0 10px #00f3ff, 0 0 20px #00f3ff, 0 0 30px #00f3ff' },
        }
      },
      backgroundImage: {
        'cyber-grid': "url('/src/assets/images/cyber-grid.svg')",
      }
    },
  },
  plugins: [],
}