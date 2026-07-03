/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#05060a',
        panel: '#0d0f18',
        neuron: '#6ee7ff',
        neuron2: '#a78bfa',
        pulse: '#34d399',
        warn: '#fbbf24',
        alert: '#fb7185',
      },
      boxShadow: {
        glow: '0 0 40px rgba(110, 231, 255, 0.35)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
