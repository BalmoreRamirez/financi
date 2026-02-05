import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: '#4C869F',
        ink: '#0B3145',
        cloud: '#F4F6F8',
      },
      boxShadow: {
        card: '0 20px 45px -30px rgba(7, 24, 57, 0.6)',
      },
    },
  },
  plugins: [],
}

