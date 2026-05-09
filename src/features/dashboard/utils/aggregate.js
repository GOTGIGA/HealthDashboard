import { diseaseColorMap } from '../constants/colors';
import { RAW_MODAL_COL_PRIORITY } from '../constants/csvSchema';
import {
  bgcDistLabelForRow,
  bmiDistLabelForRow,
  bpDistLabelForRow,
  collectPersonDiseases,
} from './healthClassify';
import { pickUsernameFromRow } from './rowUtils';

export const applyDistrictFilter = (rawData, districtFilter) => {
  if (!districtFilter) return [...(rawData || [])];
  return (rawData || []).filter(
    (row) => (row.subdistrict != null ? String(row.subdistrict).trim() : '') === districtFilter
  );
};

export const filterRowsByDiseaseName = (rows, diseaseName) =>
  rows.filter((row) => collectPersonDiseases(row).has(diseaseName));

export const filterRowsByBmiCategory = (rows, categoryName) =>
  rows.filter((row) => bmiDistLabelForRow(row) === categoryName);

export const filterRowsByBpCategory = (rows, categoryName) =>
  rows.filter((row) => bpDistLabelForRow(row) === categoryName);

export const filterRowsByBgcCategory = (rows, categoryName) =>
  rows.filter((row) => bgcDistLabelForRow(row) === categoryName);

export const filterRowsBySubdistrictMetric = (rows, metricLabel, districtName) => {
  const dNorm = String(districtName || '').trim();
  return rows.filter((row) => {
    const sd = row.subdistrict != null ? String(row.subdistrict).trim() : '';
    if (sd !== dNorm) return false;
    switch (metricLabel) {
      case 'BMI (kg/m²)': {
        const bmi = parseFloat(row.bmi);
        return !isNaN(bmi) && bmi > 0;
      }
      case 'BGC (mg/dL)': {
        const bgc = parseFloat(row.bgc);
        return !isNaN(bgc) && bgc > 0;
      }
      case 'BP Sys (mmHg)': {
        const bpSys = parseFloat(row.bpsys);
        return !isNaN(bpSys) && bpSys > 0;
      }
      case 'SpO2 (%)': {
        const spo2 = parseFloat(row.spo2);
        return !isNaN(spo2) && spo2 > 0;
      }
      default:
        return false;
    }
  });
};

export const buildRawModalColumns = (rows) => {
  if (!rows?.length) return [];
  const keySet = new Set();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keySet.add(k)));
  const ordered = RAW_MODAL_COL_PRIORITY.filter((k) => keySet.has(k));
  const rest = [...keySet]
    .filter(
      (k) =>
        !RAW_MODAL_COL_PRIORITY.includes(k) &&
        k !== 'diseases' &&
        k !== 'ชื่อผู้ใช้งาน'
    )
    .sort((a, b) => a.localeCompare(b));
  const diseasesLast = keySet.has('diseases') ? ['diseases'] : [];
  return [...ordered, ...rest, ...diseasesLast];
};

/** Recharts มักส่ง payload ห่อชั้นเดียว — ใช้ดึง name / rawRow จาก Bar,Pie */
export const chartDrillEntry = (e) => e?.payload ?? e;

