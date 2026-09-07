import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { Contact, Address, BankAccount } from './supplierTypes';
import { GST_REG_TYPES, SUPPLIER_TYPES, defaultForm, hydrateRow } from './supplierTypes';

const INDUSTRIES = ['Manufacturing', 'Automotive', 'Textiles', 'Electronics', 'Chemicals', 'Engineering', 'Pharma', 'Others'];

interface SupplierItemSupplied {
  itemCode: string;
  itemName: string;
  supplierPartNo: string;
  leadDays: number;
}

interface Props {
  customerId?: number | null; // party id
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: number) => void;
}

export default function SupplierForm({ customerId, viewOnly = false, onBack, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemsSupplied, setItemsSupplied] = useState<SupplierItemSupplied[]>([]);

  const openNew = async () => {
    setForm(defaultForm());
    setEditId(null);
    try {
      const { data } = await apiClient.get('/master/parties/next-code?kind=SUPPLIER');
      setForm((c) => ({ ...c, code: data.code }));
    } catch {
      setForm((c) => ({ ...c, code: 'SUP-0003' }));
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
      if (typeof data.itemsSuppliedJson === 'string') {
        try { setItemsSupplied(JSON.parse(data.itemsSuppliedJson)); } catch { /* empty */ }
      }
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load supplier.'), 'error');
      onBack();
    }).finally(() => setLoading(false));
  }, [customerId]);

  const updateForm = (key: string, value: unknown) => setForm((c) => ({ ...c, [key]: value }));

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!String(form.code ?? '').trim()) { toast('Supplier Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('Supplier Name is required.', 'error'); return; }
    setBusy(true);
    try {
      const rawContacts = ((form.contacts as Contact[]) || []);
      const rawAddresses = ((form.addresses as Address[]) || []);

      const syncedAddresses = rawAddresses.length > 0 ? rawAddresses.map((a, i) => i === 0 ? {
        ...a,
        addressLine1: a.addressLine1 || (form.billingAddress as string) || '',
        city: a.city || (form.city as string) || '',
        state: a.state || (form.state as string) || '',
        pinZipCode: a.pinZipCode || (form.pincode as string) || '',
        country: a.country || (form.country as string) || 'India',
      } : a) : [{
        addressName: 'Main Office', addressType: 'Registered',
        addressLine1: (form.billingAddress as string) || '',
        city: (form.city as string) || '', state: (form.state as string) || '',
        country: (form.country as string) || 'India', pinZipCode: (form.pincode as string) || '',
        defaultAddress: true, active: true
      }];

      const firstAddr = syncedAddresses[0];
      const payload = {
        ...form,
        kind: 'SUPPLIER',
        contactPerson: (form.contactPerson as string) || rawContacts[0]?.contactPersonName || '',
        mobile: (form.mobile as string) || rawContacts[0]?.mobileNumber || '',
        phone: (form.phone as string) || (form.mobile as string) || '',
        email: (form.email as string) || rawContacts[0]?.email || '',
        address: firstAddr ? [firstAddr.addressLine1, firstAddr.city, firstAddr.state].filter(Boolean).join(', ') : (form.billingAddress as string || ''),
        gstNumber: form.gstin ?? '',
        paymentTerms: form.paymentTerms ?? '',
        supplierGroup: form.supplierGroup ?? '',
        qualityCertRequired: Boolean(form.qualityCertRequired),
        inspectionRequired: Boolean(form.inspectionRequired),
        contactsJson: JSON.stringify(form.contacts ?? []),
        addressesJson: JSON.stringify(syncedAddresses),
        bankAccountsJson: JSON.stringify(form.bankAccounts ?? []),
        documentsJson: JSON.stringify(form.documents ?? []),
        itemsSuppliedJson: JSON.stringify(itemsSupplied),
      };
      if (editId) {
        await apiClient.put(`/master/parties/${editId}`, payload);
        toast('Supplier updated successfully.');
        onSaved?.(editId);
      } else {
        const { data } = await apiClient.post('/master/parties', payload);
        toast('Supplier created successfully.');
        onSaved?.(data.id);
      }
      onBack();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">Loading supplier details...</div>
      </div>
    );
  }

  return (
    <>
      {/* Top Action Bar */}
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text">
          <p>Master -&gt; Supplier</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          {!viewOnly && (
            <button type="button" className="btn btn-primary" onClick={() => save()} disabled={busy}>
              {busy ? 'Saving...' : 'Save Supplier'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={save}>
        {/* SECTION 1: Basic Information */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">info</span>
            <span>Basic Information</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <label className="fld">
              <span>SUPPLIER CODE *</span>
              <input className="in" type="text" readOnly value={String(form.code ?? 'SUP-0003')} style={{ backgroundColor: '#f8fafc', fontWeight: 600 }} />
            </label>
            <label className="fld">
              <span>SUPPLIER NAME *</span>
              <input className="in" type="text" required placeholder="Full legal name" value={String(form.name ?? '')} onChange={e => updateForm('name', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>PRINT NAME</span>
              <input className="in" type="text" placeholder="Short name for prints" value={String(form.printName ?? '')} onChange={e => updateForm('printName', e.target.value)} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>SUPPLIER GROUP</span>
              <select className="in" value={String(form.supplierGroup ?? '')} onChange={e => updateForm('supplierGroup', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="Raw Material">Raw Material</option>
                <option value="Consumables">Consumables</option>
                <option value="Bought Out">Bought Out</option>
                <option value="Services">Services</option>
              </select>
            </label>
            <label className="fld">
              <span>SUPPLIER TYPE</span>
              <select className="in" value={String(form.supplierType ?? '')} onChange={e => updateForm('supplierType', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>TERRITORY / REGION</span>
              <input className="in" type="text" placeholder="e.g. South India" value={String(form.territory ?? '')} onChange={e => updateForm('territory', e.target.value)} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>INDUSTRY</span>
              <select className="in" value={String(form.industry ?? '')} onChange={e => updateForm('industry', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>STATUS</span>
              <select className="in" value={String(form.customerStatus ?? (form.active !== false ? 'Active' : 'Inactive'))} onChange={e => {
                const status = e.target.value;
                setForm(c => ({
                  ...c,
                  customerStatus: status,
                  active: status === 'Active'
                }));
              }} disabled={viewOnly}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.active ?? true)} onChange={e => {
                const activeVal = e.target.checked;
                setForm(c => ({
                  ...c,
                  active: activeVal,
                  customerStatus: activeVal ? 'Active' : 'Inactive'
                }));
              }} disabled={viewOnly} />
              <span>Active</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.qualityCertRequired)} onChange={e => updateForm('qualityCertRequired', e.target.checked)} disabled={viewOnly} />
              <span>Quality Certificate Required</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.inspectionRequired)} onChange={e => updateForm('inspectionRequired', e.target.checked)} disabled={viewOnly} />
              <span>Inspection Required</span>
            </label>
          </div>
        </div>

        {/* SECTION 2: Address Details */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">location_on</span>
            <span>Address Details</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <label className="fld">
              <span>BILLING ADDRESS</span>
              <textarea className="in" rows={2} placeholder="Door no, Street, Area" value={String(form.billingAddress ?? '')} onChange={e => updateForm('billingAddress', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>FACTORY / DISPATCH ADDRESS</span>
              <textarea className="in" rows={2} placeholder="If different from billing" value={String(form.deliveryAddress ?? '')} onChange={e => updateForm('deliveryAddress', e.target.value)} disabled={viewOnly} />
            </label>
          </div>

          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
            <label className="fld">
              <span>CITY</span>
              <input className="in" type="text" placeholder="City" value={String(form.city ?? '')} onChange={e => updateForm('city', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>STATE</span>
              <select className="in" value={String(form.state ?? '')} onChange={e => updateForm('state', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Gujarat">Gujarat</option>
              </select>
            </label>
            <label className="fld">
              <span>PINCODE</span>
              <input className="in" type="text" placeholder="000000" value={String(form.pincode ?? '')} onChange={e => updateForm('pincode', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>COUNTRY</span>
              <input className="in" type="text" value={String(form.country ?? 'India')} onChange={e => updateForm('country', e.target.value)} disabled={viewOnly} />
            </label>
          </div>
        </div>

        {/* SECTION 3: Contact Information */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">call</span>
            <span>Contact Information</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <label className="fld">
              <span>CONTACT PERSON NAME</span>
              <input className="in" type="text" placeholder="Main contact person" value={String(form.contactPerson ?? '')} onChange={e => updateForm('contactPerson', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>MOBILE</span>
              <input className="in" type="text" placeholder="+91 00000 00000" value={String(form.mobile ?? '')} onChange={e => updateForm('mobile', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>EMAIL</span>
              <input className="in" type="email" placeholder="info@supplier.com" value={String(form.email ?? '')} onChange={e => updateForm('email', e.target.value)} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>PHONE</span>
              <input className="in" type="text" placeholder="Office landline" value={String(form.phone ?? '')} onChange={e => updateForm('phone', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>WEBSITE</span>
              <input className="in" type="text" placeholder="https://www.supplier.com" value={String(form.website ?? '')} onChange={e => updateForm('website', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>FAX</span>
              <input className="in" type="text" placeholder="Fax number" value={String(form.fax ?? '')} onChange={e => updateForm('fax', e.target.value)} disabled={viewOnly} />
            </label>
          </div>

          {/* Contact Persons Table */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase' }}>CONTACT PERSONS</div>
            {((form.contacts as Contact[]) || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                <input className="in" style={{ flex: 1 }} placeholder="Full name" value={c.contactPersonName || ''} onChange={e => {
                  const updated = [...((form.contacts as Contact[]) || [])];
                  updated[i] = { ...updated[i], contactPersonName: e.target.value };
                  updateForm('contacts', updated);
                }} disabled={viewOnly} />
                <input className="in" style={{ flex: 1 }} placeholder="Manager / Director" value={c.designation || ''} onChange={e => {
                  const updated = [...((form.contacts as Contact[]) || [])];
                  updated[i] = { ...updated[i], designation: e.target.value };
                  updateForm('contacts', updated);
                }} disabled={viewOnly} />
                <input className="in" style={{ flex: 1 }} placeholder="+91 00000 00000" value={c.mobileNumber || ''} onChange={e => {
                  const updated = [...((form.contacts as Contact[]) || [])];
                  updated[i] = { ...updated[i], mobileNumber: e.target.value };
                  updateForm('contacts', updated);
                }} disabled={viewOnly} />
                <input className="in" style={{ flex: 1 }} placeholder="email@company.com" value={c.email || ''} onChange={e => {
                  const updated = [...((form.contacts as Contact[]) || [])];
                  updated[i] = { ...updated[i], email: e.target.value };
                  updateForm('contacts', updated);
                }} disabled={viewOnly} />
                {!viewOnly && (
                  <button type="button" className="ibtn danger" onClick={() => {
                    const updated = ((form.contacts as Contact[]) || []).filter((_, idx) => idx !== i);
                    updateForm('contacts', updated);
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                  </button>
                )}
              </div>
            ))}
            {!viewOnly && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ marginTop: '8px' }}
                onClick={() => updateForm('contacts', [...((form.contacts as Contact[]) || []), { contactPersonName: '', designation: '', mobileNumber: '', email: '', primaryContact: false, active: true }])}
              >
                + Add Contact Person
              </button>
            )}
          </div>
        </div>

        {/* SECTION 4: Statutory & Tax */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">receipt_long</span>
            <span>Statutory & Tax</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <label className="fld">
              <span>GST REGISTRATION TYPE</span>
              <select className="in" value={String(form.gstRegType ?? '')} onChange={e => updateForm('gstRegType', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                {GST_REG_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>GSTIN *</span>
              <input className="in" type="text" placeholder="OOXXXXX0000XOXX" value={String(form.gstin ?? '')} onChange={e => updateForm('gstin', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>GST STATE</span>
              <select className="in" value={String(form.gstState ?? '')} onChange={e => updateForm('gstState', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
              </select>
            </label>

            <label className="fld">
              <span>PAN NO</span>
              <input className="in" type="text" placeholder="XXXXXXXXXX" value={String(form.pan ?? '')} onChange={e => updateForm('pan', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>CIN NO</span>
              <input className="in" type="text" placeholder="L00000XX0000XXX000000" value={String(form.cin ?? '')} onChange={e => updateForm('cin', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>MSME NO</span>
              <input className="in" type="text" placeholder="MSME registration no" value={String(form.msmeNo ?? '')} onChange={e => updateForm('msmeNo', e.target.value)} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>MSME TYPE</span>
              <select className="in" value={String(form.msmeType ?? '')} onChange={e => updateForm('msmeType', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="Micro">Micro</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.tdsApplicable)} onChange={e => updateForm('tdsApplicable', e.target.checked)} disabled={viewOnly} />
              <span>TDS Applicable</span>
            </label>
          </div>
        </div>

        {/* SECTION 5: Purchase Terms */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">shopping_bag</span>
            <span>Purchase Terms</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <label className="fld">
              <span>CURRENCY</span>
              <select className="in" value={String(form.currency ?? 'INR')} onChange={e => updateForm('currency', e.target.value)} disabled={viewOnly}>
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </label>
            <label className="fld">
              <span>PAYMENT TERMS</span>
              <select className="in" value={String(form.paymentTerms ?? '')} onChange={e => updateForm('paymentTerms', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="30 Days">30 Days</option>
                <option value="45 Days">45 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="Advance">Advance</option>
              </select>
            </label>
            <label className="fld">
              <span>CREDIT DAYS</span>
              <input className="in" type="number" value={Number(form.creditDays ?? 30)} onChange={e => updateForm('creditDays', parseInt(e.target.value))} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>MIN ORDER QTY</span>
              <input className="in" type="text" placeholder="Minimum order quantity" value={String(form.minOrderQty ?? '')} onChange={e => updateForm('minOrderQty', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>MIN ORDER VALUE (RS)</span>
              <input className="in" type="number" step="0.01" value={Number(form.minOrderValue ?? 0)} onChange={e => updateForm('minOrderValue', parseFloat(e.target.value))} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>DISCOUNT %</span>
              <input className="in" type="number" step="0.01" value={Number(form.discountPct ?? 0)} onChange={e => updateForm('discountPct', parseFloat(e.target.value))} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>DELIVERY TERMS</span>
              <select className="in" value={String(form.deliveryTerms ?? '')} onChange={e => updateForm('deliveryTerms', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="Door Delivery">Door Delivery</option>
              </select>
            </label>
            <label className="fld">
              <span>TRANSPORT MODE</span>
              <select className="in" value={String(form.transportMode ?? '')} onChange={e => updateForm('transportMode', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="Road">Road</option>
                <option value="Air">Air</option>
                <option value="Sea">Sea</option>
              </select>
            </label>
            <label className="fld">
              <span>TRANSPORTER</span>
              <input className="in" type="text" placeholder="Logistics company name" value={String(form.transporterName ?? '')} onChange={e => updateForm('transporterName', e.target.value)} disabled={viewOnly} />
            </label>

            <label className="fld">
              <span>LEDGER GROUP</span>
              <input className="in" type="text" value={String(form.ledgerGroup ?? 'Sundry Creditors')} onChange={e => updateForm('ledgerGroup', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>OPENING BALANCE (RS)</span>
              <input className="in" type="number" step="0.01" value={Number(form.openingBalance ?? 0)} onChange={e => updateForm('openingBalance', parseFloat(e.target.value))} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>DR / CR</span>
              <select className="in" value={String(form.drCr ?? 'Cr')} onChange={e => updateForm('drCr', e.target.value)} disabled={viewOnly}>
                <option value="Cr">Cr</option>
                <option value="Dr">Dr</option>
              </select>
            </label>
          </div>
        </div>

        {/* SECTION 6: Bank Details */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">account_balance</span>
            <span>Bank Details</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          {((form.bankAccounts as BankAccount[]) || []).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
              <input className="in" style={{ flex: 1 }} placeholder="Bank name" value={b.bankName || ''} onChange={e => {
                const updated = [...((form.bankAccounts as BankAccount[]) || [])];
                updated[i] = { ...updated[i], bankName: e.target.value };
                updateForm('bankAccounts', updated);
              }} disabled={viewOnly} />
              <input className="in" style={{ flex: 1 }} placeholder="Account number" value={b.accountNumber || ''} onChange={e => {
                const updated = [...((form.bankAccounts as BankAccount[]) || [])];
                updated[i] = { ...updated[i], accountNumber: e.target.value };
                updateForm('bankAccounts', updated);
              }} disabled={viewOnly} />
              <input className="in" style={{ flex: 1 }} placeholder="XXXXXXXXXX" value={b.ifscCode || ''} onChange={e => {
                const updated = [...((form.bankAccounts as BankAccount[]) || [])];
                updated[i] = { ...updated[i], ifscCode: e.target.value };
                updateForm('bankAccounts', updated);
              }} disabled={viewOnly} />
              <input className="in" style={{ flex: 1 }} placeholder="Branch name" value={b.branchName || ''} onChange={e => {
                const updated = [...((form.bankAccounts as BankAccount[]) || [])];
                updated[i] = { ...updated[i], branchName: e.target.value };
                updateForm('bankAccounts', updated);
              }} disabled={viewOnly} />
              <select className="in" style={{ flex: 1 }} value={b.accountType || ''} onChange={e => {
                const updated = [...((form.bankAccounts as BankAccount[]) || [])];
                updated[i] = { ...updated[i], accountType: e.target.value };
                updateForm('bankAccounts', updated);
              }} disabled={viewOnly}>
                <option value="">-- Select --</option>
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
              </select>
              {!viewOnly && (
                <button type="button" className="ibtn danger" onClick={() => {
                  const updated = ((form.bankAccounts as BankAccount[]) || []).filter((_, idx) => idx !== i);
                  updateForm('bankAccounts', updated);
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                </button>
              )}
            </div>
          ))}
          {!viewOnly && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ marginTop: '8px' }}
              onClick={() => updateForm('bankAccounts', [...((form.bankAccounts as BankAccount[]) || []), { bankName: '', accountNumber: '', ifscCode: '', branchName: '', accountType: 'Current', active: true }])}
            >
              + Add Bank Account
            </button>
          )}
        </div>

        {/* SECTION 7: Items Supplied */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="material-symbols-rounded">inventory_2</span>
            <span>Items Supplied</span>
          </div>
        </div>
        <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>List of items this supplier provides to your company</p>
          {itemsSupplied.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
              <input className="in" style={{ flex: 1 }} placeholder="Item code" value={item.itemCode || ''} onChange={e => {
                const updated = [...itemsSupplied];
                updated[i] = { ...updated[i], itemCode: e.target.value };
                setItemsSupplied(updated);
              }} disabled={viewOnly} />
              <input className="in" style={{ flex: 1 }} placeholder="Item description" value={item.itemName || ''} onChange={e => {
                const updated = [...itemsSupplied];
                updated[i] = { ...updated[i], itemName: e.target.value };
                setItemsSupplied(updated);
              }} disabled={viewOnly} />
              <input className="in" style={{ flex: 1 }} placeholder="Vendor's part number" value={item.supplierPartNo || ''} onChange={e => {
                const updated = [...itemsSupplied];
                updated[i] = { ...updated[i], supplierPartNo: e.target.value };
                setItemsSupplied(updated);
              }} disabled={viewOnly} />
              <input className="in" type="number" style={{ width: '120px' }} placeholder="Days" value={item.leadDays || ''} onChange={e => {
                const updated = [...itemsSupplied];
                updated[i] = { ...updated[i], leadDays: parseInt(e.target.value) || 0 };
                setItemsSupplied(updated);
              }} disabled={viewOnly} />
              {!viewOnly && (
                <button type="button" className="ibtn danger" onClick={() => setItemsSupplied(s => s.filter((_, idx) => idx !== i))}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                </button>
              )}
            </div>
          ))}
          {!viewOnly && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ marginTop: '8px' }}
              onClick={() => setItemsSupplied(s => [...s, { itemCode: '', itemName: '', supplierPartNo: '', leadDays: 7 }])}
            >
              + Add Item
            </button>
          )}
        </div>

        <div className="actbar" style={{ marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          {!viewOnly && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Save Supplier'}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
