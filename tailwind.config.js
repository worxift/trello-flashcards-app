/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'ring-2',
    'ring-blue-500',
    'bg-gray-600',
    'bg-gray-700',
    'hover:bg-gray-600',
    'bg-blue-500',
    'bg-green-500',
    'text-xs',
    'text-gray-400',
    'px-2',
    'py-0.5',
    'rounded-full',
    'flex',
    'justify-between',
    'items-center'
  ]
}