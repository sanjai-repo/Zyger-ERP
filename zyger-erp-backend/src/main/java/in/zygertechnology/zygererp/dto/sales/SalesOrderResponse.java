package in.zygertechnology.zygererp.dto.sales;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
public class SalesOrderResponse {

    private Long id;
    private String docNo;
    private String status;
    private String customer;
    private String customerCode;
    private LocalDate orderDate;
    private LocalDate deliveryDate;
    private String soType;
    private String notes;
    private String remarks;
    private String deliveryAddress;
    private String paymentTerms;

    private BigDecimal orderedQty;
    private BigDecimal pendingQty;
    private BigDecimal dispatchedQty;
    private BigDecimal invoicedQty;
    private BigDecimal returnedQty;

    private String createdBy;
    private Instant createdAt;
    private String updatedBy;
    private Instant updatedAt;

    private List<SalesOrderLineResponse> lines;

    private List<String> allowedTransitions;

    @Data
    public static class SalesOrderLineResponse {
        private Long id;
        private String itemCode;
        private String itemDesc;
        private BigDecimal orderQty;
        private BigDecimal unitPrice;
        private BigDecimal discount;
        private BigDecimal tax;
        private BigDecimal netAmount;
        private String drawingRevision;
        private LocalDate requiredDeliveryDate;
        private String remarks;
    }
}
