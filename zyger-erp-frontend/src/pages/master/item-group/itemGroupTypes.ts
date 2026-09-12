export interface ItemGroup {
  id: number;
  code: string;
  name: string;
  itemType?: string;
  description?: string;
  parentId?: number;
  parentCode?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultForm = (): Record<string, unknown> => ({
  code: '',
  name: '',
  itemType: '',
  description: '',
  parentId: null,
  active: true,
});

export const ITEM_GROUP_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'PURCHASABLE', label: 'Purchasable Item' },
  { value: 'CUSTOMER_SUPPLIED', label: 'Customer Supplied' },
  { value: 'MANUFACTURING', label: 'Manufacturing Item' },
];

export const itemTypeLabel = (t?: string): string => {
  switch ((t ?? '').toUpperCase()) {
    case 'SEMI_FG': case 'SFG': return 'Semi FG';
    case 'RAW_MATERIAL': case 'RM': return 'RM';
    case 'FG': return 'FG';
    case 'MANUFACTURING': case 'MANUFACTURING_ITEM': return 'Manufacturing Item';
    case 'PURCHASABLE': case 'PURCHASABLE_ITEM': return 'Purchasable Item';
    case 'CUSTOMER_SUPPLIED': case 'CUSTOMER_SUPPLIED_ITEM': return 'Customer Supplied';
    default: return t || '—';
  }
};
