import { GENERAL_DC_CONFIG } from '../../../../config/deliveryChallanConfig';
import DeliveryChallanScreen from '../shared/DeliveryChallanScreen';

export default function GeneralDcPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <DeliveryChallanScreen config={GENERAL_DC_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}