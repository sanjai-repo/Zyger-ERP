package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.CompanyInfo;
import in.zygertechnology.zygererp.entity.ItemMaster;
import in.zygertechnology.zygererp.entity.Party;
import in.zygertechnology.zygererp.repo.CompanyInfoRepository;
import in.zygertechnology.zygererp.repo.ItemRepository;
import in.zygertechnology.zygererp.repo.PartyRepository;
import in.zygertechnology.zygererp.util.IndianNumberToWords;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renders Delivery Challans and Tax Invoices as print-ready HTML, replicating the
 * Sales-DC.html and sample.html reference layouts exactly. Served as {@code text/html}
 * to the frontend, which opens the page and triggers the browser print dialog, so the
 * output inherits all of the reference CSS (A4 portrait, print colors, repeated table
 * headers for multi-page item lists).
 */
@Service
public class PrintTemplateRenderer {

    private static final Logger log = LoggerFactory.getLogger(PrintTemplateRenderer.class);

    private static final Pattern TOKEN = Pattern.compile("\\{\\{(\\w+)}}");

    private static final Set<String> POSTED_STATUSES = Set.of(
            "POSTED", "CONFIRMED", "RECEIVED", "APPROVED", "READY_FOR_DISPATCH",
            "DISPATCHED", "DELIVERED", "PARTIALLY_DISPATCHED", "PAID", "PARTIALLY_PAID",
            "CLOSED", "FULLY_RECEIVED");

    /** Configurable default terms for Delivery Challans. */
    public static final String DEFAULT_DC_TERMS =
            "1. Goods received subject to inspection and approval by Quality Department.<br />\n" +
            "2. Discrepancies or damages must be notified within 2 working days of delivery.";

    /** Configurable default terms for Tax Invoices. Can be overridden per document. */
    public static final String DEFAULT_INVOICE_TERMS =
            "<li>Goods once sold will not be taken back or exchanged.</li>\n" +
            "<li>Our responsibility ceases once the goods leave our Godown.</li>\n" +
            "<li>Interest will be payable at 18% P.A. if the invoice is not paid within the credit period.</li>\n" +
            "<li>Payments are to be made by Cheque / Draft / NEFT / RTGS.</li>";

    private final CompanyInfoRepository companies;
    private final PartyRepository parties;
    private final ItemRepository items;

    private final String dcTemplate;
    private final String invoiceTemplate;
    private final String printCss;

    public PrintTemplateRenderer(CompanyInfoRepository companies, PartyRepository parties, ItemRepository items) {
        this.companies = companies;
        this.parties = parties;
        this.items = items;
        this.dcTemplate = load("print/delivery-challan.html");
        this.invoiceTemplate = load("print/sales-invoice.html");
        this.printCss = load("print/print.css");
    }

