/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: '#FAF7F3', deep: '#F4EFE8' },
        ink: {
          DEFAULT: '#1D1B19',
          soft: '#3E3A36',
          muted: '#726B62',
          faint: '#9C948A',
        },
        line: { DEFAULT: '#E9E2D9', strong: '#DAD1C5' },
        ember: {
          50: '#FDF4EE',
          100: '#FAE6D8',
          200: '#F3C9AC',
          300: '#EAA679',
          400: '#E08349',
          500: '#CE6526',
          600: '#B54E17',
          700: '#953C12',
          800: '#783014',
          900: '#632914',
        },
        sage: { 50: '#F1F6EF', 100: '#DDE9D8', 500: '#5E8C4A', 600: '#4A7139', 700: '#3A5A2C' },
        clay: { 50: '#FBF3F1', 100: '#F4E1DB', 500: '#B4463C', 600: '#96352C' },
        gold: { 50: '#FDF7EA', 100: '#F8EBCB', 500: '#C08A16', 600: '#9E6F0E' },
        sky: { 50: '#F1F6FB', 100: '#DDEBF7', 500: '#2F6FA8', 600: '#245A8A' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,27,25,0.04), 0 1px 3px rgba(29,27,25,0.03)',
        lift: '0 4px 14px rgba(29,27,25,0.07), 0 2px 4px rgba(29,27,25,0.04)',
        pop: '0 18px 48px rgba(29,27,25,0.16), 0 4px 10px rgba(29,27,25,0.07)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.97)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        ping2: { '75%,100%': { transform: 'scale(2)', opacity: 0 } },
      },
      animation: {
        'fade-up': 'fade-up .32s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .25s ease both',
        'scale-in': 'scale-in .18s cubic-bezier(.22,1,.36,1) both',
        'slide-in': 'slide-in .28s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
}
