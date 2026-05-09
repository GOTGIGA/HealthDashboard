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

export default ChartTypeSelect;
