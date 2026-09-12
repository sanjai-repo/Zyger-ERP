import PurchaseDocScreen from '../PurchaseDocScreen';
import { PURCHASE_ORDER_CONFIG } from '../purchaseDocConfigs';

interface PurchaseOrderPageProps {
  initialDocId?: string | number;
  prefill?: {
    supplier?: string;
    poNumber?: string;
    itemCode?: string;
    orderQty?: number;
    scheduledDate?: string;
  };
}

export default function PurchaseOrderPage({ initialDocId, prefill }: PurchaseOrderPageProps) {
  return <PurchaseDocScreen config={PURCHASE_ORDER_CONFIG} initialDocId={initialDocId} prefill={prefill} />;
}
