package in.zygertechnology.zygererp.dto.sales;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateSalesOrderRequest {

    @NotBlank(message = "Customer name is required")
    private String customer;

    private String customerCode;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    private LocalDate deliveryDate;

    private String soType;

    private String notes;

    private String remarks;

    private String deliveryAddress;

    private String paymentTerms;

    @Valid
    private List<SalesOrderLineRequest> lines;

    @Data
    public static class SalesOrderLineRequest {

        @NotBlank(message = "Item code is required")
        private String itemCode;

        private String itemName;

        @NotNull(message = "Order quantity is required")
        private BigDecimal orderQty;

        private BigDecimal unitPrice;

        private BigDecimal discount;

        private BigDecimal tax;

        private String drawingRevision;

        private LocalDate requiredDeliveryDate;

        private String remarks;
    }
}
