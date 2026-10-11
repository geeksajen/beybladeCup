/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Black Ops One"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0.8' },
        },
        pop: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '40%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fall: 'fall linear forwards',
        pop: 'pop 0.5s ease-out both',
        'spin-slow': 'spinSlow 3s linear infinite',
      },
    },
  },
  plugins: [],
};
