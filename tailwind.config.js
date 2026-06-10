/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        burger: {
          black: '#07090d',
          gunmetal: '#10141c',
          gold: '#ffbf3f',
          orange: '#ff6a1a',
          ketchup: '#ff2f2f',
          blue: '#24d6ff'
        }
      },
      fontFamily: {
        display: ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        neon: '0 0 24px rgba(36, 214, 255, 0.38), inset 0 0 18px rgba(255, 191, 63, 0.12)',
        gold: '0 0 28px rgba(255, 191, 63, 0.42)'
      }
    }
  },
  plugins: []
};
