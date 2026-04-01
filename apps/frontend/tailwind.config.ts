import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F6F3',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F2F1EE',
          3: '#ECEAE6',
        },
        text: {
          1: '#0F0F0E',
          2: '#5C5B58',
          3: '#9B9A97',
        },
        accent: {
          DEFAULT: '#1F3F8E',
          light: '#E8EDF8',
          mid: '#C5D3EE',
        },
        teal: {
          DEFAULT: '#0F6E56',
          light: '#E1F5EE',
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
