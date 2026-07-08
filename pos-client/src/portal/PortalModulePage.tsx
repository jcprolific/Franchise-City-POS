import type { ComponentType } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import AnnouncementsModule from './modules/AnnouncementsModule';
import ManualModule from './modules/ManualModule';
import ReportsModule from './modules/ReportsModule';
import TrainingModule from './modules/TrainingModule';
import FormsModule from './modules/FormsModule';
import SupportModule from './modules/SupportModule';
import OrderHistoryModule from './modules/OrderHistoryModule';
import ResourcesModule from './modules/ResourcesModule';
import LaunchesModule from './modules/LaunchesModule';
import CampaignsModule from './modules/CampaignsModule';

const MODULES: Record<string, ComponentType> = {
  announcements: AnnouncementsModule,
  launches: LaunchesModule,
  campaigns: CampaignsModule,
  manual: ManualModule,
  reports: ReportsModule,
  training: TrainingModule,
  forms: FormsModule,
  support: SupportModule,
  orders: OrderHistoryModule,
  resources: ResourcesModule,
};

export default function PortalModulePage() {
  const { module } = useParams();
  const Module = module ? MODULES[module] : undefined;

  if (!Module) {
    return <Navigate to="/portal" replace />;
  }

  return <Module />;
}
