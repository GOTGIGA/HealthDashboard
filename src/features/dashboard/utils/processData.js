const DEFAULT_OUTPUT_HEADERS = [
  'subDistrict',
  'ชื่อผู้ใช้งาน',
  'Time',
  'adl',
  'bgc',
  'bmi',
  'bpSys',
  'bw',
  'hei',
  'hr',
  'o2_diff',
  'resp',
  'spo2',
  'temp',
  'diseases',
];

const toStringSafe = (v) => (v === null || v === undefined ? '' : String(v));

const normalizeHeaderKey = (key) => toStringSafe(key).trim().toLowerCase();

const getFirstMatchingKey = (obj, candidateKeys) => {
  const normalizedMap = new Map();
  Object.keys(obj || {}).forEach((k) => normalizedMap.set(normalizeHeaderKey(k), k));
  for (const c of candidateKeys) {
    const found = normalizedMap.get(normalizeHeaderKey(c));
    if (found) return found;
  }
  return null;
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractValue = (text, key) => {
  const t = toStringSafe(text);
  if (!t.includes(key)) return null;
  const re = new RegExp(`${escapeRegExp(key)}\\s*([\\d./]+)`, 'i');
  const m = t.match(re);
  return m?.[1] ?? null;
};

const toCsvValue = (v) => {
  const s = toStringSafe(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const objectsToCsv = (rows, headers = DEFAULT_OUTPUT_HEADERS) => {
  const headerLine = headers.join(',');
  const lines = (rows || []).map((r) => headers.map((h) => toCsvValue(r?.[h] ?? '')).join(','));
  return [headerLine, ...lines].join('\n');
};

export const isRawHealthFormatHeaders = (headersLower) => {
  const hs = new Set((headersLower || []).map((h) => normalizeHeaderKey(h)));
  // ฟอร์แมตดิบจากไฟล์รายงาน: มี Health Data และคอลัมน์ไทย (ลำดับ/ตำบล) หรือ Time
  return hs.has('health data') && (hs.has('ลำดับ') || hs.has('ตำบล') || hs.has('time'));
};

export const convertHealthRowsToFinalObjects = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  let lastSeq = null;
  let lastSub = null;
  let lastTime = null;

  const groups = new Map();

  for (const row of safeRows) {
    if (!row || typeof row !== 'object') continue;

    const seqKey = getFirstMatchingKey(row, ['ลำดับ', 'ลำาดับ', 'ลำ ดับ', 'ลำดับ.']);
    const subKey = getFirstMatchingKey(row, ['ตำบล', 'subdistrict', 'subDistrict']);
    const timeKey = getFirstMatchingKey(row, ['time', 'Time']);
    const healthKey = getFirstMatchingKey(row, ['Health Data', 'health data', 'healthdata']);

    const seqRaw = seqKey ? row[seqKey] : null;
    const subRaw = subKey ? row[subKey] : null;
    const timeRaw = timeKey ? row[timeKey] : null;

    const seq = toStringSafe(seqRaw).trim() || (lastSeq ?? '');
    const subDistrict = toStringSafe(subRaw).trim() || (lastSub ?? '');
    const time = toStringSafe(timeRaw).trim() || (lastTime ?? '');

    if (seq) lastSeq = seq;
    if (subDistrict) lastSub = subDistrict;
    if (time) lastTime = time;

    const groupKey = `${seq}__${subDistrict}__${time}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        subDistrict,
        'ชื่อผู้ใช้งาน': '',
        Time: time,
        adl: 0,
        bgc: 0,
        bmi: 0,
        bpSys: 0,
        bw: 0,
        hei: 0,
        hr: 0,
        o2_diff: 0,
        resp: 0,
        spo2: 0,
        temp: 0,
        diseases: '',
      });
    }

    const out = groups.get(groupKey);
    const userNameKey = getFirstMatchingKey(row, [
      'ชื่อผู้ใช้งาน',
      'username',
      'user',
      'userid',
      'ชื่อผู้ใช้',
      'user name',
    ]);
    if (userNameKey) {
      const u = toStringSafe(row[userNameKey]).trim();
      if (u) out['ชื่อผู้ใช้งาน'] = u;
    }

    const hData = healthKey ? toStringSafe(row[healthKey]) : '';

    if (hData) {
      const adl = extractValue(hData, 'ADL');
      if (adl !== null) out.adl = adl;

      const bgc = extractValue(hData, 'BGC');
      if (bgc !== null) out.bgc = bgc;

      const bmi = extractValue(hData, 'BMI');
      if (bmi !== null) out.bmi = bmi;

      if (hData.includes('BP')) {
        const bpVal = extractValue(hData, 'BP');
        if (bpVal) out.bpSys = bpVal.includes('/') ? bpVal.split('/')[0] : bpVal;
      }

      const bw = extractValue(hData, 'BW');
      if (bw !== null) out.bw = bw;

      const hei = extractValue(hData, 'Hei');
      if (hei !== null) out.hei = hei;

      const hr = extractValue(hData, 'HR');
      if (hr !== null) out.hr = hr;

      const o2Diff = extractValue(hData, 'O2.Diff');
      if (o2Diff !== null) out.o2_diff = o2Diff;

      const resp = extractValue(hData, 'Resp');
      if (resp !== null) out.resp = resp;

      const spo2 = extractValue(hData, 'SpO2');
      if (spo2 !== null) out.spo2 = spo2;

      const temp = extractValue(hData, 'Temp');
      if (temp !== null) out.temp = temp;
    }
  }

  // ทำให้เป็น number เหมือน pandas: to_numeric(errors='coerce').fillna(0)
  const numCols = ['adl', 'bgc', 'bmi', 'bpSys', 'bw', 'hei', 'hr', 'o2_diff', 'resp', 'spo2', 'temp'];
  const finalRows = Array.from(groups.values()).map((r) => {
    const copy = { ...r };
    for (const c of numCols) {
      const n = Number.parseFloat(copy[c]);
      copy[c] = Number.isFinite(n) ? n : 0;
    }
    return copy;
  });

  return finalRows;
};

/** แถวตัวอย่างในไฟล์เทมเพลต — แก้หรือลบแล้วใส่ข้อมูลจริงก่อน Import */
const DASHBOARD_IMPORT_TEMPLATE_SAMPLE_ROW = {
  subDistrict: 'ตำบลตัวอย่าง',
  'ชื่อผู้ใช้งาน': 'ชื่อ ตัวอย่าง',
  Time: '',
  adl: '',
  bgc: '95',
  bmi: '22.5',
  bpSys: '118',
  bw: '',
  hei: '',
  hr: '72',
  o2_diff: '',
  resp: '',
  spo2: '98',
  temp: '36.6',
  diseases: '',
};

/** CSV สำหรับดาวน์โหลด (UTF-8 ใช้ร่วมกับ BOM ฝั่งแอป) */
export const buildDashboardImportTemplateCsv = () =>
  objectsToCsv([DASHBOARD_IMPORT_TEMPLATE_SAMPLE_ROW], DEFAULT_OUTPUT_HEADERS);

/** แผ่นงาน Excel: แถวหัว + แถวตัวอย่าง */
export const buildDashboardImportTemplateAoA = () => [
  [...DEFAULT_OUTPUT_HEADERS],
  DEFAULT_OUTPUT_HEADERS.map((h) => DASHBOARD_IMPORT_TEMPLATE_SAMPLE_ROW[h] ?? ''),
];
