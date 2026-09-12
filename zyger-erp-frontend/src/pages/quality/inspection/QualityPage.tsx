import { useEffect, useState } from 'react';
import QualityDashboard from '../dashboard/QualityDashboard';
import QualityForm from './QualityForm';
import QualityList from './QualityList';
import type { InspectionType } from '../../../types/quality/quality.types';

interface QualityPageProps {
  initialDocId?: string | number;
  viewOnly?: boolean;
  defaultStatus?: string;
  defaultInspectionType?: InspectionType;
  title?: string;
  subtitle?: string;
}

const TYPE_LABELS: Record<InspectionType, string> = {
  IQC: 'Inward (IQC)',
  LO: 'LO',
  JOMIN: 'JOMIN',
  FAI: 'First Article (FAI)',
  IPQC: 'Process (IPQC)',
  LINE: 'Line',
  LAST_OFF: 'Last Off',
  FINAL: 'Final',
};

export default function QualityPage({
  initialDocId,
  viewOnly = false,
  defaultStatus = '',
  defaultInspectionType,
  title,
  subtitle,
}: QualityPageProps) {
  const [mode, setMode] = useState<'list' | 'form'>(initialDocId ? 'form' : 'list');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ? String(initialDocId) : null);
  const [isViewOnly, setIsViewOnly] = useState(viewOnly);

  useEffect(() => {
    if (initialDocId) {
      setDocumentId(String(initialDocId));
      setIsViewOnly(viewOnly);
      setMode('form');
    }
  }, [initialDocId, viewOnly]);

  const openList = () => {
    setDocumentId(null);
    setIsViewOnly(false);
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <QualityForm
        documentId={documentId}
        viewOnly={isViewOnly}
        onBack={openList}
        defaultInspectionType={defaultInspectionType}
      />
    );
  }

  const heading = title ?? (defaultInspectionType ? `${TYPE_LABELS[defaultInspectionType]} Inspection` : 'Quality Inspection');
  const sub = subtitle ?? (defaultInspectionType ? `${TYPE_LABELS[defaultInspectionType]} inspection management` : 'Common inspection engine — IQC / LO / JOMIN / FAI / IPQC / Line / Last Off / Final');

  return (
    <>
      <div className="pg-head pg-head-flex">
        <div className="pg-head-text">
          <h1>{heading}</h1>
          <p>{sub}</p>
        </div>
      </div>

      {!defaultInspectionType && <QualityDashboard />}

      <QualityList
        defaultStatus={defaultStatus}
        defaultInspectionType={defaultInspectionType}
        onAdd={() => {
          setDocumentId(null);
          setIsViewOnly(false);
          setMode('form');
        }}
        onEdit={(id) => {
          setDocumentId(id);
          setIsViewOnly(false);
          setMode('form');
        }}
        onView={(id) => {
          setDocumentId(id);
          setIsViewOnly(true);
          setMode('form');
        }}
      />
    </>
  );
}
