import QualityDocScreen from '../docs/QualityDocScreen';
import { TEST_CERTIFICATE_CONFIG } from '../docs/qualityDocConfigs';

export default function InternalTestCertificatePage() {
  return <QualityDocScreen config={TEST_CERTIFICATE_CONFIG} defaultType="INTERNAL" />;
}
