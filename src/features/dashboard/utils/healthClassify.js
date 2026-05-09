// เกณฑ์ทั้งหมดในไฟล์นี้ต้องตรงกับ aggregateDashboardPayload และกราฟในแดชบอร์ด

/** โรคที่ประเมินได้ต่อแถว — ต้องคง logic ให้ตรงกับ aggregateDashboardPayload / กราฟ */
export const collectPersonDiseases = (row) => {
  const personDiseases = new Set();
  const bmi = parseFloat(row.bmi);
  const bpSys = parseFloat(row.bpsys);
  const bgc = parseFloat(row.bgc);
  const spo2 = parseFloat(row.spo2);
  const hr = parseFloat(row.hr);
  const temp = parseFloat(row.temp);
  if (!isNaN(bpSys) && bpSys >= 140) personDiseases.add('ความดันโลหิตสูง');
  if (!isNaN(bgc) && bgc >= 126) personDiseases.add('เบาหวาน');
  if (!isNaN(bmi) && bmi >= 25) personDiseases.add('โรคอ้วน');
  if (!isNaN(hr) && hr > 0 && (hr < 60 || hr > 100)) personDiseases.add('หัวใจเต้นผิดปกติ');
  if (!isNaN(temp) && temp >= 37.5) personDiseases.add('ภาวะมีไข้');
  if (!isNaN(spo2) && spo2 > 0 && spo2 < 95) personDiseases.add('ออกซิเจนต่ำ');
  if (row.diseases) {
    const diseaseList = String(row.diseases).split(/[,;-]+/);
    diseaseList.forEach((d) => {
      const dName = d.trim();
      if (dName) personDiseases.add(dName);
    });
  }
  return personDiseases;
};

export const bmiDistLabelForRow = (row) => {
  const bmi = parseFloat(row.bmi);
  if (isNaN(bmi) || bmi <= 0) return null;
  if (bmi < 18.5) return 'น้ำหนักต่ำ';
  if (bmi < 23) return 'ปกติ';
  if (bmi < 25) return 'น้ำหนักเกิน';
  if (bmi < 30) return 'อ้วน';
  return 'อ้วนมาก';
};

export const bpDistLabelForRow = (row) => {
  const bpSys = parseFloat(row.bpsys);
  if (isNaN(bpSys) || bpSys <= 0) return null;
  if (bpSys < 120) return 'ปกติ';
  if (bpSys < 140) return 'สูงเล็กน้อย';
  if (bpSys < 160) return 'ระดับ 1';
  return 'ระดับ 2+';
};

export const bgcDistLabelForRow = (row) => {
  const bgc = parseFloat(row.bgc);
  if (isNaN(bgc) || bgc <= 0) return null;
  if (bgc < 100) return 'ปกติ (<100)';
  if (bgc < 126) return 'เสี่ยง (100-125)';
  return 'สูง (≥126)';
};

// --- Status text helpers สำหรับ SummaryCard (อัปเดตเกณฑ์ให้ละเอียดตรงกับกราฟ) ---

export const getBmiStatus = (val) => {
  if (val === '-' || val === '0.0') return 'ไม่มีข้อมูล';
  const num = parseFloat(val);
  if (num < 18.5) return 'น้ำหนักต่ำ';
  if (num < 23) return 'ปกติ';
  if (num < 25) return 'น้ำหนักเกิน';
  if (num < 30) return 'อ้วน';
  return 'อ้วนมาก';
};

export const getBgcStatus = (val) => {
  if (val === '-' || val === '0.0') return 'ไม่มีข้อมูล';
  const num = parseFloat(val);
  if (num >= 126) return 'สูงกว่าค่าปกติ';
  if (num >= 100) return 'เสี่ยง';
  return 'ปกติ';
};

export const getBpStatus = (val) => {
  if (val === '-' || val === '0.0') return 'ไม่มีข้อมูล';
  const num = parseFloat(val);
  if (num >= 160) return 'ระดับ 2+';
  if (num >= 140) return 'ระดับ 1';
  if (num >= 120) return 'ระดับสูงเล็กน้อย';
  return 'ปกติ';
};

export const getSpo2Status = (val) => {
  if (val === '-' || val === '0.0') return 'ไม่มีข้อมูล';
  const num = parseFloat(val);
  if (num >= 95) return 'อยู่ในเกณฑ์ปกติ';
  return 'ต่ำกว่าเกณฑ์';
};
