package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="stock_amendment") @Getter @Setter @DocKey("stock-amendment")
public class StockAmendment extends BaseDoc implements DocEntity {
    String itemCode;
    String location;
    String batchNo;
    BigDecimal systemQty;
    BigDecimal correctedQty;
    BigDecimal differenceQty;
    String reasonCode;
    public java.util.List<? extends LineEntity> getLines(){ return java.util.List.of(); }
}
