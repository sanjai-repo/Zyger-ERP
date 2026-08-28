package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.Screen;
import in.zygertechnology.zygererp.repo.ScreenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Seeds the data-driven {@code screens} catalogue used by the User Control Panel.
 * Idempotent — only inserts entries whose {@code screen_key} is not yet present,
 * so adding a new module here automatically appears without schema changes.
 */
@Service
@RequiredArgsConstructor
public class ScreenSeedService {

    private final ScreenRepository screenRepo;

    // screenKey -> {name, module}
    // module drives RBAC translation in RbacService.perUserOverrideCodes().
    private static final Map<String, String[]> CATALOG = new LinkedHashMap<>();
    static {
        // Dashboard
        put("dashboard", "Dashboard", "DASHBOARD");

        // Master / inventory-config
        put("purchasable-item", "Purchasable Item", "MASTER");
        put("customer-supplied-item", "Customer Supplied Item", "MASTER");
        put("manufacturing-item", "Manufacturing Item", "MASTER");
        put("item-group-master", "Item Group", "MASTER");
        put("store-master", "Store Master", "MASTER");
        put("process-master", "Process", "MASTER");
        put("process-group-master", "Process Group", "MASTER");
        put("uom-master", "UOM", "MASTER");
        put("customer-list", "Customer List", "MASTER");
        put("supplier-list", "Supplier List", "MASTER");
        put("subcontractor-master", "Subcontractor List", "MASTER");
        put("bom-master", "Bill of Material (BOM)", "MASTER");
        put("machine-master", "Machine Master", "MASTER");
        put("instrument-master", "Instrument Master", "MASTER");
        put("tool-master", "Tools Master", "MASTER");
        put("company-info", "Company Info", "MASTER");
        put("numbering-config", "Numbering Config", "MASTER");
        put("plant-master", "Plant Master", "MASTER");
        put("work-center-master", "Work Centers", "MASTER");
        put("meter-master", "Meters", "MASTER");
        put("spare-part-master", "Spare Parts", "MASTER");
        put("sampling-plan", "Sampling Plans", "MASTER");
        put("inspection-plan", "Inspection Plans", "MASTER");
        put("oee", "OEE Dashboard", "MASTER");
        put("supplier-scorecard", "Supplier Scorecard", "MASTER");
        put("resource-master", "Resource Master", "MASTER");
        put("machine-costs", "Machine Costs (TCO)", "MASTER");

        // User management (admin module)
        put("user-management", "User Management", "ADMIN");

        // Sales
        put("sales-dashboard", "Sales Dashboard", "SALES");
        put("sales-order", "Sales Order", "SALES");
        put("proforma-invoice", "Proforma Invoice (PI)", "SALES");
        put("sales-sales-dc", "Sales DC", "SALES");
        put("sales-invoice", "Sales Invoice", "SALES");
        put("sales-schedule", "SO Schedule", "SALES");
        put("sales-dc-return", "DC Return", "SALES");
        put("sales-invoice-return", "Invoice Return", "SALES");

        // Purchase
        put("purchase-dashboard", "Purchase Dashboard", "PURCHASE");
        put("purchase-request", "Purchase Request", "PURCHASE");
        put("supplier-enquiry", "Supplier Enquiry", "PURCHASE");
        put("supplier-quotation", "Supplier Quotation", "PURCHASE");
        put("quotation-comparison", "Quotation Comparison", "PURCHASE");
        put("purchase-order", "Purchase Order (PO)", "PURCHASE");
        put("po-schedule", "PO Schedule", "PURCHASE");
        put("jo-schedule", "JO Schedule", "PURCHASE");
        put("job-order", "Job Order (JO)", "PURCHASE");
        put("purchase-target", "Purchase Target", "PURCHASE");

        // Inventory
        put("inward-entry", "Inward Entry", "INVENTORY");
        put("stock-issue-request", "Stock Issue Request", "INVENTORY");
        put("rm-issue", "RM Issue", "INVENTORY");
        put("general-issue", "General Issue", "INVENTORY");
        put("jo-dc-issue", "JO DC", "INVENTORY");
        put("issue-internal-external", "Issue Internal / External", "INVENTORY");
        put("issue-against-receipt", "Issue Against Receipt", "INVENTORY");
        put("sales-dc", "Sales DC", "INVENTORY");
        put("jo-dc", "JO DC", "INVENTORY");
        put("general-dc", "General DC", "INVENTORY");
        put("return-dc", "Return DC", "INVENTORY");
        put("transfer-dc", "Transfer DC", "INVENTORY");
        put("inward-return", "Inward Return", "INVENTORY");
        put("dc-return", "DC Return", "INVENTORY");
        put("invoice-return", "Invoice Return", "INVENTORY");
        put("internal-return", "Internal Return", "INVENTORY");
        put("received-against-issue", "Received Against Issue", "INVENTORY");
        put("receipt-return", "Receipt Return", "INVENTORY");
        put("stock-allotment", "Stock Allotment", "INVENTORY");
        put("stock-release", "Stock Release", "INVENTORY");
        put("stock-amendment", "Stock Amendment", "INVENTORY");
        put("physical-stock-amendment", "Physical Stock Amendment", "INVENTORY");
        put("grn", "Store Receipt (GRN)", "INVENTORY");

        // Planning
        put("planning-dashboard", "Planning Dashboard", "PLANNING");
        put("work-order", "Work Order", "PLANNING");
        put("production-bom", "Production BOM", "PLANNING");
        put("route-sheet", "Route Sheet", "PLANNING");
        put("material-planning", "Material Planning", "PLANNING");
        put("fg-possible", "FG Possible", "PLANNING");
        put("dispatch-plan", "Dispatch Plan", "PLANNING");
        put("machine-load", "Machine Load Plan", "PLANNING");
        put("machine-load-gantt", "Machine Load Gantt", "PLANNING");
        put("engineering-change", "Request (ECR)", "PLANNING");
        put("gap-analysis", "Gap Analysis", "PLANNING");
        put("cost-estimation", "Cost Estimation", "PLANNING");

        // Production
        put("production-dashboard", "Production Dashboard", "PRODUCTION");
        put("job-card", "Job Card", "PRODUCTION");
        put("job-card-kanban", "Job Card Kanban", "PRODUCTION");
        put("production-entry", "Production Entry", "PRODUCTION");
        put("product-conversion", "Product Conversion", "PRODUCTION");
        put("production-return", "Production Return", "PRODUCTION");
        put("production-log", "Production Log Sheet", "PRODUCTION");
        put("shop-floor-entry", "Shop Floor Entry", "PRODUCTION");
        put("idle-time", "Idle Time", "PRODUCTION");
        put("production-pending", "Production Pending", "PRODUCTION");

        // Quality
        put("inward-inspection-iqc", "Inward Inspection (IQC)", "QUALITY");
        put("lo-inspection", "LO Inspection", "QUALITY");
        put("jomin-inspection", "JOMIN Inspection", "QUALITY");
        put("process-inspection-ipqc", "Process Inspection (IPQC)", "QUALITY");
        put("first-inspection", "First Inspection (FAI)", "QUALITY");
        put("line-inspection", "Line Inspection", "QUALITY");
        put("last-off-inspection", "Last Off Inspection", "QUALITY");
        put("final-inspection", "Final Inspection", "QUALITY");
        put("inspection-pending", "Inspection Pending", "QUALITY");
        put("inward-test-certificate", "Inward Test Certificate", "QUALITY");
        put("internal-test-certificate", "Internal Test Certificate", "QUALITY");
        put("outward-test-certificate", "Outward Test Certificate", "QUALITY");
        put("concession-entry", "Concession Entry", "QUALITY");
        put("quality-ncr", "Non-Conformance Report", "QUALITY");
        put("customer-complaint", "Customer Complaint", "QUALITY");
        put("capa", "CAPA", "QUALITY");
        put("eight-d-report", "8D Report", "QUALITY");
        put("traceability", "Material Traceability", "QUALITY");
        put("quality-spc", "SPC Analytics", "QUALITY");
        put("calibration", "Calibration Instruments", "QUALITY");
        put("calibration-record", "Calibration Record", "QUALITY");

        // Maintenance
        put("maintenance-dashboard", "Maintenance Dashboard", "MAINTENANCE");
        put("maintenance-masters", "Masters", "MAINTENANCE");
        put("breakdown-intimation", "Breakdown Intimation", "MAINTENANCE");
        put("breakdown-rectification", "Breakdown Rectification", "MAINTENANCE");
        put("pm-plan", "PM Plan", "MAINTENANCE");
        put("pm-schedule", "PM Schedule", "MAINTENANCE");
        put("pm-completion", "PM Completion", "MAINTENANCE");
        put("tool-service-intimation", "Tool Service Intimation", "MAINTENANCE");
        put("tool-service-rectification", "Tool Service Rectification", "MAINTENANCE");
        put("calibration-schedule", "Calibration Schedule", "MAINTENANCE");
        put("calibration-entry", "Calibration Entry", "MAINTENANCE");
        put("power-consumption", "Power Consumption", "MAINTENANCE");
        put("water-consumption", "Water Consumption", "MAINTENANCE");
        put("rca", "Root Cause Analysis", "MAINTENANCE");
        put("maintenance-analysis-view", "Downtime / MTBF / MTTR", "MAINTENANCE");
        put("maintenance-reports", "Reports", "MAINTENANCE");
        put("downtime-cost-report", "Downtime & Cost Report", "MAINTENANCE");
        put("notification-log", "Notifications", "MAINTENANCE");

        // Reports
        put("reports", "Inventory Reports", "REPORTS");
        put("work-order-reports", "Work Order Reports", "REPORTS");
    }

    private static void put(String key, String name, String module) {
        CATALOG.put(key, new String[]{name, module});
    }

    @Transactional
    public void seed() {
        int order = 0;
        for (Map.Entry<String, String[]> e : CATALOG.entrySet()) {
            if (screenRepo.existsByScreenKey(e.getKey())) continue;
            String[] v = e.getValue();
            Screen s = Screen.builder()
                    .screenKey(e.getKey())
                    .screenName(v[0])
                    .module(v[1])
                    .sortOrder(order++)
                    .active(true)
                    .createdAt(Instant.now())
                    .createdBy("system-seed")
                    .build();
            screenRepo.save(s);
        }
    }
}
