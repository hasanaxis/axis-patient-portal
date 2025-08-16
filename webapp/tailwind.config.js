/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Axis Imaging Brand Colors (from brand guide)
        axis: {
          magenta: '#EC008C',
          'light-purple': '#B41E8E', 
          'dark-purple': '#662D91',
          'royal-blue': '#262262',
          green: '#00A496',
          blue: '#006CB3',
          charcoal: '#3C4247',
          'grey-mid': '#606A70',
          'grey-light': '#C4CED4',
        },
        primary: {
          50: '#fdf2ff',
          100: '#fce8ff',
          200: '#f9d1ff',
          300: '#f5a8ff',
          400: '#ee6fff',
          500: '#EC008C', // Official Axis Magenta
          600: '#B41E8E', // Official Axis Light Purple
          700: '#662D91', // Official Axis Dark Purple
          800: '#262262', // Official Axis Royal Blue
          900: '#1a1849',
          950: '#0f0d2e',
        },
        secondary: {
          50: '#f0fffe',
          100: '#ccfffe',
          200: '#9ffffe',
          300: '#62fffd',
          400: '#1efff9',
          500: '#00A496', // Official Axis Green
          600: '#006CB3', // Official Axis Blue
          700: '#0056a0',
          800: '#084682',
          900: '#0c3b6d',
          950: '#042849',
        },
        success: {
          50: '#ecfffe',
          100: '#cffffe', 
          200: '#a5fffe',
          300: '#67fffe',
          400: '#22f4f4',
          500: '#00A496', // Official Axis Green
          600: '#00b8a5',
          700: '#009284',
          800: '#07746a',
          900: '#0b615a',
          950: '#003d37',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Medical semantic colors
        critical: '#dc2626',
        warning: '#d97706',
        info: '#2563eb',
      },
      fontFamily: {
        sans: ['Deuterium Variable', 'Arial', 'system-ui', 'sans-serif'],
        axis: ['Deuterium Variable', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'medical': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'medical-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'axis': '0 4px 20px rgba(236, 10, 140, 0.15)',
      },
      borderRadius: {
        'medical': '0.75rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-medical': 'pulseMedical 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseMedical: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}