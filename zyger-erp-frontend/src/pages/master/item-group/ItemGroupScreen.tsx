import { useEffect, useState } from 'react';
import ItemGroupList from './ItemGroupList';
import ItemGroupForm from './ItemGroupForm';

export default function ItemGroupScreen({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [itemGroupId, setItemGroupId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (!initialDocId) return;
    setItemGroupId(Number(initialDocId));
    setViewOnly(viewOnlyProp ?? false);
    setFormKey((k) => k + 1);
    setMode('form');
  }, [initialDocId, viewOnlyProp]);

  const openAdd = () => {
    setItemGroupId(null);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openEdit = (id: number) => {
    setItemGroupId(id);
    setViewOnly(false);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const openView = (id: number) => {
    setItemGroupId(id);
    setViewOnly(true);
    setFormKey((k) => k + 1);
    setMode('form');
  };

  const handleBack = () => {
    setMode('list');
    setItemGroupId(null);
  };

  const handleSaved = () => {
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <ItemGroupForm
        key={formKey}
        itemGroupId={itemGroupId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return <ItemGroupList onAdd={openAdd} onEdit={openEdit} onView={openView} />;
}
