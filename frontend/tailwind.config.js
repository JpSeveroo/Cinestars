/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#12141c',
        bg2: '#191c27',
        card: '#1f2330',
        line: '#2c3040',
        gold: '#e8b44c',
        teal: '#4fb3a2',
        text: '#f1eee6',
        'text-body': '#cfcdc6',
        muted: '#9a9fb0',
        danger: '#d9765a',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      aspectRatio: {
        '2/3': '2 / 3',
      },
      borderRadius: {
        pill: '20px',
      },
      maxWidth: {
        container: '1180px',
      },
    },
  },
  plugins: [],
}
