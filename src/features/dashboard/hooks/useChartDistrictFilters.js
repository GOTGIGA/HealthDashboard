import { useState } from 'react';
import { createEmptyChartDistrictFilters } from '../constants/chartTypes';

/**
 * จัดการ state ของตัวกรองตำบลต่อกราฟ
 *
 * - เริ่มต้นทุก key เป็นค่าว่าง (= ทุกตำบล)
 * - ผู้เรียกควรเรียก resetAll() เมื่อโหลดข้อมูลใหม่ (เช่นหลัง import)
 *   เพื่อล้างค่าตำบลเดิมที่อาจไม่อยู่ในชุดข้อมูลใหม่
 */
const useChartDistrictFilters = () => {
  const [chartDistrictFilters, setChartDistrictFilters] = useState(createEmptyChartDistrictFilters);
  const resetAll = () => setChartDistrictFilters(createEmptyChartDistrictFilters());
  return { chartDistrictFilters, setChartDistrictFilters, resetAll };
};

export default useChartDistrictFilters;
