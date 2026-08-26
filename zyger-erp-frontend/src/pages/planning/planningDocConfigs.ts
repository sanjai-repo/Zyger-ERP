export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  required?: boolean;
  span2?: boolean;
  readonly?: boolean;
}

export interface LineFieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  readonly?: boolean;
  required?: boolean;
}

export interface ColumnDef {
  label: string;
  field: string;
  numeric?: boolean;
}

export interface ChildGridConfig {
  title: string;
  parentIdField: string;
  apiPath: string;
  fields: LineFieldDef[];
}

export interface DocScreenConfig {
  docType: string;
  title: string;
  subtitle: string;
  columns: ColumnDef[];
  statusField: string;
  statusOptions: string[];
  typeFilter?: { field: string; label: string; options: string[] };
  fields: FieldDef[];
  lines?: {
    title: string;
    fields: LineFieldDef[];
    seed?: Record<string, string>[];
  };
  childGrids?: ChildGridConfig[];
  includeInactive?: boolean;
}

export const PRODUCTION_BOM_CONFIG: DocScreenConfig = {
  docType: 'production-bom',
  title: 'Production BOM',
  subtitle: 'Bill of Materials with multi-level sub-assembly support',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Revision', field: 'itemRevision' },
    { label: 'Version', field: 'bomVersion' },
    { label: 'Type', field: 'itemType' },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  fields: [
    { key: 'itemCode', label: 'Item Code *', type: 'text', required: true },
    { key: 'itemRevision', label: 'Revision', type: 'text', readonly: true },
    { key: 'revisionLabel', label: 'Revision Label', type: 'text', readonly: true },
    { key: 'bomVersion', label: 'Version', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'itemType', label: 'Item Type', type: 'select', options: ['FG', 'SEMI_FG', 'RM'], readonly: true },
    { key: 'bomType', label: 'BOM Type', type: 'select', options: ['Primary', 'Alternate'] },
    { key: 'salesOrderId', label: 'Sales Order ID', type: 'number' },
    { key: 'baseQuantity', label: 'Base Quantity', type: 'number' },
    { key: 'baseUom', label: 'UOM', type: 'text' },
    { key: 'weight', label: 'Total Weight (kg)', type: 'number' },
    { key: 'effectiveFrom', label: 'Effective From', type: 'date' },
    { key: 'effectiveTo', label: 'Effective To', type: 'date' },
    { key: 'previousRevisionId', label: 'Previous Revision BOM ID', type: 'number' },
    { key: 'parentBomId', label: 'Parent BOM ID', type: 'number' },
    { key: 'approvedBy', label: 'Approved By', type: 'text' },
    { key: 'releaseDate', label: 'Release Date', type: 'date' },
    { key: 'obsoleteDate', label: 'Obsolete Date', type: 'date' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'BOM Components',
    fields: [
      { key: 'lineNo', label: 'Line #', type: 'number' },
      { key: 'componentItemCode', label: 'Component Item *', type: 'text' },
      { key: 'componentRevision', label: 'Revision', type: 'text' },
      { key: 'quantityPer', label: 'Qty/Unit *', type: 'number' },
      { key: 'uom', label: 'UOM', type: 'text' },
      { key: 'componentType', label: 'Component Type', type: 'select', options: ['RAW_MATERIAL', 'SEMI_FG', 'FINISHED_GOOD'] },
      { key: 'bomLevel', label: 'BOM Level', type: 'text' },
      { key: 'weightPerQty', label: 'Weight/Unit (kg)', type: 'number' },
      { key: 'totalWeight', label: 'Total Weight (kg)', type: 'number' },
      { key: 'scrapPercentage', label: 'Scrap %', type: 'number' },
      { key: 'scrapPercent', label: 'Scrap % (alt)', type: 'number' },
      { key: 'yieldPercentage', label: 'Yield %', type: 'number' },
      { key: 'operationSequenceLink', label: 'Op Link', type: 'number' },
      { key: 'issueMethod', label: 'Issue Method', type: 'select', options: ['Manual', 'Backflush', 'Auto'] },
      { key: 'supplyType', label: 'Supply Type', type: 'select', options: ['Make', 'Buy', 'Subcontract'] },
      { key: 'isPhantom', label: 'Phantom', type: 'select', options: ['true', 'false'] },
      { key: 'childBomId', label: 'Child BOM ID', type: 'number' },
      { key: 'warehouse', label: 'Warehouse', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'select', options: ['true', 'false'] },
      { key: 'materialGrade', label: 'Material Grade', type: 'text' },
      { key: 'materialForm', label: 'Form', type: 'select', options: ['Round Bar', 'Plate', 'Casting', 'Forging', 'Sheet', 'Tube', 'Extrusion', 'Other'] },
      { key: 'diameter', label: 'Diameter (mm)', type: 'number' },
      { key: 'requiredLength', label: 'Req Length (mm)', type: 'number' },
      { key: 'requiredQty', label: 'Req Quantity', type: 'number' },
      { key: 'scrapAllowance', label: 'Scrap Allowance %', type: 'number' },
      { key: 'heatLotNumber', label: 'Heat/Lot No', type: 'text' },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ],
  },
};

export const ROUTE_SHEET_CONFIG: DocScreenConfig = {
  docType: 'route-sheet',
  title: 'Route Sheet',
  subtitle: 'Manufacturing operations sequence with work center assignments',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Type', field: 'itemType' },
    { label: 'Revision', field: 'itemRevision' },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'RELEASED', 'UNDER_REVISION', 'OBSOLETE'],
  fields: [
    { key: 'itemCode', label: 'Item *', type: 'text', required: true },
    { key: 'itemType', label: 'Item Type', type: 'text', readonly: true },
    { key: 'itemRevision', label: 'Revision *', type: 'text', required: true },
    { key: 'revisionLabel', label: 'Revision Label', type: 'text', readonly: true },
    { key: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'RELEASED', 'UNDER_REVISION', 'OBSOLETE'], readonly: true },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Operations',
    fields: [
      { key: 'sequenceNo', label: 'Seq # *', type: 'number', required: true },
      { key: 'processId', label: 'Process *', type: 'text', required: true },
      { key: 'processCode', label: 'Process Code', type: 'text', readonly: true },
      { key: 'resourceId', label: 'Resource', type: 'text' },
      { key: 'resourceType', label: 'Resource Type', type: 'text', readonly: true },
      { key: 'processType', label: 'Process Type', type: 'text', readonly: true },
      { key: 'setupTime', label: 'Setup (min) *', type: 'number', required: true },
      { key: 'cycleTime', label: 'Cycle (min) *', type: 'number', required: true },
      { key: 'inspectionRequired', label: 'QC Required *', type: 'select', options: ['Yes', 'No'], required: true },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ],
  },
  childGrids: [
    {
      title: 'Inspection Parameters',
      parentIdField: 'id',
      apiPath: '/v1/planning/route-operations/{parentId}/inspections',
      fields: [
        { key: 'parameterName', label: 'Parameter Name', type: 'text' },
        { key: 'parameterType', label: 'Type', type: 'select', options: ['Dimensional', 'Visual', 'Functional', 'Surface Finish', 'Hardness', 'Chemical', 'Other'] },
        { key: 'nominalValue', label: 'Nominal Value', type: 'text' },
        { key: 'tolerancePlus', label: 'Tolerance +', type: 'text' },
        { key: 'toleranceMinus', label: 'Tolerance -', type: 'text' },
        { key: 'method', label: 'Method', type: 'text' },
        { key: 'toolGauge', label: 'Tool/Gauge', type: 'text' },
        { key: 'frequency', label: 'Frequency', type: 'text' },
        { key: 'mandatory', label: 'Mandatory', type: 'select', options: ['true', 'false'] },
      ],
    },
  ],
};

