// src/config/screenRegistry.tsx
import { lazy } from 'react';
import type { ComponentType } from 'react';
import ModulePlaceholder from '../components/common/ModulePlaceholder';
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const SalesDashboard = lazy(() => import('../pages/sales/dashboard/SalesDashboard'));
const PurchaseDashboard = lazy(() => import('../pages/purchase/dashboard/PurchaseDashboard'));
const PlanningDashboard = lazy(() => import('../pages/planning/dashboard/PlanningDashboard'));
const ProductionDashboard = lazy(() => import('../pages/production/dashboard/ProductionDashboard'));
const InwardEntryPage = lazy(() => import('../pages/inventory/inward/InwardEntryPage'));
const PoInwardPage = lazy(() => import('../pages/inventory/inward/po-inward/PoInwardPage'));
const GrnPage = lazy(() => import('../pages/inventory/store-receipt/grn/GrnPage'));
const StockIssueRequestPage = lazy(() => import('../pages/inventory/stock-issue/stock-issue-request/StockIssueRequestPage'));
const RmIssuePage = lazy(() => import('../pages/inventory/stock-issue/rm-issue/RmIssuePage'));
const GeneralIssuePage = lazy(() => import('../pages/inventory/stock-issue/general-issue/GeneralIssuePage'));
const JoDcIssuePage = lazy(() => import('../pages/inventory/stock-issue/jo-dc-issue/JoDcIssuePage'));
const IssueInternalExternalPage = lazy(() => import('../pages/inventory/stock-issue/issue-internal-external/IssueInternalExternalPage'));
const IssueAgainstReceiptPage = lazy(() => import('../pages/inventory/stock-issue/issue-against-receipt/IssueAgainstReceiptPage'));
const SalesDcPage = lazy(() => import('../pages/inventory/delivery-challan/sales-dc/SalesDcPage'));
const JoDcPage = lazy(() => import('../pages/inventory/delivery-challan/jo-dc/JoDcPage'));
const GeneralDcPage = lazy(() => import('../pages/inventory/delivery-challan/general-dc/GeneralDcPage'));
const ReturnDcPage = lazy(() => import('../pages/inventory/delivery-challan/return-dc/ReturnDcPage'));
const TransferDcPage = lazy(() => import('../pages/inventory/delivery-challan/transfer-dc/TransferDcPage'));
const PurchaseInvoicePage = lazy(() => import('../pages/inventory/supplier-invoice/purchase-invoice/PurchaseInvoicePage'));
const SubcontractInvoicePage = lazy(() => import('../pages/inventory/supplier-invoice/subcontract-invoice/SubcontractInvoicePage'));
const InwardReturnPage = lazy(() => import('../pages/inventory/return-management/inward-return/InwardReturnPage'));
const DcReturnPage = lazy(() => import('../pages/inventory/return-management/dc-return/DcReturnPage'));
const InvoiceReturnPage = lazy(() => import('../pages/inventory/return-management/invoice-return/InvoiceReturnPage'));
const InternalReturnPage = lazy(() => import('../pages/inventory/return-management/internal-return/InternalReturnPage'));
const ReceivedAgainstIssuePage = lazy(() => import('../pages/inventory/return-management/received-against-issue/ReceivedAgainstIssuePage'));
const ReceiptReturnPage = lazy(() => import('../pages/inventory/return-management/receipt-return/ReceiptReturnPage'));
const StockAllotmentPage = lazy(() => import('../pages/inventory/allotment/stock-allotment/StockAllotmentPage'));
const StockReleasePage = lazy(() => import('../pages/inventory/allotment/stock-release/StockReleasePage'));
const StockAmendmentPage = lazy(() => import('../pages/inventory/adjustment/stock-amendment/StockAmendmentPage'));
const PhysicalStockAmendmentPage = lazy(() => import('../pages/inventory/adjustment/physical-stock-amendment/PhysicalStockAmendmentPage'));
const InventoryReportsPage = lazy(() => import('../pages/inventory/reports/InventoryReportsPage'));
const InventoryLogPage = lazy(() => import('../pages/inventory/reports/InventoryLogPage'));
const CurrentStockPage = lazy(() => import('../pages/inventory/reports/CurrentStockPage'));
const QualityDashboard = lazy(() => import('../pages/quality/dashboard/QualityDashboard'));
const QualityPage = lazy(() => import('../pages/quality/inspection/QualityPage'));
const IqcInspectionPage = lazy(() => import('../pages/quality/inspection/IqcInspectionPage'));
const LoInspectionPage = lazy(() => import('../pages/quality/inspection/LoInspectionPage'));
const JominInspectionPage = lazy(() => import('../pages/quality/inspection/JominInspectionPage'));
const IpqcInspectionPage = lazy(() => import('../pages/quality/inspection/IpqcInspectionPage'));
const FaiInspectionPage = lazy(() => import('../pages/quality/inspection/FaiInspectionPage'));
const LineInspectionPage = lazy(() => import('../pages/quality/inspection/LineInspectionPage'));
const LastOffInspectionPage = lazy(() => import('../pages/quality/inspection/LastOffInspectionPage'));
const FinalInspectionPage = lazy(() => import('../pages/quality/inspection/FinalInspectionPage'));
const InspectionPendingPage = lazy(() => import('../pages/quality/pending/InspectionPendingPage'));
const CalibrationPage = lazy(() => import('../pages/quality/calibration/CalibrationPage'));
const CalibrationRecordPage = lazy(() => import('../pages/quality/calibration/CalibrationRecordPage'));
const NcrPage = lazy(() => import('../pages/quality/ncr/NcrPage'));
const PurchaseRequestPage = lazy(() => import('../pages/purchase/request/PurchaseRequestPage'));
const SupplierEnquiryPage = lazy(() => import('../pages/purchase/enquiry/SupplierEnquiryPage'));
const SupplierQuotationPage = lazy(() => import('../pages/purchase/quotation/SupplierQuotationPage'));
const QuotationComparisonPage = lazy(() => import('../pages/purchase/quotation/QuotationComparisonPage'));
const PurchaseOrderPage = lazy(() => import('../pages/purchase/order/PurchaseOrderPage'));
const PoSchedulePage = lazy(() => import('../pages/purchase/schedule/PoSchedulePage'));
const JoSchedulePage = lazy(() => import('../pages/purchase/schedule/JoSchedulePage'));
const JobOrderPage = lazy(() => import('../pages/purchase/job-order/JobOrderPage'));
const PurchaseTargetPage = lazy(() => import('../pages/purchase/target/PurchaseTargetPage'));
const PurchasePriceListPage = lazy(() => import('../pages/purchase/price-list/PurchasePriceListPage'));
const JobWorkPriceListPage = lazy(() => import('../pages/purchase/price-list/JobWorkPriceListPage'));
const SalesOrderPage = lazy(() => import('../pages/sales/order/SalesOrderPage'));
const ProformaInvoicePage = lazy(() => import('../pages/sales/proforma/ProformaInvoicePage'));
const SalesDcSalesPage = lazy(() => import('../pages/sales/dc/SalesDcSalesPage'));
const SalesInvoicePage = lazy(() => import('../pages/sales/invoice/SalesInvoicePage'));
const DcReturnSalesPage = lazy(() => import('../pages/sales/return/dc/DcReturnSalesPage'));
const InvoiceReturnSalesPage = lazy(() => import('../pages/sales/return/invoice/InvoiceReturnSalesPage'));
const SoSchedulePage = lazy(() => import('../pages/sales/schedule/SoSchedulePage'));
const ConcessionPage = lazy(() => import('../pages/quality/concession/ConcessionPage'));
const InwardTestCertificatePage = lazy(() => import('../pages/quality/certificate/InwardTestCertificatePage'));
const InternalTestCertificatePage = lazy(() => import('../pages/quality/certificate/InternalTestCertificatePage'));
const OutwardTestCertificatePage = lazy(() => import('../pages/quality/certificate/OutwardTestCertificatePage'));
const ComplaintPage = lazy(() => import('../pages/quality/complaint/ComplaintPage'));
const CapaPage = lazy(() => import('../pages/quality/capa/CapaPage'));
const EightDPage = lazy(() => import('../pages/quality/eight-d/EightDPage'));
const TraceabilityPage = lazy(() => import('../pages/quality/traceability/TraceabilityPage'));
const SpcPage = lazy(() => import('../pages/quality/SpcPage'));
const RouteSheetPage = lazy(() => import('../pages/planning/route/RouteSheetPage'));
const WorkOrderPage = lazy(() => import('../pages/planning/workorder/WorkOrderPage'));
const WorkOrderReportsScreen = lazy(() => import('../pages/planning/workorder/WorkOrderReportsScreen'));
const ShopFloorPage = lazy(() => import('../pages/planning/shopfloor/ShopFloorPage'));
const WorkCenterPage = lazy(() => import('../pages/planning/master/WorkCenterPage'));
const OperationPage = lazy(() => import('../pages/planning/master/OperationPage'));
const PartyMasterScreen = lazy(() => import('../pages/master/PartyMasterScreen'));
const LocationMasterScreen = lazy(() => import('../pages/master/LocationMasterScreen'));
const ItemMasterScreen = lazy(() => import('../pages/master/ItemMasterScreen'));
const MaterialPlanningScreen = lazy(() => import('../pages/planning/material-planning/MaterialPlanningScreen'));
const DispatchPlanScreen = lazy(() => import('../pages/planning/dispatch-plan/DispatchPlanScreen'));
const MachineLoadScreen = lazy(() => import('../pages/planning/machine-load/MachineLoadScreen'));
const MachineLoadGantt = lazy(() => import('../pages/planning/machine-load/MachineLoadGantt'));
const ResourceMasterScreen = lazy(() => import('../pages/master/resource/ResourceMasterScreen'));
const BomMasterScreen = lazy(() => import('../pages/master/bom/BomMasterScreen'));
const EcrScreen = lazy(() => import('../pages/planning/ecr/EcrScreen'));
const GapAnalysisScreen = lazy(() => import('../pages/planning/gap-analysis/GapAnalysisScreen'));
const CostEstimationScreen = lazy(() => import('../pages/planning/cost-estimation/CostEstimationScreen'));
const FgPossibleScreen = lazy(() => import('../pages/planning/fg-possible/FgPossibleScreen'));
const JobCardScreen = lazy(() => import('../pages/production/job-card/JobCardScreen'));
const JobCardKanban = lazy(() => import('../pages/production/kanban/JobCardKanban'));
const ProductionEntryScreen = lazy(() => import('../pages/production/production-entry/ProductionEntryScreen'));
const ProductConversionScreen = lazy(() => import('../pages/production/product-conversion/ProductConversionScreen'));
const ProductionReturnScreen = lazy(() => import('../pages/production/production-return/ProductionReturnScreen'));
const ProductionLogScreen = lazy(() => import('../pages/production/production-log/ProductionLogScreen'));
const IdleTimeScreen = lazy(() => import('../pages/production/idle-time/IdleTimeScreen'));
const ProductionPendingScreen = lazy(() => import('../pages/production/production-pending/ProductionPendingScreen'));
const MaintenanceDashboard = lazy(() => import('../pages/maintenance/dashboard/MaintenanceDashboard'));
const MaintenanceMastersPage = lazy(() => import('../pages/maintenance/masters/MaintenanceMastersPage'));
const BreakdownIntimationScreen = lazy(() => import('../pages/maintenance/breakdown/BreakdownIntimationScreen'));
const BreakdownRectificationScreen = lazy(() => import('../pages/maintenance/breakdown/BreakdownRectificationScreen'));
const PmPlanScreen = lazy(() => import('../pages/maintenance/pm/PmPlanScreen'));
const PmScheduleScreen = lazy(() => import('../pages/maintenance/pm/PmScheduleScreen'));
const PmCompletionScreen = lazy(() => import('../pages/maintenance/pm/PmCompletionScreen'));
const ToolServiceIntimationScreen = lazy(() => import('../pages/maintenance/tools/ToolServiceIntimationScreen'));
const ToolServiceRectificationScreen = lazy(() => import('../pages/maintenance/tools/ToolServiceRectificationScreen'));
const CalibrationScheduleScreen = lazy(() => import('../pages/maintenance/calibration/CalibrationScheduleScreen'));
const CalibrationEntryScreen = lazy(() => import('../pages/maintenance/calibration/CalibrationEntryScreen'));
const PowerConsumptionScreen = lazy(() => import('../pages/maintenance/utilities/PowerConsumptionScreen'));
const WaterConsumptionScreen = lazy(() => import('../pages/maintenance/utilities/WaterConsumptionScreen'));
const RootCauseAnalysisScreen = lazy(() => import('../pages/maintenance/analysis/RootCauseAnalysisScreen'));
const MaintenanceAnalysisScreen = lazy(() => import('../pages/maintenance/analysis/MaintenanceAnalysisScreen'));
const PmWorkOrderScreen = lazy(() => import('../pages/maintenance/pm/PmWorkOrderScreen'));
const SpareRequestScreen = lazy(() => import('../pages/maintenance/spare/SpareRequestScreen'));
const MaintenanceCostScreen = lazy(() => import('../pages/maintenance/cost/MaintenanceCostScreen'));
const MaintenanceReportsScreen = lazy(() => import('../pages/maintenance/reports/MaintenanceReportsScreen'));
const DowntimeCostReportPage = lazy(() => import('../pages/maintenance/reports/DowntimeCostReportPage'));
const NotificationLogPage = lazy(() => import('../pages/maintenance/notifications/NotificationLogPage'));
const CompanyInfoScreen = lazy(() => import('../pages/master/company-info/CompanyInfoScreen'));
const UOMScreen = lazy(() => import('../pages/master/uom/UOMScreen'));
const ItemGroupScreen = lazy(() => import('../pages/master/item-group/ItemGroupScreen'));
const StoreScreen = lazy(() => import('../pages/master/store/StoreScreen'));
const ProcessGroupScreen = lazy(() => import('../pages/master/process-group/ProcessGroupScreen'));
const ProcessScreen = lazy(() => import('../pages/master/process/ProcessScreen'));
const MachineScreen = lazy(() => import('../pages/master/machine/MachineScreen'));
const InstrumentScreen = lazy(() => import('../pages/master/instrument/InstrumentScreen'));
const ToolScreen = lazy(() => import('../pages/master/tool/ToolScreen'));
const SubcontractorScreen = lazy(() => import('../pages/master/subcontractor/SubcontractorScreen'));
const PurchasableItemScreen = lazy(() => import('../pages/master/items/purchasable/PurchasableItemScreen'));
const CustomerSuppliedItemScreen = lazy(() => import('../pages/master/items/customer-supplied/CustomerSuppliedItemScreen'));
const ManufacturingItemScreen = lazy(() => import('../pages/master/items/manufacturing/ManufacturingItemScreen'));
const CustomerListScreen = lazy(() => import('../pages/master/customers/CustomerListScreen'));
const SupplierListScreen = lazy(() => import('../pages/master/suppliers/SupplierListScreen'));
const UserScreen = lazy(() => import('../pages/master/users/UserScreen'));
const AccessControlPanel = lazy(() => import('../pages/admin/access/AccessControlPanel'));
const RackScreen = lazy(() => import('../pages/master/rack/RackScreen'));
const BinScreen = lazy(() => import('../pages/master/bin/BinScreen'));
const NumberingConfigPage = lazy(() => import('../pages/master/numbering-config/NumberingConfigPage'));
const PlantMasterPage = lazy(() => import('../pages/PlantMasterPage'));
const WorkCenterMasterPage = lazy(() => import('../pages/WorkCenterMasterPage'));
const SparePartMasterPage = lazy(() => import('../pages/SparePartMasterPage'));
const MeterMasterPage = lazy(() => import('../pages/MeterMasterPage'));
const SamplingPlanPage = lazy(() => import('../pages/SamplingPlanPage'));
const InspectionPlanPage = lazy(() => import('../pages/InspectionPlanPage'));
const OeePage = lazy(() => import('../pages/OeePage'));
const SupplierScorecardPage = lazy(() => import('../pages/quality/SupplierScorecardPage'));
const CostRollupPage = lazy(() => import('../pages/maintenance/CostRollupPage'));


