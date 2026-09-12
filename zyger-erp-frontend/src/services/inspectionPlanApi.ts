import axiosClient from '../api/axiosClient';
import type { InspectionCharacteristic } from '../components/common/DynamicFormRenderer';

interface InspectionPlan {
  id: number;
  itemCode: string;
  drawingNumber?: string;
  drawingRevision?: string;
  operation?: string;
  inspectionType: string;
  aql: number;
  active: boolean;
  characteristics: InspectionCharacteristic[];
}

const inspectionPlanApi = {
  async getByItemAndType(itemCode: string, inspectionType: string): Promise<InspectionPlan | null> {
    try {
      const r = await axiosClient.get('/v2/master/inspection-plans', {
        params: { itemCode, inspectionType },
      });
      const plans = (r.data as InspectionPlan[]) || [];
      // Find best match: exact item + type, active first
      const match = plans.find(
        p => p.itemCode === itemCode && p.inspectionType === inspectionType && p.active
      ) || plans.find(
        p => p.itemCode === itemCode && p.active
      );
      return match || null;
    } catch {
      return null;
    }
  },

  async getAll(): Promise<InspectionPlan[]> {
    try {
      const r = await axiosClient.get('/v2/master/inspection-plans');
      return (r.data as InspectionPlan[]) || [];
    } catch {
      return [];
    }
  },

  async save(plan: Omit<InspectionPlan, 'id'> & { id?: number }): Promise<void> {
    if (plan.id) {
      await axiosClient.put(`/v2/master/inspection-plans/${plan.id}`, plan);
    } else {
      await axiosClient.post('/v2/master/inspection-plans', plan);
    }
  },
};

export default inspectionPlanApi;
export type { InspectionPlan };
