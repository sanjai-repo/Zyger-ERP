package in.zygertechnology.zygererp.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/** Renders individual documents as print-ready PDFs. */
@Service
public class PrintService {

    private static final Logger log = LoggerFactory.getLogger(PrintService.class);

    private final in.zygertechnology.zygererp.repo.CompanyInfoRepository companyInfos;

    public PrintService(in.zygertechnology.zygererp.repo.CompanyInfoRepository companyInfos) {
        this.companyInfos = companyInfos;
    }

    private static final Color DARK = new Color(27, 36, 51);
    private static final Color MUTED = new Color(110, 116, 126);
    private static final Color MUTED_ON_DARK = new Color(168, 176, 190);
    private static final Color LIGHT = new Color(244, 246, 248);

    private com.lowagie.text.Image loadCompanyLogo() {
        try {
            var ci = companyInfos.findById(1L).orElse(null);
            if (ci == null || ci.getCompanyLogoUrl() == null || ci.getCompanyLogoUrl().isBlank()) return null;
            Path filePath = Path.of("." + ci.getCompanyLogoUrl());
            if (!Files.exists(filePath)) return null;
            byte[] bytes = Files.readAllBytes(filePath);
            com.lowagie.text.Image img = com.lowagie.text.Image.getInstance(bytes);
            img.scaleToFit(40, 40);
            return img;
        } catch (Exception e) {
            log.warn("Could not load company logo for PDF: {}", e.getMessage());
            return null;
        }
    }

    /** Builds a print-ready delivery challan PDF from a document row. */
    public byte[] deliveryChallan(Map<String, Object> doc, String type) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();

            pdf.add(titleBar(doc, type));
            pdf.add(spacer(6));

            pdf.add(detailsTable(doc));
            pdf.add(spacer(10));

            pdf.add(section("Items", doc));
            pdf.add(spacer(4));
            pdf.add(itemsTable(doc));

            pdf.add(spacer(16));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF print failed for {}", doc.get("docNo"), e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    /** Builds a print-ready GRN / Store Receipt PDF from a document row. */
    public byte[] grn(Map<String, Object> doc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();

            pdf.add(grnTitleBar(doc));
            pdf.add(spacer(6));

            pdf.add(grnDetailsTable(doc));
            pdf.add(spacer(10));

            pdf.add(section("Items", doc));
            pdf.add(spacer(4));
            pdf.add(grnItemsTable(doc));

            pdf.add(spacer(16));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF print failed for {}", doc.get("docNo"), e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    private PdfPTable titleBar(Map<String, Object> doc, String type) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{72, 28});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(DARK);
        left.setBorder(PdfPCell.NO_BORDER);
        left.setPadding(12);

        com.lowagie.text.Image logo = loadCompanyLogo();
        if (logo != null) {
            left.addElement(logo);
            left.addElement(spacer(4));
        }

        left.addElement(new Paragraph("DELIVERY CHALLAN",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, Color.WHITE)));
        left.addElement(new Paragraph(label(type),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(DARK);
        right.setBorder(PdfPCell.NO_BORDER);
        right.setPadding(12);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("Doc No: " + str(doc.get("docNo")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE)));
        right.addElement(new Paragraph("Date: " + str(doc.get("date")),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        t.addCell(left);
        t.addCell(right);
        return t;
    }

    private PdfPTable detailsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{18, 32, 18, 32});

        field(t, "Party / Receiver", str(doc.get("party")));
        field(t, "Source Location", str(doc.get("sourceLocation")));
        field(t, "Vehicle No", str(doc.get("vehicleNo")));
        field(t, "Transporter", str(doc.get("transporter")));
        field(t, "Linked Document", str(doc.get("linkedDocumentNo")));
        field(t, "Status", str(doc.get("status")));
        field(t, "Created By", str(doc.get("createdBy")));
        field(t, "Created At", str(doc.get("createdAt")));

        if (!isEmpty(doc.get("remarks"))) {
            PdfPCell cell = new PdfPCell(new Phrase("Remarks: " + str(doc.get("remarks")),
                    FontFactory.getFont(FontFactory.HELVETICA, 9)));
            cell.setColspan(4);
            cell.setPadding(6);
            cell.setBackgroundColor(LIGHT);
            t.addCell(cell);
        }
        return t;
    }

