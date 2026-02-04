// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Using CSS variables from globals.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom design system colors
        surface1: "#131313",
        surface1Hovered: "#1A1A1A",
        surface2: "#1F1F1F",
        surface2Hovered: "#242424",
        surface3: "rgba(255, 255, 255, 0.12)",
        surface3Hovered: "rgba(255, 255, 255, 0.16)",
        neutral1: "#FFFFFF",
        neutral1Hovered: "rgba(255, 255, 255, 0.85)",
        neutral2: "rgba(255, 255, 255, 0.65)",
        neutral2Hovered: "rgba(255, 255, 255, 0.85)",
        neutral3: "rgba(255, 255, 255, 0.38)",
        neutral3Hovered: "rgba(255, 255, 255, 0.58)",
        accent1: "#FF37C7",
        accent1Hovered: "#E500A5",
        accent2: "rgba(255, 55, 199, 0.08)",
        accent2Hovered: "rgba(255, 55, 199, 0.12)",
        statusSuccess: "#21C95E",
        statusSuccessHovered: "#15863C",
        statusSuccess2: "rgba(33, 201, 94, 0.12)",
        statusCritical: "#FF593C",
        statusCriticalHovered: "#FF401F",
        statusCritical2: "rgba(255, 89, 60, 0.12)",
        statusWarning: "#FFBF17",
        statusWarningHovered: "#FFDD0D",
        statusWarning2: "rgba(255, 191, 23, 0.08)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}