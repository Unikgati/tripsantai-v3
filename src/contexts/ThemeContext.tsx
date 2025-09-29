import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export type ThemeContextShape = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const noop = () => {};

export const ThemeContext = createContext<ThemeContextShape>({
  theme: 'light',
  setTheme: noop,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return (saved as Theme) || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch {}
    try { document.body.className = theme; } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
