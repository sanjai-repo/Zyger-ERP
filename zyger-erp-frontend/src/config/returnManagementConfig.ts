import type { ReturnManagementTypeConfig } from '../types/inventory/returnManagement.types';

export const REASON_CODE_OPTIONS = [
  'Quality Rejection',
  'Wrong Material',
  'Excess Quantity',
  'Damage',
  'Other',
];

export const DC_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'dc-return',
  title: 'DC Return',
  prefix: 'DRT',
  icon: 'assignment_return',
  subtitle: 'DC Return — stock increases on posting',
  apiPath: '/inventory/return-management/dc-return',
  transactionType: 'DC_RETURN',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const INVOICE_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'invoice-return',
  title: 'Invoice Return',
  prefix: 'IVR',
  icon: 'assignment_return',
  subtitle: 'Invoice Return — stock increases on posting',
  apiPath: '/inventory/return-management/invoice-return',
  transactionType: 'SALES_RETURN',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const INTERNAL_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'internal-return',
  title: 'Internal Return',
  prefix: 'INR',
  icon: 'assignment_return',
  subtitle: 'Internal Return — stock increases on posting',
  apiPath: '/inventory/return-management/internal-return',
  transactionType: 'INTERNAL_RETURN',
  partySource: 'departments',
  partyLabel: 'Department',
};

