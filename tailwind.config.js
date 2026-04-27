export default {
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-brand)",
        "brand-light": "var(--color-brand-light)",
        "brand-dark": "var(--color-brand-dark)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        success: "var(--color-success)",
        "success-hover": "var(--color-success-hover)",
        danger: "var(--color-danger)",
        "danger-hover": "var(--color-danger-hover)",
        warning: "var(--color-warning)",
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          placeholder: "var(--color-text-placeholder)",
        },
      },
    },
  },
};
