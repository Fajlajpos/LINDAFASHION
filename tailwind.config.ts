import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        linda: {
          cream: '#FAF8F4',
          sand: '#E4D9C8',
          sandLight: '#F3EFE9',
          espresso: '#2B2019',
          espressoLight: '#3D2F25',
          cognac: '#7A4B32',
          cognacHover: '#633B26',
          sage: '#405023', // Presná nová olivová barva od uživatele
          sageLight: '#F1F4EB',
          sageHover: '#32401C',
          chocolate: '#3E2E25', // Hřejivá čokoládově hnědá – patička
        },
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(43, 32, 25, 0.05)',
        elevated: '0 12px 30px -4px rgba(43, 32, 25, 0.08)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // 150–300ms podle UX pravidel; respektuje prefers-reduced-motion v globals.css
        fadeIn: 'fadeIn 200ms ease-out',
        fadeInUp: 'fadeInUp 250ms ease-out',
      },
      minHeight: {
        touch: '44px', // WCAG minimální velikost dotykového cíle
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
