import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fcfef0",
          100: "#f8fcd9",
          200: "#f2fab4",
          300: "#ecf782",
          400: "#e5f44a", // Acid Yellow (Primary CTA)
          500: "#d3e620", 
          600: "#a9bc13",
          700: "#7f9011",
          800: "#657213",
          900: "#555f15",
          950: "#2d3506",
        },
        accent: {
          blue: "#3b82f6",
          "blue-muted": "#1e40af",
          amber: "#f97316", // Burnt Orange
          "amber-muted": "#9a3412",
        },
        surface: {
          DEFAULT: "#080808", // Almost black
          raised: "#121212",
          card: "#111111", // Very dark grey, flat look
          hover: "#1a1a1a",
          border: "#222222",
          "border-light": "#333333",
          dark: "#000000",
          input: "#050505",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "fade-in-slow": "fadeIn 0.6s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-up-slow": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "spin-slow": "spin 3s linear infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        countdown: "countdown 1s linear",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(34, 197, 94, 0.4)" },
          "50%": { boxShadow: "0 0 24px rgba(34, 197, 94, 0.8)" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        countdown: {
          from: { strokeDashoffset: "0" },
          to: { strokeDashoffset: "283" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(34, 197, 94, 0.3)",
        "glow-lg": "0 0 40px rgba(34, 197, 94, 0.4)",
        "glow-blue": "0 0 20px rgba(59, 130, 246, 0.3)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 8px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 10px -5px rgba(0, 0, 0, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
