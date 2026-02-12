/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        gold: '#ffd700',
        neon: {
          blue: '#00d4ff',
          pink: '#ff6ec7',
          green: '#39ff14',
          purple: '#bf5af2',
        },
      },
      fontFamily: {
        game: ['"Noto Sans TC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
