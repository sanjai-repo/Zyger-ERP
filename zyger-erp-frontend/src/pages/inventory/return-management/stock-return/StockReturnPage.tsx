import { STOCK_RETURN_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function StockReturnPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={STOCK_RETURN_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}