/** คำนวณ summary / กราฟทั้งหมดจากแถวต้นทาง — districtFilter ว่าง = ทุกตำบล */
export const aggregateDashboardPayload = (rawData, districtFilter) => {
  const districtListAll = [
    ...new Set(
      (rawData || [])
        .map((r) => (r.subdistrict != null ? String(r.subdistrict).trim() : ''))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'th'));

  const data = applyDistrictFilter(rawData, districtFilter);

  let sumBmi = 0;
  let sumBgc = 0;
  let sumBpSys = 0;
  let sumSpo2 = 0;
  let countBmi = 0;
  let countBgc = 0;
  let countBpSys = 0;
  let countSpo2 = 0;

  const diseaseCounts = {};
  const bmiCounts = { 'น้ำหนักต่ำ': 0, 'ปกติ': 0, 'น้ำหนักเกิน': 0, 'อ้วน': 0, 'อ้วนมาก': 0 };
  const bpCounts = { 'ปกติ': 0, 'สูงเล็กน้อย': 0, 'ระดับ 1': 0, 'ระดับ 2+': 0 };
  const bgcCounts = { 'ปกติ (<100)': 0, 'เสี่ยง (100-125)': 0, 'สูง (≥126)': 0 };
  const districtStats = {};
  const foundDistricts = new Set();
  const peopleAccumulator = [];

  data.forEach((row, rowIdx) => {
    const subDNorm = row.subdistrict != null ? String(row.subdistrict).trim() : '';

    const bmi = parseFloat(row.bmi);
    if (!isNaN(bmi) && bmi > 0) {
      sumBmi += bmi;
      countBmi++;
      if (bmi < 18.5) bmiCounts['น้ำหนักต่ำ']++;
      else if (bmi < 23) bmiCounts['ปกติ']++;
      else if (bmi < 25) bmiCounts['น้ำหนักเกิน']++;
      else if (bmi < 30) bmiCounts['อ้วน']++;
      else bmiCounts['อ้วนมาก']++;
    }

    const bpSys = parseFloat(row.bpsys);
    if (!isNaN(bpSys) && bpSys > 0) {
      sumBpSys += bpSys;
      countBpSys++;
      if (bpSys < 120) bpCounts['ปกติ']++;
      else if (bpSys < 140) bpCounts['สูงเล็กน้อย']++;
      else if (bpSys < 160) bpCounts['ระดับ 1']++;
      else bpCounts['ระดับ 2+']++;
    }

    const bgc = parseFloat(row.bgc);
    if (!isNaN(bgc) && bgc > 0) {
      sumBgc += bgc;
      countBgc++;
      if (bgc < 100) bgcCounts['ปกติ (<100)']++;
      else if (bgc < 126) bgcCounts['เสี่ยง (100-125)']++;
      else bgcCounts['สูง (≥126)']++;
    }

    const spo2 = parseFloat(row.spo2);
    if (!isNaN(spo2) && spo2 > 0) {
      sumSpo2 += spo2;
      countSpo2++;
    }

    const personDiseases = collectPersonDiseases(row);

    const hr = parseFloat(row.hr);
    const temp = parseFloat(row.temp);
    personDiseases.forEach((dName) => {
      diseaseCounts[dName] = (diseaseCounts[dName] || 0) + 1;
    });

    if (subDNorm) {
      foundDistricts.add(subDNorm);
      if (!districtStats[subDNorm]) {
        districtStats[subDNorm] = {
          sumBmi: 0,
          cBmi: 0,
          sumBgc: 0,
          cBgc: 0,
          sumBpSys: 0,
          cBpSys: 0,
          sumSpo2: 0,
          cSpo2: 0,
        };
      }
      if (!isNaN(bmi) && bmi > 0) {
        districtStats[subDNorm].sumBmi += bmi;
        districtStats[subDNorm].cBmi++;
      }
      if (!isNaN(bgc) && bgc > 0) {
        districtStats[subDNorm].sumBgc += bgc;
        districtStats[subDNorm].cBgc++;
      }
      if (!isNaN(bpSys) && bpSys > 0) {
        districtStats[subDNorm].sumBpSys += bpSys;
        districtStats[subDNorm].cBpSys++;
      }
      if (!isNaN(spo2) && spo2 > 0) {
        districtStats[subDNorm].sumSpo2 += spo2;
        districtStats[subDNorm].cSpo2++;
      }
    }

    const uname = pickUsernameFromRow(row) || `แถว ${rowIdx + 1}`;
    peopleAccumulator.push({
      subdistrict: subDNorm,
      username: uname,
      bmi: !isNaN(bmi) && bmi > 0 ? bmi : null,
      bgc: !isNaN(bgc) && bgc > 0 ? bgc : null,
      bpsys: !isNaN(bpSys) && bpSys > 0 ? bpSys : null,
      spo2: !isNaN(spo2) && spo2 > 0 ? spo2 : null,
      hr: !isNaN(hr) && hr > 0 ? hr : null,
      temp: !isNaN(temp) && temp > 0 ? temp : null,
      rawRow: { ...row },
    });
  });

  const summary = {
    bmi: countBmi ? (sumBmi / countBmi).toFixed(1) : '-',
    bgc: countBgc ? (sumBgc / countBgc).toFixed(1) : '-',
    bpSys: countBpSys ? (sumBpSys / countBpSys).toFixed(1) : '-',
    spo2: countSpo2 ? (sumSpo2 / countSpo2).toFixed(1) : '-',
  };

  const diseasesData = Object.keys(diseaseCounts)
    .map((name) => ({
      name,
      value: diseaseCounts[name],
      color: diseaseColorMap[name] || '#7d8285',
    }))
    .sort((a, b) => b.value - a.value);

  const bmiDistData = [
    { name: 'น้ำหนักต่ำ', value: bmiCounts['น้ำหนักต่ำ'], color: '#348bd6' },
    { name: 'ปกติ', value: bmiCounts['ปกติ'], color: '#1fb173' },
    { name: 'น้ำหนักเกิน', value: bmiCounts['น้ำหนักเกิน'], color: '#e5a91f' },
    { name: 'อ้วน', value: bmiCounts['อ้วน'], color: '#e55f30' },
    { name: 'อ้วนมาก', value: bmiCounts['อ้วนมาก'], color: '#ef4b4b' },
  ];

  const bpData = [
    { name: 'ปกติ', value: bpCounts['ปกติ'], color: '#1fb173' },
    { name: 'สูงเล็กน้อย', value: bpCounts['สูงเล็กน้อย'], color: '#e5a91f' },
    { name: 'ระดับ 1', value: bpCounts['ระดับ 1'], color: '#e55f30' },
    { name: 'ระดับ 2+', value: bpCounts['ระดับ 2+'], color: '#ef4b4b' },
  ];

  const bgcData = [
    { name: 'ปกติ (<100)', value: bgcCounts['ปกติ (<100)'], color: '#1fb173' },
    { name: 'เสี่ยง (100-125)', value: bgcCounts['เสี่ยง (100-125)'], color: '#e5a91f' },
    { name: 'สูง (≥126)', value: bgcCounts['สูง (≥126)'], color: '#ef4b4b' },
  ];

  const districts = [...foundDistricts].sort((a, b) => a.localeCompare(b, 'th'));

  const subDistrictData = [
    { metric: 'BMI (kg/m²)' },
    { metric: 'BGC (mg/dL)' },
    { metric: 'BP Sys (mmHg)' },
    { metric: 'SpO2 (%)' },
  ];

  districts.forEach((d) => {
    const stats = districtStats[d];
    subDistrictData[0][d] = stats.cBmi ? parseFloat((stats.sumBmi / stats.cBmi).toFixed(1)) : 0;
    subDistrictData[1][d] = stats.cBgc ? parseFloat((stats.sumBgc / stats.cBgc).toFixed(1)) : 0;
    subDistrictData[2][d] = stats.cBpSys ? parseFloat((stats.sumBpSys / stats.cBpSys).toFixed(1)) : 0;
    subDistrictData[3][d] = stats.cSpo2 ? parseFloat((stats.sumSpo2 / stats.cSpo2).toFixed(1)) : 0;
  });

  return {
    summary,
    diseasesData,
    bmiDistData,
    bpData,
    bgcData,
    districtListAll,
    districts,
    subDistrictData,
    peopleRows: peopleAccumulator,
  };
};
