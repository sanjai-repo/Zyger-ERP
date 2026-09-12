import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getScreenComponent } from '../../../config/screenRegistry';

interface DashboardData {
  items: number; suppliers: number; customers: number; locations: number;
  machines: number; workCenters: number; operations: number; shifts: number;
  uoms: number; itemGroups: number; stores: number; processGroups: number;
  processes: number; instruments: number; tools: number;
  activeItems: number; inactiveItems: number;
  users: number; subcontractors: number;
}

interface CardDef {
  key: keyof DashboardData;
  icon: string;
  label: string;
  color: string;
  screenId?: string;
}

const CARD_BG = 'var(--card)';
const CARD_BORDER = '1px solid var(--border)';
const HOVER_BORDER = 'var(--blue)';

const SECTION_ITEMS: CardDef[] = [
  { key: 'activeItems', icon: 'check_circle', label: 'Active Items', color: 'var(--green)', screenId: 'purchasable-item' },
  { key: 'inactiveItems', icon: 'cancel', label: 'Inactive Items', color: 'var(--muted)' },
  { key: 'itemGroups', icon: 'folder_special', label: 'Item Groups', color: 'var(--purple)', screenId: 'item-group-master' },
  { key: 'stores', icon: 'warehouse', label: 'Stores', color: '#b7791f', screenId: 'store-master' },
  { key: 'uoms', icon: 'straighten', label: 'UOM', color: 'var(--blue)', screenId: 'uom-master' },
];

const SECTION_PEOPLE: CardDef[] = [
  { key: 'customers', icon: 'contacts', label: 'Customers', color: 'var(--green)', screenId: 'customer-list' },
  { key: 'suppliers', icon: 'local_shipping', label: 'Suppliers', color: 'var(--blue)', screenId: 'supplier-list' },
  { key: 'subcontractors', icon: 'engineering', label: 'Subcontractors', color: 'var(--yellow)', screenId: 'subcontractor-master' },
];

const SECTION_ASSETS: CardDef[] = [
  { key: 'machines', icon: 'precision_manufacturing', label: 'Machines', color: 'var(--blue)', screenId: 'machine-master' },
  { key: 'instruments', icon: 'science', label: 'Instruments', color: 'var(--green)', screenId: 'instrument-master' },
  { key: 'tools', icon: 'build', label: 'Tools', color: '#b7791f', screenId: 'tool-master' },
];

const SECTION_SYSTEM: CardDef[] = [
  { key: 'users', icon: 'manage_accounts', label: 'Users', color: 'var(--purple)', screenId: 'user-management' },
  { key: 'processGroups', icon: 'topic', label: 'Process Groups', color: 'var(--blue)', screenId: 'process-group-master' },
  { key: 'processes', icon: 'factory', label: 'Processes', color: 'var(--green)', screenId: 'process-master' },
];

function DashCard({ card, data, onOpen }: { card: CardDef; data: DashboardData; onOpen: (c: CardDef) => void }) {
  const clickable = Boolean(card.screenId);
  return (
    <div
      onClick={clickable ? () => onOpen(card) : undefined}
      style={{
        background: CARD_BG, border: CARD_BORDER, borderRadius: 12,
        padding: 18, display: 'flex', alignItems: 'center', gap: 14,
        cursor: clickable ? 'pointer' : 'default', transition: '.15s',
      }}
      onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.borderColor = HOVER_BORDER; e.currentTarget.style.boxShadow = 'var(--sh-sm)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${card.color}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 22, color: card.color }}>{card.icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{data[card.key] ?? 0}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>{card.label}</div>
      </div>
    </div>
  );
}

function CardSection({ title, cards, data, onOpen }: { title: string; cards: CardDef[]; data: DashboardData; onOpen: (c: CardDef) => void }) {
  return (
    <div className="panel">
      <div className="panel-h"><h2>{title}</h2></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, padding: 16 }}>
        {cards.map((c, i) => <DashCard key={`${title}-${c.key}-${i}`} card={c} data={data} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

export default function MasterDashboard() {
  const { toast } = useToast();
  const { openTab } = useTabs();
  const [data, setData] = useState<DashboardData>({
    items: 0, suppliers: 0, customers: 0, locations: 0,
    machines: 0, workCenters: 0, operations: 0, shifts: 0,
    uoms: 0, itemGroups: 0, stores: 0, processGroups: 0,
    processes: 0, instruments: 0, tools: 0,
    activeItems: 0, inactiveItems: 0,
    users: 0, subcontractors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/master/dashboard');
        setData((c) => ({ ...c, ...d }));
      } catch (e) { toast(getApiErrorMessage(e, 'Failed to load master dashboard.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  const handleOpenCard = (c: CardDef) => {
    if (c.screenId) {
      openTab({ id: c.screenId, label: c.label, icon: c.icon, component: getScreenComponent(c.screenId) });
    }
  };

  return (
    <>
      <div className="pg-head">
        <h1>Master Dashboard</h1>
        <p>Overview of all master data</p>
      </div>
      {loading ? (
        <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading dashboard...</div></div>
      ) : (
        <>
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat"><div className="ic" style={{ background: 'var(--green)' }}><span className="material-symbols-rounded">check_circle</span></div><div><div className="l">Active Items</div><div className="v">{data.activeItems}</div></div></div>
            <div className="stat"><div className="ic" style={{ background: 'var(--muted)' }}><span className="material-symbols-rounded">cancel</span></div><div><div className="l">Inactive Items</div><div className="v">{data.inactiveItems}</div></div></div>
            <div className="stat"><div className="ic" style={{ background: 'var(--blue)' }}><span className="material-symbols-rounded">contacts</span></div><div><div className="l">Customers</div><div className="v">{data.customers}</div></div></div>
            <div className="stat"><div className="ic" style={{ background: 'var(--purple)' }}><span className="material-symbols-rounded">local_shipping</span></div><div><div className="l">Suppliers</div><div className="v">{data.suppliers}</div></div></div>
            <div className="stat"><div className="ic" style={{ background: '#b7791f' }}><span className="material-symbols-rounded">precision_manufacturing</span></div><div><div className="l">Machines</div><div className="v">{data.machines}</div></div></div>
            <div className="stat"><div className="ic" style={{ background: 'var(--red)' }}><span className="material-symbols-rounded">manage_accounts</span></div><div><div className="l">Users</div><div className="v">{data.users}</div></div></div>
          </div>
          <CardSection title="Items & Inventory" cards={SECTION_ITEMS} data={data} onOpen={handleOpenCard} />
          <CardSection title="People" cards={SECTION_PEOPLE} data={data} onOpen={handleOpenCard} />
          <CardSection title="Assets" cards={SECTION_ASSETS} data={data} onOpen={handleOpenCard} />
          <CardSection title="System" cards={SECTION_SYSTEM} data={data} onOpen={handleOpenCard} />
        </>
      )}
    </>
  );
}
