import { GENERAL_ISSUE_CONFIG } from '../../../../config/stockIssueConfig';
import StockIssueScreen from '../shared/StockIssueScreen';

export default function GeneralIssuePage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <StockIssueScreen config={GENERAL_ISSUE_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}