import PurchaseDocScreen from '../PurchaseDocScreen';
import { PURCHASE_REQUEST_CONFIG } from '../purchaseDocConfigs';

interface PurchaseRequestPageProps {
  initialDocId?: string | number;
  prefill?: {
    supplier?: string;
    poNumber?: string;
    itemCode?: string;
    orderQty?: number;
    scheduledDate?: string;
  };
}

export default function PurchaseRequestPage({ initialDocId, prefill }: PurchaseRequestPageProps) {
  return (
    <PurchaseDocScreen
      config={PURCHASE_REQUEST_CONFIG}
      initialDocId={initialDocId}
      prefill={prefill}
    />
  );
}
