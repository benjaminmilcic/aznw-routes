/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts}"],
  theme: {
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1700px",
    },
    extend: {
      // Amber gradient of the AI chat (logo, question bubbles, send button)
      backgroundImage: {
        "chat-amber": "linear-gradient(135deg, #fcd34d, #f59e0b)",
      },
      colors: {
        color1: "var(--color1)",
        color2: "var(--color2)",
        color3: "var(--color3)",
        color4: "var(--color4)",
        color5: "var(--color5)",
        "gimmicks-color1": "var(--gimmicks-color1)",
        "gimmicks-color2": "var(--gimmicks-color2)",
        "gimmicks-color3": "var(--gimmicks-color3)",
        "gimmicks-color4": "var(--gimmicks-color4)",
        "gimmicks-color5": "var(--gimmicks-color5)",
        "gimmicks-color6": "var(--gimmicks-color6)",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
