package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.JobOrder;
import in.zygertechnology.zygererp.entity.JobOrderItem;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class JobOrderReconciliationService {

    private final EntityManager em;

    @Transactional(readOnly = true)
    public Map<String, Object> reconciliation(Long id) {
        JobOrder jo = em.find(JobOrder.class, id);
        if (jo == null) throw new IllegalArgumentException("Job Order not found: " + id);
        String docNo = jo.getDocNo() == null ? "" : jo.getDocNo();

        List<String> inwardNumbers = new ArrayList<>();
        inwardNumbers.addAll(em.createQuery(
                "select d.docNo from JoInward d where d.jobOrderNo = :no", String.class)
                .setParameter("no", docNo).getResultList());
        inwardNumbers.addAll(em.createQuery(
                "select d.docNo from LoInward d where d.jobOrderNo = :no", String.class)
                .setParameter("no", docNo).getResultList());

        Map<String, BigDecimal> sentDc = sumByItem(
                "select l.itemCode, coalesce(sum(l.qty), 0) from JoDcLine l " +
                "where l.doc.linkedDocumentNo = :docNo group by l.itemCode", docNo, null);
        Map<String, BigDecimal> sentIssue = sumByItem(
                "select l.itemCode, coalesce(sum(l.issueQty), 0) from JoDcIssueLine l " +
                "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null);
        Map<String, BigDecimal> receivedJo = sumByItem(
                "select l.itemCode, coalesce(sum(l.producedQty), 0) from JoInwardLine l " +
                "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null);
        Map<String, BigDecimal> receivedLo = sumByItem(
                "select l.itemCode, coalesce(sum(l.receivedQty), 0) from LoInwardLine l " +
                "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null);

        Map<String, BigDecimal> qiAccepted = sumByItem(
                "select i.itemCode, coalesce(sum(i.acceptedQuantity), 0) from QualityInspection i " +
                inspectionWhere(inwardNumbers.isEmpty()), docNo,
                inwardNumbers.isEmpty() ? null : inwardNumbers);
        Map<String, BigDecimal> qiRejected = sumByItem(
                "select i.itemCode, coalesce(sum(i.rejectedQuantity), 0) from QualityInspection i " +
                inspectionWhere(inwardNumbers.isEmpty()), docNo,
                inwardNumbers.isEmpty() ? null : inwardNumbers);
        boolean hasInspections = !qiAccepted.isEmpty() || !qiRejected.isEmpty();

        Map<String, BigDecimal> lineAccepted = merge(
                sumByItem("select l.itemCode, coalesce(sum(l.acceptedQty), 0) from JoInwardLine l " +
                        "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null),
                sumByItem("select l.itemCode, coalesce(sum(l.acceptedQty), 0) from LoInwardLine l " +
                        "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null));
        Map<String, BigDecimal> lineRejected = merge(
                sumByItem("select l.itemCode, coalesce(sum(l.rejectedQty), 0) from JoInwardLine l " +
                        "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null),
                sumByItem("select l.itemCode, coalesce(sum(l.rejectedQty), 0) from LoInwardLine l " +
                        "where l.doc.jobOrderNo = :docNo group by l.itemCode", docNo, null));

        BigDecimal tOrdered = ZERO, tSent = ZERO, tReceived = ZERO, tAccepted = ZERO, tRejected = ZERO;
        List<Map<String, Object>> lines = new ArrayList<>();

        for (JobOrderItem item : jo.getLines()) {
            String code = item.getItemCode();
            boolean fromInspection = qiAccepted.containsKey(key(code)) || qiRejected.containsKey(key(code));
            BigDecimal ordered = nz(item.getOrderQty());
            BigDecimal sent = sentDc.getOrDefault(key(code), ZERO).add(sentIssue.getOrDefault(key(code), ZERO));
            BigDecimal received = receivedJo.getOrDefault(key(code), ZERO).add(receivedLo.getOrDefault(key(code), ZERO));
            BigDecimal accepted = fromInspection
                    ? qiAccepted.getOrDefault(key(code), ZERO)
                    : lineAccepted.getOrDefault(key(code), ZERO);
            BigDecimal rejected = fromInspection
                    ? qiRejected.getOrDefault(key(code), ZERO)
                    : lineRejected.getOrDefault(key(code), ZERO);
            BigDecimal pending = ordered.subtract(received);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("itemCode", code);
            row.put("itemName", item.getItemName());
            row.put("uom", item.getUom());
            row.put("orderedQty", ordered);
            row.put("sentQty", sent);
            row.put("receivedQty", received);
            row.put("acceptedQty", accepted);
            row.put("rejectedQty", rejected);
            row.put("pendingQty", pending);
            row.put("qtySource", fromInspection ? "INSPECTION" : "INWARD_LINE");
            lines.add(row);

            tOrdered = tOrdered.add(ordered);
            tSent = tSent.add(sent);
            tReceived = tReceived.add(received);
            tAccepted = tAccepted.add(accepted);
            tRejected = tRejected.add(rejected);
        }

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("orderedQty", tOrdered);
        totals.put("sentQty", tSent);
        totals.put("receivedQty", tReceived);
        totals.put("acceptedQty", tAccepted);
        totals.put("rejectedQty", tRejected);
        totals.put("pendingQty", tOrdered.subtract(tReceived));

        long dcCount = count("select count(d) from JoDc d where d.linkedDocumentNo = :docNo", docNo, null);
        long dcIssueCount = count("select count(d) from JoDcIssue d where d.jobOrderNo = :docNo", docNo, null);
        long joInwardCount = count("select count(d) from JoInward d where d.jobOrderNo = :docNo", docNo, null);
        long loInwardCount = count("select count(d) from LoInward d where d.jobOrderNo = :docNo", docNo, null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("jobOrderId", id);
        out.put("jobOrderNo", docNo);
        out.put("status", jo.getStatus());
        out.put("totals", totals);
        out.put("lines", lines);
        Map<String, Object> sources = new LinkedHashMap<>();
        sources.put("deliveryChallans", dcCount);
        sources.put("dcIssues", dcIssueCount);
        sources.put("joInwards", joInwardCount);
        sources.put("loInwards", loInwardCount);
        sources.put("inspectionsMatched", hasInspections);
        out.put("sources", sources);
        out.put("gaps", gaps());
        return out;
    }

    private String inspectionWhere(boolean numbersEmpty) {
        if (numbersEmpty) {
            return "where i.jobOrderNumber = :docNo or i.labourOrderNumber = :docNo group by i.itemCode";
        }
        return "where i.jobOrderNumber = :docNo or i.labourOrderNumber = :docNo " +
               "or i.joInwardNumber in :numbers or i.sourceNumber in :numbers group by i.itemCode";
    }

    private Map<String, BigDecimal> sumByItem(String hql, String docNo, List<String> numbers) {
        var q = em.createQuery(hql, Object[].class).setParameter("docNo", docNo);
        if (numbers != null) q.setParameter("numbers", numbers);
        Map<String, BigDecimal> out = new HashMap<>();
        for (Object[] r : q.getResultList()) {
            String code = r[0] == null ? "" : String.valueOf(r[0]);
            out.merge(code, r[1] instanceof BigDecimal bd ? bd : nz(null), BigDecimal::add);
        }
        return out;
    }

    private long count(String hql, String docNo, List<String> numbers) {
        var q = em.createQuery(hql, Long.class).setParameter("docNo", docNo);
        if (numbers != null) q.setParameter("numbers", numbers);
        Long v = q.getSingleResult();
        return v == null ? 0 : v;
    }

    private static Map<String, BigDecimal> merge(Map<String, BigDecimal> a, Map<String, BigDecimal> b) {
        Map<String, BigDecimal> out = new HashMap<>(a);
        b.forEach((k, v) -> out.merge(k, v, BigDecimal::add));
        return out;
    }

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private static BigDecimal nz(BigDecimal v) { return v == null ? ZERO : v; }

    private static String key(String code) { return code == null ? "" : code; }

    private static List<String> gaps() {
        return List.of(
            "JoDc has no foreign key to job_order; 'sent' is matched via the free-text "
                + "linked_document_no column against the Job Order number, plus JoDcIssue.job_order_no.",
            "No LoInspection entity exists; acceptance decisions are taken from QualityInspection "
                + "headers matched by job_order_number / labour_order_number / jo_inward_number / source_number, "
                + "falling back to accepted_qty / rejected_qty on JoInward and LoInward lines when no "
                + "inspection was raised for an item.",
            "'received' combines JoInward.producedQty and LoInward.receivedQty; rework re-sends after "
                + "inward are not netted out of received quantities.",
            "All links are string document-number joins and source document status (DRAFT/CANCELLED) "
                + "is not filtered."
        );
    }
}
