/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                display: ['Instrument Serif', 'serif'],
            },
            colors: {
                primary: 'var(--text-primary)',
                secondary: 'var(--text-secondary)',
                accent: 'var(--text-accent)',
            }
        },
    },
    plugins: [],
}
