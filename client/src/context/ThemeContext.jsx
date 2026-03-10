import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [nightMode, setNightMode] = useState(() => {
    const saved = localStorage.getItem('medigaurd_theme');
    return saved ? saved === 'dark' : true; // default dark
  });
  const [emergency, setEmergency] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', nightMode ? 'dark' : 'light');
    localStorage.setItem('medigaurd_theme', nightMode ? 'dark' : 'light');
  }, [nightMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-emergency', emergency ? 'true' : 'false');
  }, [emergency]);

  const toggleNightMode = () => setNightMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ nightMode, toggleNightMode, emergency, setEmergency }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
