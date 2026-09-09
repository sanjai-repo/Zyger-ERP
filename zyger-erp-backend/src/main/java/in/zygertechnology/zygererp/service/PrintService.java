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

import in.zygertechnology.zygererp.entity.ItemMaster;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Renders individual documents as print-ready PDFs. */
@Service
public class PrintService {

    private static final Logger log = LoggerFactory.getLogger(PrintService.class);

    private final in.zygertechnology.zygererp.repo.CompanyInfoRepository companyInfos;
    private final in.zygertechnology.zygererp.repo.ItemRepository items;

    public PrintService(in.zygertechnology.zygererp.repo.CompanyInfoRepository companyInfos,
                         in.zygertechnology.zygererp.repo.ItemRepository items) {
        this.companyInfos = companyInfos;
        this.items = items;
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

    /** Builds a print-ready delivery challan PDF from a document row (first print, copy 1). */
    public byte[] deliveryChallan(Map<String, Object> doc, String type) {
        return deliveryChallan(doc, type, 1);
    }

    /**
     * DOCUMENT 02 v2.0 §08.3 — Delivery Challan print. A non-POSTED document prints with a
     * diagonal "DRAFT — NOT VALID FOR DISPATCH" watermark (BR-INV-DC-PRINT-3), and any print
     * after the first shows "COPY N" (FR-INV-DC-PRINT-1).
     */
    public byte[] deliveryChallan(Map<String, Object> doc, String type, int copyNumber) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 30, 30, 30, 30);
            PdfWriter writer = PdfWriter.getInstance(pdf, baos);
            pdf.open();

            pdf.add(titleBar(doc, type));
            if (copyNumber > 0) {
                pdf.add(copyLabel(copyNumber));
            }
            pdf.add(spacer(6));

            pdf.add(dcDetailsGrid(doc, type));
            pdf.add(spacer(8));

            pdf.add(dcPartyLocationGrid(doc, type));
            pdf.add(spacer(8));

            pdf.add(section("Line Items", doc));
            pdf.add(spacer(4));
            pdf.add(dcItemsTable(doc));

            pdf.add(spacer(8));
            pdf.add(dcFooterNotice(doc, type));

            pdf.add(spacer(14));
            pdf.add(dcThreeSignatures(doc));
            pdf.add(spacer(6));
            pdf.add(printFooter(doc, copyNumber));

