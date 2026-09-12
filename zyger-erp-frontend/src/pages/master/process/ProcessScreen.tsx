import { useEffect, useState } from 'react';
import ProcessList from './ProcessList';
import ProcessForm from './ProcessForm';

export default function ProcessScreen({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [processId, setProcessId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (!initialDocId) return;
    setProcessId(Number(initialDocId));
    setViewOnly(viewOnlyProp ?? false);
    setFormKey((k) => k + 1);
    setMode('form');
  }, [initialDocId, viewOnlyProp]);

  const openAdd = () => {
    setProcessId(null);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openEdit = (id: number) => {
    setProcessId(id);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openView = (id: number) => {
    setProcessId(id);
    setViewOnly(true);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const handleBack = () => {
    setMode('list');
    setProcessId(null);
  };

  const handleSaved = () => {
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <ProcessForm
        key={formKey}
        processId={processId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return <ProcessList onAdd={openAdd} onEdit={openEdit} onView={openView} />;
}
