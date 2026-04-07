/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orbitSpace: '#0a0118',
        orbitCyan: '#00f5ff',
        orbitPurple: '#8b5cf6',
        orbitPink: '#ec4899',
      },
      boxShadow: {
        'neonCyan': '0 0 20px rgba(0, 245, 255, 0.4)',
        'neonPink': '0 0 20px rgba(236, 72, 153, 0.4)',
        'neonPurple': '0 0 20px rgba(139, 92, 246, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
