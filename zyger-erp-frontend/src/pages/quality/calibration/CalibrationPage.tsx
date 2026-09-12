import { useEffect, useMemo, useState } from 'react';
import {
  useCalibrationInstrumentRetire,
  useCalibrationInstrumentSave,
  useCalibrationInstruments,
  useCalibrationStats,
  useQualityDocList,
} from '../../../hooks/useQualityDocs';
import { formatDate } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useToast } from '../../../contexts/ToastContext';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import { exportToCsv } from '../../../utils/csvExport';

const EMPTY_FORM = {
  id: '',
  instrumentCode: '',
  instrumentName: '',
  instrumentType: '',
  make: '',
  model: '',
  serialNumber: '',
  measurementRange: '',
  leastCount: '',
  accuracy: '',
  location: '',
  calibrationFrequencyDays: '',
  calibrationType: '',
  calibrationAgency: '',
  certificateNumber: '',
  nextDueDate: '',
  calibrationPolicy: 'WARN',
};

const STATUS_FILTERS = ['', 'VALID', 'DUE_SOON', 'EXPIRED', 'FAILED', 'UNDER_REPAIR', 'RETIRED'];

export default function CalibrationPage() {
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [statusFilter, setStatusFilter] = useState('');
  const [retireTarget, setRetireTarget] = useState<Record<string, unknown> | null>(null);

  const statsQuery = useCalibrationStats();
  const instrumentsQuery = useCalibrationInstruments(statusFilter || undefined);
  const recordsQuery = useQualityDocList('quality-calibration-record', { page: 0, size: 8, sort: 'date,desc' });

  const saveMutation = useCalibrationInstrumentSave();
  const retireMutation = useCalibrationInstrumentRetire();

  useEffect(() => {
    if (!showForm) setForm({ ...EMPTY_FORM });
  }, [showForm]);

  const stats = statsQuery.data;

  const cards = useMemo(
    () => [
      { label: 'Total Instruments', icon: 'straighten', color: 'var(--blue)', value: stats?.total ?? 0 },
      { label: 'Due ≤ 7 Days', icon: 'event_upcoming', color: 'var(--yellow)', value: stats?.dueWithin7Days ?? 0 },
      { label: 'Due ≤ 30 Days', icon: 'date_range', color: '#b7791f', value: stats?.dueWithin30Days ?? 0 },
      { label: 'Overdue', icon: 'warning', color: 'var(--red)', value: stats?.overdue ?? 0 },
      { label: 'Under Repair', icon: 'build', color: 'var(--muted)', value: stats?.underRepair ?? 0 },
      { label: 'Failed', icon: 'dangerous', color: 'var(--red)', value: stats?.failed ?? 0 },
    ],
    [stats]
  );

  const handleSave = async () => {
    if (!form.instrumentCode.trim() || !form.instrumentName.trim()) {
      toast('Instrument code and name are required.', 'error');
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({ ...form });
      toast(`${String(saved.instrumentCode ?? '')} saved.`);
      setShowForm(false);
    } catch (saveError) {
      toast(getApiErrorMessage(saveError, 'Save failed.'), 'error');
    }
  };

  const instruments = instrumentsQuery.data ?? [];
  const records = recordsQuery.data?.content ?? [];

  return (
    <>
      <div className="pg-head pg-head-flex">
        <div className="pg-head-text">
          <h1>Calibration</h1>
          <p>Instrument master, calibration schedule and records — expired instruments block inspection</p>
        </div>
        <button className="btn btn-p" onClick={() => setShowForm((v) => !v)}>
          <span className="material-symbols-rounded">add</span> {showForm ? 'Close Form' : 'Add Instrument'}
        </button>
      </div>

      <div className="stats">
        {cards.map((card) => (
          <div key={card.label} className="stat">
            <div className="ic" style={{ background: card.color }}>
              <span className="material-symbols-rounded">{card.icon}</span>
            </div>
            <div>
              <div className="l">{card.label}</div>
              <div className="v">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="panel">
          <div className="panel-h">
            <h2>
              <span className="material-symbols-rounded">straighten</span>
              {form.id ? 'Edit' : 'Register'} Instrument
            </h2>
          </div>
          <div className="fgrid">
            {([
              ['instrumentCode', 'Instrument Code *'],
              ['instrumentName', 'Instrument Name *'],
              ['instrumentType', 'Instrument Type'],
              ['make', 'Make'],
              ['model', 'Model'],
              ['serialNumber', 'Serial Number'],
              ['measurementRange', 'Measuring Range'],
              ['leastCount', 'Least Count'],
              ['accuracy', 'Accuracy'],
              ['location', 'Location'],
              ['calibrationFrequencyDays', 'Frequency (days)'],
              ['calibrationType', 'Calibration Type'],
              ['calibrationAgency', 'Calibration Agency'],
              ['certificateNumber', 'Certificate Number'],
              ['nextDueDate', 'Next Due Date'],
              ['calibrationPolicy', 'Policy (WARN/BLOCK)'],
            ] as Array<[keyof typeof form, string]>).map(([key, label]) => (
              <label key={key} className="fld">
                <span>{label}</span>
                <input
                  className="in"
                  type={key === 'nextDueDate' ? 'date' : 'text'}
                  value={form[key]}
                  onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="actbar">
            <span className="lft">Instrument master</span>
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-p" onClick={handleSave} disabled={saveMutation.isPending}>
              <span className="material-symbols-rounded">save</span> Save Instrument
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
          <div className="searchwrap" style={{ flex: '0 0 auto' }}>
            <span className="material-symbols-rounded">straighten</span>
            <span className="count">Instruments sorted by next due date</span>
          </div>
          <button
            className="ibtn"
            title="Export CSV"
            onClick={() =>
              exportToCsv(
                instruments as unknown as Record<string, unknown>[],
                [
                  { key: 'instrumentCode', label: 'Code' },
                  { key: 'instrumentName', label: 'Name' },
                  { key: 'instrumentType', label: 'Type' },
                  { key: 'serialNumber', label: 'Serial' },
                  { key: 'location', label: 'Location' },
                  { key: 'calibrationFrequencyDays', label: 'Freq (days)' },
                  {
                    key: 'lastCalibrationDate',
                    label: 'Last Calibrated',
                    render: (value) => (value ? formatDate(String(value).slice(0, 10)) : ''),
                  },
                  {
                    key: 'nextDueDate',
                    label: 'Next Due',
                    render: (value) => (value ? formatDate(String(value).slice(0, 10)) : ''),
                  },
                  { key: 'status', label: 'Status' },
                ],
                'calibration-instruments'
              )
            }
          >
            <span className="material-symbols-rounded">download</span>
          </button>
          <div className="sp" />
          <select className="in" style={{ flex: '0 0 auto', width: '180px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === '' ? 'All Status' : s}</option>
            ))}
          </select>
        </div>
        <div className="twrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Serial</th>
                <th>Location</th>
                <th className="num">Freq (days)</th>
                <th>Last Calibrated</th>
                <th>Next Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instruments.length > 0 ? (
                instruments.map((i) => (
                  <tr key={String(i.id)}>
                    <td><span className="cell-b">{String(i.instrumentCode ?? '')}</span></td>
                    <td>{String(i.instrumentName ?? '—')}</td>
                    <td>{String(i.instrumentType ?? '—')}</td>
                    <td>{String(i.serialNumber ?? '—')}</td>
                    <td>{String(i.location ?? '—')}</td>
                    <td className="num">{i.calibrationFrequencyDays == null ? '—' : String(i.calibrationFrequencyDays)}</td>
                    <td>{i.lastCalibrationDate ? formatDate(String(i.lastCalibrationDate).slice(0, 10)) : '—'}</td>
                    <td>{i.nextDueDate ? formatDate(String(i.nextDueDate).slice(0, 10)) : '—'}</td>
                    <td><StatusBadge status={String(i.status ?? 'VALID')} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="ibtn"
                        title="Edit"
                        onClick={() => {
                          setForm({
                            ...EMPTY_FORM,
                            ...Object.fromEntries(
                              Object.keys(EMPTY_FORM).map((k) => [k, i[k] == null ? '' : String(i[k])])
                            ),
                            id: String(i.id ?? ''),
                          });
                          setShowForm(true);
                        }}
                      >
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                      {String(i.status) !== 'RETIRED' && (
                        <button className="ibtn danger" title="Retire" onClick={() => setRetireTarget(i)}>
                          <span className="material-symbols-rounded">block</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className="empty">
                      <span className="material-symbols-rounded">straighten</span>
                      No instruments registered. Click “Add Instrument”.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>
            <span className="material-symbols-rounded">history</span> Recent Calibration Records
          </h2>
          <span className="count">{recordsQuery.data?.totalElements ?? 0} record(s)</span>
        </div>
        <div className="twrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Doc No</th>
                <th>Date</th>
                <th>Instrument</th>
                <th>Type</th>
                <th>Agency</th>
                <th>Result</th>
                <th>Next Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((r) => (
                  <tr key={String(r.id)}>
                    <td><span className="cell-b">{String(r.docNo ?? '')}</span></td>
                    <td>{formatDate(String(r.date ?? ''))}</td>
                    <td>{String(r.instrumentCode ?? '—')}</td>
                    <td>{String(r.calibrationType ?? '—')}</td>
                    <td>{String(r.externalAgency ?? '—')}</td>
                    <td className={r.result === 'PASS' ? 'r-pass' : r.result === 'FAIL' ? 'r-fail' : ''}>
                      {String(r.result ?? '—')}
                    </td>
                    <td>{r.nextDueDate ? formatDate(String(r.nextDueDate).slice(0, 10)) : '—'}</td>
                    <td><StatusBadge status={String(r.status ?? 'DRAFT')} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">
                      <span className="material-symbols-rounded">history</span> No calibration records yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(retireTarget)}
        title={`Retire ${String(retireTarget?.instrumentCode ?? '')}`}
        body="Retired instruments can no longer be used for inspections."
        okLabel="Retire"
        danger
        busy={retireMutation.isPending}
        onClose={() => setRetireTarget(null)}
        onConfirm={async (reason) => {
          if (!retireTarget) return;
          try {
            await retireMutation.mutateAsync({ id: String(retireTarget.id), reason });
            toast(`${String(retireTarget.instrumentCode ?? '')} retired.`);
            setRetireTarget(null);
          } catch (retireError) {
            toast(getApiErrorMessage(retireError, 'Retire failed.'), 'error');
          }
        }}
      />
    </>
  );
}
