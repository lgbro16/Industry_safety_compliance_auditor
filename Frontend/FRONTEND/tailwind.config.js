/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#000412",
        "on-primary": "#ffffff",
        "primary-container": "#0f1e36",
        "on-primary-container": "#7886a3",
        "inverse-primary": "#b8c7e6",
        "primary-fixed": "#d7e3ff",
        "primary-fixed-dim": "#b8c7e6",
        "on-primary-fixed": "#0c1b33",
        "on-primary-fixed-variant": "#394761",

        "secondary": "#4059aa",
        "on-secondary": "#ffffff",
        "secondary-container": "#8fa7fe",
        "on-secondary-container": "#1d3989",
        "secondary-fixed": "#dce1ff",
        "secondary-fixed-dim": "#b6c4ff",
        "on-secondary-fixed": "#00164e",
        "on-secondary-fixed-variant": "#264191",

        "tertiary": "#140000",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#460002",
        "on-tertiary-container": "#f93d37",
        "tertiary-fixed": "#ffdad6",
        "tertiary-fixed-dim": "#ffb4ab",
        "on-tertiary-fixed": "#410002",
        "on-tertiary-fixed-variant": "#93000b",

        "surface": "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "surface-variant": "#d3e4fe",
        "surface-tint": "#515f7a",
        
        "on-surface": "#0b1c30",
        "on-surface-variant": "#44474d",
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        "outline": "#75777e",
        "outline-variant": "#c5c6ce",
        "background": "#f8f9ff",
        "on-background": "#0b1c30",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // SIF Domain semantics
        "sif-critical": "#dc2626",
        "sif-critical-bg": "#fef2f2",
        "sif-high": "#ea580c",
        "sif-high-bg": "#fff7ed",
        "sif-warning": "#f59e0b",
        "sif-warning-bg": "#fffbeb",
        "sif-safe": "#059669",
        "sif-safe-bg": "#ecfdf5",
        "command-navy": "#0f1e36",
        "command-navy-elevated": "#162b4d"
      },
      fontFamily: {
        "display-lg": ["Public Sans", "sans-serif"],
        "headline-lg": ["Public Sans", "sans-serif"],
        "headline-md": ["Public Sans", "sans-serif"],
        "headline-sm": ["Public Sans", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "code-lg": ["JetBrains Mono", "monospace"],
        "code-md": ["JetBrains Mono", "monospace"],
        "code-sm": ["JetBrains Mono", "monospace"],
        "sans": ["Inter", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "sidebar-width": "16rem",
        "sidebar-collapsed": "4rem",
        "gutter-default": "1rem",
        "gutter-compact": "0.75rem"
      }
    },
  },
  plugins: [],
}
