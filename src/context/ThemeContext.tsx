import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

type AppColorScheme = 'light' | 'dark';

type ThemeContextType = {
  colorScheme: AppColorScheme;
  isThemeReady: boolean;
  setColorScheme: (nextScheme: AppColorScheme) => Promise<void>;
  toggleColorScheme: () => Promise<void>;
};

const THEME_SCHEME_KEY = 'demo_theme_scheme';

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: 'light',
  isThemeReady: false,
  setColorScheme: async () => {},
  toggleColorScheme: async () => {},
});

function getDeviceColorScheme(): AppColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<AppColorScheme>(getDeviceColorScheme);
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    const restoreTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_SCHEME_KEY);
        if (stored === 'light' || stored === 'dark') {
          setColorSchemeState(stored);
        } else {
          setColorSchemeState(getDeviceColorScheme());
        }
      } finally {
        setIsThemeReady(true);
      }
    };

    restoreTheme();
  }, []);

  const setColorScheme = async (nextScheme: AppColorScheme) => {
    setColorSchemeState(nextScheme);
    await AsyncStorage.setItem(THEME_SCHEME_KEY, nextScheme);
  };

  const toggleColorScheme = async () => {
    const nextScheme = colorScheme === 'dark' ? 'light' : 'dark';
    await setColorScheme(nextScheme);
  };

  const value = useMemo(
    () => ({
      colorScheme,
      isThemeReady,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, isThemeReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
