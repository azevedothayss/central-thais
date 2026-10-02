/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FAF8F5',
          text: '#393342',
          primary: '#552A7B',
          accent: '#A56CFF',
          action: '#FF675C',
          'primary-light': '#552A7B1A',
          'accent-light': '#A56CFF1A',
          'action-light': '#FF675C1A',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

