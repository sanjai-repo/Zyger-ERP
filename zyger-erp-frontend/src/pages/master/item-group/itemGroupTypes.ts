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
  description: '',
  parentId: null,
  active: true,
});

export const ITEM_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RAW_MATERIAL', label: 'RM (Raw Material)' },
  { value: 'SEMI_FG', label: 'Semi FG' },
  { value: 'FG', label: 'FG (Finished Goods)' },
  { value: 'PURCHASABLE', label: 'Purchasable Item' },
  { value: 'CUSTOMER_SUPPLIED', label: 'Customer Supplied' },
];

export const itemTypeLabel = (t?: string): string => {
  switch ((t ?? '').toUpperCase()) {
    case 'SEMI_FG': case 'SFG': return 'Semi FG';
    case 'RAW_MATERIAL': case 'RM': return 'RM';
    case 'FG': return 'FG';
    case 'PURCHASABLE': return 'Purchasable';
    case 'CUSTOMER_SUPPLIED': return 'Customer Supplied';
    default: return t || '—';
  }
};
