import { useEffect, useState } from 'react';
import RmIssueList from './RmIssueList';
import RmIssueForm from './RmIssueForm';

export default function RmIssuePage({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (!initialDocId) return;
    setDocumentId(initialDocId);
    setViewOnly(viewOnlyProp ?? false);
    setFormKey((previous) => previous + 1);
    setMode('form');
  }, [initialDocId, viewOnlyProp]);


  const openAdd = () => {
    setDocumentId(null);
    setViewOnly(false);
    setFormKey((previous) => previous + 1);
    setMode('form');
  };

  const openEdit = (id: string) => {
    setDocumentId(id);
    setViewOnly(false);
    setFormKey((previous) => previous + 1);
    setMode('form');
  };

  const openView = (id: string) => {
    setDocumentId(id);
    setViewOnly(true);
    setFormKey((previous) => previous + 1);
    setMode('form');
  };

  const handleBack = () => {
    setMode('list');
    setDocumentId(null);
  };

  const handleSaved = (id: string) => {
    setDocumentId(id);
  };

  if (mode === 'form') {
    return (
      <RmIssueForm
        key={formKey}
        documentId={documentId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return <RmIssueList onAdd={openAdd} onEdit={openEdit} onView={openView} />;
}