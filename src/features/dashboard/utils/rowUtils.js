/** ดึงชื่อผู้ใช้งานจากแถวข้อมูล โดยพิจารณาคอลัมน์ภาษาไทยและภาษาอังกฤษ */
export const pickUsernameFromRow = (row) => {
  const direct = [row['ชื่อผู้ใช้งาน'], row.username, row.user, row.userid].find(
    (v) => v != null && String(v).trim() !== ''
  );
  if (direct != null) return String(direct).trim();
  for (const k of Object.keys(row || {})) {
    const kl = String(k).toLowerCase().trim();
    if (kl === 'username' || kl === 'user' || kl === 'userid' || k === 'ชื่อผู้ใช้งาน') {
      const v = row[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  return '';
};

/** อ่านค่าตัวเลขของตัวชี้วัดจาก person — คืน null ถ้าไม่ใช่ตัวเลขบวก */
export const getPeopleMetricValue = (rec, field) => {
  const v = rec?.[field];
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const rowFullDuplicateSignature = (row) => {
  const keys = Object.keys(row || {}).sort();
  return keys.map((k) => `${k}\u0001${row[k] ?? ''}`).join('\u0002');
};

/** ลบแถวที่ซ้ำกันทุกคอลัมน์ (ค่าเท่ากันทุกฟิลด์) คงลำดับแถวแรกที่เจอ */
export const dedupeIdenticalRows = (rows) => {
  if (!rows?.length) return [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const sig = rowFullDuplicateSignature(row);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(row);
  }
  return out;
};
