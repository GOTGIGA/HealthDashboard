import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
  ReferenceLine,
} from 'recharts';
import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  convertHealthRowsToFinalObjects,
  isRawHealthFormatHeaders,
  objectsToCsv,
  buildDashboardImportTemplateCsv,
  buildDashboardImportTemplateAoA,
} from './processData';

// --- ชุดข้อมูลอ้างอิงตามรูปภาพตัวอย่าง ---

const initialDiseasesData = [
  { name: 'ความดันโลหิตสูง', value: 69, color: '#e55f30' },
  { name: 'เบาหวาน', value: 53, color: '#e5a91f' },
  { name: 'โรคหัวใจ', value: 27, color: '#da5789' },
  { name: 'ไขมันในเลือด', value: 17, color: '#348bd6' },
  { name: 'อื่นๆ', value: 13, color: '#7d8285' },
  { name: 'โรคไต', value: 11, color: '#1fb173' },
  { name: 'Stroke/อัมพาต', value: 6, color: '#856fe8' },
];

const initialBmiDistData = [
  { name: 'น้ำหนักต่ำ', value: 18, color: '#348bd6' },
  { name: 'ปกติ', value: 59, color: '#1fb173' },
  { name: 'น้ำหนักเกิน', value: 45, color: '#e5a91f' },
  { name: 'อ้วน', value: 63, color: '#e55f30' },
  { name: 'อ้วนมาก', value: 57, color: '#ef4b4b' },
];

const initialBpData = [
  { name: 'ปกติ', value: 83, color: '#1fb173' },
  { name: 'สูงเล็กน้อย', value: 60, color: '#e5a91f' },
  { name: 'ระดับ 1', value: 51, color: '#e55f30' },
  { name: 'ระดับ 2+', value: 92, color: '#ef4b4b' },
];

const initialBgcData = [
  { name: 'ปกติ (<100)', value: 28, color: '#1fb173' },
  { name: 'เสี่ยง (100-125)', value: 85, color: '#e5a91f' },
  { name: 'สูง (≥126)', value: 118, color: '#ef4b4b' },
];

const initialSubDistrictData = [
  { metric: 'BMI (kg/m²)', จะบังติกอ: 26.1, สะบารัง: 24.1, อาเนาะรู: 25.9 },
  { metric: 'BGC (mg/dL)', จะบังติกอ: 139.2, สะบารัง: 160.9, อาเนาะรู: 167.4 },
  { metric: 'BP Sys (mmHg)', จะบังติกอ: 133.2, สะบารัง: 133.7, อาเนาะรู: 132.2 },
  { metric: 'SpO2 (%)', จะบังติกอ: 97.3, สะบารัง: 97.2, อาเนาะรู: 97.1 },
];

const diseaseColorMap = {
  'ความดันโลหิตสูง': '#e55f30',
  'เบาหวาน': '#e5a91f',
  'โรคหัวใจ': '#da5789',
  'ไขมันในเลือด': '#348bd6',
  'โรคไต': '#1fb173',
  'Stroke/อัมพาต': '#856fe8',
  'โรคอ้วน': '#ef4b4b',
  'หัวใจเต้นผิดปกติ': '#d6348b',
  'ภาวะมีไข้': '#f56565',
  'ออกซิเจนต่ำ': '#4299e1',
  'อื่นๆ': '#7d8285'
};

const districtColors = ['#1fb173', '#e55f30', '#856fe8', '#348bd6', '#e5a91f'];

/** ตัวชี้วัดสำหรับกราฟรายบุคคลตามตำบล */
const DISTRICT_PEOPLE_METRICS = [
  { id: 'bmi', label: 'BMI (kg/m²)', field: 'bmi' },
  { id: 'bgc', label: 'BGC (mg/dL)', field: 'bgc' },
  { id: 'bpsys', label: 'BP Sys (mmHg)', field: 'bpsys' },
  { id: 'spo2', label: 'SpO2 (%)', field: 'spo2' },
  { id: 'hr', label: 'HR (bpm)', field: 'hr' },
  { id: 'temp', label: 'อุณหภูมิ (°C)', field: 'temp' },
];

/** ค่า Y ของเส้นอ้างอิง — ตรงกับ processCSV / กราฟในแดชบอร์ด (ไม่แสดงป้ายบนกราฟ เพื่อไม่ให้ถูกแท่งบัง) */
const DISTRICT_PEOPLE_CLINICAL_REFS = {
  bmi: [23],
  bgc: [100],
  bpsys: [120],
  spo2: [95],
  hr: [60, 100],
  temp: [37.5],
};

/** คำอธิบายเส้นประ — แสดงเฉพาะตัวชี้วัดที่เลือก */
const DISTRICT_PEOPLE_CLINICAL_EXPLAIN = {
  bmi:
    'เส้นประที่ค่า 23 คือขอบบนของช่วงปกติ ช่วงปกติ < 23 (สอดคล้องกับกราฟการกระจาย BMI และกลุ่ม «ปกติ» ในแอป) — ค่าที่สูงกว่าเส้นแปลว่าเริ่มเกินเกณฑ์ปกติตามเกณฑ์นี้',
  bgc:
    'เส้นประที่ค่า 100 — ปกติ < 100; ช่วง 100–125 = เสี่ยง; ≥ 126 = สูง (ตามกลุ่มในกราฟ BGC ของแดชบอร์ด)',
  bpsys:
    'เส้นประที่ค่า 120 — ปกติ < 120 mmHg (ตามเกณฑ์แบ่งระดับความดันในแอป)',
  spo2:
    'เส้นประที่ค่า 95 — ค่าต่ำกว่าเส้นนี้ถือว่าผิดปกติ (ออกซิเจนในเลือดต่ำ ตามเกณฑ์ประเมินในแอป)',
  hr:
    'เส้นประที่ค่า 60 และ 100 — ช่วงที่ถือว่าปกติ 60–100 bpm (นอกช่วงนี้ใช้ประเมินหัวใจเต้นผิดปกติในแอป)',
  temp:
    'เส้นประที่ค่า 37.5 — ไข้ ≥ 37.5 °C (ตามเกณฑ์ภาวะมีไข้ในแอป)',
};

