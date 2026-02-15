import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, rawColors } from './theme';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggle: () => void;
  colors: typeof rawColors.light;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_KEY = 'voicemind_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setMode(saved);
        try { setColorScheme(saved); } catch {}
      }
    });
  }, [setColorScheme]);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setMode(next);
      try { setColorScheme(next); } catch {}
      AsyncStorage.setItem(THEME_KEY, next);
    },
    [setColorScheme],
  );

  const toggle = useCallback(() => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [colorScheme, setTheme]);

  const isDark = colorScheme === 'dark';
  const themeVars = isDark ? themes.dark : themes.light;
  const themeColors = isDark ? rawColors.dark : rawColors.light;

  return (
    <ThemeContext.Provider value={{ mode, isDark, setTheme, toggle, colors: themeColors }}>
      <View style={[{ flex: 1 }, themeVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = React.use(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
}
