import { useEffect, useState } from 'react';
import SupplierList from './SupplierList';
import SupplierForm from './SupplierForm';
import SupplierLedgerPage from './SupplierLedgerPage';

export default function SupplierListScreen({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form' | 'ledger'>('list');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [ledgerCode, setLedgerCode] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (!initialDocId) return;
    setCustomerId(Number(initialDocId));
    setViewOnly(viewOnlyProp ?? false);
    setFormKey((k) => k + 1);
    setMode('form');
  }, [initialDocId, viewOnlyProp]);

  const openAdd = () => {
    setCustomerId(null);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openEdit = (id: number) => {
    setCustomerId(id);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openView = (id: number) => {
    setCustomerId(id);
    setViewOnly(true);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openLedger = (code: string) => {
    setLedgerCode(code);
    setMode('ledger');
  };

  const handleBack = () => {
    setMode('list');
    setCustomerId(null);
    setLedgerCode(null);
  };

  const handleSaved = () => {
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <SupplierForm
        key={formKey}
        customerId={customerId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  if (mode === 'ledger' && ledgerCode) {
    return <SupplierLedgerPage partyCode={ledgerCode} onBack={handleBack} />;
  }

  return <SupplierList onAdd={openAdd} onEdit={openEdit} onView={openView} onLedger={openLedger} />;
}
