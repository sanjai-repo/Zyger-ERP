import DrilldownPage from './DrilldownPage';

interface CurrentStockPageProps {
  initialFilters?: { location?: string };
}

export default function CurrentStockPage(props: CurrentStockPageProps) {
  return <DrilldownPage drilldownType="current-stock" {...props} />;
}