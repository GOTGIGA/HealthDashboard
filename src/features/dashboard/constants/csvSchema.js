/** ลำดับคอลัมน์สำหรับ Export CSV หลังประมวลผล (ที่เหลือเรียงตามตัวอักษร) */
export const EXPORT_CSV_COL_ORDER = [
  'subdistrict',
  'ชื่อผู้ใช้งาน',
  'username',
  'time',
  'bmi',
  'bgc',
  'bpsys',
  'spo2',
  'hr',
  'temp',
  'adl',
  'bw',
  'hei',
  'o2_diff',
  'resp',
  'diseases',
];

/** ลำดับคอลัมน์ใน modal ข้อมูลดิบ — ไม่รวม diseases (ไปท้ายเสมอ) และไม่รวม ชื่อผู้ใช้งาน (ซ้ำกับ username) */
export const RAW_MODAL_COL_PRIORITY = [
  'subdistrict',
  'username',
  'time',
  'bmi',
  'bgc',
  'bpsys',
  'spo2',
  'hr',
  'temp',
];
