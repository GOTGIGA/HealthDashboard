import AppLogo from './AppLogo';
import ThemeToggle from './ThemeToggle';

export default function AppNavbar({ theme, onThemeChange, children }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-100/80 backdrop-blur-md dark:border-[#333] dark:bg-[#1c1c1c]/80">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <AppLogo />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ThemeToggle theme={theme} onChange={onThemeChange} />
          {children}
        </div>
      </div>
    </header>
  );
}
