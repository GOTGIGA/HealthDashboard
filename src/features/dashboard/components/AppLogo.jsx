import { Activity } from 'lucide-react';

export default function AppLogo() {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/80 bg-white shadow-sm dark:border-sky-500/25 dark:bg-[#2a2a2a]"
        aria-hidden
      >
        <Activity className="size-5 text-sky-600 dark:text-sky-400" strokeWidth={2} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          สุขภาพประชากร
        </p>
        <p className="truncate text-[11px] font-medium text-slate-500 dark:text-gray-500">
          Health overview
        </p>
      </div>
    </div>
  );
}
