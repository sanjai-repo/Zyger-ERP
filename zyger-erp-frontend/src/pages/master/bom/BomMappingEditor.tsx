import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import apiClient from '../../../api/axiosClient';
import { getApiErrorMessage } from '../../../utils/apiError';

export interface ItemOption {
  id: number;
  code: string;
  name: string;
  itemType?: string;
  itemGroup?: string;
}

export interface RmDto { id?: number; code: string; name: string }
export interface SemiFgDto { id?: number; autoCode: string; name: string; semiFgItemCode: string; semiFgItemName: string; rms: RmDto[] }
export interface SemiFgRef { id?: number; autoCode: string; name: string }
export interface FgMappingDto { id?: number; autoCode: string; name: string; fgItemCode: string; fgItemName: string; semis: SemiFgRef[] }
export interface FgRef { id?: number; autoCode: string; name: string; fgItemCode?: string }
export interface MultiLevelBomDto { id?: number; autoCode: string; name: string; fgs: FgRef[] }

export interface BomMappingDoc {
  id: number;
  autoCode: string;
  name: string;
  active: boolean;
  semiFgs: SemiFgDto[];
  fgMappings: FgMappingDto[];
  multiLevelBoms: MultiLevelBomDto[];
}

interface BomMappingEditorProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  mapping?: BomMappingDoc | null;
  mode?: 'new' | 'view' | 'edit';
}

const nextCode = (code: string) => {
  const m = /^([A-Z]+-\d{4})-(\d+)$/.exec(code || '');
  if (!m) return code;
  return `${m[1]}-${String(parseInt(m[2], 10) + 1).padStart(4, '0')}`;
};

export interface TNode {
  id: string;
  label: string;
  code?: string;
  type: 'FG' | 'SFG' | 'RM' | 'MBM';
  path: string;
  qty?: number;
  weightPerQty?: number;
  totalWeight?: number;
  remarks?: string;
  children: TNode[];
}

