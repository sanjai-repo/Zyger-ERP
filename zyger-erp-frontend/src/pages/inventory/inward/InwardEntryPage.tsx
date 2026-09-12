import { useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import { INWARD_TYPES, type InwardType } from '../../../config/inwardConfig';
import { useInwardDashboard } from '../../../hooks/useInward';
import InwardSummaryCards from './InwardSummaryCards';
import InwardForm from './InwardForm';
import InwardListPage from './InwardListPage';
import InwardLog from './InwardLog';
import PendingInwardListPage from './PendingInwardListPage';

export default function InwardEntryPage() {
  const { openTab } = useTabs();

  const [mode, setMode] = useState<'dashboard' | 'form'>('dashboard');
  const [activeType, setActiveType] = useState<InwardType | 'ALL' | null>(null);

  const dashboardQuery = useInwardDashboard('', '');

  const openInwardList = (type: InwardType | 'ALL') => {
    const config = type === 'ALL' ? null : INWARD_TYPES[type];

    openTab({
      id: type === 'ALL' ? 'inward-list-ALL' : `inward-list-${type}`,
      label: type === 'ALL' ? 'All Inward' : `${config?.label} List`,
      icon: 'table_view',
      component: InwardListPage,
      props: { inwardType: type },
    });
  };

  const openPendingList = () => {
    openTab({
      id: 'pending-inward',
      label: 'Pending Inward',
      icon: 'hourglass_top',
      component: PendingInwardListPage,
      props: { showLog: false },
    });
  };

  const handleSelectType = (type: InwardType | 'ALL') => {
    setActiveType(type);
    openInwardList(type);
  };

  if (mode === 'form') {
    return (
      <InwardForm
        onBack={() => setMode('dashboard')}
        onSaved={() => {
          setMode('dashboard');
          dashboardQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      <div className="pg-head pg-head-flex">
        <div className="pg-head-text">
          <h1>Inward Entry</h1>
          <p>PO / LO / JO / General inward — summary, log and entry</p>
        </div>

        <button className="btn btn-p" onClick={() => setMode('form')}>
          <span className="material-symbols-rounded">add</span>
          Add Inward
        </button>
      </div>

      <InwardSummaryCards
        summary={dashboardQuery.data}
        activeType={activeType}
        onSelectType={handleSelectType}
        onOpenPending={openPendingList}
      />

      <InwardLog />
    </>
  );
}
