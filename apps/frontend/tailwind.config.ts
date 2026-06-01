import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F6F9',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#EEF1F6',
          3: '#E3E7EF',
        },
        text: {
          1: '#0D0F14',
          2: '#4A5068',
          3: '#8C93A8',
        },
        accent: {
          DEFAULT: '#1E40AF',
          light: '#EFF6FF',
          mid: '#BFDBFE',
        },
        teal: {
          DEFAULT: '#1E40AF',
          light: '#EFF6FF',
        },
        amber: {
          DEFAULT: '#854F0B',
          light: '#FAEEDA',
        },
        coral: {
          DEFAULT: '#993C1D',
          light: '#FAECE7',
        },
        purple: {
          DEFAULT: '#534AB7',
          light: '#EEEDFE',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
        md: '14px',
        lg: '15px',
        xl: '20px',
      },
    },
  },
  plugins: [],
}

export default config