    private static String load(String path) {
        try (var in = PrintTemplateRenderer.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) throw new IllegalStateException("Print template resource not found: " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Could not load print template resource: " + path, e);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Public rendering entry points
    // ─────────────────────────────────────────────────────────────

    /** Builds the complete Delivery Challan HTML document (first copy). */
    public String deliveryChallan(Map<String, Object> doc, String type) {
        return deliveryChallan(doc, type, 0);
    }

    /**
     * Builds the complete Delivery Challan HTML document. {@code copyNumber} &le; 1 means the
     * first (original) copy; higher numbers render a "COPY N" strip. Un-posted documents get a
     * "DRAFT — NOT VALID FOR DISPATCH" strip.
     */
    public String deliveryChallan(Map<String, Object> doc, String type, int copyNumber) {
        var ci = company();
        String title = dcTitle(type);

        Map<String, String> t = new LinkedHashMap<>();
        t.put("title", esc(title));
        t.put("printCss", printCss);
        t.put("companyLogo", companyLogo(ci));
        t.put("companyName", esc(companyName(ci)));
        t.put("companyAddress", companyAddress(ci));
        t.put("companyContact", companyContact(ci));

        t.put("dcTitle", esc(title));
        t.put("docState", docState(doc, copyNumber));

        Map<String, Object> party = partyDetails(doc);
        t.put("consigneeLabel", esc(consigneeLabel(type)));
        t.put("partyName", esc((String) party.get("name")));
        t.put("partyAddress", partyAddressLine(doc, party));
        t.put("partyCodeLabel", esc(partyCodeLabel(type)));
        t.put("partyCode", esc((String) party.get("code")));
        t.put("ewayBillNo", esc(ewayBillNo(doc)));

        t.put("challanNo", esc(str(doc.get("docNo"))));
        t.put("challanDate", esc(formatDate(doc.get("docDate"), "-")));
        t.put("refDocLabel", esc(refDocLabel(type)));
        t.put("refDocNo", esc(refDocNo(doc)));
        t.put("refDocDateLabel", esc(refDocDateLabel(type)));
        t.put("refDocDate", esc(refDocDate(doc)));
        String transport = firstNonEmpty(val(doc, "modeOfTransport", "transportDetails", "transportMode"), val(doc, "transporter"));
        t.put("modeOfTransport", esc(transport));
        t.put("vehicleNo", esc(str(val(doc, "vehicleNo", "vehicleNumber", "vehicle"))));

        t.put("itemRows", buildDcItemRows(doc));
        t.put("totalQty", esc(totalQty(doc)));

        Object docTerms = doc.get("terms") != null ? doc.get("terms") : doc.get("termsAndConditions");
        t.put("termsHtml", docTerms != null ? nl2br(esc(str(docTerms))) : DEFAULT_DC_TERMS);
        t.put("signatureBlock", dcSignatureBlock(doc, party, ci));
        t.put("footerNote", esc("This is a Computer Generated " + title));

        return render(dcTemplate, t);
    }

    /** Builds the complete Tax Invoice HTML document (first copy). */
    public String salesInvoice(Map<String, Object> doc) {
        return salesInvoice(doc, 0);
    }

    /** Builds the complete Tax Invoice HTML document (see {@link #deliveryChallan} for copy semantics). */
    public String salesInvoice(Map<String, Object> doc, int copyNumber) {
        var ci = company();
        Map<String, Object> party = partyDetails(doc);

        InvoiceTotals totals = computeInvoiceTotals(doc);
        boolean interState = isInterState(doc, ci);

        Map<String, String> t = new LinkedHashMap<>();
        t.put("title", esc("Tax Invoice"));
        t.put("printCss", printCss);
        t.put("companyLogo", invoiceCompanyLogo(ci));

        String name = companyName(ci);
        t.put("companyName", esc(name.toUpperCase()));
        t.put("companyAddress", companyAddress(ci));
        t.put("companyGstinPan", companyGstinPan(ci));
        t.put("companyContact", companyContact(ci));
        t.put("qrCode", qrCode());
        t.put("docState", docState(doc, copyNumber));
        t.put("invoiceTitle", esc("Tax Invoice"));

        // Meta
        t.put("invoiceNo", esc(str(doc.get("docNo"))));
        t.put("invoiceDate", esc(formatDate(doc.get("docDate"), "/")));
        t.put("dcNo", esc(str(val(doc, "dcNo", "salesDcNumber", "dcNumber", "deliveryChallanNo"))));
        t.put("dcDate", esc(formatDate(val(doc, "dcDate", "dcDateRaw", "challanDate"), "/")));
        t.put("vendorCode", esc((String) party.get("code")));
        t.put("transportMode", esc(firstNonEmpty(val(doc, "transportDetails", "transportMode", "modeOfTransport"), val(doc, "transporter"))));
        t.put("vehicleNumber", esc(str(val(doc, "vehicleNo", "vehicleNumber", "vehicle"))));
        t.put("supplyDateTime", esc(supplyDateTime(doc)));
        t.put("placeOfSupply", esc(placeOfSupply(doc, party, ci)));
        t.put("paymentTerms", esc(str(val(doc, "paymentTerms", "paymentTerms2", "creditTerms"))));

        // E-Invoice
        String irn = validText(str(val(doc, "irnNo", "irn", "irnNumber"))) ? str(val(doc, "irnNo", "irn", "irnNumber")) : "";
        t.put("irnNo", esc(irn.isBlank() ? "-" : irn));
        String ackNo = str(val(doc, "ackNo", "ackNumber"));
        String ackDate = formatDate(val(doc, "ackDate", "acknowledgedDate"), "/");
        t.put("ackNoDate", esc(ackNo.isBlank() && ackDate.isBlank() ? "-" : firstNonEmpty(ackNo, ackDate) + joinPart(ackNo, ackDate)));
        String eway = str(ewayBillNo(doc));
        String ewayDate = formatDate(val(doc, "ewayBillDate", "ewayBillGeneratedDate"), "/");
        t.put("ewayBillNoDate", esc((eway.isBlank() ? "-" : eway) + joinPart(eway, ewayDate)));

        // Billed / Shipped
        t.put("billedCompany", esc((String) party.get("name")));
        t.put("billedContact", esc(partyContact(doc, party)));
        t.put("billedAddress", partyAddressLine(doc, party));
        t.put("billedGstin", esc(partyGstin(doc, party)));
        t.put("billedState", esc(partyState(doc, party)));
        t.put("billedPhone", esc(partyPhone(doc, party)));
        t.put("billedEmail", esc(partyEmail(doc, party)));

        String shipName = firstNonEmpty(val(doc, "consignee", "shipToName", "shippedTo"), (String) party.get("name"));
        Map<String, Object> shippingParty = new LinkedHashMap<>(party);
        shippingParty.put("name", shipName);
        t.put("shippedCompany", esc(shipName));
        t.put("shippedContact", esc(partyContact(doc, shippingParty)));
        t.put("shippedAddress", invoiceShippingAddress(doc, party));
        t.put("shippedGstin", esc(partyGstin(doc, shippingParty)));
        t.put("shippedState", esc(invoiceShippingState(doc, party)));
        t.put("shippedPhone", esc(partyPhone(doc, shippingParty)));
        t.put("shippedEmail", esc(partyEmail(doc, shippingParty)));

        // Items + summary
        t.put("itemRows", buildInvoiceItemRows(doc));
        t.put("taxableSubtotal", money(totals.taxable));
        t.put("taxRows", taxRows(totals, interState));
        t.put("roundOff", money(totals.roundOff));
        t.put("grandTotal", money(totals.grandRounded));
        t.put("totalAmountWords", esc(IndianNumberToWords.toWords(totals.grandRounded)));
        t.put("taxAmountWords", esc(IndianNumberToWords.toWords(totals.tax)));

        // Bank
        t.put("bankName", esc(ci != null && valid(ci.getBankName()) ? ci.getBankName() : "-"));
        t.put("accountName", esc(name));
        t.put("accountNo", esc(ci != null && valid(ci.getBankAccount()) ? ci.getBankAccount() : "-"));
        t.put("ifscCode", esc(ci != null && valid(ci.getBankIfsc()) ? ci.getBankIfsc() : "-"));
        t.put("branch", esc(ci != null && valid(ci.getBankBranch()) ? ci.getBankBranch() : "-"));

        Object docTerms = doc.get("terms") != null ? doc.get("terms") : doc.get("termsAndConditions");
        t.put("termsHtml", docTerms != null ? termItems(str(docTerms)) : DEFAULT_INVOICE_TERMS);

        t.put("authorizedFor", esc(name.isBlank() ? "For &nbsp;" : "For " + name.toUpperCase()));

        return render(invoiceTemplate, t);
    }

    // ─────────────────────────────────────────────────────────────
    // Company helpers
    // ─────────────────────────────────────────────────────────────

    private CompanyInfo company() {
        return companies.findById(1L).orElse(null);
    }

    private static String companyName(CompanyInfo ci) {
        if (ci == null) return "";
        return firstNonEmpty(ci.getPrintName(), ci.getCompanyName());
    }

    private String companyLogo(CompanyInfo ci) {
        String dataUri = logoDataUri(ci);
        if (dataUri == null) return "";
        return "                                <img src=\"" + dataUri + "\" alt=\"Company Logo\" class=\"logo-img\" />";
    }

    private String invoiceCompanyLogo(CompanyInfo ci) {
        String dataUri = logoDataUri(ci);
        if (dataUri == null) return "";
        return "                <img src=\"" + dataUri + "\" alt=\"Company Logo\" style=\"max-width: 90px; max-height: 55px; object-fit: contain;\" />";
    }

    private String logoDataUri(CompanyInfo ci) {
        if (ci == null) return null;
        String url = firstNonEmpty(ci.getCompanyLogoUrl(), ci.getLogoPath());
        if (url.isBlank()) return null;
        try {
            java.nio.file.Path p = url.startsWith("/") || url.startsWith(".") || url.startsWith("file:")
                    ? java.nio.file.Path.of(url.startsWith("file:") ? url.substring(5) : url)
                    : java.nio.file.Path.of("." + url);
            if (!java.nio.file.Files.exists(p)) return null;
            byte[] bytes = java.nio.file.Files.readAllBytes(p);
            String mime = url.toLowerCase().endsWith(".png") ? "image/png"
                    : url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg") ? "image/jpeg"
                    : url.toLowerCase().endsWith(".gif") ? "image/gif"
                    : url.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png";
            return "data:" + mime + ";base64," + java.util.Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            log.warn("Could not inline company logo for print: {}", e.getMessage());
            return null;
        }
    }

    private String companyAddress(CompanyInfo ci) {
        if (ci == null) return "";
        String registered = ci.getRegisteredAddress();
        if (validText(registered)) return nl2br(esc(registered));
        List<String> lines = nonEmpty(ci.getAddressLine1(), ci.getAddressLine2());
        String cityLine = String.join(", ", nonEmpty(ci.getCity(), ci.getState(), ci.getPincode()));
        if (!cityLine.isEmpty()) lines.add(cityLine);
        return String.join("<br />", lines.stream().map(s -> esc(s)).toList());
    }

    private String companyContact(CompanyInfo ci) {
        if (ci == null) return "";
        List<String> parts = new ArrayList<>();
        String phone = firstNonEmpty(ci.getMobile(), ci.getPhone());
        if (valid(phone)) parts.add("<b>Phone:</b> " + esc(phone));
        if (valid(ci.getEmail())) parts.add("<b>Email:</b> " + esc(ci.getEmail()));
        return String.join(" &nbsp;|&nbsp; ", parts);
    }

    private String companyGstinPan(CompanyInfo ci) {
        if (ci == null) return "";
        String gstin = gstinOf(ci);
        String pan = firstNonEmpty(ci.getPan(), ci.getPanNumber());
        List<String> parts = new ArrayList<>();
        if (valid(gstin)) parts.add("<span class=\"bold\">GSTIN:</span> " + esc(gstin));
        if (valid(pan)) parts.add("<span class=\"bold\">PAN:</span> " + esc(pan));
        return String.join(" &nbsp;|&nbsp; ", parts);
    }

    private static String gstinOf(CompanyInfo ci) {
        return firstNonEmpty(ci.getGstin(), ci.getGstNumber());
    }

    private String qrCode() {
        return "<div style=\"border: 1px solid #e2e8f0; padding: 3px; display: inline-block; border-radius: 4px;\">\n" +
                "                    <div style=\"width: 55px; height: 55px; font-size: 6.5px; color: #64748b; display: flex; align-items: center; justify-content: center; text-align: center;\">QR Code</div>\n" +
                "                </div>";
    }

    // ─────────────────────────────────────────────────────────────
    // Document state strip
    // ─────────────────────────────────────────────────────────────

    private String docState(Map<String, Object> doc, int copyNumber) {
        List<String> parts = new ArrayList<>();
        String status = str(doc.get("status"));
        if (!POSTED_STATUSES.contains(status.toUpperCase())) {
            parts.add("DRAFT — NOT VALID FOR DISPATCH");
        }
        if (Boolean.TRUE.equals(doc.get("invoiced"))) {
            parts.add("INVOICED — TAX INVOICE ISSUED");
        }
        if (copyNumber > 1) {
            parts.add(copyLabel(copyNumber));
        }
        if (parts.isEmpty()) return "";
        String text = String.join(" &nbsp;|&nbsp; ", parts).replace(" — ", " &#8212; ");
        return "<div class=\"doc-state\">" + text + "</div>";
    }

    private static String copyLabel(int copyNumber) {
        return switch (copyNumber) {
            case 2 -> "DUPLICATE";
            case 3 -> "TRIPLICATE";
            default -> "COPY " + copyNumber;
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Delivery Challan rendering helpers
    // ─────────────────────────────────────────────────────────────

    private static String dcTitle(String type) {
        return switch (String.valueOf(type)) {
            case "jo-dc" -> "Job Work Delivery Challan";
            case "return-dc" -> "Return Delivery Challan";
            case "transfer-dc" -> "Stock Transfer Challan";
            case "sales-dc" -> "Sales Delivery Challan";
            case "general-dc" -> "Delivery Challan";
            default -> "Delivery Challan";
        };
    }

    private static String consigneeLabel(String type) {
        return switch (String.valueOf(type)) {
            case "jo-dc" -> "Job Worker / Vendor:";
            case "transfer-dc" -> "Transfer To (Destination):";
            default -> "Delivered To / Consignee:";
        };
    }

    private static String partyCodeLabel(String type) {
        return switch (String.valueOf(type)) {
            case "sales-dc", "general-dc" -> "Customer Code";
            case "jo-dc" -> "Supplier / Vendor Code";
            case "transfer-dc" -> "Destination Code";
            default -> "Supplier / Vendor Code";
        };
    }

    private static String refDocLabel(String type) {
        return switch (String.valueOf(type)) {
            case "jo-dc" -> "Ref Job Order";
            case "transfer-dc" -> "Ref Transfer Request";
            case "sales-dc", "general-dc" -> "Ref Sales Order";
            default -> "Ref Purchase Order";
        };
    }

    private static String refDocDateLabel(String type) {
        return switch (String.valueOf(type)) {
            case "jo-dc" -> "Ref JO Date";
            case "transfer-dc" -> "Ref TR Date";
            case "sales-dc", "general-dc" -> "Ref SO Date";
            default -> "Ref PO Date";
        };
    }

private String refDocNo(Map<String, Object> doc) {
        return str(val(doc, "salesOrderNo", "salesOrderNumber", "linkedDocumentNo", "referenceNo",
                "jobOrderNo", "transferRequestNo", "purchaseOrderNo", "challanNo", "customerPoNumber"));
    }

    private String refDocDate(Map<String, Object> doc) {
        Object d = val(doc, "referenceDate", "dispatchDate", "salesOrderDate", "lrDate");
        return formatDate(d, "-");
    }

    private String ewayBillNo(Map<String, Object> doc) {
        return str(val(doc, "ewayBillNo", "ewayBillNumber", "ewayBillReference", "ewaybillNo", "ewayBill"));
    }

    private Map<String, Object> partyDetails(Map<String, Object> doc) {
        Map<String, Object> out = new LinkedHashMap<>();
        String name = firstNonEmpty(val(doc, "party"), val(doc, "customer"),
                val(doc, "supplier"), val(doc, "vendor"), val(doc, "partyName"));
        out.put("name", name);
        out.put("code", firstNonEmpty(val(doc, "customerCode"), val(doc, "supplierCode"),
                val(doc, "vendorCode"), val(doc, "partyCode"), val(doc, "code")));
        out.put("gstin", firstNonEmpty(val(doc, "gstin"), val(doc, "gstNumber"), val(doc, "partyGstin")));
        out.put("contactPerson", val(doc, "contactPerson", "contact"));
        out.put("phone", val(doc, "phone", "mobile", "phoneNumber"));
        out.put("email", val(doc, "email", "emailId"));
        out.put("state", val(doc, "state", "gstState", "placeOfSupply"));

        if (!name.isBlank()) {
            Optional<Party> p = parties.findByName(name);
            if (p.isPresent()) {
                Party pr = p.get();
                if (!valid((String) out.get("code"))) out.put("code", firstNonEmpty(pr.getCode(), pr.getCustomerType() == null ? "" : pr.getCustomerType()));
                if (!valid((String) out.get("gstin"))) out.put("gstin", firstNonEmpty(pr.getGstin(), pr.getGstNumber(), pr.getPanNumber()));
                if (!valid((String) out.get("contactPerson"))) out.put("contactPerson", pr.getContactPerson());
                if (!valid((String) out.get("phone"))) out.put("phone", firstNonEmpty(pr.getPhone(), pr.getMobile()));
                if (!valid((String) out.get("email"))) out.put("email", pr.getEmail());
                if (!valid((String) out.get("state"))) out.put("state", firstNonEmpty(pr.getGstState(), pr.getState()));
                out.put("billingAddress", firstNonEmpty(pr.getBillingAddress(), pr.getAddress()));
                out.put("shippingAddress", firstNonEmpty(pr.getShippingAddress(), pr.getAddress()));
            }
        }
        return out;
    }

    private static String partyAddressLine(Map<String, Object> doc, Map<String, Object> party) {
        String addr = firstNonEmpty(val(doc, "shippingAddress", "shipping", "deliveryAddress"),
                val(doc, "billingAddress", "address"),
                (String) party.get("shippingAddress"),
                (String) party.get("billingAddress"));
        if (validText(addr)) return nl2br(esc(addr));
        return "";
    }

    private String buildDcItemRows(Map<String, Object> doc) {
        StringBuilder sb = new StringBuilder();
        int index = 0;
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            index++;
            sb.append("                <tr>\n");
            sb.append("                    <td style=\"text-align: center; font-weight: 600;\">").append(index).append("</td>\n");
            sb.append("                    <td style=\"text-align: left; font-weight: 600; color: #0f172a;\">")
                    .append(esc(itemDescription(line))).append("</td>\n");
            sb.append("                    <td style=\"text-align: center;\">").append(esc(itemHsn(line))).append("</td>\n");
            sb.append("                    <td style=\"text-align: center;\">").append(esc(batchHeat(line))).append("</td>\n");
            sb.append("                    <td style=\"text-align: right; font-weight: bold; color: #0f172a;\">")
                    .append(esc(qtyText(line))).append("</td>\n");
            sb.append("                    <td style=\"text-align: left;\">")
                    .append(esc(firstNonEmpty(lineGet(line, "remarks"), lineGet(line, "lineRemark")))).append("</td>\n");
            sb.append("                </tr>\n");
        }
        if (sb.isEmpty()) {
            sb.append("                <tr><td colspan=\"6\" style=\"text-align: center; color: #94a3b8;\">No items</td></tr>\n");
        }
        return sb.toString();
    }

    private String totalQty(Map<String, Object> doc) {
        double total = 0;
        String unit = "";
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            total += bd(line.get("qty")).doubleValue();
            String u = firstNonEmpty(lineGet(line, "uom"), lineGet(line, "uomCode"));
            if (unit.isBlank()) unit = u;
            else if (!unit.equalsIgnoreCase(u)) unit = "Nos";
        }
        return num2(total) + " " + (unit.isBlank() ? "Nos" : unit);
    }

    private String dcSignatureBlock(Map<String, Object> doc, Map<String, Object> party, CompanyInfo ci) {
        String ourGstin = ci != null ? gstinOf(ci) : "";
        String ourPan = ci != null ? firstNonEmpty(ci.getPan(), ci.getPanNumber()) : "";
        String partyGstin = (String) party.get("gstin");
        String partyPan = "";

        StringBuilder sb = new StringBuilder();
        // Tax info cell
        sb.append("                <tr>\n");
        sb.append("                    <!-- TAX INFO -->\n");
        sb.append("                    <td style=\"width: 34%;\" class=\"border-right sig-block\">\n");
        sb.append("                        <div style=\"line-height: 1.6; color: #334155;\">\n");
        sb.append("                            <b>SUPPLIER GSTIN:</b> ").append(esc(ourGstin.isBlank() ? "-" : ourGstin)).append("<br />\n");
        sb.append("                            <b>SUPPLIER PAN:</b> ").append(esc(ourPan.isBlank() ? "-" : ourPan)).append("<br />\n");
        sb.append("                            <b>BUYER GSTIN:</b> ").append(esc(partyGstin.isBlank() ? "-" : partyGstin)).append("<br />\n");
        sb.append("                            <b>BUYER PAN:</b> ").append(esc(partyPan.isBlank() ? "-" : partyPan)).append("\n");
        sb.append("                        </div>\n");
        sb.append("                    </td>\n");

        // Receiver signature cell
        sb.append("                    <!-- RECEIVER SIGNATURE -->\n");
        sb.append("                    <td style=\"width: 33%; text-align: center;\" class=\"border-right sig-block\">\n");
        sb.append("                        <div style=\"font-weight: 700; color: #0f172a;\">Received Items in Good Condition</div>\n");
        sb.append("                        <div style=\"height: 40px;\"></div>\n");
        sb.append("                        <div style=\"font-weight: 700; color: #334155;\">Receiver's Signatory</div>\n");
        sb.append("                    </td>\n");

        // Authorised signature cell
        String companyName = ci != null ? companyName(ci) : "";
        sb.append("                    <!-- AUTHORISED SIGNATURE -->\n");
        sb.append("                    <td style=\"width: 33%; text-align: center;\" class=\"sig-block\">\n");
        sb.append("                        <div style=\"font-weight: 700; color: #0f172a;\">For ").append(esc(companyName)).append("</div>\n");
        sb.append("                        <div style=\"height: 40px;\"></div>\n");
        sb.append("                        <div style=\"font-weight: 700; color: #334155;\">Authorised Signatory</div>\n");
        sb.append("                    </td>\n");
        sb.append("                </tr>\n");
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────
    // Sales Invoice rendering helpers
    // ─────────────────────────────────────────────────────────────

    private String buildInvoiceItemRows(Map<String, Object> doc) {
        StringBuilder sb = new StringBuilder();
        List<Map<String, Object>> all = lines(doc);
        int index = 0;
        for (Map<String, Object> line : all) {
            index++;
            String desc = itemDescription(line);
            String itemCode = lineGet(line, "itemCode");
            String partCode = firstNonEmpty(lineGet(line, "customerPartNumber"), lineGet(line, "partNumber"));
            String sub = partCode.isBlank() ? (itemCode.isBlank() ? "" : "Item Code: " + itemCode)
                    : "Part Code: " + partCode;

            sb.append("        <tr>\n");
            sb.append("            <td class=\"text-center\">").append(index).append("</td>\n");
            sb.append("            <td class=\"text-left\">\n");
            sb.append("                <span class=\"bold\">").append(esc(desc)).append("</span><br />\n");
            sb.append("                <span class=\"text-muted\" style=\"font-size: 8.5px;\">").append(esc(sub)).append("</span>\n");
            sb.append("            </td>\n");
            sb.append("            <td class=\"text-center\">").append(esc(itemHsn(line))).append("</td>\n");
            sb.append("            <td class=\"text-right bold\">").append(num2(bd(line.get("qty")).doubleValue())).append("</td>\n");
            sb.append("            <td class=\"text-center\">").append(esc(firstNonEmpty(lineGet(line, "uom"), "NOS"))).append("</td>\n");
            sb.append("            <td class=\"text-right\">").append(money(line.get("unitPrice"))).append("</td>\n");
            sb.append("            <td class=\"text-right\">").append(esc(taxPctText(line))).append("</td>\n");
            BigDecimal net = line.get("netAmount") != null ? bd(line.get("netAmount"))
                    : bd(line.get("amount"));
            sb.append("            <td class=\"text-right bold\">").append(money(net)).append("</td>\n");
            sb.append("        </tr>\n");
        }
        // Pad to match the reference sheet's short-table look.
        boolean pad = true;
        while (pad && (index + (int) all.stream().filter(m -> m.get("qty") == null).count()) < 4) {
            index++;
            sb.append(padRow());
            if (index >= 4) pad = false;
        }
        if (all.isEmpty()) {
            for (int i = 0; i < 3; i++) sb.append(padRow());
        }
        return sb.toString();
    }

    private static String padRow() {
        return "        <tr>\n"
                + "            <td class=\"text-center\">&nbsp;</td>\n"
                + "            <td class=\"text-left\"><span class=\"bold\"></span><br /><span class=\"text-muted\" style=\"font-size: 8.5px;\"></span></td>\n"
                + "            <td class=\"text-center\"></td>\n"
                + "            <td class=\"text-right bold\"></td>\n"
                + "            <td class=\"text-center\"></td>\n"
                + "            <td class=\"text-right\"></td>\n"
                + "            <td class=\"text-right\"></td>\n"
                + "            <td class=\"text-right bold\"></td>\n"
                + "        </tr>\n";
    }

    private static String taxPctText(Map<String, Object> line) {
        Object t = line.get("tax");
        if (t != null) {
            try {
                double rate = Double.parseDouble(String.valueOf(t));
                if (rate <= 0) return "Exempt";
                return (rate == Math.floor(rate) ? String.valueOf((long) rate) : num2(rate)) + "%";
            } catch (NumberFormatException ignored) {
                // fall through to taxCode
            }
        }
        String taxCode = str(line.get("taxCode"));
        return taxCode.isBlank() ? "-" : taxCode;
    }

    private static String joinPart(String a, String b) {
        if (b.isBlank()) return "";
        return " &nbsp;|&nbsp; " + b;
    }

    private static String supplyDateTime(Map<String, Object> doc) {
        Object raw = val(doc, "supplyDateTime", "supplyDate", "dispatchDate", "docDate");
        String s = str(raw);
        if (s.isBlank()) return "";
        String date = s.length() > 10 ? s.substring(0, 10) : s;
        String time = s.length() > 10 ? s.substring(11).trim() : "";
        String datePart = formatDate(date, "/");
        if (time.isBlank()) return datePart;
        try {
            String t = time.length() >= 5 ? time.substring(0, 5) : time;
            int hh = Integer.parseInt(t.substring(0, 2));
            String ampm = hh >= 12 ? "PM" : "AM";
            int h12 = hh % 12 == 0 ? 12 : hh % 12;
            return datePart + " -- " + String.format("%02d", h12) + t.substring(2) + " " + ampm;
        } catch (Exception e) {
            return datePart;
        }
    }

    private static boolean isInterState(Map<String, Object> doc, CompanyInfo ci) {
        String ourCode = companyStateCode(ci);
        String theirCode = partyStateCode(doc);
        if (ourCode.isBlank() || theirCode.isBlank()) return false;
        return !ourCode.equals(theirCode);
    }

    private static String companyStateCode(CompanyInfo ci) {
        if (ci == null) return "";
        String gstin = gstinOf(ci);
        if (stateCodeFromGstin(gstin).isPresent()) return stateCodeFromGstin(gstin).get();
        return "";
    }

    private static String partyStateCode(Map<String, Object> doc) {
        String gstin = str(val(doc, "gstin", "gstNumber", "partyGstin"));
        if (stateCodeFromGstin(gstin).isPresent()) return stateCodeFromGstin(gstin).get();
        return str(doc.get("state")).isBlank() ? "" : str(doc.get("state"));
    }

    private static Optional<String> stateCodeFromGstin(String gstin) {
        if (gstin != null && gstin.length() >= 2 && Character.isDigit(gstin.charAt(0)) && Character.isDigit(gstin.charAt(1))) {
            return Optional.of(gstin.substring(0, 2));
        }
        return Optional.empty();
    }

    private static String placeOfSupply(Map<String, Object> doc, Map<String, Object> party, CompanyInfo ci) {
        String state = firstNonEmpty(val(doc, "placeOfSupply"), val(doc, "state"),
                val(doc, "gstState"), (String) party.get("state"));
        if (!valid(state)) state = (String) party.get("name");
        String gstin = firstNonEmpty(val(doc, "gstin"), val(doc, "gstNumber"), (String) party.get("gstin"));
        Optional<String> code = stateCodeFromGstin(gstin);
        if (code.isPresent()) {
            return state.isBlank() ? "State (Code: " + code.get() + ")" : state + " (Code: " + code.get() + ")";
        }
        return state.isBlank() ? "-" : state;
    }

    private static String partyGstin(Map<String, Object> doc, Map<String, Object> party) {
        return (String) party.get("gstin");
    }

    private static String partyContact(Map<String, Object> doc, Map<String, Object> party) {
        return (String) party.get("contactPerson");
    }

    private static String partyPhone(Map<String, Object> doc, Map<String, Object> party) {
        return (String) party.get("phone");
    }

    private static String partyEmail(Map<String, Object> doc, Map<String, Object> party) {
        return (String) party.get("email");
    }

    private static String partyState(Map<String, Object> doc, Map<String, Object> party) {
        String state = (String) party.get("state");
        String gstin = (String) party.get("gstin");
        Optional<String> code = stateCodeFromGstin(gstin);
        if (code.isPresent()) {
            return state.isBlank() ? "State (Code: " + code.get() + ")" : state + " (Code: " + code.get() + ")";
        }
        return state.isBlank() ? "-" : state;
    }

    private static String invoiceShippingAddress(Map<String, Object> doc, Map<String, Object> party) {
        return partyAddressLine(doc, party);
    }

    private static String invoiceShippingState(Map<String, Object> doc, Map<String, Object> party) {
        return partyState(doc, party);
    }

    private String taxRows(InvoiceTotals totals, boolean interState) {
        StringBuilder sb = new StringBuilder();
        if (totals.tax.compareTo(BigDecimal.ZERO) <= 0) return sb.toString();
        double rate = totals.maxRate;
        if (interState) {
            sb.append("                    <tr>\n");
            sb.append("                        <td class=\"text-right kv-label\">IGST @ ").append(ratePct(rate)).append("%:</td>\n");
            sb.append("                        <td class=\"text-right\">").append(money(totals.tax)).append("</td>\n");
            sb.append("                    </tr>\n");
        } else {
            sb.append("                    <tr>\n");
            sb.append("                        <td class=\"text-right kv-label\">CGST @ ").append(ratePct(rate / 2)).append("%:</td>\n");
            sb.append("                        <td class=\"text-right\">").append(money(totals.cgst)).append("</td>\n");
            sb.append("                    </tr>\n");
            sb.append("                    <tr>\n");
            sb.append("                        <td class=\"text-right kv-label\">SGST @ ").append(ratePct(rate / 2)).append("%:</td>\n");
            sb.append("                        <td class=\"text-right\">").append(money(totals.sgst)).append("</td>\n");
            sb.append("                    </tr>\n");
        }
        return sb.toString();
    }

    private static String ratePct(double rate) {
        if (rate == Math.floor(rate)) return String.valueOf((long) rate);
        return num2(rate);
    }

    private static final class InvoiceTotals {
        BigDecimal taxable = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal cgst = BigDecimal.ZERO;
        BigDecimal sgst = BigDecimal.ZERO;
        BigDecimal grand = BigDecimal.ZERO;
        BigDecimal grandRounded = BigDecimal.ZERO;
        BigDecimal roundOff = BigDecimal.ZERO;
        double maxRate = 0;
    }

    private InvoiceTotals computeInvoiceTotals(Map<String, Object> doc) {
        InvoiceTotals t = new InvoiceTotals();
        CompanyInfo ci = company();
        boolean interState = isInterState(doc, ci);

        for (Map<String, Object> line : lines(doc)) {
            BigDecimal qty = bd(line.get("qty"));
            BigDecimal rate = bd(line.get("unitPrice"));
            BigDecimal taxRate = bd(line.get("tax"));
            BigDecimal discount = bd(line.get("discount"));
            BigDecimal gross = qty.multiply(rate);
            BigDecimal discAmt = gross.multiply(discount).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal lineTaxable = gross.subtract(discAmt);
            BigDecimal lineTax = line.get("taxAmount") != null ? bd(line.get("taxAmount"))
                    : lineTaxable.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal net = line.get("netAmount") != null ? bd(line.get("netAmount"))
                    : lineTaxable.add(lineTax);

            t.taxable = t.taxable.add(lineTaxable);
            t.tax = t.tax.add(lineTax);
            t.grand = t.grand.add(net);
            if (taxRate.compareTo(BigDecimal.valueOf(t.maxRate)) > 0) t.maxRate = taxRate.doubleValue();

            if (lineTax.compareTo(BigDecimal.ZERO) > 0) {
                if (interState) {
                    // IGST already included in t.tax
                } else {
                    BigDecimal half = lineTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    t.cgst = t.cgst.add(half);
                    t.sgst = t.sgst.add(lineTax.subtract(half));
                }
            }
        }
        t.grandRounded = t.grand.setScale(0, RoundingMode.HALF_UP);
        t.roundOff = t.grandRounded.subtract(t.grand);
        return t;
    }

    // ─────────────────────────────────────────────────────────────
    // Shared line helpers
    // ─────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> lines(Map<String, Object> doc) {
        Object l = doc.get("lines");
        if (l instanceof List<?> list) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object o : list) {
                if (o instanceof Map<?, ?> m) {
                    Map<String, Object> mm = new LinkedHashMap<>();
                    for (Map.Entry<?, ?> e : m.entrySet()) mm.put(String.valueOf(e.getKey()), e.getValue());
                    out.add(mm);
                }
            }
            return out;
        }
        return List.of();
    }

