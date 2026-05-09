export const CHART_TYPES = {
  bar: 'bar',
  pie: 'pie',
  line: 'line',
  area: 'area',
  table: 'table',
};

export const CHART_DISTRICT_FILTER_KEYS = [
  'summary',
  'diseases',
  'bmiDist',
  'bp',
  'bgc',
  'byDistrict',
  'districtPeople',
];

export const createEmptyChartDistrictFilters = () =>
  Object.fromEntries(CHART_DISTRICT_FILTER_KEYS.map((k) => [k, '']));
