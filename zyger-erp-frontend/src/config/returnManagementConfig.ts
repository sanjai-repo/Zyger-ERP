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
  prefix: 'DCRET',
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
  prefix: 'INVRET',
  icon: 'assignment_return',
  subtitle: 'Invoice Return — stock increases on posting',
  apiPath: '/inventory/return-management/invoice-return',
  transactionType: 'SALES_RETURN',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const STOCK_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'stock-return',
  title: 'Stock Return',
  prefix: 'STKRET',
  icon: 'assignment_return',
  subtitle: 'Stock Return — stock increases on posting, consumption reduced on posting',
  apiPath: '/inventory/return-management/stock-return',
  transactionType: 'STOCK_RETURN',
  partySource: 'departments',
  partyLabel: 'Department',
};