    private static String lineGet(Map<String, Object> line, String key) {
        Object v = line.get(key);
        return v == null ? "" : String.valueOf(v);
    }

    private String itemDescription(Map<String, Object> line) {
        return firstNonEmpty(lineGet(line, "itemDesc"), lineGet(line, "itemName"),
                lineGet(line, "description"), lineGet(line, "itemDescription"), lineGet(line, "itemCode"));
    }

    private String itemHsn(Map<String, Object> line) {
        String hsn = firstNonEmpty(lineGet(line, "hsnCode"), lineGet(line, "hsn"), lineGet(line, "sacCode"));
        if (!hsn.isBlank()) return hsn;
        String code = lineGet(line, "itemCode");
        if (code.isBlank()) return "";
        return items.findByCode(code).map(ItemMaster::getHsnCode).filter(s -> !s.isBlank()).orElse("");
    }

    private static String batchHeat(Map<String, Object> line) {
        String batch = firstNonEmpty(lineGet(line, "batchNo"), lineGet(line, "batchNumber"), lineGet(line, "batch"));
        String heat = firstNonEmpty(lineGet(line, "heatNo"), lineGet(line, "heatNumber"), lineGet(line, "heat"));
        if (batch.isBlank() && heat.isBlank()) {
            String combined = lineGet(line, "batchHeatNumber");
            if (!combined.isBlank()) return combined;
            return firstNonEmpty(lineGet(line, "lotNo"), lineGet(line, "serialNo"));
        }
        if (batch.isBlank()) return heat;
        if (heat.isBlank()) return batch;
        return batch + " / " + heat;
    }

