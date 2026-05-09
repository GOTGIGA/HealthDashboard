import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseCSVRow, sniffCsvHeadersLower } from '../utils/csv';
import { isExcelFile, readFileAsArrayBuffer, readFileAsText } from '../utils/file';
import {
  convertHealthRowsToFinalObjects,
  isRawHealthFormatHeaders,
  objectsToCsv,
} from '../utils/processData';

/**
 * รับไฟล์ CSV/Excel จากผู้ใช้ ตรวจ format
 * - ถ้าเป็นไฟล์ดิบ (มี Health Data) จะ convert ก่อน
 * - ถ้าเป็นตาราง final อยู่แล้ว ส่ง CSV ตรงเข้า callback
 *
 * คืนฟังก์ชัน processFile(file) ให้ component เรียกใช้
 */
const useFileImporter = (onProcessCsvText) => {
  const processFile = useCallback(
    async (file) => {
      if (!file) return;

      if (isExcelFile(file)) {
        const buf = await readFileAsArrayBuffer(file);
        const wb = XLSX.read(buf, { type: 'array' });
        const firstSheetName = wb.SheetNames?.[0];
        if (!firstSheetName) return;
        const ws = wb.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: null });
        const headersLower = Object.keys(jsonRows?.[0] || {}).map((k) => String(k).toLowerCase().trim());
        if (isRawHealthFormatHeaders(headersLower)) {
          const finalObjects = convertHealthRowsToFinalObjects(jsonRows);
          const csvText = objectsToCsv(finalObjects);
          onProcessCsvText?.(csvText);
        } else {
          const csvText = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\n' });
          onProcessCsvText?.(csvText);
        }
        return;
      }

      const text = await readFileAsText(file);
      const headersLower = sniffCsvHeadersLower(text);
      if (isRawHealthFormatHeaders(headersLower)) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return;
        const headers = parseCSVRow(lines[0]);
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVRow(lines[i]);
          if (values.length >= headers.length) {
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = values[idx];
            });
            rows.push(obj);
          }
        }
        const finalObjects = convertHealthRowsToFinalObjects(rows);
        const convertedCsv = objectsToCsv(finalObjects);
        onProcessCsvText?.(convertedCsv);
      } else {
        onProcessCsvText?.(text);
      }
    },
    [onProcessCsvText]
  );

  return processFile;
};

export default useFileImporter;
