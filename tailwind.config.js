/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#101814',
          blue: '#0F7A4D',
          cyan: '#57D68D',
          light: '#F5F7F4',
          success: '#16A34A',
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
