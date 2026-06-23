module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#06B6D4', dark: '#0891B2', light: '#22D3EE' },
        accent:   { DEFAULT: '#3B82F6', dark: '#2563EB', light: '#60A5FA' },
        danger:   { DEFAULT: '#EF4444', dark: '#DC2626', light: '#FCA5A5' },
        success:  { DEFAULT: '#22C55E', dark: '#16A34A' },
        warning:  { DEFAULT: '#F59E0B', dark: '#D97706' },

        surface: {
          bg:     '#0F172A',
          card:   '#1E293B',
          panel:  '#162032',
          border: '#334155',
        },

        text: {
          primary: '#F8FAFC',
          muted:   '#94A3B8',
          faint:   '#475569',
        },
      },

      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },

  plugins: [],
};