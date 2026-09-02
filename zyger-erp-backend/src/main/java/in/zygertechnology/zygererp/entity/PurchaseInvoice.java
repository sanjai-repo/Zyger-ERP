package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="purchase_invoice") @Getter @Setter @DocKey("purchase-invoice")
public class PurchaseInvoice extends BaseDoc implements DocEntity {
    String supplier;
    String purchaseOrderNo;
    String supplierInvoiceNo;
    BigDecimal taxAmount;
    BigDecimal totalAmount;
    java.time.LocalDate dueDate;
    public java.util.List<? extends LineEntity> getLines(){ return java.util.List.of(); }
}
