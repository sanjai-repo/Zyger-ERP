package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="stock_release") @Getter @Setter @DocKey("stock-release")
public class StockRelease extends BaseDoc implements DocEntity {
    String allotmentNo;
    String reason;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<StockReleaseLine> lines = new java.util.ArrayList<>();
}
