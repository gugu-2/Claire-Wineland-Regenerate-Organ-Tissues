/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bio: {
          dark: '#0b0f19',
          card: '#111827',
          border: '#1f293d',
          accent: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
          indigo: '#6366f1'
        }
      }
    },
  },
  plugins: [],
}
