import { useMemo } from 'react';
import { aggregateDashboardPayload } from '../utils/aggregate';

/**
 * คำนวณ payload ของแต่ละกราฟ — 1 payload ต่อ key ใน chartDistrictFilters
 * เพื่อให้แต่ละกราฟกรองตำบลของตัวเองได้อิสระ
 */
const useChartPayloads = (sourceHealthRows, chartDistrictFilters) =>
  useMemo(() => {
    const f = chartDistrictFilters;
    return {
      summary: aggregateDashboardPayload(sourceHealthRows, f.summary),
      diseases: aggregateDashboardPayload(sourceHealthRows, f.diseases),
      bmiDist: aggregateDashboardPayload(sourceHealthRows, f.bmiDist),
      bp: aggregateDashboardPayload(sourceHealthRows, f.bp),
      bgc: aggregateDashboardPayload(sourceHealthRows, f.bgc),
      byDistrict: aggregateDashboardPayload(sourceHealthRows, f.byDistrict),
      districtPeople: aggregateDashboardPayload(sourceHealthRows, f.districtPeople),
    };
  }, [sourceHealthRows, chartDistrictFilters]);

export default useChartPayloads;
