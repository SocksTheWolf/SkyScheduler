/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      {
        'emerald': {
          'primary': '#66cc8a',
          'primary-focus': '#41be6d',
          'primary-content': '#f9fafb',

          'secondary': '#377cfb',
          'secondary-focus': '#055bfa',
          'secondary-content': '#f9fafb',

          'accent': '#ea5234',
          'accent-focus': '#d03516',
          'accent-content': '#f9fafb',

          'neutral': '#333c4d',
          'neutral-focus': '#1f242e',
          'neutral-content': '#f9fafb',

          'base-100': '#ffffff',
          'base-200': '#f9fafb',
          'base-300': '#f0f0f0',
          'base-content': '#333c4d',

          'info': '#1c92f2',
          'success': '#009485',
          'warning': '#ff9900',
          'error': '#ff5724',

          '--rounded-box': '1rem',
          '--rounded-btn': '.5rem',
          '--rounded-badge': '1.9rem',

          '--animation-btn': '0',
          '--animation-input': '0',

          '--btn-text-case': 'uppercase',
          '--navbar-padding': '.5rem',
          '--border-btn': '1px',
        },
      }
    ],
    logs: false
  },
  plugins: [
    require('daisyui')
  ],
}

