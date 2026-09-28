import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        butter: "#fff3e5",
        valentino: {
          black: "#000000",
          white: "#ffffff",
        },
      },
      fontFamily: {
        serif: ['"Times New Roman"', "Times", "serif"],
        sans: ['"DIN Pro"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
