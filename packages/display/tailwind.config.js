/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0a0a1a',
        secondary: '#12122a',
        accent: '#e94560',
        gold: '#ffd700',
        neon: {
          blue: '#00d4ff',
          pink: '#ff6ec7',
          green: '#39ff14',
          purple: '#bf5af2',
        },
      },
    },
  },
  plugins: [],
};
