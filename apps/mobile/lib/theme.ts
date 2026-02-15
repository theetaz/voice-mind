import { vars } from 'nativewind';

export const themes = {
  light: vars({
    '--color-background': '#F8FAFC',
    '--color-foreground': '#0F172A',
    '--color-card': '#FFFFFF',
    '--color-card-foreground': '#0F172A',
    '--color-primary': '#6366F1',
    '--color-primary-foreground': '#FFFFFF',
    '--color-muted': '#F1F5F9',
    '--color-muted-foreground': '#64748B',
    '--color-destructive': '#EF4444',
    '--color-destructive-foreground': '#FFFFFF',
    '--color-border': '#E2E8F0',
  }),
  dark: vars({
    '--color-background': '#0F172A',
    '--color-foreground': '#F1F5F9',
    '--color-card': '#1E293B',
    '--color-card-foreground': '#F1F5F9',
    '--color-primary': '#818CF8',
    '--color-primary-foreground': '#FFFFFF',
    '--color-muted': '#334155',
    '--color-muted-foreground': '#94A3B8',
    '--color-destructive': '#EF4444',
    '--color-destructive-foreground': '#FFFFFF',
    '--color-border': '#334155',
  }),
};

/** Raw hex values for inline styles (tintColor, etc.) */
export const rawColors = {
  light: {
    primary: '#6366F1',
    primaryForeground: '#FFFFFF',
    foreground: '#0F172A',
    mutedForeground: '#64748B',
    muted: '#F1F5F9',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    destructive: '#EF4444',
  },
  dark: {
    primary: '#818CF8',
    primaryForeground: '#FFFFFF',
    foreground: '#F1F5F9',
    mutedForeground: '#94A3B8',
    muted: '#334155',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    destructive: '#EF4444',
  },
};
