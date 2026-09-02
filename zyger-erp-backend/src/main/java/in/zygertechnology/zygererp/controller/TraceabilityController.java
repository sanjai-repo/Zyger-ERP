package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.security.RequirePermission;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/traceability")
@RequiredArgsConstructor
@RequirePermission(module = "QUALITY", action = "VIEW")
public class TraceabilityController {

    private final EntityManager em;

    /** Forward traceability: Customer / Sales Order -> Work Order -> Job Card -> Batch/Heat -> Supplier GRN */
    @GetMapping("/forward")
    public ResponseEntity<List<Map<String, Object>>> forwardTraceability(
            @RequestParam(required = false) String salesOrderNo,
            @RequestParam(required = false) String workOrderNo,
            @RequestParam(required = false) String customerName) {
        StringBuilder sql = new StringBuilder("SELECT * FROM vw_material_traceability_chain WHERE 1=1 ");
        Map<String, Object> params = new HashMap<>();

        if (salesOrderNo != null && !salesOrderNo.isBlank()) {
            sql.append("AND sales_order_no = :salesOrderNo ");
            params.put("salesOrderNo", salesOrderNo);
        }
        if (workOrderNo != null && !workOrderNo.isBlank()) {
            sql.append("AND work_order_no = :workOrderNo ");
            params.put("workOrderNo", workOrderNo);
        }
        if (customerName != null && !customerName.isBlank()) {
            sql.append("AND LOWER(customer_name) LIKE LOWER(:customerName) ");
            params.put("customerName", "%" + customerName + "%");
        }

        sql.append("ORDER BY sales_order_id DESC LIMIT 100");

        return ResponseEntity.ok(executeQuery(sql.toString(), params));
    }

    /** Reverse traceability: Customer Complaint / Heat Number / Batch Number -> Work Order -> Supplier GRN */
    @GetMapping("/reverse")
    public ResponseEntity<List<Map<String, Object>>> reverseTraceability(
            @RequestParam(required = false) String heatNumber,
            @RequestParam(required = false) String batchNumber,
            @RequestParam(required = false) String grnNo) {
        StringBuilder sql = new StringBuilder("SELECT * FROM vw_material_traceability_chain WHERE 1=1 ");
        Map<String, Object> params = new HashMap<>();

        if (heatNumber != null && !heatNumber.isBlank()) {
            sql.append("AND heat_number = :heatNumber ");
            params.put("heatNumber", heatNumber);
        }
        if (batchNumber != null && !batchNumber.isBlank()) {
            sql.append("AND batch_number = :batchNumber ");
            params.put("batchNumber", batchNumber);
        }
        if (grnNo != null && !grnNo.isBlank()) {
            sql.append("AND grn_no = :grnNo ");
            params.put("grnNo", grnNo);
        }

        sql.append("ORDER BY goods_receipt_id DESC LIMIT 100");

        return ResponseEntity.ok(executeQuery(sql.toString(), params));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> executeQuery(String sqlStr, Map<String, Object> params) {
        Query q = em.createNativeQuery(sqlStr, Tuple.class);
        params.forEach(q::setParameter);

        List<jakarta.persistence.Tuple> tuples = q.getResultList();
        List<Map<String, Object>> result = new ArrayList<>();

        for (jakarta.persistence.Tuple t : tuples) {
            Map<String, Object> row = new LinkedHashMap<>();
            t.getElements().forEach(e -> row.put(e.getAlias(), t.get(e)));
            result.add(row);
        }
        return result;
    }
}
