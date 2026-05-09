const CustomLegend = ({ data }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs font-medium text-slate-700 dark:text-gray-300">
    {data.map((item, index) => (
      <div key={index} className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color || item.fill }}></div>
        <span>
          {item.name} {item.value !== undefined ? `(${item.value})` : ''}
        </span>
      </div>
    ))}
  </div>
);

export default CustomLegend;
