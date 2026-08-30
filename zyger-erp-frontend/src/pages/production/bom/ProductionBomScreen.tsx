import PlanningDocScreen from '../../planning/PlanningDocScreen';
import { PRODUCTION_BOM_FRESH_CONFIG } from '../../planning/planningDocConfigs';

export default function ProductionBomScreen() {
  return <PlanningDocScreen config={PRODUCTION_BOM_FRESH_CONFIG} />;
}