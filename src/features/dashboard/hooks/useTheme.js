import { useEffect, useState } from 'react';

const STORAGE_KEY = 'health-dashboard-theme';

const readInitialTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

/** จัดการธีม (light/dark) — sync กับ class บน <html> และ localStorage */
const useTheme = () => {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return [theme, setTheme];
};

export default useTheme;
