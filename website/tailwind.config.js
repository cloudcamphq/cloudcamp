const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./content/**/*.md",
    "./plugins/gatsby-api-source/**/*.{js,ts}",
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ["InterVariable", ...defaultTheme.fontFamily.sans],
        display: ["KarlaVariable", ...defaultTheme.fontFamily.sans],
        mono: ["Menlo", "Monaco", ...defaultTheme.fontFamily.mono],
      },
    },
  },
  variants: {
    extend: {
      hidden: ["focus", "group-focus"],
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class",
    }),
  ],
};