            boolean isPosted = "POSTED".equalsIgnoreCase(str(doc.get("status"))) || "CONFIRMED".equalsIgnoreCase(str(doc.get("status"))) || "RECEIVED".equalsIgnoreCase(str(doc.get("status")));
            if (!isPosted) {
                drawDraftWatermark(writer);
            }
            if (Boolean.TRUE.equals(doc.get("invoiced"))) {
                drawInvoicedWatermark(writer);
            }
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF print failed for {}", doc.get("docNo"), e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    private void drawInvoicedWatermark(PdfWriter writer) {
        com.lowagie.text.pdf.PdfContentByte canvas = writer.getDirectContentUnder();
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 46, new Color(40, 140, 60));
        Phrase p = new Phrase("INVOICED — TAX INVOICE ISSUED", f);
        canvas.saveState();
        canvas.setGState(new com.lowagie.text.pdf.PdfGState() {{ setFillOpacity(0.20f); setStrokeOpacity(0.20f); }});
        com.lowagie.text.pdf.ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER, p,
                PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 45);
        canvas.restoreState();
    }

    private PdfPTable dcDetailsGrid(Map<String, Object> doc, String type) {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{20, 30, 20, 30});
        kv(t, "DC No.", str(doc.get("docNo")));
        kv(t, "DC Date", str(doc.get("docDate")));
        kv(t, "Ref No.", firstNonEmpty(str(doc.get("referenceNo")), str(doc.get("jobOrderNo")), str(doc.get("salesOrderNo")), str(doc.get("transferRequestNo")), str(doc.get("linkedDocumentNo"))));
        kv(t, "Ref Date", str(doc.get("referenceDate")));
        kv(t, "Vehicle No.", str(doc.get("vehicleNo")));
        kv(t, "Mode of Transport", str(doc.getOrDefault("modeOfTransport", "Road")));
        kv(t, "Transporter", str(doc.get("transporter")));
        kv(t, "LR / Docket No.", str(doc.get("lrNo")));
        return t;
    }

    private PdfPTable dcPartyLocationGrid(Map<String, Object> doc, String type) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{50, 50});

        PdfPCell left = new PdfPCell();
        left.setPadding(6);
        left.setBackgroundColor(LIGHT);

        String partyHeading = "jo-dc".equals(type) ? "Job Worker / Vendor:" : "transfer-dc".equals(type) ? "Transfer To (Destination):" : "Consignee / Customer:";
        left.addElement(new Paragraph(partyHeading, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        left.addElement(new Paragraph(str(doc.get("party")), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        if (!isEmpty(doc.get("billingAddress"))) left.addElement(new Paragraph(str(doc.get("billingAddress")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        if (!isEmpty(doc.get("gstin"))) left.addElement(new Paragraph("GSTIN: " + str(doc.get("gstin")), FontFactory.getFont(FontFactory.HELVETICA, 8)));

        PdfPCell right = new PdfPCell();
        right.setPadding(6);
        right.setBackgroundColor(LIGHT);
        right.addElement(new Paragraph("From Location:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        right.addElement(new Paragraph(str(doc.get("sourceLocation")), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        String purposeText = "jo-dc".equals(type) ? str(doc.getOrDefault("challanPurpose", "Job Work")) : "transfer-dc".equals(type) ? "Stock Transfer (" + str(doc.getOrDefault("transferType", "Internal")) + ")" : str(doc.getOrDefault("dcAgainst", "Dispatch / Sale"));
        right.addElement(new Paragraph("Purpose: " + purposeText, FontFactory.getFont(FontFactory.HELVETICA, 8)));

        t.addCell(left);
        t.addCell(right);
        return t;
    }

    private PdfPTable dcItemsTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(9);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{5, 14, 25, 10, 10, 8, 9, 9, 10});

        header(t, "Sl.");
        header(t, "Item Code");
        header(t, "Description");
        header(t, "HSN");
        header(t, "Batch");
        header(t, "UOM");
        header(t, "Qty");
        header(t, "Rate");
        header(t, "Amount");

        int sl = 0;
        double totalQty = 0;
        double totalAmt = 0;
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            sl++;
            double q = line.get("qty") != null ? Double.parseDouble(String.valueOf(line.get("qty"))) : 0;
            double r = line.get("rate") != null ? Double.parseDouble(String.valueOf(line.get("rate"))) : 0;
            double a = line.get("amount") != null ? Double.parseDouble(String.valueOf(line.get("amount"))) : q * r;
            totalQty += q;
            totalAmt += a;

            cell(t, String.valueOf(sl), false);
            cell(t, str(line.get("itemCode")), false);
            cell(t, str(line.get("itemDesc")), false);
            cell(t, str(line.get("hsnCode")), false);
            cell(t, str(line.get("batchNo")), false);
            cell(t, str(line.get("uom")), false);
            cell(t, num(q), true);
            cell(t, r > 0 ? String.format("%.2f", r) : "-", true);
            cell(t, a > 0 ? String.format("%.2f", a) : "-", true);
        }

        PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        totalLabel.setColspan(6);
        totalLabel.setPadding(5);
        totalLabel.setBackgroundColor(LIGHT);
        t.addCell(totalLabel);

        PdfPCell cellQty = new PdfPCell(new Phrase(num(totalQty), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        cellQty.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cellQty.setPadding(5);
        cellQty.setBackgroundColor(LIGHT);
        t.addCell(cellQty);

        PdfPCell cellDash = new PdfPCell(new Phrase("-", FontFactory.getFont(FontFactory.HELVETICA, 8)));
        cellDash.setHorizontalAlignment(Element.ALIGN_CENTER);
        cellDash.setPadding(5);
        cellDash.setBackgroundColor(LIGHT);
        t.addCell(cellDash);

        PdfPCell cellAmt = new PdfPCell(new Phrase(totalAmt > 0 ? String.format("%.2f", totalAmt) : "-", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        cellAmt.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cellAmt.setPadding(5);
        cellAmt.setBackgroundColor(LIGHT);
        t.addCell(cellAmt);

        return t;
    }

    private Paragraph dcFooterNotice(Map<String, Object> doc, String type) {
        double totalQty = doc.get("qty") != null ? Double.parseDouble(String.valueOf(doc.get("qty"))) : 0;
        String words = convertNumberToWords(totalQty);

        String note = "jo-dc".equals(type)
                ? "Note: Goods sent for Outside Processing / Job Work - NOT FOR SALE / RETURNABLE. Received goods in good condition subject to verification."
                : "transfer-dc".equals(type)
                ? "Note: Goods transferred internally between company locations - STOCK TRANSFER - NOT FOR SALE."
                : "Note: Goods delivered against DC - Invoice to follow. Received goods in good condition subject to verification.";

        Paragraph p = new Paragraph();
        p.add(new Paragraph("Total Quantity in Words: " + words, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        p.add(new Paragraph(note, FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, DARK)));
        return p;
    }

    private void kv(PdfPTable t, String label, String value) {
        PdfPCell lc = new PdfPCell(new Phrase(label, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MUTED)));
        lc.setBackgroundColor(LIGHT);
        lc.setPadding(4);
        PdfPCell vc = new PdfPCell(new Phrase(value != null ? value : "", FontFactory.getFont(FontFactory.HELVETICA, 8)));
        vc.setPadding(4);
        t.addCell(lc);
        t.addCell(vc);
    }

    private String firstNonEmpty(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank() && !"null".equalsIgnoreCase(v)) return v;
        }
        return "";
    }

    private PdfPTable dcThreeSignatures(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(3);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{33, 34, 33});
        t.setSpacingBefore(12);

        String prepUser = str(doc.getOrDefault("preparedBy", doc.getOrDefault("createdBy", "User")));
        t.addCell(signatureWrapper("Prepared By (" + prepUser + ")"));
        t.addCell(signatureWrapper("Checked / Approved By"));
        t.addCell(signatureWrapper("Receiver's Signature & Stamp"));
        return t;
    }

    private String convertNumberToWords(double amount) {
        if (amount <= 0) return "Zero Only";
        return numberToWords(BigDecimal.valueOf(amount)) + " Only";
    }

    private void drawDraftWatermark(PdfWriter writer) {
        com.lowagie.text.pdf.PdfContentByte canvas = writer.getDirectContentUnder();
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 46, new Color(220, 60, 60));
        Phrase p = new Phrase("DRAFT — NOT VALID FOR DISPATCH", f);
        canvas.saveState();
        canvas.setGState(new com.lowagie.text.pdf.PdfGState() {{ setFillOpacity(0.25f); setStrokeOpacity(0.25f); }});
        com.lowagie.text.pdf.ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER, p,
                PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 45);
        canvas.restoreState();
    }

    private Paragraph copyLabel(int copyNumber) {
        String label = switch (copyNumber) {
            case 1 -> "ORIGINAL";
            case 2 -> "DUPLICATE";
            case 3 -> "TRIPLICATE";
            default -> "COPY " + copyNumber;
        };
        Paragraph p = new Paragraph(label,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(40, 40, 40)));
        p.setAlignment(Element.ALIGN_CENTER);
        return p;
    }

    private Paragraph printFooter(Map<String, Object> doc, int copyNumber) {
        String text = str(doc.get("docNo")) + "  •  Printed " +
                java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm"));
        if (copyNumber > 3) text += "  •  " + copyLabel(copyNumber).getContent();
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA, 7, MUTED));
        p.setAlignment(Element.ALIGN_LEFT);
        return p;
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

        left.addElement(new Paragraph(dcTitle(type),
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

    /** DOCUMENT 02 v2.0 \u00a708.3 \u2014 the printed title changes automatically by DC sub-type. */
    private String dcTitle(String type) {
        return switch (String.valueOf(type)) {
            case "jo-dc" -> "JOB WORK DELIVERY CHALLAN";
            case "return-dc" -> "RETURN DELIVERY CHALLAN";
            case "transfer-dc" -> "STOCK TRANSFER CHALLAN";
            default -> "DELIVERY CHALLAN";
        };
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

    // ═══════════════════════════════════════════════════════════════
    // Purchase Order print — dedicated layout (supplier-facing, not the
    // sales-doc template this used to reuse: shows the vendor, GSTIN,
    // HSN/tax breakdown, amount in words, and a DRAFT/CANCELLED watermark).
    // ═══════════════════════════════════════════════════════════════

    /** Builds a print-ready Purchase Order PDF from a document row (first print, copy 1). */
    public byte[] purchaseOrder(Map<String, Object> doc) {
        return purchaseOrder(doc, 1);
    }

    public byte[] purchaseOrder(Map<String, Object> doc, int copyNumber) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 36, 36, 44, 44);
            PdfWriter writer = PdfWriter.getInstance(pdf, baos);
            PoPageFooter pageFooter = new PoPageFooter();
            writer.setPageEvent(pageFooter);
            pdf.open();

            String status = str(doc.get("status"));

            pdf.add(poTitleBar(doc));
            pdf.add(spacer(6));
            pdf.add(poPartyTable(doc));
            pdf.add(spacer(6));
            pdf.add(poRefTable(doc));
            pdf.add(spacer(10));

            pdf.add(section("Items", doc));
            pdf.add(spacer(4));
            BigDecimal[] totals = new BigDecimal[3];
            pdf.add(poItemsTable(doc, totals));
            pdf.add(spacer(6));
            pdf.add(poTotalsBlock(totals[0], totals[1], totals[2]));

            pdf.add(spacer(16));
            pdf.add(poSignatures());
            pdf.add(spacer(6));
            pdf.add(printFooter(doc, copyNumber));

            boolean cancelled = "CANCELLED".equalsIgnoreCase(status);
            boolean approvedOrBeyond = Set.of("APPROVED", "RELEASED", "POSTED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED").contains(status.toUpperCase());
            if (cancelled) {
                drawWatermark(writer, "CANCELLED", new Color(200, 30, 30));
            } else if (!approvedOrBeyond) {
                drawWatermark(writer, "DRAFT — NOT APPROVED", new Color(220, 60, 60));
            }
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PO PDF print failed for {}", doc.get("docNo"), e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    /** Draws page numbers ("Page N of M") in the footer of every page of a Purchase Order. */
    private static class PoPageFooter extends com.lowagie.text.pdf.PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            com.lowagie.text.pdf.PdfContentByte cb = writer.getDirectContent();
            Phrase p = new Phrase("Page " + writer.getPageNumber(),
                    FontFactory.getFont(FontFactory.HELVETICA, 7, MUTED));
            com.lowagie.text.pdf.ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, p,
                    document.right(), document.bottom() - 10, 0);
        }
    }

    private void drawWatermark(PdfWriter writer, String text, Color color) {
        com.lowagie.text.pdf.PdfContentByte canvas = writer.getDirectContentUnder();
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 42, color);
        Phrase p = new Phrase(text, f);
        canvas.saveState();
        canvas.setGState(new com.lowagie.text.pdf.PdfGState() {{ setFillOpacity(0.22f); setStrokeOpacity(0.22f); }});
        com.lowagie.text.pdf.ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER, p,
                PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 45);
        canvas.restoreState();
    }

    private PdfPTable poTitleBar(Map<String, Object> doc) {
        var ci = companyInfos.findById(1L).orElse(null);
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{68, 32});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(DARK);
        left.setBorder(PdfPCell.NO_BORDER);
        left.setPadding(12);

        com.lowagie.text.Image logo = loadCompanyLogo();
        if (logo != null) {
            left.addElement(logo);
            left.addElement(spacer(4));
        }
        left.addElement(new Paragraph(ci != null && !isEmpty(ci.getCompanyName()) ? ci.getCompanyName() : "Company",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, Color.WHITE)));
        if (ci != null) {
            String addr = firstNonEmpty(ci.getAddressLine1(), ci.getRegisteredAddress());
            if (!isEmpty(addr)) {
                left.addElement(new Paragraph(addr, FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED_ON_DARK)));
            }
            String cityLine = String.join(", ", nonEmpty(ci.getCity(), ci.getState(), ci.getPincode()));
            if (!cityLine.isEmpty()) {
                left.addElement(new Paragraph(cityLine, FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED_ON_DARK)));
            }
            String gstin = firstNonEmpty(ci.getGstin(), ci.getGstNumber());
            if (!isEmpty(gstin)) {
                left.addElement(new Paragraph("GSTIN: " + gstin, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE)));
            }
        }

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(DARK);
        right.setBorder(PdfPCell.NO_BORDER);
        right.setPadding(12);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("PURCHASE ORDER",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.WHITE)));
        right.addElement(new Paragraph("PO No: " + str(doc.get("docNo")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE)));
        right.addElement(new Paragraph("Date: " + str(doc.get("date")),
                FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED_ON_DARK)));
        right.addElement(new Paragraph("Status: " + str(doc.get("status")),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, MUTED_ON_DARK)));
        // FRS DOC-PUR-FRS-02 §6 (PUR-04) — printed revision marker, only shown once the PO has
        // actually been amended (revisionNumber > 1) so a first-print PO stays unchanged.
        int revision = (int) numOrZeroInt(doc.get("revisionNumber"));
        if (revision > 1) {
            right.addElement(new Paragraph("Amendment No. " + (revision - 1) + " — Rev. " + revision,
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(255, 200, 120))));
            String amendedAt = str(doc.get("lastAmendedAt"));
            if (!amendedAt.isBlank()) {
                right.addElement(new Paragraph("Revised: " + amendedAt.substring(0, Math.min(10, amendedAt.length())),
                        FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED_ON_DARK)));
            }
        }

        t.addCell(left);
        t.addCell(right);
        return t;
    }

    private double numOrZeroInt(Object v) {
        if (v == null) return 0;
        try { return Double.parseDouble(String.valueOf(v)); } catch (Exception e) { return 0; }
    }

    private PdfPTable poPartyTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{50, 50});
        t.setSpacingBefore(2);

        PdfPCell supplierCell = new PdfPCell();
        supplierCell.setPadding(8);
        supplierCell.setBackgroundColor(LIGHT);
        supplierCell.addElement(new Paragraph("VENDOR", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MUTED)));
        supplierCell.addElement(new Paragraph(str(doc.get("supplier")), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11)));
        if (!isEmpty(doc.get("supplierCode"))) {
            supplierCell.addElement(new Paragraph("Code: " + str(doc.get("supplierCode")), FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED)));
        }
        if (!isEmpty(doc.get("billingAddress"))) {
            supplierCell.addElement(new Paragraph(str(doc.get("billingAddress")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        }
        if (!isEmpty(doc.get("contactPerson"))) {
            supplierCell.addElement(new Paragraph("Contact: " + str(doc.get("contactPerson")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        }
        if (!isEmpty(doc.get("phone"))) {
            supplierCell.addElement(new Paragraph("Phone: " + str(doc.get("phone")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        }
        if (!isEmpty(doc.get("email"))) {
            supplierCell.addElement(new Paragraph("Email: " + str(doc.get("email")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        }

        PdfPCell shipCell = new PdfPCell();
        shipCell.setPadding(8);
        shipCell.addElement(new Paragraph("DELIVER TO", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MUTED)));
        String shipTo = firstNonEmpty(str(doc.get("shippingAddress")), str(doc.get("deliveryLocation")));
        shipCell.addElement(new Paragraph(isEmpty(shipTo) ? "" : shipTo, FontFactory.getFont(FontFactory.HELVETICA, 9)));
        if (!isEmpty(doc.get("expectedDeliveryDate"))) {
            shipCell.addElement(new Paragraph("Expected Delivery: " + str(doc.get("expectedDeliveryDate")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        }
        if (!isEmpty(doc.get("deliveryTerms"))) {
            shipCell.addElement(new Paragraph("Delivery Terms: " + str(doc.get("deliveryTerms")), FontFactory.getFont(FontFactory.HELVETICA, 8)));
        }

        t.addCell(supplierCell);
        t.addCell(shipCell);
        return t;
    }

    private PdfPTable poRefTable(Map<String, Object> doc) {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{18, 32, 18, 32});

        field(t, "Buyer", str(doc.get("buyer")));
        field(t, "Department", str(doc.get("department")));
        field(t, "Quotation Ref", str(doc.get("quotationNumber")));
        field(t, "PR Ref", str(doc.get("purchaseRequestNumber")));
        field(t, "Payment Terms", str(doc.get("paymentTerms")));
        field(t, "Currency", str(doc.get("currency")));
        field(t, "Priority", str(doc.get("priority")));
        field(t, "Freight Terms", str(doc.get("freightTerms")));

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

    /** Item table with HSN + CGST/SGST/IGST-agnostic tax breakdown. Fills totals[0]=taxable, totals[1]=tax, totals[2]=grand. */
    private PdfPTable poItemsTable(Map<String, Object> doc, BigDecimal[] totals) {
        PdfPTable t = new PdfPTable(10);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{4, 11, 22, 9, 8, 7, 9, 9, 8, 13});
        t.setSpacingBefore(0);
        t.setHeaderRows(1);

        header(t, "#");
        header(t, "Item Code");
        header(t, "Description");
        header(t, "HSN");
        header(t, "Qty");
        header(t, "UOM");
        header(t, "Rate");
        header(t, "Disc %");
        header(t, "Tax %");
        header(t, "Amount");

        BigDecimal taxableTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        BigDecimal grandTotal = BigDecimal.ZERO;

        int n = 0;
        for (Object o : lines(doc)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> line = (Map<String, Object>) o;
            n++;
            BigDecimal qty = bd(line.get("orderQty") != null ? line.get("orderQty") : line.get("qty"));
            BigDecimal rate = bd(line.get("unitPrice"));
            BigDecimal discPct = bd(line.get("discount"));
            BigDecimal taxPct = bd(line.get("tax"));
            BigDecimal gross = qty.multiply(rate);
            BigDecimal discAmt = gross.multiply(discPct).divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP);
            BigDecimal taxable = gross.subtract(discAmt);
            BigDecimal taxAmt = taxable.multiply(taxPct).divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP);
            // Always foot the line as taxable + tax computed here, rather than trusting the
            // stored netAmount — that value can be entered/rounded independently on save and
            // would otherwise make the printed Grand Total not equal Taxable Value + Total Tax.
            BigDecimal net = taxable.add(taxAmt);

            taxableTotal = taxableTotal.add(taxable);
            taxTotal = taxTotal.add(taxAmt);
            grandTotal = grandTotal.add(net);

            String itemCode = str(line.get("itemCode"));
            String hsn = items.findByCode(itemCode).map(ItemMaster::getHsnCode).filter(s -> !s.isBlank()).orElse("");

            cell(t, String.valueOf(n), false);
            cell(t, itemCode, false);
            String desc = firstNonEmpty(str(line.get("itemName")), str(line.get("specification")));
            cell(t, desc, false);
            cell(t, hsn, false);
            cell(t, num(qty), true);
            cell(t, str(line.get("uom")), false);
            cell(t, num(rate), true);
            cell(t, num(discPct), true);
            cell(t, num(taxPct), true);
            cell(t, num(net), true);
        }

        totals[0] = taxableTotal;
        totals[1] = taxTotal;
        totals[2] = grandTotal;
        return t;
    }

    private PdfPTable poTotalsBlock(BigDecimal taxable, BigDecimal tax, BigDecimal grand) {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(50);
        t.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.setWidths(new float[]{55, 45});

        totalRow(t, "Taxable Value", taxable, false);
        totalRow(t, "Total Tax", tax, false);
        totalRow(t, "Grand Total", grand, true);

        PdfPTable wrap = new PdfPTable(1);
        wrap.setWidthPercentage(100);
        PdfPCell wc = new PdfPCell(t);
        wc.setBorder(PdfPCell.NO_BORDER);
        wc.setPadding(0);
        wrap.addCell(wc);

        PdfPCell wordsCell = new PdfPCell(new Phrase("Amount in words: " + numberToWords(grand) + " Rupees Only",
                FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, MUTED)));
        wordsCell.setBorder(PdfPCell.NO_BORDER);
        wordsCell.setPadding(4);
        wordsCell.setPaddingTop(6);
        wrap.addCell(wordsCell);

        return wrap;
    }

    private void totalRow(PdfPTable t, String label, BigDecimal value, boolean bold) {
        Font lf = FontFactory.getFont(bold ? FontFactory.HELVETICA_BOLD : FontFactory.HELVETICA, 9, bold ? null : MUTED);
        Font vf = FontFactory.getFont(bold ? FontFactory.HELVETICA_BOLD : FontFactory.HELVETICA, 9);
        PdfPCell lc = new PdfPCell(new Phrase(label, lf));
        lc.setBorder(PdfPCell.NO_BORDER);
        lc.setPadding(4);
        if (bold) lc.setBackgroundColor(LIGHT);
        PdfPCell vc = new PdfPCell(new Phrase("₹ " + num(value), vf));
        vc.setBorder(PdfPCell.NO_BORDER);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vc.setPadding(4);
        if (bold) vc.setBackgroundColor(LIGHT);
        t.addCell(lc);
        t.addCell(vc);
    }

    private PdfPTable poSignatures() {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{50, 50});
        t.setSpacingBefore(18);

        t.addCell(signatureWrapper("Prepared By"));
        t.addCell(signatureWrapper("Authorized Signatory"));
        return t;
    }

    private BigDecimal bd(Object v) {
        if (v == null) return BigDecimal.ZERO;
        try { return new BigDecimal(String.valueOf(v)); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private List<String> nonEmpty(String... vals) {
        List<String> out = new java.util.ArrayList<>();
        for (String v : vals) if (v != null && !v.isBlank()) out.add(v);
        return out;
    }

    private static final String[] ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    private static final String[] TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    /** Converts a rupee amount to words using the Indian numbering system (Lakh/Crore). */
    private String numberToWords(BigDecimal amount) {
        long n = amount == null ? 0 : amount.setScale(0, java.math.RoundingMode.HALF_UP).longValue();
        if (n == 0) return "Zero";
        if (n < 0) return "Minus " + numberToWords(BigDecimal.valueOf(-n));
        StringBuilder sb = new StringBuilder();
        long crore = n / 10000000; n %= 10000000;
        long lakh = n / 100000; n %= 100000;
        long thousand = n / 1000; n %= 1000;
        long hundred = n / 100; n %= 100;
        if (crore > 0) sb.append(twoDigit(crore)).append(" Crore ");
        if (lakh > 0) sb.append(twoDigit(lakh)).append(" Lakh ");
        if (thousand > 0) sb.append(twoDigit(thousand)).append(" Thousand ");
        if (hundred > 0) sb.append(ONES[(int) hundred]).append(" Hundred ");
        if (n > 0) {
            if (sb.length() > 0) sb.append("and ");
            sb.append(twoDigit(n));
        }
        return sb.toString().trim();
    }

    private String twoDigit(long n) {
        if (n < 20) return ONES[(int) n];
        return (TENS[(int) (n / 10)] + " " + ONES[(int) (n % 10)]).trim();
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

    /** Return Note (DC / Invoice / Stock Return) — Return Management FRS v1.0 §12. */
    public byte[] returnNote(Map<String, Object> doc, String type) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();
            String title;
            switch (type) {
                case "invoice-return" -> title = "INVOICE RETURN NOTE";
                case "stock-return" -> title = "STOCK RETURN NOTE";
                default -> title = "DC RETURN NOTE";
            }
            PdfPTable titleBar = new PdfPTable(1);
            titleBar.setWidthPercentage(100);
            PdfPCell tc = new PdfPCell(new Phrase(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE)));
            tc.setBackgroundColor(DARK);
            tc.setPadding(12);
            tc.setHorizontalAlignment(Element.ALIGN_CENTER);
            titleBar.addCell(tc);
            pdf.add(titleBar);
            pdf.add(spacer(4));

            PdfPTable details = new PdfPTable(4);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{18, 32, 18, 32});
            field(details, "Return No", str(doc.get("docNo")));
            field(details, "Return Date", str(doc.get("docDate")));
            field(details, "Source No", str(doc.get("sourceNo")));
            field(details, "Status", str(doc.get("status")));
            Object reason = doc.get("reasonCode");
            field(details, "Reason", reason == null ? "" : str(reason));
            Object cond = doc.get("condition");
            field(details, "Condition", cond == null ? "" : str(cond));
            pdf.add(details);
            pdf.add(spacer(6));

            pdf.add(section("RETURNED ITEMS", doc));
            PdfPTable t = new PdfPTable(7);
            t.setWidthPercentage(100);
            t.setWidths(new float[]{10, 26, 12, 18, 12, 10, 12});
            header(t, "Sl No");
            header(t, "Item Code");
            header(t, "Location");
            header(t, "Batch / Heat");
            header(t, "Qty");
            header(t, "Status");
            header(t, "Ret Qty");
            int i = 1;
            for (Object o : lines(doc)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> line = (Map<String, Object>) o;
                cell(t, String.valueOf(i++), true);
                cell(t, str(line.get("itemCode")), false);
                cell(t, firstOf(line, "location"), false);
                cell(t, firstOf(line, "batchNo", "batchNumber", "heatNo"), false);
                cell(t, num(line.get("qty")), true);
                cell(t, firstOf(line, "stockStatus"), false);
                cell(t, num(firstOfObj(line, "currentReturnQty", "returnedQty")), true);
            }
            pdf.add(t);
            pdf.add(spacer(12));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Return Note PDF generation failed", e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    /** Allotment / Release note — Stock Allotment & Adjustment FRS v1.0 §12. */
    public byte[] allotmentIssuance(Map<String, Object> doc, String type) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();
            String title = "stock-release".equals(type) ? "STOCK RELEASE NOTE" : "STOCK ALLOTMENT NOTE";
            PdfPTable titleBar = new PdfPTable(1);
            titleBar.setWidthPercentage(100);
            PdfPCell tc = new PdfPCell(new Phrase(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE)));
            tc.setBackgroundColor(DARK);
            tc.setPadding(12);
            tc.setHorizontalAlignment(Element.ALIGN_CENTER);
            titleBar.addCell(tc);
            pdf.add(titleBar);
            pdf.add(spacer(4));

            PdfPTable details = new PdfPTable(4);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{18, 32, 18, 32});
            field(details, "Doc No", str(doc.get("docNo")));
            field(details, "Date", str(doc.get("docDate")));
            field(details, "Item Code", str(doc.get("itemCode")));
            field(details, "Status", str(doc.get("status")));
            Object ref = doc.get("referenceNo");
            field(details, "Reference", ref == null ? "" : str(ref));
            pdf.add(details);
            pdf.add(spacer(6));

            pdf.add(section("ITEMS", doc));
            PdfPTable t = new PdfPTable(6);
            t.setWidthPercentage(100);
            t.setWidths(new float[]{8, 26, 18, 16, 16, 16});
            header(t, "Sl No");
            header(t, "Item Code");
            header(t, "Location");
            header(t, "Batch / Heat");
            header(t, "Qty");
            header(t, "Status");
            int i = 1;
            for (Object o : lines(doc)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> line = (Map<String, Object>) o;
                cell(t, String.valueOf(i++), true);
                cell(t, str(line.get("itemCode")), false);
                cell(t, firstOf(line, "location"), false);
                cell(t, firstOf(line, "batchNo", "batchNumber", "heatNo"), false);
                cell(t, num(line.get("qty")), true);
                cell(t, firstOf(line, "stockStatus"), false);
            }
            pdf.add(t);
            pdf.add(spacer(12));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Allotment/Release PDF generation failed", e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    /** Stock / Physical Amendment note — Stock Allotment & Adjustment FRS v1.0 §12. */
    public byte[] amendmentNote(Map<String, Object> doc, String type) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 40, 40, 44, 44);
            PdfWriter.getInstance(pdf, baos);
            pdf.open();
            String title = "physical-stock-amendment".equals(type) ? "PHYSICAL STOCK AMENDMENT" : "STOCK AMENDMENT";
            PdfPTable titleBar = new PdfPTable(1);
            titleBar.setWidthPercentage(100);
            PdfPCell tc = new PdfPCell(new Phrase(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE)));
            tc.setBackgroundColor(DARK);
            tc.setPadding(12);
            tc.setHorizontalAlignment(Element.ALIGN_CENTER);
            titleBar.addCell(tc);
            pdf.add(titleBar);
            pdf.add(spacer(4));

            PdfPTable details = new PdfPTable(4);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{18, 32, 18, 32});
            field(details, "Doc No", str(doc.get("docNo")));
            field(details, "Date", str(doc.get("docDate")));
            field(details, "Item Code", str(doc.get("itemCode")));
            field(details, "Status", str(doc.get("status")));
            Object reason = doc.get("reasonCode");
            field(details, "Reason", reason == null ? "" : str(reason));
            pdf.add(details);
            pdf.add(spacer(6));

            pdf.add(section("ADJUSTMENT LINES", doc));
            boolean physical = "physical-stock-amendment".equals(type);
            PdfPTable t = new PdfPTable(physical ? 7 : 5);
            t.setWidthPercentage(100);
            if (physical) t.setWidths(new float[]{8, 26, 12, 12, 12, 14, 16});
            else t.setWidths(new float[]{8, 26, 20, 18, 28});
            header(t, "Sl No");
            header(t, "Item Code");
            header(t, "Location");
            header(t, "Batch / Heat");
            if (physical) {
                header(t, "System");
                header(t, "Physical");
                header(t, "Variance");
            } else {
                header(t, "Diff Qty");
            }
            int i = 1;
            for (Object o : lines(doc)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> line = (Map<String, Object>) o;
                cell(t, String.valueOf(i++), true);
                cell(t, str(line.get("itemCode")), false);
                cell(t, firstOf(line, "location", "storeLocation"), false);
                cell(t, firstOf(line, "batchNo", "batchNumber", "heatNo"), false);
                if (physical) {
                    cell(t, num(line.get("systemQty")), true);
                    cell(t, num(line.get("physicalQty")), true);
                    cell(t, num(line.get("varianceQty")), true);
                } else {
                    cell(t, num(line.get("differenceQty")), true);
                }
            }
            pdf.add(t);
            pdf.add(spacer(12));
            pdf.add(signatures());
            pdf.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Amendment PDF generation failed", e);
            throw new IllegalStateException("PDF print failed", e);
        }
    }

    private String firstOf(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null && !String.valueOf(v).isBlank()) return str(v);
        }
        return "";
    }

    private Object firstOfObj(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null) return v;
        }
        return null;
    }
}
