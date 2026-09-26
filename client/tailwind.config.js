/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep Maroon brand palette
        primary: {
          50:  '#fdf2f4',
          100: '#fbe5ea',
          200: '#f8ccd5',
          300: '#f2a3b3',
          400: '#e8728a',
          500: '#d94965',
          600: '#c22c4d',
          700: '#9e1f3c',
          800: '#7a1a31',
          900: '#5c1425',
          950: '#4A0E1A',
        },
        // Ivory surface palette
        ivory: {
          50:  '#FDFCFA',
          100: '#FBF9F5',
          200: '#F8F5EF',
          300: '#F0EBE1',
          400: '#E4DDD0',
          500: '#C8BFB0',
          600: '#A69E90',
          700: '#847C70',
          800: '#635C52',
          900: '#4A4540',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
