package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.GeneralDc;
import in.zygertechnology.zygererp.entity.JoDc;
import in.zygertechnology.zygererp.entity.TransferDc;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DeliveryChallanReportService {

    @PersistenceContext
    private final EntityManager em;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDcRegister(String dcType, String startDate, String endDate, String party, String status) {
        List<Map<String, Object>> results = new ArrayList<>();

        if (dcType == null || dcType.isBlank() || "ALL".equalsIgnoreCase(dcType) || "jo-dc".equalsIgnoreCase(dcType)) {
            fetchJoDcs(startDate, endDate, party, status, results);
        }
        if (dcType == null || dcType.isBlank() || "ALL".equalsIgnoreCase(dcType) || "general-dc".equalsIgnoreCase(dcType)) {
            fetchGeneralDcs(startDate, endDate, party, status, results);
        }
        if (dcType == null || dcType.isBlank() || "ALL".equalsIgnoreCase(dcType) || "transfer-dc".equalsIgnoreCase(dcType)) {
            fetchTransferDcs(startDate, endDate, party, status, results);
        }

        results.sort((a, b) -> String.valueOf(b.get("docDate")).compareTo(String.valueOf(a.get("docDate"))));
        return results;
    }

    private void fetchJoDcs(String startDate, String endDate, String party, String status, List<Map<String, Object>> results) {
        StringBuilder hql = new StringBuilder("select d from JoDc d where d.deleted = false ");
        Map<String, Object> params = new HashMap<>();
        addCommonFilters(hql, params, startDate, endDate, party, status);
        var query = em.createQuery(hql.toString(), JoDc.class);
        params.forEach(query::setParameter);
        List<JoDc> list = query.getResultList();
        for (JoDc d : list) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", d.getId());
            r.put("docType", "JO DC");
            r.put("typeKey", "jo-dc");
            r.put("docNo", d.getDocNo());
            r.put("docDate", d.getDocDate() != null ? d.getDocDate().toString() : "");
            r.put("party", d.getParty());
            r.put("fromLocation", d.getSourceLocation());
            r.put("toLocation", d.getParty());
            r.put("status", d.getStatus());
            r.put("referenceNo", d.getLinkedDocumentNo());
            r.put("challanPurpose", d.getChallanPurpose());
            r.put("expectedReturnDate", d.getExpectedReturnDate() != null ? d.getExpectedReturnDate().toString() : "");
            r.put("lineCount", d.getLines().size());
            r.put("totalQty", d.getLines().stream().mapToDouble(l -> l.getQty() != null ? l.getQty().doubleValue() : 0).sum());
            results.add(r);
        }
    }

    private void fetchGeneralDcs(String startDate, String endDate, String party, String status, List<Map<String, Object>> results) {
        StringBuilder hql = new StringBuilder("select d from GeneralDc d where d.deleted = false ");
        Map<String, Object> params = new HashMap<>();
        addCommonFilters(hql, params, startDate, endDate, party, status);
        var query = em.createQuery(hql.toString(), GeneralDc.class);
        params.forEach(query::setParameter);
        List<GeneralDc> list = query.getResultList();
        for (GeneralDc d : list) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", d.getId());
            r.put("docType", "General DC");
            r.put("typeKey", "general-dc");
            r.put("docNo", d.getDocNo());
            r.put("docDate", d.getDocDate() != null ? d.getDocDate().toString() : "");
            r.put("party", d.getParty());
            r.put("fromLocation", d.getSourceLocation());
            r.put("toLocation", d.getParty());
            r.put("status", d.getStatus());
            r.put("referenceNo", d.getSalesOrderNo() != null ? d.getSalesOrderNo() : d.getLinkedDocumentNo());
            r.put("dcAgainst", d.getDcAgainst());
            r.put("convertToInvoiceLater", Boolean.TRUE.equals(d.getConvertToInvoiceLater()));
            r.put("invoiced", Boolean.TRUE.equals(d.getInvoiced()));
            r.put("lineCount", d.getLines().size());
            r.put("totalQty", d.getLines().stream().mapToDouble(l -> l.getQty() != null ? l.getQty().doubleValue() : 0).sum());
            r.put("totalAmount", d.getLines().stream().mapToDouble(l -> l.getAmount() != null ? l.getAmount().doubleValue() : 0).sum());
            results.add(r);
        }
    }

    private void fetchTransferDcs(String startDate, String endDate, String party, String status, List<Map<String, Object>> results) {
        StringBuilder hql = new StringBuilder("select d from TransferDc d where d.deleted = false ");
        Map<String, Object> params = new HashMap<>();
        addCommonFilters(hql, params, startDate, endDate, party, status);
        var query = em.createQuery(hql.toString(), TransferDc.class);
        params.forEach(query::setParameter);
        List<TransferDc> list = query.getResultList();
        for (TransferDc d : list) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", d.getId());
            r.put("docType", "Transfer DC");
            r.put("typeKey", "transfer-dc");
            r.put("docNo", d.getDocNo());
            r.put("docDate", d.getDocDate() != null ? d.getDocDate().toString() : "");
            r.put("party", d.getDestinationLocation());
            r.put("fromLocation", d.getSourceLocation());
            r.put("toLocation", d.getDestinationLocation());
            r.put("status", d.getStatus());
            r.put("referenceNo", d.getTransferRequestNo() != null ? d.getTransferRequestNo() : d.getLinkedDocumentNo());
            r.put("transferType", d.getTransferType());
            r.put("inTransitTracking", Boolean.TRUE.equals(d.getInTransitTracking()));
            r.put("receiptConfirmed", Boolean.TRUE.equals(d.getReceiptConfirmed()));
            r.put("lineCount", d.getLines().size());
            r.put("totalQty", d.getLines().stream().mapToDouble(l -> l.getQty() != null ? l.getQty().doubleValue() : 0).sum());
            results.add(r);
        }
    }

    private void addCommonFilters(StringBuilder hql, Map<String, Object> params, String startDate, String endDate, String party, String status) {
        if (startDate != null && !startDate.isBlank()) {
            hql.append("and d.docDate >= :startDate ");
            params.put("startDate", LocalDate.parse(startDate));
        }
        if (endDate != null && !endDate.isBlank()) {
            hql.append("and d.docDate <= :endDate ");
            params.put("endDate", LocalDate.parse(endDate));
        }
        if (party != null && !party.isBlank()) {
            hql.append("and (lower(d.party) like :party or lower(d.destinationLocation) like :party) ");
            params.put("party", "%" + party.toLowerCase() + "%");
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            hql.append("and d.status = :status ");
            params.put("status", status);
        }
    }

    /** JO DCs sent to job workers but not yet fully received back. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getJobWorkAgeingReport() {
        List<JoDc> sentDcs = em.createQuery(
                "select d from JoDc d where d.deleted = false and (d.challanPurpose is null or d.challanPurpose in ('Sending for Job Work', 'Sending')) and d.status in ('CONFIRMED', 'POSTED')", JoDc.class)
                .getResultList();

        List<Map<String, Object>> report = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (JoDc dc : sentDcs) {
            LocalDate date = dc.getDocDate() != null ? dc.getDocDate() : today;
            long daysPending = ChronoUnit.DAYS.between(date, today);

            for (var line : dc.getLines()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("dcId", dc.getId());
                row.put("dcNo", dc.getDocNo());
                row.put("dcDate", date.toString());
                row.put("jobWorker", dc.getParty());
                row.put("jobOrderNo", dc.getJobOrderNo());
                row.put("processName", dc.getProcessName());
                row.put("itemCode", line.getItemCode());
                row.put("dispatchedQty", line.getQty() != null ? line.getQty().doubleValue() : 0);
                row.put("expectedReturnDate", dc.getExpectedReturnDate() != null ? dc.getExpectedReturnDate().toString() : "");
                row.put("daysPending", daysPending);
                row.put("status", daysPending > 30 ? "OVERDUE" : "PENDING");
                report.add(row);
            }
        }

        report.sort((a, b) -> Long.compare((long) b.get("daysPending"), (long) a.get("daysPending")));
        return report;
    }

    /** General DCs flagged convertToInvoiceLater=true that have not been converted to Tax Invoice yet. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDcPendingForInvoiceReport() {
        List<GeneralDc> pending = em.createQuery(
                "select d from GeneralDc d where d.deleted = false and d.convertToInvoiceLater = true and (d.invoiced = false or d.invoiced is null) and d.status in ('CONFIRMED', 'POSTED')", GeneralDc.class)
                .getResultList();

        List<Map<String, Object>> report = new ArrayList<>();
        for (GeneralDc d : pending) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", d.getId());
            r.put("dcNo", d.getDocNo());
            r.put("dcDate", d.getDocDate() != null ? d.getDocDate().toString() : "");
            r.put("customer", d.getParty());
            r.put("dcAgainst", d.getDcAgainst());
            r.put("salesOrderNo", d.getSalesOrderNo());
            r.put("vehicleNo", d.getVehicleNo());
            r.put("lineCount", d.getLines().size());
            r.put("totalQty", d.getLines().stream().mapToDouble(l -> l.getQty() != null ? l.getQty().doubleValue() : 0).sum());
            r.put("totalAmount", d.getLines().stream().mapToDouble(l -> l.getAmount() != null ? l.getAmount().doubleValue() : 0).sum());
            report.add(r);
        }
        return report;
    }

    /** Transfer DCs with inTransitTracking=true pending receipt confirmation at destination. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStockInTransitReport() {
        List<TransferDc> inTransit = em.createQuery(
                "select d from TransferDc d where d.deleted = false and d.inTransitTracking = true and (d.receiptConfirmed = false or d.receiptConfirmed is null) and d.status in ('CONFIRMED', 'POSTED')", TransferDc.class)
                .getResultList();

        List<Map<String, Object>> report = new ArrayList<>();
        for (TransferDc d : inTransit) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", d.getId());
            r.put("dcNo", d.getDocNo());
            r.put("dcDate", d.getDocDate() != null ? d.getDocDate().toString() : "");
            r.put("fromLocation", d.getSourceLocation());
            r.put("toLocation", d.getDestinationLocation());
            r.put("transferType", d.getTransferType());
            r.put("vehicleNo", d.getVehicleNo());
            r.put("transporter", d.getTransporter());
            r.put("lrNo", d.getLrNo());
            r.put("lineCount", d.getLines().size());
            r.put("totalQty", d.getLines().stream().mapToDouble(l -> l.getQty() != null ? l.getQty().doubleValue() : 0).sum());
            report.add(r);
        }
        return report;
    }
}
