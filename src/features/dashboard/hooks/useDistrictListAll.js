import { useMemo } from 'react';

/** รายชื่อตำบลที่มีอยู่ในแถวต้นทาง (ตัดค่าว่าง, dedupe, เรียงตามภาษาไทย) */
const useDistrictListAll = (sourceHealthRows) =>
  useMemo(
    () =>
      [
        ...new Set(
          (sourceHealthRows || [])
            .map((r) => (r.subdistrict != null ? String(r.subdistrict).trim() : ''))
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b, 'th')),
    [sourceHealthRows]
  );

export default useDistrictListAll;
