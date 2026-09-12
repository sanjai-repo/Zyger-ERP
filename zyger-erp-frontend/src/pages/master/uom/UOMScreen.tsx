import { useEffect, useState } from 'react';
import UomList from './UomList';
import UomForm from './UomForm';

export default function UOMScreen({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [uomId, setUomId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (!initialDocId) return;
    setUomId(Number(initialDocId));
    setViewOnly(viewOnlyProp ?? false);
    setFormKey((k) => k + 1);
    setMode('form');
  }, [initialDocId, viewOnlyProp]);

  const openAdd = () => {
    setUomId(null);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openEdit = (id: number) => {
    setUomId(id);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openView = (id: number) => {
    setUomId(id);
    setViewOnly(true);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const handleBack = () => {
    setMode('list');
    setUomId(null);
  };

  const handleSaved = () => {
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <UomForm
        key={formKey}
        uomId={uomId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return <UomList onAdd={openAdd} onEdit={openEdit} onView={openView} />;
}
