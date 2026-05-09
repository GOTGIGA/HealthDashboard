const SummaryCard = ({ title, value, unit, status }) => (
  <div className="flex flex-col text-slate-900 dark:text-white">
    <span className="text-slate-600 dark:text-gray-300 text-sm font-medium mb-1">{title}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-bold">{value}</span>
      {value !== '-' && <span className="text-sm font-medium text-slate-500 dark:text-gray-400">{unit}</span>}
    </div>
    <span className="text-slate-500 dark:text-gray-400 text-xs mt-1">{status}</span>
  </div>
);

export default SummaryCard;
