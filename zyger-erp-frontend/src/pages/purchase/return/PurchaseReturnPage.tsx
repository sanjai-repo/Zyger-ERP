import PurchaseDocScreen from '../PurchaseDocScreen';
import { PURCHASE_RETURN_CONFIG } from '../purchaseDocConfigs';

interface PurchaseReturnPageProps {
  initialDocId?: string | number;
}

export default function PurchaseReturnPage({ initialDocId }: PurchaseReturnPageProps) {
  return <PurchaseDocScreen config={PURCHASE_RETURN_CONFIG} initialDocId={initialDocId} />;
}
