package in.zygertechnology.zygererp.dto.purchase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreatePurchaseOrderRequest {

    @NotBlank(message = "Supplier name is required")
    private String supplier;

    private String supplierCode;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    private LocalDate deliveryDate;

    private String paymentTerms;

    private String notes;

    private String remarks;

    private String deliveryAddress;

    @Valid
    private List<PurchaseOrderLineRequest> lines;

    @Data
    public static class PurchaseOrderLineRequest {

        @NotBlank(message = "Item code is required")
        private String itemCode;

        private String itemName;

        @NotNull(message = "Order quantity is required")
        private BigDecimal orderQty;

        private BigDecimal unitPrice;

        private BigDecimal discount;

        private BigDecimal tax;

        private String remarks;
    }
}
