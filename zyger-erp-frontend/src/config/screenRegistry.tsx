// src/config/screenRegistry.tsx
import type { ComponentType } from 'react';
import ModulePlaceholder from '../components/common/ModulePlaceholder';
import DashboardPage from '../pages/dashboard/DashboardPage';
import SalesDashboard from '../pages/sales/dashboard/SalesDashboard';
import PurchaseDashboard from '../pages/purchase/dashboard/PurchaseDashboard';
import PlanningDashboard from '../pages/planning/dashboard/PlanningDashboard';
import ProductionDashboard from '../pages/production/dashboard/ProductionDashboard';
import InwardEntryPage from '../pages/inventory/inward/InwardEntryPage';
import PoInwardPage from '../pages/inventory/inward/po-inward/PoInwardPage';
import GrnPage from '../pages/inventory/store-receipt/grn/GrnPage';
import StockIssueRequestPage from '../pages/inventory/stock-issue/stock-issue-request/StockIssueRequestPage';
import RmIssuePage from '../pages/inventory/stock-issue/rm-issue/RmIssuePage';
import GeneralIssuePage from '../pages/inventory/stock-issue/general-issue/GeneralIssuePage';
import JoDcIssuePage from '../pages/inventory/stock-issue/jo-dc-issue/JoDcIssuePage';
import IssueInternalExternalPage from '../pages/inventory/stock-issue/issue-internal-external/IssueInternalExternalPage';
import IssueAgainstReceiptPage from '../pages/inventory/stock-issue/issue-against-receipt/IssueAgainstReceiptPage';
import SalesDcPage from '../pages/inventory/delivery-challan/sales-dc/SalesDcPage';
import JoDcPage from '../pages/inventory/delivery-challan/jo-dc/JoDcPage';
import GeneralDcPage from '../pages/inventory/delivery-challan/general-dc/GeneralDcPage';
import ReturnDcPage from '../pages/inventory/delivery-challan/return-dc/ReturnDcPage';
import TransferDcPage from '../pages/inventory/delivery-challan/transfer-dc/TransferDcPage';
import PurchaseInvoicePage from '../pages/inventory/supplier-invoice/purchase-invoice/PurchaseInvoicePage';
import SubcontractInvoicePage from '../pages/inventory/supplier-invoice/subcontract-invoice/SubcontractInvoicePage';
import InwardReturnPage from '../pages/inventory/return-management/inward-return/InwardReturnPage';
import DcReturnPage from '../pages/inventory/return-management/dc-return/DcReturnPage';
import InvoiceReturnPage from '../pages/inventory/return-management/invoice-return/InvoiceReturnPage';
import InternalReturnPage from '../pages/inventory/return-management/internal-return/InternalReturnPage';
import ReceivedAgainstIssuePage from '../pages/inventory/return-management/received-against-issue/ReceivedAgainstIssuePage';
import ReceiptReturnPage from '../pages/inventory/return-management/receipt-return/ReceiptReturnPage';
import StockAllotmentPage from '../pages/inventory/allotment/stock-allotment/StockAllotmentPage';
import StockReleasePage from '../pages/inventory/allotment/stock-release/StockReleasePage';
import StockAmendmentPage from '../pages/inventory/adjustment/stock-amendment/StockAmendmentPage';
import PhysicalStockAmendmentPage from '../pages/inventory/adjustment/physical-stock-amendment/PhysicalStockAmendmentPage';
import InventoryReportsPage from '../pages/inventory/reports/InventoryReportsPage';
import InventoryLogPage from '../pages/inventory/reports/InventoryLogPage';
import CurrentStockPage from '../pages/inventory/reports/CurrentStockPage';
import QualityDashboard from '../pages/quality/dashboard/QualityDashboard';
import QualityPage from '../pages/quality/inspection/QualityPage';
import IqcInspectionPage from '../pages/quality/inspection/IqcInspectionPage';
import LoInspectionPage from '../pages/quality/inspection/LoInspectionPage';
import JominInspectionPage from '../pages/quality/inspection/JominInspectionPage';
import IpqcInspectionPage from '../pages/quality/inspection/IpqcInspectionPage';
import FaiInspectionPage from '../pages/quality/inspection/FaiInspectionPage';
import LineInspectionPage from '../pages/quality/inspection/LineInspectionPage';
import LastOffInspectionPage from '../pages/quality/inspection/LastOffInspectionPage';
import FinalInspectionPage from '../pages/quality/inspection/FinalInspectionPage';
import InspectionPendingPage from '../pages/quality/pending/InspectionPendingPage';
import CalibrationPage from '../pages/quality/calibration/CalibrationPage';
import CalibrationRecordPage from '../pages/quality/calibration/CalibrationRecordPage';
import NcrPage from '../pages/quality/ncr/NcrPage';
import PurchaseRequestPage from '../pages/purchase/request/PurchaseRequestPage';
import SupplierEnquiryPage from '../pages/purchase/enquiry/SupplierEnquiryPage';
import SupplierQuotationPage from '../pages/purchase/quotation/SupplierQuotationPage';
import QuotationComparisonPage from '../pages/purchase/quotation/QuotationComparisonPage';
import PurchaseOrderPage from '../pages/purchase/order/PurchaseOrderPage';
import PoSchedulePage from '../pages/purchase/schedule/PoSchedulePage';
import JoSchedulePage from '../pages/purchase/schedule/JoSchedulePage';
import JobOrderPage from '../pages/purchase/job-order/JobOrderPage';
import PurchaseTargetPage from '../pages/purchase/target/PurchaseTargetPage';
import PurchasePriceListPage from '../pages/purchase/price-list/PurchasePriceListPage';
import JobWorkPriceListPage from '../pages/purchase/price-list/JobWorkPriceListPage';
import SalesOrderPage from '../pages/sales/order/SalesOrderPage';
import ProformaInvoicePage from '../pages/sales/proforma/ProformaInvoicePage';
import SalesDcSalesPage from '../pages/sales/dc/SalesDcSalesPage';
import SalesInvoicePage from '../pages/sales/invoice/SalesInvoicePage';
import DcReturnSalesPage from '../pages/sales/return/dc/DcReturnSalesPage';
import InvoiceReturnSalesPage from '../pages/sales/return/invoice/InvoiceReturnSalesPage';
import SoSchedulePage from '../pages/sales/schedule/SoSchedulePage';
import ConcessionPage from '../pages/quality/concession/ConcessionPage';
import InwardTestCertificatePage from '../pages/quality/certificate/InwardTestCertificatePage';
import InternalTestCertificatePage from '../pages/quality/certificate/InternalTestCertificatePage';
import OutwardTestCertificatePage from '../pages/quality/certificate/OutwardTestCertificatePage';
import ComplaintPage from '../pages/quality/complaint/ComplaintPage';
import CapaPage from '../pages/quality/capa/CapaPage';
import EightDPage from '../pages/quality/eight-d/EightDPage';
import TraceabilityPage from '../pages/quality/traceability/TraceabilityPage';
import SpcPage from '../pages/quality/SpcPage';
import RouteSheetPage from '../pages/planning/route/RouteSheetPage';
import WorkOrderPage from '../pages/planning/workorder/WorkOrderPage';
import WorkOrderReportsScreen from '../pages/planning/workorder/WorkOrderReportsScreen';
import ShopFloorPage from '../pages/planning/shopfloor/ShopFloorPage';
import WorkCenterPage from '../pages/planning/master/WorkCenterPage';
import OperationPage from '../pages/planning/master/OperationPage';
import PartyMasterScreen from '../pages/master/PartyMasterScreen';
import LocationMasterScreen from '../pages/master/LocationMasterScreen';
import ItemMasterScreen from '../pages/master/ItemMasterScreen';
import MaterialPlanningScreen from '../pages/planning/material-planning/MaterialPlanningScreen';
import DispatchPlanScreen from '../pages/planning/dispatch-plan/DispatchPlanScreen';
import MachineLoadScreen from '../pages/planning/machine-load/MachineLoadScreen';
import MachineLoadGantt from '../pages/planning/machine-load/MachineLoadGantt';
import ResourceMasterScreen from '../pages/master/resource/ResourceMasterScreen';
import BomMasterScreen from '../pages/master/bom/BomMasterScreen';
import EcrScreen from '../pages/planning/ecr/EcrScreen';
import GapAnalysisScreen from '../pages/planning/gap-analysis/GapAnalysisScreen';
import CostEstimationScreen from '../pages/planning/cost-estimation/CostEstimationScreen';
import FgPossibleScreen from '../pages/planning/fg-possible/FgPossibleScreen';
import JobCardScreen from '../pages/production/job-card/JobCardScreen';
import JobCardKanban from '../pages/production/kanban/JobCardKanban';
import ProductionEntryScreen from '../pages/production/production-entry/ProductionEntryScreen';
import ProductConversionScreen from '../pages/production/product-conversion/ProductConversionScreen';
import ProductionReturnScreen from '../pages/production/production-return/ProductionReturnScreen';
import ProductionLogScreen from '../pages/production/production-log/ProductionLogScreen';
import IdleTimeScreen from '../pages/production/idle-time/IdleTimeScreen';
import ProductionPendingScreen from '../pages/production/production-pending/ProductionPendingScreen';
import MaintenanceDashboard from '../pages/maintenance/dashboard/MaintenanceDashboard';
import MaintenanceMastersPage from '../pages/maintenance/masters/MaintenanceMastersPage';
import BreakdownIntimationScreen from '../pages/maintenance/breakdown/BreakdownIntimationScreen';
import BreakdownRectificationScreen from '../pages/maintenance/breakdown/BreakdownRectificationScreen';
import PmPlanScreen from '../pages/maintenance/pm/PmPlanScreen';
import PmScheduleScreen from '../pages/maintenance/pm/PmScheduleScreen';
import PmCompletionScreen from '../pages/maintenance/pm/PmCompletionScreen';
import ToolServiceIntimationScreen from '../pages/maintenance/tools/ToolServiceIntimationScreen';
import ToolServiceRectificationScreen from '../pages/maintenance/tools/ToolServiceRectificationScreen';
import CalibrationScheduleScreen from '../pages/maintenance/calibration/CalibrationScheduleScreen';
import CalibrationEntryScreen from '../pages/maintenance/calibration/CalibrationEntryScreen';
import PowerConsumptionScreen from '../pages/maintenance/utilities/PowerConsumptionScreen';
import WaterConsumptionScreen from '../pages/maintenance/utilities/WaterConsumptionScreen';
import RootCauseAnalysisScreen from '../pages/maintenance/analysis/RootCauseAnalysisScreen';
import MaintenanceAnalysisScreen from '../pages/maintenance/analysis/MaintenanceAnalysisScreen';
import MaintenanceReportsScreen from '../pages/maintenance/reports/MaintenanceReportsScreen';
import DowntimeCostReportPage from '../pages/maintenance/reports/DowntimeCostReportPage';
import NotificationLogPage from '../pages/maintenance/notifications/NotificationLogPage';
import CompanyInfoScreen from '../pages/master/company-info/CompanyInfoScreen';
import UOMScreen from '../pages/master/uom/UOMScreen';
import ItemGroupScreen from '../pages/master/item-group/ItemGroupScreen';
import StoreScreen from '../pages/master/store/StoreScreen';
import ProcessGroupScreen from '../pages/master/process-group/ProcessGroupScreen';
import ProcessScreen from '../pages/master/process/ProcessScreen';
import MachineScreen from '../pages/master/machine/MachineScreen';
import InstrumentScreen from '../pages/master/instrument/InstrumentScreen';
import ToolScreen from '../pages/master/tool/ToolScreen';
import SubcontractorScreen from '../pages/master/subcontractor/SubcontractorScreen';
import PurchasableItemScreen from '../pages/master/items/purchasable/PurchasableItemScreen';
import CustomerSuppliedItemScreen from '../pages/master/items/customer-supplied/CustomerSuppliedItemScreen';
import ManufacturingItemScreen from '../pages/master/items/manufacturing/ManufacturingItemScreen';
import CustomerListScreen from '../pages/master/customers/CustomerListScreen';
import SupplierListScreen from '../pages/master/suppliers/SupplierListScreen';
import UserScreen from '../pages/master/users/UserScreen';
import AccessControlPanel from '../pages/admin/access/AccessControlPanel';
import RackScreen from '../pages/master/rack/RackScreen';
import BinScreen from '../pages/master/bin/BinScreen';
import NumberingConfigPage from '../pages/master/numbering-config/NumberingConfigPage';
import PlantMasterPage from '../pages/PlantMasterPage';
import WorkCenterMasterPage from '../pages/WorkCenterMasterPage';
import SparePartMasterPage from '../pages/SparePartMasterPage';
import MeterMasterPage from '../pages/MeterMasterPage';
import SamplingPlanPage from '../pages/SamplingPlanPage';
import InspectionPlanPage from '../pages/InspectionPlanPage';
import OeePage from '../pages/OeePage';
import SupplierScorecardPage from '../pages/quality/SupplierScorecardPage';
import CostRollupPage from '../pages/maintenance/CostRollupPage';


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
