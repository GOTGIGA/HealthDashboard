import { useEffect } from 'react';
import { buildRawModalColumns } from '../utils/aggregate';

const RawDataModal = ({ open, title, rows, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const cols = buildRawModalColumns(rows);
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#444] dark:bg-[#242424]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-[#333]">
          <h2 id="raw-modal-title" className="text-base font-semibold text-slate-900 dark:text-white pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#555] dark:bg-[#2a2a2a] dark:text-gray-200 dark:hover:bg-[#333]"
          >
            ปิด
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
          {!rows?.length ? (
            <p className="text-sm text-slate-500 dark:text-gray-400">ไม่มีแถวข้อมูล</p>
          ) : (
            <div className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-[#333]">
              <table className="w-full min-w-max text-left text-xs text-slate-800 dark:text-gray-200">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1a1a1a]">
                  <tr>
                    {cols.map((c) => (
                      <th key={c} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold dark:border-[#333]">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-slate-100 dark:border-[#2a2a2a]">
                      {cols.map((c) => (
                        <td key={c} className="whitespace-nowrap px-3 py-2">
                          {row[c] === null || row[c] === undefined ? '' : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RawDataModal;
