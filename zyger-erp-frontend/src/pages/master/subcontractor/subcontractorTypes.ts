export interface Contact {
  contactPersonName: string; designation?: string; department?: string;
  mobileNumber: string; alternateMobile?: string; landline?: string;
  email: string; alternateEmail?: string; whatsappNumber?: string;
  preferredCommunication?: string; primaryContact: boolean; active: boolean; remarks?: string;
}

export interface Address {
  addressName: string; addressType: string;
  addressLine1: string; addressLine2?: string; addressLine3?: string;
  areaLocality?: string; city: string; district?: string; state: string;
  country: string; pinZipCode: string; phone?: string; email?: string;
  gstin?: string; contactPerson?: string; latitude?: number; longitude?: number;
  defaultAddress: boolean; active: boolean;
}

export interface BankAccount {
  bankAccountName: string; accountNumber: string; confirmAccountNumber?: string;
  bankName: string; branchName: string; branchAddress?: string;
  ifscCode: string; swiftCode?: string; micrCode?: string;
  accountType: string; currency: string; beneficiaryName: string;
  defaultBankAccount: boolean; active: boolean; verificationStatus: string; remarks?: string;
}

export interface SubcontractorDocument {
  documentType: string; documentNumber?: string; documentDate?: string;
  expiryDate?: string; attachment?: string; remarks?: string; status?: string;
}

export interface Party {
  id: number; kind: string;
  code: string; name: string; displayName?: string;
  customerType: string; customerCategory: string;
  customerStatus: string; remarks?: string;
  turnaroundTime?: number; certifications?: string; annualCapacity?: string;
  contacts: Contact[];
  addresses: Address[];
  gstRegistrationStatus?: string; gstin?: string; gstRegistrationType?: string;
  gstEffectiveDate?: string; gstExpiryDate?: string; gstState?: string;
  taxpayerType?: string; eInvoiceApplicable?: boolean; eWayBillApplicable?: boolean;
  tdsApplicable?: boolean; tcsApplicable?: boolean;
  taxExemption?: boolean; taxExemptionNumber?: string;
  taxExemptionFrom?: string; taxExemptionTo?: string;
  panNumber?: string; panHolderName?: string; panStatus?: string;
  defaultTaxCategory?: string; defaultGstRate?: number;
  tdsSection?: string; tdsRate?: number; tcsRate?: number;
  reverseChargeApplicable?: boolean;
  bankAccounts: BankAccount[];
  currency?: string; paymentTerms?: string; creditLimit?: number;
  creditDays?: number; paymentMethod?: string; priceList?: string;
  discount?: number; salesTerritory?: string;
  incoterms?: string; freightTerms?: string; insuranceTerms?: string;
  deliveryTerms?: string; billingCycle?: string;
  creditHold?: boolean; creditHoldReason?: string;
  advanceRequired?: boolean; advancePercentage?: number;
  documents: SubcontractorDocument[];
  active: boolean;
}

export const GST_REG_TYPES = ['Regular', 'Composition', 'Unregistered', 'SEZ', 'Deemed Export', 'Export', 'Other'];
export const SUBCONTRACTOR_TYPES = ['Job Worker', 'Process Vendor', 'Service Provider', 'Special Process Vendor', 'Assembly Vendor', 'Inspection / Testing Vendor'];
export const SUBCONTRACTOR_CATEGORIES = ['Machining', 'Turning', 'Milling', 'Grinding', 'Heat Treatment', 'Surface Treatment', 'Plating', 'Anodizing', 'Welding', 'Laser Cutting', 'Sheet Metal', 'Painting', 'NDT', 'Testing', 'Assembly', 'Other'];
export const STATUSES = ['Active', 'Inactive', 'Blocked'];
export const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft', 'Other'];
export const ADDRESS_TYPES = ['Registered', 'Factory/Work Location', 'Billing', 'Other'];
export const BILLING_CYCLES = ['Immediate', 'Weekly', 'Monthly'];
export const DOC_TYPES = [
  'GST Certificate', 'PAN Card', 'Company Registration', 'MSME Certificate',
  'NDA', 'Quality Agreement', 'Supplier Registration', 'Bank Confirmation',
  'Certification (ISO/AS)', 'Other',
];

export const tryParseJson = (s: string): unknown[] => { try { return JSON.parse(s); } catch { return []; } };

export const hydrateRow = (r: Party): Record<string, unknown> => {
  const rec = r as unknown as Record<string, unknown>;
  return {
    ...rec,
    contacts: typeof rec.contactsJson === 'string' ? tryParseJson(rec.contactsJson as string) : (rec.contacts ?? []),
    addresses: typeof rec.addressesJson === 'string' ? tryParseJson(rec.addressesJson as string) : (rec.addresses ?? []),
    bankAccounts: typeof rec.bankAccountsJson === 'string' ? tryParseJson(rec.bankAccountsJson as string) : (rec.bankAccounts ?? []),
    documents: typeof rec.documentsJson === 'string' ? tryParseJson(rec.documentsJson as string) : (rec.documents ?? []),
  };
};

export const emptyContact = (): Contact => ({ contactPersonName: '', mobileNumber: '', email: '', primaryContact: false, active: true });
export const emptyAddress = (): Address => ({ addressName: '', addressType: 'Registered', addressLine1: '', city: '', state: '', country: 'India', pinZipCode: '', defaultAddress: true, active: true });
export const emptyBank = (): BankAccount => ({ bankAccountName: '', accountNumber: '', bankName: '', branchName: '', ifscCode: '', accountType: 'Current', currency: 'INR', beneficiaryName: '', defaultBankAccount: true, active: true, verificationStatus: 'Pending' });
export const emptyDoc = (): SubcontractorDocument => ({ documentType: '', status: 'Active' });

export const defaultForm = (): Record<string, unknown> => ({
  kind: 'SUBCONTRACTOR', customerStatus: 'Active', gstRegistrationStatus: '',
  gstin: '', gstRegistrationType: '', gstState: 'Maharashtra',
  eInvoiceApplicable: false, eWayBillApplicable: false, tdsApplicable: false, tcsApplicable: false,
  taxExemption: false, reverseChargeApplicable: false,
  currency: 'INR', paymentTerms: '30 Days', billingCycle: 'Immediate',
  creditHold: false, advanceRequired: false,
  contacts: [emptyContact()], addresses: [emptyAddress()],
  bankAccounts: [emptyBank()], documents: [emptyDoc()],
});
