export interface UOM {
  id: number;
  code: string;
  name: string;
  description?: string;
  active: boolean;
}

export const defaultForm = (): Record<string, unknown> => ({
  code: '',
  name: '',
  description: '',
  active: true,
});