export default function BomMappingEditor({ onBack, onSaveSuccess, mapping, mode = 'new' }: BomMappingEditorProps) {
  const { toast } = useToast();
  const readOnly = mode === 'view';
  const isEdit = !!mapping?.id;

  /* ── Master header (Section 2.1) ── */
  const [bmpAutoCode] = useState(mapping?.autoCode ?? '');
  const [bmpName, setBmpName] = useState(mapping?.name ?? '');
  const [active, setActive] = useState(mapping?.active ?? true);

  /* ── Section arrays ── */
  const [semiFgs, setSemiFgs] = useState<SemiFgDto[]>(() =>
    (mapping?.semiFgs ?? []).map((s) => ({ ...s, rms: [...(s.rms ?? [])] })));
  const [fgMappings, setFgMappings] = useState<FgMappingDto[]>(() =>
    (mapping?.fgMappings ?? []).map((f) => ({ ...f, semis: [...(f.semis ?? [])] })));
  const [multiLevelBoms, setMultiLevelBoms] = useState<MultiLevelBomDto[]>(() =>
    (mapping?.multiLevelBoms ?? []).map((m) => ({ ...m, fgs: [...(m.fgs ?? [])] })));

  /* ── Next auto codes ── */
  const [codes, setCodes] = useState({ bmp: '', sfm: '', fgm: '', mbm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/master/bom-mappings/next-codes')
      .then(({ data }) => setCodes({
        bmp: data.bmp || 'BMM-2026-0001',
        sfm: data.sfm || 'SFM-2026-1001',
        fgm: data.fgm || 'FGM-2026-1001',
        mbm: data.mbm || 'MBM-2026-1001',
      }))
      .catch(() => { /* silent */ });
  }, []);

  /* ── Section 2.2: Semi FG Mapping form ── */
  const [sfmName, setSfmName] = useState('');
  const [sfmItemCode, setSfmItemCode] = useState('');
  const [sfmRms, setSfmRms] = useState<RmDto[]>([]);
  const [rmPicked, setRmPicked] = useState('');

  /* ── Section 2.3: FG Mapping form ── */
  const [fgmName, setFgmName] = useState('');
  const [fgmItemCode, setFgmItemCode] = useState('');
  const [fgmSemis, setFgmSemis] = useState<SemiFgRef[]>([]);
  const [semiPicked, setSemiPicked] = useState('');

  /* ── Section 2.4: Multi Level BOM form ── */
  const [mbmName, setMbmName] = useState('');
  const [mbmFgs, setMbmFgs] = useState<FgRef[]>([]);
  const [fgPicked, setFgPicked] = useState('');

  /* ── Section searches ── */
  const [qSemi, setQSemi] = useState('');
  const [qFg, setQFg] = useState('');
  const [qMbm, setQMbm] = useState('');

  /* ── Row view/edit state ── */
  const [editingSfm, setEditingSfm] = useState<string | null>(null);
  const [editingFgm, setEditingFgm] = useState<string | null>(null);
  const [editingMbm, setEditingMbm] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<{ kind: 'sfm' | 'fgm' | 'mbm'; code: string } | null>(null);

  /* ── Tree view modal ── */
  const [treeOpen, setTreeOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /* ── Item master options (BOM category: group-driven, type fallback) ── */
  const [semiItems, setSemiItems] = useState<ItemOption[]>([]);
  const [rmItems, setRmItems] = useState<ItemOption[]>([]);
  const [fgItems, setFgItems] = useState<ItemOption[]>([]);

  useEffect(() => {
    const fetchCat = (bomCategory: string) =>
      apiClient.get('/master/items', { params: { bomCategory, size: 500 } })
        .then(({ data }) => (data.content ?? data ?? []).map((i: { id: number; code: string; name?: string; description?: string }) => ({
          id: i.id, code: i.code, name: i.name || i.description || i.code,
        })))
        .catch(() => [] as ItemOption[]);
    fetchCat('SEMI_FG').then(setSemiItems);
    fetchCat('RAW_MATERIAL').then(setRmItems);
    fetchCat('FG').then(setFgItems);
  }, []);

  const semiFgItemOptions = semiItems;
  const rmItemOptions = rmItems;
  const fgItemOptions = fgItems;

  const getSfm = (ac: string) => semiFgs.find((s) => s.autoCode === ac);
  const getFg = (ac: string) => fgMappings.find((f) => f.autoCode === ac);

  const sfmRmCount = (ac: string) => getSfm(ac)?.rms.length ?? 0;
  const fgmSemiCount = (f: FgMappingDto) => f.semis.length;
  const fgmRmCount = (f: FgMappingDto) => f.semis.reduce((n, r) => n + sfmRmCount(r.autoCode), 0);
  const mbmSemiCount = (m: MultiLevelBomDto) => m.fgs.reduce((n, f) => n + (getFg(f.autoCode)?.semis.length ?? 0), 0);
  const mbmRmCount = (m: MultiLevelBomDto) => m.fgs.reduce((n, f) => {
    const g = getFg(f.autoCode);
    return n + (g ? g.semis.reduce((x, r) => x + sfmRmCount(r.autoCode), 0) : 0);
  }, 0);

  const totalSemi = semiFgs.length;
  const totalFg = fgMappings.length;
  const totalRm = semiFgs.reduce((n, s) => n + s.rms.length, 0);
  const totalMbm = multiLevelBoms.length;

  const withCurrent = (opts: ItemOption[], current?: string): ItemOption[] => {
    if (current && !opts.some((o) => o.code === current)) return [{ id: 0, code: current, name: current }, ...opts];
    return opts;
  };
  const rmLists = withCurrent(rmItemOptions, sfmRms[0]?.code);
  const semiItemList = withCurrent(semiFgItemOptions, sfmItemCode || undefined);
  const fgItemList = withCurrent(fgItemOptions, fgmItemCode || undefined);

  /* ── Section 2.2 handlers ── */
  const addSfmRm = () => {
    if (!rmPicked) return;
    const found = rmItemOptions.find((i) => i.code === rmPicked);
    if (!sfmRms.some((r) => r.code === rmPicked)) setSfmRms([...sfmRms, { code: rmPicked, name: found?.name ?? rmPicked }]);
    setRmPicked('');
  };
  const removeSfmRm = (code: string) => setSfmRms(sfmRms.filter((r) => r.code !== code));
  const resetSfmForm = () => { setSfmName(''); setSfmItemCode(''); setSfmRms([]); setRmPicked(''); setEditingSfm(null); };
  const startEditSfm = (s: SemiFgDto) => {
    setSfmName(s.name || '');
    setSfmItemCode(s.semiFgItemCode || '');
    setSfmRms([...(s.rms ?? [])]);
    setRmPicked('');
    setEditingSfm(s.autoCode);
  };
  const saveSfmMapping = () => {
    if (!sfmName.trim()) { toast('Semi FG Mapping Name is mandatory.', 'error'); return; }
    if (!sfmItemCode) { toast('Please select a Semi FG item.', 'error'); return; }
    const found = semiFgItemOptions.find((i) => i.code === sfmItemCode);
    if (editingSfm) {
      setSemiFgs((p) => p.map((s) => s.autoCode === editingSfm
        ? { ...s, name: sfmName.trim(), semiFgItemCode: sfmItemCode, semiFgItemName: found?.name ?? s.semiFgItemName, rms: sfmRms }
        : s));
      setEditingSfm(null);
      toast('Semi FG Mapping updated.');
    } else {
      setSemiFgs((p) => [...p, { autoCode: codes.sfm, name: sfmName.trim(), semiFgItemCode: sfmItemCode, semiFgItemName: found?.name ?? '', rms: sfmRms }]);
      setCodes((c) => ({ ...c, sfm: nextCode(c.sfm) }));
      toast('Semi FG Mapping added.');
    }
    resetSfmForm();
  };
  const removeSemiFg = (autoCode: string) => {
    setSemiFgs((p) => p.filter((s) => s.autoCode !== autoCode));
    setFgMappings((p) => p.map((f) => ({ ...f, semis: f.semis.filter((r) => r.autoCode !== autoCode) })));
  };

  /* ── Section 2.3 handlers ── */
  const addSemiRef = () => {
    if (!semiPicked) return;
    const ref = getSfm(semiPicked);
    if (ref && !fgmSemis.some((r) => r.autoCode === semiPicked)) setFgmSemis([...fgmSemis, { autoCode: ref.autoCode, name: ref.name }]);
    setSemiPicked('');
  };
  const removeSemiRef = (autoCode: string) => setFgmSemis(fgmSemis.filter((r) => r.autoCode !== autoCode));
  const resetFgmForm = () => { setFgmName(''); setFgmItemCode(''); setFgmSemis([]); setSemiPicked(''); setEditingFgm(null); };
  const startEditFgm = (f: FgMappingDto) => {
    setFgmName(f.name || '');
    setFgmItemCode(f.fgItemCode || '');
    setFgmSemis([...(f.semis ?? [])]);
    setSemiPicked('');
    setEditingFgm(f.autoCode);
  };
  const saveFgMapping = () => {
    if (!fgmName.trim()) { toast('FG Mapping Name is mandatory.', 'error'); return; }
    if (!fgmItemCode) { toast('Please select an FG item.', 'error'); return; }
    const found = fgItemOptions.find((i) => i.code === fgmItemCode);
    if (editingFgm) {
      setFgMappings((p) => p.map((f) => f.autoCode === editingFgm
        ? { ...f, name: fgmName.trim(), fgItemCode: fgmItemCode, fgItemName: found?.name ?? f.fgItemName, semis: fgmSemis }
        : f));
      setEditingFgm(null);
      toast('FG Mapping updated.');
    } else {
      setFgMappings((p) => [...p, { autoCode: codes.fgm, name: fgmName.trim(), fgItemCode: fgmItemCode, fgItemName: found?.name ?? '', semis: fgmSemis }]);
      setCodes((c) => ({ ...c, fgm: nextCode(c.fgm) }));
      toast('FG Mapping added.');
    }
    resetFgmForm();
  };
  const removeFgMapping = (autoCode: string) => {
    setFgMappings((p) => p.filter((f) => f.autoCode !== autoCode));
    setMultiLevelBoms((p) => p.map((m) => ({ ...m, fgs: m.fgs.filter((r) => r.autoCode !== autoCode) })));
  };

  /* ── Section 2.4 handlers ── */
  const addFgRef = () => {
    if (!fgPicked) return;
    const ref = getFg(fgPicked);
    if (ref && !mbmFgs.some((r) => r.autoCode === fgPicked)) setMbmFgs([...mbmFgs, { autoCode: ref.autoCode, name: ref.name, fgItemCode: ref.fgItemCode }]);
    setFgPicked('');
  };
  const removeFgRef = (autoCode: string) => setMbmFgs(mbmFgs.filter((r) => r.autoCode !== autoCode));
  const resetMbmForm = () => { setMbmName(''); setMbmFgs([]); setFgPicked(''); setEditingMbm(null); };
  const startEditMbm = (m: MultiLevelBomDto) => {
    setMbmName(m.name || '');
    setMbmFgs([...(m.fgs ?? [])]);
    setFgPicked('');
    setEditingMbm(m.autoCode);
  };
  const saveMultiLevelMapping = () => {
    if (!mbmName.trim()) { toast('Multi Level BOM Name is mandatory.', 'error'); return; }
    if (editingMbm) {
      setMultiLevelBoms((p) => p.map((m) => m.autoCode === editingMbm ? { ...m, name: mbmName.trim(), fgs: mbmFgs } : m));
      setEditingMbm(null);
      toast('Multi Level BOM updated.');
    } else {
      setMultiLevelBoms((p) => [...p, { autoCode: codes.mbm, name: mbmName.trim(), fgs: mbmFgs }]);
      setCodes((c) => ({ ...c, mbm: nextCode(c.mbm) }));
      toast('Multi Level BOM added.');
    }
    resetMbmForm();
  };

  /* ── Global save ── */
  const handleSave = async () => {
    if (!bmpName.trim()) { toast('Bill Of Material name is mandatory.', 'error'); return; }
    const autoCode = bmpAutoCode || codes.bmp;
    const payload = {
      autoCode,
      name: bmpName.trim(),
      active,
      semiFgs,
      fgMappings: fgMappings.map((f) => ({ ...f, semis: f.semis.map((s) => s.autoCode) })),
      multiLevelBoms: multiLevelBoms.map((m) => ({ ...m, fgs: m.fgs.map((f) => f.autoCode) })),
    };
    setSaving(true);
    try {
      if (isEdit && mapping?.id) {
        await apiClient.put(`/master/bom-mappings/${mapping.id}`, payload);
        toast('Bill Of Material updated.');
      } else {
        await apiClient.post('/master/bom-mappings', payload);
        toast('Bill Of Material created.');
      }
      window.dispatchEvent(new CustomEvent('bomMappingsChanged'));
      if (onSaveSuccess) onSaveSuccess();
      onBack();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to save Bill Of Material.'), 'error');
    }
    setSaving(false);
  };

  /* ── Tree helpers ── */
  const buildFgNode = (f: FgMappingDto, i: number): TNode => ({
    id: f.autoCode,
    label: f.name,
    code: f.fgItemCode,
    type: 'FG',
    path: String(i + 1),
    children: f.semis.map((s, j) => {
      const sfm = getSfm(s.autoCode);
      return {
        id: s.autoCode,
        label: sfm?.name ?? s.name,
        code: sfm?.semiFgItemCode,
        type: 'SFG',
        path: `${i + 1}.${j + 1}`,
        children: (sfm?.rms ?? []).map((r, k) => ({
          id: r.code, label: r.name, code: r.code, type: 'RM', path: `${i + 1}.${j + 1}.${k + 1}`, children: [],
        })),
      };
    }),
  });
  const buildTree = (): TNode[] => fgMappings.map((f, i) => buildFgNode(f, i));

  const buildSfmNode = (s: SemiFgDto, i: number): TNode => ({
    id: s.autoCode,
    label: s.name,
    code: s.semiFgItemCode,
    type: 'SFG',
    path: String(i + 1),
    children: (s.rms ?? []).map((r, k) => ({
      id: r.code, label: r.name, code: r.code, type: 'RM', path: `${i + 1}.${k + 1}`, children: [],
    })),
  });

  const buildMbmNode = (m: MultiLevelBomDto, i: number): TNode => ({
    id: m.autoCode,
    label: m.name,
    type: 'MBM',
    path: String(i + 1),
    children: m.fgs.map((ref, j) => {
      const fgm = getFg(ref.autoCode);
      const base = `${i + 1}.${j + 1}`;
      return {
        id: ref.autoCode,
        label: fgm?.name ?? ref.name,
        code: fgm?.fgItemCode,
        type: 'FG',
        path: base,
        children: (fgm?.semis ?? []).map((s, k) => {
          const sfm = getSfm(s.autoCode);
          const semPath = `${base}.${k + 1}`;
          return {
            id: s.autoCode,
            label: sfm?.name ?? s.name,
            code: sfm?.semiFgItemCode,
            type: 'SFG',
            path: semPath,
            children: (sfm?.rms ?? []).map((r, l) => ({
              id: r.code, label: r.name, code: r.code, type: 'RM', path: `${semPath}.${l + 1}`, children: [],
            })),
          };
        }),
      };
    }),
  });

  const treeRoots = buildTree();
  const treeNodeCount = treeRoots.reduce((n, r) => n + 1 + r.children.reduce((x, c) => x + 1 + c.children.length, 0), 0);
  const treeSemiCount = new Set(treeRoots.flatMap((r) => r.children.map((c) => c.id))).size;
  const treeRmCount = new Set(treeRoots.flatMap((r) => r.children.flatMap((c) => c.children.map((g) => g.id)))).size;

  const filteredSemi = semiFgs.filter((s) => {
    const q = qSemi.trim().toLowerCase();
    if (!q) return true;
    return [s.autoCode, s.name, s.semiFgItemCode, s.semiFgItemName].some((v) => (v || '').toLowerCase().includes(q));
  });
  const filteredFg = fgMappings.filter((f) => {
    const q = qFg.trim().toLowerCase();
    if (!q) return true;
    return [f.autoCode, f.name, f.fgItemCode, f.fgItemName].some((v) => (v || '').toLowerCase().includes(q));
  });
  const filteredMbm = multiLevelBoms.filter((m) => {
    const q = qMbm.trim().toLowerCase();
    if (!q) return true;
    return [m.autoCode, m.name].some((v) => (v || '').toLowerCase().includes(q));
  });

  /* ── Styles ── */
  const card: CSSProperties = {
    background: '#ffffff', borderRadius: 14, border: '1px solid #cbd5e1',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
  };
  const label: CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#1e3a8a',
    letterSpacing: '0.04em', marginBottom: 8, textTransform: 'uppercase',
  };
  const input: CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
    background: readOnly ? '#f1f5f9' : '#ffffff', fontWeight: 600, color: '#0f172a',
    boxSizing: 'border-box', fontSize: '0.9rem',
  };
  const searchInput: CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff',
    color: '#0f172a', boxSizing: 'border-box', fontSize: '0.85rem', width: 320,
  };
  const chip = (tone: 'blue' | 'green' | 'purple'): CSSProperties => {
    const map = {
      blue: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
      green: { bg: '#ecfdf5', border: '#a7f3d0', color: '#166534' },
      purple: { bg: '#f5f3ff', border: '#ddd6fe', color: '#6d28d9' },
    }[tone];
    return {
      background: map.bg, border: `1px solid ${map.border}`, color: map.color,
      padding: '4px 10px', borderRadius: 16, fontSize: '0.82rem', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    };
  };
  const subBtn: CSSProperties = {
    padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff',
    fontWeight: 700, color: '#334155', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
  };
  const primaryBtn: CSSProperties = {
    padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: '#1d4ed8', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {readOnly ? 'View Bill Of Material (BOM)' : isEdit ? 'Edit Bill Of Material (BOM)' : 'New Bill Of Material (BOM)'}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontWeight: 600, fontSize: '0.9rem' }}>
            Create a Bill Of Material, then link its Semi FG / FG / Multi Level items
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!readOnly && (
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving} style={primaryBtn}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>save</span>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: -8 }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{codes.bmp}</span>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>·</span>
        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>{totalFg} FG</span>
        <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 700 }}>{totalSemi} Semi-FG</span>
        <span style={{ fontSize: '0.82rem', color: '#d97706', fontWeight: 700 }}>{totalRm} RM</span>
        <span style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 700 }}>{totalMbm} Multi-Level BOM</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => { setTreeOpen(true); setExpanded(new Set(treeRoots.flatMap((r) => [r.path, ...r.children.map((c) => c.path)]))); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>account_tree</span> Tree View
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_back</span> Back
        </button>
      </div>

      {/* ── Section 2.1: Master BOM Mapping Header ── */}
      <div style={{ ...card, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
<span className="material-symbols-rounded" style={{ color: '#1d4ed8', fontSize: 22 }}>alt_route</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>Bill Of Material (BOM)</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 20, alignItems: 'end' }}>
          <div>
            <label style={label}>BOM Mapping Code</label>
            <input type="text" value={bmpAutoCode || codes.bmp} readOnly style={{ ...input, background: '#f1f5f9' }} />
          </div>
          <div>
            <label style={label}>BOM NAME *</label>
            <input
              type="text"
              value={bmpName}
              onChange={(e) => setBmpName(e.target.value)}
              disabled={readOnly}
              maxLength={100}
              placeholder="e.g. Complete Cycle BOM"
              style={input}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, cursor: readOnly ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={active} disabled={readOnly} onChange={(e) => setActive(e.target.checked)} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Active</span>
          </label>
        </div>
      </div>

      {/* ── Section 2.2: Semi FG Mapping ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-rounded" style={{ color: '#1d4ed8', fontSize: 22 }}>route</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>Semi FG Mapping</h2>
          </div>
        </div>

        {!readOnly && (
          <div style={{ padding: 24, borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 16, background: '#fafcff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 16, alignItems: 'end' }}>
              <div>
                <label style={label}>AUTO CODE</label>
                <input type="text" value={editingSfm || codes.sfm} readOnly style={{ ...input, background: '#f1f5f9' }} />
              </div>
              <div>
                <label style={label}>SEMI FG MAPPING NAME *</label>
                <input type="text" value={sfmName} onChange={(e) => setSfmName(e.target.value)} placeholder="e.g. Gear Plate RM Map" style={input} />
              </div>
              <div>
                <label style={label}>SEMI FG ITEM *</label>
                <select
                  value={sfmItemCode}
                  onChange={(e) => {
                    setSfmItemCode(e.target.value);
                    const found = semiFgItemOptions.find((i) => i.code === e.target.value);
                    if (found && !sfmName.trim()) setSfmName(found.name || '');
                  }}
                  style={input}
                >
                  <option value="">— Select Semi FG item —</option>
                  {semiItemList.map((i) => (
                    <option key={i.code} value={i.code}>{i.code}{i.name && i.name !== i.code ? ` — ${i.name}` : ''}{i.itemGroup ? ` [${i.itemGroup}]` : i.itemType ? ` [${i.itemType}]` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={label}>RAW MATERIAL (RM)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={rmPicked} onChange={(e) => setRmPicked(e.target.value)} style={{ ...input, width: 420 }}>
                  <option value="">— Select RM item —</option>
                  {rmLists.map((i) => (
                    <option key={i.code} value={i.code}>{i.code}{i.name && i.name !== i.code ? ` — ${i.name}` : ''}{i.itemGroup ? ` [${i.itemGroup}]` : i.itemType ? ` [${i.itemType}]` : ''}</option>
                  ))}
                </select>
                <button type="button" className="btn" onClick={addSfmRm} disabled={!rmPicked} style={subBtn}>
                  + Add
                </button>
              </div>
            </div>
            {sfmRms.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sfmRms.map((r) => (
                  <span key={r.code} style={chip('blue')}>
                    {r.code} ({r.name})
                    <button type="button" onClick={() => removeSfmRm(r.code)} style={{ border: 'none', background: 'transparent', color: '#1e40af', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={saveSfmMapping} style={primaryBtn}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>save</span> {editingSfm ? 'Update' : 'Save'} Mapping
              </button>
              <button type="button" className="btn" onClick={resetSfmForm} style={subBtn}>{editingSfm ? 'Cancel' : 'Reset'}</button>
            </div>
          </div>
        )}

        <div style={{ padding: '16px 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="text" value={qSemi} onChange={(e) => setQSemi(e.target.value)} placeholder="Search code / name / Semi FG..." style={searchInput} />
            </div>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 999, letterSpacing: '0.03em' }}>
              {semiFgs.length} mappings
            </span>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>AUTO CODE</th>
                  <th>NAME</th>
                  <th>SEMI FG NAME</th>
                  <th>RM COUNT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSemi.length === 0 ? (
                  <tr><td colSpan={5} className="empty">No mappings found.</td></tr>
                ) : filteredSemi.map((s) => (
                  <tr key={s.autoCode}>
                    <td style={{ fontWeight: 700 }}>{s.autoCode}</td>
                    <td>{s.name || '\u2014'}</td>
                    <td>{s.semiFgItemCode}{s.semiFgItemName && s.semiFgItemName !== s.semiFgItemCode ? ` — ${s.semiFgItemName}` : ''}</td>
                    <td><span style={{ fontWeight: 700, color: '#b45309' }}>{s.rms.length} RM</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {!readOnly && (
                          <>
                            <button className="ibtn" title="View" onClick={() => {
                              const idx = semiFgs.findIndex((x) => x.autoCode === s.autoCode);
                              setExpanded(new Set([String(idx + 1)]));
                              setViewRow({ kind: 'sfm', code: s.autoCode });
                            }}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>visibility</span>
                            </button>
                            <button className="ibtn" title="Edit" onClick={() => startEditSfm(s)}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span>
                            </button>
                            <button className="ibtn danger" title="Delete" onClick={() => removeSemiFg(s.autoCode)}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section 2.3: FG Mapping ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-rounded" style={{ color: '#059669', fontSize: 22 }}>precision_manufacturing</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#065f46', margin: 0 }}>FG Mapping</h2>
          </div>
        </div>

        {!readOnly && (
          <div style={{ padding: 24, borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 16, background: '#fafffd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 16, alignItems: 'end' }}>
              <div>
                <label style={label}>AUTO CODE</label>
                <input type="text" value={editingFgm || codes.fgm} readOnly style={{ ...input, background: '#f1f5f9' }} />
              </div>
              <div>
                <label style={label}>FG MAPPING NAME *</label>
                <input type="text" value={fgmName} onChange={(e) => setFgmName(e.target.value)} placeholder="e.g. Cycle RM Map" style={input} />
              </div>
              <div>
                <label style={label}>FG ITEM *</label>
                <select
                  value={fgmItemCode}
                  onChange={(e) => {
                    setFgmItemCode(e.target.value);
                    const found = fgItemOptions.find((i) => i.code === e.target.value);
                    if (found && !fgmName.trim()) setFgmName(found.name || '');
                  }}
                  style={input}
                >
                  <option value="">— Select FG item —</option>
                  {fgItemList.map((i) => (
                    <option key={i.code} value={i.code}>{i.code}{i.name && i.name !== i.code ? ` — ${i.name}` : ''}{i.itemGroup ? ` [${i.itemGroup}]` : i.itemType ? ` [${i.itemType}]` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={label}>SEMI FG MAPPED ITEM</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={semiPicked} onChange={(e) => setSemiPicked(e.target.value)} style={{ ...input, width: 420 }}>
                  <option value="">— Select Semi FG item —</option>
                  {semiFgs.map((s) => (
                    <option key={s.autoCode} value={s.autoCode}>{s.autoCode}{s.name && s.name !== s.autoCode ? ` (${s.name})` : ''}</option>
                  ))}
                </select>
                <button type="button" className="btn" onClick={addSemiRef} disabled={!semiPicked} style={subBtn}>
                  + Add
                </button>
              </div>
            </div>
            {fgmSemis.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {fgmSemis.map((s) => (
                  <span key={s.autoCode} style={chip('green')}>
                    {s.autoCode} ({s.name})
                    <button type="button" onClick={() => removeSemiRef(s.autoCode)} style={{ border: 'none', background: 'transparent', color: '#166534', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={saveFgMapping} style={primaryBtn}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>save</span> {editingFgm ? 'Update' : 'Save'} FG Mapping
              </button>
              <button type="button" className="btn" onClick={resetFgmForm} style={subBtn}>{editingFgm ? 'Cancel' : 'Reset'}</button>
            </div>
          </div>
        )}

        <div style={{ padding: '16px 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="text" value={qFg} onChange={(e) => setQFg(e.target.value)} placeholder="Search code / name / FG..." style={searchInput} />
            </div>
            <span style={{ background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 999, letterSpacing: '0.03em' }}>
              {fgMappings.length} mappings
            </span>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>AUTO CODE</th>
                  <th>NAME</th>
                  <th>FG NAME</th>
                  <th>SEMI FG COUNT</th>
                  <th>RM COUNT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFg.length === 0 ? (
                  <tr><td colSpan={6} className="empty">No FG mappings found.</td></tr>
                ) : filteredFg.map((f) => (
                  <tr key={f.autoCode}>
                    <td style={{ fontWeight: 700 }}>{f.autoCode}</td>
                    <td>{f.name || '\u2014'}</td>
                    <td>{f.fgItemCode}{f.fgItemName && f.fgItemName !== f.fgItemCode ? ` — ${f.fgItemName}` : ''}</td>
                    <td><span style={{ fontWeight: 700, color: '#166534' }}>{fgmSemiCount(f)} SEMI-FG</span></td>
                    <td><span style={{ fontWeight: 700, color: '#b45309' }}>{fgmRmCount(f)} RM</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {!readOnly && (
                          <>
                            <button className="ibtn" title="View" onClick={() => {
                              const idx = fgMappings.findIndex((x) => x.autoCode === f.autoCode);
                              setExpanded(new Set([`${idx + 1}`, ...f.semis.map((_, j) => `${idx + 1}.${j + 1}`)]));
                              setViewRow({ kind: 'fgm', code: f.autoCode });
                            }}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>visibility</span>
                            </button>
                            <button className="ibtn" title="Edit" onClick={() => startEditFgm(f)}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span>
                            </button>
                            <button className="ibtn danger" title="Delete" onClick={() => removeFgMapping(f.autoCode)}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section 2.4: Multi Level BOM ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-rounded" style={{ color: '#7c3aed', fontSize: 22 }}>account_tree</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#5b21b6', margin: 0 }}>Multi Level BOM</h2>
          </div>
        </div>

        {!readOnly && (
          <div style={{ padding: 24, borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 16, background: '#fafaff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 2fr', gap: 16, alignItems: 'end' }}>
              <div>
                <label style={label}>AUTO CODE</label>
                <input type="text" value={editingMbm || codes.mbm} readOnly style={{ ...input, background: '#f1f5f9' }} />
              </div>
              <div>
                <label style={label}>MULTI LEVEL BOM NAME *</label>
                <input type="text" value={mbmName} onChange={(e) => setMbmName(e.target.value)} placeholder="e.g. Complete Cycle BOM" style={input} />
              </div>
            </div>
            <div>
              <label style={label}>MULTI LEVEL BOM ITEM (FG MAPPED)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={fgPicked} onChange={(e) => setFgPicked(e.target.value)} style={{ ...input, width: 420 }}>
                  <option value="">— Select FG mapping item —</option>
                  {fgMappings.map((f) => (
                    <option key={f.autoCode} value={f.autoCode}>{f.autoCode}{f.name && f.name !== f.autoCode ? ` (${f.name})` : ''}</option>
                  ))}
                </select>
                <button type="button" className="btn" onClick={addFgRef} disabled={!fgPicked} style={subBtn}>
                  + Add
                </button>
              </div>
            </div>
            {mbmFgs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mbmFgs.map((f) => (
                  <span key={f.autoCode} style={chip('purple')}>
                    {f.autoCode} ({f.name})
                    <button type="button" onClick={() => removeFgRef(f.autoCode)} style={{ border: 'none', background: 'transparent', color: '#6d28d9', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={saveMultiLevelMapping} style={primaryBtn}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>save</span> {editingMbm ? 'Update' : 'Save'} Multi Level BOM Mapping
              </button>
              <button type="button" className="btn" onClick={resetMbmForm} style={subBtn}>{editingMbm ? 'Cancel' : 'Reset'}</button>
            </div>
          </div>
        )}

        <div style={{ padding: '16px 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="text" value={qMbm} onChange={(e) => setQMbm(e.target.value)} placeholder="Search code / name..." style={searchInput} />
            </div>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', fontWeight: 800, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 999, letterSpacing: '0.03em' }}>
              {multiLevelBoms.length} BOMs
            </span>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>AUTO CODE</th>
                  <th>NAME</th>
                  <th>FG COUNT</th>
                  <th>SEMI FG COUNT</th>
                  <th>RM COUNT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMbm.length === 0 ? (
                  <tr><td colSpan={6} className="empty">No Multi Level BOMs found.</td></tr>
                ) : filteredMbm.map((m) => (
                  <tr key={m.autoCode}>
                    <td style={{ fontWeight: 700 }}>{m.autoCode}</td>
                    <td>{m.name || '\u2014'}</td>
                    <td><span style={{ fontWeight: 700, color: '#6d28d9' }}>{m.fgs.length} FG</span></td>
                    <td><span style={{ fontWeight: 700, color: '#166534' }}>{mbmSemiCount(m)} SEMI-FG</span></td>
                    <td><span style={{ fontWeight: 700, color: '#b45309' }}>{mbmRmCount(m)} RM</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {!readOnly && (
                          <>
                            <button className="ibtn" title="View" onClick={() => {
                              const idx = multiLevelBoms.findIndex((x) => x.autoCode === m.autoCode);
                              const root = buildMbmNode(m, idx);
                              setExpanded(new Set(root.children.flatMap((f) => [f.path, ...f.children.map((s) => s.path)])));
                              setViewRow({ kind: 'mbm', code: m.autoCode });
                            }}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>visibility</span>
                            </button>
                            <button className="ibtn" title="Edit" onClick={() => startEditMbm(m)}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span>
                            </button>
                            <button className="ibtn danger" title="Delete" onClick={() => setMultiLevelBoms((p) => p.filter((x) => x.autoCode !== m.autoCode))}>
                              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row View Modal ── */}
      {viewRow && (() => {
        let title = 'Mapping Details';
        let subtitle = '';
        let accent = '#1d4ed8';
        let icon = 'visibility';
        let body: ReactNode = null;

        if (viewRow.kind === 'sfm') {
          const s = semiFgs.find((x) => x.autoCode === viewRow.code);
          if (!s) return null;
          const sfmIndex = semiFgs.findIndex((x) => x.autoCode === s.autoCode);
          const root = buildSfmNode(s, sfmIndex);
          const rmCount = root.children.length;
          title = 'Semi FG Mapping';
          subtitle = `${s.autoCode} — ${s.name || 'Unnamed mapping'}`;
          accent = '#1d4ed8'; icon = 'route';
          body = (
            <div>
              <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: '#f1f5f9', borderRadius: 8, marginBottom: 14, fontSize: '0.78rem', color: '#64748b' }}>
                <span><strong style={{ color: '#b45309' }}>{rmCount}</strong> Raw Material</span>
              </div>
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <TreeRow node={root} expanded={expanded} toggle={(p) => setExpanded((prev) => { const nx = new Set(prev); if (nx.has(p)) nx.delete(p); else nx.add(p); return nx; })} />
              </div>
            </div>
          );
        } else if (viewRow.kind === 'fgm') {
          const f = fgMappings.find((x) => x.autoCode === viewRow.code);
          if (!f) return null;
          const fgIndex = fgMappings.findIndex((x) => x.autoCode === f.autoCode);
          const root = buildFgNode(f, fgIndex);
          const semiCount = new Set(root.children.map((c) => c.id)).size;
          const rmCount = new Set(root.children.flatMap((c) => c.children.map((g) => g.id))).size;
          title = 'FG Mapping';
          subtitle = `${f.autoCode} — ${f.name || 'Unnamed mapping'}`;
          accent = '#059669'; icon = 'precision_manufacturing';
          body = (
            <div>
              <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: '#f1f5f9', borderRadius: 8, marginBottom: 14, fontSize: '0.78rem', color: '#64748b' }}>
                <span><strong style={{ color: '#3b82f6' }}>{semiCount}</strong> Semi-FG</span>
                <span><strong style={{ color: '#f59e0b' }}>{rmCount}</strong> Raw Material</span>
              </div>
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <TreeRow node={root} expanded={expanded} toggle={(p) => setExpanded((prev) => { const nx = new Set(prev); if (nx.has(p)) nx.delete(p); else nx.add(p); return nx; })} />
              </div>
            </div>
          );
        } else {
          const m = multiLevelBoms.find((x) => x.autoCode === viewRow.code);
          if (!m) return null;
          const mbmIndex = multiLevelBoms.findIndex((x) => x.autoCode === m.autoCode);
          const root = buildMbmNode(m, mbmIndex);
          const fgCount = root.children.length;
          const semiCount = new Set(root.children.flatMap((f) => f.children.map((s) => s.id))).size;
          const rmCount = new Set(root.children.flatMap((f) => f.children.flatMap((s) => s.children.map((g) => g.id)))).size;
          title = 'Multi Level BOM';
          subtitle = `${m.autoCode} — ${m.name || 'Unnamed mapping'}`;
          accent = '#7c3aed'; icon = 'account_tree';
          body = (
            <div>
              <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: '#f1f5f9', borderRadius: 8, marginBottom: 14, fontSize: '0.78rem', color: '#64748b' }}>
                <span><strong style={{ color: '#7c3aed' }}>{fgCount}</strong> FG</span>
                <span><strong style={{ color: '#166534' }}>{semiCount}</strong> Semi-FG</span>
                <span><strong style={{ color: '#b45309' }}>{rmCount}</strong> Raw Material</span>
              </div>
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <TreeRow node={root} expanded={expanded} toggle={(p) => setExpanded((prev) => { const nx = new Set(prev); if (nx.has(p)) nx.delete(p); else nx.add(p); return nx; })} />
              </div>
            </div>
          );
        }

        return (
          <div className="mwrap" onClick={() => setViewRow(null)} style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: 620, maxWidth: '92vw', background: '#ffffff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0', padding: 24, maxHeight: '80vh', overflow: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-rounded" style={{ color: accent, fontSize: '1.4rem' }}>{icon}</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>{title}</h2>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>{subtitle}</p>
                  </div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setViewRow(null)}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              {body}
            </div>
          </div>
        );
      })()}

      {/* ── Tree View Modal ── */}
      {treeOpen && (
        <div className="mwrap" onClick={() => setTreeOpen(false)} style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'fixed', inset: 20, background: '#fafbfc', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-rounded" style={{ color: '#6366f1', fontSize: '1.4rem' }}>account_tree</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>BOM Mapping Structure</h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>{bmpAutoCode || codes.bmp} — {bmpName || 'Unnamed mapping'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" className="btn btn-sm" onClick={() => setExpanded(new Set())} style={{ fontSize: '0.75rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>unfold_less</span> Collapse
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setExpanded(new Set(treeRoots.flatMap((r) => [r.path, ...r.children.map((c) => c.path)])))} style={{ fontSize: '0.75rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>unfold_more</span> Expand
                </button>
                <button className="btn btn-sm" onClick={() => setTreeOpen(false)} style={{ marginLeft: 4 }}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, padding: '10px 24px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
              <span><strong style={{ color: '#1e293b' }}>{treeNodeCount}</strong> total nodes</span>
              <span><strong style={{ color: '#3b82f6' }}>{treeRoots.length}</strong> FG</span>
              <span><strong style={{ color: '#22c55e' }}>{treeSemiCount}</strong> Semi-FG</span>
              <span><strong style={{ color: '#f59e0b' }}>{treeRmCount}</strong> Raw Material</span>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {treeRoots.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#94a3b8' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', marginBottom: 8 }}>account_tree</span> No tree data.
                </div>
              ) : (
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                  {treeRoots.map((n) => <TreeRow key={n.id} node={n} expanded={expanded} toggle={(p) => setExpanded((prev) => { const nx = new Set(prev); if (nx.has(p)) nx.delete(p); else nx.add(p); return nx; })} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tree Row ── */
export function TreeRow({ node, expanded, toggle }: { node: TNode; expanded: Set<string>; toggle: (p: string) => void }) {
  const isExpanded = expanded.has(node.path);
  const depth = node.path.split('.').length - 1;
  const typeColor = node.type === 'MBM' ? '#8b5cf6' : node.type === 'FG' ? '#3b82f6' : node.type === 'SFG' ? '#10b981' : '#f59e0b';
  const typeBg = node.type === 'MBM' ? '#f5f3ff' : node.type === 'FG' ? '#eff6ff' : node.type === 'SFG' ? '#ecfdf5' : '#fffbeb';
  const isRoot = depth === 0;
  const rootBorder = node.type === 'MBM' ? '#ddd6fe' : node.type === 'FG' ? '#c7d2fe' : node.type === 'SFG' ? '#a7f3d0' : '#fde68a';

  return (
    <div style={{ marginLeft: isRoot ? 0 : depth * 28, position: 'relative', marginTop: 4, width: isRoot ? '100%' : `calc(100% - ${depth * 28}px)` }}>
      {!isRoot && (
        <>
          <div style={{ position: 'absolute', left: -18, top: -14, bottom: '50%', width: 1, background: '#cbd5e1' }} />
          <div style={{ position: 'absolute', left: -18, top: '50%', width: 14, height: 1, background: '#cbd5e1' }} />
        </>
      )}
      <div
        onClick={() => node.children.length > 0 && toggle(node.path)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: isRoot ? '12px 18px' : '9px 14px',
          cursor: node.children.length > 0 ? 'pointer' : 'default',
          borderRadius: isRoot ? 10 : 8,
          border: isRoot ? `1.5px solid ${rootBorder}` : '1px solid #e2e8f0',
          background: isRoot ? '#f8fafc' : '#ffffff',
          boxShadow: isRoot ? '0 2px 8px rgba(0,0,0,0.05)' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {node.children.length > 0 ? (
              <span className="material-symbols-rounded" style={{ fontSize: '1.15rem', color: '#6366f1' }}>
                {isExpanded ? 'expand_more' : 'chevron_right'}
              </span>
            ) : (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
            )}
          </span>
          <span style={{ width: 44, flexShrink: 0, fontWeight: 600, color: '#475569', fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px' }}>
            {node.path}
          </span>
          <span style={{
            display: 'inline-flex', padding: '2px 8px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700,
            background: typeBg, color: typeColor, border: `1px solid ${typeColor}30`,
            letterSpacing: '0.04em', flexShrink: 0, textTransform: 'uppercase',
          }}>{node.type === 'SFG' ? 'Semi FG' : node.type}</span>
          {node.code && <span style={{ fontWeight: 700, color: '#0f172a', fontSize: isRoot ? '0.92rem' : '0.86rem', flexShrink: 0 }}>{node.code}</span>}
          {node.label && (
            <span style={{ color: '#475569', fontSize: '0.84rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {node.label}
            </span>
          )}
        </div>

        {/* Fixed Width Vertical Column Alignment for Qty, Weights & Remarks */}
        <div style={{ display: 'grid', gridTemplateColumns: '74px 110px 130px 90px', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {node.qty != null && node.qty > 0 ? (
              <span style={{ width: '100%', textAlign: 'center', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, padding: '2px 4px', fontSize: '0.74rem', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Qty: <strong style={{ color: '#0f172a' }}>{node.qty}</strong>
              </span>
            ) : <span />}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {node.weightPerQty != null && node.weightPerQty > 0 ? (
              <span style={{ width: '100%', textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 4px', fontSize: '0.74rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                W/Unit: <strong style={{ color: '#0f172a' }}>{node.weightPerQty} kg</strong>
              </span>
            ) : <span />}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {node.totalWeight != null && node.totalWeight > 0 ? (
              <span style={{ width: '100%', textAlign: 'center', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '2px 4px', fontSize: '0.74rem', color: '#0369a1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Total Wt: <strong>{node.totalWeight} kg</strong>
              </span>
            ) : <span />}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {node.remarks && String(node.remarks).trim() !== '' ? (
              <span style={{ width: '100%', textAlign: 'center', background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: 6, padding: '2px 4px', fontSize: '0.74rem', color: '#86198f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(node.remarks)}>
                {node.remarks}
              </span>
            ) : <span />}
          </div>
        </div>
      </div>
      {isExpanded && node.children.length > 0 && (
        <div style={{ position: 'relative' }}>
          {node.children.map((c) => <TreeRow key={c.id} node={c} expanded={expanded} toggle={toggle} />)}
        </div>
      )}
    </div>
  );
}