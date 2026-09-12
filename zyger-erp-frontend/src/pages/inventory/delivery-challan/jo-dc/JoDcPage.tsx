import { JO_DC_CONFIG } from '../../../../config/deliveryChallanConfig';
import DeliveryChallanScreen from '../shared/DeliveryChallanScreen';

export default function JoDcPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <DeliveryChallanScreen config={JO_DC_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}