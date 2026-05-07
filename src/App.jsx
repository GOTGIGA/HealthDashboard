import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useState, useRef } from 'react';

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

// --- Components ย่อยสำหรับตกแต่ง ---

const SummaryCard = ({ title, value, unit, status }) => (
  <div className="flex flex-col text-white">
    <span className="text-gray-300 text-sm font-medium mb-1">{title}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-bold">{value}</span>
      {value !== "-" && <span className="text-sm font-medium text-gray-400">{unit}</span>}
    </div>
    <span className="text-gray-400 text-xs mt-1">{status}</span>
  </div>
);

const CustomLegend = ({ data }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs font-medium text-gray-300">
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

// --- Main App ---

export default function App() {
  // สร้าง State เก็บข้อมูลกราฟทั้งหมด (อัปเดตค่าตั้งต้นเป็น 0.0 เพื่อให้เห็นตอน Import ว่าข้อมูลเปลี่ยนจริงๆ)
  const [summary, setSummary] = useState({ bmi: "0.0", bgc: "0.0", bpSys: "0.0", spo2: "0.0" });
  const [diseasesData, setDiseasesData] = useState(initialDiseasesData);
  const [bmiDistData, setBmiDistData] = useState(initialBmiDistData);
  const [bpData, setBpData] = useState(initialBpData);
  const [bgcData, setBgcData] = useState(initialBgcData);
  const [subDistrictData, setSubDistrictData] = useState(initialSubDistrictData);
  const [districts, setDistricts] = useState(['จะบังติกอ', 'สะบารัง', 'อาเนาะรู']);

  const fileInputRef = useRef(null);

  // ฟังก์ชันดักจับตอนเลือกไฟล์ CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      processCSV(text);
    };
    reader.readAsText(file);
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

    // ตัวแปรสำหรับคำนวณ Summary
    let sumBmi = 0, sumBgc = 0, sumBpSys = 0, sumSpo2 = 0;
    let countBmi = 0, countBgc = 0, countBpSys = 0, countSpo2 = 0;

    // ตัวแปรเก็บจำนวนแจกแจงความถี่กราฟต่างๆ
    const diseaseCounts = {};
    const bmiCounts = { 'น้ำหนักต่ำ': 0, 'ปกติ': 0, 'น้ำหนักเกิน': 0, 'อ้วน': 0, 'อ้วนมาก': 0 };
    const bpCounts = { 'ปกติ': 0, 'สูงเล็กน้อย': 0, 'ระดับ 1': 0, 'ระดับ 2+': 0 };
    const bgcCounts = { 'ปกติ (<100)': 0, 'เสี่ยง (100-125)': 0, 'สูง (≥126)': 0 };

    // ตัวแปรสำหรับแบ่งตามตำบล
    const districtStats = {};
    const foundDistricts = new Set();

    data.forEach(row => {
      // 1. BMI Distribution (ตัดค่า <= 0 ออก เพราะถือว่าไม่มีข้อมูล)
      const bmi = parseFloat(row.bmi);
      if (!isNaN(bmi) && bmi > 0) {
        sumBmi += bmi; countBmi++;
        if (bmi < 18.5) bmiCounts['น้ำหนักต่ำ']++;
        else if (bmi < 23) bmiCounts['ปกติ']++;
        else if (bmi < 25) bmiCounts['น้ำหนักเกิน']++;
        else if (bmi < 30) bmiCounts['อ้วน']++;
        else bmiCounts['อ้วนมาก']++;
      }

      // 2. BP Sys Distribution (ตัดค่า <= 0)
      const bpSys = parseFloat(row.bpsys);
      if (!isNaN(bpSys) && bpSys > 0) {
        sumBpSys += bpSys; countBpSys++;
        if (bpSys < 120) bpCounts['ปกติ']++;
        else if (bpSys < 140) bpCounts['สูงเล็กน้อย']++;
        else if (bpSys < 160) bpCounts['ระดับ 1']++;
        else bpCounts['ระดับ 2+']++;
      }

      // 3. BGC Distribution (ถ้าไม่มีคอลัมน์ใน CSV หรือค่าเป็น 0 จะข้ามไป)
      const bgc = parseFloat(row.bgc);
      if (!isNaN(bgc) && bgc > 0) {
        sumBgc += bgc; countBgc++;
        if (bgc < 100) bgcCounts['ปกติ (<100)']++;
        else if (bgc < 126) bgcCounts['เสี่ยง (100-125)']++;
        else bgcCounts['สูง (≥126)']++;
      }

      // 4. SpO2 Summary (ตัดค่า <= 0)
      const spo2 = parseFloat(row.spo2);
      if (!isNaN(spo2) && spo2 > 0) {
        sumSpo2 += spo2; countSpo2++;
      }

      // 5. ประเมินความเสี่ยงโรค (Auto Assessment ต่อ 1 คน)
      const personDiseases = new Set(); // ใช้ Set เพื่อป้องกันการนับโรคเดียวกันซ้ำในคนเดียว
      
      // ประเมินจากข้อมูลตัวเลขที่มี
      if (!isNaN(bpSys) && bpSys >= 140) personDiseases.add('ความดันโลหิตสูง');
      if (!isNaN(bgc) && bgc >= 126) personDiseases.add('เบาหวาน');
      if (!isNaN(bmi) && bmi >= 25) personDiseases.add('โรคอ้วน');
      
      const hr = parseFloat(row.hr);
      if (!isNaN(hr) && hr > 0 && (hr < 60 || hr > 100)) personDiseases.add('หัวใจเต้นผิดปกติ');
      
      const temp = parseFloat(row.temp);
      if (!isNaN(temp) && temp >= 37.5) personDiseases.add('ภาวะมีไข้');
      
      if (!isNaN(spo2) && spo2 > 0 && spo2 < 95) personDiseases.add('ออกซิเจนต่ำ');

      // รวมกับโรคที่ถูกพิมพ์มาในไฟล์ CSV (ถ้ามีคอลัมน์ diseases)
      if (row.diseases) {
        const diseaseList = row.diseases.split(/[,;-]+/); 
        diseaseList.forEach(d => {
          const dName = d.trim();
          if (dName) personDiseases.add(dName);
        });
      }

      // นำโรคทั้งหมดที่พบในคนๆ นี้ไปบวกลงในยอดรวม
      personDiseases.forEach(dName => {
        diseaseCounts[dName] = (diseaseCounts[dName] || 0) + 1;
      });

      // 6. แยกตามตำบล (SubDistrict)
      const subD = row.subdistrict;
      if (subD) {
        foundDistricts.add(subD);
        if (!districtStats[subD]) {
          districtStats[subD] = { sumBmi: 0, cBmi: 0, sumBgc: 0, cBgc: 0, sumBpSys: 0, cBpSys: 0, sumSpo2: 0, cSpo2: 0 };
        }
        if (!isNaN(bmi) && bmi > 0) { districtStats[subD].sumBmi += bmi; districtStats[subD].cBmi++; }
        if (!isNaN(bgc) && bgc > 0) { districtStats[subD].sumBgc += bgc; districtStats[subD].cBgc++; }
        if (!isNaN(bpSys) && bpSys > 0) { districtStats[subD].sumBpSys += bpSys; districtStats[subD].cBpSys++; }
        if (!isNaN(spo2) && spo2 > 0) { districtStats[subD].sumSpo2 += spo2; districtStats[subD].cSpo2++; }
      }
    });

    // --- อัปเดตข้อมูลทั้งหมดลง State ---
    
    setSummary({
      bmi: countBmi ? (sumBmi / countBmi).toFixed(1) : "-",
      bgc: countBgc ? (sumBgc / countBgc).toFixed(1) : "-",
      bpSys: countBpSys ? (sumBpSys / countBpSys).toFixed(1) : "-",
      spo2: countSpo2 ? (sumSpo2 / countSpo2).toFixed(1) : "-",
    });

    const newDiseases = Object.keys(diseaseCounts).map(name => ({
      name, 
      value: diseaseCounts[name],
      color: diseaseColorMap[name] || '#7d8285' // ใช้สี Default ถ้าไม่มีใน Map
    })).sort((a, b) => b.value - a.value); // เรียงจากมากไปน้อย
    setDiseasesData(newDiseases);

    setBmiDistData([
      { name: 'น้ำหนักต่ำ', value: bmiCounts['น้ำหนักต่ำ'], color: '#348bd6' },
      { name: 'ปกติ', value: bmiCounts['ปกติ'], color: '#1fb173' },
      { name: 'น้ำหนักเกิน', value: bmiCounts['น้ำหนักเกิน'], color: '#e5a91f' },
      { name: 'อ้วน', value: bmiCounts['อ้วน'], color: '#e55f30' },
      { name: 'อ้วนมาก', value: bmiCounts['อ้วนมาก'], color: '#ef4b4b' },
    ]);

    setBpData([
      { name: 'ปกติ', value: bpCounts['ปกติ'], color: '#1fb173' },
      { name: 'สูงเล็กน้อย', value: bpCounts['สูงเล็กน้อย'], color: '#e5a91f' },
      { name: 'ระดับ 1', value: bpCounts['ระดับ 1'], color: '#e55f30' },
      { name: 'ระดับ 2+', value: bpCounts['ระดับ 2+'], color: '#ef4b4b' },
    ]);

    setBgcData([
      { name: 'ปกติ (<100)', value: bgcCounts['ปกติ (<100)'], color: '#1fb173' },
      { name: 'เสี่ยง (100-125)', value: bgcCounts['เสี่ยง (100-125)'], color: '#e5a91f' },
      { name: 'สูง (≥126)', value: bgcCounts['สูง (≥126)'], color: '#ef4b4b' },
    ]);

    // สร้างข้อมูลกราฟตำบลแบบ Dynamic
    const districtArr = Array.from(foundDistricts);
    setDistricts(districtArr);

    const newSubDistrictData = [
      { metric: 'BMI (kg/m²)' },
      { metric: 'BGC (mg/dL)' },
      { metric: 'BP Sys (mmHg)' },
      { metric: 'SpO2 (%)' }
    ];

    districtArr.forEach(d => {
      const stats = districtStats[d];
      newSubDistrictData[0][d] = stats.cBmi ? parseFloat((stats.sumBmi / stats.cBmi).toFixed(1)) : 0;
      newSubDistrictData[1][d] = stats.cBgc ? parseFloat((stats.sumBgc / stats.cBgc).toFixed(1)) : 0;
      newSubDistrictData[2][d] = stats.cBpSys ? parseFloat((stats.sumBpSys / stats.cBpSys).toFixed(1)) : 0;
      newSubDistrictData[3][d] = stats.cSpo2 ? parseFloat((stats.sumSpo2 / stats.cSpo2).toFixed(1)) : 0;
    });

    setSubDistrictData(newSubDistrictData);
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

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-6 font-sans">
      
      {/* Header & Import Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-2 gap-4">
        <h1 className="text-2xl font-bold text-white">ภาพรวมสุขภาพประชากร</h1>
        <div>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-[#444] px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import CSV
          </button>
        </div>
      </div>

      {/* 1. Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 px-2">
        <SummaryCard title="BMI เฉลี่ย" value={summary.bmi} unit="kg/m²" status={getBmiStatus(summary.bmi)} />
        <SummaryCard title="น้ำตาลในเลือด (BGC)" value={summary.bgc} unit="mg/dL" status={getBgcStatus(summary.bgc)} />
        <SummaryCard title="ความดันโลหิต (Sys)" value={summary.bpSys} unit="mmHg" status={getBpStatus(summary.bpSys)} />
        <SummaryCard title="SpO2 เฉลี่ย" value={summary.spo2} unit="%" status={getSpo2Status(summary.spo2)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* 2. โรคประจำตัว — ภาพรวม */}
        <div className="bg-[#242424] rounded-xl p-5 border border-[#333]">
          <h3 className="text-white font-semibold mb-4">การประเมินความเสี่ยง / โรคประจำตัว</h3>
          {diseasesData.length > 0 ? (
            <>
              <CustomLegend data={diseasesData} />
              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diseasesData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#888', fontSize: 10, angle: -35, textAnchor: 'end' }} 
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} label={<CustomBarLabel />}>
                      {diseasesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">ไม่มีข้อมูลโรคประจำตัว</div>
          )}
        </div>

        {/* 3. BMI — การกระจายตัว */}
        <div className="bg-[#242424] rounded-xl p-5 border border-[#333]">
          <h3 className="text-white font-semibold mb-4">BMI — การกระจายตัว</h3>
          <CustomLegend data={bmiDistData} />
          <div className="h-64 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bmiDistData.filter(d => d.value > 0)} /* กรอง 0 ออกเพื่อไม่ให้ Pie Chart มีเส้นขยะ */
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {bmiDistData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* 4. ระดับความดันโลหิต (Systolic) */}
        <div className="bg-[#242424] rounded-xl p-5 border border-[#333]">
          <h3 className="text-white font-semibold mb-4">ระดับความดันโลหิต (Systolic)</h3>
          <CustomLegend data={bpData} />
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bpData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barSize={45}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} label={<CustomBarLabel />}>
                  {bpData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. ระดับน้ำตาลในเลือด (BGC) */}
        <div className="bg-[#242424] rounded-xl p-5 border border-[#333]">
          <h3 className="text-white font-semibold mb-4">ระดับน้ำตาลในเลือด (BGC)</h3>
          <CustomLegend data={bgcData} />
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bgcData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barSize={70}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} label={<CustomTopLabel />}>
                  {bgcData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 6. ค่าสุขภาพเฉลี่ยแยกตำบล */}
      <div className="bg-[#242424] rounded-xl p-5 border border-[#333]">
        <h3 className="text-white font-semibold mb-4">ค่าสุขภาพเฉลี่ยแยกตำบล</h3>
        <CustomLegend data={districts.map((d, i) => ({ name: d, color: districtColors[i % districtColors.length] }))} />
        <div className="h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subDistrictData} margin={{ top: 20, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
              <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#333', color: '#fff' }} />
              
              {districts.map((d, i) => (
                 <Bar key={d} dataKey={d} fill={districtColors[i % districtColors.length]} radius={[2, 2, 0, 0]} label={<CustomTopLabel />} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}