import { EXPORT_CSV_COL_ORDER } from '../constants/csvSchema';

/** แปลง CSV หนึ่งแถวเป็น array (รองรับเครื่องหมายคำพูดคลุมจุลภาค) */
export const parseCSVRow = (rowText) => {
  let insideQuote = false;
  const entries = [];
  let entry = [];

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === ',' && !insideQuote) {
      entries.push(entry.join('').trim());
      entry = [];
    } else {
      entry.push(char);
    }
  }
  entries.push(entry.join('').trim());
  return entries.map((e) => e.replace(/^"|"$/g, ''));
};

export const sniffCsvHeadersLower = (text) => {
  const firstLine = (text || '').split(/\r?\n/)[0] || '';
  return parseCSVRow(firstLine).map((h) => h.toLowerCase().trim());
};

const toCsvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

/** สร้าง CSV จากชุด object โดยจัดลำดับคอลัมน์ตาม EXPORT_CSV_COL_ORDER ก่อน แล้วต่อด้วยคอลัมน์อื่นเรียงตัวอักษร */
export const buildCsvFromObjectRows = (rows) => {
  if (!rows?.length) return '';
  const keySet = new Set();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keySet.add(k)));
  const headers = [
    ...EXPORT_CSV_COL_ORDER.filter((k) => keySet.has(k)),
    ...[...keySet].filter((k) => !EXPORT_CSV_COL_ORDER.includes(k)).sort(),
  ];
  const headerLine = headers.map((h) => toCsvCell(h)).join(',');
  const body = rows.map((r) => headers.map((h) => toCsvCell(r[h])).join(','));
  return [headerLine, ...body].join('\n');
};

export const triggerCsvDownload = (csvText, filenameBase = 'health-processed') => {
  const bom = '\ufeff';
  const blob = new Blob([bom + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
