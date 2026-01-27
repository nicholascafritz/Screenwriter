import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        ui: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        screenplay: ['Courier Prime', 'Courier New', 'Courier', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
          bg: 'var(--color-success-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          hover: 'var(--color-warning-hover)',
          bg: 'var(--color-warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
          bg: 'var(--color-danger-bg)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-info-bg)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
        },
        screenplay: {
          'scene-heading': 'var(--color-scene-heading)',
          'character': 'var(--color-character)',
          'dialogue': 'var(--color-dialogue)',
          'action': 'var(--color-action)',
          'transition': 'var(--color-transition)',
          'parenthetical': 'var(--color-parenthetical)',
          'note': 'var(--color-note)',
        },
        mode: {
          inline: 'var(--color-mode-inline)',
          diff: 'var(--color-mode-diff)',
          agent: 'var(--color-mode-agent)',
          'writers-room': 'var(--color-mode-writers-room)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        'ds-sm': 'var(--shadow-sm)',
        'ds-md': 'var(--shadow-md)',
        'ds-lg': 'var(--shadow-lg)',
        'ds-xl': 'var(--shadow-xl)',
        'ds-inner': 'var(--shadow-inner)',
      },
      zIndex: {
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'normal': 'var(--transition-normal)',
        'slow': 'var(--transition-slow)',
        'very-slow': 'var(--transition-very-slow)',
      },
      transitionTimingFunction: {
        'standard': 'var(--ease-standard)',
        'accelerate': 'var(--ease-accelerate)',
        'decelerate': 'var(--ease-decelerate)',
        'bounce': 'var(--ease-bounce)',
      },
    },
  },
  plugins: [],
};

export default config;
