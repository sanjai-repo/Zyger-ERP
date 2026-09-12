import type { DeliveryChallanTypeConfig } from '../types/inventory/deliveryChallan.types';

export const JO_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'jo-dc',
  title: 'Job Order DC (JO DC)',
  prefix: 'JODC',
  icon: 'local_shipping',
  subtitle: 'Send / Receive goods for job work outside processing',
  apiPath: '/inventory/delivery-challan/jo-dc',
  transactionType: 'JO_ISSUE',
  partySource: 'suppliers',
  partyLabel: 'Job Worker',
};

export const GENERAL_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'general-dc',
  title: 'General DC',
  prefix: 'GDC',
  icon: 'local_shipping',
  subtitle: 'Dispatch goods to customer (sample/approval/sale)',
  apiPath: '/inventory/delivery-challan/general-dc',
  transactionType: 'DC_DISPATCH',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const TRANSFER_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'transfer-dc',
  title: 'Transfer DC',
  prefix: 'TDC',
  icon: 'local_shipping',
  subtitle: 'Move stock between internal branch/godown/plant locations',
  apiPath: '/inventory/delivery-challan/transfer-dc',
  transactionType: 'TRANSFER_OUT',
  partySource: 'suppliers',
  partyLabel: 'To Location / Branch',
};