const pickUsernameFromRow = (row) => {
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

const getPeopleMetricValue = (rec, field) => {
  const v = rec?.[field];
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const initialPeopleRows = [
  { subdistrict: 'จะบังติกอ', username: 'สมชาย ใจดี', bmi: 22.5, bgc: 95, bpsys: 118, spo2: 98, hr: 76, temp: 36.6 },
  { subdistrict: 'จะบังติกอ', username: 'สมหญิง รักสุข', bmi: 26.8, bgc: 142, bpsys: 135, spo2: 97, hr: 82, temp: 36.4 },
  { subdistrict: 'สะบารัง', username: 'วิชัย สุขดี', bmi: 24.1, bgc: 108, bpsys: 128, spo2: 96, hr: 68, temp: 37.2 },
  { subdistrict: 'สะบารัง', username: 'มาลี แข็งแรง', bmi: 21.0, bgc: 88, bpsys: 112, spo2: 99, hr: 71, temp: 36.5 },
  { subdistrict: 'อาเนาะรู', username: 'ประเสริฐ วิ่งไว', bmi: 28.2, bgc: 155, bpsys: 148, spo2: 95, hr: 88, temp: 36.8 },
  { subdistrict: 'อาเนาะรู', username: 'นภา สบายดี', bmi: 23.4, bgc: 102, bpsys: 122, spo2: 98, hr: 74, temp: 36.3 },
];

/** แปลงข้อมูลตัวอย่างเป็นแถวรูปแบบเดียวกับหลัง parse CSV */
const buildInitialSourceRowsFromDemoPeople = () =>
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

// --- Components ย่อยสำหรับตกแต่ง ---

const SummaryCard = ({ title, value, unit, status }) => (
  <div className="flex flex-col text-slate-900 dark:text-white">
    <span className="text-slate-600 dark:text-gray-300 text-sm font-medium mb-1">{title}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-bold">{value}</span>
      {value !== "-" && <span className="text-sm font-medium text-slate-500 dark:text-gray-400">{unit}</span>}
    </div>
    <span className="text-slate-500 dark:text-gray-400 text-xs mt-1">{status}</span>
  </div>
);

const CustomLegend = ({ data }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs font-medium text-slate-700 dark:text-gray-300">
    {data.map((item, index) => (
      <div key={index} className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color || item.fill }}></div>
        <span>{item.name} {item.value !== undefined ? `(${item.value})` : ''}</span>
      </div>
    ))}
  </div>
);

const CustomBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  // ป้องกันไม่ให้ label ล้นถ้ายาวไม่พอ
  if (height < 20) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight="bold">
      {value}
    </text>
  );
};

const CustomTopLabel = (props) => {
   const { x, y, width, value } = props;
   return (
     <text x={x + width / 2} y={y + 15} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold">
       {value > 0 ? value : ''}
     </text>
   );
};

/** Label + เส้นชี้ออกนอกวง Pie — แสดงเฉพาะชิ้นที่ index ตรงกับ activeIndex (ใช้คู่กับ onMouseEnter ของ Pie) */
const createPieHoverOutsideLabel = (activeIndex, lineColor, textColor) => (props) => {
  const { cx, cy, midAngle, outerRadius, name, value, index } = props;
  if (index !== activeIndex || activeIndex < 0) return null;
  const RADIAN = Math.PI / 180;
  const cos = Math.cos(-RADIAN * midAngle);
  const sin = Math.sin(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 4) * cos;
  const sy = cy + (outerRadius + 4) * sin;
  const mx = cx + (outerRadius + 22) * cos;
  const my = cy + (outerRadius + 22) * sin;
  const isRight = cos >= 0;
  const elbow = 26;
  const ex = mx + (isRight ? 1 : -1) * elbow;
  const ey = my;
  const textAnchor = isRight ? 'start' : 'end';
  const tx = ex + (isRight ? 1 : -1) * 5;
  const label = `${name} (${value})`;
  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={lineColor}
        strokeWidth={1.5}
        fill="none"
      />
      <text
        x={tx}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill={textColor}
        fontSize={11}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
};

// --- ตัวช่วยแปลงค่า CSV (รองรับกรณีมีเครื่องหมายคำพูดคลุมจุลภาค) ---
const parseCSVRow = (rowText) => {
  let insideQuote = false;
  let entries = [];
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
  return entries.map(e => e.replace(/^"|"$/g, '')); // ลบ Quote ที่ครอบอยู่ออก
};

const sniffCsvHeadersLower = (text) => {
  const firstLine = (text || '').split(/\r?\n/)[0] || '';
  return parseCSVRow(firstLine).map((h) => h.toLowerCase().trim());
};

