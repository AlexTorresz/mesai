/** Tokens do Manual de Identidade Visual "Retrô Organizado" (ver 03 - Designer System). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        card: 'var(--bg-card)',
        'on-app': 'var(--text-on-app)',
        'on-app-muted': 'var(--text-on-app-muted)',
        primary: '#E86A24', // Laranja Brasa — ação principal
        'primary-text': '#A8471A', // Laranja Brasa escurecido para TEXTO sobre fundos claros (contraste ≥ 4,5:1)
        secondary: '#5C3A21', // Marrom Torrado
        cream: '#F5EFE6', // Papel Comanda
        mustard: '#D99B26', // Mostarda Retrô
        charcoal: '#252527', // Carvão Padrão
        deep: '#1D1D1F', // Carvão Profundo
        ink: '#141415', // Contorno Sólido
        muted: '#6B5E52', // texto secundário sobre papel
        danger: '#B3261E',
        success: '#2F6B3A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { box: '10px', ctl: '8px' },
      boxShadow: {
        hard: '4px 4px 0 0 #141415',
        'hard-sm': '2px 2px 0 0 #141415',
        'hard-lg': '6px 6px 0 0 #141415',
      },
    },
  },
  plugins: [],
};
