module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef5ff',
          100: '#dce9ff',
          200: '#b8d4ff',
          300: '#7eb3ff',
          400: '#3d8fff',
          500: '#0062ff',
          600: '#0052db',
          700: '#0043b7',
          800: '#003494',
          900: '#002a78',
        },
        accent: {
          50: '#fff0f7',
          100: '#ffe4f0',
          200: '#ffc8e0',
          300: '#ff9bd4',
          400: '#ff6fc4',
          500: '#ff4ab8',
          600: '#f8239f',
          700: '#d91f82',
          800: '#b01b6d',
          900: '#8f185a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 20px 40px rgba(0, 98, 255, 0.15)',
      },
    },
  },
  plugins: [],
};
