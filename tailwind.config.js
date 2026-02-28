/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'background-dark': '#020202',
      },
      letterSpacing: {
        ultra: '0.5em',
        tightest: '-0.06em',
      },
    },
  },
  plugins: [],
}
