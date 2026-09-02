package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="stock_allotment") @Getter @Setter @DocKey("stock-allotment")
public class StockAllotment extends BaseDoc implements DocEntity {
    String allotmentType;
    String referenceNo;
    String customer;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<StockAllotmentLine> lines = new java.util.ArrayList<>();
}
