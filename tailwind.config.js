/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      "corporate"
    ],
    base: true,
    styled: true,
    utils: true,
    logs: false
  },
  plugins: [
    require('daisyui')
  ],
}

