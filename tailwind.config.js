/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette ispirata al logo HUMOTION
        brand: {
          blue: '#1D4ED8',    // blu profondo
          light: '#60A5FA',   // azzurro del gradiente
          cyan: '#67E8F9',    // accento chiaro
          dark: '#111827',    // quasi-nero per testi
          gray: '#6B7280',    // grigio sottotitoli
          white: '#FFFFFF'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}





