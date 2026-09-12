import { TRANSFER_DC_CONFIG } from '../../../../config/deliveryChallanConfig';
import DeliveryChallanScreen from '../shared/DeliveryChallanScreen';

export default function TransferDcPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <DeliveryChallanScreen config={TRANSFER_DC_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}