    private static String qtyText(Map<String, Object> line) {
        String uom = firstNonEmpty(lineGet(line, "uom"), "Nos");
        return num2(bd(line.get("qty")).doubleValue()) + " " + uom;
    }

    // ─────────────────────────────────────────────────────────────
    // Formatting / escaping helpers
    // ─────────────────────────────────────────────────────────────

    private static String render(String template, Map<String, String> tokens) {
        String html = template;
        for (Map.Entry<String, String> e : tokens.entrySet()) {
            html = html.replace("{{" + e.getKey() + "}}", e.getValue() == null ? "" : e.getValue());
        }
        Matcher m = TOKEN.matcher(html);
        if (m.find()) {
            log.warn("Unresolved print template token: {}", m.group(1));
        }
        return html;
    }

    private static String nl2br(String s) {
        return s.replaceAll("\\r?\\n", "<br />");
    }

    private static String termItems(String s) {
        String[] lines = s.split("\\r?\\n");
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            if (trimmed.startsWith("<li")) {
                sb.append(trimmed).append("\n");
            } else {
                sb.append("<li>").append(esc(trimmed)).append("</li>\n");
            }
        }
        return sb.toString();
    }

    private static String formatDate(Object v, String sep) {
        String s = str(v);
        if (s.isBlank()) return "";
        try {
            String datePart = s.length() > 10 ? s.substring(0, 10) : s;
            return LocalDate.parse(datePart).format(DateTimeFormatter.ofPattern("dd" + sep + "MM" + sep + "yyyy"));
        } catch (Exception e) {
            return s;
        }
    }

    private static BigDecimal bd(Object v) {
        if (v == null) return BigDecimal.ZERO;
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private static String num2(double d) {
        return String.format("%.2f", d);
    }

    private static String money(Object v) {
        BigDecimal b = bd(v).setScale(2, RoundingMode.HALF_UP);
        boolean neg = b.signum() < 0;
        String s = neg ? b.abs().toPlainString() : b.toPlainString();
        int dot = s.indexOf('.');
        String intPart = dot < 0 ? s : s.substring(0, dot);
        String frac = dot < 0 ? "00" : s.substring(dot + 1);
        if (frac.length() > 2) frac = frac.substring(0, 2);
        while (frac.length() < 2) frac += "0";
        String grouped;
        int len = intPart.length();
        if (len <= 3) {
            grouped = intPart;
        } else {
            String head = intPart.substring(0, len - 3);
            String tail = intPart.substring(len - 3);
            StringBuilder h = new StringBuilder();
            int i = head.length();
            while (i > 0) {
                int take = Math.min(2, i);
                h.insert(0, (h.length() == 0 ? "" : ",") + head.substring(i - take, i));
                i -= take;
            }
            grouped = h + "," + tail;
        }
        return (neg ? "-" : "") + grouped + "." + frac;
    }

    private static String str(Object v) {
        if (v == null) return "";
        String s = String.valueOf(v);
        return "null".equals(s) ? "" : s;
    }

    private static boolean valid(String v) {
        return v != null && !v.isBlank();
    }

    private static boolean validText(String v) {
        return v != null && !v.trim().isEmpty() && !"null".equalsIgnoreCase(v.trim());
    }

    private static String firstNonEmpty(String... vals) {
        for (String v : vals) {
            if (validText(v)) return v.trim();
        }
        return "";
    }

    private static List<String> nonEmpty(String... vals) {
        List<String> out = new ArrayList<>();
        for (String v : vals) if (valid(v)) out.add(v.trim());
        return out;
    }

    private static String val(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null && !String.valueOf(v).isBlank() && !"null".equalsIgnoreCase(String.valueOf(v))) {
                return String.valueOf(v).trim();
            }
        }
        return "";
    }

    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }

    // Exposed for tests (no Spring context needed)
    Map<String, Object> testLines(Map<String, Object> doc) {
        return doc;
    }
}