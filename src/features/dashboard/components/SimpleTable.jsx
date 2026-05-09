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

export default SimpleTable;
