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
        zoomIn: {
          '0%': { transform: 'scale(3)', opacity: '0' },
          '60%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%': { transform: 'scale(0.3) rotate(0deg)', opacity: '0' },
          '25%': { transform: 'scale(1.2) rotate(-4deg)', opacity: '1' },
          '35%': { transform: 'scale(1.1) rotate(4deg)' },
          '45%': { transform: 'scale(1.1) rotate(-3deg)' },
          '55%': { transform: 'scale(1.05) rotate(2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        flash: {
          '0%, 20%, 40%': { filter: 'brightness(1.8)' },
          '10%, 30%, 100%': { filter: 'brightness(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-150%)', opacity: '0' },
          '15%, 85%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-150%)', opacity: '0' },
        },
      },
      animation: {
        fall: 'fall linear forwards',
        pop: 'pop 0.5s ease-out both',
        'spin-slow': 'spinSlow 3s linear infinite',
        'zoom-in': 'zoomIn 0.45s ease-out both',
        shake: 'shake 0.7s ease-out both',
        flash: 'flash 1s ease-out both',
        'slide-down': 'slideDown 2.4s ease-in-out both',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
