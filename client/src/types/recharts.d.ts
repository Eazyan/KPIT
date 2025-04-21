declare module 'recharts' {
  export const BarChart: any;
  export const Bar: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const Legend: any;
  export const ResponsiveContainer: any;
  export const LineChart: any;
  export const Line: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const Label: any;
  export const Sector: any;
  
  export interface PieLabelRenderProps {
    cx?: number | string;
    cy?: number | string;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    name?: string;
  }
} 