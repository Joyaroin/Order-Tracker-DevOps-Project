/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        beige: '#F5E6D3',
        maroon: '#800020',
        'maroon-light': '#A0304F',
        'deep-red': '#8B0000',
        'warm-gray': '#6B5B4F',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'highlight': {
          '0%': { backgroundColor: '#FEF3C7' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'highlight': 'highlight 2s ease-out',
      },
    },
  },
  plugins: [],
};
