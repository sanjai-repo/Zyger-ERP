import { INVOICE_RETURN_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function InvoiceReturnPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={INVOICE_RETURN_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}