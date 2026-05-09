import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

import ChartDistrictSelect from './components/ChartDistrictSelect';
import ChartTypeSelect from './components/ChartTypeSelect';
import CustomLegend from './components/CustomLegend';
import ImportExportToolbar from './components/ImportExportToolbar';
import RawDataModal from './components/RawDataModal';
import SimpleTable from './components/SimpleTable';
import SummaryCard from './components/SummaryCard';
import ThemeToggle from './components/ThemeToggle';
import { CustomBarLabel, CustomTopLabel } from './components/chartLabels';
import createPieHoverOutsideLabel from './components/pieHoverLabel';

import { CHART_TYPES } from './constants/chartTypes';
import { districtColors } from './constants/colors';
import {
  DISTRICT_PEOPLE_CLINICAL_EXPLAIN,
  DISTRICT_PEOPLE_CLINICAL_REFS,
  DISTRICT_PEOPLE_METRICS,
} from './constants/metrics';
import { buildInitialSourceRowsFromDemoPeople } from './constants/seedData';

import useChartDistrictFilters from './hooks/useChartDistrictFilters';
import useChartPayloads from './hooks/useChartPayloads';
import useDistrictListAll from './hooks/useDistrictListAll';
import useFileImporter from './hooks/useFileImporter';
import useTheme from './hooks/useTheme';

import {
  applyDistrictFilter,
  chartDrillEntry,
  filterRowsByBgcCategory,
  filterRowsByBmiCategory,
  filterRowsByBpCategory,
  filterRowsByDiseaseName,
  filterRowsBySubdistrictMetric,
} from './utils/aggregate';
import {
  buildCsvFromObjectRows,
  parseCSVRow,
  triggerCsvDownload,
} from './utils/csv';
import {
  getBgcStatus,
  getBmiStatus,
  getBpStatus,
  getSpo2Status,
} from './utils/healthClassify';
import {
  buildDashboardImportTemplateAoA,
  buildDashboardImportTemplateCsv,
} from './utils/processData';
import { dedupeIdenticalRows, getPeopleMetricValue, pickUsernameFromRow } from './utils/rowUtils';

export default function DashboardPage() {
  const [sourceHealthRows, setSourceHealthRows] = useState(buildInitialSourceRowsFromDemoPeople);
  const [districtPeopleMetric, setDistrictPeopleMetric] = useState(DISTRICT_PEOPLE_METRICS[0].id);

  const [chartTypes, setChartTypes] = useState({
    diseases: CHART_TYPES.bar,
    bmiDist: CHART_TYPES.pie,
    bp: CHART_TYPES.bar,
    bgc: CHART_TYPES.bar,
    byDistrict: CHART_TYPES.bar,
    districtPeople: CHART_TYPES.bar,
  });

  const [pieHoverSlice, setPieHoverSlice] = useState({ bmiDist: -1, bp: -1, bgc: -1 });
  const [rawModal, setRawModal] = useState(null);

  const [theme, setTheme] = useTheme();

  const districtListAll = useDistrictListAll(sourceHealthRows);
  const { chartDistrictFilters, setChartDistrictFilters, resetAll: resetChartFilters } =
    useChartDistrictFilters();
  const chartPayloads = useChartPayloads(sourceHealthRows, chartDistrictFilters);

  // เติมคอลัมน์ชื่อผู้ใช้งานให้ครบก่อน export (ตรวจชื่อจากคอลัมน์ทางเลือกอื่นเมื่อขาด)
  const exportRows = useMemo(
    () =>
      (sourceHealthRows || []).map((row) => {
        const o = { ...row };
        const uname = pickUsernameFromRow(row);
        const hasNameCol =
          (o['ชื่อผู้ใช้งาน'] != null && String(o['ชื่อผู้ใช้งาน']).trim() !== '') ||
          (o.username != null && String(o.username).trim() !== '');
        if (uname && !hasNameCol) o['ชื่อผู้ใช้งาน'] = uname;
        return o;
      }),
    [sourceHealthRows]
  );
  const processedRowCount = exportRows.length;

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

  // แปลง CSV text → object rows แล้วอัปเดต state
  const processCsvText = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((h, index) => {
          row[h] = values[index];
        });
        data.push(row);
      }
    }

    setSourceHealthRows(dedupeIdenticalRows(data));
    resetChartFilters();
  };

  const importFile = useFileImporter(processCsvText);

  const handleExportProcessedCsv = () => {
    if (!exportRows.length) return;
    triggerCsvDownload(buildCsvFromObjectRows(exportRows), 'health-dashboard-processed');
  };

  const handleDownloadImportTemplateCsv = () => {
    triggerCsvDownload(buildDashboardImportTemplateCsv(), 'health-dashboard-import-template');
  };

  const handleDownloadImportTemplateExcel = () => {
    const aoa = buildDashboardImportTemplateAoA();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูล');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `health-dashboard-import-template-${date}.xlsx`);
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
          <ThemeToggle theme={theme} onChange={setTheme} />
          <ImportExportToolbar
            processedRowCount={processedRowCount}
            onFileSelected={importFile}
            onExportProcessedCsv={handleExportProcessedCsv}
            onDownloadTemplateCsv={handleDownloadImportTemplateCsv}
            onDownloadTemplateExcel={handleDownloadImportTemplateExcel}
          />
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
                      data={bmiDistData.filter(d => d.value > 0)}
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
