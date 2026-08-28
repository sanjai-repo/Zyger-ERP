package in.zygertechnology.zygererp.doc;

import java.util.*;

/**
 * Central registry of every document type in the system.
 * Each document type maps to its own dedicated header/line tables and carries
 * the business rules used during posting (stock effect, numbering prefix,
 * ledger transaction type and the line quantity field).
 */
public final class DocTypes {

    public enum Effect { IN, OUT, ADJUST, NONE }

    public record DocDef(String key, String prefix, Effect effect, String tx,
                         String qtyField, boolean hasLines) {
    }

    private static final Map<String, DocDef> DEFS = new LinkedHashMap<>();

    private static void reg(String key, String prefix, Effect effect, String tx,
                            String qtyField, boolean hasLines) {
        DEFS.put(key, new DocDef(key, prefix, effect, tx, qtyField, hasLines));
    }

    static {
        reg("po-inward",              "POI", Effect.IN,     "PO_INWARD",              "receivedQty", true);
        reg("lo-inward",              "LOI", Effect.IN,     "LO_INWARD",              "receivedQty", true);
        reg("jo-inward",              "JOI", Effect.IN,     "JO_INWARD",              "producedQty", true);
        reg("general-inward",         "GI",  Effect.IN,     "GENERAL_INWARD",         "receivedQty", true);
        reg("return-inward",          "RI",  Effect.IN,     "RETURN_INWARD",          "returnedQty", true);
        reg("grn",                    "GRN", Effect.IN,     "GRN",                    "acceptedQty", true);
        reg("stock-issue-request",    "SIR", Effect.NONE,   "STOCK_ISSUE_REQUEST",    "requestedQty", true);
        reg("rm-issue",               "RMI", Effect.OUT,    "RM_ISSUE",               "issueQty", true);
        reg("general-issue",          "GEI", Effect.OUT,    "GENERAL_ISSUE",          "issueQty", true);
        reg("jo-dc-issue",            "JDI", Effect.OUT,    "JO_DC_ISSUE",            "issueQty", true);
        reg("issue-internal-external","IIE", Effect.OUT,    "ISSUE_INTERNAL_EXTERNAL","issueQty", true);
        reg("issue-against-receipt",  "IAR", Effect.OUT,    "ISSUE_AGAINST_RECEIPT",  "issueQty", true);
        reg("sales-dc",               "SDC", Effect.OUT,    "SALES_DC",               "qty", true);
        reg("jo-dc",                  "JOD", Effect.OUT,    "JO_DC",                  "qty", true);
        reg("general-dc",             "GDC", Effect.OUT,    "GENERAL_DC",             "qty", true);
        reg("return-dc",              "RDC", Effect.OUT,    "RETURN_DC",              "qty", true);
        reg("transfer-dc",            "TDC", Effect.OUT,    "TRANSFER_DC",            "qty", true);
        reg("purchase-invoice",       "PI",  Effect.NONE,   "PURCHASE_INVOICE",       null, false);
        reg("subcontract-invoice",    "SI",  Effect.NONE,   "SUBCONTRACT_INVOICE",    "processedQty", true);
        reg("inward-return",          "IRT", Effect.IN,     "INWARD_RETURN",          "returnedQty", true);
        reg("dc-return",              "DRT", Effect.IN,     "DC_RETURN",              "returnedQty", true);
        reg("invoice-return",         "IVT", Effect.IN,     "INVOICE_RETURN",         "returnedQty", true);
        reg("internal-return",        "INT", Effect.IN,     "INTERNAL_RETURN",        "returnedQty", true);
        reg("received-against-issue", "RAI", Effect.IN,     "RECEIVED_AGAINST_ISSUE", "returnedQty", true);
        reg("receipt-return",         "RCT", Effect.IN,     "RECEIPT_RETURN",         "returnedQty", true);
        reg("stock-allotment",        "SA",  Effect.NONE,   "STOCK_ALLOTMENT",        "allottedQty", true);
        reg("stock-release",          "SR",  Effect.OUT,    "STOCK_RELEASE",          "releasedQty", true);
        reg("stock-amendment",        "SAM", Effect.ADJUST, "STOCK_AMENDMENT",        null, false);
        reg("physical-stock-amendment","PSA",Effect.ADJUST, "PHYSICAL_STOCK_AMENDMENT","physicalQty", true);
        reg("quality-inspection",      "QI",  Effect.NONE,  "QUALITY_INSPECTION",     null, true);
        reg("quality-ncr",             "NCR", Effect.NONE,  "QUALITY_NCR",            null, true);
        reg("quality-concession",      "CON", Effect.NONE,  "QUALITY_CONCESSION",     null, false);
        reg("quality-test-certificate","TC",  Effect.NONE,  "QUALITY_TEST_CERTIFICATE", null, true);
        reg("quality-calibration-record","CAL",Effect.NONE, "QUALITY_CALIBRATION",    null, false);
        reg("quality-customer-complaint","CC",Effect.NONE,  "QUALITY_COMPLAINT",      null, false);
        reg("quality-capa",            "CAPA",Effect.NONE,  "QUALITY_CAPA",           null, false);
        reg("quality-8d",              "8D",  Effect.NONE,  "QUALITY_8D",             null, true);
        reg("quality-scar",            "SCAR",Effect.NONE,  "QUALITY_SCAR",           null, true);
        // Master data
        reg("customer",                "CUS", Effect.NONE,  "CUSTOMER",               null, false);
        reg("supplier",                "SUP", Effect.NONE,  "SUPPLIER",               null, false);
        reg("subcontractor",           "SUB", Effect.NONE,  "SUBCONTRACTOR",          null, false);
        reg("uom",                     "UOM", Effect.NONE,  "UOM",                    null, false);
        reg("item-group",              "IG",  Effect.NONE,  "ITEM_GROUP",             null, false);
        reg("process",                 "PRC", Effect.NONE,  "PROCESS",                null, false);
        reg("store",                   "STR", Effect.NONE,  "STORE",                  null, false);
        reg("rack",                    "RCK", Effect.NONE,  "RACK",                   null, false);
        reg("bin",                     "BIN", Effect.NONE,  "BIN",                    null, false);
        reg("process-group",           "PG",  Effect.NONE,  "PROCESS_GROUP",          null, false);
        reg("machine",                 "MAC", Effect.NONE,  "MACHINE",                null, false);
        reg("instrument",              "INS", Effect.NONE,  "INSTRUMENT",             null, false);
        reg("tool",                    "TOL", Effect.NONE,  "TOOL",                   null, false);
        reg("work-center",             "WC",  Effect.NONE,  "WORK_CENTER",            null, false);
        reg("operation",               "OP",  Effect.NONE,  "OPERATION",              null, false);
        reg("location",                "LOC", Effect.NONE,  "LOCATION",               null, false);
        reg("item-purchasable",        "ITM", Effect.NONE,  "ITEM_PURCHASABLE",       null, false);
        reg("item-customer",           "CSM", Effect.NONE,  "ITEM_CUSTOMER",          null, false);
        reg("item-manufacturing",      "MFG", Effect.NONE,  "ITEM_MANUFACTURING",     null, false);
        reg("csm",                     "CSM", Effect.NONE,  "CUSTOMER_SUPPLIED",      null, false);
        reg("mfg",                     "MFG", Effect.NONE,  "MANUFACTURING",          null, false);
        reg("itm",                     "ITM", Effect.NONE,  "PURCHASE_ITEM",          null, false);


        // Purchase module
        reg("purchase-request",         "PR",  Effect.NONE,  "PURCHASE_REQUEST",       null, true);
        reg("supplier-enquiry",         "SE",  Effect.NONE,  "SUPPLIER_ENQUIRY",       null, true);
        reg("supplier-quotation",       "SQ",  Effect.NONE,  "SUPPLIER_QUOTATION",     null, true);
        reg("purchase-order",           "PO",  Effect.NONE,  "PURCHASE_ORDER",         null, true);
        reg("job-order",                "JO",  Effect.NONE,  "JOB_ORDER",              null, true);
        reg("purchase-target",          "PT",  Effect.NONE,  "PURCHASE_TARGET",        null, false);
        reg("purchase-price-list",      "PPL", Effect.NONE,  "PURCHASE_PRICE_LIST",    null, false);
        reg("job-work-price-list",      "JWPL",Effect.NONE,  "JOB_WORK_PRICE_LIST",    null, false);
        // Sales module
        reg("sales-order",              "SO",   Effect.NONE,  "SALES_ORDER",            null, true);
        reg("proforma-invoice",         "PROF", Effect.NONE,  "PROFORMA_INVOICE",       null, true);
        reg("sales-invoice",            "SINV", Effect.NONE,  "SALES_INVOICE",          null, true);
        // Planning module
        reg("production-bom",            "BOM",  Effect.NONE,  "PRODUCTION_BOM",         null, true);
        reg("route-sheet",               "RT",   Effect.NONE,  "ROUTE_SHEET",            null, true);
        reg("work-order",                "WO",   Effect.NONE,  "WORK_ORDER",             null, true);
        reg("shop-floor-entry",          "SFE",  Effect.NONE,  "SHOP_FLOOR_ENTRY",       null, false);
    }

    private DocTypes() {}

    public static DocDef get(String key) {
        DocDef d = DEFS.get(key);
        if (d == null) throw new IllegalArgumentException("Unknown document type: " + key);
        return d;
    }

    public static boolean exists(String key) { return DEFS.containsKey(key); }

    public static Set<String> keys() { return Collections.unmodifiableSet(DEFS.keySet()); }

    public static Collection<DocDef> all() { return Collections.unmodifiableCollection(DEFS.values()); }
}
