import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /** Brand primary — logBee gold (#F0B010) */
        primary: {
          50: '#FFFAEB',
          100: '#FEF0C7',
          200: '#FCE08A',
          300: '#FAD04D',
          400: '#F5BC28',
          500: '#F0B010',
          600: '#E0A000',
          700: '#D08000',
          800: '#B06800',
          900: '#8A5200',
          950: '#5C3700',
        },
        /** Brand secondary — logBee navy (#002040) */
        navy: {
          50: '#E8EEF4',
          100: '#D1DDE9',
          200: '#A3BBD3',
          300: '#7599BD',
          400: '#4777A7',
          500: '#1A5080',
          600: '#003060',
          700: '#002040',
          800: '#001830',
          900: '#001030',
          950: '#000818',
        },
        cta: {
          50: '#FFFAEB',
          100: '#FEF0C7',
          500: '#F0B010',
          600: '#E0A000',
          700: '#D08000',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        phone: {
          green: '#22c55e',
          red: '#ef4444',
        },
      },
      fontFamily: {
        arabic: ['Tajawal', 'Cairo', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 2px 8px -2px rgb(15 23 42 / 0.06)',
        'card-hover': '0 8px 16px -4px rgb(15 23 42 / 0.1), 0 4px 8px -4px rgb(15 23 42 / 0.06)',
        header: '0 1px 0 0 rgb(0 32 64 / 0.08)',
      },
      keyframes: {
        'checkout-payment-hint-drift': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(4px)' },
        },
        'fab-complete-pulse': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'checkout-payment-hint': 'checkout-payment-hint-drift 3.5s ease-in-out infinite',
        'fab-complete-pulse': 'fab-complete-pulse 600ms ease-out 1',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-warning-500',
    'bg-primary-500',
    'bg-primary-600',
    'bg-navy-500',
    'bg-navy-600',
    'bg-navy-700',
    'bg-cta-600',
    'bg-success-600',
  ],
};

export default config;
