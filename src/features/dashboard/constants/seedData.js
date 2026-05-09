/** ข้อมูลตัวอย่างเริ่มต้น — ใช้เป็น state เริ่มต้นของแดชบอร์ดเมื่อยังไม่มีการ Import จริง */
const initialPeopleRows = [
  { subdistrict: 'จะบังติกอ', username: 'สมชาย ใจดี', bmi: 22.5, bgc: 95, bpsys: 118, spo2: 98, hr: 76, temp: 36.6 },
  { subdistrict: 'จะบังติกอ', username: 'สมหญิง รักสุข', bmi: 26.8, bgc: 142, bpsys: 135, spo2: 97, hr: 82, temp: 36.4 },
  { subdistrict: 'สะบารัง', username: 'วิชัย สุขดี', bmi: 24.1, bgc: 108, bpsys: 128, spo2: 96, hr: 68, temp: 37.2 },
  { subdistrict: 'สะบารัง', username: 'มาลี แข็งแรง', bmi: 21.0, bgc: 88, bpsys: 112, spo2: 99, hr: 71, temp: 36.5 },
  { subdistrict: 'อาเนาะรู', username: 'ประเสริฐ วิ่งไว', bmi: 28.2, bgc: 155, bpsys: 148, spo2: 95, hr: 88, temp: 36.8 },
  { subdistrict: 'อาเนาะรู', username: 'นภา สบายดี', bmi: 23.4, bgc: 102, bpsys: 122, spo2: 98, hr: 74, temp: 36.3 },
];

/** แปลงข้อมูลตัวอย่างเป็นแถวรูปแบบเดียวกับหลัง parse CSV */
export const buildInitialSourceRowsFromDemoPeople = () =>
  initialPeopleRows.map((p) => ({
    subdistrict: p.subdistrict ?? '',
    'ชื่อผู้ใช้งาน': p.username ?? '',
    username: p.username ?? '',
    bmi: p.bmi != null ? String(p.bmi) : '',
    bgc: p.bgc != null ? String(p.bgc) : '',
    bpsys: p.bpsys != null ? String(p.bpsys) : '',
    spo2: p.spo2 != null ? String(p.spo2) : '',
    hr: p.hr != null ? String(p.hr) : '',
    temp: p.temp != null ? String(p.temp) : '',
    diseases: '',
  }));
