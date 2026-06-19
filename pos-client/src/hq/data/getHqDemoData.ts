import type { BrandSlug } from '../../brands';
import type { HqKpiSnapshot, HqWeeklyRevenueItem } from '../lib/hqKpiService';
import type { ReportsSnapshot } from '../lib/reportsService';
import {
  COFTEA_CHART_FILL_END,
  COFTEA_CHART_FILL_START,
  COFTEA_CHART_STROKE,
  COFTEA_DEMO_DATA_MESSAGE,
  COFTEA_HQ_TOTAL_BRANCHES,
  COFTEA_SAMPLE_SNAPSHOT,
  cofteaBranchesToCheck,
  cofteaInventoryAlerts,
  cofteaLiveOrders,
  cofteaSampleBranches,
  cofteaSampleReports,
  cofteaSampleRevenue,
  cofteaSampleSuppliers,
} from './cofteaHqDemoData';
import {
  POTATO_CORNER_CHART_FILL_END,
  POTATO_CORNER_CHART_FILL_START,
  POTATO_CORNER_CHART_STROKE,
  POTATO_CORNER_DEMO_DATA_MESSAGE,
  POTATO_CORNER_HQ_TOTAL_BRANCHES,
  POTATO_CORNER_SAMPLE_SNAPSHOT,
  potatoCornerBranchesToCheck,
  potatoCornerInventoryAlerts,
  potatoCornerLiveOrders,
  potatoCornerSampleBranches,
  potatoCornerSampleReports,
  potatoCornerSampleRevenue,
  potatoCornerSampleSuppliers,
} from './potatoCornerHqDemoData';

export interface HqDemoDataBundle {
  brandName: string;
  totalBranches: number;
  sampleSnapshot: HqKpiSnapshot;
  sampleRevenue: HqWeeklyRevenueItem[];
  branchesToCheck: typeof cofteaBranchesToCheck;
  inventoryAlerts: typeof cofteaInventoryAlerts;
  liveOrders: typeof cofteaLiveOrders;
  sampleBranches: typeof cofteaSampleBranches;
  sampleSuppliers: typeof cofteaSampleSuppliers;
  sampleReports: ReportsSnapshot;
  demoDataMessage: string;
  chartStroke: string;
  chartFillStart: string;
  chartFillEnd: string;
}

export function getHqDemoData(slug: BrandSlug): HqDemoDataBundle {
  if (slug === 'coftea') {
    return {
      brandName: 'Coftea',
      totalBranches: COFTEA_HQ_TOTAL_BRANCHES,
      sampleSnapshot: COFTEA_SAMPLE_SNAPSHOT,
      sampleRevenue: cofteaSampleRevenue,
      branchesToCheck: cofteaBranchesToCheck,
      inventoryAlerts: cofteaInventoryAlerts,
      liveOrders: cofteaLiveOrders,
      sampleBranches: cofteaSampleBranches,
      sampleSuppliers: cofteaSampleSuppliers,
      sampleReports: cofteaSampleReports,
      demoDataMessage: COFTEA_DEMO_DATA_MESSAGE,
      chartStroke: COFTEA_CHART_STROKE,
      chartFillStart: COFTEA_CHART_FILL_START,
      chartFillEnd: COFTEA_CHART_FILL_END,
    };
  }

  return {
    brandName: 'Potato Corner',
    totalBranches: POTATO_CORNER_HQ_TOTAL_BRANCHES,
    sampleSnapshot: POTATO_CORNER_SAMPLE_SNAPSHOT,
    sampleRevenue: potatoCornerSampleRevenue,
    branchesToCheck: potatoCornerBranchesToCheck,
    inventoryAlerts: potatoCornerInventoryAlerts,
    liveOrders: potatoCornerLiveOrders,
    sampleBranches: potatoCornerSampleBranches,
    sampleSuppliers: potatoCornerSampleSuppliers,
    sampleReports: potatoCornerSampleReports,
    demoDataMessage: POTATO_CORNER_DEMO_DATA_MESSAGE,
    chartStroke: POTATO_CORNER_CHART_STROKE,
    chartFillStart: POTATO_CORNER_CHART_FILL_START,
    chartFillEnd: POTATO_CORNER_CHART_FILL_END,
  };
}

export type { HqDisplayBranch, HqSupplierRow } from './cofteaHqDemoData';
