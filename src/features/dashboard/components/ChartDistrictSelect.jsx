/** เลือกตำบลต่อกราฟ — ค่าว่าง = ทุกตำบล */
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

export default ChartDistrictSelect;
