import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        frogger: {
          bg: '#0d1117',
          panel: '#161b22',
          line: '#30363d',
          muted: '#8b949e',
          green: '#3fb950',
          blue: '#1d4ed8',
          purple: '#8b5cf6',
          red: '#da3633',
          amber: '#e3b341',
        },
      },
    },
  },
  plugins: [],
};

export default config;
