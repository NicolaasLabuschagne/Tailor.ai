/** @type {import('tailwindcss').Config} */

// App accent color. Values live as CSS variables in app/globals.css so the palette
// can be changed in one place; use `brand-*` classes instead of a fixed hue.
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [
    shade,
    `rgb(var(--brand-${shade}) / <alpha-value>)`,
  ])
);

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: { brand },
    },
  },
  plugins: [],
}