export const WORK_ORDER_CONFIG: DocScreenConfig = {
  docType: 'work-order',
  title: 'Work Order',
  subtitle: 'Production work order with operation tracking and material requirements',
  columns: [
    { label: 'WO No', field: 'woNumber' },
    { label: 'Date', field: 'date' },
    { label: 'SO No', field: 'salesOrderNo' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Production Qty', field: 'productionQty', numeric: true },
    { label: 'Completed Qty', field: 'completedQty', numeric: true },
    { label: 'Balance Qty', field: 'balanceQty', numeric: true },
    { label: 'Priority', field: 'priority' },
    { label: 'Planned End', field: 'plannedEndDate' },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'RELEASED', 'IN_PROCESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'],
  fields: [
    { key: 'itemCode', label: 'Item Code *', type: 'text', required: true },
    { key: 'itemDescription', label: 'Item Description', type: 'text', readonly: true },
    { key: 'itemRevision', label: 'Revision', type: 'text', readonly: true },
    { key: 'drawingNumber', label: 'Drawing No', type: 'text', readonly: true },
    { key: 'drawingRev', label: 'Drawing Rev', type: 'text', readonly: true },
    { key: 'orderQuantity', label: 'Order Quantity *', type: 'number', required: true },
    { key: 'productionQty', label: 'Production Qty', type: 'number' },
    { key: 'releasedQty', label: 'Released Qty', type: 'number' },
    { key: 'completedQty', label: 'Completed Qty', type: 'number' },
    { key: 'rejectedQty', label: 'Rejected Qty', type: 'number' },
    { key: 'scrapQty', label: 'Scrap Qty', type: 'number' },
    { key: 'balanceQty', label: 'Balance Qty', type: 'number' },
    { key: 'pendingQty', label: 'Pending Qty', type: 'number', readonly: true },
    { key: 'fgReceiptQty', label: 'FG Receipt Qty', type: 'number' },
    { key: 'scrapAllowancePercent', label: 'Scrap Allowance %', type: 'number' },
    { key: 'uom', label: 'UOM', type: 'text' },
    { key: 'woType', label: 'WO Type', type: 'select', options: ['Production', 'Rework', 'Trial', 'Sample', 'Internal', 'Subcontract'] },
    { key: 'priority', label: 'Priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    { key: 'dueDate', label: 'Due Date *', type: 'date', required: true },
    { key: 'plannedStartDate', label: 'Planned Start *', type: 'date', required: true },
    { key: 'plannedEndDate', label: 'Planned End *', type: 'date', required: true },
    { key: 'actualStartDate', label: 'Actual Start', type: 'date' },
    { key: 'actualEndDate', label: 'Actual End', type: 'date' },
    { key: 'promisedDeliveryDate', label: 'Promised Delivery', type: 'date' },
    { key: 'batchLotNo', label: 'Batch/Lot No', type: 'text' },
    { key: 'bomId', label: 'BOM ID', type: 'select', options: [] },
    { key: 'bomRevision', label: 'BOM Revision', type: 'text' },
    { key: 'routeId', label: 'Route ID', type: 'select', options: [] },
    { key: 'routeRevision', label: 'Route Revision', type: 'text' },
    { key: 'plant', label: 'Plant', type: 'text' },
    { key: 'productionLine', label: 'Production Line', type: 'text' },
    { key: 'productionDepartment', label: 'Production Dept', type: 'text' },
    { key: 'customerCode', label: 'Customer', type: 'text' },
    { key: 'customerOrderNo', label: 'Customer Order No', type: 'text' },
    { key: 'sourceType', label: 'Source Type', type: 'select', options: ['Manual', 'Sales Order', 'Forecast'] },
    { key: 'sourceDocNo', label: 'Source Doc No', type: 'text' },
    { key: 'salesOrderId', label: 'Sales Order ID', type: 'number' },
    { key: 'salesOrderNo', label: 'Sales Order No', type: 'text' },
    { key: 'soLineId', label: 'SO Line ID', type: 'number' },
    { key: 'approvedBy', label: 'Approved By', type: 'text' },
    { key: 'releasedBy', label: 'Released By', type: 'text' },
    { key: 'startedBy', label: 'Started By', type: 'text' },
    { key: 'completedBy', label: 'Completed By', type: 'text' },
    { key: 'closedBy', label: 'Closed By', type: 'text' },
    { key: 'cancelReason', label: 'Cancel Reason', type: 'textarea' },
    { key: 'holdReason', label: 'Hold Reason', type: 'textarea' },
    { key: 'shortCloseReason', label: 'Short Close Reason', type: 'textarea' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Operations',
    fields: [
      { key: 'operationSequence', label: 'Seq # *', type: 'number' },
      { key: 'operationCode', label: 'Operation', type: 'text' },
      { key: 'operationDescription', label: 'Description', type: 'text' },
      { key: 'workCenterCode', label: 'Work Center', type: 'text' },
      { key: 'machineCode', label: 'Machine', type: 'text' },
      { key: 'plannedQuantity', label: 'Planned Qty', type: 'number' },
      { key: 'completedQuantity', label: 'Completed Qty', type: 'number' },
      { key: 'goodQuantity', label: 'Good Qty', type: 'number' },
      { key: 'scrapQuantity', label: 'Scrap Qty', type: 'number' },
      { key: 'reworkQuantity', label: 'Rework Qty', type: 'number' },
      { key: 'setupTimePlanned', label: 'Setup Planned', type: 'number' },
      { key: 'setupTimeActual', label: 'Setup Actual', type: 'number' },
      { key: 'cycleTimePlanned', label: 'Cycle Planned', type: 'number' },
      { key: 'cycleTimeActual', label: 'Cycle Actual', type: 'number' },
      { key: 'operator', label: 'Operator', type: 'text' },
      { key: 'ncProgramReference', label: 'NC Program', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'] },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ],
  },
};

export interface MaterialLineDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  readonly?: boolean;
}

export interface WorkOrderConfig extends DocScreenConfig {
  materialLines: {
    title: string;
    fields: MaterialLineDef[];
  };
}

export const WORK_ORDER_MATERIAL_FIELDS: MaterialLineDef[] = [
  { key: 'lineNo', label: 'Line #', type: 'number' },
  { key: 'componentItemCode', label: 'Component Item *', type: 'text' },
  { key: 'componentRevision', label: 'Revision', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'uom', label: 'UOM', type: 'text' },
  { key: 'requiredQuantity', label: 'Required Qty', type: 'number' },
  { key: 'issuedQuantity', label: 'Issued Qty', type: 'number' },
  { key: 'balanceQty', label: 'Balance Qty', type: 'number' },
  { key: 'returnedQuantity', label: 'Returned Qty', type: 'number' },
  { key: 'shortageQuantity', label: 'Shortage', type: 'number' },
  { key: 'requiredDate', label: 'Required Date', type: 'date' },
  { key: 'issueMethod', label: 'Issue Method', type: 'select', options: ['Manual', 'Backflush', 'Auto'] },
  { key: 'batchNumber', label: 'Batch No', type: 'text' },
  { key: 'warehouse', label: 'Warehouse', type: 'text' },
  { key: 'reservationStatus', label: 'Reservation', type: 'select', options: ['None', 'Reserved', 'Partial'] },
  { key: 'issueStatus', label: 'Issue Status', type: 'select', options: ['Pending', 'Issued', 'Partial'] },
  { key: 'remarks', label: 'Remarks', type: 'text' },
];

export const SHOP_FLOOR_ENTRY_CONFIG: DocScreenConfig = {
  docType: 'shop-floor-entry',
  title: 'Shop Floor Entry',
  subtitle: 'Record operator activity, machine time, and production quantities',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Work Order', field: 'workOrderNo' },
    { label: 'Operation', field: 'operationCode' },
    { label: 'Operator', field: 'operatorCode' },
    { label: 'Good Qty', field: 'goodQuantity', numeric: true },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED'],
  fields: [
    { key: 'workOrderNo', label: 'Work Order No *', type: 'text', required: true },
    { key: 'operationSequence', label: 'Operation Seq', type: 'number' },
    { key: 'operationCode', label: 'Operation Code', type: 'text' },
    { key: 'operatorCode', label: 'Operator *', type: 'text', required: true },
    { key: 'machineCode', label: 'Machine', type: 'text' },
    { key: 'startTime', label: 'Start Time', type: 'date' },
    { key: 'endTime', label: 'End Time', type: 'date' },
    { key: 'goodQuantity', label: 'Good Quantity', type: 'number' },
    { key: 'scrapQuantity', label: 'Scrap Quantity', type: 'number' },
    { key: 'reworkQuantity', label: 'Rework Quantity', type: 'number' },
    { key: 'inspectionResult', label: 'Inspection Result', type: 'select', options: ['PASS', 'FAIL', 'HOLD', 'PENDING'] },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
};