    private void field(PdfPTable t, String label, String value) {
        PdfPCell lc = new PdfPCell(new Phrase(label,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MUTED)));
        lc.setPadding(5);
        lc.setBackgroundColor(LIGHT);

        PdfPCell vc = new PdfPCell(new Phrase(value,
                FontFactory.getFont(FontFactory.HELVETICA, 9)));
        vc.setPadding(5);

        t.addCell(lc);
        t.addCell(vc);
    }

    private PdfPTable itemsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(7);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{4, 15, 34, 14, 10, 9, 14});
        t.setSpacingBefore(0);

        header(t, "#");
        header(t, "Item Code");
        header(t, "Item Description");
        header(t, "Location");
        header(t, "Batch No");
        header(t, "Heat No");
        header(t, "Qty");

        int n = 0;
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            n++;
            cell(t, String.valueOf(n), false);
            cell(t, str(line.get("itemCode")), false);
            cell(t, str(line.get("itemDesc")), false);
            cell(t, str(line.get("location")), false);
            cell(t, str(line.get("batchNo")), false);
            cell(t, str(line.get("heatNo")), false);
            cell(t, num(line.get("qty")), true);
        }

        PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        totalLabel.setColspan(6);
        totalLabel.setPadding(6);
        totalLabel.setBackgroundColor(LIGHT);
        t.addCell(totalLabel);

        PdfPCell total = new PdfPCell(new Phrase(num(doc.get("qty")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        total.setHorizontalAlignment(Element.ALIGN_RIGHT);
        total.setPadding(6);
        total.setBackgroundColor(LIGHT);
        t.addCell(total);
        return t;
    }

    private PdfPTable signatures() {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{50, 50});
        t.setSpacingBefore(18);

        t.addCell(signatureWrapper("Received By"));
        t.addCell(signatureWrapper("Authorized Signatory"));
        return t;
    }

    private PdfPCell signatureWrapper(String label) {
        PdfPCell wrapper = new PdfPCell(signatureLabel(label));
        wrapper.setBorder(PdfPCell.NO_BORDER);
        wrapper.setPadding(0);
        return wrapper;
    }

    private PdfPTable signatureLabel(String label) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);

        PdfPCell line = new PdfPCell(new Phrase(" ",
                FontFactory.getFont(FontFactory.HELVETICA, 8)));
        line.setBorder(PdfPCell.BOTTOM);
        line.setBorderColor(MUTED);
        line.setPadding(2);
        line.setPaddingBottom(4);
        t.addCell(line);

        PdfPCell caption = new PdfPCell(new Phrase(label,
                FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED)));
        caption.setBorder(PdfPCell.NO_BORDER);
        caption.setPadding(0);
        caption.setPaddingTop(3);
        t.addCell(caption);
        return t;
    }

    private PdfPTable grnTitleBar(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{72, 28});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(DARK);
        left.setBorder(PdfPCell.NO_BORDER);
        left.setPadding(12);

        com.lowagie.text.Image logo = loadCompanyLogo();
        if (logo != null) {
            left.addElement(logo);
            left.addElement(spacer(4));
        }

        left.addElement(new Paragraph("GRN / STORE RECEIPT",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, Color.WHITE)));

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(DARK);
        right.setBorder(PdfPCell.NO_BORDER);
        right.setPadding(12);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("Doc No: " + str(doc.get("docNo")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE)));
        right.addElement(new Paragraph("Date: " + str(doc.get("date")),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        t.addCell(left);
        t.addCell(right);
        return t;
    }

    private PdfPTable grnDetailsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{18, 32, 18, 32});

        field(t, "Party", str(doc.get("party")));
        field(t, "Source Type", str(doc.get("sourceType")));
        field(t, "Source Document", str(doc.get("sourceDocumentNo")));
        field(t, "Inspection Ref", str(doc.get("inspectionRef")));
        field(t, "Status", str(doc.get("status")));
        field(t, "Created By", str(doc.get("createdBy")));
        field(t, "Created At", str(doc.get("createdAt")));

        if (!isEmpty(doc.get("remarks"))) {
            PdfPCell cell = new PdfPCell(new Phrase("Remarks: " + str(doc.get("remarks")),
                    FontFactory.getFont(FontFactory.HELVETICA, 9)));
            cell.setColspan(4);
            cell.setPadding(6);
            cell.setBackgroundColor(LIGHT);
            t.addCell(cell);
        }
        return t;
    }

    private PdfPTable grnItemsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(8);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{3, 14, 34, 14, 14, 12, 12, 14});
        t.setSpacingBefore(0);

        header(t, "#");
        header(t, "Item Code");
        header(t, "Item Description");
        header(t, "Accepted Qty");
        header(t, "Rate");
        header(t, "Batch No");
        header(t, "Heat No");
        header(t, "Location");

        int n = 0;
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            n++;
            cell(t, String.valueOf(n), false);
            cell(t, str(line.get("itemCode")), false);
            cell(t, str(line.get("itemDesc")), false);
            cell(t, num(line.get("qty")), true);
            cell(t, num(line.get("rate")), true);
            cell(t, str(line.get("batchNo")), false);
            cell(t, str(line.get("heatNo")), false);
            cell(t, str(line.get("location")), false);
        }

        PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL QTY",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        totalLabel.setColspan(3);
        totalLabel.setPadding(6);
        totalLabel.setBackgroundColor(LIGHT);
        t.addCell(totalLabel);

        PdfPCell total = new PdfPCell(new Phrase(num(doc.get("qty")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        total.setHorizontalAlignment(Element.ALIGN_RIGHT);
        total.setPadding(6);
        total.setBackgroundColor(LIGHT);
        t.addCell(total);

        PdfPCell empty = new PdfPCell(new Phrase("",
                FontFactory.getFont(FontFactory.HELVETICA, 9)));
        empty.setColspan(3);
        empty.setBorder(PdfPCell.NO_BORDER);
        empty.setPadding(6);
        t.addCell(empty);

        return t;
    }

    private void header(PdfPTable t, String text) {
        PdfPCell c = new PdfPCell(new Phrase(text,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE)));
        c.setBackgroundColor(DARK);
        c.setPadding(5);
        t.addCell(c);
    }

    private void cell(PdfPTable t, String value, boolean numeric) {
        PdfPCell c = new PdfPCell(new Phrase(value,
                FontFactory.getFont(FontFactory.HELVETICA, 8)));
        c.setPadding(5);
        if (numeric) c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(c);
    }

    private PdfPTable section(String title, Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        PdfPCell c = new PdfPCell(new Phrase(title,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
        c.setBackgroundColor(DARK);
        c.setPadding(6);
        t.addCell(c);
        return t;
    }

    private Paragraph spacer(float points) {
        Paragraph p = new Paragraph(" ");
        p.setLeading(points);
        return p;
    }

    @SuppressWarnings("unchecked")
    private List<Object> lines(Map<String, Object> doc) {
        Object l = doc.get("lines");
        return l instanceof List ? (List<Object>) l : List.of();
    }

    private String label(String type) {
        return type.replace('-', ' ').toUpperCase() + "  \u2022  Dispatch Document";
    }

    private String str(Object v) {
        if (v == null) return "";
        String s = String.valueOf(v);
        return s.replace("null", "");
    }

    private String num(Object v) {
        if (v == null) return "";
        try {
            double d = Double.parseDouble(String.valueOf(v));
            if (d == Math.floor(d) && !Double.isInfinite(d))
                return String.valueOf((long) d);
            return String.valueOf(d);
        } catch (Exception e) {
            return String.valueOf(v);
        }
    }

    private boolean isEmpty(Object v) {
        return v == null || String.valueOf(v).isEmpty();
    }

    /** FRS §18: Work Order print packet — header, materials, processes, signatures. */
    public byte[] workOrder(Map<String, Object> doc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();

            pdf.add(woTitleBar(doc));
            pdf.add(spacer(6));

            pdf.add(woDetailsTable(doc));
            pdf.add(spacer(8));

            List<?> materialLines = safeList(doc.get("materialLines"));
            if (!materialLines.isEmpty()) {
                pdf.add(section("Material Lines", doc));
                pdf.add(spacer(4));
                pdf.add(woMaterialsTable(materialLines));
                pdf.add(spacer(8));
            }

            List<?> processLines = safeList(doc.get("lines"));
            if (!processLines.isEmpty()) {
                pdf.add(section("Process Lines", doc));
                pdf.add(spacer(4));
                pdf.add(woProcessTable(processLines));
                pdf.add(spacer(8));
            }

            pdf.add(woSignatures());
            pdf.add(spacer(6));
            pdf.add(woFooter(doc));
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("WO PDF print failed for {}", doc.get("docNo"), e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    private PdfPTable woTitleBar(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{72, 28});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(DARK);
        left.setBorder(PdfPCell.NO_BORDER);
        left.setPadding(12);

        com.lowagie.text.Image logo = loadCompanyLogo();
        if (logo != null) {
            left.addElement(logo);
            left.addElement(spacer(4));
        }

        left.addElement(new Paragraph("WORK ORDER",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, Color.WHITE)));
        left.addElement(new Paragraph("Shop Floor Production Packet",
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(DARK);
        right.setBorder(PdfPCell.NO_BORDER);
        right.setPadding(12);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("WO No: " + str(doc.get("woNumber")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE)));
        right.addElement(new Paragraph("Status: " + str(doc.get("status")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
        right.addElement(new Paragraph("Date: " + str(doc.get("docDate")),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        t.addCell(left);
        t.addCell(right);
        return t;
    }

    private PdfPTable woDetailsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{18, 32, 18, 32});

        field(t, "Sales Order No", str(doc.get("salesOrderNo")));
        field(t, "SO Line No", str(doc.get("salesOrderLineNo")));
        field(t, "Customer", str(doc.get("customerCode")));
        field(t, "Item Code", str(doc.get("itemCode")));
        field(t, "Item Description", str(doc.get("itemDescription")));
        field(t, "Drawing No", str(doc.get("drawingNumber")));
        field(t, "Drawing Rev", str(doc.get("drawingRev")));
        field(t, "Production Qty", num(doc.get("productionQty")));
        field(t, "Completed Qty", num(doc.get("completedQty")));
        field(t, "Rejected Qty", num(doc.get("rejectedQty")));
        field(t, "Scrap Qty", num(doc.get("scrapQty")));
        field(t, "UOM", str(doc.get("uom")));
        field(t, "Planned Start", str(doc.get("plannedStartDate")));
        field(t, "Planned End", str(doc.get("plannedEndDate")));
        field(t, "Due Date", str(doc.get("dueDate")));
        field(t, "Promised Delivery", str(doc.get("promisedDeliveryDate")));
        field(t, "BOM Reference", str(doc.get("bomId")));
        field(t, "BOM Revision", str(doc.get("bomRevision")));
        field(t, "Route Reference", str(doc.get("routeId")));
        field(t, "Route Revision", str(doc.get("routeRevision")));
        field(t, "Priority", str(doc.get("priority")));
        field(t, "Batch/Lot No", str(doc.get("batchLotNo")));
        field(t, "Released By", str(doc.get("releasedBy")));
        field(t, "Released Qty", num(doc.get("releasedQty")));

        if (!isEmpty(doc.get("remarks"))) {
            PdfPCell cell = new PdfPCell(new Phrase("Remarks: " + str(doc.get("remarks")),
                    FontFactory.getFont(FontFactory.HELVETICA, 9)));
            cell.setColspan(4);
            cell.setPadding(6);
            cell.setBackgroundColor(LIGHT);
            t.addCell(cell);
        }
        return t;
    }

    private PdfPTable woMaterialsTable(List<?> materials) {
        PdfPTable t = new PdfPTable(6);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{4, 15, 30, 10, 12, 12});
        t.setSpacingBefore(0);

        header(t, "#");
        header(t, "Component Code");
        header(t, "Description");
        header(t, "UOM");
        header(t, "Required Qty");
        header(t, "Issued Qty");

        int n = 0;
        for (Object o : materials) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            n++;
            cell(t, String.valueOf(n), false);
            cell(t, str(line.get("componentItemCode")), false);
            cell(t, str(line.get("description")), false);
            cell(t, str(line.get("uom")), false);
            cell(t, num(line.get("requiredQuantity")), true);
            cell(t, num(line.get("issuedQuantity")), true);
        }
        return t;
    }

    private PdfPTable woProcessTable(List<?> processes) {
        PdfPTable t = new PdfPTable(7);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{4, 8, 20, 16, 12, 12, 12});
        t.setSpacingBefore(0);

        header(t, "#");
        header(t, "Seq");
        header(t, "Operation");
        header(t, "Work Centre");
        header(t, "Setup Time");
        header(t, "Cycle Time");
        header(t, "Status");

        int n = 0;
        for (Object o : processes) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            n++;
            cell(t, String.valueOf(n), false);
            cell(t, str(line.get("operationSequence")), false);
            cell(t, str(line.get("operationCode")), false);
            cell(t, str(line.get("workCenterCode")), false);
            cell(t, num(line.get("setupTimePlanned")), true);
            cell(t, num(line.get("cycleTimePlanned")), true);
            cell(t, str(line.get("status")), false);
        }
        return t;
    }

    private PdfPTable woSignatures() {
        PdfPTable t = new PdfPTable(3);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{33, 34, 33});
        t.setSpacingBefore(18);

        t.addCell(signatureWrapper("Prepared By"));
        t.addCell(signatureWrapper("Released By"));
        t.addCell(signatureWrapper("Production Supervisor"));
        return t;
    }

    private PdfPTable woFooter(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        PdfPCell c = new PdfPCell(new Phrase(
                "Printed: " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        + "  |  Version: " + str(doc.get("version")),
                FontFactory.getFont(FontFactory.HELVETICA, 7, MUTED)));
        c.setBorder(PdfPCell.NO_BORDER);
        c.setPadding(4);
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(c);
        return t;
    }

    @SuppressWarnings("unchecked")
    private List<?> safeList(Object obj) {
        return obj instanceof List ? (List<?>) obj : List.of();
    }

    /** Builds a generic sales document PDF from a document row. */
    public byte[] salesDoc(Map<String, Object> doc, String type) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();

            pdf.add(salesTitleBar(doc, type));
            pdf.add(spacer(6));

            pdf.add(salesDetailsTable(doc));
            pdf.add(spacer(10));

            pdf.add(section("Items", doc));
            pdf.add(spacer(4));
            pdf.add(salesItemsTable(doc));

            pdf.add(spacer(16));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF print failed for {}", doc.get("docNo"), e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    private PdfPTable salesTitleBar(Map<String, Object> doc, String type) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{72, 28});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(DARK);
        left.setBorder(PdfPCell.NO_BORDER);
        left.setPadding(12);

        com.lowagie.text.Image logo = loadCompanyLogo();
        if (logo != null) {
            left.addElement(logo);
            left.addElement(spacer(4));
        }

        String title = type.replace('-', ' ').toUpperCase();
        left.addElement(new Paragraph(title,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, Color.WHITE)));
        left.addElement(new Paragraph(label(type),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(DARK);
        right.setBorder(PdfPCell.NO_BORDER);
        right.setPadding(12);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("Doc No: " + str(doc.get("docNo")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE)));
        right.addElement(new Paragraph("Date: " + str(doc.get("date")),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));

        t.addCell(left);
        t.addCell(right);
        return t;
    }

    private PdfPTable salesDetailsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{18, 32, 18, 32});

        field(t, "Customer", str(doc.get("customer")));
        field(t, "Customer Code", str(doc.get("customerCode")));
        field(t, "Doc Date", str(doc.get("docDate")));
        field(t, "Status", str(doc.get("status")));
        field(t, "SO Reference", str(doc.get("salesOrderNumber")));
        field(t, "PI Number", str(doc.get("piNumber")));
        field(t, "DC Number", str(doc.get("salesDcNumber")));
        field(t, "Customer PO", str(doc.get("customerPoNumber")));
        field(t, "Currency", str(doc.get("currency")));
        field(t, "Payment Terms", str(doc.get("paymentTerms")));
        field(t, "Total Qty", num(doc.get("qty")));
        field(t, "Total Amount", num(doc.get("totalAmount")));
        field(t, "Tax Amount", num(doc.get("taxAmount")));
        field(t, "E-Way Bill Ref", str(doc.get("ewayBillReference")));

        if (!isEmpty(doc.get("billingAddress"))) {
            field(t, "Billing Address", str(doc.get("billingAddress")));
        }
        if (!isEmpty(doc.get("shippingAddress"))) {
            field(t, "Shipping Address", str(doc.get("shippingAddress")));
        }
        if (!isEmpty(doc.get("transportDetails"))) {
            field(t, "Transport Details", str(doc.get("transportDetails")));
        }

        if (!isEmpty(doc.get("remarks"))) {
            PdfPCell cell = new PdfPCell(new Phrase("Remarks: " + str(doc.get("remarks")),
                    FontFactory.getFont(FontFactory.HELVETICA, 9)));
            cell.setColspan(4);
            cell.setPadding(6);
            cell.setBackgroundColor(LIGHT);
            t.addCell(cell);
        }
        return t;
    }

    private PdfPTable salesItemsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(8);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{4, 14, 28, 10, 10, 10, 10, 14});
        t.setSpacingBefore(0);

        header(t, "#");
        header(t, "Item Code");
        header(t, "Description");
        header(t, "UOM");
        header(t, "Qty");
        header(t, "Rate");
        header(t, "Tax");
        header(t, "Amount");

        int n = 0;
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            n++;
            cell(t, String.valueOf(n), false);
            cell(t, str(line.get("itemCode")), false);
            cell(t, str(line.get("description")), false);
            cell(t, str(line.get("uom")), false);
            cell(t, num(line.get("billedQty")), true);
            cell(t, num(line.get("unitPrice")), true);
            cell(t, str(line.get("taxCode")), false);
            cell(t, num(line.get("netAmount")), true);
        }

        PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        totalLabel.setColspan(7);
        totalLabel.setPadding(6);
        totalLabel.setBackgroundColor(LIGHT);
        t.addCell(totalLabel);

        PdfPCell total = new PdfPCell(new Phrase(num(doc.get("totalAmount")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        total.setHorizontalAlignment(Element.ALIGN_RIGHT);
        total.setPadding(6);
        total.setBackgroundColor(LIGHT);
        t.addCell(total);
        return t;
    }

    // ═══════════════════════════════════════════════════════════════
    // FRS §5.4 FR-23/FR-24: BOM PDF
    // ═══════════════════════════════════════════════════════════════

    public byte[] bom(Map<String, Object> doc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();

            PdfPTable titleBar = new PdfPTable(1);
            titleBar.setWidthPercentage(100);
            PdfPCell tc = new PdfPCell(new Phrase("BILL OF MATERIALS",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE)));
            tc.setBackgroundColor(DARK);
            tc.setPadding(12);
            tc.setHorizontalAlignment(Element.ALIGN_CENTER);
            titleBar.addCell(tc);
            pdf.add(titleBar);
            pdf.add(spacer(4));

            pdf.add(section("HEADER", doc));

            PdfPTable details = new PdfPTable(4);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{18, 32, 18, 32});
            field(details, "BOM Code", str(doc.get("bomNumber")));
            field(details, "BOM Item", str(doc.get("itemCode")));
            field(details, "Item Type", str(doc.get("itemType")));
            field(details, "Base Qty", num(doc.get("baseQuantity")));
            field(details, "Revision", str(doc.get("revisionLabel")));
            field(details, "Total Weight", num(doc.get("weight")));
            field(details, "Status", str(doc.get("status")));
            field(details, "Sales Order", str(doc.get("salesOrderId")));
            field(details, "Specifications", str(doc.get("specifications")));
            field(details, "Remarks", str(doc.get("remarks")));
            pdf.add(details);
            pdf.add(spacer(6));

            pdf.add(section("COMPONENT LIST", doc));
            PdfPTable t = new PdfPTable(7);
            t.setWidthPercentage(100);
            t.setWidths(new float[]{6, 8, 14, 14, 18, 18, 22});
            header(t, "#");
            header(t, "Level");
            header(t, "Component");
            header(t, "Revision");
            header(t, "Qty");
            header(t, "Total Wt");
            header(t, "Remarks");

            int seq = 1;
            for (Object o : lines(doc)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> line = (Map<String, Object>) o;
                cell(t, String.valueOf(seq++), false);
                cell(t, str(line.get("bomLevel")), false);
                cell(t, str(line.get("componentItemCode")), false);
                cell(t, str(line.get("componentRevision")), false);
                cell(t, num(line.get("quantityPer")), true);
                cell(t, num(line.get("totalWeight")), true);
                cell(t, str(line.get("remarks")), false);
            }
            pdf.add(t);
            pdf.add(spacer(12));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("BOM PDF generation failed", e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FRS: Route Sheet PDF
    // ═══════════════════════════════════════════════════════════════

    public byte[] routeSheet(Map<String, Object> doc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();

            PdfPTable titleBar = new PdfPTable(1);
            titleBar.setWidthPercentage(100);
            PdfPCell tc = new PdfPCell(new Phrase("ROUTE SHEET",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE)));
            tc.setBackgroundColor(DARK);
            tc.setPadding(12);
            tc.setHorizontalAlignment(Element.ALIGN_CENTER);
            titleBar.addCell(tc);
            pdf.add(titleBar);
            pdf.add(spacer(4));

            pdf.add(section("HEADER", doc));

            PdfPTable details = new PdfPTable(4);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{18, 32, 18, 32});
            field(details, "Route No", str(doc.get("routeNumber")));
            field(details, "Item Code", str(doc.get("itemCode")));
            field(details, "Item Type", str(doc.get("itemType")));
            field(details, "Revision", str(doc.get("routeVersion")));
            field(details, "Base Qty", num(doc.get("baseQuantity")));
            field(details, "Status", str(doc.get("status")));
            field(details, "Total Setup", num(doc.get("totalSetupTime")));
            field(details, "Total Cycle", num(doc.get("totalCycleTime")));
            pdf.add(details);
            pdf.add(spacer(6));

            pdf.add(section("OPERATION SEQUENCE", doc));
            PdfPTable t = new PdfPTable(7);
            t.setWidthPercentage(100);
            t.setWidths(new float[]{8, 14, 14, 14, 14, 14, 22});
            header(t, "Seq");
            header(t, "Process");
            header(t, "Resource");
            header(t, "Type");
            header(t, "Setup(min)");
            header(t, "Cycle(min)");
            header(t, "QC");

            for (Object o : lines(doc)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> line = (Map<String, Object>) o;
                cell(t, num(line.get("sequenceNo")), true);
                cell(t, str(line.get("processCode")), false);
                cell(t, str(line.get("resourceName")), false);
                cell(t, str(line.get("resourceType")), false);
                cell(t, num(line.get("setupTime")), true);
                cell(t, num(line.get("cycleTime")), true);
                cell(t, Boolean.TRUE.equals(line.get("inspectionRequired")) ? "Yes" : "No", false);
            }
            pdf.add(t);
            pdf.add(spacer(12));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Route Sheet PDF generation failed", e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }
}
