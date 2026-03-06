import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        celadon: {
          50: '#f2f6f3',
          100: '#e1ebe4',
          200: '#c5d7cd',
          300: '#9dbba8',
          400: '#759b83',
          500: '#567f67',
          600: '#426551',
          700: '#355141',
          800: '#2c4135',
          900: '#25362d',
        },
        ink: {
          50: '#f6f6f6',
          100: '#e7e7e6',
          200: '#d1d1d0',
          300: '#b0b0af',
          400: '#888886',
          500: '#6d6d6b',
          600: '#525250',
          700: '#434342',
          800: '#383837',
          900: '#1c1b19',
        },
        vermilion: {
          50: '#fdf3f2',
          100: '#fbe4e2',
          200: '#f6cdca',
          300: '#efaba5',
          400: '#e37a73',
          500: '#d24e46',
          600: '#bd3730',
          700: '#9e2a25',
          800: '#832622',
          900: '#6d2522',
        },
        ivory: {
          50: '#ffffff',
          100: '#fdfdfc',
          200: '#fbfbf9',
          300: '#f7f6f2',
          400: '#f2efe9',
          500: '#e8e5dc',
          600: '#d9d5c8',
          700: '#beb9a9',
          800: '#9d9888',
          900: '#827d6e',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'serif'],
      },
      aspectRatio: {
        'poster': '3 / 4',
        'portrait': '4 / 5',
        'square': '1 / 1',
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'gentle': '0 4px 20px -2px rgba(28,27,25,0.05)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
