/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#101814',
          blue: '#B91C36',
          cyan: '#FB7185',
          light: '#F5F7F4',
          success: '#B91C36',
          danger: '#DC2626',
          warning: '#FACC15',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(16, 24, 20, 0.10)',
      },
    },
  },
  plugins: [],
};

