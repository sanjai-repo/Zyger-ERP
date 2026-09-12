import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { defaultForm, hydrateRow } from './subcontractorTypes';

interface Props {
  customerId?: number | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: number) => void;
}

export default function SubcontractorForm({ customerId, viewOnly = false, onBack, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // Section collapse states
  const [openSec, setOpenSec] = useState({
    subcontractor: true,
    address: true,
    tax: true,
    registration: true,
    bank: true,
  });

  const toggleSec = (key: keyof typeof openSec) => setOpenSec(c => ({ ...c, [key]: !c[key] }));

  const openNew = async () => {
    setForm(defaultForm());
    setEditId(null);
    try {
      const { data } = await apiClient.get('/master/parties/next-code?kind=SUBCONTRACTOR');
      setForm((c) => ({ ...c, code: data.code }));
    } catch {
      setForm((c) => ({ ...c, code: 'SUB-0002' }));
    }
  };

  useEffect(() => {
    if (!customerId) {
      setForm(defaultForm());
      setEditId(null);
      openNew();
      return;
    }
    setLoading(true);
    apiClient.get(`/master/parties/${customerId}`).then(({ data }) => {
      const hydrated = hydrateRow(data);
      setForm(hydrated);
      setEditId(data.id);
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load subcontractor.'), 'error');
      onBack();
    }).finally(() => setLoading(false));
  }, [customerId]);

  const updateForm = (key: string, value: unknown) => setForm((c) => ({ ...c, [key]: value }));

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!String(form.code ?? '').trim()) { toast('Subcontractor Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('Subcontractor Name is required.', 'error'); return; }
    setBusy(true);
    try {
      const payload = {
        ...form,
        kind: 'SUBCONTRACTOR',
        gstNumber: form.gstin ?? '',
        contactsJson: JSON.stringify(form.contacts ?? []),
        addressesJson: JSON.stringify(form.addresses ?? []),
        bankAccountsJson: JSON.stringify(form.bankAccounts ?? []),
      };
      if (editId) {
        await apiClient.put(`/master/parties/${editId}`, payload);
        toast('Subcontractor updated successfully.');
        onSaved?.(editId);
      } else {
        const { data } = await apiClient.post('/master/parties', payload);
        toast('Subcontractor created successfully.');
        onSaved?.(data.id);
      }
      onBack();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">Loading subcontractor details...</div>
      </div>
    );
  }

  return (
    <>
      {/* Top Header */}
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          <div>
            <h1>{editId ? 'Edit SubContractor' : 'Create SubContractor'}</h1>
            <p>SubContractor master -&gt; address -&gt; tax classification -&gt; registration -&gt; bank</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-primary" onClick={() => save()} disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={save}>
        {/* SECTION 1: SubContractor Information */}
        <div className="sec-head" onClick={() => toggleSec('subcontractor')} style={{ cursor: 'pointer' }}>
          <div className="sec-title">
            <span className="material-symbols-rounded">person</span>
            <span>SubContractor Information</span>
          </div>
          <span className="material-symbols-rounded sec-toggle">{openSec.subcontractor ? 'expand_less' : 'expand_more'}</span>
        </div>

        {openSec.subcontractor && (
          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <label className="fld">
                <span>GST NUMBER *</span>
                <input className="in" type="text" placeholder="Enter GST Number" value={String(form.gstin ?? '')} onChange={e => updateForm('gstin', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>CODE *</span>
                <input className="in" type="text" readOnly value={String(form.code ?? 'SUB-0002')} style={{ backgroundColor: '#f8fafc', fontWeight: 600 }} />
              </label>

              <label className="fld">
                <span>SUBCONTRACTOR NAME *</span>
                <input className="in" type="text" required placeholder="Enter SubContractor" value={String(form.name ?? '')} onChange={e => updateForm('name', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>SHORT NAME *</span>
                <input className="in" type="text" placeholder="Short Name of SubContractor" value={String(form.shortName ?? '')} onChange={e => updateForm('shortName', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>INDUSTRY TYPE</span>
                <select className="in" value={String(form.industryType ?? '')} onChange={e => updateForm('industryType', e.target.value)} disabled={viewOnly}>
                  <option value="">Please Select</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Textiles">Textiles</option>
                </select>
              </label>
              <label className="fld">
                <span>CONTACT PERSON</span>
                <input className="in" type="text" placeholder="Contact Person Name" value={String(form.contactPerson ?? '')} onChange={e => updateForm('contactPerson', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>ATTENTION PERSON</span>
                <input className="in" type="text" placeholder="Attention Person Name" value={String(form.attentionPerson ?? '')} onChange={e => updateForm('attentionPerson', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>PRIORITY (NUMBERS ONLY)</span>
                <input className="in" type="number" placeholder="Enter priority" value={Number(form.priority ?? 0)} onChange={e => updateForm('priority', parseInt(e.target.value))} disabled={viewOnly} />
              </label>
            </div>

            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div>
                <label className="fld chk" style={{ marginBottom: '12px' }}>
                  <input type="checkbox" checked={Boolean(form.enableTcs)} onChange={e => updateForm('enableTcs', e.target.checked)} disabled={viewOnly} />
                  <span>Enable TCS</span>
                </label>
                <label className="fld chk">
                  <input type="checkbox" checked={Boolean(form.enableTds)} onChange={e => updateForm('enableTds', e.target.checked)} disabled={viewOnly} />
                  <span>Enable TDS</span>
                </label>
              </div>

              <div>
                <label className="fld" style={{ marginBottom: '12px' }}>
                  <span>TCS AMOUNT</span>
                  <input className="in" type="number" placeholder="TCS Minimum Amount" value={Number(form.tcsAmount ?? 0)} onChange={e => updateForm('tcsAmount', parseFloat(e.target.value))} disabled={viewOnly} />
                </label>
                <label className="fld">
                  <span>TDS MIN AMOUNT</span>
                  <input className="in" type="number" placeholder="TDS Minimum Amount" value={Number(form.tdsMinAmount ?? 0)} onChange={e => updateForm('tdsMinAmount', parseFloat(e.target.value))} disabled={viewOnly} />
                </label>
              </div>
            </div>

            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
              <label className="fld">
                <span>TDS PERCENTAGE</span>
                <input className="in" type="number" step="0.01" placeholder="TDS Percentage" value={Number(form.tdsPercentage ?? 0)} onChange={e => updateForm('tdsPercentage', parseFloat(e.target.value))} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>VISIBLE TO</span>
                <select className="in" value={String(form.visibleTo ?? '')} onChange={e => updateForm('visibleTo', e.target.value)} disabled={viewOnly}>
                  <option value="">Please Select</option>
                  <option value="All Plants">All Plants</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="fld chk">
                <input type="checkbox" checked={Boolean(form.active ?? true)} onChange={e => updateForm('active', e.target.checked)} disabled={viewOnly} />
                <span>Active</span>
              </label>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="fld span2">
                <span>GENERAL REMARKS</span>
                <textarea className="in" rows={2} placeholder="Please enter general remarks" value={String(form.remarks ?? '')} onChange={e => updateForm('remarks', e.target.value)} disabled={viewOnly} />
              </label>
            </div>

            {/* Attachment */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase' }}>ATTACHMENT</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input className="in" type="file" style={{ flex: 1 }} disabled={viewOnly} />
                <select className="in" style={{ width: '220px' }} disabled={viewOnly}>
                  <option value="">Please Select</option>
                  <option value="GST Certificate">GST Certificate</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Agreement">Agreement</option>
                </select>
                <input className="in" style={{ flex: 1 }} placeholder="Remarks" disabled={viewOnly} />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Address Details */}
        <div className="sec-head" onClick={() => toggleSec('address')} style={{ cursor: 'pointer' }}>
          <div className="sec-title">
            <span className="material-symbols-rounded">location_on</span>
            <span>Address Details</span>
          </div>
          <span className="material-symbols-rounded sec-toggle">{openSec.address ? 'expand_less' : 'expand_more'}</span>
        </div>

        {openSec.address && (
          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase' }}>BILLING ADDRESS</div>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <label className="fld">
                <span>ADDRESS TYPE</span>
                <select className="in" value={String(form.addressType ?? 'Billing')} onChange={e => updateForm('addressType', e.target.value)} disabled={viewOnly}>
                  <option value="Billing">Billing</option>
                  <option value="Shipping">Shipping</option>
                </select>
              </label>
              <label className="fld">
                <span>UNIT NUMBER</span>
                <input className="in" type="text" placeholder="Door Number" value={String(form.unitNumber ?? '')} onChange={e => updateForm('unitNumber', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>ADDRESS LINE1</span>
                <input className="in" type="text" placeholder="Lane Name" value={String(form.addressLine1 ?? '')} onChange={e => updateForm('addressLine1', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>ADDRESS LINE2</span>
                <input className="in" type="text" placeholder="Land Mark" value={String(form.addressLine2 ?? '')} onChange={e => updateForm('addressLine2', e.target.value)} disabled={viewOnly} />
              </label>
            </div>

            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <label className="fld">
                <span>COUNTRY</span>
                <input className="in" type="text" value={String(form.country ?? 'India')} onChange={e => updateForm('country', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>STATE</span>
                <input className="in" type="text" placeholder="State" value={String(form.state ?? '')} onChange={e => updateForm('state', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>CITY</span>
                <input className="in" type="text" placeholder="City" value={String(form.city ?? '')} onChange={e => updateForm('city', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>ZIPCODE</span>
                <input className="in" type="text" placeholder="PinCode" value={String(form.pincode ?? '')} onChange={e => updateForm('pincode', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>DISTANCE</span>
                <input className="in" type="text" placeholder="Distance" value={String(form.distance ?? '')} onChange={e => updateForm('distance', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>BRANCH NAME</span>
                <input className="in" type="text" placeholder="Branch Name" value={String(form.branchName ?? '')} onChange={e => updateForm('branchName', e.target.value)} disabled={viewOnly} />
              </label>
            </div>

            {/* Contacts Sub-Grids */}
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '10px' }}>BILLING CONTACT</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input className="in" placeholder="Name" style={{ flex: 1 }} disabled={viewOnly} />
                  <input className="in" placeholder="Mobile" style={{ flex: 1 }} disabled={viewOnly} />
                  <input className="in" placeholder="Email" style={{ flex: 1 }} disabled={viewOnly} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '10px' }}>SHIPPING CONTACT</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input className="in" placeholder="Name" style={{ flex: 1 }} disabled={viewOnly} />
                  <input className="in" placeholder="Mobile" style={{ flex: 1 }} disabled={viewOnly} />
                  <input className="in" placeholder="Email" style={{ flex: 1 }} disabled={viewOnly} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Tax Classification */}
        <div className="sec-head" onClick={() => toggleSec('tax')} style={{ cursor: 'pointer' }}>
          <div className="sec-title">
            <span className="material-symbols-rounded">receipt_long</span>
            <span>Tax Classification</span>
          </div>
          <span className="material-symbols-rounded sec-toggle">{openSec.tax ? 'expand_less' : 'expand_more'}</span>
        </div>

        {openSec.tax && (
          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <label className="fld">
                <span>TAX CATEGORY</span>
                <select className="in" value={String(form.taxCategory ?? '')} onChange={e => updateForm('taxCategory', e.target.value)} disabled={viewOnly}>
                  <option value="">Please Select</option>
                  <option value="Regular">Regular</option>
                  <option value="Composition">Composition</option>
                  <option value="SEZ">SEZ</option>
                </select>
              </label>

              <label className="fld">
                <span>TAX SUBCATEGORY</span>
                <select className="in" value={String(form.taxSubCategory ?? '')} onChange={e => updateForm('taxSubCategory', e.target.value)} disabled={viewOnly}>
                  <option value="">Please Select</option>
                  <option value="Interstate">Interstate</option>
                  <option value="Intrastate">Intrastate</option>
                </select>
              </label>

              <label className="fld">
                <span>DATE VALID FROM *</span>
                <input className="in" type="date" value={String(form.dateValidFrom ?? '')} onChange={e => updateForm('dateValidFrom', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>DATE VALID TO *</span>
                <input className="in" type="date" value={String(form.dateValidTo ?? '')} onChange={e => updateForm('dateValidTo', e.target.value)} disabled={viewOnly} />
              </label>
            </div>
          </div>
        )}

        {/* SECTION 4: Registration */}
        <div className="sec-head" onClick={() => toggleSec('registration')} style={{ cursor: 'pointer' }}>
          <div className="sec-title">
            <span className="material-symbols-rounded">badge</span>
            <span>Registration</span>
          </div>
          <span className="material-symbols-rounded sec-toggle">{openSec.registration ? 'expand_less' : 'expand_more'}</span>
        </div>

        {openSec.registration && (
          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <label className="fld">
                <span>PAN NO</span>
                <input className="in" type="text" placeholder="PAN Number" value={String(form.pan ?? '')} onChange={e => updateForm('pan', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>CIN NO</span>
                <input className="in" type="text" placeholder="CIN Number" value={String(form.cin ?? '')} onChange={e => updateForm('cin', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>MSME NO</span>
                <input className="in" type="text" placeholder="MSME Number" value={String(form.msmeNo ?? '')} onChange={e => updateForm('msmeNo', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>PF NO</span>
                <input className="in" type="text" placeholder="PF Number" value={String(form.pfNo ?? '')} onChange={e => updateForm('pfNo', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>ESI NO</span>
                <input className="in" type="text" placeholder="ESI Number" value={String(form.esiNo ?? '')} onChange={e => updateForm('esiNo', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>TAN NO</span>
                <input className="in" type="text" placeholder="TAN Number" value={String(form.tanNo ?? '')} onChange={e => updateForm('tanNo', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>REGISTRATION NO</span>
                <input className="in" type="text" placeholder="Registration Number" value={String(form.registrationNo ?? '')} onChange={e => updateForm('registrationNo', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>REGISTRATION DATE</span>
                <input className="in" type="date" value={String(form.registrationDate ?? '')} onChange={e => updateForm('registrationDate', e.target.value)} disabled={viewOnly} />
              </label>
            </div>
          </div>
        )}

        {/* SECTION 5: Bank Details */}
        <div className="sec-head" onClick={() => toggleSec('bank')} style={{ cursor: 'pointer' }}>
          <div className="sec-title">
            <span className="material-symbols-rounded">account_balance</span>
            <span>Bank Details</span>
          </div>
          <span className="material-symbols-rounded sec-toggle">{openSec.bank ? 'expand_less' : 'expand_more'}</span>
        </div>

        {openSec.bank && (
          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <label className="fld">
                <span>ACCOUNT HOLDER NAME *</span>
                <input className="in" type="text" placeholder="Account Holder Name" value={String(form.accountHolderName ?? '')} onChange={e => updateForm('accountHolderName', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>ACCOUNT NO *</span>
                <input className="in" type="text" placeholder="SubContractor Bank Account Number" value={String(form.accountNumber ?? '')} onChange={e => updateForm('accountNumber', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>ACCOUNT TYPE</span>
                <select className="in" value={String(form.accountType ?? '')} onChange={e => updateForm('accountType', e.target.value)} disabled={viewOnly}>
                  <option value="">Please Select</option>
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                </select>
              </label>
              <label className="fld">
                <span>BANK NAME *</span>
                <input className="in" type="text" placeholder="Ex: State Bank of India" value={String(form.bankName ?? '')} onChange={e => updateForm('bankName', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>BRANCH NAME *</span>
                <input className="in" type="text" placeholder="Ex: Peelamedu Main Branch" value={String(form.branchName ?? '')} onChange={e => updateForm('branchName', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>IFSC CODE</span>
                <input className="in" type="text" placeholder="Ex: ICIC0001206" value={String(form.ifscCode ?? '')} onChange={e => updateForm('ifscCode', e.target.value)} disabled={viewOnly} />
              </label>

              <label className="fld">
                <span>SWIFT CODE</span>
                <input className="in" type="text" placeholder="Ex: SBININBB556" value={String(form.swiftCode ?? '')} onChange={e => updateForm('swiftCode', e.target.value)} disabled={viewOnly} />
              </label>
              <label className="fld">
                <span>MICR CODE</span>
                <input className="in" type="text" placeholder="MICR Code" value={String(form.micrCode ?? '')} onChange={e => updateForm('micrCode', e.target.value)} disabled={viewOnly} />
              </label>
            </div>
          </div>
        )}

        <div className="actbar" style={{ marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          {!viewOnly && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
