export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#5B3CC4",
        primaryLight: "#E9E3FF",
        primaryDark: "#4A30A0",
        accent: "#7C4DFF",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        background: "#F9F8FC",
        border: "#E4DEF5",
        ink: "#0F0B1A",
        inkSoft: "#4A4358",
        inkMuted: "#8A8499",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};