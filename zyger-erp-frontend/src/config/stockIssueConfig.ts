import type { StockIssueTypeConfig } from '../types/inventory/stockIssue.types';

export const GENERAL_ISSUE_CONFIG: StockIssueTypeConfig = {
  screenId: 'general-issue',
  title: 'General Stock Issue',
  prefix: 'GEI',
  docLabel: 'General Issue',
  icon: 'outbox',
  subtitle: 'General Issue — select Stock Issue Request to auto-fill, stock reduces on posting',
  apiPath: '/inventory/stock-issue/general-issue',
  transactionType: 'GENERAL_ISSUE',
  headerFields: [
    {
      key: 'department',
      label: 'Department',
      type: 'select',
      required: true,
      options: 'departments',
    },
    {
      key: 'purpose',
      label: 'Purpose',
      type: 'text',
      required: true,
    },
  ],
};
