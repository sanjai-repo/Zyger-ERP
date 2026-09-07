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

export interface DeliveryAddress extends Address {
  deliveryLocationCode?: string; contactMobile?: string; contactEmail?: string;
  deliveryTimeFrom?: string; deliveryTimeTo?: string; deliveryWorkingDays?: string;
  gateEntryInstructions?: string; vehicleRestrictions?: string;
  specialDeliveryInstructions?: string; defaultDeliveryLocation?: boolean;
}

export interface BankAccount {
  bankAccountName: string; accountNumber: string; confirmAccountNumber?: string;
  bankName: string; branchName: string; branchAddress?: string;
  ifscCode: string; swiftCode?: string; micrCode?: string;
  accountType: string; currency: string; beneficiaryName: string;
  defaultBankAccount: boolean; active: boolean; verificationStatus: string; remarks?: string;
}

export interface CustomerDocument {
  documentType: string; documentNumber?: string; documentDate?: string;
  expiryDate?: string; attachment?: string; remarks?: string; status?: string;
}

export interface Party {
  id: number; kind: string;
  code: string; name: string; displayName?: string;
  customerType: string; customerCategory: string;
  companyRegNo?: string; cin?: string; pan?: string;
  website?: string; industry?: string; type?: string; businessNature?: string;
  establishedDate?: string; numberOfEmployees?: number; annualTurnover?: number;
  customerRating?: string; customerPriority?: string; customerStatus: string;
  onboardingDate?: string; salesperson?: string; customerGroup?: string; remarks?: string;
  contacts: Contact[];
  addresses: Address[];
  deliveryAddresses: DeliveryAddress[];
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
  documents: CustomerDocument[];
  active: boolean;
}

export const GST_REG_TYPES = ['Regular', 'Composition', 'Unregistered', 'SEZ', 'Deemed Export', 'Export', 'Other'];
export const CUSTOMER_TYPES = ['OEM', 'Tier-1', 'Tier-2', 'Trading', 'Vendor-Customer', 'Other'];
export const CUSTOMER_CATEGORIES = ['Domestic', 'Export', 'Government', 'Private'];
export const INDUSTRIES = ['Automotive', 'Aerospace', 'Engineering', 'Defence', 'Other'];
export const BUSINESS_TYPES = ['A2B', 'B2B', 'B2C'];
export const BUSINESS_NATURES = ['Manufacturer', 'Distributor', 'Service', 'OEM'];
export const RATINGS = ['A', 'B', 'C'];
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const STATUSES = ['Active', 'Inactive', 'Blocked'];
export const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft', 'Other'];
export const ADDRESS_TYPES = ['Registered', 'Billing', 'Shipping', 'Delivery', 'Pickup', 'Other'];
export const BILLING_CYCLES = ['Immediate', 'Weekly', 'Monthly'];
export const DOC_TYPES = [
  'GST Certificate', 'PAN Card', 'Company Registration', 'MSME Certificate',
  'Purchase Agreement', 'NDA', 'Quality Agreement', 'Supplier/Customer Registration',
  'Bank Confirmation', 'Customer Drawing Agreement', 'Other',
];

export const tryParseJson = (s: string): unknown[] => { try { return JSON.parse(s); } catch { return []; } };

export const hydrateRow = (r: Party): Record<string, unknown> => {
  const rec = r as unknown as Record<string, unknown>;
  return {
    ...rec,
    printName: rec.printName ?? rec.displayName ?? rec.legalName ?? '',
    territory: rec.territory ?? rec.salesTerritory ?? '',
    pricingGroup: rec.pricingGroup ?? rec.priceList ?? '',
    eWaybillApplicable: rec.eWaybillApplicable ?? rec.eWayBillApplicable ?? false,
    gstRegType: rec.gstRegType ?? rec.gstRegistrationType ?? '',
    msmeNo: rec.msmeNo ?? rec.msmeNumber ?? '',
    discountPct: rec.discountPct ?? rec.discount ?? 0,
    leadDays: rec.leadDays ?? rec.leadTimeDays ?? 0,
    contacts: typeof rec.contactsJson === 'string' ? tryParseJson(rec.contactsJson as string) : (rec.contacts ?? []),
    addresses: typeof rec.addressesJson === 'string' ? tryParseJson(rec.addressesJson as string) : (rec.addresses ?? []),
    deliveryAddresses: typeof rec.deliveryAddressesJson === 'string' ? tryParseJson(rec.deliveryAddressesJson as string) : (rec.deliveryAddresses ?? []),
    bankAccounts: typeof rec.bankAccountsJson === 'string' ? tryParseJson(rec.bankAccountsJson as string) : (rec.bankAccounts ?? []),
    documents: typeof rec.documentsJson === 'string' ? tryParseJson(rec.documentsJson as string) : (rec.documents ?? []),
  };
};

export const emptyContact = (): Contact => ({ contactPersonName: '', mobileNumber: '', email: '', primaryContact: false, active: true });
export const emptyAddress = (): Address => ({ addressName: '', addressType: 'Registered', addressLine1: '', city: '', state: '', country: 'India', pinZipCode: '', defaultAddress: true, active: true });
export const emptyDelivery = (): DeliveryAddress => ({ addressName: '', addressType: 'Delivery', addressLine1: '', city: '', state: '', country: 'India', pinZipCode: '', contactPerson: '', contactMobile: '', defaultDeliveryLocation: true, defaultAddress: true, active: true });

export const emptyBank = (): BankAccount => ({ bankAccountName: '', accountNumber: '', bankName: '', branchName: '', ifscCode: '', accountType: 'Current', currency: 'INR', beneficiaryName: '', defaultBankAccount: true, active: true, verificationStatus: 'Pending' });
export const emptyDoc = (): CustomerDocument => ({ documentType: '', status: 'Active' });

export const defaultForm = (): Record<string, unknown> => ({
  kind: 'CUSTOMER', customerStatus: 'Active', gstRegistrationStatus: '',
  contactPerson: '', mobile: '', phone: '', email: '', website: '', fax: '',
  gstin: '', gstRegistrationType: '', gstState: 'Maharashtra',
  eInvoiceApplicable: false, eWayBillApplicable: false, tdsApplicable: false, tcsApplicable: false,
  taxExemption: false, reverseChargeApplicable: false,
  currency: 'INR', paymentTerms: '30 Days', billingCycle: 'Immediate',
  creditHold: false, advanceRequired: false,
  contacts: [], addresses: [emptyAddress()], deliveryAddresses: [emptyDelivery()],
  bankAccounts: [emptyBank()], documents: [emptyDoc()],
});
