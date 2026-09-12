import SalesDocScreen from '../SalesDocScreen';
import { PROFORMA_INVOICE_CONFIG } from '../salesDocConfigs';
export default function ProformaInvoicePage() {
  return <SalesDocScreen config={PROFORMA_INVOICE_CONFIG} />;
}