export interface ScreenDefinition {
  component: ComponentType<any>;
}

export const SCREEN_REGISTRY: Record<string, ScreenDefinition> = {
  dashboard: { component: DashboardPage },
  'sales-dashboard': { component: SalesDashboard },
  'purchase-dashboard': { component: PurchaseDashboard },
  'planning-dashboard': { component: PlanningDashboard },
  'production-dashboard': { component: ProductionDashboard },
  'inward-entry': { component: InwardEntryPage },
  'po-inward': { component: PoInwardPage },
  grn: { component: GrnPage },
  'stock-issue-request': { component: StockIssueRequestPage },
  'rm-issue': { component: RmIssuePage },
  'general-issue': { component: GeneralIssuePage },
  'jo-dc-issue': { component: JoDcIssuePage },
  'issue-internal-external': { component: IssueInternalExternalPage },
  'issue-against-receipt': { component: IssueAgainstReceiptPage },
  'sales-dc': { component: SalesDcPage },
  'jo-dc': { component: JoDcPage },
  'general-dc': { component: GeneralDcPage },
  'return-dc': { component: ReturnDcPage },
  'transfer-dc': { component: TransferDcPage },
  'purchase-invoice': { component: PurchaseInvoicePage },
  'subcontract-invoice': { component: SubcontractInvoicePage },
  'inward-return': { component: InwardReturnPage },
  'dc-return': { component: DcReturnPage },
  'invoice-return': { component: InvoiceReturnPage },
  'internal-return': { component: InternalReturnPage },
  'received-against-issue': { component: ReceivedAgainstIssuePage },
  'receipt-return': { component: ReceiptReturnPage },
  'stock-allotment': { component: StockAllotmentPage },
  'stock-release': { component: StockReleasePage },
  'stock-amendment': { component: StockAmendmentPage },
  'physical-stock-amendment': { component: PhysicalStockAmendmentPage },
  reports: { component: InventoryReportsPage },
  'inventory-log': { component: InventoryLogPage },
  'current-stock': { component: CurrentStockPage },
  'quality-dashboard': { component: QualityDashboard },
  'quality-inspection': { component: QualityPage },
  'quality-ncr': { component: NcrPage },
  'inspection-pending': { component: InspectionPendingPage },
  'inward-inspection-iqc': { component: IqcInspectionPage },
  'lo-inspection': { component: LoInspectionPage },
  'jomin-inspection': { component: JominInspectionPage },
  'process-inspection-ipqc': { component: IpqcInspectionPage },
  'first-inspection': { component: FaiInspectionPage },
  'line-inspection': { component: LineInspectionPage },
  'last-off-inspection': { component: LastOffInspectionPage },
  'final-inspection': { component: FinalInspectionPage },
  'inward-test-certificate': { component: InwardTestCertificatePage },
  'internal-test-certificate': { component: InternalTestCertificatePage },
  'outward-test-certificate': { component: OutwardTestCertificatePage },
  'concession-entry': { component: ConcessionPage },
  'customer-complaint': { component: ComplaintPage },
  capa: { component: CapaPage },
  'eight-d-report': { component: EightDPage },
  traceability: { component: TraceabilityPage },
  'quality-spc': { component: SpcPage },
  calibration: { component: CalibrationPage },
  'calibration-record': { component: CalibrationRecordPage },
  'purchase-request': { component: PurchaseRequestPage },
  'supplier-enquiry': { component: SupplierEnquiryPage },
  'supplier-quotation': { component: SupplierQuotationPage },
  'quotation-comparison': { component: QuotationComparisonPage },
  'purchase-order': { component: PurchaseOrderPage },
  'po-schedule': { component: PoSchedulePage },
  'jo-schedule': { component: JoSchedulePage },
  'job-order': { component: JobOrderPage },
  'purchase-target': { component: PurchaseTargetPage },
  'purchase-price-list': { component: PurchasePriceListPage },
  'job-work-price-list': { component: JobWorkPriceListPage },
  'sales-order': { component: SalesOrderPage },
  'proforma-invoice': { component: ProformaInvoicePage },
  'sales-sales-dc': { component: SalesDcSalesPage },
  'sales-invoice': { component: SalesInvoicePage },
  'sales-schedule': { component: SoSchedulePage },
  'sales-dc-return': { component: DcReturnSalesPage },
  'sales-invoice-return': { component: InvoiceReturnSalesPage },
  'production-bom': { component: BomMasterScreen },
  'route-sheet': { component: RouteSheetPage },
  'work-order': { component: WorkOrderPage },
  'work-order-reports': { component: WorkOrderReportsScreen },
  'shop-floor-entry': { component: ShopFloorPage },
  'work-center': { component: WorkCenterPage },
  'machine-master': { component: MachineScreen },
  'operation-master': { component: OperationPage },
  'party-master': { component: PartyMasterScreen },
  'location-master': { component: LocationMasterScreen },
  'item-master': { component: ItemMasterScreen },
  'material-planning': { component: MaterialPlanningScreen },
  'dispatch-plan': { component: DispatchPlanScreen },
  'machine-load': { component: MachineLoadScreen },
  'machine-load-gantt': { component: MachineLoadGantt },
  'resource-master': { component: ResourceMasterScreen },
  'bom-master': { component: BomMasterScreen },
  'engineering-change': { component: EcrScreen },
  'gap-analysis': { component: GapAnalysisScreen },
  'cost-estimation': { component: CostEstimationScreen },
  'fg-possible': { component: FgPossibleScreen },
  'job-card': { component: JobCardScreen },
  'job-card-kanban': { component: JobCardKanban },
  'production-entry': { component: ProductionEntryScreen },
  'product-conversion': { component: ProductConversionScreen },
  'production-return': { component: ProductionReturnScreen },
  'production-log': { component: ProductionLogScreen },
  'idle-time': { component: IdleTimeScreen },
  'production-pending': { component: ProductionPendingScreen },
  'maintenance-dashboard': { component: MaintenanceDashboard },
  'maintenance-masters': { component: MaintenanceMastersPage },
  'breakdown-intimation': { component: BreakdownIntimationScreen },
  'breakdown-rectification': { component: BreakdownRectificationScreen },
  'pm-plan': { component: PmPlanScreen },
  'pm-schedule': { component: PmScheduleScreen },
  'pm-completion': { component: PmCompletionScreen },
  'pm-work-order': { component: PmWorkOrderScreen },
  'tool-service-intimation': { component: ToolServiceIntimationScreen },
  'tool-service-rectification': { component: ToolServiceRectificationScreen },
  'calibration-schedule': { component: CalibrationScheduleScreen },
  'calibration-entry': { component: CalibrationEntryScreen },
  'power-consumption': { component: PowerConsumptionScreen },
  'water-consumption': { component: WaterConsumptionScreen },
  'rca': { component: RootCauseAnalysisScreen },
  'maintenance-analysis-view': { component: MaintenanceAnalysisScreen },
  'maintenance-reports': { component: MaintenanceReportsScreen },
  'downtime-cost-report': { component: DowntimeCostReportPage },
  'notification-log': { component: NotificationLogPage },
  'spare-request': { component: SpareRequestScreen },
  'maintenance-cost': { component: MaintenanceCostScreen },
  'company-info': { component: CompanyInfoScreen },
  'uom-master': { component: UOMScreen },
  'item-group-master': { component: ItemGroupScreen },
  'store-master': { component: StoreScreen },
  'rack-master': { component: RackScreen },
  'bin-master': { component: BinScreen },
  'process-group-master': { component: ProcessGroupScreen },
  'process-master': { component: ProcessScreen },
  'instrument-master': { component: InstrumentScreen },
  'tool-master': { component: ToolScreen },
  'subcontractor-master': { component: SubcontractorScreen },
  'purchasable-item': { component: PurchasableItemScreen },
  'customer-supplied-item': { component: CustomerSuppliedItemScreen },
  'manufacturing-item': { component: ManufacturingItemScreen },
  'customer-list': { component: CustomerListScreen },
  'supplier-list': { component: SupplierListScreen },
  'user-management': { component: UserScreen },
  'access-control': { component: AccessControlPanel },
  'numbering-config': { component: NumberingConfigPage },
  'plant-master': { component: PlantMasterPage },
  'work-center-master': { component: WorkCenterMasterPage },
  'spare-part-master': { component: SparePartMasterPage },
  'meter-master': { component: MeterMasterPage },
  'sampling-plan': { component: SamplingPlanPage },
  'inspection-plan': { component: InspectionPlanPage },
  'oee': { component: OeePage },
  'supplier-scorecard': { component: SupplierScorecardPage },
  'machine-costs': { component: CostRollupPage },
};



export function getScreenComponent(screenId: string): ComponentType<any> {
  return SCREEN_REGISTRY[screenId]?.component ?? ModulePlaceholder;
}