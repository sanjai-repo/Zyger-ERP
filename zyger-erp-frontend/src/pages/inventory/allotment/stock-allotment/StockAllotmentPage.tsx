import { useEffect, useState } from 'react';
import StockAllotmentList from './StockAllotmentList';
import StockAllotmentForm from './StockAllotmentForm';
import AllotmentAdjustmentReports from '../shared/AllotmentAdjustmentReports';

export default function StockAllotmentPage({ initialDocId, viewOnly: viewOnlyProp }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  const [mode, setMode] = useState<'list' | 'form' | 'reports'>('list');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [viewOnly, setViewOnly] = useState(false);
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
      <StockAllotmentForm
        key={formKey}
        documentId={documentId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  if (mode === 'reports') {
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <button type="button" className="btn" onClick={handleBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            Back to List
          </button>
        </div>
        <AllotmentAdjustmentReports />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setMode('reports')}
        >
          <span className="material-symbols-rounded">analytics</span>
          Registers & Reports
        </button>
      </div>
      <StockAllotmentList onAdd={openAdd} onEdit={openEdit} onView={openView} />
    </div>
  );
}