/** ลำดับคอลัมน์สำหรับ Export CSV หลังประมวลผล (ที่เหลือเรียงตามตัวอักษร) */
const EXPORT_CSV_COL_ORDER = [
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

const toCsvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildCsvFromObjectRows = (rows) => {
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

/** ลบแถวที่ซ้ำกันทุกคอลัมน์ (ค่าเท่ากันทุกฟิลด์) คงลำดับแถวแรกที่เจอ */
const rowFullDuplicateSignature = (row) => {
  const keys = Object.keys(row || {}).sort();
  return keys.map((k) => `${k}\u0001${row[k] ?? ''}`).join('\u0002');
};

const dedupeIdenticalRows = (rows) => {
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

const applyDistrictFilter = (rawData, districtFilter) => {
  if (!districtFilter) return [...(rawData || [])];
  return (rawData || []).filter(
    (row) => (row.subdistrict != null ? String(row.subdistrict).trim() : '') === districtFilter
  );
};

/** โรคที่ประเมินได้ต่อแถว — ต้องคง logic ให้ตรงกับ aggregateDashboardPayload / กราฟ */
const collectPersonDiseases = (row) => {
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

const bmiDistLabelForRow = (row) => {
  const bmi = parseFloat(row.bmi);
  if (isNaN(bmi) || bmi <= 0) return null;
  if (bmi < 18.5) return 'น้ำหนักต่ำ';
  if (bmi < 23) return 'ปกติ';
  if (bmi < 25) return 'น้ำหนักเกิน';
  if (bmi < 30) return 'อ้วน';
  return 'อ้วนมาก';
};

const bpDistLabelForRow = (row) => {
  const bpSys = parseFloat(row.bpsys);
  if (isNaN(bpSys) || bpSys <= 0) return null;
  if (bpSys < 120) return 'ปกติ';
  if (bpSys < 140) return 'สูงเล็กน้อย';
  if (bpSys < 160) return 'ระดับ 1';
  return 'ระดับ 2+';
};

const bgcDistLabelForRow = (row) => {
  const bgc = parseFloat(row.bgc);
  if (isNaN(bgc) || bgc <= 0) return null;
  if (bgc < 100) return 'ปกติ (<100)';
  if (bgc < 126) return 'เสี่ยง (100-125)';
  return 'สูง (≥126)';
};

const filterRowsByDiseaseName = (rows, diseaseName) =>
  rows.filter((row) => collectPersonDiseases(row).has(diseaseName));

const filterRowsByBmiCategory = (rows, categoryName) =>
  rows.filter((row) => bmiDistLabelForRow(row) === categoryName);

const filterRowsByBpCategory = (rows, categoryName) =>
  rows.filter((row) => bpDistLabelForRow(row) === categoryName);

const filterRowsByBgcCategory = (rows, categoryName) =>
  rows.filter((row) => bgcDistLabelForRow(row) === categoryName);

const filterRowsBySubdistrictMetric = (rows, metricLabel, districtName) => {
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

/** ลำดับคอลัมน์ใน modal ข้อมูลดิบ — ไม่รวม diseases (ไปท้ายเสมอ) และไม่รวม ชื่อผู้ใช้งาน (ซ้ำกับ username) */
const RAW_MODAL_COL_PRIORITY = [
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

const buildRawModalColumns = (rows) => {
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
const chartDrillEntry = (e) => e?.payload ?? e;

/** คำนวณ summary / กราฟทั้งหมดจากแถวต้นทาง — districtFilter ว่าง = ทุกตำบล */
const aggregateDashboardPayload = (rawData, districtFilter) => {
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

const triggerCsvDownload = (csvText, filenameBase = 'health-processed') => {
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

const CHART_TYPES = {
  bar: 'bar',
  pie: 'pie',
  line: 'line',
  area: 'area',
  table: 'table',
};

const ChartTypeSelect = ({ value, onChange, supportedTypes }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-white text-slate-900 border border-slate-300 rounded-md px-2 py-1 text-xs font-medium dark:bg-[#1c1c1c] dark:text-white dark:border-[#444]"
  >
    {supportedTypes.map((t) => (
      <option key={t} value={t}>
        {t.toUpperCase()}
      </option>
    ))}
  </select>
);

const SimpleTable = ({ headers, rows, onRowClick }) => (
  <div className="w-full overflow-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-slate-700 border-b border-slate-200 dark:text-gray-300 dark:border-[#333]">
          {headers.map((h) => (
            <th key={h} className="text-left py-2 pr-3 font-semibold whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr
            key={idx}
            onClick={onRowClick ? () => onRowClick(idx, r) : undefined}
            className={
              'border-b border-slate-100 text-slate-800 dark:border-[#2a2a2a] dark:text-gray-200' +
              (onRowClick ? ' cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a2a2a]' : '')
            }
            role={onRowClick ? 'button' : undefined}
          >
            {r.map((cell, cidx) => (
              <td key={cidx} className="py-2 pr-3 whitespace-nowrap">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

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

const CHART_DISTRICT_FILTER_KEYS = [
  'summary',
  'diseases',
  'bmiDist',
  'bp',
  'bgc',
  'byDistrict',
  'districtPeople',
];

const createEmptyChartDistrictFilters = () =>
  Object.fromEntries(CHART_DISTRICT_FILTER_KEYS.map((k) => [k, '']));

/** เลือกตำบลต่อกราฟ — ว่าง = ทุกตำบล */
const ChartDistrictSelect = ({ value, onChange, districtListAll }) => (
  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-gray-300 shrink-0">
    <span className="whitespace-nowrap">ตำบล</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="กรองตำบลในกราฟนี้"
      title="ทุกตำบล หรือเฉพาะตำบลที่เลือก"
      className="bg-white text-slate-900 border border-slate-300 rounded-md px-2 py-1.5 text-xs font-medium min-w-36 dark:bg-[#1c1c1c] dark:text-white dark:border-[#444]"
    >
      <option value="">ทุกตำบล</option>
      {(districtListAll || []).map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  </label>
);

// --- Main App ---

export default function App() {
  const [sourceHealthRows, setSourceHealthRows] = useState(buildInitialSourceRowsFromDemoPeople);
  const [chartDistrictFilters, setChartDistrictFilters] = useState(createEmptyChartDistrictFilters);
  const [districtPeopleMetric, setDistrictPeopleMetric] = useState(DISTRICT_PEOPLE_METRICS[0].id);

  const [chartTypes, setChartTypes] = useState({
    diseases: CHART_TYPES.bar,
    bmiDist: CHART_TYPES.pie,
    bp: CHART_TYPES.bar,
    bgc: CHART_TYPES.bar,
    byDistrict: CHART_TYPES.bar,
    districtPeople: CHART_TYPES.bar,
  });

  const fileInputRef = useRef(null);
  const processedExportRowsRef = useRef([]);
  const [processedRowCount, setProcessedRowCount] = useState(0);
  const [importTemplateSelectKey, setImportTemplateSelectKey] = useState(0);
  const [pieHoverSlice, setPieHoverSlice] = useState({ bmiDist: -1, bp: -1, bgc: -1 });
  const [rawModal, setRawModal] = useState(null);

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('health-dashboard-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('health-dashboard-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const districtListAll = useMemo(
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

  useEffect(() => {
    const valid = new Set(districtListAll);
    setChartDistrictFilters((prev) => {
      let next = null;
      for (const k of CHART_DISTRICT_FILTER_KEYS) {
        const v = prev[k];
        if (v && !valid.has(v)) {
          if (!next) next = { ...prev };
          next[k] = '';
        }
      }
      return next || prev;
    });
  }, [districtListAll]);

  useEffect(() => {
    const rowsForExport = (sourceHealthRows || []).map((row) => {
      const o = { ...row };
      const uname = pickUsernameFromRow(row);
      const hasNameCol =
        (o['ชื่อผู้ใช้งาน'] != null && String(o['ชื่อผู้ใช้งาน']).trim() !== '') ||
        (o.username != null && String(o.username).trim() !== '');
      if (uname && !hasNameCol) o['ชื่อผู้ใช้งาน'] = uname;
      return o;
    });
    processedExportRowsRef.current = rowsForExport;
    setProcessedRowCount(rowsForExport.length);
  }, [sourceHealthRows]);

  const chartPayloads = useMemo(() => {
    const f = chartDistrictFilters;
    return {
      summary: aggregateDashboardPayload(sourceHealthRows, f.summary),
      diseases: aggregateDashboardPayload(sourceHealthRows, f.diseases),
      bmiDist: aggregateDashboardPayload(sourceHealthRows, f.bmiDist),
      bp: aggregateDashboardPayload(sourceHealthRows, f.bp),
      bgc: aggregateDashboardPayload(sourceHealthRows, f.bgc),
      byDistrict: aggregateDashboardPayload(sourceHealthRows, f.byDistrict),
      districtPeople: aggregateDashboardPayload(sourceHealthRows, f.districtPeople),
    };
  }, [sourceHealthRows, chartDistrictFilters]);

  const { summary } = chartPayloads.summary;
  const { diseasesData } = chartPayloads.diseases;
  const { bmiDistData } = chartPayloads.bmiDist;
  const { bpData } = chartPayloads.bp;
  const { bgcData } = chartPayloads.bgc;
  const { districts, subDistrictData } = chartPayloads.byDistrict;
  const peopleRows = chartPayloads.districtPeople.peopleRows;

  const closeRawModal = () => setRawModal(null);

  const openRawDrilldown = (title, rows) => {
    setRawModal({ title, rows: rows || [] });
  };

  const drillDiseases = (categoryName) => {
    if (categoryName == null || String(categoryName) === '') return;
    const base = applyDistrictFilter(sourceHealthRows, chartDistrictFilters.diseases);
    const rows = filterRowsByDiseaseName(base, categoryName);
    openRawDrilldown(`${categoryName} — ข้อมูลดิบ (${rows.length} แถว)`, rows);
  };

  const drillBmi = (categoryName) => {
    if (categoryName == null || String(categoryName) === '') return;
    const base = applyDistrictFilter(sourceHealthRows, chartDistrictFilters.bmiDist);
    const rows = filterRowsByBmiCategory(base, categoryName);
    openRawDrilldown(`${categoryName} (BMI) — ข้อมูลดิบ (${rows.length} แถว)`, rows);
  };

  const drillBp = (categoryName) => {
    if (categoryName == null || String(categoryName) === '') return;
    const base = applyDistrictFilter(sourceHealthRows, chartDistrictFilters.bp);
    const rows = filterRowsByBpCategory(base, categoryName);
    openRawDrilldown(`${categoryName} (ความดัน Sys) — ข้อมูลดิบ (${rows.length} แถว)`, rows);
  };

  const drillBgc = (categoryName) => {
    if (categoryName == null || String(categoryName) === '') return;
    const base = applyDistrictFilter(sourceHealthRows, chartDistrictFilters.bgc);
    const rows = filterRowsByBgcCategory(base, categoryName);
    openRawDrilldown(`${categoryName} (BGC) — ข้อมูลดิบ (${rows.length} แถว)`, rows);
  };

  const drillByDistrictBar = (metricLabel, districtName) => {
    if (metricLabel == null || districtName == null) return;
    const base = applyDistrictFilter(sourceHealthRows, chartDistrictFilters.byDistrict);
    const rows = filterRowsBySubdistrictMetric(base, metricLabel, districtName);
    openRawDrilldown(`${metricLabel} · ${districtName} — ข้อมูลดิบ (${rows.length} แถว)`, rows);
  };

  const drillDistrictPersonBar = (item) => {
    const ent = chartDrillEntry(item);
    const raw = ent?.rawRow;
    if (!raw || typeof raw !== 'object') return;
    const label = ent?.name ?? pickUsernameFromRow(raw) ?? 'รายละเอียด';
    openRawDrilldown(`${label} — ข้อมูลดิบ (1 แถว)`, [raw]);
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result ?? '');
      reader.onerror = () => reject(reader.error || new Error('Failed to read file as text'));
      reader.readAsText(file);
    });

  const readFileAsArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file as ArrayBuffer'));
      reader.readAsArrayBuffer(file);
    });

  const isExcelFile = (file) => {
    const name = (file?.name || '').toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls');
  };

  // ฟังก์ชันดักจับตอนเลือกไฟล์ CSV/Excel
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      if (isExcelFile(file)) {
        const buf = await readFileAsArrayBuffer(file);
        const wb = XLSX.read(buf, { type: 'array' });
        const firstSheetName = wb.SheetNames?.[0];
        if (!firstSheetName) return;
        const ws = wb.Sheets[firstSheetName];

        // ถ้าเป็นไฟล์ดิบ (มี Health Data) ให้ convert เหมือน ProcessData.py ก่อน
        const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: null });
        const headersLower = Object.keys(jsonRows?.[0] || {}).map((k) => String(k).toLowerCase().trim());
        if (isRawHealthFormatHeaders(headersLower)) {
          const finalObjects = convertHealthRowsToFinalObjects(jsonRows);
          const csvText = objectsToCsv(finalObjects);
          processCSV(csvText);
        } else {
          // กรณีเป็นไฟล์ที่เป็นตาราง final อยู่แล้ว ก็ส่งเข้า processCSV เดิมได้
          const csvText = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\n' });
          processCSV(csvText);
        }
      } else {
        const text = await readFileAsText(file);
        // ถ้าเป็น CSV ดิบ (มี Health Data) ให้แปลงก่อน
        const headersLower = sniffCsvHeadersLower(text);
        if (isRawHealthFormatHeaders(headersLower)) {
          const lines = text.trim().split(/\r?\n/);
          if (lines.length >= 2) {
            const headers = parseCSVRow(lines[0]);
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
              const values = parseCSVRow(lines[i]);
              if (values.length >= headers.length) {
                const obj = {};
                headers.forEach((h, idx) => { obj[h] = values[idx]; });
                rows.push(obj);
              }
            }
            const finalObjects = convertHealthRowsToFinalObjects(rows);
            const convertedCsv = objectsToCsv(finalObjects);
            processCSV(convertedCsv);
          }
        } else {
          processCSV(text);
        }
      }
    } finally {
      // เคลียร์ค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
      event.target.value = '';
    }
  };

  const handleExportProcessedCsv = () => {
    const rows = processedExportRowsRef.current;
    if (!rows?.length) return;
    const csv = buildCsvFromObjectRows(rows);
    triggerCsvDownload(csv, 'health-dashboard-processed');
  };

  const handleDownloadImportTemplateCsv = () => {
    const csv = buildDashboardImportTemplateCsv();
    triggerCsvDownload(csv, 'health-dashboard-import-template');
  };

  const handleDownloadImportTemplateExcel = () => {
    const aoa = buildDashboardImportTemplateAoA();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูล');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `health-dashboard-import-template-${date}.xlsx`);
  };

  // ฟังก์ชันอ่านและคำนวณข้อมูลจาก CSV
  const processCSV = (text) => {
    const lines = text.trim().split(/\r?\n/); // รองรับทั้ง \n และ \r\n
    if (lines.length < 2) return; // ต้องมี Header และข้อมูลอย่างน้อย 1 แถว

    // ทำ Header ให้เป็นตัวเล็กและตัดช่องว่างเพื่อป้องกันปัญหาการอ่านคอลัมน์ไม่เจอ
    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((h, index) => { row[h] = values[index]; });
        data.push(row);
      }
    }

    const deDuplicated = dedupeIdenticalRows(data);
    setSourceHealthRows(deDuplicated);
    setChartDistrictFilters(createEmptyChartDistrictFilters());
  };

  // ฟังก์ชันคำนวณสถานะข้อความแบบอัตโนมัติ (อัปเดตเกณฑ์ให้ละเอียดตรงกับกราฟ)
  const getBmiStatus = (val) => {
    if (val === "-" || val === "0.0") return "ไม่มีข้อมูล";
    const num = parseFloat(val);
    if (num < 18.5) return 'น้ำหนักต่ำ';
    if (num < 23) return 'ปกติ';
    if (num < 25) return 'น้ำหนักเกิน';
    if (num < 30) return 'อ้วน';
    return 'อ้วนมาก';
  };

  const getBgcStatus = (val) => {
    if (val === "-" || val === "0.0") return "ไม่มีข้อมูล";
    const num = parseFloat(val);
    if (num >= 126) return "สูงกว่าค่าปกติ";
    if (num >= 100) return "เสี่ยง";
    return "ปกติ";
  };

  const getBpStatus = (val) => {
    if (val === "-" || val === "0.0") return "ไม่มีข้อมูล";
    const num = parseFloat(val);
    if (num >= 160) return "ระดับ 2+";
    if (num >= 140) return "ระดับ 1";
    if (num >= 120) return "ระดับสูงเล็กน้อย";
    return "ปกติ";
  };

  const getSpo2Status = (val) => {
    if (val === "-" || val === "0.0") return "ไม่มีข้อมูล";
    const num = parseFloat(val);
    if (num >= 95) return "อยู่ในเกณฑ์ปกติ";
    return "ต่ำกว่าเกณฑ์";
  };

  const chartUi = theme === 'dark'
    ? { grid: '#333', tick: '#888', ttBg: '#1c1c1c', ttBorder: '#333', ttColor: '#fff', cursor: '#ffffff10' }
    : { grid: '#e2e8f0', tick: '#64748b', ttBg: '#ffffff', ttBorder: '#e2e8f0', ttColor: '#0f172a', cursor: '#00000012' };

  const pieHoverLabelBmi = createPieHoverOutsideLabel(pieHoverSlice.bmiDist, chartUi.tick, chartUi.ttColor);
  const pieHoverLabelBp = createPieHoverOutsideLabel(pieHoverSlice.bp, chartUi.tick, chartUi.ttColor);
  const pieHoverLabelBgc = createPieHoverOutsideLabel(pieHoverSlice.bgc, chartUi.tick, chartUi.ttColor);

  const districtPeopleMetricDef =
    DISTRICT_PEOPLE_METRICS.find((m) => m.id === districtPeopleMetric) || DISTRICT_PEOPLE_METRICS[0];

  const districtPeopleClinicalYValues =
    DISTRICT_PEOPLE_CLINICAL_REFS[districtPeopleMetric] ?? [];

  const { districtPeopleChartData, districtPeopleTableRows, districtPeopleSorted } = useMemo(() => {
    const def = DISTRICT_PEOPLE_METRICS.find((m) => m.id === districtPeopleMetric) || DISTRICT_PEOPLE_METRICS[0];
    const field = def.field;
    const sortedFiltered = [...peopleRows].sort((a, b) => {
      const na = (a.username != null ? String(a.username) : '').trim();
      const nb = (b.username != null ? String(b.username) : '').trim();
      const byName = na.localeCompare(nb, 'th', { sensitivity: 'base' });
      if (byName !== 0) return byName;
      const sa = (a.subdistrict || '').trim();
      const sb = (b.subdistrict || '').trim();
      return sa.localeCompare(sb, 'th', { sensitivity: 'base' });
    });

    const withVals = sortedFiltered
      .map((p, idx) => {
        const val = getPeopleMetricValue(p, field);
        const baseName = (p.username && String(p.username).trim()) || `ผู้ใช้ ${idx + 1}`;
        return { baseName, value: val, idx, person: p };
      })
      .filter((d) => d.value != null);

    const nameCount = {};
    withVals.forEach((d) => {
      nameCount[d.baseName] = (nameCount[d.baseName] || 0) + 1;
    });

    const chartData = withVals.map((d, i) => ({
      name: nameCount[d.baseName] > 1 ? `${d.baseName} (${i + 1})` : d.baseName,
      value: d.value,
      rawRow: d.person?.rawRow && typeof d.person.rawRow === 'object' ? d.person.rawRow : null,
    }));

    const tableRows = sortedFiltered.map((p, idx) => {
      const v = getPeopleMetricValue(p, field);
      return [
        p.username || `แถว ${idx + 1}`,
        p.subdistrict || '—',
        v != null ? String(v) : '—',
      ];
    });

    return {
      districtPeopleChartData: chartData,
      districtPeopleTableRows: tableRows,
      districtPeopleSorted: sortedFiltered,
    };
  }, [peopleRows, districtPeopleMetric]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#1c1c1c] p-6 font-sans">
      
      {/* Header & Import Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-2 gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ภาพรวมสุขภาพประชากร</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-[#444] dark:bg-[#1f1f1f] dark:shadow-none"
            role="group"
            aria-label="ธีมแสดงผล"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={
                theme === 'light'
                  ? 'rounded-md px-3 py-1.5 text-xs font-semibold bg-sky-100 text-sky-900 dark:bg-[#3a3a3a] dark:text-white'
                  : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-[#2a2a2a]'
              }
            >
              สว่าง
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={
                theme === 'dark'
                  ? 'rounded-md px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white dark:bg-[#3a3a3a]'
                  : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-[#2a2a2a]'
              }
            >
              มืด
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <select
              key={importTemplateSelectKey}
              aria-label="ดาวน์โหลดเทมเพลต"
              title="เลือกรูปแบบไฟล์เทมเพลต (หัวคอลัมน์ + แถวตัวอย่าง)"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'csv') handleDownloadImportTemplateCsv();
                else if (v === 'xlsx') handleDownloadImportTemplateExcel();
                setImportTemplateSelectKey((k) => k + 1);
              }}
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
              onClick={() => fileInputRef.current.click()} 
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a] dark:text-white dark:border-[#444] dark:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import CSV / Excel
            </button>
            <button
              type="button"
              onClick={handleExportProcessedCsv}
              disabled={processedRowCount === 0}
              title={processedRowCount === 0 ? 'นำเข้าไฟล์ก่อน จึงจะส่งออกได้' : `ส่งออก ${processedRowCount} แถว`}
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-45 disabled:pointer-events-none dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a] dark:text-white dark:border-[#444] dark:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export ข้อมูล (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* 1. Summary Header */}
      <div className="mb-8 px-2">
        <div className="flex justify-end mb-3">
          <ChartDistrictSelect
            value={chartDistrictFilters.summary}
            onChange={(v) => setChartDistrictFilters((s) => ({ ...s, summary: v }))}
            districtListAll={districtListAll}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <SummaryCard title="BMI เฉลี่ย" value={summary.bmi} unit="kg/m²" status={getBmiStatus(summary.bmi)} />
          <SummaryCard title="น้ำตาลในเลือด (BGC)" value={summary.bgc} unit="mg/dL" status={getBgcStatus(summary.bgc)} />
          <SummaryCard title="ความดันโลหิต (Sys)" value={summary.bpSys} unit="mmHg" status={getBpStatus(summary.bpSys)} />
          <SummaryCard title="SpO2 เฉลี่ย" value={summary.spo2} unit="%" status={getSpo2Status(summary.spo2)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* 2. โรคประจำตัว — ภาพรวม */}
        <div className="bg-white dark:bg-[#242424] rounded-xl p-5 border border-slate-200 dark:border-[#333] shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-semibold">การประเมินความเสี่ยง / โรคประจำตัว</h3>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ChartDistrictSelect
                value={chartDistrictFilters.diseases}
                onChange={(v) => setChartDistrictFilters((s) => ({ ...s, diseases: v }))}
                districtListAll={districtListAll}
              />
              <ChartTypeSelect
                value={chartTypes.diseases}
                onChange={(t) => setChartTypes((s) => ({ ...s, diseases: t }))}
                supportedTypes={[CHART_TYPES.bar, CHART_TYPES.line, CHART_TYPES.area, CHART_TYPES.table]}
              />
            </div>
          </div>
          {diseasesData.length > 0 ? (
            <>
              <CustomLegend data={diseasesData} />
              <div className="h-64 w-full mt-2">
                {chartTypes.diseases === CHART_TYPES.table ? (
                  <SimpleTable
                    headers={['หัวข้อ', 'จำนวน']}
                    rows={diseasesData.map((d) => [d.name, d.value])}
                    onRowClick={(_, r) => drillDiseases(r[0])}
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartTypes.diseases === CHART_TYPES.line ? (
                      <LineChart data={diseasesData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: chartUi.tick, fontSize: 10, angle: -35, textAnchor: 'end' }}
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#e55f30"
                          strokeWidth={2}
                          dot={(dotProps) => {
                            const { cx, cy, payload } = dotProps;
                            if (cx == null || cy == null) return null;
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#e55f30"
                                stroke={chartUi.ttBg}
                                strokeWidth={1}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  drillDiseases(payload?.name);
                                }}
                              />
                            );
                          }}
                        />
                      </LineChart>
                    ) : chartTypes.diseases === CHART_TYPES.area ? (
                      <AreaChart data={diseasesData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: chartUi.tick, fontSize: 10, angle: -35, textAnchor: 'end' }}
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#e55f30"
                          fill="#e55f3033"
                          strokeWidth={2}
                          dot={(dotProps) => {
                            const { cx, cy, payload } = dotProps;
                            if (cx == null || cy == null) return null;
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#e55f30"
                                stroke={chartUi.ttBg}
                                strokeWidth={1}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  drillDiseases(payload?.name);
                                }}
                              />
                            );
                          }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={diseasesData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: chartUi.tick, fontSize: 10, angle: -35, textAnchor: 'end' }}
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                        <Bar
                          dataKey="value"
                          radius={[4, 4, 0, 0]}
                          label={<CustomBarLabel />}
                          cursor="pointer"
                          onClick={(item) => drillDiseases(chartDrillEntry(item)?.name)}
                        >
                          {diseasesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 dark:text-gray-500">ไม่มีข้อมูลโรคประจำตัว</div>
          )}
        </div>

        {/* 3. BMI — การกระจายตัว */}
        <div className="bg-white dark:bg-[#242424] rounded-xl p-5 border border-slate-200 dark:border-[#333] shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-semibold">BMI — การกระจายตัว</h3>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ChartDistrictSelect
                value={chartDistrictFilters.bmiDist}
                onChange={(v) => setChartDistrictFilters((s) => ({ ...s, bmiDist: v }))}
                districtListAll={districtListAll}
              />
              <ChartTypeSelect
                value={chartTypes.bmiDist}
                onChange={(t) => setChartTypes((s) => ({ ...s, bmiDist: t }))}
                supportedTypes={[CHART_TYPES.pie, CHART_TYPES.bar, CHART_TYPES.line, CHART_TYPES.area, CHART_TYPES.table]}
              />
            </div>
          </div>
          <CustomLegend data={bmiDistData} />
          <div className="h-64 w-full flex justify-center items-center">
            {chartTypes.bmiDist === CHART_TYPES.table ? (
              <SimpleTable
                headers={['กลุ่ม', 'จำนวน']}
                rows={bmiDistData.map((d) => [d.name, d.value])}
                onRowClick={(_, r) => drillBmi(r[0])}
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartTypes.bmiDist === CHART_TYPES.pie ? (
                  <PieChart margin={{ top: 28, right: 56, bottom: 28, left: 56 }}>
                    <Pie
                      data={bmiDistData.filter(d => d.value > 0)} /* กรอง 0 ออกเพื่อไม่ให้ Pie Chart มีเส้นขยะ */
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      label={pieHoverLabelBmi}
                      labelLine={false}
                      cursor="pointer"
                      onClick={(entry) => {
                        const e = chartDrillEntry(entry);
                        if (e?.name) drillBmi(e.name);
                      }}
                      onMouseEnter={(_, i) => setPieHoverSlice((s) => ({ ...s, bmiDist: i }))}
                      onMouseLeave={() => setPieHoverSlice((s) => ({ ...s, bmiDist: -1 }))}
                    >
                      {bmiDistData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                  </PieChart>
                ) : chartTypes.bmiDist === CHART_TYPES.line ? (
                  <LineChart data={bmiDistData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1fb173"
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#1fb173"
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillBmi(payload?.name);
                            }}
                          />
                        );
                      }}
                    />
                  </LineChart>
                ) : chartTypes.bmiDist === CHART_TYPES.area ? (
                  <AreaChart data={bmiDistData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#1fb173"
                      fill="#1fb17333"
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#1fb173"
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillBmi(payload?.name);
                            }}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={bmiDistData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barSize={45}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      label={<CustomBarLabel />}
                      cursor="pointer"
                      onClick={(item) => drillBmi(chartDrillEntry(item)?.name)}
                    >
                      {bmiDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* 4. ระดับความดันโลหิต (Systolic) */}
        <div className="bg-white dark:bg-[#242424] rounded-xl p-5 border border-slate-200 dark:border-[#333] shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-semibold">ระดับความดันโลหิต (Systolic)</h3>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ChartDistrictSelect
                value={chartDistrictFilters.bp}
                onChange={(v) => setChartDistrictFilters((s) => ({ ...s, bp: v }))}
                districtListAll={districtListAll}
              />
              <ChartTypeSelect
                value={chartTypes.bp}
                onChange={(t) => setChartTypes((s) => ({ ...s, bp: t }))}
                supportedTypes={[CHART_TYPES.bar, CHART_TYPES.pie, CHART_TYPES.line, CHART_TYPES.area, CHART_TYPES.table]}
              />
            </div>
          </div>
          <CustomLegend data={bpData} />
          <div className="h-60 w-full mt-2">
            {chartTypes.bp === CHART_TYPES.table ? (
              <SimpleTable
                headers={['กลุ่ม', 'จำนวน']}
                rows={bpData.map((d) => [d.name, d.value])}
                onRowClick={(_, r) => drillBp(r[0])}
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartTypes.bp === CHART_TYPES.pie ? (
                  <PieChart margin={{ top: 28, right: 56, bottom: 28, left: 56 }}>
                    <Pie
                      data={bpData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      label={pieHoverLabelBp}
                      labelLine={false}
                      cursor="pointer"
                      onClick={(entry) => {
                        const e = chartDrillEntry(entry);
                        if (e?.name) drillBp(e.name);
                      }}
                      onMouseEnter={(_, i) => setPieHoverSlice((s) => ({ ...s, bp: i }))}
                      onMouseLeave={() => setPieHoverSlice((s) => ({ ...s, bp: -1 }))}
                    >
                      {bpData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                  </PieChart>
                ) : chartTypes.bp === CHART_TYPES.line ? (
                  <LineChart data={bpData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#e55f30"
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#e55f30"
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillBp(payload?.name);
                            }}
                          />
                        );
                      }}
                    />
                  </LineChart>
                ) : chartTypes.bp === CHART_TYPES.area ? (
                  <AreaChart data={bpData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#e55f30"
                      fill="#e55f3033"
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#e55f30"
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillBp(payload?.name);
                            }}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={bpData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barSize={45}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      label={<CustomBarLabel />}
                      cursor="pointer"
                      onClick={(item) => drillBp(chartDrillEntry(item)?.name)}
                    >
                      {bpData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 5. ระดับน้ำตาลในเลือด (BGC) */}
        <div className="bg-white dark:bg-[#242424] rounded-xl p-5 border border-slate-200 dark:border-[#333] shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-semibold">ระดับน้ำตาลในเลือด (BGC)</h3>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ChartDistrictSelect
                value={chartDistrictFilters.bgc}
                onChange={(v) => setChartDistrictFilters((s) => ({ ...s, bgc: v }))}
                districtListAll={districtListAll}
              />
              <ChartTypeSelect
                value={chartTypes.bgc}
                onChange={(t) => setChartTypes((s) => ({ ...s, bgc: t }))}
                supportedTypes={[CHART_TYPES.bar, CHART_TYPES.pie, CHART_TYPES.line, CHART_TYPES.area, CHART_TYPES.table]}
              />
            </div>
          </div>
          <CustomLegend data={bgcData} />
          <div className="h-60 w-full mt-2">
            {chartTypes.bgc === CHART_TYPES.table ? (
              <SimpleTable
                headers={['กลุ่ม', 'จำนวน']}
                rows={bgcData.map((d) => [d.name, d.value])}
                onRowClick={(_, r) => drillBgc(r[0])}
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartTypes.bgc === CHART_TYPES.pie ? (
                  <PieChart margin={{ top: 28, right: 56, bottom: 28, left: 56 }}>
                    <Pie
                      data={bgcData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      label={pieHoverLabelBgc}
                      labelLine={false}
                      cursor="pointer"
                      onClick={(entry) => {
                        const e = chartDrillEntry(entry);
                        if (e?.name) drillBgc(e.name);
                      }}
                      onMouseEnter={(_, i) => setPieHoverSlice((s) => ({ ...s, bgc: i }))}
                      onMouseLeave={() => setPieHoverSlice((s) => ({ ...s, bgc: -1 }))}
                    >
                      {bgcData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                  </PieChart>
                ) : chartTypes.bgc === CHART_TYPES.line ? (
                  <LineChart data={bgcData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ef4b4b"
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#ef4b4b"
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillBgc(payload?.name);
                            }}
                          />
                        );
                      }}
                    />
                  </LineChart>
                ) : chartTypes.bgc === CHART_TYPES.area ? (
                  <AreaChart data={bgcData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#ef4b4b"
                      fill="#ef4b4b33"
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#ef4b4b"
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillBgc(payload?.name);
                            }}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={bgcData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barSize={70}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      label={<CustomTopLabel />}
                      cursor="pointer"
                      onClick={(item) => drillBgc(chartDrillEntry(item)?.name)}
                    >
                      {bgcData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* 6. ค่าสุขภาพเฉลี่ยแยกตำบล */}
      <div className="bg-white dark:bg-[#242424] rounded-xl p-5 border border-slate-200 dark:border-[#333] shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-slate-900 dark:text-white font-semibold">ค่าสุขภาพเฉลี่ยแยกตำบล</h3>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <ChartDistrictSelect
              value={chartDistrictFilters.byDistrict}
              onChange={(v) => setChartDistrictFilters((s) => ({ ...s, byDistrict: v }))}
              districtListAll={districtListAll}
            />
            <ChartTypeSelect
              value={chartTypes.byDistrict}
              onChange={(t) => setChartTypes((s) => ({ ...s, byDistrict: t }))}
              supportedTypes={[CHART_TYPES.bar, CHART_TYPES.line, CHART_TYPES.area, CHART_TYPES.table]}
            />
          </div>
        </div>
        <CustomLegend data={districts.map((d, i) => ({ name: d, color: districtColors[i % districtColors.length] }))} />
        <div className="h-72 w-full mt-2">
          {chartTypes.byDistrict === CHART_TYPES.table ? (
            <SimpleTable
              headers={['Metric', ...districts]}
              rows={subDistrictData.map((row) => [row.metric, ...districts.map((d) => row[d] ?? 0)])}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartTypes.byDistrict === CHART_TYPES.line ? (
                <LineChart data={subDistrictData} margin={{ top: 20, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                  <XAxis dataKey="metric" tick={{ fill: chartUi.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                  {districts.map((d, i) => (
                    <Line
                      key={d}
                      type="monotone"
                      dataKey={d}
                      stroke={districtColors[i % districtColors.length]}
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        const fill = districtColors[i % districtColors.length];
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={fill}
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillByDistrictBar(payload?.metric, d);
                            }}
                          />
                        );
                      }}
                    />
                  ))}
                </LineChart>
              ) : chartTypes.byDistrict === CHART_TYPES.area ? (
                <AreaChart data={subDistrictData} margin={{ top: 20, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                  <XAxis dataKey="metric" tick={{ fill: chartUi.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />
                  {districts.map((d, i) => (
                    <Area
                      key={d}
                      type="monotone"
                      dataKey={d}
                      stroke={districtColors[i % districtColors.length]}
                      fill={`${districtColors[i % districtColors.length]}33`}
                      strokeWidth={2}
                      dot={(dotProps) => {
                        const { cx, cy, payload } = dotProps;
                        const fill = districtColors[i % districtColors.length];
                        if (cx == null || cy == null) return null;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={fill}
                            stroke={chartUi.ttBg}
                            strokeWidth={1}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              drillByDistrictBar(payload?.metric, d);
                            }}
                          />
                        );
                      }}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={subDistrictData} margin={{ top: 20, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                  <XAxis dataKey="metric" tick={{ fill: chartUi.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip cursor={{ fill: chartUi.cursor }} contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }} />

                  {districts.map((d, i) => (
                    <Bar
                      key={d}
                      dataKey={d}
                      fill={districtColors[i % districtColors.length]}
                      radius={[2, 2, 0, 0]}
                      label={<CustomTopLabel />}
                      cursor="pointer"
                      onClick={(payload) => drillByDistrictBar(chartDrillEntry(payload)?.metric, d)}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 7. รายบุคคลตามตำบล — เลือกตำบลและตัวชี้วัดสุขภาพ */}
      <div className="bg-white dark:bg-[#242424] rounded-xl p-5 border border-slate-200 dark:border-[#333] shadow-sm dark:shadow-none mt-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-slate-900 dark:text-white font-semibold">รายบุคคลตามตำบล</h3>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ChartDistrictSelect
                value={chartDistrictFilters.districtPeople}
                onChange={(v) => setChartDistrictFilters((s) => ({ ...s, districtPeople: v }))}
                districtListAll={districtListAll}
              />
              <ChartTypeSelect
                value={chartTypes.districtPeople}
                onChange={(t) => setChartTypes((s) => ({ ...s, districtPeople: t }))}
                supportedTypes={[CHART_TYPES.bar, CHART_TYPES.table]}
              />
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-400">
            เลือกตำบลและตัวชี้วัดในกล่องนี้เพื่อดูค่าสุขภาพรายคน (ต้องมีคอลัมน์{' '}
            <span className="font-medium">ชื่อผู้ใช้งาน</span> / subdistrict ในไฟล์ข้อมูล)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-gray-300">
              <span className="whitespace-nowrap">ตัวชี้วัด</span>
              <select
                value={districtPeopleMetric}
                onChange={(e) => setDistrictPeopleMetric(e.target.value)}
                className="bg-white text-slate-900 border border-slate-300 rounded-md px-2 py-1.5 text-xs font-medium min-w-48 dark:bg-[#1c1c1c] dark:text-white dark:border-[#444]"
              >
                {DISTRICT_PEOPLE_METRICS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chartTypes.districtPeople == CHART_TYPES.bar && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-700 dark:border-[#333] dark:bg-[#1a1a1a] dark:text-gray-300 space-y-1.5">
            <p className="font-semibold text-slate-800 dark:text-gray-200">
              เส้นประสีแดง — {districtPeopleMetricDef.label}
            </p>
            <p className="leading-relaxed text-slate-600 dark:text-gray-400">
              {DISTRICT_PEOPLE_CLINICAL_EXPLAIN[districtPeopleMetric] ??
                'ไม่มีเกณฑ์อ้างอิงสำหรับตัวชี้วัดนี้'}
            </p>
            <p className="text-slate-500 dark:text-gray-500 text-[11px]">
              เกณฑ์เดียวกับการแบ่งกลุ่ม/ประเมินในแดชบอร์ด — อ่านค่าบนแกนตั้งเทียบกับเส้นได้โดยตรง
            </p>
          </div>
          )}
        </div>

        {chartTypes.districtPeople === CHART_TYPES.table ? (
          <SimpleTable
            headers={['ชื่อผู้ใช้งาน', 'ตำบล', districtPeopleMetricDef.label]}
            rows={districtPeopleTableRows}
            onRowClick={(idx) => {
              const p = districtPeopleSorted[idx];
              if (p?.rawRow && typeof p.rawRow === 'object') {
                openRawDrilldown(`${p.username || 'รายละเอียด'} — ข้อมูลดิบ (1 แถว)`, [p.rawRow]);
              }
            }}
          />
        ) : districtPeopleChartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-400 dark:text-gray-500 text-sm">
            ไม่มีข้อมูลตัวเลขสำหรับตัวชี้วัดนี้ในช่วงที่เลือก
          </div>
        ) : (
          <div className="h-80 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={districtPeopleChartData}
                margin={{ top: 16, right: 12, left: -12, bottom: districtPeopleChartData.length > 4 ? 56 : 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: chartUi.tick, fontSize: 10, angle: districtPeopleChartData.length > 3 ? -30 : 0, textAnchor: 'end' }}
                  interval={0}
                  height={districtPeopleChartData.length > 3 ? 52 : 28}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: chartUi.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                {districtPeopleClinicalYValues.map((yVal, ri) => (
                  <ReferenceLine
                    key={`cref-${districtPeopleMetric}-${yVal}-${ri}`}
                    y={yVal}
                    stroke="#ef4b4b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    isFront
                  />
                ))}
                <Tooltip
                  cursor={{ fill: chartUi.cursor }}
                  contentStyle={{ backgroundColor: chartUi.ttBg, borderColor: chartUi.ttBorder, color: chartUi.ttColor }}
                  formatter={(v) => [v, districtPeopleMetricDef.label]}
                />
                <Bar
                  dataKey="value"
                  fill="#348bd6"
                  radius={[4, 4, 0, 0]}
                  label={<CustomTopLabel />}
                  cursor="pointer"
                  onClick={(item) => drillDistrictPersonBar(item)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <RawDataModal
        open={!!rawModal}
        title={rawModal?.title ?? ''}
        rows={rawModal?.rows ?? []}
        onClose={closeRawModal}
      />

    </div>
  );
}