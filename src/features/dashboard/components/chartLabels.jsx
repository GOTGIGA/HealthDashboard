/** Label สำหรับ Bar แนวตั้ง — แสดงตัวเลขกลางแท่ง (ซ่อนเมื่อแท่งเตี้ยเกินไป) */
export const CustomBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (height < 20) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={12}
      fontWeight="bold"
    >
      {value}
    </text>
  );
};

/** Label ที่แปะบนยอดแท่ง — ใช้กับ Bar ที่ต้องการแสดงค่าเหนือแท่ง */
export const CustomTopLabel = (props) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y + 15}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={11}
      fontWeight="bold"
    >
      {value > 0 ? value : ''}
    </text>
  );
};
