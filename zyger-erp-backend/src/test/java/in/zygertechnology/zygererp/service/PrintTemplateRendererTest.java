package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.CompanyInfo;
import in.zygertechnology.zygererp.repo.CompanyInfoRepository;
import in.zygertechnology.zygererp.repo.ItemRepository;
import in.zygertechnology.zygererp.repo.PartyRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrintTemplateRendererTest {

    @Mock private CompanyInfoRepository companyInfos;
    @Mock private PartyRepository parties;
    @Mock private ItemRepository items;

    private PrintTemplateRenderer renderer() {
        CompanyInfo ci = CompanyInfo.builder()
                .companyName("Zygert Steel Works Pvt. Ltd.")
                .printName("ZYGERT STEEL WORKS PVT. LTD.")
                .addressLine1("Plot No. 42, Industrial Estate")
                .city("Coimbatore").state("Tamil Nadu").pincode("641004")
                .phone("0422-1234567").email("accounts@zyk.com")
                .gstin("33AAACZ1234F1Z5").pan("AAACZ1234F")
                .bankName("HDFC Bank").bankAccount("00001234567890")
                .bankIfsc("HDFC0001234").bankBranch("Coimbatore Main")
                .build();
        when(companyInfos.findById(1L)).thenReturn(Optional.of(ci));
        when(parties.findByName(anyString())).thenReturn(Optional.empty());
        return new PrintTemplateRenderer(companyInfos, parties, items);
    }

    private static Map<String, Object> dcDoc() {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("docNo", "DC/25-26/0042");
        doc.put("docDate", "2026-09-10");
        doc.put("status", "POSTED");
        doc.put("party", "M/S NUTROKRAFT SPECIALITY BEVERAGES (P) LTD");
        doc.put("customerCode", "NUTRO-001");
        doc.put("ewayBillNo", "431012345678");
        doc.put("modeOfTransport", "Road");
        doc.put("vehicleNo", "TN38 AB 1234");
        doc.put("salesOrderNo", "SO/25-26/0117");
        doc.put("lines", List.of(
                Map.of("itemCode", "CROWN-100",
                        "itemDesc", "ROLLED CRIMPING CROWN CORK 26MM ZYGER BOTTLING LINE",
                        "hsnCode", "8309", "batchNo", "B-8801", "heatNo", "HT-221",
                        "qty", 5000, "uom", "NOS", "remarks", "For packing section"),
                Map.of("itemCode", "PALLET-50",
                        "itemDesc", "HDPE PALLET 50KG CAPACITY",
                        "hsnCode", "3923", "qty", 120, "uom", "NOS")
        ));
        return doc;
    }

    private static Map<String, Object> invoiceDoc() {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("docNo", "INV/25-26/0033");
        doc.put("docDate", "2026-09-12");
        doc.put("status", "POSTED");
        doc.put("party", "M/S NUTROKRAFT SPECIALITY BEVERAGES (P) LTD");
        doc.put("customerCode", "NUTRO-001");
        doc.put("gstin", "24AAACS5832Q1Z5");
        doc.put("dcNo", "DC/25-26/0042");
        doc.put("dcDate", "2026-09-10");
        doc.put("vehicleNo", "TN38 AB 1234");
        doc.put("transportMode", "Road");
        doc.put("paymentTerms", "15 Days Credit");
        doc.put("irnNo", "NA");
        doc.put("lines", List.of(
                Map.of("itemCode", "CROWN-100",
                        "itemDesc", "ROLLED CRIMPING CROWN CORK 26MM ZYGER BOTTLING LINE",
                        "hsnCode", "8309", "qty", 5000, "uom", "NOS",
                        "unitPrice", 2.40, "tax", 18),
                Map.of("itemCode", "PALLET-50",
                        "itemDesc", "HDPE PALLET 50KG CAPACITY",
                        "hsnCode", "3923", "qty", 120, "uom", "NOS",
                        "unitPrice", 350.00, "tax", 18)
        ));
        return doc;
    }

    private static void writeSample(String name, String html) {
        try {
            Path dir = Path.of("build", "print-samples");
            Files.createDirectories(dir);
            Files.writeString(dir.resolve(name), html, StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            // test output directory is best-effort; assertions still run
        }
    }

    private static void assertNoUnresolvedTokens(String html) {
        assertFalse(html.contains("{{"), "Renderer left an unresolved template token");
    }

    @Nested
    @DisplayName("deliveryChallan()")
    class DeliveryChallan {
        @Test
        @DisplayName("Renders full HTML matching the Sales-DC layout")
        void rendersHtml() {
            String html = renderer().deliveryChallan(dcDoc(), "sales-dc");
            writeSample("delivery-challan.html", html);

            assertTrue(html.contains("Sales Delivery Challan"));
            assertTrue(html.contains("M/S NUTROKRAFT SPECIALITY BEVERAGES (P) LTD"));
            assertTrue(html.contains("ROLLED CRIMPING CROWN CORK 26MM ZYGER BOTTLING LINE"));
            assertTrue(html.contains("5000.00 NOS"));
            assertTrue(html.contains("5120.00 NOS"));
            assertTrue(html.contains("SO/25-26/0117"));
            assertTrue(html.contains("DC/25-26/0042"));
            assertTrue(html.contains("431012345678"));
            assertNoUnresolvedTokens(html);
        }

        @Test
        @DisplayName("Un-posted document renders a DRAFT strip; second copy renders DUPLICATE")
        void draftAndCopyStrip() {
            PrintTemplateRenderer r = renderer();

            Map<String, Object> draft = dcDoc();
            draft.put("status", "DRAFT");
            String d = r.deliveryChallan(draft, "general-dc", 2);
            assertTrue(d.contains("DRAFT"));
            assertTrue(d.contains("DUPLICATE"));

            String single = r.deliveryChallan(draft, "general-dc", 1);
            assertFalse(single.contains("DUPLICATE"));
        }
    }

    @Nested
    @DisplayName("salesInvoice()")
    class SalesInvoice {
        @Test
        @DisplayName("Renders full HTML matching the sample Tax Invoice layout")
        void rendersHtml() {
            String html = renderer().salesInvoice(invoiceDoc());
            writeSample("sales-invoice.html", html);

            assertTrue(html.contains("Tax Invoice"));
            // spur: 5000 x 2.40 = 12000.00, 120 x 350.00 = 42000.00 -> taxable 54000.00
            assertTrue(html.contains("54,000.00"));
            // 18% tax split on inter-state supply -> IGST 9720.00
            assertTrue(html.contains("IGST @ 18%"));
            assertTrue(html.contains("9,720.00"));
            // grand total rounded 63720.00
            assertTrue(html.contains("63,720.00"));
            assertTrue(html.contains("NUTROKRAFT"));
            assertTrue(html.contains("24AAACS5832Q1Z5"));
            assertNoUnresolvedTokens(html);
        }

        @Test
        @DisplayName("Intra-state invoice splits tax into CGST and SGST")
        void intraStateCgstSgst() {
            Map<String, Object> doc = invoiceDoc();
            doc.put("gstin", "33AAACS5832Q1Z5");
            String html = renderer().salesInvoice(doc);

            assertTrue(html.contains("CGST @ 9%"));
            assertTrue(html.contains("SGST @ 9%"));
            assertFalse(html.contains("IGST @"));
        }
    }
}