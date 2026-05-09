/**
 * Label + เส้นชี้ออกนอกวง Pie — แสดงเฉพาะชิ้นที่ index ตรงกับ activeIndex
 * (ใช้คู่กับ onMouseEnter/onMouseLeave ของ Pie เพื่ออัปเดต activeIndex)
 *
 * แยกออกจาก chartLabels.jsx เพราะเป็น factory ที่คืน component
 * (Vite/React fast refresh ไม่อนุญาตให้ไฟล์เดียว export ทั้ง component และ helper)
 */
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

export default createPieHoverOutsideLabel;
