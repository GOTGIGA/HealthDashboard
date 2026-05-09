const ThemeToggle = ({ theme, onChange }) => (
  <div
    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-[#444] dark:bg-[#1f1f1f] dark:shadow-none"
    role="group"
    aria-label="ธีมแสดงผล"
  >
    <button
      type="button"
      onClick={() => onChange('light')}
      className={
        theme === 'light'
          ? 'rounded-md px-3 py-1.5 text-xs font-semibold bg-sky-100 text-sky-900 dark:bg-[#3a3a3a] dark:text-white'
          : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-[#2a2a2a]'
      }
    >
      สว่าง
    </button>
    <button
      type="button"
      onClick={() => onChange('dark')}
      className={
        theme === 'dark'
          ? 'rounded-md px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white dark:bg-[#3a3a3a]'
          : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-[#2a2a2a]'
      }
    >
      มืด
    </button>
  </div>
);

export default ThemeToggle;
