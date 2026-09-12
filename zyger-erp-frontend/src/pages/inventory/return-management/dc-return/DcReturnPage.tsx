import { DC_RETURN_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function DcReturnPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={DC_RETURN_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}