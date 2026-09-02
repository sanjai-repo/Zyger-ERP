package in.zygertechnology.zygererp.dto.purchase;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseOrderResponse {

    private Long id;
    private String docNo;
    private String status;
    private String supplier;
    private String supplierCode;
    private String contactPerson;
    private String phone;
    private String email;
    private LocalDate orderDate;
    private LocalDate deliveryDate;
    private String paymentTerms;
    private String notes;
    private String remarks;
    private String deliveryAddress;

    private BigDecimal totalAmount;

    private String createdBy;
    private Instant createdAt;
    private String updatedBy;
    private Instant updatedAt;

    private List<PurchaseOrderLineResponse> lines;

    private List<String> allowedTransitions;

    @Data
    public static class PurchaseOrderLineResponse {
        private Long id;
        private String itemCode;
        private String itemDesc;
        private BigDecimal orderQty;
        private BigDecimal unitPrice;
        private BigDecimal discount;
        private BigDecimal tax;
        private BigDecimal netAmount;
        private String remarks;
    }
}
