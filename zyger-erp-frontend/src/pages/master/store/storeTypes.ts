export interface Store {
  id: number;
  code: string;
  name: string;
  description?: string;
  storeType?: string;
  department?: string;
  locationRef?: string;
  isQcHold: boolean;
  isWip: boolean;
  isFinished: boolean;
  isRaw: boolean;
  isScrap: boolean;
  isDispatch: boolean;
  binLocation?: string;
  capacity?: number;
  remarks?: string;
  active: boolean;
}

export const STORE_TYPES = [
  'Raw Material Store', 'WIP Store', 'Finished Goods Store', 'Tool Store',
  'Consumable Store', 'Spare Parts Store', 'Packing Material Store',
  'Quarantine Store', 'Rejection Store', 'Scrap Store', 'General Store',
  'Customer Material Store', 'Subcontractor Material Store', 'Dispatch Store',
];

export const defaultForm = (): Record<string, unknown> => ({
  code: '', name: '', storeType: '', department: '', locationRef: '',
  isQcHold: false, isWip: false, isFinished: false, isRaw: false,
  isScrap: false, isDispatch: false, binLocation: '', capacity: null,
  description: '', remarks: '', active: true,
});
