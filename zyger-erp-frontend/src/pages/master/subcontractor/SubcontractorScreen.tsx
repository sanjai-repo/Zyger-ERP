import { useEffect, useState } from 'react';
import SubcontractorList from './SubcontractorList';
import SubcontractorForm from './SubcontractorForm';

export default function SubcontractorScreen({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [customerId, setCustomerId] = useState<number | null>(null);
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

  const handleBack = () => {
    setMode('list');
    setCustomerId(null);
  };

  const handleSaved = () => {
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <SubcontractorForm
        key={formKey}
        customerId={customerId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return <SubcontractorList onAdd={openAdd} onEdit={openEdit} onView={openView} />;
}
