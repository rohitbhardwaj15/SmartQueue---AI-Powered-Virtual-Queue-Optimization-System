/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#090b12'
      },
      boxShadow: {
        glow: '0 10px 30px rgba(0, 255, 200, 0.2)'
      }
    }
  },
  plugins: []
};
