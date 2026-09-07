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

export interface SupplierDocument {
  documentType: string; documentNumber?: string; documentDate?: string;
  expiryDate?: string; attachment?: string; remarks?: string; status?: string;
}

export interface Party {
  id: number; kind: string;
  code: string; name: string; displayName?: string;
  customerType: string; customerCategory: string;
  supplierType?: string; supplierCategory?: string;
  companyRegNo?: string; cin?: string; pan?: string;
  website?: string; industry?: string; type?: string; businessNature?: string;
  establishedDate?: string; numberOfEmployees?: number; annualTurnover?: number;
  customerRating?: string; customerPriority?: string; customerStatus: string;
  onboardingDate?: string; salesperson?: string; customerGroup?: string; remarks?: string;
  qualityRating?: string; onTimeDelivery?: string;
  leadTimeDays?: number; minOrderValue?: number;
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
  documents: SupplierDocument[];
  active: boolean;
}

export const GST_REG_TYPES = ['Regular', 'Composition', 'Unregistered', 'SEZ', 'Deemed Export', 'Export', 'Other'];
export const SUPPLIER_TYPES = [
  'Raw Material Supplier', 'Tool Supplier', 'Consumable Supplier', 'Machine Supplier',
  'Spare Parts Supplier', 'Subcontractor / Job Worker', 'Service Provider',
  'Packaging Supplier', 'General Supplier', 'Other',
];
export const SUPPLIER_CATEGORIES = ['Raw Material', 'Tool', 'Consumable', 'Subcontract', 'Packaging', 'General', 'Other'];
export const STATUSES = ['Active', 'Inactive', 'Blocked'];
export const RATINGS = ['A', 'B', 'C'];
export const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft', 'Other'];
export const ADDRESS_TYPES = ['Registered', 'Billing', 'Shipping', 'Pickup', 'Other'];
export const BILLING_CYCLES = ['Immediate', 'Weekly', 'Monthly'];
export const DOC_TYPES = [
  'GST Certificate', 'PAN Card', 'Company Registration', 'MSME Certificate',
  'Purchase Agreement', 'NDA', 'Quality Agreement', 'Supplier Registration',
  'Bank Confirmation', 'Other',
];

export const tryParseJson = (s: string): unknown[] => { try { return JSON.parse(s); } catch { return []; } };

export const hydrateRow = (r: Party): Record<string, unknown> => {
  const rec = r as unknown as Record<string, unknown>;
  return {
    ...rec,
    supplierGroup: rec.supplierGroup ?? rec.supplier_group ?? rec.materialGroup ?? '',
    qualityCertRequired: rec.qualityCertRequired ?? rec.quality_cert_required ?? false,
    inspectionRequired: rec.inspectionRequired ?? rec.inspection_required ?? rec.inspectionRequiredParty ?? false,
    printName: rec.printName ?? rec.displayName ?? rec.legalName ?? '',
    territory: rec.territory ?? rec.salesTerritory ?? '',
    pricingGroup: rec.pricingGroup ?? rec.priceList ?? '',
    gstRegType: rec.gstRegType ?? rec.gstRegistrationType ?? '',
    msmeNo: rec.msmeNo ?? rec.msmeNumber ?? '',
    discountPct: rec.discountPct ?? rec.discount ?? 0,
    leadDays: rec.leadDays ?? rec.leadTimeDays ?? 0,
    contacts: typeof rec.contactsJson === 'string' ? tryParseJson(rec.contactsJson as string) : (rec.contacts ?? []),
    addresses: typeof rec.addressesJson === 'string' ? tryParseJson(rec.addressesJson as string) : (rec.addresses ?? []),
    bankAccounts: typeof rec.bankAccountsJson === 'string' ? tryParseJson(rec.bankAccountsJson as string) : (rec.bankAccounts ?? []),
    documents: typeof rec.documentsJson === 'string' ? tryParseJson(rec.documentsJson as string) : (rec.documents ?? []),
    itemsSupplied: typeof rec.itemsSuppliedJson === 'string' ? tryParseJson(rec.itemsSuppliedJson as string) : (rec.itemsSupplied ?? []),
  };
};

export const emptyContact = (): Contact => ({ contactPersonName: '', mobileNumber: '', email: '', primaryContact: false, active: true });
export const emptyAddress = (): Address => ({ addressName: '', addressType: 'Registered', addressLine1: '', city: '', state: '', country: 'India', pinZipCode: '', defaultAddress: true, active: true });
export const emptyBank = (): BankAccount => ({ bankAccountName: '', accountNumber: '', bankName: '', branchName: '', ifscCode: '', accountType: 'Current', currency: 'INR', beneficiaryName: '', defaultBankAccount: true, active: true, verificationStatus: 'Pending' });
export const emptyDoc = (): SupplierDocument => ({ documentType: '', status: 'Active' });

export const defaultForm = (): Record<string, unknown> => ({
  kind: 'SUPPLIER', customerStatus: 'Active', active: true,
  supplierGroup: 'Raw Material', supplierType: 'Raw Material Supplier',
  qualityCertRequired: false, inspectionRequired: false,
  contactPerson: '', phone: '', mobile: '', email: '', website: '', fax: '',
  billingAddress: '', deliveryAddress: '', city: '', state: 'Tamil Nadu', pincode: '', country: 'India',
  gstin: '', gstRegType: 'Regular', gstState: 'Tamil Nadu', pan: '', cin: '', msmeNo: '', msmeType: '',
  tdsApplicable: false,
  currency: 'INR', paymentTerms: '30 Days', creditDays: 30, minOrderQty: '', minOrderValue: 0, discountPct: 0,
  deliveryTerms: 'Door Delivery', transportMode: 'Road', transporterName: '',
  ledgerGroup: 'Sundry Creditors', openingBalance: 0, drCr: 'Cr',
  contacts: [], addresses: [emptyAddress()], bankAccounts: [emptyBank()], documents: [emptyDoc()], itemsSupplied: [],
});
