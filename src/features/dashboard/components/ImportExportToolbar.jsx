import { useRef, useState } from 'react';

const ImportExportToolbar = ({
  processedRowCount,
  onFileSelected,
  onExportProcessedCsv,
  onDownloadTemplateCsv,
  onDownloadTemplateExcel,
}) => {
  const fileInputRef = useRef(null);
  // ใช้ key เพื่อ "รีเซ็ต" select กลับ placeholder ทุกครั้งหลังเลือก option
  const [templateSelectKey, setTemplateSelectKey] = useState(0);

  const handleTemplateChange = (value) => {
    if (value === 'csv') onDownloadTemplateCsv?.();
    else if (value === 'xlsx') onDownloadTemplateExcel?.();
    setTemplateSelectKey((k) => k + 1);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected?.(file);
          // เคลียร์ค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
          e.target.value = '';
        }}
      />
      <select
        key={templateSelectKey}
        aria-label="ดาวน์โหลดเทมเพลต"
        title="เลือกรูปแบบไฟล์เทมเพลต (หัวคอลัมน์ + แถวตัวอย่าง)"
        defaultValue=""
        onChange={(e) => handleTemplateChange(e.target.value)}
        className="bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium shadow-sm dark:bg-[#2a2a2a] dark:text-white dark:border-[#444] dark:shadow-none min-w-44 cursor-pointer"
      >
        <option value="" disabled>
          ดาวน์โหลดเทมเพลต
        </option>
        <option value="csv">CSV (.csv)</option>
        <option value="xlsx">Excel (.xlsx)</option>
      </select>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a] dark:text-white dark:border-[#444] dark:shadow-none"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import CSV / Excel
      </button>
      <button
        type="button"
        onClick={onExportProcessedCsv}
        disabled={processedRowCount === 0}
        title={processedRowCount === 0 ? 'นำเข้าไฟล์ก่อน จึงจะส่งออกได้' : `ส่งออก ${processedRowCount} แถว`}
        className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-45 disabled:pointer-events-none dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a] dark:text-white dark:border-[#444] dark:shadow-none"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export ข้อมูล (CSV)
      </button>
    </div>
  );
};

export default ImportExportToolbar;
