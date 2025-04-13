/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pantone-313u': '#00B5E2', // RGB: 0, 181, 226
        'pantone-311u': '#61D6EB', // RGB: 97, 214, 235
        'pantone-314c': '#0083A9', // RGB: 0, 131, 169
        'pantone-311c': '#2DCCE5', // RGB: 45, 204, 229
      },
    },
  },
  plugins: [],
}
