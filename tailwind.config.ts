import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: "#0a7d2c",
          dark: "#075c20",
        },
      },
    },
  },
  plugins: [],
};

export default config;
